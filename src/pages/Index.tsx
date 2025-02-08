
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth');
      } else {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        queryClient.clear();
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
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
        <WallpaperGrid />
      </main>
    </div>
  );
};

export default Index;
