import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    'X-Amz-SignedHeaders': 'host',
  });
  
  const canonicalRequest = [
    'GET',
    `/${key}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
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
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
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
    
    if (!r2Config.accountId || !r2Config.bucketName || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
      return new Response(JSON.stringify({ error: 'R2 configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate presigned URL for authenticated access
    const presignedUrl = await generatePresignedUrl(r2Config, key, 3600);
    
    console.log(`Fetching from R2 with presigned URL for key: ${key}`);

    // Fetch the image from R2 using presigned URL
    const response = await fetch(presignedUrl);
    
    if (!response.ok) {
      console.error(`R2 fetch failed: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({ error: 'Image not found' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper CORS headers
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Length': imageData.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error in r2-proxy function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});