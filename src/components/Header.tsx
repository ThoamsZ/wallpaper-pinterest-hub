import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    
    if (!searchQuery.trim()) return;

    // First try to find by creator code
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
      // If creator found, navigate to their profile
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
    navigate(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-2 sm:px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="w-full sm:w-auto flex items-center justify-between">
            <h1 
              className="text-xl sm:text-2xl font-bold text-primary cursor-pointer" 
              onClick={() => handleNavigation("/")}
            >
              XXWallpaper
            </h1>
            <button
              className="sm:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
          
          <div className={`w-full sm:flex ${isMenuOpen ? 'flex' : 'hidden'} flex-col sm:flex-row items-center gap-2 sm:gap-4`}>
            {!isAdminPanel && (
              <form onSubmit={handleSearch} className="w-full sm:max-w-md relative">
                <Input
                  type="search"
                  placeholder="Search wallpapers..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </form>
            )}
            
            <nav className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {!isAdminPanel && (
                <>
                  <button 
                    onClick={() => handleNavigation("/")}
                    className="text-gray-600 hover:text-primary transition-colors w-full sm:w-auto text-sm"
                  >
                    Explore
                  </button>
                  {isAuthenticated && (
                    <button 
                      onClick={() => handleNavigation("/collections")}
                      className="text-gray-600 hover:text-primary transition-colors w-full sm:w-auto text-sm"
                    >
                      Collections
                    </button>
                  )}
                </>
              )}
              
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  {userEmail && (
                    <span className="text-xs text-gray-600 truncate max-w-[150px]">
                      {userEmail}
                    </span>
                  )}
                  {isAdmin && !isAdminPanel && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleNavigation("/admin-panel")}
                      className="w-full sm:w-auto text-sm"
                    >
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="w-full sm:w-auto text-sm"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => handleNavigation("/auth")}
                  className="w-full sm:w-auto text-sm"
                >
                  Login
                </Button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;