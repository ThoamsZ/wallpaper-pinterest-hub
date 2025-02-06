
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Wallpaper } from "@/hooks/use-wallpapers";

interface WallpaperItemProps {
  wallpaper: Wallpaper;
  onSelect: (wallpaper: Wallpaper) => void;
}

const WallpaperItem = ({ wallpaper, onSelect }: WallpaperItemProps) => {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0,
        rootMargin: "0px",
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      id={wallpaper.id}
      className="wallpaper-item relative cursor-pointer transform transition-transform duration-200 hover:z-10"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={() => onSelect(wallpaper)}
    >
      <div className="relative group overflow-hidden rounded-lg">
        <div className="aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
          )}
          {isIntersecting && (
            <img
              src={wallpaper.compressed_url}
              alt={`Wallpaper ${wallpaper.id}`}
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-300 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              } ${!isMobile && isHovered ? "scale-105" : ""}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WallpaperItem;
