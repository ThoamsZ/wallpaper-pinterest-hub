
import { Search, Heart, Archive, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryClient } from "@tanstack/react-query";

interface HeaderProps {
  isDisabled?: boolean;
}

const Header = ({ isDisabled = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const isAdminPanel = location.pathname === "/admin-panel";

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
            setIsVip(false);
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || "");

          // Check admin status
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('admin_type')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (adminError) {
            console.error('Error fetching admin data:', adminError);
          } else {
            setIsAdmin(!!adminData);
          }

          // Check VIP status
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('vip_type, vip_expires_at')
            .eq('id', session.user.id)
            .single();
          
          if (userError) {
            console.error('Error fetching user data:', userError);
          } else {
            const isActiveVip = userData.vip_type === 'lifetime' || 
              (userData.vip_type && userData.vip_expires_at && new Date(userData.vip_expires_at) > new Date());
            setIsVip(isActiveVip);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Header auth state changed:", event);
      
      if (!mounted) return;

      if (!session) {
        setIsAuthenticated(false);
        setUserEmail("");
        setIsAdmin(false);
        setIsVip(false);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(session.user.email || "");

      try {
        // Check admin status
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('admin_type')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (adminError) {
          console.error('Error fetching admin data:', adminError);
        } else if (mounted) {
          setIsAdmin(!!adminData);
        }

        // Check VIP status
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('vip_type, vip_expires_at')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          console.error('Error fetching user data:', userError);
        } else if (mounted) {
          const isActiveVip = userData.vip_type === 'lifetime' || 
            (userData.vip_type && userData.vip_expires_at && new Date(userData.vip_expires_at) > new Date());
          setIsVip(isActiveVip);
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

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled || isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (!searchQuery.trim()) {
        // Reset to show all wallpapers when search is empty
        queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
        setIsProcessing(false);
        return;
      }

      const { data: creatorData, error: creatorError } = await supabase
        .from('users')
        .select('id')
        .eq('creator_code', searchQuery.trim())
        .maybeSingle();

      if (creatorData) {
        navigate(`/creator/${searchQuery.trim()}`);
        setIsProcessing(false);
        return;
      }

      const { data: wallpaperData, error: wallpaperError } = await supabase
        .from('wallpapers')
        .select('*')
        .contains('tags', [searchQuery.trim()]);

      if (wallpaperData && wallpaperData.length > 0) {
        queryClient.setQueryData(['wallpapers'], {
          pages: [wallpaperData],
          pageParams: [0],
        });
      } else {
        toast({
          title: "No Results",
          description: "No wallpapers or creators found with your search term",
          variant: "destructive",
        });
        // Reset to show all wallpapers when no results found
        queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: "An error occurred while searching",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (isDisabled || isProcessing) return;

    setIsProcessing(true);
    try {
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, just clear local state and redirect
        queryClient.clear();
        setIsAuthenticated(false);
        setUserEmail("");
        setIsAdmin(false);
        setIsVip(false);
        navigate("/auth");
        return;
      }

      // We have a valid session, try to sign out
      const { error } = await supabase.auth.signOut({
        scope: 'local'  // Only clear local session first
      });

      if (error) {
        console.error('Local logout error:', error);
      }

      // Clear all local state regardless of signout success
      queryClient.clear();
      setIsAuthenticated(false);
      setUserEmail("");
      setIsAdmin(false);
      setIsVip(false);

      // Try global signout but don't wait for it
      try {
        await supabase.auth.signOut({
          scope: 'global'
        });
      } catch (error) {
        // Ignore global signout errors
        console.log('Global logout note:', error);
      }

      toast({
        title: "Success",
        description: "You have been logged out",
      });

      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state and redirect anyway
      queryClient.clear();
      setIsAuthenticated(false);
      setUserEmail("");
      setIsAdmin(false);
      setIsVip(false);
      
      toast({
        title: "Notice",
        description: "You have been logged out",
      });
      
      navigate("/auth");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigation = async (path: string) => {
    if (isDisabled || isProcessing) return;
    
    if ((path === '/collections' || path === '/likes') && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    
    // Reset search query and wallpapers when navigating to home
    if (path === '/') {
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
    }
    
    navigate(path);
  };

  const isButtonDisabled = isDisabled || isProcessing;

  return (
    <header className="bg-white/95 backdrop-blur-md z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-center items-center gap-3">
            <h1 
              className={`text-xl font-bold ${isButtonDisabled ? 'text-gray-400' : 'text-primary cursor-pointer'}`}
              onClick={() => !isButtonDisabled && handleNavigation("/")}
            >
              xxWallpaper
            </h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {!isAdminPanel && (
              <button 
                onClick={() => handleNavigation("/")}
                className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors`}
                disabled={isButtonDisabled}
              >
                Explore
              </button>
            )}
            {isAuthenticated && !isAdminPanel && (
              <>
                <button 
                  onClick={() => handleNavigation("/collections")}
                  className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
                  disabled={isButtonDisabled}
                >
                  <Archive className="w-4 h-4" />
                  Collections
                </button>
                <button 
                  onClick={() => handleNavigation("/likes")}
                  className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
                  disabled={isButtonDisabled}
                >
                  <Heart className="w-4 h-4" />
                  Likes
                </button>
                <button 
                  onClick={() => handleNavigation("/subscription")}
                  className={`${isButtonDisabled ? 'text-gray-400' : isVip ? 'text-primary' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
                  disabled={isButtonDisabled}
                >
                  <Crown className={`w-4 h-4 ${isVip ? 'fill-primary' : ''}`} />
                  {isVip ? "VIP Active" : "Upgrade to VIP"}
                </button>
              </>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated ? (
                <>
                  {userEmail && (
                    <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-[150px]">
                      {userEmail}
                    </span>
                  )}
                  {isAdmin && !isAdminPanel && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleNavigation("/admin-panel")}
                      className="text-sm py-1.5"
                      size="sm"
                      disabled={isButtonDisabled}
                    >
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="text-sm py-1.5"
                    size="sm"
                    disabled={isButtonDisabled}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => handleNavigation("/auth")}
                  className="text-sm py-1.5"
                  size="sm"
                  disabled={isButtonDisabled}
                >
                  Login
                </Button>
              )}
            </div>
          </div>

          {!isAdminPanel && (
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search for wallpapers or creator codes..."
                  className={`w-full pl-10 pr-4 py-1.5 rounded-full border-gray-200 text-sm ${isButtonDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      const form = e.target.form;
                      if (form) form.requestSubmit();
                    }
                  }}
                  disabled={isButtonDisabled}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

