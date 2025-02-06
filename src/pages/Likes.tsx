
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { toast } from "@/hooks/use-toast";

const Likes = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/auth');
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const { data: likedWallpapers = [], isLoading: isWallpapersLoading } = useQuery({
    queryKey: ['liked-wallpapers'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_image')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      if (!userData?.favor_image?.length) return [];

      const { data: wallpapers, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .in('id', userData.favor_image);

      if (wallpapersError) throw wallpapersError;

      return wallpapers || [];
    },
    enabled: !isLoading,
  });

  if (isLoading || isWallpapersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto pt-20">
        <h1 className="text-3xl font-bold mb-8">Liked Wallpapers</h1>
        {likedWallpapers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No liked wallpapers yet</p>
          </div>
        ) : (
          <WallpaperGrid wallpapers={likedWallpapers} />
        )}
      </main>
    </div>
  );
};

export default Likes;
