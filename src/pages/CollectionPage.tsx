import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { Button } from "@/components/ui/button";
import { Heart, Share } from "lucide-react";
import { useCollectionLikes } from "@/hooks/use-collection-likes";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const CollectionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { likedCollections, handleCollectionLike } = useCollectionLikes();
  
  const { data: collection, isLoading: isCollectionLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: wallpapers = [], isLoading: isWallpapersLoading } = useQuery({
    queryKey: ['collection-wallpapers', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('collection_wallpapers')
        .select(`
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
        `)
        .eq('collection_id', id);
      
      if (error) throw error;
      
      if (!data) return [];
      
      return data
        .map(item => item.wallpapers)
        .filter(Boolean);
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    if (!collection) return;
    
    try {
      const shareUrl = `${window.location.origin}/collection/${id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Check out this collection: ${collection.name}`,
          text: collection.description || `A wallpaper collection: ${collection.name}`,
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

  if (isCollectionLoading) {
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

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto pt-20">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
            <Button onClick={() => navigate('/collections')}>Back to Collections</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="text-muted-foreground mt-2">{collection.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCollectionLike(collection.id)}
              className="flex items-center gap-2"
            >
              <Heart 
                className={likedCollections.includes(collection.id) ? "fill-red-500 text-red-500" : ""}
              />
              <span>{collection.like_count || 0}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share className="h-5 w-5" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/collections')}
            >
              Back to Collections
            </Button>
          </div>
        </div>

        {isWallpapersLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : wallpapers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No wallpapers in this collection</p>
          </div>
        ) : (
          <WallpaperGrid 
            wallpapers={wallpapers as Wallpaper[]} 
          />
        )}
      </main>
    </div>
  );
};

export default CollectionPage;
