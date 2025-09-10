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

async function uploadToR2(config: R2Config, key: string, fileData: Uint8Array, contentType: string): Promise<boolean> {
  const url = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Authorization': await generateR2AuthHeader(config, 'PUT', key, contentType),
    },
    body: fileData,
  });

  return response.ok;
}

async function generateR2AuthHeader(config: R2Config, method: string, key: string, contentType: string): Promise<string> {
  const region = 'auto';
  const service = 's3';
  const algorithm = 'AWS4-HMAC-SHA256';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z';
  const datestamp = amzDate.substring(0, 8);
  
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  
  const host = `${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`;
  
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:UNSIGNED-PAYLOAD`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = [
    method,
    `/${key}`,
    '',
    canonicalHeaders,
    '',
    signedHeaders,
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
  
  return `${algorithm} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin');
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can run migration' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { batchSize = 10 } = await req.json();

    // Get R2 configuration
    const r2Config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    };

    // Get wallpapers that haven't been migrated yet
    const { data: wallpapers, error: wallpapersError } = await supabase
      .from('wallpapers')
      .select('id, url, file_path')
      .is('r2_key', null)
      .limit(batchSize);

    if (wallpapersError) {
      throw new Error(`Failed to fetch wallpapers: ${wallpapersError.message}`);
    }

    if (!wallpapers || wallpapers.length === 0) {
      return new Response(JSON.stringify({
        message: 'No wallpapers to migrate',
        migrated: 0,
        total: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let migrated = 0;
    const errors: string[] = [];

    console.log(`Starting migration of ${wallpapers.length} wallpapers`);

    // Process each wallpaper
    for (const wallpaper of wallpapers) {
      try {
        // Download the file from Supabase storage
        const fileResponse = await fetch(wallpaper.url);
        if (!fileResponse.ok) {
          errors.push(`Failed to download wallpaper ${wallpaper.id}: ${fileResponse.statusText}`);
          continue;
        }

        const fileData = new Uint8Array(await fileResponse.arrayBuffer());
        const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';

        // Generate R2 key
        const timestamp = Date.now();
        const randomString = crypto.randomUUID().substring(0, 8);
        const fileName = wallpaper.file_path.split('/').pop() || `wallpaper_${wallpaper.id}`;
        const r2Key = `wallpapers/migrated_${timestamp}_${randomString}_${fileName}`;

        // Upload to R2
        const uploadSuccess = await uploadToR2(r2Config, r2Key, fileData, contentType);
        
        if (!uploadSuccess) {
          errors.push(`Failed to upload wallpaper ${wallpaper.id} to R2`);
          continue;
        }

        // Update database with R2 key and new URL
        const r2Url = `https://${r2Config.bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com/${r2Key}`;
        
        const { error: updateError } = await supabase
          .from('wallpapers')
          .update({
            r2_key: r2Key,
            r2_url: r2Url,
            migrated_at: new Date().toISOString()
          })
          .eq('id', wallpaper.id);

        if (updateError) {
          errors.push(`Failed to update database for wallpaper ${wallpaper.id}: ${updateError.message}`);
          continue;
        }

        migrated++;
        console.log(`Successfully migrated wallpaper ${wallpaper.id} to R2 key: ${r2Key}`);

      } catch (error) {
        errors.push(`Error migrating wallpaper ${wallpaper.id}: ${error.message}`);
        console.error(`Error migrating wallpaper ${wallpaper.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      message: `Migration batch completed`,
      migrated,
      total: wallpapers.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in migrate-to-r2 function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});