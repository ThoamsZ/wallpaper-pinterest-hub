
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useDownloadLimits = () => {
  const [downloadsRemaining, setDownloadsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDownloadLimits = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.email !== 'guest@wallpaperhub.com') {
        // First check if subscription has expired and update if needed
        await checkAndUpdateExpiredSubscription(session.user.id);
        
        // Then fetch the current download limits
        const { data: userData, error } = await supabase
          .from('users')
          .select('daily_downloads_remaining')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching download limits:', error);
          return;
        }

        if (userData) {
          setDownloadsRemaining(userData.daily_downloads_remaining);
        }
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

  // Function to check if subscription has expired and update user status
  const checkAndUpdateExpiredSubscription = async (userId: string) => {
    const { data: userData, error } = await supabase
      .from('users')
      .select('vip_type, vip_expires_at, subscription_status')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !userData) {
      console.error('Error checking subscription status:', error);
      return;
    }
    
    // Check if subscription has expired (not lifetime and expiry date is in the past)
    if (
      userData.vip_type !== 'lifetime' && 
      userData.vip_type !== 'none' &&
      userData.vip_expires_at && 
      new Date(userData.vip_expires_at) < new Date() &&
      userData.subscription_status === 'active'
    ) {
      console.log('Subscription expired, updating status...');
      
      // Update user status to reflect expired subscription
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'expired',
          vip_type: 'none',
          daily_downloads_remaining: 5 // Reset to non-VIP limit
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating expired subscription:', updateError);
      } else {
        toast({
          title: "Subscription Expired",
          description: "Your VIP subscription has expired. Daily download limit has been reset to 5.",
          variant: "destructive",
        });
      }
    }
  };

  const decrementDownloads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email === 'guest@wallpaperhub.com') return;

    // Check subscription status before decrementing
    await checkAndUpdateExpiredSubscription(session.user.id);

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
