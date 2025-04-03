
import { useState, useEffect } from "react";
import { NavigateFunction } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase, deleteFileFromStorage, checkTableExists } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Ban, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CreatorsListProps {
  navigate: NavigateFunction;
}

export const CreatorsList = ({ navigate }: CreatorsListProps) => {
  const [creators, setCreators] = useState<any[]>([]);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching creators...");
      const { data: adminUsers, error: adminsError } = await supabase
        .from('admin_users')
        .select(`
          *,
          profile:users!inner(
            email,
            creator_code
          )
        `)
        .eq('admin_type', 'admin');

      if (adminsError) {
        console.error("Error fetching admins:", adminsError);
        throw adminsError;
      }

      console.log("Fetched creators:", adminUsers?.length || 0);
      
      const formattedAdminUsers = adminUsers?.map(admin => ({
        ...admin,
        users: admin.profile
      })) || [];

      setCreators(formattedAdminUsers);

      console.log("Fetching all wallpapers for creators...");
      const wallpapersPromises = adminUsers.map((admin: any) =>
        supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', admin.user_id)
      );

      const wallpapersResults = await Promise.all(wallpapersPromises);
      const allWallpapers = wallpapersResults.flatMap(result => result.data || []);
      console.log("Total wallpapers fetched:", allWallpapers.length);
      setWallpapers(allWallpapers);
    } catch (error: any) {
      console.error("Error in fetchCreators:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creators",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockCreator = async (adminId: string) => {
    try {
      console.log("Toggling block status for creator:", adminId);
      
      // Get the current creator to check if they're blocked
      const creator = creators.find(c => c.id === adminId);
      const newBlockStatus = !(creator?.is_blocked || false);
      
      const { error } = await supabase
        .from('admin_users')
        .update({ is_blocked: newBlockStatus })
        .eq('id', adminId);

      if (error) {
        console.error("Error blocking/unblocking creator:", error);
        throw error;
      }

      // Update UI
      setCreators(prev =>
        prev.map(creator =>
          creator.id === adminId
            ? { ...creator, is_blocked: newBlockStatus }
            : creator
        )
      );

      toast({
        title: "Success",
        description: `Creator ${newBlockStatus ? 'blocked' : 'unblocked'} successfully`,
      });
    } catch (error: any) {
      console.error("Error in handleBlockCreator:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update creator status",
        variant: "destructive",
      });
    }
  };

  const deleteWallpaper = async (wallpaperId: string, filePath: string) => {
    try {
      console.log("Deleting wallpaper:", wallpaperId);
      
      // Step 1: Verify wallpaper exists before deletion
      const { data: wallpaperExists, error: wallpaperCheckError } = await supabase
        .from('wallpapers')
        .select('id')
        .eq('id', wallpaperId)
        .single();
      
      if (wallpaperCheckError) {
        if (wallpaperCheckError.code === 'PGRST116') {
          console.log("Wallpaper already deleted");
          return;
        }
        throw wallpaperCheckError;
      }
      
      if (!wallpaperExists) {
        console.log("Wallpaper doesn't exist");
        return;
      }
      
      // Step 2: Delete file from storage
      if (filePath) {
        const deleted = await deleteFileFromStorage(filePath);
        console.log("Storage file deletion result:", deleted ? "Success" : "Failed");
      }
      
      // Step 3: Update user favorites
      const { data: usersWithFavorite } = await supabase
        .from('users')
        .select('id, favor_image')
        .filter('favor_image', 'cs', `{${wallpaperId}}`);
      
      if (usersWithFavorite && usersWithFavorite.length > 0) {
        for (const user of usersWithFavorite) {
          const updatedFavorites = (user.favor_image || []).filter(id => id !== wallpaperId);
          
          await supabase
            .from('users')
            .update({ favor_image: updatedFavorites })
            .eq('id', user.id);
        }
      }
      
      // Step 4: Remove from collections
      await supabase
        .from('collection_wallpapers')
        .delete()
        .eq('wallpaper_id', wallpaperId);
      
      // Step 5: Check for VIP wallpapers table and remove if exists
      const vipTableExists = await checkTableExists('vip_wallpapers');
      
      if (vipTableExists) {
        await supabase
          .from('vip_wallpapers')
          .delete()
          .eq('wallpaper_id', wallpaperId);
      }
      
      // Step 6: Delete from wallpapers table
      const { error: deleteError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', wallpaperId);
      
      if (deleteError) throw deleteError;
      
      console.log("Successfully deleted wallpaper");
      return true;
    } catch (error) {
      console.error("Wallpaper deletion error:", error);
      return false;
    }
  };

  const handleDeleteCreator = async (adminId: string, userId: string) => {
    setIsDeleting(true);
    setDeleteItemId(adminId);
    
    try {
      console.log('Deleting creator:', { adminId, userId });

      const { data: creatorWallpapers, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', userId);

      if (wallpapersError) {
        console.error('Error fetching wallpapers:', wallpapersError);
        throw wallpapersError;
      }

      console.log('Found wallpapers:', creatorWallpapers?.length || 0);

      if (creatorWallpapers && creatorWallpapers.length > 0) {
        for (const wallpaper of creatorWallpapers) {
          await deleteWallpaper(wallpaper.id, wallpaper.file_path);
        }
        console.log('Deleted all wallpapers');
      }

      const { error: deleteCollectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('created_by', userId);

      if (deleteCollectionsError) {
        console.error('Error deleting collections:', deleteCollectionsError);
        throw deleteCollectionsError;
      }

      console.log('Deleted collections');

      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (adminError) {
        console.error('Error deleting admin status:', adminError);
        throw adminError;
      }

      console.log('Deleted admin status');

      const { error: userError } = await supabase
        .from('users')
        .update({ creator_code: null })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        throw userError;
      }

      console.log('Updated user, removed creator code');

      setCreators(prev => prev.filter(creator => creator.id !== adminId));
      setWallpapers(prev => prev.filter(w => w.uploaded_by !== userId));

      toast({
        title: "Success",
        description: "Creator and all their data removed successfully",
      });
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete creator",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteItemId(null);
      fetchCreators(); // Refresh the data
    }
  };

  const filteredCreators = searchTerm 
    ? creators.filter(creator => 
        creator.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.users?.creator_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : creators;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search creators by email or creator code..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCreators.map((creator) => (
          <Card 
            key={creator.id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate(`/admin-manager/creator/${creator.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span>{creator.users?.email}</span>
                  <span className="text-sm text-muted-foreground">Creator Code: {creator.users?.creator_code || 'N/A'}</span>
                </div>
                {creator.is_blocked && (
                  <span className="text-sm text-red-500">Blocked</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Wallpapers:</h3>
                <div className="p-4 border rounded-md bg-muted/30">
                  <p className="text-muted-foreground">
                    {wallpapers.filter(w => w.uploaded_by === creator.user_id).length} wallpapers uploaded
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={(e) => e.stopPropagation()} // Prevent card click event
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {creator.is_blocked ? 'Unblock' : 'Block'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {creator.is_blocked ? 'Unblock Creator' : 'Block Creator'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to {creator.is_blocked ? 'unblock' : 'block'} this creator?
                      {!creator.is_blocked && " They won't be able to access the admin panel while blocked."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleBlockCreator(creator.id)}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive"
                    onClick={(e) => e.stopPropagation()} // Prevent card click event
                    disabled={isDeleting && deleteItemId === creator.id}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {isDeleting && deleteItemId === creator.id ? "Removing..." : "Remove"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Creator</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this creator? This will:
                      <ul className="list-disc list-inside mt-2">
                        <li>Delete all their wallpapers</li>
                        <li>Remove their creator privileges</li>
                        <li>Delete their creator code</li>
                      </ul>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCreator(creator.id, creator.user_id)}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isDeleting}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {filteredCreators.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No creators found.</p>
        </div>
      )}
    </div>
  );
};
