/**
 * App — root component.
 *
 * Composition is intentionally minimal: provider chain, BrowserRouter,
 * root-level modal hosts (AuthModal, PreferencesModal, ConciergeModal,
 * ComparisonHost), and the final route table. The workshop chrome that
 * used to live here moved into `/workshop` (WorkshopPage).
 *
 * AuthGate is exported because WorkshopPage wraps its own content in it
 * to preserve the Cognito-configured / not-configured branching.
 *
 * useTheme / ThemeContext remain exported for a small set of orphan
 * components (DemoChatCarousel, RecentlyViewed, ProactiveSuggestions,
 * AgentWorkflowVisualizer). Those components are no longer reachable
 * from any route after AppContent's removal, so no ThemeProvider is
 * mounted. The export exists solely to keep `tsc` green until the
 * orphans are deleted in a follow-up cleanup.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { UIProvider, useUI } from './contexts/UIContext'
import { LayoutProvider } from './contexts/LayoutContext'
import { PersonaProvider } from './contexts/PersonaContext'
import AuthModal from './components/AuthModal'
import PersonaTransitionOverlay from './components/PersonaTransitionOverlay'
import PreferencesModal from './components/PreferencesModal'
import ConciergeModal from './components/ConciergeModal'
import ChatDrawer from './components/ChatDrawer'
import ComparisonHost from './components/ComparisonHost'
import SignInPage from './components/SignInPage'
import StorefrontPage from './pages/StorefrontPage'
import WorkshopPage from './pages/WorkshopPage'
import InspectorPage from './pages/InspectorPage'
import StoryboardPage from './pages/StoryboardPage'
import DiscoverPage from './pages/DiscoverPage'
import AtelierComponentsPreview from './pages/AtelierComponentsPreview'
import './styles/premium-heading-styles.css'

// ---------------------------------------------------------------------------
// ThemeContext — legacy. See header comment. No Provider is mounted; `useTheme`
// will throw if called, which is intentional: the only remaining callers live
// in orphan components that no route renders.
// ---------------------------------------------------------------------------
type Theme = 'dark' | 'light'
interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

// ---------------------------------------------------------------------------
// AuthGate — Cognito-aware auth wrapper. Used by WorkshopPage so the
// instrumentation surface remains gated when Cognito is configured.
// When Cognito is not configured (local dev without env vars), children
// pass through directly.
// ---------------------------------------------------------------------------
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const cognitoConfigured = !!(
    import.meta.env.VITE_COGNITO_DOMAIN && import.meta.env.VITE_COGNITO_CLIENT_ID
  )

  if (!cognitoConfigured) return <>{children}</>

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#fbf4e8' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(0,0,0,0.45)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <SignInPage />
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// ModalRouteGuard — closes transient modals when the route changes.
//
// UIProvider sits above BrowserRouter so it can't call useLocation()
// directly. This tiny watcher mounts inside the router, subscribes
// to pathname changes, and closes anything non-persistent. Chat
// surfaces (drawer / concierge) and the comparison modal are
// intentional leave-open cases — a user who opens the chat on `/`
// and navigates to `/atelier` should keep talking to Blaize. The
// auth, preferences, and cart modals close because they're
// context-bound to a specific page.
// ---------------------------------------------------------------------------
const TRANSIENT_MODALS = new Set(['auth', 'preferences', 'cart', 'checkout'])

function ModalRouteGuard() {
  const { pathname } = useLocation()
  const { activeModal, closeModal } = useUI()
  useEffect(() => {
    if (activeModal && TRANSIENT_MODALS.has(activeModal)) {
      closeModal()
    }
    // intentionally only run on pathname changes — activeModal in the
    // dep array would close the modal the instant it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
  return null
}

// ---------------------------------------------------------------------------
// App — provider chain + routes.
// ---------------------------------------------------------------------------
function App() {
  return (
    <AuthProvider>
      <PersonaProvider>
      <LayoutProvider>
        <CartProvider>
          <UIProvider>
            {/*
             * Modal singleton slots. Mounting here puts them above every
             * route; they read `UIContext.activeModal` to decide whether
             * to render, so a route change never interrupts an open modal.
             * AuthModal + PreferencesModal are route-independent; Concierge
             * and Comparison live inside BrowserRouter because the
             * concierge reads useLocation() for route-mode selection.
             */}
            <AuthModal />
            <PreferencesModal />
            <PersonaTransitionOverlay />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ModalRouteGuard />
              <ConciergeModal />
              <ChatDrawer />
              <ComparisonHost />
              <Routes>
                {/*
                 *   /           → StorefrontPage (storefront shell)
                 *   /atelier    → WorkshopPage (instrumentation, gated by AuthGate)
                 *   /inspector  → InspectorPage (frozen session-scoped trace view)
                 *   /storyboard → StoryboardPage
                 *   /discover   → DiscoverPage
                 *   *           → redirect to /
                 */}
                <Route path="/" element={<StorefrontPage />} />
                <Route path="/atelier" element={<WorkshopPage />} />
                {/* Architecture detail pages — deep-linkable. The
                    underlying WorkshopPage reads the :section param
                    and opens the matching detail panel on mount. */}
                <Route
                  path="/atelier/architecture/:section"
                  element={<WorkshopPage />}
                />
                {/* Dev-only: preview gallery for shared atelier/ primitives.
                    Guarded by import.meta.env.DEV so production bundles
                    never include it. */}
                {import.meta.env.DEV && (
                  <Route
                    path="/atelier/_components"
                    element={<AtelierComponentsPreview />}
                  />
                )}
                <Route path="/inspector" element={<InspectorPage />} />
                <Route path="/storyboard" element={<StoryboardPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </CartProvider>
      </LayoutProvider>
      </PersonaProvider>
    </AuthProvider>
  )
}

export default App
