
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!session) {
          console.log("Index: No session found, redirecting to /auth");
          queryClient.clear();
          navigate('/auth');
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate('/auth');
      }
    };

    checkAuth();
  }, [session, navigate, queryClient]);

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
