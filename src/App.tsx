
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Likes from "@/pages/Likes";
import Collections from "@/pages/Collections";
import Upload from "@/pages/Upload";
import Subscription from "@/pages/Subscription";
import AdminPanel from "@/pages/AdminPanel";
import AdminLogin from "@/pages/AdminLogin";
import AdminRegister from "@/pages/AdminRegister";
import AdminManager from "@/pages/AdminManager";
import CreatorProfile from "@/pages/CreatorProfile";
import NotFound from "@/pages/NotFound";
import Policy from "@/pages/Policy";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

import "./App.css";

// Create AuthContext
const AuthContext = createContext({
  session: null,
  isLoading: false,
  signIn: async () => {},
  signOut: async () => {},
});

// Custom Hook for accessing AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = new QueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      queryClient.invalidateQueries();
    });
  }, [queryClient]);

  const signIn = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (error) {
      alert(error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    session,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/manager" element={<AdminManager />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
