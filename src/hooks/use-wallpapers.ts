
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];

const PAGE_SIZE = 25;

const fetchWallpaperPage = async ({ pageParam = 0, selectedTag }: { pageParam?: number, selectedTag?: string | null }) => {
  try {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (selectedTag) {
      query = query.contains('tags', [selectedTag]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    return [];
  }
};

export const useWallpapers = (propWallpapers?: Wallpaper[], selectedTag?: string | null) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
    isRefetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['wallpapers', selectedTag],
    queryFn: ({ pageParam }) => fetchWallpaperPage({ pageParam, selectedTag }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage)) {
        return undefined;
      }
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
