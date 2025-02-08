
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only redirect if there's no session at all
    if (!session) {
      console.log("Index: No session found, redirecting to /auth");
      queryClient.clear();
      navigate('/auth');
    }
  }, [session, navigate, queryClient]);

  // Check if user is guest
  const isGuestUser = session?.user?.email === 'guest@wallpaperhub.com';

  useEffect(() => {
    if (isGuestUser) {
      // Show welcome toast only once when page loads
      toast({
        title: "Welcome to WallpaperHub",
        description: "Browse freely! Sign up to like and collect wallpapers.",
      });
    }
  }, []);

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
