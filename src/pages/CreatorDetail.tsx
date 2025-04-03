
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { deleteWallpaper } from "@/utils/wallpaper-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

const CreatorDetail = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [wallpapers, setWallpapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDeletingId, setCurrentDeletingId] = useState(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [wallpaperToDelete, setWallpaperToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-render

  // Convert fetchCreatorWallpapers to useCallback to prevent unnecessary re-renders
  const fetchCreatorWallpapers = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching creator details for ID:", creatorId);
      
      const { data: creatorData, error: creatorError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('id', creatorId)
        .single();

      if (creatorError) {
        console.error("Error fetching creator data:", creatorError);
        throw creatorError;
      }

      console.log("Looking for wallpapers with user_id:", creatorData.user_id);
      
      const { data: wallpapersData, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', creatorData.user_id);

      if (wallpapersError) {
        console.error("Error fetching wallpapers:", wallpapersError);
        throw wallpapersError;
      }

      console.log("Wallpapers found:", wallpapersData?.length || 0);
      
      // Debug log to see what wallpapers we're getting
      if (wallpapersData) {
        console.log("Wallpaper IDs:", wallpapersData.map(w => w.id));
      }
      
      setWallpapers(wallpapersData || []);
    } catch (error) {
      console.error("Error fetching creator details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creator details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [creatorId]);

  // Use effect to fetch wallpapers on mount and when refreshKey changes
  useEffect(() => {
    fetchCreatorWallpapers();
  }, [fetchCreatorWallpapers, refreshKey]);

  const prepareWallpaperDelete = (wallpaper) => {
    console.log("Preparing to delete wallpaper:", wallpaper.id);
    setWallpaperToDelete(wallpaper);
    setDeleteAlertOpen(true);
    setDeleteError(null);
  };

  const handleWallpaperDelete = async () => {
    if (!wallpaperToDelete || !wallpaperToDelete.id) {
      console.error("No wallpaper ID provided for deletion");
      toast({
        title: "Error",
        description: "Invalid wallpaper ID.",
        variant: "destructive",
      });
      return;
    }
    
    const wallpaperId = wallpaperToDelete.id;
    console.log("Starting deletion process for wallpaper ID:", wallpaperId);
    
    setIsDeleting(true);
    setCurrentDeletingId(wallpaperId);
    setDeleteError(null);
    
    try {
      toast({
        title: "Deleting...",
        description: "Please wait while we delete this wallpaper.",
      });
      
      // Perform the deletion
      await deleteWallpaper(wallpaperId);
      console.log("Deletion successful for wallpaper:", wallpaperId);
      
      // Update local state to remove the deleted wallpaper
      console.log("Updating UI state - Before:", wallpapers.length, "wallpapers");
      setWallpapers(prevWallpapers => {
        const filteredWallpapers = prevWallpapers.filter(w => w.id !== wallpaperId);
        console.log("Updating UI state - After:", filteredWallpapers.length, "wallpapers");
        return filteredWallpapers;
      });
      
      // Directly refetch to ensure we have the latest data
      console.log("Triggering refresh after deletion");
      setRefreshKey(prevKey => prevKey + 1);
      
      toast({
        title: "Wallpaper Deleted",
        description: "The wallpaper has been successfully deleted.",
      });
      
      setDeleteAlertOpen(false);
    } catch (error) {
      console.error("Error in wallpaper deletion:", error);
      setDeleteError(error.message || "An unexpected error occurred during deletion");
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setCurrentDeletingId(null);
      setWallpaperToDelete(null);
    }
  };

  // Function to manually refresh the wallpapers list
  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back to Creators
        </Button>
        <h1 className="text-2xl font-bold">Creator Wallpapers</h1>
        <Button variant="secondary" onClick={handleRefresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {wallpapers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wallpapers.map((wallpaper) => (
            <Card key={wallpaper.id} className="overflow-hidden">
              <div className="relative">
                <AspectRatio ratio={3/4}>
                  <img 
                    src={wallpaper.compressed_url} 
                    alt={`Wallpaper ${wallpaper.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </AspectRatio>
              </div>
              <CardContent className="p-3">
                <div className="flex flex-col space-y-1">
                  <div className="text-xs text-muted-foreground truncate">
                    ID: {wallpaper.id.substring(0, 8)}...
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={() => prepareWallpaperDelete(wallpaper)}
                    disabled={isDeleting && currentDeletingId === wallpaper.id}
                  >
                    {isDeleting && currentDeletingId === wallpaper.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">No wallpapers found for this creator.</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this wallpaper from our servers.
              {deleteError && (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                  Error: {deleteError}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWallpaperDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreatorDetail;
