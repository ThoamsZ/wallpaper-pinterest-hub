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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    
    console.log(`User ${user.id} permission check:`, {
      isCreator,
      creatorError,
      isAdmin,
      adminError
    });
    
    if (!isCreator && !isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Only creators and admins can upload',
        debug: { isCreator, isAdmin, creatorError, adminError }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fileName, contentType } = await req.json();

    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'fileName and contentType are required' }), {
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

    // Generate unique file path
    const timestamp = Date.now();
    const randomString = crypto.randomUUID().substring(0, 8);
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `wallpapers/${timestamp}_${randomString}_${safeFileName}`;

    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl(r2Config, key, contentType, 3600);

    // Generate the public URL for after upload
    const publicUrl = `https://${r2Config.bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com/${key}`;

    console.log(`Generated presigned URL for user ${user.id}, file: ${key}`);

    return new Response(JSON.stringify({
      presignedUrl,
      key,
      publicUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in r2-upload function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});