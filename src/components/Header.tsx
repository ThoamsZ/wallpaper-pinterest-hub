import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 
          className="text-2xl font-bold text-primary cursor-pointer" 
          onClick={() => handleNavigation("/")}
        >
          XXWallpaper
        </h1>
        {!isAdminPanel && (
          <form onSubmit={handleSearch} className="relative max-w-md w-full mx-4">
            <Input
              type="search"
              placeholder="Search wallpapers or enter creator code..."
              className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </form>
        )}
        <nav className="flex items-center gap-6">
          {!isAdminPanel && (
            <>
              <button 
                onClick={() => handleNavigation("/")}
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Explore
              </button>
              {isAuthenticated && (
                <button 
                  onClick={() => handleNavigation("/collections")}
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  Collections
                </button>
              )}
            </>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {userEmail && (
                <span className="text-sm text-gray-600">
                  {userEmail}
                </span>
              )}
              {isAdmin && !isAdminPanel && (
                <Button variant="outline" onClick={() => handleNavigation("/admin-panel")}>
                  Admin
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={() => handleNavigation("/auth")}>Login</Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
