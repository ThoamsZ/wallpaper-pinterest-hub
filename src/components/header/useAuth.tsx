
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            setIsAuthenticated(false);
            setUserEmail("");
            setIsAdmin(false);
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || "");

          const { data: userData, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching user data:', error);
            return;
          }
          
          setIsAdmin(userData?.is_admin || false);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (!session) {
        setIsAuthenticated(false);
        setUserEmail("");
        setIsAdmin(false);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(session.user.email || "");

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }

        if (mounted) {
          setIsAdmin(userData?.is_admin || false);
        }
      } catch (error) {
        console.error('Error updating user state:', error);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, isAdmin, userEmail };
};
