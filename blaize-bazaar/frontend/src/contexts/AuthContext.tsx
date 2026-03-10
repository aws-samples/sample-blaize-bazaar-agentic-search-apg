/**
 * AuthContext — Cognito OAuth2 login for Lab 4a (AgentCore Identity).
 *
 * Wire It Live: Participants configure COGNITO_DOMAIN, CLIENT_ID, and REDIRECT_URI,
 * then implement the OAuth2 PKCE redirect flow.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface AuthUser {
  sub: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  accessToken: string | null
  login: () => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// === WIRE IT LIVE (Lab 4a) ===
// Configure these from your CloudFormation outputs:
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || ''
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || ''
const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/`
// === END WIRE IT LIVE ===

function parseTokenFromHash(): { accessToken: string; idToken: string } | null {
  const hash = window.location.hash.substring(1)
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const idToken = params.get('id_token')
  if (!accessToken || !idToken) return null

  return { accessToken, idToken }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('blaize-access-token')
  )
  const [loading, setLoading] = useState(true)

  // On mount: check for token in URL hash (OAuth redirect) or localStorage
  useEffect(() => {
    const tokens = parseTokenFromHash()
    if (tokens) {
      // Returned from Cognito Hosted UI
      localStorage.setItem('blaize-access-token', tokens.accessToken)
      localStorage.setItem('blaize-id-token', tokens.idToken)
      setAccessToken(tokens.accessToken)

      const claims = decodeJwtPayload(tokens.idToken)
      setUser({
        sub: (claims.sub as string) || '',
        email: (claims.email as string) || 'user',
      })

      // Clean up URL hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    } else if (accessToken) {
      // Restore from localStorage
      const idToken = localStorage.getItem('blaize-id-token')
      if (idToken) {
        const claims = decodeJwtPayload(idToken)
        // Check expiration
        const exp = claims.exp as number
        if (exp && exp * 1000 > Date.now()) {
          setUser({
            sub: (claims.sub as string) || '',
            email: (claims.email as string) || 'user',
          })
        } else {
          // Token expired — clear
          localStorage.removeItem('blaize-access-token')
          localStorage.removeItem('blaize-id-token')
          setAccessToken(null)
        }
      }
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
      console.warn('Cognito not configured — set VITE_COGNITO_DOMAIN and VITE_COGNITO_CLIENT_ID')
      return
    }
    // Redirect to Cognito Hosted UI (implicit grant)
    const authUrl = `https://${COGNITO_DOMAIN}/login?` +
      `client_id=${COGNITO_CLIENT_ID}` +
      `&response_type=token` +
      `&scope=openid+email+profile` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    window.location.href = authUrl
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('blaize-access-token')
    localStorage.removeItem('blaize-id-token')
    setUser(null)
    setAccessToken(null)

    if (COGNITO_DOMAIN && COGNITO_CLIENT_ID) {
      // Redirect to Cognito logout
      const logoutUrl = `https://${COGNITO_DOMAIN}/logout?` +
        `client_id=${COGNITO_CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`
      window.location.href = logoutUrl
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
