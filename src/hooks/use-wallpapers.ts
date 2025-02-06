
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const fetchWallpapers = async () => {
  const { data, error } = await supabase
    .from('wallpapers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return data;
};

export const useWallpapers = (propWallpapers?: Wallpaper[]) => {
  const { data: fetchedWallpapers = [], isLoading, error, isRefetching } = useQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpapers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
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
