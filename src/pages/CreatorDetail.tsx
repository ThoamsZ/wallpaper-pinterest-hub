
import React, { useState, useEffect } from 'react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

const CreatorDetail = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [wallpapers, setWallpapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDeletingId, setCurrentDeletingId] = useState(null);

  useEffect(() => {
    fetchCreatorWallpapers();
  }, [creatorId]);

  const fetchCreatorWallpapers = async () => {
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
  };

  const handleWallpaperDelete = async (wallpaperId) => {
    if (!wallpaperId) {
      console.error("No wallpaper ID provided for deletion");
      toast({
        title: "Error",
        description: "Invalid wallpaper ID.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    setCurrentDeletingId(wallpaperId);
    
    try {
      console.log("Starting wallpaper deletion for:", wallpaperId);
      
      toast({
        title: "Deleting...",
        description: "Please wait while we delete this wallpaper.",
      });
      
      await deleteWallpaper(wallpaperId);
      
      toast({
        title: "Wallpaper Deleted",
        description: "The wallpaper has been successfully deleted.",
      });
      
      // Remove the deleted wallpaper from the state
      setWallpapers(prevWallpapers => prevWallpapers.filter(w => w.id !== wallpaperId));
    } catch (error) {
      console.error("Error in wallpaper deletion:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setCurrentDeletingId(null);
    }
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
                <div className="mt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this wallpaper from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleWallpaperDelete(wallpaper.id)}
                          disabled={isDeleting && currentDeletingId === wallpaper.id}
                        >
                          {isDeleting && currentDeletingId === wallpaper.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
    </div>
  );
};

export default CreatorDetail;
