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
 * components (SearchOverlay, DemoChatCarousel, RecentlyViewed,
 * ProactiveSuggestions, AgentWorkflowVisualizer). Those components are
 * no longer reachable from any route after AppContent's removal, so no
 * ThemeProvider is mounted. The export exists solely to keep `tsc`
 * green until the orphans are deleted in a follow-up cleanup.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { UIProvider } from './contexts/UIContext'
import { LayoutProvider } from './contexts/LayoutContext'
import AuthModal from './components/AuthModal'
import PreferencesModal from './components/PreferencesModal'
import ConciergeModal from './components/ConciergeModal'
import ComparisonHost from './components/ComparisonHost'
import SignInPage from './components/SignInPage'
import HomePage from './pages/HomePage'
import WorkshopPage from './pages/WorkshopPage'
import InspectorPage from './pages/InspectorPage'
import StoryboardPage from './pages/StoryboardPage'
import DiscoverPage from './pages/DiscoverPage'
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
// App — provider chain + routes.
// ---------------------------------------------------------------------------
function App() {
  return (
    <AuthProvider>
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
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ConciergeModal />
              <ComparisonHost />
              <Routes>
                {/*
                 *   /           → HomePage (storefront shell)
                 *   /workshop   → WorkshopPage (instrumentation, gated by AuthGate)
                 *   /inspector  → InspectorPage (frozen session-scoped trace view)
                 *   /storyboard → StoryboardPage
                 *   /discover   → DiscoverPage
                 *   *           → redirect to /
                 */}
                <Route path="/" element={<HomePage />} />
                <Route path="/workshop" element={<WorkshopPage />} />
                <Route path="/inspector" element={<InspectorPage />} />
                <Route path="/storyboard" element={<StoryboardPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </CartProvider>
      </LayoutProvider>
    </AuthProvider>
  )
}

export default App
