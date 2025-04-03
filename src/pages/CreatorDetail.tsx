import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase, checkTableExists } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Trash,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CreatorDetail = () => {
  const navigate = useNavigate();
  const { creatorId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkAdminManagerStatus();
    if (creatorId) {
      fetchCreatorDetails(creatorId);
    }
  }, [creatorId]);

  const checkAdminManagerStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin-panel');
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select()
        .eq('user_id', session.user.id)
        .eq('admin_type', 'admin_manager')
        .maybeSingle();

      if (adminError || !adminData) {
        console.error('Admin check error:', adminError);
        navigate('/admin-panel');
        return;
      }
    } catch (error) {
      console.error('Error checking admin manager status:', error);
      navigate('/admin-panel');
    }
  };

  const fetchCreatorDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          *,
          profile:users!inner(
            email,
            creator_code
          )
        `)
        .eq('id', id)
        .single();

      if (adminError) throw adminError;
      
      setCreator(adminData);

      const { data: wallpaperData, error: wallpaperError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', adminData.user_id);

      if (wallpaperError) throw wallpaperError;
      
      setWallpapers(wallpaperData || []);

      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('created_by', adminData.user_id);

      if (collectionError) throw collectionError;
      
      setCollections(collectionData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creator details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallpaper = async (wallpaperId: string, filePath: string, wallpaperUrl: string) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      console.log("Starting wallpaper deletion process:", wallpaperId);
      
      // First check if the wallpaper exists
      const { data: wallpaperCheck, error: wallpaperCheckError } = await supabase
        .from('wallpapers')
        .select('id')
        .eq('id', wallpaperId)
        .single();
      
      if (wallpaperCheckError) {
        console.error("Wallpaper check error:", wallpaperCheckError);
        if (wallpaperCheckError.code === 'PGRST116') {
          // If wallpaper doesn't exist, we're done
          toast({ title: "Wallpaper already deleted" });
          setIsDeleting(false);
          setWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
          return;
        }
        throw wallpaperCheckError;
      }
      
      // Remove from wallpaper_likes if it exists
      try {
        const { error: likesError } = await supabase
          .from('wallpaper_likes')
          .delete()
          .eq('wallpaper_id', wallpaperId);
        
        if (likesError && likesError.code !== '42P01') { // Ignore table doesn't exist error
          console.error("Error removing from wallpaper_likes:", likesError);
        }
      } catch (error) {
        console.error("Exception removing from wallpaper_likes:", error);
        // Continue execution even if this fails
      }

      console.log("Removed from wallpaper_likes");

      // Remove from collection_wallpapers
      try {
        const { error: collectionWallpapersError } = await supabase
          .from('collection_wallpapers')
          .delete()
          .eq('wallpaper_id', wallpaperId);

        if (collectionWallpapersError) {
          console.error("Error removing from collection_wallpapers:", collectionWallpapersError);
        }
      } catch (error) {
        console.error("Exception removing from collection_wallpapers:", error);
        // Continue execution even if this fails
      }

      console.log("Removed from collection_wallpapers");

      // Remove from vip_wallpapers if it exists
      try {
        const { error: vipWallpapersError } = await supabase
          .from('vip_wallpapers')
          .delete()
          .eq('wallpaper_id', wallpaperId);
        
        if (vipWallpapersError && vipWallpapersError.code !== '42P01') { // Ignore table doesn't exist error
          console.error("Error removing from vip_wallpapers:", vipWallpapersError);
        }
      } catch (error) {
        console.error("Exception removing from vip_wallpapers:", error);
        // Continue execution even if this fails
      }

      console.log("Removed from vip_wallpapers");

      // Delete the file from storage
      try {
        const { error: storageError } = await supabase.storage
          .from('wallpapers')
          .remove([filePath]);

        if (storageError) {
          console.error("Error deleting from storage:", storageError);
        }
      } catch (error) {
        console.error("Exception deleting from storage:", error);
        // Continue execution even if this fails
      }

      console.log("Removed file from storage");

      // Create a notification for the creator if they exist
      if (creator && creator.user_id) {
        try {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: creator.user_id,
              message: `Your wallpaper "${filePath.split('/').pop()}" has been removed by an admin.`,
              type: 'wallpaper_deleted',
              read: false
            });

          if (notificationError && notificationError.code !== '42P01') { // Ignore table doesn't exist error
            console.error("Error creating notification:", notificationError);
          }
        } catch (error) {
          console.error("Exception creating notification:", error);
          // Continue execution even if this fails
        }
        
        console.log("Created notification for creator");
      }

      // Finally delete from wallpapers table
      try {
        const { error: dbError } = await supabase
          .from('wallpapers')
          .delete()
          .eq('id', wallpaperId);

        if (dbError) {
          console.error("Error deleting wallpaper:", dbError);
          throw dbError;
        }
      } catch (error) {
        console.error("Exception deleting wallpaper:", error);
        throw error;
      }

      console.log("Removed from wallpapers table");

      // Update UI
      if (selectedImage === wallpaperUrl) {
        setSelectedImage(null);
      }

      setWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
      
      toast({
        title: "Success",
        description: "Wallpaper completely removed from the system and creator notified",
      });
    } catch (error: any) {
      console.error("Full deletion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpaper",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      console.log("Starting collection deletion process:", collectionId);
      
      // First check if the collection exists
      const { data: collectionCheck, error: collectionCheckError } = await supabase
        .from('collections')
        .select('id')
        .eq('id', collectionId)
        .single();
      
      if (collectionCheckError) {
        console.error("Collection check error:", collectionCheckError);
        if (collectionCheckError.code === 'PGRST116') {
          // If collection doesn't exist, we're done
          toast({ title: "Collection already deleted" });
          setIsDeleting(false);
          setCollections(prev => prev.filter(c => c.id !== collectionId));
          return;
        }
        throw collectionCheckError;
      }
      
      // Remove from collection_wallpapers
      try {
        const { error: collectionWallpapersError } = await supabase
          .from('collection_wallpapers')
          .delete()
          .eq('collection_id', collectionId);

        if (collectionWallpapersError) {
          console.error("Error removing from collection_wallpapers:", collectionWallpapersError);
        }
      } catch (error) {
        console.error("Exception removing from collection_wallpapers:", error);
        // Continue execution even if this fails
      }

      console.log("Removed from collection_wallpapers");

      // Remove from collection_likes
      try {
        const { error: likesError } = await supabase
          .from('collection_likes')
          .delete()
          .eq('collection_id', collectionId);

        if (likesError) {
          console.error("Error removing from collection_likes:", likesError);
        }
      } catch (error) {
        console.error("Exception removing from collection_likes:", error);
        // Continue execution even if this fails
      }

      console.log("Removed from collection_likes");

      // Finally delete from collections table
      try {
        const { error: collectionError } = await supabase
          .from('collections')
          .delete()
          .eq('id', collectionId);

        if (collectionError) {
          console.error("Error deleting collection:", collectionError);
          throw collectionError;
        }
      } catch (error) {
        console.error("Exception deleting collection:", error);
        throw error;
      }

      console.log("Removed from collections table");

      // Update UI
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      
      toast({
        title: "Success",
        description: "Collection deleted successfully",
      });
    } catch (error: any) {
      console.error("Full deletion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete collection",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openImagePreview = (url: string) => {
    setSelectedImage(url);
  };

  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="container mx-auto p-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin-manager')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Manager
        </Button>
        <div className="text-center py-10">
          <p className="text-muted-foreground">Creator not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="outline" 
        onClick={() => navigate('/admin-manager')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin Manager
      </Button>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Creator Details</h1>
        <p className="text-muted-foreground">
          {creator.profile?.email} 
          {creator.profile?.creator_code && ` (${creator.profile.creator_code})`}
        </p>
        {creator.is_blocked && (
          <p className="text-sm text-red-500 mt-1">This creator is currently blocked</p>
        )}
      </div>

      <Tabs defaultValue="wallpapers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="wallpapers">Wallpapers ({wallpapers.length})</TabsTrigger>
          <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wallpapers">
          {wallpapers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallpapers.map((wallpaper) => (
                    <TableRow key={wallpaper.id}>
                      <TableCell className="font-medium">
                        <div 
                          className="w-16 h-16 cursor-pointer rounded overflow-hidden bg-gray-100 dark:bg-gray-800"
                          onClick={() => openImagePreview(wallpaper.url)}
                        >
                          <img 
                            src={wallpaper.compressed_url || wallpaper.url} 
                            alt="Wallpaper preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{wallpaper.file_path.split('/').pop()}</TableCell>
                      <TableCell>{wallpaper.type}</TableCell>
                      <TableCell>{wallpaper.download_count || 0}</TableCell>
                      <TableCell>{wallpaper.like_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                              <Trash className="w-4 h-4 mr-2" />
                              {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Wallpaper</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this wallpaper? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteWallpaper(wallpaper.id, wallpaper.file_path, wallpaper.url)}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={isDeleting}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No wallpapers found.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="collections">
          {collections.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">{collection.name}</TableCell>
                      <TableCell>{collection.description || '-'}</TableCell>
                      <TableCell>{collection.like_count || 0}</TableCell>
                      <TableCell>{new Date(collection.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                              <Trash className="w-4 h-4 mr-2" />
                              {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this collection? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCollection(collection.id)}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={isDeleting}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No collections found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedImage} onOpenChange={() => selectedImage && closeImagePreview()}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <DialogClose className="absolute top-4 right-4 z-10">
              <Button variant="secondary" size="icon" className="rounded-full bg-black/50 hover:bg-black/70 border-0">
                <X className="h-5 w-5 text-white" />
              </Button>
            </DialogClose>
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Wallpaper preview" 
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorDetail;
