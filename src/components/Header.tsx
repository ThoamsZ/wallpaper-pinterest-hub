
import { Search, Heart, Archive } from "lucide-react";
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
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || "");

          const { data: adminData, error } = await supabase
            .from('admin_users')
            .select('admin_type')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching admin data:', error);
            return;
          }
          
          setIsAdmin(!!adminData);
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
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(session.user.email || "");

      try {
        const { data: adminData, error } = await supabase
          .from('admin_users')
          .select('admin_type')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching admin data:', error);
          return;
        }

        if (mounted) {
          setIsAdmin(!!adminData);
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
      // Clear local state first
      setIsAuthenticated(false);
      setUserEmail("");
      setIsAdmin(false);
      queryClient.clear();

      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Only attempt to sign out if there's an active session
          await supabase.auth.signOut();
        }
      } catch (signOutError) {
        console.error('Sign out error:', signOutError);
      }

      // Always attempt guest login after clearing state
      try {
        const { error: guestError } = await supabase.auth.signInWithPassword({
          email: 'guest@wallpaperhub.com',
          password: 'guest123',
        });

        if (!guestError) {
          console.log('Successfully logged in as guest');
        }
      } catch (guestLoginError) {
        console.error('Guest login error:', guestLoginError);
      }

      // Always navigate to auth and show success message
      navigate("/auth");
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      navigate("/auth");
      toast({
        title: "Notice",
        description: "You have been logged out",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigation = async (path: string) => {
    if (isDisabled || isProcessing) return;
    
    if ((path === '/collections' || path === '/likes') && !isAuthenticated) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
    }
    
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
