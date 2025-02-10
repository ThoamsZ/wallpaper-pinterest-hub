
import { useState, useEffect, useRef, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Wallpaper } from "@/hooks/use-wallpapers";
import { useInView } from "react-intersection-observer";

interface WallpaperItemProps {
  wallpaper: Wallpaper;
  onSelect: (wallpaper: Wallpaper) => void;
}

const WallpaperItem = memo(({ wallpaper, onSelect }: WallpaperItemProps) => {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ref: elementRef, inView } = useInView({
    triggerOnce: true,
    threshold: 0,
    rootMargin: "50px",
  });

  // Disable F12 and other keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || 
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
          (e.ctrlKey && e.key === "u")) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle context menu (right click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div
      ref={elementRef}
      id={wallpaper.id}
      className="wallpaper-item relative cursor-pointer transform transition-transform duration-200 hover:z-10"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={() => onSelect(wallpaper)}
      onContextMenu={handleContextMenu}
    >
      <div className="relative group overflow-hidden rounded-lg">
        <div className="relative pt-[166.67%] w-full bg-gray-100 dark:bg-gray-800">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
          )}
          {inView && (
            <img
              src={wallpaper.compressed_url}
              alt={`Wallpaper ${wallpaper.id}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              } ${!isMobile && isHovered ? "scale-105" : ""}`}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none',
                willChange: 'transform',
                containIntrinsicSize: 'width height'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

WallpaperItem.displayName = 'WallpaperItem';

export default WallpaperItem;
