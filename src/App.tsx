
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Collections from "@/pages/Collections";
import Likes from "@/pages/Likes";
import CreatorProfile from "@/pages/CreatorProfile";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";
import Upload from "@/pages/Upload";
import { Toaster } from "@/components/ui/toaster";

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
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = window.location.pathname;
    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const isPageRefresh = navigationEntries.length > 0 && navigationEntries[0].type === "reload";

    // Only redirect on refresh for protected routes
    if (isPageRefresh && (currentPath === "/collections" || currentPath === "/likes")) {
      window.location.href = "/";
      return;
    }

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setSession(null);
          return;
        }

        setSession(currentSession);
      } catch (error) {
        console.error("Auth initialization error:", error);
        setSession(null);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log("Auth state changed:", _event, newSession);
      
      if (_event === 'TOKEN_REFRESHED') {
        setSession(newSession);
      } else if (_event === 'SIGNED_OUT') {
        setSession(null);
        navigate('/');
      } else {
        setSession(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/likes" element={<Likes />} />
          <Route path="/creator/:creatorCode" element={<CreatorProfile />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
