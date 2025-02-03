import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import WallpaperModal from "@/components/WallpaperModal";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const Collections = () => {
  const navigate = useNavigate();
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [likedWallpapers, setLikedWallpapers] = useState<string[]>([]);

  const { data: wallpapers = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return [];
      }

      const { data: userData } = await supabase
        .from('users')
        .select('favor_image')
        .eq('id', session.user.id)
        .single();

      if (!userData?.favor_image?.length) return [];

      const { data: wallpapers } = await supabase
        .from('wallpapers')
        .select('*')
        .in('id', userData.favor_image);

      setLikedWallpapers(userData.favor_image || []);
      return wallpapers || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleLike = async (wallpaperId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to like wallpapers",
          variant: "destructive",
        });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_image')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      const currentFavorites = userData.favor_image || [];
      const newFavorites = currentFavorites.filter(id => id !== wallpaperId);

      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_image: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setLikedWallpapers(newFavorites);
      
      toast({
        title: "Removed from favorites",
        description: "Wallpaper removed from your collections",
      });
    } catch (error) {
      console.error('Like error:', error);
      toast({
        title: "Action failed",
        description: "There was an error updating your favorites",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto pt-20">
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-4 break-inside-avoid">
                <div className="animate-pulse bg-gray-200 rounded-lg aspect-[3/4]"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        {wallpapers.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">No saved wallpapers yet</h2>
            <p className="text-muted-foreground">
              Like some wallpapers to see them here!
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
            {wallpapers.map((wallpaper: Wallpaper) => (
              <div
                key={wallpaper.id}
                className="relative mb-4 break-inside-avoid cursor-pointer"
                onClick={() => setSelectedWallpaper(wallpaper)}
              >
                <div className="relative group overflow-hidden rounded-lg">
                  <img
                    src={wallpaper.url}
                    alt={`Wallpaper ${wallpaper.id}`}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <WallpaperModal
          wallpaper={selectedWallpaper}
          isOpen={!!selectedWallpaper}
          onClose={() => setSelectedWallpaper(null)}
          onLike={handleLike}
          isLiked={selectedWallpaper ? likedWallpapers.includes(selectedWallpaper.id) : false}
        />
      </main>
    </div>
  );
};

export default Collections;