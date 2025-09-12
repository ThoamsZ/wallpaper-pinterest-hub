import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// Generate a pre-signed URL for uploading to R2 (staging)
async function generatePresignedUrl(config: R2Config, key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = config;
  
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substr(0, 8);
  
  const canonicalUri = `/${bucketName}/${key}`;
  const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(accessKeyId + '/' + dateStamp + '/' + region + '/' + service + '/aws4_request')}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host`;
  const canonicalHeaders = `host:${accountId}.r2.cloudflarestorage.com\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;
  
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  
  return `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: CryptoKey, message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign('HMAC', key, msgBuffer);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<CryptoKey> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, regionName);
  const kService = await hmacSha256Raw(kRegion, serviceName);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  
  return await crypto.subtle.importKey(
    'raw',
    kSigning,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function hmacSha256Raw(key: Uint8Array | CryptoKey, message: string): Promise<Uint8Array> {
  let cryptoKey: CryptoKey;
  if (key instanceof CryptoKey) {
    cryptoKey = key;
  } else {
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }
  
  const msgBuffer = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
  return new Uint8Array(signature);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is a creator or admin
    const { data: isCreatorData, error: creatorError } = await supabase.rpc('is_creator');
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
    
    console.log('Creator check:', { isCreatorData, creatorError });
    console.log('Admin check:', { isAdminData, adminError });
    
    if (!isCreatorData && !isAdminData) {
      throw new Error('User is not authorized to create upload requests');
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string;
    const tagsString = formData.get('tags') as string;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique file key for staging
    const timestamp = Date.now();
    const fileHash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const hashArray = Array.from(new Uint8Array(fileHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
    const stagingKey = `staging/${timestamp}_${hashHex}_${file.name}`;

    // Get R2 config from environment
    const r2Config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    };

    // Generate pre-signed URL for staging upload
    const presignedUrl = await generatePresignedUrl(r2Config, stagingKey, file.type);

    // Upload file to staging
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to staging: ${uploadResponse.statusText}`);
    }

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Create upload request record
    const { data: uploadRequest, error: dbError } = await supabase
      .from('upload_requests')
      .insert({
        requested_by: user.id,
        status: 'pending',
        type: imageType,
        tags: tags,
        original_filename: file.name,
        mime_type: file.type,
        bytes: file.size,
        staging_key: stagingKey,
        r2_bucket: r2Config.bucketName,
        message: `Upload request for ${file.name}`,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to create upload request: ${dbError.message}`);
    }

    console.log(`Upload request created: ${uploadRequest.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        requestId: uploadRequest.id,
        message: 'Upload request created successfully. Awaiting admin approval.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Upload request error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating upload request' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});