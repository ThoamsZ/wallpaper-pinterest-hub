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
async function generatePresignedDownloadUrl(
  config: R2Config,
  key: string,
  expiresIn: number = 300 // 5 minutes default
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
  
  // Extract filename from key for download
  const filename = key.split('/').pop() || 'wallpaper';
  
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
    'response-content-disposition': `attachment; filename="${filename}"`,
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { wallpaperId } = await req.json();

    if (!wallpaperId) {
      return new Response(JSON.stringify({ error: 'wallpaperId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get wallpaper details
    const { data: wallpaper, error: wallpaperError } = await supabase
      .from('wallpapers')
      .select('file_path, r2_key')
      .eq('id', wallpaperId)
      .maybeSingle();

    if (wallpaperError || !wallpaper) {
      return new Response(JSON.stringify({ error: 'Wallpaper not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use r2_key if available, otherwise extract from file_path
    let r2Key = wallpaper.r2_key;
    if (!r2Key && wallpaper.file_path) {
      // For migrated files, the r2_key might be derived from file_path
      r2Key = wallpaper.file_path.replace(/^.*\//, 'wallpapers/');
    }

    if (!r2Key) {
      return new Response(JSON.stringify({ error: 'File not found in R2 storage' }), {
        status: 404,
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

    // Generate short-lived signed URL (5 minutes)
    const signedUrl = await generatePresignedDownloadUrl(r2Config, r2Key, 300);

    // Log download attempt
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (user) {
        // Log the download
        await supabase
          .from('download_logs')
          .insert([{
            user_id: user.id,
            wallpaper_id: wallpaperId,
            downloaded_at: new Date().toISOString()
          }]);
      }
    }

    console.log(`Generated download URL for wallpaper ${wallpaperId}, r2_key: ${r2Key}`);

    return new Response(JSON.stringify({
      downloadUrl: signedUrl,
      expiresIn: 300
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in r2-download function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});