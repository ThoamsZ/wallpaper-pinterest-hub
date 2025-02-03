import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import WallpaperModal from "./WallpaperModal";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const fetchWallpapers = async () => {
  const { data, error } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
};

const WallpaperGrid = () => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [likedWallpapers, setLikedWallpapers] = useState<string[]>([]);
  
  const { data: wallpapers = [], isLoading, error, isRefetching, refetch } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpapers,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: 2,
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
        navigate('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_image')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;

      const currentFavorites = userData?.favor_image || [];
      const isLiked = currentFavorites.includes(wallpaperId);
      const newFavorites = isLiked
        ? currentFavorites.filter(id => id !== wallpaperId)
        : [...currentFavorites, wallpaperId];

      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_image: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setLikedWallpapers(newFavorites);
      
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Wallpaper removed from your collections" : "Wallpaper added to your collections",
      });

      // Refetch to ensure data is fresh
      refetch();
    } catch (error) {
      console.error('Like error:', error);
      toast({
        title: "Action failed",
        description: "There was an error updating your favorites",
        variant: "destructive",
      });
    }
  };

  // Fetch user's liked wallpapers on component mount and auth state change
  useEffect(() => {
    const fetchLikedWallpapers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('favor_image')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (userData?.favor_image) {
          setLikedWallpapers(userData.favor_image);
        }
      }
    };

    fetchLikedWallpapers();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchLikedWallpapers();
      } else {
        setLikedWallpapers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div className="animate-pulse bg-gray-200 rounded-lg aspect-[3/4]"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading wallpapers. Please try again later.
      </div>
    );
  }

  return (
    <>
      {isRefetching && (
        <div className="fixed top-20 right-4 bg-primary text-white px-4 py-2 rounded-md shadow-lg">
          Updating...
        </div>
      )}
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
        {wallpapers.map((wallpaper: Wallpaper) => (
          <div
            key={wallpaper.id}
            className="relative mb-4 break-inside-avoid cursor-pointer"
            onMouseEnter={() => setHoveredId(wallpaper.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setSelectedWallpaper(wallpaper)}
          >
            <div className="relative group overflow-hidden rounded-lg">
              <img
                src={wallpaper.url}
                alt={`Wallpaper ${wallpaper.id}`}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-300 ${
                  hoveredId === wallpaper.id ? "scale-105" : ""
                }`}
              />
            </div>
          </div>
        ))}
      </div>
      <WallpaperModal
        wallpaper={selectedWallpaper}
        isOpen={!!selectedWallpaper}
        onClose={() => setSelectedWallpaper(null)}
        onLike={handleLike}
        isLiked={selectedWallpaper ? likedWallpapers.includes(selectedWallpaper.id) : false}
      />
    </>
  );
};

export default WallpaperGrid;