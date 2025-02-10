
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const PAGE_SIZE = 25;

const fetchWallpaperPage = async ({ pageParam = 0, tag }: { pageParam?: number, tag?: string }) => {
  try {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('wallpapers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching wallpapers:', error);
      throw error;
    }

    return {
      data: data ?? [],
      count: count ?? 0
    };
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    return {
      data: [],
      count: 0
    };
  }
};

export const useWallpapers = (propWallpapers?: Wallpaper[], tag?: string) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
    isRefetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['wallpapers', tag],
    queryFn: ({ pageParam }) => fetchWallpaperPage({ pageParam, tag }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage.data)) {
        return undefined;
      }
      return lastPage.data.length >= PAGE_SIZE ? allPages.length : undefined;
    },
    initialData: propWallpapers ? {
      pages: [{ data: propWallpapers, count: propWallpapers.length }],
      pageParams: [0]
    } : undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  const wallpapers = propWallpapers ?? 
    data?.pages?.reduce<Wallpaper[]>((acc, page) => {
      return [...acc, ...(page.data || [])];
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
