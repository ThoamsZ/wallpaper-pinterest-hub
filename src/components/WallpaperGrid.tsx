
import { useState, useEffect, useRef } from "react";
import { useWallpapers, type Wallpaper } from "@/hooks/use-wallpapers";
import { useWallpaperLikes } from "@/hooks/use-wallpaper-likes";
import WallpaperModal from "./WallpaperModal";
import WallpaperItem from "./WallpaperItem";

interface WallpaperGridProps {
  wallpapers?: Wallpaper[];
}

const WallpaperGrid = ({ wallpapers: propWallpapers }: WallpaperGridProps) => {
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const { 
    wallpapers, 
    isLoading, 
    error, 
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useWallpapers(propWallpapers);
  const { likedWallpapers, handleLike } = useWallpaperLikes();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
          <WallpaperItem
            key={wallpaper.id}
            wallpaper={wallpaper}
            onSelect={setSelectedWallpaper}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div 
        ref={loadMoreRef} 
        className="h-10 flex items-center justify-center mt-4"
      >
        {isFetchingNextPage && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        )}
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
