
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Wallpaper } from "./use-wallpapers";

export const useWallpaperLikes = () => {
  const navigate = useNavigate();
  const [likedWallpapers, setLikedWallpapers] = useState<string[]>([]);

  useEffect(() => {
    const fetchLikedWallpapers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        const { data: userData } = await supabase
          .from('users')
          .select('favor_image')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (userData?.favor_image) {
          setLikedWallpapers(userData.favor_image);
        }
      }
    };

    fetchLikedWallpapers();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        fetchLikedWallpapers();
      } else {
        setLikedWallpapers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLike = async (wallpaperId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to like wallpapers",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check if user is guest
      if (session.user.email === 'guest@wallpaperhub.com') {
        toast({
          title: "Guest account",
          description: "Please sign up to like wallpapers",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_image')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;

      const currentFavorites = userData?.favor_image || [];
      const isLiked = currentFavorites.includes(wallpaperId);
      const newFavorites = isLiked
        ? currentFavorites.filter(id => id !== wallpaperId)
        : [...currentFavorites, wallpaperId];

      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_image: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      const { data: wallpaperData, error: wallpaperFetchError } = await supabase
        .from('wallpapers')
        .select('like_count')
        .eq('id', wallpaperId)
        .maybeSingle();

      if (wallpaperFetchError) throw wallpaperFetchError;

      const currentLikeCount = wallpaperData?.like_count || 0;

      const { error: likeError } = await supabase
        .from('wallpapers')
        .update({
          like_count: isLiked ? currentLikeCount - 1 : currentLikeCount + 1
        })
        .eq('id', wallpaperId);

      if (likeError) throw likeError;

      setLikedWallpapers(newFavorites);
      
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Wallpaper removed from your collections" : "Wallpaper added to your collections",
      });
    } catch (error) {
      console.error('Like error:', error);
      toast({
        title: "Action failed",
        description: "There was an error updating your favorites",
        variant: "destructive",
      });
    }
  };

  return { likedWallpapers, handleLike };
};
