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
      throw new Error('User is not authorized to approve delete requests');
    }

    // Parse request body
    const { requestId, adminId } = await req.json();
    
    if (!requestId) {
      throw new Error('Request ID is required');
    }

    // Get the delete request
    const { data: deleteRequest, error: fetchError } = await supabase
      .from('delete_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !deleteRequest) {
      throw new Error('Delete request not found or already processed');
    }

    // Get R2 config
    const r2Config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
      bucketName: Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!,
    };

    const endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
    const fileUrl = `${endpoint}/${r2Config.bucketName}/${deleteRequest.r2_key}`;

    // Delete the file from R2
    const deleteResponse = await fetch(fileUrl, {
      method: 'DELETE',
    });

    // Note: R2 returns 204 for successful delete, or 404 if file doesn't exist
    // Both are acceptable for our purposes
    const fileDeleted = deleteResponse.status === 204 || deleteResponse.status === 404;

    // Remove wallpaper from database
    const { error: wallpaperDeleteError } = await supabase
      .from('wallpapers')
      .delete()
      .eq('id', deleteRequest.wallpaper_id);

    if (wallpaperDeleteError) {
      console.error('Failed to delete wallpaper from database:', wallpaperDeleteError);
      // Continue with the process even if DB delete fails
    }

    // Remove from favorites
    const { error: favoriteError } = await supabase.rpc('remove_wallpaper_from_favorites', {
      wallpaper_id: deleteRequest.wallpaper_id
    });

    if (favoriteError) {
      console.error('Failed to remove from favorites:', favoriteError);
      // Continue with the process
    }

    // Update delete request
    const { error: updateError } = await supabase
      .from('delete_requests')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        final_deleted: fileDeleted,
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update delete request: ${updateError.message}`);
    }

    console.log(`Delete request approved: ${requestId}, wallpaper deleted: ${deleteRequest.wallpaper_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        wallpaperId: deleteRequest.wallpaper_id,
        fileDeleted: fileDeleted
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Approve delete request error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while approving delete request' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});