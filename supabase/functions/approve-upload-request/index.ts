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

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is an admin
    const { data: isAdminData } = await supabase.rpc('is_admin');
    
    if (!isAdminData) {
      throw new Error('User is not authorized to approve upload requests');
    }

    // Parse request body
    const { requestId, adminId } = await req.json();
    
    if (!requestId) {
      throw new Error('Request ID is required');
    }

    // Get the upload request
    const { data: uploadRequest, error: fetchError } = await supabase
      .from('upload_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !uploadRequest) {
      throw new Error('Upload request not found or already processed');
    }

    // Generate final R2 key
    const timestamp = Date.now();
    const finalKey = `wallpapers/${timestamp}_${uploadRequest.original_filename}`;

    // Get R2 config
    const r2Config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    };

    const endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
    const stagingUrl = `${endpoint}/${r2Config.bucketName}/${uploadRequest.staging_key}`;
    const finalUrl = `${endpoint}/${r2Config.bucketName}/${finalKey}`;

    // Copy from staging to final location
    const copyResponse = await fetch(finalUrl, {
      method: 'PUT',
      headers: {
        'x-amz-copy-source': `/${r2Config.bucketName}/${uploadRequest.staging_key}`,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      },
    });

    if (!copyResponse.ok) {
      throw new Error(`Failed to copy file to final location: ${copyResponse.statusText}`);
    }

    // Generate public URL
    const publicUrl = `https://pub-a16d17b142a64b8cb94ff08966efe9ca.r2.dev/${finalKey}`;

    // Create wallpaper record
    const { data: wallpaper, error: wallpaperError } = await supabase
      .from('wallpapers')
      .insert({
        uploaded_by: uploadRequest.requested_by,
        type: uploadRequest.type,
        tags: uploadRequest.tags,
        file_path: finalKey,
        url: publicUrl,
        compressed_url: publicUrl,
        r2_key: finalKey,
        r2_url: publicUrl,
      })
      .select()
      .single();

    if (wallpaperError) {
      throw new Error(`Failed to create wallpaper record: ${wallpaperError.message}`);
    }

    // Update upload request
    const { error: updateError } = await supabase
      .from('upload_requests')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        final_key: finalKey,
        uploaded_wallpaper_id: wallpaper.id,
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update upload request: ${updateError.message}`);
    }

    // Clean up staging file (optional - could be done in a cleanup job)
    try {
      await fetch(stagingUrl, { method: 'DELETE' });
    } catch (cleanupError) {
      console.log('Note: Failed to clean up staging file:', cleanupError);
    }

    console.log(`Upload request approved: ${requestId}, wallpaper created: ${wallpaper.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        wallpaperId: wallpaper.id,
        publicUrl: publicUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Approve upload request error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while approving upload request' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});