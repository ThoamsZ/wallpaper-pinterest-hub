import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DownloadResult {
  success: boolean;
  message?: string;
}

/**
 * Download wallpaper using R2 signed URL
 * @param wallpaperId - The ID of the wallpaper to download
 * @param decrementDownloads - Function to decrement user downloads
 * @param downloadsRemaining - Number of downloads remaining for user
 * @returns Promise<DownloadResult>
 */
export const downloadWallpaper = async (
  wallpaperId: string,
  decrementDownloads: () => Promise<void>,
  downloadsRemaining: number | null,
  hasUnlimitedDownloads: boolean = false
): Promise<DownloadResult> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please login to download wallpapers",
        variant: "destructive",
      });
      return { success: false, message: "Authentication required" };
    }

    // Check if user is guest
    if (session.user.email === 'guest@wallpaperhub.com') {
      toast({
        title: "Guest account",
        description: "Please sign up to download wallpapers",
        variant: "destructive",
      });
      return { success: false, message: "Guest account" };
    }

    // Check download limits (skip for unlimited downloads)
    if (!hasUnlimitedDownloads && downloadsRemaining !== null && downloadsRemaining <= 0) {
      toast({
        title: "Daily download limit reached",
        description: "Please wait until tomorrow or upgrade your subscription for more downloads",
        variant: "destructive",
      });
      return { success: false, message: "Download limit reached" };
    }

    // Get wallpaper details
    const { data: wallpaper, error: wallpaperError } = await supabase
      .from('wallpapers')
      .select('download_count, r2_key, url, file_path')
      .eq('id', wallpaperId)
      .maybeSingle();

    if (wallpaperError || !wallpaper) {
      throw new Error('Wallpaper not found');
    }

    // Get signed download URL from R2
    const { data: downloadData, error: downloadError } = await supabase.functions.invoke('r2-download', {
      body: { wallpaperId }
    });

    if (downloadError || !downloadData?.downloadUrl) {
      // Fallback to direct URL if R2 download fails
      console.warn('R2 download failed, falling back to direct URL:', downloadError);
      const directUrl = wallpaper.url;
      
      // Trigger download using direct URL
      const response = await fetch(directUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallpaper-${wallpaperId}.${directUrl.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // Use R2 signed URL for download
      const a = document.createElement('a');
      a.href = downloadData.downloadUrl;
      a.download = `wallpaper-${wallpaperId}.${wallpaper.r2_key ? wallpaper.r2_key.split('.').pop() : 'jpg'}`;
      // Remove target="_blank" to ensure download instead of opening in new tab
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Increment wallpaper download count
    const { error: updateError } = await supabase
      .from('wallpapers')
      .update({
        download_count: (wallpaper.download_count || 0) + 1
      })
      .eq('id', wallpaperId);

    if (updateError) {
      console.error('Failed to update download count:', updateError);
    }

    // Decrement user's remaining downloads (only if not unlimited)
    if (!hasUnlimitedDownloads) {
      await decrementDownloads();
    }

    // Show appropriate success message
    if (hasUnlimitedDownloads) {
      toast({
        title: "Download started",
        description: "Your wallpaper is being downloaded",
      });
    } else {
      const remainingAfterDownload = downloadsRemaining !== null ? downloadsRemaining - 1 : null;
      toast({
        title: "Download started",
        description: remainingAfterDownload !== null ? 
          `You have ${remainingAfterDownload} downloads remaining today` : 
          "Your wallpaper is being downloaded",
      });
    }

    return { success: true };

  } catch (error) {
    console.error('Download error:', error);
    toast({
      title: "Download failed",
      description: "There was an error downloading the wallpaper",
      variant: "destructive",
    });
    return { success: false, message: "Download failed" };
  }
};