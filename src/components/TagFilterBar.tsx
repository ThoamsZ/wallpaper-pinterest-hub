
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TagFilterBarProps {
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

const TagFilterBar = ({ selectedTag, onTagSelect }: TagFilterBarProps) => {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags_stats')
        .select('tag, download_count')
        .order('download_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-9 w-20 rounded-md bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      <Button
        variant={selectedTag === null ? "default" : "outline"}
        onClick={() => onTagSelect(null)}
        className="shrink-0"
      >
        All
      </Button>
      {tags?.map((tagStat) => (
        <Button
          key={tagStat.tag}
          variant={selectedTag === tagStat.tag ? "default" : "outline"}
          onClick={() => onTagSelect(tagStat.tag)}
          className="shrink-0"
        >
          {tagStat.tag}
        </Button>
      ))}
    </div>
  );
};

export default TagFilterBar;
