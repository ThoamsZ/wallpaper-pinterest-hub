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
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  useEffect(() => {
    // 添加页面刷新的监听器
    const handleRefresh = () => {
      navigate('/auth')
    }

    window.addEventListener('beforeunload', handleRefresh)

    return () => {
      window.removeEventListener('beforeunload', handleRefresh)
    }
  }, [navigate])

  // ... 保持其他现有的 AuthContext 代码不变 ...

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;