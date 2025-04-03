
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallpaper } from "@/hooks/use-wallpapers";
import { useQuery } from "@tanstack/react-query";

export const useWallpaperDetails = (wallpaperId: string | undefined) => {
  const fetchWallpaper = async () => {
    if (!wallpaperId) return null;
    
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .eq('id', wallpaperId)
      .single();
    
    if (error) throw error;
    return data as Wallpaper;
  };

  const fetchSimilarWallpapers = async (tags: string[]) => {
    if (!tags || tags.length === 0) return [];
    
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .contains('tags', tags)
      .neq('id', wallpaperId)
      .limit(10);
    
    if (error) throw error;
    return data as Wallpaper[];
  };

  const wallpaperQuery = useQuery({
    queryKey: ['wallpaper', wallpaperId],
    queryFn: fetchWallpaper,
    enabled: !!wallpaperId,
  });
  
  const similarWallpapersQuery = useQuery({
    queryKey: ['similarWallpapers', wallpaperQuery.data?.tags, wallpaperId],
    queryFn: () => fetchSimilarWallpapers(wallpaperQuery.data?.tags || []),
    enabled: !!wallpaperQuery.data?.tags && wallpaperQuery.data.tags.length > 0,
  });

  return {
    wallpaper: wallpaperQuery.data,
    isLoading: wallpaperQuery.isLoading,
    error: wallpaperQuery.error,
    similarWallpapers: similarWallpapersQuery.data || [],
    isSimilarLoading: similarWallpapersQuery.isLoading,
    similarError: similarWallpapersQuery.error,
  };
};
