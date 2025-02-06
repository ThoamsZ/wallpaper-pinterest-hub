
import { Search, Heart, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const isAdminPanel = location.pathname === "/admin-panel";

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user-data', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('is_admin, email')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSearch = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;

    try {
      const { data: creatorData, error: creatorError } = await supabase
        .from('users')
        .select('id')
        .eq('creator_code', searchQuery.trim())
        .maybeSingle();

      if (creatorError && creatorError.code !== 'PGRST116') {
        throw creatorError;
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
        title: "Search Failed",
        description: "An error occurred while searching",
        variant: "destructive",
      });
    }
  }, [searchQuery, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate("/");
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  }, [navigate]);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  if (isUserLoading) {
    return (
      <header className="bg-background/95 backdrop-blur-md z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="animate-pulse h-24"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background/95 backdrop-blur-md z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex justify-center items-center gap-3">
            <h1 
              className="text-xl font-bold text-primary cursor-pointer" 
              onClick={() => handleNavigation("/")}
            >
              XXWallpaper
            </h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {!isAdminPanel && (
              <button 
                onClick={() => handleNavigation("/")}
                className="text-foreground/80 hover:text-primary transition-colors"
              >
                Explore
              </button>
            )}
            {session && !isAdminPanel && (
              <>
                <button 
                  onClick={() => handleNavigation("/collections")}
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Archive className="w-4 h-4" />
                  Collections
                </button>
                <button 
                  onClick={() => handleNavigation("/likes")}
                  className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Heart className="w-4 h-4" />
                  Likes
                </button>
              </>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              {session ? (
                <>
                  {session.user.email && (
                    <span className="text-xs text-foreground/60 hidden sm:inline truncate max-w-[150px]">
                      {session.user.email}
                    </span>
                  )}
                  {userData?.is_admin && !isAdminPanel && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleNavigation("/admin-panel")}
                      className="text-sm py-1.5"
                      size="sm"
                    >
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="text-sm py-1.5"
                    size="sm"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => handleNavigation("/auth")}
                  className="text-sm py-1.5"
                  size="sm"
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
                  className="w-full pl-10 pr-4 py-1.5 rounded-full border-input text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 w-4 h-4" />
              </div>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
