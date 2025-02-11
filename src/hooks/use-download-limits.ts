
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDownloadLimits = () => {
  const [downloadsRemaining, setDownloadsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDownloadLimits = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        const { data: userData, error } = await supabase
          .from('users')
          .select('daily_downloads_remaining, subscription_status')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching download limits:', error);
          return;
        }

        setDownloadsRemaining(userData?.daily_downloads_remaining ?? 0);
      }
      setIsLoading(false);
    };

    fetchDownloadLimits();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchDownloadLimits();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const decrementDownloads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email === 'guest@wallpaperhub.com') return;

    const { error } = await supabase
      .from('users')
      .update({
        daily_downloads_remaining: Math.max((downloadsRemaining || 0) - 1, 0)
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating download count:', error);
      return;
    }

    setDownloadsRemaining(prev => prev !== null ? Math.max(prev - 1, 0) : null);
  };

  return {
    downloadsRemaining,
    isLoading,
    decrementDownloads
  };
};
