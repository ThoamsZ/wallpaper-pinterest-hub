
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only redirect if we're not loading and there's no session
    if (!isLoading && !session) {
      console.log("Index: No session found after loading, redirecting to /auth");
      queryClient.clear();
      supabase.auth.signOut();
      navigate('/auth');
    }
  }, [session, isLoading, navigate, queryClient]);

  // Show loading state
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

  // Only render content if we have a session
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <WallpaperGrid />
      </main>
    </div>
  );
};

export default Index;
