
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import FilterBar from "@/components/FilterBar";
import { useAuth } from "@/App";
import { useQueryClient } from "@tanstack/react-query";

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
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [navigate, queryClient]);

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
