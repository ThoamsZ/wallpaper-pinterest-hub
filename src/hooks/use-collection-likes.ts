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
          .from('customers')
          .select('favor_collections')
          .eq('user_id', session.user.id)
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
        .from('customers')
        .select('favor_collections')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;

      const currentFavorites = userData?.favor_collections || [];
      const isLiked = currentFavorites.includes(collectionId);
      const newFavorites = isLiked
        ? currentFavorites.filter(id => id !== collectionId)
        : [...currentFavorites, collectionId];

      // Update the user's favorites in customers table
      const { error: updateError } = await supabase
        .from('customers')
        .update({ favor_collections: newFavorites })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      // Get the current like count for the collection
      const { data: collectionData, error: collectionFetchError } = await supabase
        .from('collections')
        .select('like_count')
        .eq('id', collectionId)
        .single();

      if (collectionFetchError) throw collectionFetchError;

      // Current like count (default to 0 if null)
      const currentLikeCount = collectionData?.like_count || 0;
      
      // Calculate new like count
      const newLikeCount = isLiked 
        ? Math.max(0, currentLikeCount - 1) // Prevent negative counts
        : currentLikeCount + 1;

      // Update the like count in the collections table
      const { error: likeCountError } = await supabase
        .from('collections')
        .update({ like_count: newLikeCount })
        .eq('id', collectionId);

      if (likeCountError) throw likeCountError;

      // For tracking individual likes in collection_likes table
      if (isLiked) {
        // Remove like record
        const { error: deleteError } = await supabase
          .from('collection_likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('collection_id', collectionId);

        if (deleteError) console.error('Delete like error:', deleteError);
      } else {
        // Add like record
        const { error: insertError } = await supabase
          .from('collection_likes')
          .insert({
            user_id: session.user.id,
            collection_id: collectionId
          });

        if (insertError) console.error('Insert like error:', insertError);
      }

      // Update local state
      setLikedCollections(newFavorites);
      
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Collection removed from your collections" : "Collection added to your collections",
      });
    } catch (error: any) {
      console.error('Like error:', error);
      toast({
        title: "Action failed",
        description: "There was an error updating your favorites: " + error.message,
        variant: "destructive",
      });
    }
  };

  return { likedCollections, handleCollectionLike };
};