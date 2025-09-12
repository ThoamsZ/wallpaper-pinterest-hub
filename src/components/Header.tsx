import { Search, Heart, Archive, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryClient } from "@tanstack/react-query";
interface HeaderProps {
  isDisabled?: boolean;
}
const Header = ({
  isDisabled = false
}: HeaderProps) => {
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
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const isAdminPanel = location.pathname === "/admin-panel";
  useEffect(() => {
    let mounted = true;
    const checkUser = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
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
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (adminError) {
            console.error('Error fetching admin data:', adminError);
          } else {
            setIsAdmin(!!adminData);
          }

          // Check VIP status
          const {
            data: userData,
            error: userError
          } = await supabase.from('users').select('vip_type, vip_expires_at').eq('id', session.user.id).single();
          if (userError) {
            console.error('Error fetching user data:', userError);
          } else {
            const isActiveVip = userData.vip_type === 'lifetime' || userData.vip_type && userData.vip_expires_at && new Date(userData.vip_expires_at) > new Date();
            setIsVip(isActiveVip);
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };
    checkUser();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
          .from('admins')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (adminError) {
          console.error('Error fetching admin data:', adminError);
        } else if (mounted) {
          setIsAdmin(!!adminData);
        }

        // Check VIP status
        const {
          data: userData,
          error: userError
        } = await supabase.from('users').select('vip_type, vip_expires_at').eq('id', session.user.id).single();
        if (userError) {
          console.error('Error fetching user data:', userError);
        } else if (mounted) {
          const isActiveVip = userData.vip_type === 'lifetime' || userData.vip_type && userData.vip_expires_at && new Date(userData.vip_expires_at) > new Date();
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
    
    const query = searchQuery.trim();
    if (!query) {
      // Reset to show all wallpapers when search is empty
      queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
      return;
    }

    // Trigger search in parent component
    window.dispatchEvent(new CustomEvent('headerSearch', { 
      detail: { query } 
    }));
  };
  const handleLogout = async () => {
    if (isDisabled || isProcessing) return;
    setIsProcessing(true);
    try {
      // Clear local state first
      queryClient.clear();
      setIsAuthenticated(false);
      setUserEmail("");
      setIsAdmin(false);
      setIsVip(false);
      
      // Simple signout without session check
      await supabase.auth.signOut();
      
      toast({
        title: "Success",
        description: "You have been logged out"
      });
      navigate("/auth");
    } catch (error) {
      console.log('Logout completed with notice:', error);
      toast({
        title: "Success", 
        description: "You have been logged out"
      });
      navigate("/auth");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleNavigation = useCallback((path: string) => {
    if (isDisabled || isProcessing) return;
    if ((path === '/collections' || path === '/likes') && !isAuthenticated) {
      navigate('/auth');
      return;
    }

    // Reset search query and wallpapers when navigating to home
    if (path === '/') {
      setSearchQuery('');
      queryClient.invalidateQueries({
        queryKey: ['wallpapers']
      });
    }
    navigate(path);
  }, [isDisabled, isProcessing, isAuthenticated, navigate, queryClient]);
  const isButtonDisabled = isDisabled || isProcessing;
  return <header className="bg-white/95 backdrop-blur-md z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-6 rounded-none bg-slate-950">
        <div className="flex flex-col gap-3">
          <div className="flex justify-center items-center gap-3">
            <h1 className={`text-xl font-bold ${isButtonDisabled ? 'text-gray-400' : 'text-primary cursor-pointer'}`} onClick={() => !isButtonDisabled && handleNavigation("/")}>
              xxWallpaper
            </h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {!isAdminPanel && <button onClick={() => handleNavigation("/")} className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors`} disabled={isButtonDisabled}>
                Explore
              </button>}
            {isAuthenticated && !isAdminPanel && <>
                <button onClick={() => handleNavigation("/collections")} className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`} disabled={isButtonDisabled}>
                  <Archive className="w-4 h-4" />
                  Collections
                </button>
                <button onClick={() => handleNavigation("/likes")} className={`${isButtonDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`} disabled={isButtonDisabled}>
                  <Heart className="w-4 h-4" />
                  Likes
                </button>
                <button onClick={() => handleNavigation("/subscription")} className={`${isButtonDisabled ? 'text-gray-400' : isVip ? 'text-primary' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`} disabled={isButtonDisabled}>
                  <Crown className={`w-4 h-4 ${isVip ? 'fill-primary' : ''}`} />
                  {isVip ? "VIP Active" : "Upgrade to VIP"}
                </button>
              </>}
            
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated ? <>
                  {userEmail && <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-[150px]">
                      {userEmail}
                    </span>}
                  {isAdmin && !isAdminPanel && <Button variant="outline" onClick={() => handleNavigation("/admin-panel")} className="text-sm py-1.5" size="sm" disabled={isButtonDisabled}>
                      Admin
                    </Button>}
                  <Button variant="ghost" onClick={handleLogout} className="text-sm py-1.5" size="sm" disabled={isButtonDisabled}>
                    Logout
                  </Button>
                </> : <Button onClick={() => handleNavigation("/auth")} className="text-sm py-1.5" size="sm" disabled={isButtonDisabled}>
                  Login
                </Button>}
            </div>
          </div>

          {!isAdminPanel && <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Input 
                  type="search" 
                  placeholder="Search for wallpapers or creator codes..." 
                  className={`w-full pl-10 pr-4 py-1.5 rounded-full border-gray-200 text-sm ${isButtonDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                  value={searchQuery} 
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Clear existing timeout
                    if (searchTimeout) {
                      clearTimeout(searchTimeout);
                    }
                    // If search is empty, clear immediately
                    if (!e.target.value.trim()) {
                      queryClient.invalidateQueries({ queryKey: ['wallpapers'] });
                    }
                  }}
                  disabled={isButtonDisabled} 
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </form>}
        </div>
      </div>
    </header>;
};
export default Header;