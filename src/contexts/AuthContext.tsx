import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider useEffect 开始执行')
    
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('获取到初始会话:', initialSession)
      setSession(initialSession)
      setLoading(false)
    }).catch(error => {
      console.error('获取会话失败:', error)
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('认证状态变化:', _event, session)
      setSession(session)
      setLoading(false)
    })

    return () => {
      console.log('清理 AuthProvider')
      subscription.unsubscribe()
    }
  }, [])

  console.log('AuthProvider 渲染:', { loading, session })

  const value = {
    session,
    loading,
    signOut: () => supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div>正在加载认证状态...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 