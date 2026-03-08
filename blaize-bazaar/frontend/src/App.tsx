/**
 * Main App Component - Enhanced with Light/Dark Mode
 * Hero section, Collections, About pages with theme toggle
 * WITH Floating Action Buttons for SQL Inspector + Index Performance
 */
import { useState, useEffect, createContext, useContext } from 'react'
import Header from './components/Header'
import AIAssistant from './components/AIAssistant'
import SearchOverlay from './components/SearchOverlay'
import SQLInspector from './components/SQLInspector'
import IndexPerformanceDashboard from './components/IndexPerformanceDashboard'
import AgentReasoningTraces from './components/AgentReasoningTraces'
import CartPanel, { CartItem } from './components/CartPanel'
import Toast from './components/Toast'
import RecentlyViewed from './components/RecentlyViewed'
import ProactiveSuggestions from './components/ProactiveSuggestions'
import DemoChatCarousel from './components/DemoChatCarousel'
import { LayoutProvider, useLayout } from './contexts/LayoutContext'
import { useMagneticCursor } from './hooks/useMagneticCursor'
// useScrollReveal replaced by framer-motion whileInView on individual elements
import { motion, AnimatePresence } from 'framer-motion'
import { Database, BarChart3, Brain, Wrench, X } from 'lucide-react'
import './styles/premium-heading-styles.css'

// Theme Context — dark/light toggle
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

type Section = 'shop' | 'collections'

function AppContent() {
  const { mainContentMarginRight, workshopMode, setWorkshopMode } = useLayout()
  const magneticCta = useMagneticCursor(0.15)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('blaize-theme')
    return (saved === 'light' ? 'light' : 'dark') as Theme
  })
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('blaize-theme', next)
      return next
    })
  }
  const [activeSection, setActiveSection] = useState<Section>('shop')
  const [searchOverlayVisible, setSearchOverlayVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSQLInspector, setShowSQLInspector] = useState(false)
  const [showIndexPerformance, setShowIndexPerformance] = useState(false)
  const [agentPanelMode, setAgentPanelMode] = useState<'hidden' | 'collapsed' | 'expanded'>('hidden')
  const [showDevTools, setShowDevTools] = useState(false)
  const [showProactiveSuggestions, setShowProactiveSuggestions] = useState(true)
  const [expandedDiagram, setExpandedDiagram] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('blaize-cart')
    return saved ? JSON.parse(saved) : []
  })
  const [showCart, setShowCart] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Hero background carousel
  const heroImages = [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1920&q=80',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80',
  ]
  const [heroIdx, setHeroIdx] = useState(0)

  // (scroll reveal now handled by framer-motion whileInView on each element)

  // Cart management functions
  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        setToastMessage(`Updated quantity for ${item.name.substring(0, 30)}...`)
        setShowToast(true)
        return prev.map(i => 
          i.productId === item.productId 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      setToastMessage(`Added ${item.name.substring(0, 30)}... to cart`)
      setShowToast(true)
      return [...prev, { ...item, quantity: 1 }]
    })
    setShowCart(true)
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.productId !== productId))
    } else {
      setCartItems(prev => 
        prev.map(item => 
          item.productId === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId))
  }

  const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      setCartItems([])
      setToastMessage('Cart cleared')
      setShowToast(true)
    }
  }

  const handleCheckout = () => {
    alert(`Demo Checkout\n\nTotal: $${cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}\n\nThis is a demo - no real transaction will occur.`)
    setCartItems([])
    setShowCart(false)
  }

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [theme])

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('blaize-cart', JSON.stringify(cartItems))
  }, [cartItems])

  // Hero image carousel — crossfade every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % heroImages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [heroImages.length])

  // Expose addToCart globally for chat integration
  useEffect(() => {
    (window as any).addToCart = addToCart
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // / or Ctrl+K to focus search
      if (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        if (searchInput) searchInput.focus()
      }
      // Ctrl+Shift+D to toggle Admin Panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShowDevTools(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen relative transition-colors duration-400" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <Header
          activeSection={activeSection}
          onNavigate={setActiveSection}
          onSearch={(query) => {
            setSearchQuery(query)
            setSearchOverlayVisible(true)
          }}
          cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onCartClick={() => setShowCart(true)}
        />

        {/* Search Overlay */}
        <SearchOverlay
          isVisible={searchOverlayVisible}
          onClose={() => setSearchOverlayVisible(false)}
          searchTerm={searchQuery}
        />

        {/* Main Content — Single scrollable page */}
        <main className="mt-[72px] relative z-10 transition-[margin-right] duration-300 ease-in-out" style={{ marginRight: mainContentMarginRight }}>
          {/* Hero Section — Always dark, Apple MacBook Pro style with video */}
          <section className="min-h-[100vh] flex flex-col items-center justify-center relative overflow-hidden bg-black">
            {/* Background image carousel — warm golden-hour, no faces */}
            {heroImages.map((img, i) => (
              <div
                key={i}
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
                style={{
                  backgroundImage: `url(${img})`,
                  opacity: i === heroIdx ? 0.35 : 0,
                }}
              />
            ))}
            {/* Gradient overlay for text readability + subtle blue AI glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/55" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(41, 151, 255, 0.06) 0%, transparent 60%)' }} />

            <div className="relative z-10 text-center max-w-[900px] mx-auto px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide uppercase"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    letterSpacing: '0.12em',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {workshopMode === 'legacy' ? 'DAT406 — E-Commerce (Legacy)'
                    : workshopMode === 'semantic' ? 'DAT406 — Semantic Search Enabled'
                    : workshopMode === 'tools' ? 'DAT406 — AI Agent Tools'
                    : 'DAT406 — Multi-Agent AI Commerce'}
                </div>
              </motion.div>

              <motion.h1
                className="text-[48px] md:text-[64px] xl:text-[80px] leading-[1.05] mb-4 text-white"
                style={{ fontWeight: 600, letterSpacing: '-0.02em' }}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
              >
                Blaize Bazaar
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl mb-10 md:mb-12 max-w-[650px] mx-auto leading-relaxed"
                style={{ fontWeight: 400, color: '#a1a1a6' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
              >
                {workshopMode === 'legacy'
                  ? 'Traditional keyword search — try searching for "something to keep my drinks cold" and see what happens.'
                  : workshopMode === 'semantic'
                  ? 'Semantic search powered by Aurora PostgreSQL and pgvector — search by intent, not just keywords.'
                  : workshopMode === 'tools'
                  ? 'AI agent with custom tools answers questions about products, trends, and pricing.'
                  : 'Five AI agents collaborate in real-time to search, compare, and recommend.'
                }
              </motion.p>

              <motion.div
                className="flex gap-8 justify-center items-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
              >
                <button
                  ref={magneticCta.ref as React.RefObject<HTMLButtonElement>}
                  onMouseMove={magneticCta.onMouseMove}
                  onMouseLeave={magneticCta.onMouseLeave}
                  className="px-7 py-3 rounded-full text-lg font-normal transition-all duration-300 hover:opacity-90"
                  onClick={() => {
                    if (workshopMode === 'legacy' || workshopMode === 'semantic') {
                      setSearchOverlayVisible(true)
                    } else {
                      const bubble = document.querySelector('[alt="Chat"]')?.parentElement as HTMLElement
                      if (bubble) bubble.click()
                    }
                  }}
                  style={{ background: '#0071e3', color: '#ffffff' }}
                >
                  {workshopMode === 'legacy' || workshopMode === 'semantic' ? 'Search Products' : 'Talk to the Agents'}
                </button>
                <button
                  className="px-7 py-3 rounded-full text-lg font-normal transition-all duration-300 hover:opacity-80"
                  onClick={() => {
                    document.getElementById('collections-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  style={{ background: 'transparent', border: '2px solid rgba(255, 255, 255, 0.3)', color: '#f5f5f7' }}
                >
                  Explore Collections
                </button>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
              >
                <span className="text-white/20 text-xs tracking-widest uppercase">Scroll to explore</span>
                <motion.div
                  className="w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1 h-2 rounded-full bg-white/30" />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Collections — Apple-style stacked full-width blocks */}
          <div id="collections-section">
            {/* Featured blocks — alternating dark/light */}
            {/* Interleaved full-width dark blocks and 2-up light grids */}
            {/* 1. Smartphones — full-width dark */}
            {[
              { title: 'Smartphones', subtitle: 'The future in your pocket.', query: 'smartphone iphone samsung', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1920&q=80', video: 'https://videos.pexels.com/video-files/3255275/3255275-uhd_2560_1440_25fps.mp4' },
            ].map((block, index) => (
              <motion.section
                key={`dark-${index}`}
                className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: '#000000' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8 }}
              >
                <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.15 }} poster={block.img}>
                  <source src={block.video} type="video/mp4" />
                </video>
                <div className="relative z-10 text-center px-8">
                  <motion.h2 className="text-[48px] md:text-[56px] lg:text-[64px] font-semibold mb-3" style={{ color: '#f5f5f7', letterSpacing: '-0.015em', lineHeight: 1.07 }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>{block.title}</motion.h2>
                  <motion.p className="text-xl md:text-2xl mb-8" style={{ color: '#a1a1a6', fontWeight: 400 }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}>{block.subtitle}</motion.p>
                  <motion.div className="flex gap-4 justify-center items-center" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.2 }}>
                    <button className="px-8 py-3 rounded-full text-base font-medium transition-all duration-300 hover:brightness-110 hover:scale-105" onClick={() => { setSearchQuery(block.query); setSearchOverlayVisible(true) }} style={{ background: '#0071e3', color: '#ffffff' }}>Shop now</button>
                  </motion.div>
                </div>
              </motion.section>
            ))}

            {/* 2. Watches — full-width dark */}
            {[
              { title: 'Watches', subtitle: 'Time, elevated.', query: 'watch rolex leather', img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1920&q=80', video: 'https://videos.pexels.com/video-files/4065924/4065924-uhd_2560_1440_24fps.mp4' },
            ].map((block, index) => (
              <motion.section
                key={`dark2-${index}`}
                className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: '#000000' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8 }}
              >
                <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.15 }} poster={block.img}>
                  <source src={block.video} type="video/mp4" />
                </video>
                <div className="relative z-10 text-center px-8">
                  <motion.h2 className="text-[48px] md:text-[56px] lg:text-[64px] font-semibold mb-3" style={{ color: '#f5f5f7', letterSpacing: '-0.015em', lineHeight: 1.07 }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>{block.title}</motion.h2>
                  <motion.p className="text-xl md:text-2xl mb-8" style={{ color: '#a1a1a6', fontWeight: 400 }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}>{block.subtitle}</motion.p>
                  <motion.div className="flex gap-4 justify-center items-center" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.2 }}>
                    <button className="px-8 py-3 rounded-full text-base font-medium transition-all duration-300 hover:brightness-110 hover:scale-105" onClick={() => { setSearchQuery(block.query); setSearchOverlayVisible(true) }} style={{ background: '#0071e3', color: '#ffffff' }}>Shop now</button>
                  </motion.div>
                </div>
              </motion.section>
            ))}

            {/* 3. Laptops + Cameras — 2-up light grid */}
            {[
              {
                bg: 'light' as const,
                items: [
                  { title: 'Laptops', subtitle: 'Power to do it all.', query: 'laptop macbook dell', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' },
                  { title: 'Furniture', subtitle: 'Live beautifully.', query: 'furniture sofa bed table', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80' },
                ]
              },
            ].map((row, rowIdx) => (
              <section key={`lc-${rowIdx}`} className="grid grid-cols-1 md:grid-cols-2" style={{ background: '#f5f5f7' }}>
                {row.items.map((item, itemIdx) => (
                  <motion.div key={itemIdx} className="min-h-[60vh] flex flex-col items-center justify-start pt-12 md:pt-14 relative overflow-hidden cursor-pointer group" style={{ borderRight: itemIdx === 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: itemIdx * 0.1, type: 'spring', stiffness: 200, damping: 25 }} onClick={() => { setSearchQuery(item.query); setSearchOverlayVisible(true) }}>
                    <div className="relative z-10 text-center px-8">
                      <h3 className="text-[28px] md:text-[36px] font-semibold mb-1" style={{ color: '#1d1d1f', letterSpacing: '-0.01em', lineHeight: 1.1 }}>{item.title}</h3>
                      <p className="text-base mb-4" style={{ color: '#6e6e73' }}>{item.subtitle}</p>
                      <div className="flex gap-3 justify-center">
                        <span className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:brightness-110 hover:scale-105 cursor-pointer" style={{ background: '#0066cc', color: '#ffffff' }}>Shop now</span>
                      </div>
                    </div>
                    <div className="relative z-10 mt-4 w-full flex justify-center flex-1">
                      <img src={item.img} alt={item.title} className="max-w-[90%] md:max-w-[85%] w-full h-auto max-h-[50vh] object-contain transition-transform duration-700 group-hover:scale-105" style={{ filter: 'drop-shadow(0 16px 32px rgba(0, 0, 0, 0.08))' }} />
                    </div>
                  </motion.div>
                ))}
              </section>
            ))}

            {/* 4. Fragrances — full-width dark */}
            {[
              { title: 'Fragrances', subtitle: 'Scent that speaks.', query: 'fragrance perfume calvin klein chanel', img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920&q=80', video: 'https://videos.pexels.com/video-files/3165335/3165335-uhd_2560_1440_30fps.mp4' },
            ].map((block, index) => (
              <motion.section
                key={`dark3-${index}`}
                className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden"
                style={{ background: '#000000' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8 }}
              >
                <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.15 }} poster={block.img}>
                  <source src={block.video} type="video/mp4" />
                </video>
                <div className="relative z-10 text-center px-8">
                  <motion.h2 className="text-[48px] md:text-[56px] lg:text-[64px] font-semibold mb-3" style={{ color: '#f5f5f7', letterSpacing: '-0.015em', lineHeight: 1.07 }} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>{block.title}</motion.h2>
                  <motion.p className="text-xl md:text-2xl mb-8" style={{ color: '#a1a1a6', fontWeight: 400 }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}>{block.subtitle}</motion.p>
                  <motion.div className="flex gap-4 justify-center items-center" initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.2 }}>
                    <button className="px-8 py-3 rounded-full text-base font-medium transition-all duration-300 hover:brightness-110 hover:scale-105" onClick={() => { setSearchQuery(block.query); setSearchOverlayVisible(true) }} style={{ background: '#0071e3', color: '#ffffff' }}>Shop now</button>
                  </motion.div>
                </div>
              </motion.section>
            ))}

            {/* 5-6. Remaining 2-up grids */}
            {[
              {
                bg: 'light' as const,
                items: [
                  { title: 'Sunglasses', subtitle: 'See the world differently.', query: 'sunglasses', img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80' },
                  { title: 'Sports', subtitle: 'Gear up for adventure.', query: 'sports football basketball tennis', img: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80' },
                ]
              },
              {
                bg: 'dark' as const,
                items: [
                  { title: 'Shoes', subtitle: 'Step into something new.', query: 'shoes nike jordan sneakers', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
                  { title: 'Kitchen', subtitle: 'Cook with confidence.', query: 'kitchen accessories pan knife', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80' },
                ]
              },
            ].map((row, rowIdx) => (
              <section
                key={`grid-${rowIdx}`}
                className="grid grid-cols-1 md:grid-cols-2"
                style={{ background: row.bg === 'dark' ? '#000000' : '#f5f5f7' }}
              >
                {row.items.map((item, itemIdx) => (
                  <motion.div
                    key={itemIdx}
                    className={`min-h-[60vh] flex flex-col items-center ${row.bg === 'light' ? 'justify-start pt-12 md:pt-14' : 'justify-center'} relative overflow-hidden cursor-pointer group`}
                    style={{ borderRight: itemIdx === 0 ? `1px solid ${row.bg === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none' }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: itemIdx * 0.1, type: 'spring', stiffness: 200, damping: 25 }}
                    onClick={() => {
                      setSearchQuery(item.query)
                      setSearchOverlayVisible(true)
                    }}
                  >
                    {/* Dark grids: image as background */}
                    {row.bg === 'dark' && (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${item.img})`, opacity: 0.12 }}
                      />
                    )}
                    <div className="relative z-10 text-center px-8">
                      <h3
                        className={`font-semibold mb-1 ${row.bg === 'light' ? 'text-[28px] md:text-[36px]' : 'text-[36px] md:text-[44px] mb-2'}`}
                        style={{ color: row.bg === 'dark' ? '#f5f5f7' : '#1d1d1f', letterSpacing: '-0.01em', lineHeight: 1.1 }}
                      >
                        {item.title}
                      </h3>
                      <p className={`${row.bg === 'light' ? 'text-base mb-4' : 'text-lg mb-6'}`} style={{ color: row.bg === 'dark' ? '#a1a1a6' : '#6e6e73' }}>
                        {item.subtitle}
                      </p>
                      <div className="flex gap-3 justify-center">
                        <span
                          className={`rounded-full text-sm font-medium transition-all duration-300 hover:brightness-110 hover:scale-105 cursor-pointer ${row.bg === 'light' ? 'px-5 py-2' : 'px-6 py-2.5'}`}
                          style={{ background: row.bg === 'dark' ? '#0071e3' : '#0066cc', color: '#ffffff' }}
                        >Shop now</span>
                      </div>
                    </div>
                    {/* Light grids: prominent product image below text */}
                    {row.bg === 'light' && (
                      <div className="relative z-10 mt-4 w-full flex justify-center flex-1">
                        <img
                          src={item.img}
                          alt={item.title}
                          className="max-w-[90%] md:max-w-[85%] w-full h-auto max-h-[50vh] object-contain transition-transform duration-700 group-hover:scale-105"
                          style={{ filter: 'drop-shadow(0 16px 32px rgba(0, 0, 0, 0.08))' }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </section>
            ))}
          </div>

          {/* Agent Demo — only visible when chat is unlocked (Lab 2+) */}
          {(workshopMode === 'tools' || workshopMode === 'full') && (
            <DemoChatCarousel onOpenChat={() => {
              const bubble = document.querySelector('[alt="Chat"]')?.parentElement as HTMLElement
              if (bubble) bubble.click()
            }} />
          )}

          {/* Footer */}
          <footer style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
              <div className="text-center text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                <p className="mb-1.5">© 2026 Shayon Sanyal | DAT406: Build Agentic AI-Powered Search with Amazon Aurora</p>
                <p>
                  {workshopMode === 'legacy' ? 'Aurora PostgreSQL • Keyword Search'
                    : workshopMode === 'semantic' ? 'Aurora PostgreSQL • Amazon Bedrock • pgvector'
                    : workshopMode === 'tools' ? 'Aurora PostgreSQL • Amazon Bedrock • pgvector • Strands Agents SDK'
                    : 'Aurora PostgreSQL • Amazon Bedrock • pgvector • Strands Agents SDK • Multi-Agent Orchestration'}
                </p>
              </div>
            </div>
          </footer>
        </main>

        {/* AI Assistant */}
        <AIAssistant />

        {/* Recently Viewed Products */}
        <RecentlyViewed />

        {/* Dev Tools — Warm panel */}
        <div
          className="fixed left-0 top-[72px] z-40"
          style={{ height: 'calc(100vh - 72px)' }}
          onMouseEnter={() => setShowDevTools(true)}
          onMouseLeave={() => setShowDevTools(false)}
        >
          {/* Collapsed tab */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 py-6 rounded-r-lg flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-300"
            style={{
              background: 'linear-gradient(180deg, #221a10, #18120a)',
              border: '1px solid rgba(140, 100, 55, 0.3)',
              borderLeft: 'none', boxShadow: '2px 0 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(200,160,100,0.08)',
              opacity: showDevTools ? 0 : 1,
              pointerEvents: showDevTools ? 'none' : 'auto',
            }}
          >
            <Wrench className="h-3.5 w-3.5" style={{ color: 'rgba(220, 180, 120, 0.8)' }} />
            <span className="text-[8px] font-semibold tracking-widest uppercase" style={{ writingMode: 'vertical-lr', color: 'rgba(210, 170, 115, 0.65)' }}>Tools</span>
          </div>

          {/* Expanded panel */}
          <div
            className="h-full transition-all duration-300 ease-in-out overflow-hidden wood-panel"
            style={{
              width: showDevTools ? 300 : 0,
              borderRight: '1px solid rgba(140, 100, 55, 0.25)',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5), inset -1px 0 0 rgba(200, 160, 100, 0.06)',
            }}
          >
            <div className="w-[300px] p-5 h-full flex flex-col wood-scroll overflow-y-auto" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
              {/* Header */}
              <div className="mb-5 pb-4" style={{ borderBottom: '1px solid rgba(160, 120, 70, 0.12)' }}>
                <h2 className="text-xl font-semibold mb-1 wood-text-primary" style={{ letterSpacing: '-0.01em' }}>Developer Tools</h2>
                <p className="text-[13px] wood-text-secondary">Workshop debugging & monitoring</p>
              </div>

              <div className="flex-1 space-y-1.5">
                {/* Workshop Mode Switcher */}
                <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(160, 120, 70, 0.1)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 wood-text-secondary">Workshop Progression</p>
                  {([
                    { key: 'legacy' as const, label: 'Legacy', desc: 'Keyword Only' },
                    { key: 'semantic' as const, label: 'Lab 1', desc: 'Semantic Search' },
                    { key: 'tools' as const, label: 'Lab 2', desc: 'Agent Tools' },
                    { key: 'full' as const, label: 'Lab 3', desc: 'Orchestration' },
                  ] as const).map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setWorkshopMode(mode.key)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 mb-0.5"
                      style={{
                        background: workshopMode === mode.key ? 'rgba(180, 140, 90, 0.12)' : 'transparent',
                        border: workshopMode === mode.key ? '1px solid rgba(180, 140, 90, 0.2)' : '1px solid transparent',
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-200"
                        style={{
                          background: workshopMode === mode.key ? '#c8a870' : 'transparent',
                          border: workshopMode === mode.key ? '2px solid #c8a870' : '2px solid rgba(160, 120, 70, 0.25)',
                        }}
                      />
                      <div>
                        <span className="text-[13px] font-medium" style={{ color: workshopMode === mode.key ? '#f0e4d0' : 'rgba(210, 185, 150, 0.7)' }}>
                          {mode.label}
                        </span>
                        <span className="text-[11px] ml-1.5" style={{ color: workshopMode === mode.key ? 'rgba(220, 185, 130, 0.85)' : 'rgba(190, 150, 100, 0.5)' }}>
                          {mode.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Tool buttons */}
                {[
                  { icon: <Database className="h-4 w-4" />, label: 'SQL Inspector', desc: 'Monitor pgvector queries', action: () => { setShowSQLInspector(true); setShowDevTools(false) } },
                  { icon: <BarChart3 className="h-4 w-4" />, label: 'Index Performance', desc: 'Tune HNSW parameters', action: () => { setShowIndexPerformance(true); setShowDevTools(false) } },
                  { icon: <Brain className="h-4 w-4" />, label: 'Agent Traces', desc: 'Multi-agent workflow', action: () => { setAgentPanelMode(agentPanelMode === 'expanded' ? 'hidden' : 'expanded'); setShowDevTools(false) } },
                ].map((tool, idx) => (
                  <button
                    key={idx}
                    onClick={tool.action}
                    className="w-full p-3 rounded-lg text-left transition-all duration-200 hover:translate-x-0.5 wood-card"
                  >
                    <div className="flex items-start gap-3">
                      <span className="wood-text-accent">{tool.icon}</span>
                      <div>
                        <p className="text-[14px] font-medium mb-0.5 wood-text-primary">{tool.label}</p>
                        <p className="text-[12px] wood-text-secondary">{tool.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Architecture */}
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(160, 120, 70, 0.1)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 wood-text-secondary">Architecture</p>
                  {[
                    { title: 'Semantic Search', img: 'part1_architecture.png' },
                    { title: 'Custom Agent Tools', img: 'part2_architecture.png' },
                    { title: 'Multi-Agent Orchestration', img: 'part3_architecture.png' },
                  ].map((diagram, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setExpandedDiagram(diagram.img); setShowDevTools(false) }}
                      className="w-full p-2.5 rounded-lg text-left transition-all duration-200 mb-1 hover:translate-x-0.5 wood-card"
                    >
                      <p className="text-[13px] font-medium wood-text-accent">{diagram.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 wood-footer rounded-b-lg px-2 py-3">
                <p className="text-[10px] text-center" style={{ color: 'rgba(190, 150, 100, 0.5)' }}>Workshop Tools · DAT406</p>
              </div>
            </div>
          </div>
        </div>

        {/* SQL Inspector Modal */}
        <SQLInspector
          isOpen={showSQLInspector}
          onClose={() => setShowSQLInspector(false)}
        />

        {/* Index Performance Dashboard Modal */}
        <IndexPerformanceDashboard
          isOpen={showIndexPerformance}
          onClose={() => setShowIndexPerformance(false)}
        />

        {/* Agent Reasoning Traces Side Panel */}
        <AgentReasoningTraces
          mode={agentPanelMode}
          onCollapse={() => setAgentPanelMode('collapsed')}
          onExpand={() => setAgentPanelMode('expanded')}
          onClose={() => setAgentPanelMode('hidden')}
        />

        {/* Proactive Suggestions */}
        {showProactiveSuggestions && (
          <ProactiveSuggestions
            onSuggestionClick={(query) => {
              setSearchQuery(query)
              setSearchOverlayVisible(true)
            }}
            onDismiss={() => setShowProactiveSuggestions(false)}
          />
        )}

        {/* Cart Panel */}
        <CartPanel
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onCheckout={handleCheckout}
          onClearCart={clearCart}
        />

        {/* Toast Notification */}
        <Toast
          message={toastMessage}
          show={showToast}
          onClose={() => setShowToast(false)}
        />

        {/* Expanded Diagram Modal */}
        <AnimatePresence>
          {expandedDiagram && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedDiagram(null)}
            >
              <motion.div
                className="relative max-w-[90vw] max-h-[90vh] p-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <button
                  onClick={() => setExpandedDiagram(null)}
                  className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
                <img
                  src={`${import.meta.env.BASE_URL}architecture/${expandedDiagram}`}
                  alt="Architecture Diagram"
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ThemeContext.Provider>
  )
}

function App() {
  return (
    <LayoutProvider>
      <AppContent />
    </LayoutProvider>
  )
}

export default App