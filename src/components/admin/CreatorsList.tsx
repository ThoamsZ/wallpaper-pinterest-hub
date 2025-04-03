
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
import { deleteWallpaper } from "@/utils/wallpaper-utils";

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

  const handleWallpaperDelete = async (wallpaperId: string) => {
    if (!confirm("Are you sure you want to delete this wallpaper? This action cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Starting wallpaper deletion for:", wallpaperId);
      
      const success = await deleteWallpaper(wallpaperId);
      
      if (success) {
        toast({
          title: "Wallpaper Deleted",
          description: "The wallpaper has been successfully deleted.",
        });
        
        // Refresh data after deletion
        fetchCreators();
      } else {
        toast({
          title: "Deletion Failed",
          description: "Failed to delete the wallpaper. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in wallpaper deletion:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

      // Delete each wallpaper and all associated data
      let successCount = 0;
      if (creatorWallpapers && creatorWallpapers.length > 0) {
        for (const wallpaper of creatorWallpapers) {
          const deleted = await deleteWallpaper(wallpaper.id, wallpaper.file_path);
          if (deleted) successCount++;
        }
        console.log(`Deleted ${successCount} of ${creatorWallpapers.length} wallpapers`);
      }

      // Delete collections created by this user
      const { error: deleteCollectionsError } = await supabase
        .from('collections')
        .delete()
        .eq('created_by', userId);

      if (deleteCollectionsError) {
        console.error('Error deleting collections:', deleteCollectionsError);
        throw deleteCollectionsError;
      }

      console.log('Deleted collections');

      // Remove admin status
      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (adminError) {
        console.error('Error deleting admin status:', adminError);
        throw adminError;
      }

      console.log('Deleted admin status');

      // Update user record, remove creator code
      const { error: userError } = await supabase
        .from('users')
        .update({ creator_code: null })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        throw userError;
      }

      console.log('Updated user, removed creator code');

      // Update UI
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
