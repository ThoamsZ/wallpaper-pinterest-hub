
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
import { Toaster } from "@/components/ui/toaster";

import "./App.css";

// Define AuthContext type
interface AuthContextType {
  session: any | null;
}

// Create AuthContext
const AuthContext = createContext<AuthContextType | null>(null);

// Custom Hook for accessing AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          console.log("Existing session found:", currentSession.user.email);
          setSession(currentSession);
        } else {
          // If no session exists, try to sign in as guest
          console.log("No session found, attempting guest login");
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guest@wallpaperhub.com',
            password: 'guest123',
          });

          if (error) {
            console.error("Guest login error:", error);
            setSession(null);
          } else if (data.session) {
            console.log("Successfully logged in as guest");
            setSession(data.session);
            toast({
              title: "Welcome to xxWallpaper",
              description: "You're browsing as a guest. Sign up to like and collect wallpapers!",
            });
          }
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          console.log("Auth state changed:", _event, newSession?.user?.email);
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

  // Show loading state while initializing
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

// App component
function App() {
  return (
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
