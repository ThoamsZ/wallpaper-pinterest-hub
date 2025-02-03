import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const CreatorProfile = () => {
  const { creatorCode } = useParams();
  const [activeTab, setActiveTab] = useState("wallpapers");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const { data: creatorData, isLoading: isCreatorLoading } = useQuery({
    queryKey: ['creator', creatorCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, creator_code')
        .eq('creator_code', creatorCode)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch creator information",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "Creator not found",
          variant: "destructive",
        });
        throw new Error("Creator not found");
      }

      return data;
    },
    enabled: !!creatorCode,
  });

  const { data: wallpapers = [], isLoading: isWallpapersLoading } = useQuery({
    queryKey: ['creator-wallpapers', creatorData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', creatorData.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch wallpapers",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
    enabled: !!creatorData?.id,
  });

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery({
    queryKey: ['creator-collections', creatorData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          collection_wallpapers!inner (
            wallpapers (
              id,
              compressed_url,
              url,
              type,
              file_path,
              download_count,
              like_count,
              created_at
            )
          )
        `)
        .eq('created_by', creatorData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!creatorData?.id,
  });

  const isLoading = isCreatorLoading || isWallpapersLoading || isCollectionsLoading;

  const handleCollectionLike = async (collectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to like collections",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Get user's current liked collections
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_collections')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      const currentFavorites = userData?.favor_collections || [];
      const isLiked = currentFavorites.includes(collectionId);
      const newFavorites = isLiked
        ? currentFavorites.filter(id => id !== collectionId)
        : [...currentFavorites, collectionId];

      // Update user's liked collections
      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_collections: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      toast({
        title: isLiked ? "Collection removed from likes" : "Collection liked",
        description: isLiked ? "Collection removed from your likes" : "Collection added to your likes",
      });

      // Refetch collections to update UI
      refetchCollections();
    } catch (error: any) {
      console.error('Collection like error:', error);
      toast({
        title: "Action failed",
        description: "There was an error updating your likes",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  const getCollectionPreviewImages = (collection: any) => {
    return collection.collection_wallpapers
      .map((cw: any) => cw.wallpapers?.compressed_url)
      .filter(Boolean)
      .slice(0, 4);
  };

  const getCollectionWallpapers = (collection: any): Wallpaper[] => {
    return collection.collection_wallpapers
      .map((cw: any) => cw.wallpapers)
      .filter(Boolean);
  };

  const selectedCollectionData = collections.find(c => c.id === selectedCollection);
  const selectedCollectionWallpapers = selectedCollectionData 
    ? getCollectionWallpapers(selectedCollectionData)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Creator Profile</h1>
          <p className="text-muted-foreground">Creator Code: {creatorCode}</p>
          {selectedCollection && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setSelectedCollection(null)}
            >
              ← Back to Collections
            </Button>
          )}
        </div>

        {!selectedCollection ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8">
              <TabsTrigger value="wallpapers">
                Wallpapers ({wallpapers.length})
              </TabsTrigger>
              <TabsTrigger value="collections">
                Collections ({collections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallpapers">
              {wallpapers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No wallpapers found</p>
                </div>
              ) : (
                <WallpaperGrid wallpapers={wallpapers} />
              )}
            </TabsContent>

            <TabsContent value="collections">
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No collections found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                      onClick={() => setSelectedCollection(collection.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCollectionLike(collection.id);
                        }}
                      >
                        <Heart className="h-5 w-5" />
                      </Button>
                      <h3 className="text-lg font-semibold mb-2">{collection.name}</h3>
                      {collection.description && (
                        <p className="text-muted-foreground mb-4">{collection.description}</p>
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
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(collection.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Wallpapers: {collection.collection_wallpapers.length}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              {selectedCollectionData?.name}
            </h2>
            {selectedCollectionWallpapers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No wallpapers in this collection</p>
              </div>
            ) : (
              <WallpaperGrid 
                wallpapers={selectedCollectionWallpapers} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CreatorProfile;
