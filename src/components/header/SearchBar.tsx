
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SearchBarProps {
  isDisabled: boolean;
}

const SearchBar = ({ isDisabled }: SearchBarProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled || isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (!searchQuery.trim()) {
        queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
        setIsProcessing(false);
        return;
      }

      const { data: creatorData } = await supabase
        .from('users')
        .select('id')
        .eq('creator_code', searchQuery.trim())
        .maybeSingle();

      if (creatorData) {
        navigate(`/creator/${searchQuery.trim()}`);
        setIsProcessing(false);
        return;
      }

      const { data: wallpaperData } = await supabase
        .from('wallpapers')
        .select('*')
        .contains('tags', [searchQuery.trim()]);

      if (wallpaperData && wallpaperData.length > 0) {
        queryClient.setQueryData(['wallpapers'], {
          pages: [wallpaperData],
          pageParams: [0],
        });
      } else {
        toast({
          title: "No Results",
          description: "No wallpapers or creators found with your search term",
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: "An error occurred while searching",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search for wallpapers or creator codes..."
          className={`w-full pl-10 pr-4 py-1.5 rounded-full border-gray-200 text-sm ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value.trim()) {
              const form = e.target.form;
              if (form) form.requestSubmit();
            }
          }}
          disabled={isDisabled || isProcessing}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
      </div>
    </form>
  );
};

export default SearchBar;
