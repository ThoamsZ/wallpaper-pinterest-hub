
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
      return false;
    }
    
    if (!wallpaper) {
      console.error("Wallpaper not found");
      return false;
    }
    
    console.log(`Found wallpaper with path: ${wallpaper.file_path}`);
    
    // 2. First remove from collections
    try {
      const { error: collectionsError } = await supabase
        .from('collection_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId);
      
      if (collectionsError) {
        console.error("Error removing from collections:", collectionsError);
      } else {
        console.log("Removed from collection_wallpapers");
      }
    } catch (error) {
      console.error("Exception removing from collections:", error);
    }
    
    // 3. Then remove from VIP wallpapers if present
    try {
      const { error: vipError } = await supabase
        .from('vip_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId);
      
      if (vipError) {
        console.error("Error removing from VIP wallpapers:", vipError);
      } else {
        console.log("Removed from vip_wallpapers if present");
      }
    } catch (error) {
      console.error("Exception removing from VIP wallpapers:", error);
    }
    
    // 4. Remove from user favorites
    try {
      // Find users who have this wallpaper in their favorites
      const { data: usersWithFavorite, error: usersFavorError } = await supabase
        .from('users')
        .select('id, favor_image')
        .filter('favor_image', 'cs', `{${wallpaperId}}`);
      
      if (usersFavorError) {
        console.error("Error finding users with this wallpaper in favorites:", usersFavorError);
      } else if (usersWithFavorite && usersWithFavorite.length > 0) {
        console.log(`Updating favorites for ${usersWithFavorite.length} users`);
        
        for (const user of usersWithFavorite) {
          const updatedFavorites = (user.favor_image || []).filter(favId => favId !== wallpaperId);
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ favor_image: updatedFavorites })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`Error updating favorites for user ${user.id}:`, updateError);
          } else {
            console.log(`Updated favorites for user ${user.id}`);
          }
        }
      }
    } catch (error) {
      console.error("Exception updating favorites:", error);
    }
    
    // 5. Delete storage file
    if (wallpaper.file_path) {
      try {
        console.log(`Deleting file from storage: ${wallpaper.file_path}`);
        await deleteFileFromStorage(wallpaper.file_path);
      } catch (error) {
        console.error("Error deleting from storage:", error);
      }
    }
    
    // 6. Finally delete the wallpaper record
    const { error: deleteError } = await supabase
      .from('wallpapers')
      .delete()
      .eq('id', wallpaperId);
    
    if (deleteError) {
      console.error("Error deleting wallpaper:", deleteError);
      return false;
    }
    
    console.log(`Successfully deleted wallpaper ${wallpaperId}`);
    return true;
  } catch (error) {
    console.error("Error in deleteWallpaper:", error);
    return false;
  }
};
