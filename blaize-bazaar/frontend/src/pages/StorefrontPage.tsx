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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import RefinementPanel, { type RefinementChip } from '../components/RefinementPanel'
import StoryboardTeaser from '../components/StoryboardTeaser'
import Footer from '../components/Footer'
import CommandPill from '../components/CommandPill'
import StorefrontSpotlight from '../components/StorefrontSpotlight'
import { useAuth } from '../contexts/AuthContext'
import { usePersona } from '../contexts/PersonaContext'
import { useUI } from '../contexts/UIContext'
import { SHOWCASE_PRODUCTS } from '../data/showcaseProducts'
import type { StorefrontProduct } from '../services/types'

const CREAM = '#fbf4e8'

const NAV_ROUTES: Record<NavItem, string> = {
  home: '/',
  shop: '/',
  storyboard: '/storyboard',
  discover: '/discover',
  account: '/',
}

// Chip → predicate. Two of the four chips map to real product fields
// (price, tags); "Ships by Friday" and "Gift-wrappable" are demo
// placeholders that pass everything through today. The teaching
// caption in RefinementPanel is honest about composition (pgvector
// semantic match × metadata filter) — we're just doing the metadata
// half client-side against the pre-loaded showcase. Real pgvector
// composition will land when the grid fetches from a search endpoint.
const FILTER_PREDICATES: Record<RefinementChip, (p: StorefrontProduct) => boolean> = {
  'Under $100': (p) => p.price < 100,
  'Ships by Friday': () => true,
  'Gift-wrappable': () => true,
  'From smaller makers': (p) =>
    Array.isArray(p.tags) && p.tags.includes('slow'),
}

function applyFilters(
  products: readonly StorefrontProduct[],
  filters: readonly RefinementChip[],
): StorefrontProduct[] {
  if (filters.length === 0) return [...products]
  return products.filter((p) =>
    filters.every((chip) => FILTER_PREDICATES[chip](p)),
  )
}

export default function StorefrontPage() {
  const { prefsVersion } = useAuth()
  const { openModal, setChatSurface } = useUI()
  const { persona } = usePersona()
  const navigate = useNavigate()

  // Refinement chip state + the filtered grid derived from it.
  // Lifting the state here lets the RefinementPanel be controlled
  // and the ProductGrid actually re-render when chips toggle. The
  // filter latency is measured so the teaching caption shows a real
  // number instead of the hardcoded ~143ms.
  const [activeFilters, setActiveFilters] = useState<RefinementChip[]>([])
  const [filterLatencyMs, setFilterLatencyMs] = useState<number | null>(null)

  const filteredProducts = useMemo(() => {
    if (typeof performance === 'undefined') {
      return applyFilters(SHOWCASE_PRODUCTS, activeFilters)
    }
    const t0 = performance.now()
    const result = applyFilters(SHOWCASE_PRODUCTS, activeFilters)
    const elapsed = Math.max(1, Math.round(performance.now() - t0))
    // setState inside a useMemo is usually wrong, but here we're only
    // writing a passive latency number that no render path depends on,
    // so it's safe. Wrap in a microtask to sidestep the render warning.
    queueMicrotask(() => setFilterLatencyMs(elapsed))
    return result
  }, [activeFilters])

  const handleFiltersChange = useCallback((next: RefinementChip[]) => {
    setActiveFilters(next)
  }, [])

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
        {/* `key` combines prefsVersion (preferences-save parallax
         * re-fire) with the active-filter count so the grid also
         * re-mounts on chip toggle — the useScrollReveal observer
         * then re-fires for the new set.
         */}
        <ProductGrid
          key={`${prefsVersion}-${activeFilters.length}`}
          products={filteredProducts}
        />
        <RefinementPanel
          activeFilters={activeFilters}
          onChange={handleFiltersChange}
          measuredLatencyMs={filterLatencyMs}
        />
        <StoryboardTeaser />
      </main>
      <Footer />
      <CommandPill />
    </div>
  )
}
