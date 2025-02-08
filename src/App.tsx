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
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function App() {
  // 保存登录会话和加载状态
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    }).catch(err => {
      console.error('获取 session 失败:', err)
      setIsLoading(false)
    })

    // 监听身份状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // 如有需要，也可以针对不同 event 进行处理
    })

    return () => {
      authListener?.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return <div>加载中...</div>
  }

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