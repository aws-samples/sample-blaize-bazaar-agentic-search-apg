/**
 * PersonaContext — workshop persona state shared across storefront + Atelier.
 *
 * One source of truth for the active persona. Both the storefront header
 * pill and the Atelier breadcrumb indicator read from this context. The
 * persona modal (shared component, two entry points) writes to it via
 * ``switchPersona()``.
 *
 * State is persisted to localStorage so a page refresh doesn't lose the
 * active persona. Switching personas generates a new session_id and
 * clears the chat.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export interface PersonaSnapshot {
  id: string
  display_name: string
  role_tag: string
  avatar_color: string
  avatar_initial: string
  customer_id: string
  stats: {
    visits: number
    orders: number
    last_seen_days: number | null
  }
}

export interface PersonaListItem {
  id: string
  display_name: string
  role_tag: string
  blurb: string
  avatar_color: string
  avatar_initial: string
  stats: {
    visits: number
    orders: number
    last_seen_days: number | null
  }
}

interface PersonaContextType {
  /** The active persona, or null if none selected. */
  persona: PersonaSnapshot | null
  /** Switch to a new persona. Generates a new session, clears chat. */
  switchPersona: (personaId: string) => Promise<void>
  /** Sign out — clear the active persona. */
  signOut: () => void
  /** Whether a switch is in flight. */
  switching: boolean
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined)

const STORAGE_KEY = 'blaize-persona'
const SESSION_KEY = 'blaize-session-id'

function loadStored(): PersonaSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<PersonaSnapshot | null>(loadStored)
  const [switching, setSwitching] = useState(false)

  // Persist to localStorage on change
  useEffect(() => {
    if (persona) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persona))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [persona])

  const switchPersona = useCallback(async (personaId: string) => {
    setSwitching(true)
    try {
      const res = await fetch('/api/persona/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId }),
      })
      if (!res.ok) throw new Error(`Switch failed: ${res.status}`)
      const data = await res.json()

      // Store the new session_id so chat picks it up
      localStorage.setItem(SESSION_KEY, data.session_id)

      // Clear any existing chat persistence
      localStorage.removeItem('blaize-storefront-chat')
      localStorage.removeItem('blaize-atelier-chat')
      // ConciergeModal uses its own persist keys — clear those too so the
      // personalized welcome ("Good evening, Marco") actually renders on
      // the next open instead of being shadowed by a stale cached reply.
      localStorage.removeItem('blaize-concierge-storefront')
      localStorage.removeItem('blaize-concierge-atelier')
      // ChatDrawer uses its own persist key.
      localStorage.removeItem('blaize-drawer-storefront')

      setPersona(data.persona)
    } catch (err) {
      console.error('Persona switch failed:', err)
    } finally {
      setSwitching(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setPersona(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('blaize-storefront-chat')
    localStorage.removeItem('blaize-atelier-chat')
    localStorage.removeItem('blaize-concierge-storefront')
    localStorage.removeItem('blaize-concierge-atelier')
    localStorage.removeItem('blaize-drawer-storefront')
  }, [])

  return (
    <PersonaContext.Provider value={{ persona, switchPersona, signOut, switching }}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider')
  return ctx
}
