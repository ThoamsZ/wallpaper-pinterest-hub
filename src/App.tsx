
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Likes from '@/pages/Likes';
import Collections from '@/pages/Collections';
import Upload from '@/pages/Upload';
import Subscription from '@/pages/Subscription';
import AdminPanel from '@/pages/AdminPanel';
import AdminLogin from '@/pages/AdminLogin';
import AdminRegister from '@/pages/AdminRegister';
import AdminManager from '@/pages/AdminManager';
import CreatorProfile from '@/pages/CreatorProfile';
import NotFound from '@/pages/NotFound';
import Policy from "@/pages/Policy";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Session } from '@supabase/supabase-js';
import { supabase } from './integrations/supabase/client';

interface AuthContextProps {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  session: null,
  isLoading: true,  // Changed initial loading state to true
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = new QueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
        } else {
          setSession(initialSession);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      queryClient.invalidateQueries();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (error) {
      console.error('Sign in error:', error);
      alert(error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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

  // Don't render children while loading
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <AuthProvider>
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
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
