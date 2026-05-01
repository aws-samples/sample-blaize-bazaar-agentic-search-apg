/**
 * StorefrontPage — the `/` route composition.
 *
 * Ordering matches storefront.md §"Frontend Component Tree" and the
 * reference composition in `stories/HomePage.stories.tsx`:
 *
 *   AnnouncementBar -> Header (current="home") -> HeroStage ->
 *   AuthStateBand -> LiveStatusStrip -> CategoryChips ->
 *   ProductGrid (key={prefsVersion}) -> RefinementPanel ->
 *   StoryboardTeaser -> Footer -> CommandPill
 *
 * Modals (AuthModal, PreferencesModal, ConciergeModal, CartModal,
 * CheckoutModal) mount at the App root, not inside StorefrontPage,
 * so they survive route changes.
 *
 * The `key={prefsVersion}` on ProductGrid (Req 1.6.6) is this page's
 * responsibility: the grid itself does not read AuthContext. When
 * `savePreferences` advances the counter, React tears down the grid and
 * the parallax observer re-fires on mount.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header, { type NavItem } from '../components/Header'
import HeroHeadline from '../components/HeroHeadline'
import HeroStage from '../components/HeroStage'
import AuthStateBand from '../components/AuthStateBand'
import LiveStatusStrip from '../components/LiveStatusStrip'
import DemoChatCarousel from '../components/DemoChatCarousel'
import CategoryChips from '../components/CategoryChips'
import ProductGridHeader from '../components/ProductGridHeader'
import ProductGrid from '../components/ProductGrid'
import RefinementPanel from '../components/RefinementPanel'
import StoryboardTeaser from '../components/StoryboardTeaser'
import Footer from '../components/Footer'
import CommandPill from '../components/CommandPill'
import StorefrontSpotlight from '../components/StorefrontSpotlight'
import { useAuth } from '../contexts/AuthContext'
import { usePersona } from '../contexts/PersonaContext'
import { useUI } from '../contexts/UIContext'

const CREAM = '#fbf4e8'

const NAV_ROUTES: Record<NavItem, string> = {
  home: '/',
  shop: '/',
  storyboard: '/storyboard',
  discover: '/discover',
  account: '/',
}

export default function StorefrontPage() {
  const { prefsVersion } = useAuth()
  const { openModal, setChatSurface } = useUI()
  const { persona } = usePersona()
  const navigate = useNavigate()

  // Tell UIProvider that ⌘K should open the drawer (not the concierge
  // modal) while on storefront routes.
  useEffect(() => {
    setChatSurface('drawer')
  }, [setChatSurface])

  // Handle `/#shop` hash from off-route Shop nav clicks. React Router
  // ignores the fragment by default, so we scroll to the anchor once
  // the page has painted.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#shop') {
      // Defer a frame so the grid is mounted.
      requestAnimationFrame(() => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [])

  const handleNavigate = (item: NavItem) => {
    if (item === 'account') {
      openModal('auth')
      return
    }
    // Home + Shop both live on the `/` route; clicking either while
    // already on `/` should scroll to the grid rather than no-op.
    // Home scrolls to the top of the page; Shop scrolls to the
    // product grid anchor.
    if (item === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (item === 'shop') {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const target = NAV_ROUTES[item]
    if (target) navigate(target)
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <StorefrontSpotlight />
      <AnnouncementBar />
      <Header
        current="home"
        onNavigate={handleNavigate}
      />
      <main>
        <HeroHeadline />
        <HeroStage />
        <AuthStateBand />
        <LiveStatusStrip />
        <DemoChatCarousel
          onOpenChat={() => openModal('drawer')}
          workshopMode="agentic"
          personaId={persona?.id ?? null}
        />
        <CategoryChips />
        <ProductGridHeader />
        <ProductGrid key={prefsVersion} />
        <RefinementPanel />
        <StoryboardTeaser />
      </main>
      <Footer />
      <CommandPill />
    </div>
  )
}
