
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import TagFilterBar from "@/components/TagFilterBar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          toast({
            title: "Error",
            description: "Failed to check authentication status",
            variant: "destructive",
          });
        }

        // Only redirect if we're on a protected route and there's no session
        if (!session && window.location.pathname !== '/') {
          navigate('/auth');
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT') {
        // Only remove authentication-related queries
        queryClient.removeQueries({ queryKey: ['user'] });
        queryClient.removeQueries({ queryKey: ['likes'] });
        queryClient.removeQueries({ queryKey: ['collections'] });
        navigate('/auth');
      } else if (event === 'SIGNED_IN') {
        // Only invalidate user-specific queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] });
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isDisabled={true} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={isLoading} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-4">
          <TagFilterBar 
            selectedTag={selectedTag} 
            onTagSelect={setSelectedTag}
          />
        </div>
        <WallpaperGrid selectedTag={selectedTag} />
      </main>
    </div>
  );
};

export default Index;
