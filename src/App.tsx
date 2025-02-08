
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
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

// 定义 AuthContext 类型
interface AuthContextType {
  session: any | null;
}

// 创建 AuthContext
const AuthContext = createContext<AuthContextType | null>(null);

// 自定义 Hook 方便组件访问 AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider 组件
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 获取当前路径
    const currentPath = window.location.pathname;

    // 判断是否是页面刷新
    const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const isPageRefresh = navigationEntries.length > 0 && navigationEntries[0].type === "reload";

    // 仅在 `collections` 页面刷新时跳转到 `/`
    if (isPageRefresh && currentPath === "/collections") {
      navigate("/", { replace: true });

      // **解决刷新后无法再次进入 `/collections` 的问题**
      setTimeout(() => {
        window.history.pushState({}, "", "/");
      }, 100);
    }

    // 初始 session 检查
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    // 监听身份验证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log("Auth state changed:", _event, newSession);
      setSession(newSession);
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

// App 组件
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
