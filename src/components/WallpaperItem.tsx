
import { useState, useEffect, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Wallpaper } from "@/hooks/use-wallpapers";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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

  // Copy the direct wallpaper link to clipboard
  const copyLinkToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wallpaperUrl = `${window.location.origin}/wallpaper/${wallpaper.id}`;
    navigator.clipboard.writeText(wallpaperUrl)
      .then(() => {
        toast({
          title: "Link copied",
          description: "Wallpaper link copied to clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        });
      });
  };

  // Handle click on wallpaper item
  const handleWallpaperClick = () => {
    navigate(`/wallpaper/${wallpaper.id}`);
  };

  return (
    <div
      ref={elementRef}
      id={wallpaper.id}
      className="wallpaper-item relative cursor-pointer transform transition-transform duration-200 hover:z-10"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={handleWallpaperClick}
      onContextMenu={handleContextMenu}
    >
      <div className="relative group overflow-hidden rounded-lg">
        <div className="relative pt-[166.67%] w-full bg-gray-100 dark:bg-gray-800">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
          )}
          {inView && (
            <img
              src={(() => {
                // 如果有r2_key，使用R2公共域名
                const r2PublicUrl = wallpaper.r2_key ? 
                  `https://pub-a16d17b142a64b8cb94ff08966efe9ca.r2.dev/${wallpaper.r2_key}` : 
                  null;
                
                const imageUrl = r2PublicUrl || wallpaper.compressed_url;
                
                console.log(`Loading image for wallpaper ${wallpaper.id}:`, {
                  r2_key: wallpaper.r2_key,
                  r2PublicUrl,
                  imageUrl,
                  compressed_url: wallpaper.compressed_url
                });
                return imageUrl;
              })()}
              alt={`Wallpaper ${wallpaper.id}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                console.error(`Failed to load image for wallpaper ${wallpaper.id}:`, e);
                setImageLoaded(true); // Still set as loaded to show something
              }}
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
          
          {/* Removed the hover link button for regular users */}
        </div>
      </div>
    </div>
  );
});

WallpaperItem.displayName = 'WallpaperItem';

export default WallpaperItem;
