
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const fetchWallpapers = async () => {
  try {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    throw error;
  }
};

export const useWallpapers = (propWallpapers?: Wallpaper[]) => {
  const { data: fetchedWallpapers = [], isLoading, error, isRefetching } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpapers,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  return {
    wallpapers: propWallpapers || fetchedWallpapers,
    isLoading,
    error,
    isRefetching
  };
};

export type { Wallpaper };
