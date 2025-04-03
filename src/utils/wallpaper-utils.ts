
import { supabase, deleteFileFromStorage } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Completely deletes a wallpaper and all its dependencies from the system
 * 
 * @param wallpaperId - The ID of the wallpaper to delete
 * @returns Promise<boolean> - True if deletion was successful, false otherwise
 */
export const deleteWallpaper = async (wallpaperId: string): Promise<boolean> => {
  console.log(`Starting deletion process for wallpaper ${wallpaperId}`);
  
  try {
    // 1. Get wallpaper data first (we need the file path)
    const { data: wallpaper, error: wallpaperError } = await supabase
      .from('wallpapers')
      .select('*')
      .eq('id', wallpaperId)
      .single();
    
    if (wallpaperError) {
      console.error("Error fetching wallpaper data:", wallpaperError);
      throw new Error(`Could not fetch wallpaper data: ${wallpaperError.message}`);
    }
    
    if (!wallpaper) {
      console.error("Wallpaper not found");
      throw new Error("Wallpaper not found");
    }
    
    console.log(`Found wallpaper with path: ${wallpaper.file_path}`);
    
    // 2. Execute all related data deletions in parallel
    // First, update favorite lists
    console.log("Removing wallpaper from all user favorites");
    try {
      // Use direct SQL query to update the array
      const { error: favoritesError } = await supabase.rpc(
        'remove_wallpaper_from_favorites',
        { wallpaper_id: wallpaperId }
      );
      
      if (favoritesError) {
        console.error("Error removing from favorites with RPC:", favoritesError);
        
        // Fallback if the RPC call fails
        const { error: directUpdateError } = await supabase
          .from('users')
          .update({
            favor_image: supabase.sql`array_remove(favor_image, ${wallpaperId}::uuid)`
          })
          .filter('favor_image', 'cs', `{${wallpaperId}}`);
        
        if (directUpdateError) {
          console.error("Error with direct update of favorites:", directUpdateError);
        }
      }
    } catch (favError) {
      console.error("Exception when removing from favorites:", favError);
      // Continue with the process despite errors
    }

    console.log("Removing wallpaper from all collections");
    try {
      const { error: collectionsError } = await supabase
        .from('collection_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId);
      
      if (collectionsError) {
        console.error("Error removing from collections:", collectionsError);
      }
    } catch (collError) {
      console.error("Exception when removing from collections:", collError);
    }

    console.log("Removing wallpaper from VIP wallpapers if present");
    try {
      const { error: vipWallpapersError } = await supabase
        .from('vip_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId);
      
      if (vipWallpapersError) {
        console.error("Error removing from VIP wallpapers:", vipWallpapersError);
      }
    } catch (vipError) {
      console.error("Exception when removing from VIP wallpapers:", vipError);
    }
    
    // 3. Delete the wallpaper from storage
    if (wallpaper.file_path) {
      console.log(`Deleting file from storage: ${wallpaper.file_path}`);
      try {
        const storageResult = await deleteFileFromStorage(wallpaper.file_path);
        
        if (!storageResult) {
          console.warn(`Warning: Failed to delete file from storage: ${wallpaper.file_path}`);
        }
      } catch (storageError) {
        console.error("Error during storage deletion:", storageError);
      }
    } else {
      console.warn("No file path found for wallpaper, skipping storage deletion");
    }
    
    // 4. Finally, delete the wallpaper record itself
    console.log("Deleting wallpaper record from database");
    try {
      const { error: deletionError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', wallpaperId);
      
      if (deletionError) {
        console.error("Error deleting wallpaper record:", deletionError);
        throw new Error(`Failed to delete wallpaper record: ${deletionError.message}`);
      }
      
      console.log(`Successfully deleted wallpaper ${wallpaperId}`);
      return true;
    } catch (deletionError) {
      console.error("Error during final wallpaper deletion:", deletionError);
      throw deletionError;
    }
  } catch (error) {
    console.error("Wallpaper deletion failed:", error);
    return false;
  }
};
