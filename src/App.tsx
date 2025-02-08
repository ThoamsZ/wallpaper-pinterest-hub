
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: any | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(() => {
    // Try to get session from localStorage first
    const saved = localStorage.getItem('session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Initial session check:", currentSession);
        if (currentSession) {
          setSession(currentSession);
          localStorage.setItem('session', JSON.stringify(currentSession));
        } else {
          setSession(null);
          localStorage.removeItem('session');
        }
      } catch (error) {
        console.error("Session check error:", error);
        setSession(null);
        localStorage.removeItem('session');
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log("Auth state changed:", _event, newSession);
      setSession(newSession);
      
      if (newSession) {
        localStorage.setItem('session', JSON.stringify(newSession));
      } else {
        localStorage.removeItem('session');
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
