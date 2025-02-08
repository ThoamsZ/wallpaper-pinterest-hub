import { useAuth } from '../contexts/AuthContext'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      {session ? (
        <div>
          <h1>已登录</h1>
          <p>用户邮箱: {session.user.email}</p>
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