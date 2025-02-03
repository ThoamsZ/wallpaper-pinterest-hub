import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const fetchWallpapers = async () => {
  const { data, error } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const WallpaperGrid = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const { data: wallpapers = [], isLoading, error } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpapers,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg aspect-[3/4]"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error loading wallpapers</div>;
  }

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
      {wallpapers.map((wallpaper: Wallpaper) => (
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