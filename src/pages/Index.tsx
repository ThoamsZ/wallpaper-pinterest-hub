
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WallpaperGrid from "@/components/WallpaperGrid";
import FilterBar from "@/components/FilterBar";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isInitializing, setIsInitializing] = useState(true);
  const tag = searchParams.get('tag');

  useEffect(() => {
    // Handle resource load errors
    const handleError = (event: ErrorEvent) => {
      if (event.error?.toString().includes('404') || 
          event.message.includes('404') ||
          event.message.includes('Failed to load resource')) {
        console.error('Resource load error:', event);
        queryClient.clear();
        navigate('/auth', { replace: true });
      }
    };

    window.addEventListener('error', handleError);
    
    const checkSession = async () => {
      try {
        if (!session) {
          console.log("No active session in Index page");
        } else {
          console.log("Active session detected:", session.user.email);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkSession();

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [navigate, queryClient, session]);

  // Check if user is guest with proper null checking
  const isGuestUser = session?.user?.email === 'guest@wallpaperhub.com';

  useEffect(() => {
    if (isGuestUser) {
      // Show welcome toast only once when page loads
      toast({
        title: "Welcome to xxWallpaper",
        description: "Browse freely! Sign up to like and collect wallpapers.",
      });
    }
  }, [isGuestUser]);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="mt-4 mb-6">
          <FilterBar />
        </div>
        <WallpaperGrid tag={tag || undefined} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
