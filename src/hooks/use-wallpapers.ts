
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
    return data ?? [];
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    return [];
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
      // Ensure we have valid data to check
      if (!lastPage || !Array.isArray(lastPage)) {
        return undefined;
      }
      // Return next page number if we got a full page of results
      return lastPage.length >= PAGE_SIZE ? allPages.length : undefined;
    },
    initialData: propWallpapers ? {
      pages: [propWallpapers],
      pageParams: [0]
    } : undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  // Safely handle data transformation
  const wallpapers = propWallpapers ?? 
    data?.pages?.reduce<Wallpaper[]>((acc, page) => {
      if (Array.isArray(page)) {
        return [...acc, ...page];
      }
      return acc;
    }, []) ?? [];

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
