import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

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
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">WallpaperHub</h1>
        <div className="relative max-w-md w-full mx-4">
          <Input
            type="search"
            placeholder="Search wallpapers..."
            className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <nav className="flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">
            Explore
          </a>
          <a href="#" className="text-gray-600 hover:text-primary transition-colors">
            Collections
          </a>
          {isAuthenticated ? (
            <>
              <Button variant="outline" onClick={() => navigate("/admin")}>
                Admin
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")}>Login</Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;