import { useState } from "react";

interface Wallpaper {
  id: number;
  url: string;
  title: string;
  category: string;
}

const wallpapers: Wallpaper[] = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    title: "Modern Workspace",
    category: "Work",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    title: "Tech Setup",
    category: "Technology",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    title: "Circuit Abstract",
    category: "Abstract",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e",
    title: "Modern Robot",
    category: "Technology",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    title: "Nature Lights",
    category: "Nature",
  },
];

const WallpaperGrid = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
              alt={wallpaper.title}
              className={`w-full object-cover transition-transform duration-300 ${
                hoveredId === wallpaper.id ? "scale-105" : ""
              }`}
            />
            <div
              className={`absolute inset-0 bg-black/50 flex flex-col justify-end p-4 transition-opacity duration-300 ${
                hoveredId === wallpaper.id ? "opacity-100" : "opacity-0"
              }`}
            >
              <h3 className="text-white font-semibold text-lg">{wallpaper.title}</h3>
              <span className="text-white/80 text-sm">{wallpaper.category}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WallpaperGrid;