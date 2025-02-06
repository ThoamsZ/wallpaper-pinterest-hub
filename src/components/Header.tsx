
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
  const isAdminPanel = location.pathname === "/admin-panel";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
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
    };

    checkUser();

    supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || "");
      if (session) {
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
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled) return;
    
    if (!searchQuery.trim()) return;

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
  };

  const handleLogout = async () => {
    if (isDisabled) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      navigate("/");
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    }
  };

  const handleNavigation = (path: string) => {
    if (isDisabled) return;
    navigate(path);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md z-40 border-b shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <h1 
              className={`text-xl font-bold ${isDisabled ? 'text-gray-400' : 'text-primary cursor-pointer'}`}
              onClick={() => !isDisabled && handleNavigation("/")}
            >
              XXWallpaper
            </h1>
          </div>

          {/* Navigation and Auth */}
          <div className="flex items-center gap-4 text-sm">
            {!isAdminPanel && (
              <button 
                onClick={() => handleNavigation("/")}
                className={`${isDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors`}
                disabled={isDisabled}
              >
                Explore
              </button>
            )}
            {isAuthenticated && !isAdminPanel && (
              <>
                <button 
                  onClick={() => handleNavigation("/collections")}
                  className={`${isDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
                  disabled={isDisabled}
                >
                  <Archive className="w-4 h-4" />
                  Collections
                </button>
                <button 
                  onClick={() => handleNavigation("/likes")}
                  className={`${isDisabled ? 'text-gray-400' : 'text-gray-600 hover:text-primary'} transition-colors flex items-center gap-1`}
                  disabled={isDisabled}
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
                      disabled={isDisabled}
                    >
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="text-sm py-1.5"
                    size="sm"
                    disabled={isDisabled}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => handleNavigation("/auth")}
                  className="text-sm py-1.5"
                  size="sm"
                  disabled={isDisabled}
                >
                  Login
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          {!isAdminPanel && (
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search for creator codes..."
                  className={`w-full pl-10 pr-4 py-1.5 rounded-full border-gray-200 text-sm ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isDisabled}
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
