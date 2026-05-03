import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/auth/me')
      setUser(r.data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    setUser(r.data.user)
    return r.data.user
  }

  const signup = async (payload) => {
    const r = await api.post('/auth/signup', payload)
    return r.data
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
