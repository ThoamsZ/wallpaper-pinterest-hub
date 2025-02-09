
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Tag, Grid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRef } from "react";

interface TagStat {
  tag: string;
  download_count: number;
}

export const FilterBar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTag = searchParams.get('tag');
  const filterBarRef = useRef<HTMLDivElement>(null);

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_tags_stats')
        .select('*')
        .order('download_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as TagStat[];
    },
  });

  const handleTagClick = (tag: string) => {
    if (currentTag === tag) {
      // If clicking the same tag, remove the filter
      navigate('/', { replace: true });
    } else {
      // Apply the tag filter
      navigate(`/?tag=${encodeURIComponent(tag)}`);
    }

    // Automatically scroll to show more filters when clicking on the right side
    if (filterBarRef.current) {
      const container = filterBarRef.current;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      const buttonWidth = 100; // Approximate width of a button

      // If clicking in the right third of the visible area
      const clickedButton = document.activeElement as HTMLButtonElement;
      if (clickedButton) {
        const buttonRect = clickedButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const buttonPosition = buttonRect.left - containerRect.left;

        if (buttonPosition > (clientWidth * 0.7)) {
          // Smooth scroll to the right by about two button widths
          container.scrollTo({
            left: Math.min(currentScroll + buttonWidth * 2, scrollWidth - clientWidth),
            behavior: 'smooth'
          });
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 sm:px-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div ref={filterBarRef} className="filter-bar flex gap-2 overflow-x-auto pb-2 px-4 sm:px-0">
      <Button
        variant={!currentTag ? "default" : "outline"}
        size="sm"
        onClick={() => {
          // Clear the tag filter and navigate to home
          navigate('/', { replace: true });
        }}
        className="whitespace-nowrap"
      >
        <Grid className="mr-1 h-4 w-4" />
        All
      </Button>
      {tags?.map((tagStat) => (
        <Button
          key={tagStat.tag}
          variant={currentTag === tagStat.tag ? "default" : "outline"}
          size="sm"
          onClick={() => handleTagClick(tagStat.tag)}
          className="whitespace-nowrap"
        >
          <Tag className="mr-1 h-4 w-4" />
          {tagStat.tag}
        </Button>
      ))}
    </div>
  );
};

export default FilterBar;
