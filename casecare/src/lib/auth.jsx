import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api'
import Logo from '../components/Logo'

/**
 * Authentication state (SIH26047 §18, §19). The session lives in an httpOnly
 * cookie set by the backend; we mirror the current user in context for the UI
 * and RBAC checks. No token is ever stored in JS-readable storage.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api
      .get('/auth/me')
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password })
    setUser(d.user)
    return d.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore — clear locally regardless */
    }
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Human-readable label for an RBAC role code (DOCTOR → "Doctor"). */
export function roleLabel(role) {
  if (!role) return null
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

/** Route guard: redirect to /login when there is no session. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <Logo size="md" />
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
