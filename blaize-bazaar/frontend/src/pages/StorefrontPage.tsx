/**
 * StorefrontPage — the `/` route composition (Boutique redesign).
 *
 * Two-act layout:
 *
 *   ACT 1 (above the fold — full viewport):
 *     Header (sticky) → BoutiqueHero (full-height search surface)
 *
 *   ACT 2 (below the fold — scroll to discover):
 *     Featured product image (weekender bag) + "Weekend, re:defined."
 *     → 8 remaining products in a staggered grid
 *     → "Because you asked..." editorial cards
 *     → Footer
 *
 * The hero occupies the entire viewport so the first impression is
 * the search bar. Scrolling reveals the editorial product showcase.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AnnouncementBar from '../components/AnnouncementBar'
import Header, { type NavItem } from '../components/Header'
import BoutiqueHero from '../components/BoutiqueHero'
import BecauseYouAsked from '../components/BecauseYouAsked'
import ProductCard from '../components/ProductCard'
import Footer from '../components/Footer'
import CommandPill from '../components/CommandPill'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useUI } from '../contexts/UIContext'
import { SHOWCASE_PRODUCTS } from '../data/showcaseProducts'

const NAV_ROUTES: Record<NavItem, string> = {
  home: '/',
  shop: '/',
  storyboard: '/storyboard',
  stories: '/storyboard',
  discover: '/discover',
  about: '/about',
  account: '/',
  'ask-blaize': '/',
}

// The featured product is the Nocturne Leather Weekender (id: 3)
const FEATURED_PRODUCT = SHOWCASE_PRODUCTS.find(p => p.id === 3) ?? SHOWCASE_PRODUCTS[2]
// The remaining 8 products (everything except the featured one)
const GRID_PRODUCTS = SHOWCASE_PRODUCTS.filter(p => p.id !== FEATURED_PRODUCT.id)

export default function StorefrontPage() {
  const { prefsVersion } = useAuth()
  const { openModal, setChatSurface } = useUI()
  const { addToCart } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    setChatSurface('drawer')
  }, [setChatSurface])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#shop') {
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

  const handleAddToBag = (product: typeof SHOWCASE_PRODUCTS[0]) =>
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      origin: 'manual',
    })

  return (
    <div className="min-h-dvh bg-cream-50">
      {/* Announcement bar — full-width above the header */}
      <AnnouncementBar />

      <Header current="home" onNavigate={handleNavigate} />

      <main>
        {/* ── ACT 1: Full-viewport hero ── */}
        <BoutiqueHero />

        {/* ── ACT 2: Below the fold ── */}
        <section
          id="shop"
          className="w-full bg-cream-50"
          aria-label="Featured products"
          style={{ scrollMarginTop: 84 }}
        >
          {/* Featured product: large image + editorial title */}
          <div className="max-w-[1440px] mx-auto px-container-x pt-16 md:pt-24 pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: featured image */}
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-warm-md">
                <img
                  src={FEATURED_PRODUCT.imageUrl}
                  alt={FEATURED_PRODUCT.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Subtle warm wash */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  aria-hidden="true"
                  style={{
                    background: 'linear-gradient(180deg, rgba(247,243,238,0.05) 0%, rgba(59,47,47,0.12) 100%)',
                  }}
                />
              </div>

              {/* Right: editorial title + product info */}
              <div className="flex flex-col justify-center py-8 lg:py-0">
                <p className="text-[11px] font-sans font-semibold tracking-[0.22em] uppercase text-ink-quiet mb-4">
                  Weekend Edit
                </p>
                <h2
                  className="font-display italic text-espresso"
                  style={{
                    fontSize: 'clamp(36px, 5vw, 64px)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                  }}
                >
                  Weekend,
                  <br />
                  re:defined.
                </h2>
                <p
                  className="mt-5 max-w-[440px] font-sans text-ink-soft"
                  style={{
                    fontSize: 'clamp(14px, 1.1vw, 16px)',
                    lineHeight: 1.65,
                  }}
                >
                  Pieces that move with you from morning markets to golden-hour
                  terraces. Linen, leather, ceramic — the weekend wardrobe,
                  considered.
                </p>

                {/* Featured product details */}
                <div className="mt-8 pt-6 border-t border-sand/50">
                  <p className="text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-ink-quiet mb-1">
                    {FEATURED_PRODUCT.brand}
                  </p>
                  <p className="font-display italic text-espresso text-xl">
                    {FEATURED_PRODUCT.name}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-ink-soft font-sans">
                    <span className="text-espresso font-medium">${FEATURED_PRODUCT.price}</span>
                    <span>★ {FEATURED_PRODUCT.rating.toFixed(1)}</span>
                    <span className="text-ink-quiet">({FEATURED_PRODUCT.reviewCount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToBag(FEATURED_PRODUCT)}
                    className="mt-5 rounded-full bg-espresso text-cream-50 px-8 py-3 text-sm font-sans font-medium transition-colors duration-fade hover:bg-dusk cursor-pointer"
                  >
                    Add to bag
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Curated grid: remaining 8 products */}
          <div className="max-w-[1440px] mx-auto px-container-x pb-16 md:pb-24">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <p className="text-[11px] font-sans font-semibold tracking-[0.22em] uppercase text-ink-quiet">
                  Curated for you
                </p>
              </div>
              <h2
                className="font-display italic text-espresso"
                style={{
                  fontSize: 'clamp(28px, 3.5vw, 44px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  fontWeight: 400,
                }}
              >
                Things worth discovering.
              </h2>
            </div>

            <div
              key={prefsVersion}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {GRID_PRODUCTS.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index % 3}
                  onAddToBag={handleAddToBag}
                />
              ))}
            </div>
          </div>
        </section>

        {/* "Because you asked..." editorial cards */}
        <BecauseYouAsked />
      </main>

      <Footer />
      <CommandPill />
    </div>
  )
}
