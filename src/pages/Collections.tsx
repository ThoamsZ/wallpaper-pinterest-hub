import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Heart, Share } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useCollectionLikes } from "@/hooks/use-collection-likes";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];
type Collection = Database['public']['Tables']['collections']['Row'] & {
  collection_wallpapers: { 
    wallpapers: Wallpaper
  }[]
};

const Collections = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { likedCollections, handleCollectionLike } = useCollectionLikes();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }
        if (session.user.email === 'guest@wallpaperhub.com') {
          toast({
            title: "Guest account",
            description: "Please sign up to view collections",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/auth');
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session || session.user.email === 'guest@wallpaperhub.com') {
        navigate('/auth');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !isAuthChecking,
  });

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery({
    queryKey: ['liked-collections', currentUser?.favor_collections],
    queryFn: async () => {
      if (!currentUser?.favor_collections?.length) return [];

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
        .in('id', currentUser.favor_collections)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        throw error;
      }
      
      return data as Collection[] || [];
    },
    enabled: !isAuthChecking && !!currentUser?.favor_collections?.length,
  });

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

  const selectedCollectionData = collections.find(c => c.id === selectedCollection);
  const selectedCollectionWallpapers = selectedCollectionData 
    ? getCollectionWallpapers(selectedCollectionData)
    : [];

  if (isAuthChecking || isUserLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Collections</h1>
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
          isCollectionsLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No collections found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() => navigate(`/collection/${collection.id}`)}
                >
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-black/20 backdrop-blur-sm hover:bg-black/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(collection.id, collection.name, collection.description);
                      }}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-black/20 backdrop-blur-sm hover:bg-black/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCollectionLike(collection.id);
                      }}
                    >
                      <Heart 
                        className={`h-4 w-4 ${
                          likedCollections.includes(collection.id)
                            ? "fill-red-500 text-red-500"
                            : ""
                        }`}
                      />
                    </Button>
                  </div>
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
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(collection.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      <span>{collection.like_count || 0}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Wallpapers: {collection.collection_wallpapers.length}
                  </p>
                </div>
              ))}
            </div>
          )
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

export default Collections;
