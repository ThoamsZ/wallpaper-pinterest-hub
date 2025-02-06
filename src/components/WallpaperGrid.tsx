
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import WallpaperModal from "./WallpaperModal";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

interface WallpaperGridProps {
  wallpapers?: Wallpaper[];
}

const fetchWallpapers = async () => {
  const { data, error } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15); // Further reduced initial load for better performance

  if (error) throw error;
  return data;
};

const WallpaperGrid = ({ wallpapers: propWallpapers }: WallpaperGridProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [likedWallpapers, setLikedWallpapers] = useState<string[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const [isIntersecting, setIsIntersecting] = useState<Record<string, boolean>>({});

  const { data: fetchedWallpapers = [], isLoading, error, isRefetching } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpapers,
    staleTime: 1000 * 60 * 10, // Increased cache time to 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const wallpapers = propWallpapers || fetchedWallpapers;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    const elements = document.querySelectorAll('.wallpaper-item');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [wallpapers.length]);

  const handleImageLoad = (wallpaperId: string) => {
    setImagesLoaded(prev => ({
      ...prev,
      [wallpaperId]: true
    }));
  };

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

      // Update user favorites
      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_image: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // Get current wallpaper data
      const { data: wallpaperData, error: wallpaperFetchError } = await supabase
        .from('wallpapers')
        .select('like_count')
        .eq('id', wallpaperId)
        .maybeSingle();

      if (wallpaperFetchError) throw wallpaperFetchError;

      const currentLikeCount = wallpaperData?.like_count || 0;

      // Update wallpaper like count
      const { error: likeError } = await supabase
        .from('wallpapers')
        .update({
          like_count: isLiked ? currentLikeCount - 1 : currentLikeCount + 1
        })
        .eq('id', wallpaperId);

      if (likeError) throw likeError;

      setLikedWallpapers(newFavorites);
      
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Wallpaper removed from your collections" : "Wallpaper added to your collections",
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

  if (isLoading && !propWallpapers) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="relative aspect-[3/4]">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !propWallpapers) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading wallpapers. Please try again later.
      </div>
    );
  }

  return (
    <>
      {isRefetching && !propWallpapers && (
        <div className="fixed top-20 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          Updating...
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
        {wallpapers.map((wallpaper: Wallpaper) => (
          <div
            key={wallpaper.id}
            id={wallpaper.id}
            className="wallpaper-item relative cursor-pointer transform transition-transform duration-200 hover:z-10"
            onMouseEnter={() => !isMobile && setHoveredId(wallpaper.id)}
            onMouseLeave={() => !isMobile && setHoveredId(null)}
            onClick={() => setSelectedWallpaper(wallpaper)}
          >
            <div className="relative group overflow-hidden rounded-lg">
              <div className="aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800">
                {!imagesLoaded[wallpaper.id] && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
                )}
                {isIntersecting[wallpaper.id] && (
                  <img
                    src={wallpaper.compressed_url}
                    alt={`Wallpaper ${wallpaper.id}`}
                    loading="lazy"
                    onLoad={() => handleImageLoad(wallpaper.id)}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      imagesLoaded[wallpaper.id] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    } ${!isMobile && hoveredId === wallpaper.id ? "scale-105" : ""}`}
                  />
                )}
              </div>
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
