import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-ink-950">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
