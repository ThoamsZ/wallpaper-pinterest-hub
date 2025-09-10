import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Wallpaper = Database['public']['Tables']['wallpapers']['Row'];
type Collection = Database['public']['Tables']['collections']['Row'];

interface SearchResults {
  wallpapers: Wallpaper[];
  collections: Collection[];
  creatorInfo: {
    creator_code: string;
    email: string;
    user_id: string;
  } | null;
}

export const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const queryClient = useQueryClient();

  const performSearch = async (query: string): Promise<SearchResults | null> => {
    if (!query.trim()) {
      setSearchResults(null);
      return null;
    }

    setIsSearching(true);
    
    try {
      const searchTerm = query.trim();
      let results: SearchResults = {
        wallpapers: [],
        collections: [],
        creatorInfo: null
      };

      // 1. Search for creator by creator_code - if found, redirect directly
      const { data: creatorData } = await supabase
        .from('creators')
        .select('creator_code, email, user_id')
        .eq('creator_code', searchTerm)
        .eq('is_active', true)
        .not('is_blocked', 'eq', true)
        .maybeSingle();

      if (creatorData) {
        // Redirect to creator profile page instead of showing search results
        window.location.href = `/creator/${creatorData.creator_code}`;
        return null;
      } else {
        // 2. If no creator found, search wallpapers by tags
        const { data: tagWallpapers } = await supabase
          .from('wallpapers')
          .select('*')
          .contains('tags', [searchTerm])
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (tagWallpapers) {
          results.wallpapers = tagWallpapers;
        }

        // 3. Search collections by name or description
        const { data: searchCollections } = await supabase
          .from('collections')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (searchCollections) {
          results.collections = searchCollections;
        }
      }

      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
  };

  return {
    isSearching,
    searchResults,
    performSearch,
    clearSearch
  };
};