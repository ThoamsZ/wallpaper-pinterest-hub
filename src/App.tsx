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

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('your_table').select('*')
        if (error) {
          console.error('数据获取错误:', error)
        } else {
          console.log('获取到的数据:', data)
          // 更新状态
        }
      } catch (err) {
        console.error('请求失败:', err)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session])

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      {isLoading ? (
        <div>加载中...</div>
      ) : (
        session ? (
          <div>已登录状态，欢迎回来！</div>
        ) : (
          <div>请登录</div>
        )
      )}
    </div>
  )
}

export default App;