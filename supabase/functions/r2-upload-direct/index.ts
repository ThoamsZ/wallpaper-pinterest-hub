import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// AWS S3 compatible signature generation for Cloudflare R2
async function generatePresignedUrl(
  config: R2Config,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const region = 'auto';
  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z';
  const datestamp = amzDate.substring(0, 8);
  
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  
  const host = `${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`;
  
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    queryParams.toString(),
    `content-type:${contentType}`,
    `host:${host}`,
    '',
    'content-type;host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n');
  
  const signingKey = await getSigningKey(config.secretAccessKey, datestamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  
  queryParams.set('X-Amz-Signature', signature);
  
  return `https://${host}/${key}?${queryParams.toString()}`;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSigningKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  
  const kDate = await hmacSha256Raw(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, regionName);
  const kService = await hmacSha256Raw(kRegion, serviceName);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  
  return kSigning;
}

async function hmacSha256Raw(key: Uint8Array, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is creator or admin
    const { data: isCreator, error: creatorError } = await supabase.rpc('is_creator');
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    
    if (!isCreator && !isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Only creators and admins can upload'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string;
    const tags = formData.get('tags') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get R2 configuration
    const r2Config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    };

    // Generate unique file path with hash
    const timestamp = Date.now();
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const shortHash = hashHex.substring(0, 12); // Use first 12 characters of hash
    
    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `wallpapers/${timestamp}_${shortHash}.${fileExtension}`;

    // Generate presigned URL for upload
    const presignedUrl = await generatePresignedUrl(r2Config, key, file.type, 3600);

    // Upload file to R2 using presigned URL (use the already read fileBuffer)
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      console.error('R2 upload failed:', uploadResponse.statusText);
      return new Response(JSON.stringify({ error: 'Failed to upload to R2' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate the public URL using R2 public domain
    const publicUrl = `https://pub-a16d17b142a64b8cb94ff08966efe9ca.r2.dev/${key}`;

    // Save metadata to database
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const { data: wallpaperData, error: dbError } = await supabase
      .from('wallpapers')
      .insert({
        url: publicUrl,
        compressed_url: publicUrl,
        file_path: key,
        r2_key: key,
        r2_url: publicUrl,
        type: imageType,
        tags: tagArray,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save metadata' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully uploaded file ${file.name} as ${key} for user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      wallpaper: wallpaperData,
      url: publicUrl,
      key: key
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in r2-upload-direct function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});