import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    
    if (!accountId || !bucketName) {
      return new Response(JSON.stringify({ error: 'R2 configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct the R2 URL
    const r2Url = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
    
    console.log(`Proxying request to R2: ${r2Url}`);

    // Fetch the image from R2
    const response = await fetch(r2Url);
    
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