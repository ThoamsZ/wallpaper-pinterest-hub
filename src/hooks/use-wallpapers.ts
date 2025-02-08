
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
    throw error; // Let the error propagate to be handled by the UI
  }
};

export const useWallpapers = (props?: { wallpapers?: Wallpaper[], selectedTag?: string | null }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error,
    isRefetching,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['wallpapers', props?.selectedTag],
    queryFn: ({ pageParam }) => fetchWallpaperPage({ pageParam, selectedTag: props?.selectedTag }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !Array.isArray(lastPage)) {
        return undefined;
      }
      return lastPage.length >= PAGE_SIZE ? allPages.length : undefined;
    },
    initialData: props?.wallpapers ? {
      pages: [props.wallpapers],
      pageParams: [0]
    } : undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep unused data in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  const wallpapers = props?.wallpapers ?? 
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
