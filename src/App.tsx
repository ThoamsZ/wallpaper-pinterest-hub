
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
import CollectionPage from "@/pages/CollectionPage";
import Likes from "@/pages/Likes";
import CreatorProfile from "@/pages/CreatorProfile";
import AdminPanel from "@/pages/AdminPanel";
import AdminManager from "@/pages/AdminManager";
import CreatorDetail from "@/pages/CreatorDetail";
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
    let mounted = true;
    let subscription: any = null;
    
    const initializeAuth = async () => {
      try {
        // Clear any invalid guest sessions first
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session?.user?.email === 'guest@wallpaperhub.com') {
          console.log("Clearing guest session");
          await supabase.auth.signOut();
        }

        // Set up auth state listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          
          console.log("Auth state changed:", event, newSession?.user?.email);
          
          // Ignore guest sessions
          if (newSession?.user?.email === 'guest@wallpaperhub.com') {
            console.log("Ignoring guest session, signing out");
            supabase.auth.signOut();
            return;
          }
          
          setSession(newSession);
          
          // Only set initializing to false after we've processed the auth state
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            setIsInitializing(false);
          }
        });
        
        subscription = authSubscription;

        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error("Session retrieval error:", error);
          setSession(null);
          setIsInitializing(false);
        } else if (data?.session) {
          // Skip guest sessions
          if (data.session.user.email === 'guest@wallpaperhub.com') {
            console.log("Found guest session, signing out");
            await supabase.auth.signOut();
            setSession(null);
          } else {
            console.log("Existing session found:", data.session.user.email);
            setSession(data.session);
          }
          setIsInitializing(false);
        } else {
          console.log("No session found, browsing anonymously");
          setSession(null);
          setIsInitializing(false);
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setSession(null);
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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
            <Route path="/collection/:id" element={<CollectionPage />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/creator/:creatorCode" element={<CreatorProfile />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/admin-manager" element={<AdminManager />} />
            <Route path="/admin-manager/creator/:creatorId" element={<CreatorDetail />} />
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
