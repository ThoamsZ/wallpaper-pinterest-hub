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
}

export const CollectionManager = () => {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

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
        .select('id, url, type');

      if (error) throw error;
      return data || [];
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
          <Card key={collection.id}>
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {collection.description || "No description"}
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-4">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};