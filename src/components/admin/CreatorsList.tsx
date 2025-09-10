
import { useState, useEffect } from "react";
import { NavigateFunction } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase, deleteFileFromStorage, checkTableExists } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Ban, UserX, Trash2, ImageIcon } from "lucide-react";
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
      
      // Get creators from new table structure
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('*');

      if (creatorsError) {
        console.error("Error fetching creators:", creatorsError);
        throw creatorsError;
      }

      console.log("Fetched creators:", creatorsData?.length || 0);

      // Use creators data directly since it already has email and creator_code
      setCreators(creatorsData || []);

      console.log("Fetching all wallpapers for creators...");
      const wallpapersPromises = (creatorsData || []).map((creator: any) =>
        supabase
          .from('wallpapers')
          .select('*')
          .eq('uploaded_by', creator.user_id)
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
        .from('creators')
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

      // Remove creator status
      const { error: creatorError } = await supabase
        .from('creators')
        .delete()
        .eq('id', adminId);

      if (creatorError) {
        console.error('Error deleting creator status:', creatorError);
        throw creatorError;
      }

      console.log('Deleted creator status');

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
        creator.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.creator_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : creators;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleDeleteAllWallpapers = async (userId: string, creatorEmail: string) => {
    if (!confirm(`Are you sure you want to delete ALL wallpapers from ${creatorEmail}? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const creatorWallpapers = wallpapers.filter(w => w.uploaded_by === userId);
      console.log(`Deleting ${creatorWallpapers.length} wallpapers for creator ${userId}`);
      
      let successCount = 0;
      for (const wallpaper of creatorWallpapers) {
        const deleted = await deleteWallpaper(wallpaper.id);
        if (deleted) successCount++;
      }
      
      toast({
        title: "Wallpapers Deleted",
        description: `Successfully deleted ${successCount} of ${creatorWallpapers.length} wallpapers.`,
      });
      
      // Refresh data
      fetchCreators();
    } catch (error) {
      console.error("Error deleting all wallpapers:", error);
      toast({
        title: "Error",
        description: "Failed to delete wallpapers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="space-y-6">
        {filteredCreators.map((creator) => {
          const creatorWallpapers = wallpapers.filter(w => w.uploaded_by === creator.user_id);
          
          return (
            <Card key={creator.id} className="w-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span>{creator.email}</span>
                    <span className="text-sm text-muted-foreground">Creator Code: {creator.creator_code || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {creator.is_blocked && (
                      <span className="text-sm text-red-500">Blocked</span>
                    )}
                    <span className="text-sm text-muted-foreground">{creatorWallpapers.length} wallpapers</span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {creatorWallpapers.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Wallpapers:</h3>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAllWallpapers(creator.user_id, creator.email)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {creatorWallpapers.map((wallpaper) => (
                        <div key={wallpaper.id} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-lg border">
                            <img 
                              src={wallpaper.compressed_url || wallpaper.url} 
                              alt="Wallpaper" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={() => handleWallpaperDelete(wallpaper.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No wallpapers uploaded</p>
                    </div>
                  </div>
                )}
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
         );
        })}
       </div>
      
      {filteredCreators.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No creators found.</p>
        </div>
      )}
    </div>
  );
};
