import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ThemeProvider } from "@/components/theme-provider";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import AdminLogin from "@/pages/AdminLogin";
import AdminRegister from "@/pages/AdminRegister";
import Collections from "@/pages/Collections";
import Likes from "@/pages/Likes";
import CreatorProfile from "@/pages/CreatorProfile";
import AdminPanel from "@/pages/AdminPanel";
import AdminManager from "@/pages/AdminManager";
import NotFound from "@/pages/NotFound";
import Upload from "@/pages/Upload";
import Subscription from "@/pages/Subscription";
import Policy from "@/pages/Policy";
import WallpaperPage from "@/pages/WallpaperPage";
import { Toaster } from "@/components/ui/sonner";

import "./App.css";

interface AuthContextType {
  session: any | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session retrieval error:", error);
          await supabase.auth.signOut();
        }
        
        if (data?.session) {
          console.log("Existing session found:", data.session.user.email);
          setSession(data.session);
        } else {
          console.log("No session found, attempting guest login");
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'guest@wallpaperhub.com',
            password: 'guest123',
          });

          if (authError) {
            console.error("Guest login error:", authError);
            setSession(null);
          } else if (authData.session) {
            console.log("Successfully logged in as guest");
            setSession(authData.session);
            toast({
              title: "Welcome to xxWallpaper",
              description: "You're browsing as a guest. Sign up to like and collect wallpapers!",
            });
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log("Auth state changed:", event, newSession?.user?.email);
          setSession(newSession);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        setSession(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/creator/:creatorCode" element={<CreatorProfile />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/admin-manager" element={<AdminManager />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/wallpaper/:id" element={<WallpaperPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
