
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

    // 2. Delete all related data in parallel for efficiency
    const promises = [];
    
    // Remove from users favorites using RPC function
    console.log("Removing wallpaper from all user favorites");
    promises.push(
      supabase.rpc('remove_wallpaper_from_favorites', { wallpaper_id: wallpaperId })
        .then(({ error }) => {
          if (error) {
            console.error("Error removing from favorites:", error);
            throw new Error(`Failed to remove from favorites: ${error.message}`);
          }
        })
    );
    
    // Remove from collections
    console.log("Removing wallpaper from all collections");
    promises.push(
      supabase
        .from('collection_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId)
        .then(({ error }) => {
          if (error) {
            console.error("Error removing from collections:", error);
            throw new Error(`Failed to remove from collections: ${error.message}`);
          }
        })
    );

    // Remove from VIP wallpapers if present
    console.log("Removing wallpaper from VIP wallpapers if present");
    promises.push(
      supabase
        .from('vip_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId)
        .then(({ error }) => {
          if (error) {
            console.error("Error removing from VIP wallpapers:", error);
            throw new Error(`Failed to remove from VIP wallpapers: ${error.message}`);
          }
        })
    );
    
    // Wait for all cleanup operations to complete
    await Promise.all(promises);
    
    // 3. Delete the file from storage
    if (wallpaper.file_path) {
      console.log(`Deleting file from storage: ${wallpaper.file_path}`);
      const storageResult = await deleteFileFromStorage(wallpaper.file_path);
      
      if (!storageResult) {
        console.warn(`Warning: Failed to delete file from storage: ${wallpaper.file_path}`);
        // Continue despite storage deletion failure
      }
    }
    
    // 4. Finally, delete the wallpaper record itself
    console.log("Deleting wallpaper record from database");
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
  } catch (error) {
    console.error("Wallpaper deletion failed:", error);
    throw error; // Re-throw to handle in the component
  }
};
