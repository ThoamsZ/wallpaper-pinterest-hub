
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import WallpaperGrid from "@/components/WallpaperGrid";
import { useAuth } from "@/App";
import { supabase } from "@/integrations/supabase/client";

const Likes = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const { data: likedWallpapers = [], isLoading: isWallpapersLoading } = useQuery({
    queryKey: ['liked-wallpapers'],
    queryFn: async () => {
      if (!session) return [];

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
    enabled: true,
  });

  if (isWallpapersLoading) {
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
        {!session ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to see your liked wallpapers</p>
            <button
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </div>
        ) : likedWallpapers.length === 0 ? (
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

