import { useState, useEffect } from "react";

interface Wallpaper {
  id: number;
  url: string;
  type: "mobile" | "PFP" | "Sticker" | "Background" | "Live Wallpaper";
  tags: string[];
}

const WallpaperGrid = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);

  useEffect(() => {
    // Load wallpapers from localStorage
    const savedWallpapers = JSON.parse(localStorage.getItem('wallpapers') || '[]');
    setWallpapers(savedWallpapers);
  }, []);

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
      {wallpapers.map((wallpaper) => (
        <div
          key={wallpaper.id}
          className="relative mb-4 break-inside-avoid"
          onMouseEnter={() => setHoveredId(wallpaper.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="relative group overflow-hidden rounded-lg">
            <img
              src={wallpaper.url}
              alt={`Wallpaper ${wallpaper.id}`}
              className={`w-full object-cover transition-transform duration-300 ${
                hoveredId === wallpaper.id ? "scale-105" : ""
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default WallpaperGrid;