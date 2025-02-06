
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const PAGE_SIZE = 25;

const fetchWallpaperPage = async ({ pageParam = 0 }) => {
  try {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    // Always return an array, even if data is null
    return data ?? [];
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    throw error;
  }
};

export const useWallpapers = (propWallpapers?: Wallpaper[]) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
    isRefetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['wallpapers'],
    queryFn: fetchWallpaperPage,
    getNextPageParam: (lastPage, allPages) => {
      // Ensure lastPage exists and has the expected length before calculating next page
      if (!lastPage || !Array.isArray(lastPage)) return undefined;
      if (lastPage.length === 0) return undefined;
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  // Ensure we always return a valid array
  const wallpapers = propWallpapers || 
    (data?.pages?.reduce((acc, page) => acc.concat(page || []), [] as Wallpaper[]) ?? []);

  return {
    wallpapers,
    isLoading,
    error,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
};

export type { Wallpaper };

