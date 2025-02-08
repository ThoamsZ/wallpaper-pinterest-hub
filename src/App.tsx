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
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. 初始化时获取会话状态
    const initializeAuth = async () => {
      try {
        // 获取当前会话状态
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        setSession(currentSession)
        console.log('当前会话状态:', currentSession)
      } catch (err) {
        console.error('初始化认证失败:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    // 2. 设置认证状态监听器
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('认证状态变更:', event, newSession)
      
      // 根据不同的认证事件处理
      switch (event) {
        case 'SIGNED_IN':
          setSession(newSession)
          setIsLoading(false)
          break
        case 'SIGNED_OUT':
          setSession(null)
          setIsLoading(false)
          break
        case 'TOKEN_REFRESHED':
          setSession(newSession)
          setIsLoading(false)
          break
        default:
          // 处理其他可能的事件
          break
      }
    })

    // 初始化
    initializeAuth()

    // 清理监听器
    return () => {
      authListener?.unsubscribe()
    }
  }, [])

  // 错误处理
  if (error) {
    return <div>发生错误: {error}</div>
  }

  // 加载状态
  if (isLoading) {
    return <div>正在加载...</div>
  }

  // 根据登录状态渲染不同内容
  return (
    <div>
      {session ? (
        <div>
          <h1>欢迎回来！</h1>
          <p>用户邮箱: {session.user.email}</p>
          {/* 这里添加登录后需要显示的内容 */}
        </div>
      ) : (
        <div>
          <h1>请登录</h1>
          {/* 这里添加登录表单或登录按钮 */}
        </div>
      )}
    </div>
  )
}

export default App;