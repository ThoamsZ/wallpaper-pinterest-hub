
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
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
    
    const initializeSession = async () => {
      if (!session) {
        console.log("No session found, attempting guest login");
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guest@wallpaperhub.com',
            password: 'guest123',
          });
          
          if (error) {
            console.error('Guest login error:', error);
            queryClient.clear();
            navigate('/auth');
            return;
          }
          
          console.log("Successfully logged in as guest");
        } catch (error) {
          console.error('Guest login error:', error);
          queryClient.clear();
          navigate('/auth');
        }
      }
    };

    initializeSession();

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [session, navigate, queryClient]);

  // Check if user is guest
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isDisabled={false} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-4 mb-6">
          <FilterBar />
        </div>
        <WallpaperGrid tag={tag || undefined} />
      </main>
    </div>
  );
};

export default Index;
