import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

function AppContent() {
  const { session, loading } = useAuth()

  useEffect(() => {
    console.log('AppContent mounted:', { session, loading })
  }, [])

  console.log('AppContent 渲染:', { session, loading })

  if (loading) {
    return <div>AppContent 加载中...</div>
  }

  return (
    <div>
      {session ? (
        <div>
          <h1>已登录</h1>
          <p>用户邮箱: {session.user?.email}</p>
        </div>
      ) : (
        <div>
          <h1>请登录</h1>
        </div>
      )}
    </div>
  )
}

export default AppContent 