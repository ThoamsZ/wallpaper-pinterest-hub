
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const useCollectionLikes = () => {
  const navigate = useNavigate();
  const [likedCollections, setLikedCollections] = useState<string[]>([]);

  useEffect(() => {
    const fetchLikedCollections = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        const { data: userData } = await supabase
          .from('users')
          .select('favor_collections')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (userData?.favor_collections) {
          setLikedCollections(userData.favor_collections);
        }
      }
    };

    fetchLikedCollections();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        fetchLikedCollections();
      } else {
        setLikedCollections([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCollectionLike = async (collectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please login to like collections",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check if user is guest
      if (session.user.email === 'guest@wallpaperhub.com') {
        toast({
          title: "Guest account",
          description: "Please sign up to like collections",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favor_collections')
        .eq('id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;

      const currentFavorites = userData?.favor_collections || [];
      const isLiked = currentFavorites.includes(collectionId);
      const newFavorites = isLiked
        ? currentFavorites.filter(id => id !== collectionId)
        : [...currentFavorites, collectionId];

      // Update the user's favorites
      const { error: updateError } = await supabase
        .from('users')
        .update({ favor_collections: newFavorites })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // Update the collection likes count
      const { data: collectionData, error: collectionFetchError } = await supabase
        .from('collections')
        .select('like_count')
        .eq('id', collectionId)
        .single();

      if (collectionFetchError) {
        console.error('Collection fetch error:', collectionFetchError);
        // Continue execution even if this fails
      }

      const currentLikeCount = collectionData?.like_count || 0;

      // Update the like count
      const { error: likeError } = await supabase
        .from('collections')
        .update({
          like_count: isLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1
        })
        .eq('id', collectionId);

      if (likeError) {
        console.error('Like count update error:', likeError);
        // Continue execution even if this fails
      }

      // For tracking individual likes, check if collection_likes table exists
      if (isLiked) {
        // We'll try to remove the like record, but won't treat this as critical
        try {
          const { error: deleteError } = await supabase
            .from('collection_likes')
            .delete()
            .eq('user_id', session.user.id)
            .eq('collection_id', collectionId);

          if (deleteError) {
            console.error('Delete like error:', deleteError);
          }
        } catch (error) {
          console.error('Error deleting from collection_likes:', error);
        }
      } else {
        // We'll try to add the like record, but won't treat this as critical
        try {
          const { error: insertError } = await supabase
            .from('collection_likes')
            .insert({
              user_id: session.user.id,
              collection_id: collectionId
            });

          if (insertError) {
            console.error('Insert like error:', insertError);
          }
        } catch (error) {
          console.error('Error inserting into collection_likes:', error);
        }
      }

      setLikedCollections(newFavorites);
      
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Collection removed from your collections" : "Collection added to your collections",
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

  return { likedCollections, handleCollectionLike };
};
