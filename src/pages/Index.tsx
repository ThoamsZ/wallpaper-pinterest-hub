
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkAndRedirect = async () => {
      // If loading takes more than 2 seconds, clear session and redirect
      timeoutId = setTimeout(async () => {
        if (loading) {
          console.log("Index: Loading timeout reached, clearing session");
          await supabase.auth.signOut();
          queryClient.clear();
          navigate('/auth');
        }
      }, 2000);

      // Normal session check
      if (!loading) {
        if (!session) {
          console.log("Index: No session found, redirecting to /auth");
          queryClient.clear();
          navigate('/auth');
        }
      }
    };

    checkAndRedirect();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [session, loading, navigate, queryClient]);

  // Show loading state for maximum 2 seconds
  if (loading) {
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
      <Header isDisabled={loading} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <WallpaperGrid />
      </main>
    </div>
  );
};

export default Index;
