import { useState } from "react";

interface Wallpaper {
  id: number;
  url: string;
  type: "mobile" | "PFP" | "Sticker" | "Background" | "Live Wallpaper";
  tags: string[];
}

const wallpapers: Wallpaper[] = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    type: "Background",
    tags: ["workspace", "modern"],
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    type: "Background",
    tags: ["tech", "setup"],
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    type: "mobile",
    tags: ["abstract", "tech"],
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e",
    type: "Background",
    tags: ["robot", "tech"],
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    type: "Background",
    tags: ["nature", "lights"],
  },
  {
    id: 6,
    url: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21",
    type: "Background",
    tags: ["ocean", "wave"],
  },
  {
    id: 7,
    url: "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb",
    type: "Background",
    tags: ["night", "stars"],
  },
  {
    id: 8,
    url: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb",
    type: "Background",
    tags: ["nature", "mountains"],
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
              alt={`Wallpaper ${wallpaper.id}`}
              className={`w-full object-cover transition-transform duration-300 ${
                hoveredId === wallpaper.id ? "scale-105" : ""
              }`}
            />
            <div
              className={`absolute inset-0 bg-black/50 flex flex-col justify-end p-4 transition-opacity duration-300 ${
                hoveredId === wallpaper.id ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex flex-wrap gap-2 mb-2">
                {wallpaper.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-white/20 text-white px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-white/80 text-sm">{wallpaper.type}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WallpaperGrid;