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
import { useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header, { type NavItem } from '../components/Header'
import HeroHeadline from '../components/HeroHeadline'
import HeroStage from '../components/HeroStage'
import AuthStateBand from '../components/AuthStateBand'
import LiveStatusStrip from '../components/LiveStatusStrip'
import CategoryChips from '../components/CategoryChips'
import ProductGridHeader from '../components/ProductGridHeader'
import ProductGrid from '../components/ProductGrid'
import RefinementPanel from '../components/RefinementPanel'
import StoryboardTeaser from '../components/StoryboardTeaser'
import Footer from '../components/Footer'
import CommandPill from '../components/CommandPill'
import StorefrontSpotlight from '../components/StorefrontSpotlight'
import { useAuth } from '../contexts/AuthContext'
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
  const { openModal } = useUI()
  const navigate = useNavigate()

  const handleNavigate = (item: NavItem) => {
    if (item === 'account') {
      openModal('auth')
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
