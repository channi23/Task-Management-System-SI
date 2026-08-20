import { createContext, useContext, useState, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'

interface AuthResponse {
  token: string
}

interface AuthContextValue {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', 'POST', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
  }

  const signup = async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/signup', 'POST', { email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
