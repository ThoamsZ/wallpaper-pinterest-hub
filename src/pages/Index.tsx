
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      
      console.log("Auth state changed:", _event, !!newSession);
      setSession(newSession);
      setIsLoading(false);

      // Special handling for sign out
      if (_event === 'SIGNED_OUT') {
        queryClient.clear(); // Clear all queries on sign out
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [queryClient]);

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
        <WallpaperGrid key={session?.user?.id || 'anonymous'} />
      </main>
    </div>
  );
};

export default Index;
