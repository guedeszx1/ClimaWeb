import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { role, loading } = useAuth()

  if (loading) {
    return <div style={{ color: 'white', padding: '2rem' }}>Carregando sessão...</div>
  }

  // Se não houver role ou se for pendente, redireciona pro login
  if (!role || role === 'pendente') {
    return <Navigate to="/login" replace />
  }

  return children ? children : <Outlet />
}
