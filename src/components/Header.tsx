
import { Search, Heart, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  isDisabled?: boolean;
}

const Header = ({ isDisabled = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isAdminPanel = location.pathname === "/admin-panel";

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAuthenticated(false);
          setUserEmail("");
          setIsAdmin(false);
          return;
        }

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
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Header auth state changed:", event);
      
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

        setIsAdmin(userData?.is_admin || false);
      } catch (error) {
        console.error('Error updating user state:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled || isProcessing) return;
    
    if (!searchQuery.trim()) return;

    setIsProcessing(true);
    try {
      const { data: creatorData, error: creatorError } = await supabase
        .from('users')
        .select('id')
        .eq('creator_code', searchQuery.trim())
        .single();

      if (creatorError && creatorError.code !== 'PGRST116') {
        console.error('Error searching creator:', creatorError);
        return;
      }

      if (creatorData) {
        navigate(`/creator/${searchQuery.trim()}`);
      } else {
        toast({
          title: "Creator Not Found",
          description: "No creator found with this code",
          variant: "destructive",
        });
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
        return;
      }
      
      navigate("/");
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigation = (path: string) => {
    if (isDisabled || isProcessing) return;
    navigate(path);
  };

  const isButtonDisabled = isDisabled || isProcessing;

  return (
    <header className="bg-white/95 backdrop-blur-md z-40 border-b shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 
              className={`text-xl font-bold ${isButtonDisabled ? 'text-gray-400' : 'text-primary cursor-pointer'}`}
              onClick={() => !isButtonDisabled && handleNavigation("/")}
            >
              XXWallpaper
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
                  placeholder="Search for creator codes..."
                  className={`w-full pl-10 pr-4 py-1.5 rounded-full border-gray-200 text-sm ${isButtonDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
