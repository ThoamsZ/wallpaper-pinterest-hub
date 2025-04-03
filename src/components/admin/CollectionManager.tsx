import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { Image, Trash, Download, Heart, Edit, X, Check, Share } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  like_count: number;
}

interface Wallpaper {
  id: string;
  url: string;
  type: string;
  file_path: string;
  download_count: number;
  like_count: number;
}

interface CollectionWallpaper extends Wallpaper {
  collection_id: string;
}

interface EditingCollection {
  id: string;
  name: string;
  description: string | null;
}

export const CollectionManager = () => {
  const navigate = useNavigate();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isViewingCollection, setIsViewingCollection] = useState(false);
  const [selectedWallpapers, setSelectedWallpapers] = useState<string[]>([]);
  const [editingCollection, setEditingCollection] = useState<EditingCollection | null>(null);

  const { data: adminStatus, isError: isAdminError } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('admin_type')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!adminData) {
        throw new Error("Not an admin");
      }

      return true;
    },
    retry: false,
  });

  useEffect(() => {
    if (isAdminError) {
      toast({
        title: "Access Denied",
        description: "Please log in with an admin account",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [isAdminError, navigate]);

  const { data: collections = [], refetch: refetchCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('created_by', session.user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!adminStatus,
  });

  const { data: collectionWallpapers = [], refetch: refetchCollectionWallpapers } = useQuery({
    queryKey: ['collection_wallpapers', selectedCollection],
    enabled: !!selectedCollection && !!adminStatus,
    queryFn: async () => {
      if (!selectedCollection) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('collection_wallpapers')
        .select(`
          wallpaper_id,
          wallpapers (
            id,
            url,
            type,
            file_path,
            download_count,
            like_count
          )
        `)
        .eq('collection_id', selectedCollection);

      if (error) throw error;
      
      if (!data) return [];
      
      return data
        .filter(item => item.wallpapers) // Filter out any items without wallpaper data
        .map(item => ({
          id: item.wallpapers.id,
          url: item.wallpapers.url,
          type: item.wallpapers.type || 'unknown',
          file_path: item.wallpapers.file_path,
          download_count: item.wallpapers.download_count || 0,
          like_count: item.wallpapers.like_count || 0,
          collection_id: selectedCollection
        }));
    },
  });

  const { data: wallpapers = [], refetch: refetchWallpapers } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('wallpapers')
        .select('id, url, type, file_path, download_count, like_count')
        .eq('uploaded_by', session.user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!adminStatus,
  });

  const createCollection = async () => {
    try {
      if (!newCollectionName.trim()) {
        toast({
          title: "Error",
          description: "Collection name cannot be empty",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('collections')
        .insert({
          name: newCollectionName,
          description: newCollectionDesc,
          created_by: session.user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collection created successfully",
      });

      setNewCollectionName("");
      setNewCollectionDesc("");
      refetchCollections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCollectionPreviewImages = (collection: Collection) => {
    if (!collectionWallpapers || !Array.isArray(collectionWallpapers)) return [];
    return collectionWallpapers
      .filter(w => w?.collection_id === collection.id && w?.url)
      .slice(0, 4)
      .map(w => w.url);
  };

  const getCollectionWallpapers = (collection: Collection): Wallpaper[] => {
    if (!collectionWallpapers || !Array.isArray(collectionWallpapers)) return [];
    return collectionWallpapers
      .filter(cw => cw?.collection_id === collection.id)
      .map(cw => ({
        id: cw.id,
        url: cw.url,
        type: cw.type || 'unknown',
        file_path: cw.file_path,
        download_count: cw.download_count || 0,
        like_count: cw.like_count || 0
      }));
  };

  const selectedCollectionData = collections.find(c => c.id === selectedCollection);
  const selectedCollectionWallpapers = selectedCollectionData 
    ? getCollectionWallpapers(selectedCollectionData)
    : [];

  const handleDelete = async (collectionId: string) => {
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collection deleted successfully",
      });
      
      refetchCollections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMultipleWallpapers = async () => {
    try {
      console.log("Deleting wallpapers:", selectedWallpapers);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: wallpapersToDelete, error: fetchError } = await supabase
        .from('wallpapers')
        .select('*')
        .in('id', selectedWallpapers);

      if (fetchError) throw fetchError;
      console.log("Wallpapers to delete:", wallpapersToDelete);

      if (!wallpapersToDelete) return;

      for (const wallpaper of wallpapersToDelete) {
        console.log("Deleting from storage:", wallpaper.file_path);
        const { error: storageError } = await supabase.storage
          .from('wallpapers')
          .remove([wallpaper.file_path]);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
          throw storageError;
        }
      }

      const { error: collectionError } = await supabase
        .from('collection_wallpapers')
        .delete()
        .in('wallpaper_id', selectedWallpapers);

      if (collectionError) {
        console.error("Collection wallpapers deletion error:", collectionError);
        throw collectionError;
      }

      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .in('id', selectedWallpapers);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw dbError;
      }

      toast({
        title: "Success",
        description: `${selectedWallpapers.length} wallpapers deleted successfully`,
      });
      
      setSelectedWallpapers([]);
      refetchCollectionWallpapers();
    } catch (error: any) {
      console.error("Delete multiple error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallpapers",
        variant: "destructive",
      });
    }
  };

  const addToCollection = async (collectionId: string, wallpaperId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('created_by', session.user.id)
        .single();

      if (collectionError || !collectionData) {
        throw new Error("Collection not found or unauthorized");
      }

      const { data: wallpaperData, error: wallpaperError } = await supabase
        .from('wallpapers')
        .select('id')
        .eq('id', wallpaperId)
        .eq('uploaded_by', session.user.id)
        .single();

      if (wallpaperError || !wallpaperData) {
        throw new Error("Wallpaper not found or unauthorized");
      }

      const { error } = await supabase
        .from('collection_wallpapers')
        .insert({
          collection_id: collectionId,
          wallpaper_id: wallpaperId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Wallpaper added to collection",
      });
      
      refetchCollectionWallpapers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromCollection = async (collectionId: string, wallpaperId: string) => {
    try {
      const { error } = await supabase
        .from('collection_wallpapers')
        .delete()
        .eq('collection_id', collectionId)
        .eq('wallpaper_id', wallpaperId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Wallpaper removed from collection",
      });
      
      refetchCollectionWallpapers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteWallpaper = async (wallpaper: Wallpaper) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('wallpapers')
        .remove([wallpaper.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('wallpapers')
        .delete()
        .eq('id', wallpaper.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Wallpaper deleted successfully",
      });
      
      refetchCollectionWallpapers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCollection = async (collectionId: string) => {
    try {
      if (!editingCollection) return;
      
      const { error } = await supabase
        .from('collections')
        .update({
          name: editingCollection.name,
          description: editingCollection.description
        })
        .eq('id', collectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collection updated successfully",
      });
      
      setEditingCollection(null);
      refetchCollections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = async (collectionId: string, collectionName: string, description?: string | null) => {
    try {
      const shareUrl = `${window.location.origin}/collection/${collectionId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Check out this collection: ${collectionName}`,
          text: description || `A wallpaper collection: ${collectionName}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Collection link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (isViewingCollection && selectedCollection) {
    const collectionData = collections?.find(c => c.id === selectedCollection);
    if (!collectionData) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{collectionData.name}</h2>
          <div className="flex gap-4">
            {selectedWallpapers.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedWallpapers.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Multiple Wallpapers</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedWallpapers.length} wallpapers? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteMultipleWallpapers}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button onClick={() => {
              setIsViewingCollection(false);
              setSelectedCollection(null);
              setSelectedWallpapers([]);
            }}>
              Back to Collections
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {Array.isArray(collectionWallpapers) && collectionWallpapers.map((wallpaper: CollectionWallpaper) => (
            wallpaper && (
              <Card key={wallpaper.id} className={`relative ${selectedWallpapers.includes(wallpaper.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedWallpapers.includes(wallpaper.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedWallpapers([...selectedWallpapers, wallpaper.id]);
                      } else {
                        setSelectedWallpapers(selectedWallpapers.filter(id => id !== wallpaper.id));
                      }
                    }}
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {wallpaper.type || 'Unknown'} Wallpaper
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={wallpaper.url}
                    alt="Wallpaper"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>{wallpaper.download_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span>{wallpaper.like_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => removeFromCollection(selectedCollection, wallpaper.id)}
                  >
                    Remove from Collection
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteWallpaper(wallpaper)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Collection Name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
          <Textarea
            placeholder="Collection Description"
            value={newCollectionDesc}
            onChange={(e) => setNewCollectionDesc(e.target.value)}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={createCollection}>Create Collection</Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections?.map((collection: Collection) => (
          <Card key={collection.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {editingCollection?.id === collection.id ? (
                  <Input
                    value={editingCollection.name}
                    onChange={(e) => setEditingCollection({
                      ...editingCollection,
                      name: e.target.value
                    })}
                    className="mr-2"
                  />
                ) : (
                  <span>{collection.name}</span>
                )}
                <div className="flex gap-2">
                  {editingCollection?.id === collection.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateCollection(collection.id)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCollection(null)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShare(collection.id, collection.name, collection.description)}
                        className="h-8 w-8"
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCollection({
                          id: collection.id,
                          name: collection.name,
                          description: collection.description
                        })}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash className="h-4 w-4" />
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(collection.id);
                              }}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingCollection?.id === collection.id ? (
                <Textarea
                  value={editingCollection.description || ""}
                  onChange={(e) => setEditingCollection({
                    ...editingCollection,
                    description: e.target.value
                  })}
                  className="mb-4"
                  placeholder="No description"
                />
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  {collection.description || "No description"}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {getCollectionPreviewImages(collection).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(collection.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Heart className="h-4 w-4" />
                  <span>{collection.like_count || 0} likes</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    setIsViewingCollection(true);
                  }}
                >
                  View Collection
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <Image className="w-4 h-4 mr-2" />
                      Add Wallpapers
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[90%] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Add Wallpapers to Collection</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {Array.isArray(wallpapers) && wallpapers.map((wallpaper: Wallpaper) => (
                        <div key={wallpaper.id} className="relative group">
                          <img
                            src={wallpaper.url}
                            alt={`Wallpaper ${wallpaper.id}`}
                            className="w-full h-40 object-cover rounded-md"
                          />
                          <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded">
                              <Download className="w-3 h-3" />
                              <span className="text-xs">{wallpaper.download_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded">
                              <Heart className="w-3 h-3" />
                              <span className="text-xs">{wallpaper.like_count || 0}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addToCollection(collection.id, wallpaper.id)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
