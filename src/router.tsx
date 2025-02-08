import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div>加载中...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default Router 