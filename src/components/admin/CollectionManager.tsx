import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Image, Trash } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Wallpaper {
  id: string;
  url: string;
  type: string;
  file_path: string;
}

interface CollectionWallpaper extends Wallpaper {
  collection_id: string;
}

export const CollectionManager = () => {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isViewingCollection, setIsViewingCollection] = useState(false);

  const { data: collections = [], refetch: refetchCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: wallpapers = [] } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallpapers')
        .select('id, url, type, file_path');

      if (error) throw error;
      return data || [];
    }
  });

  const { data: collectionWallpapers = [], refetch: refetchCollectionWallpapers } = useQuery({
    queryKey: ['collection_wallpapers', selectedCollection],
    enabled: !!selectedCollection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_wallpapers')
        .select(`
          wallpaper_id,
          wallpapers (
            id,
            url,
            type,
            file_path
          )
        `)
        .eq('collection_id', selectedCollection);

      if (error) throw error;
      return data.map((item: any) => ({
        ...item.wallpapers,
        collection_id: selectedCollection
      })) || [];
    }
  });

  const createCollection = async () => {
    try {
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

  const addToCollection = async (collectionId: string, wallpaperId: string) => {
    try {
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
      // First delete from storage
      const { error: storageError } = await supabase.storage
        .from('wallpapers')
        .remove([wallpaper.file_path]);

      if (storageError) throw storageError;

      // Then delete from database
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

  const getCollectionPreviewImages = (collectionId: string) => {
    return collectionWallpapers
      .filter(w => w.collection_id === collectionId)
      .slice(0, 4)
      .map(w => w.url);
  };

  if (isViewingCollection && selectedCollection) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {collections.find(c => c.id === selectedCollection)?.name}
          </h2>
          <Button onClick={() => {
            setIsViewingCollection(false);
            setSelectedCollection(null);
          }}>
            Back to Collections
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectionWallpapers.map((wallpaper: CollectionWallpaper) => (
            <Card key={wallpaper.id}>
              <CardContent className="pt-6">
                <img
                  src={wallpaper.url}
                  alt="Wallpaper"
                  className="w-full h-48 object-cover rounded-md"
                />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection: Collection) => (
          <Card key={collection.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {collection.description || "No description"}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {getCollectionPreviewImages(collection.id).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCollection(collection.id);
                    setIsViewingCollection(true);
                  }}
                >
                  View Collection
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Image className="w-4 h-4 mr-2" />
                      Add Wallpapers
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Wallpapers to Collection</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {wallpapers.map((wallpaper: Wallpaper) => (
                        <div key={wallpaper.id} className="relative group">
                          <img
                            src={wallpaper.url}
                            alt={`Wallpaper ${wallpaper.id}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <Button
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            size="sm"
                            onClick={() => addToCollection(collection.id, wallpaper.id)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};