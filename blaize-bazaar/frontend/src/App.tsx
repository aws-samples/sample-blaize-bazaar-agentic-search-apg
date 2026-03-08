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
import ContextDashboard from './components/ContextDashboard'
import AgentReasoningTraces from './components/AgentReasoningTraces'
import HybridSearchComparison from './components/HybridSearchComparison'
import CartPanel, { CartItem } from './components/CartPanel'
import Toast from './components/Toast'
import RecentlyViewed from './components/RecentlyViewed'
import ProactiveSuggestions from './components/ProactiveSuggestions'
import PersonalizationRadar from './components/PersonalizationRadar'
import AgentActivityDashboard from './components/AgentActivityDashboard'
import DemoChatCarousel from './components/DemoChatCarousel'
import { LayoutProvider, useLayout } from './contexts/LayoutContext'
import { useMagneticCursor } from './hooks/useMagneticCursor'
// useScrollReveal replaced by framer-motion whileInView on individual elements
import { motion, AnimatePresence } from 'framer-motion'
import { Database, BarChart3, Activity, Brain, GitCompare, Wrench, X, User, Radar } from 'lucide-react'
import './styles/premium-heading-styles.css'

// Theme Context (locked to dark mode)
type Theme = 'dark'
interface ThemeContextType {
  theme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

type Section = 'shop' | 'collections'

function AppContent() {
  const { mainContentMarginRight } = useLayout()
  const magneticCta = useMagneticCursor(0.15)
  const [theme] = useState<Theme>('dark')
  const [activeSection, setActiveSection] = useState<Section>('shop')
  const [searchOverlayVisible, setSearchOverlayVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSQLInspector, setShowSQLInspector] = useState(false)
  const [showIndexPerformance, setShowIndexPerformance] = useState(false)
  const [showContextDashboard, setShowContextDashboard] = useState(false)
  const [agentPanelMode, setAgentPanelMode] = useState<'hidden' | 'collapsed' | 'expanded'>('hidden')
  const [showHybridComparison, setShowHybridComparison] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [showPersonalizationRadar, setShowPersonalizationRadar] = useState(false)
  const [showAgentActivity, setShowAgentActivity] = useState(false)
  const [showProactiveSuggestions, setShowProactiveSuggestions] = useState(true)
  const [expandedDiagram, setExpandedDiagram] = useState<string | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('blaize-cart')
    return saved ? JSON.parse(saved) : []
  })
  const [showCart, setShowCart] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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
    alert(`🎉 Demo Checkout\n\nTotal: $${cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}\n\nThis is a demo - no real transaction will occur.`)
    setCartItems([])
    setShowCart(false)
  }

  // Apply dark theme to document
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  }, [])

  // Animated counter for product count
  useEffect(() => {
    if (activeSection === 'shop') {
      let start = 0
      const end = 21000
      const duration = 2000
      const increment = end / (duration / 16)
      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setProductCount(end)
          clearInterval(timer)
        } else {
          setProductCount(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(timer)
    }
  }, [activeSection])

  // Set category count to 190 (total in database)
  useEffect(() => {
    setCategoryCount(190)
  }, [])

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('blaize-cart', JSON.stringify(cartItems))
  }, [cartItems])

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
    <ThemeContext.Provider value={{ theme }}>
      <div className="min-h-screen bg-bg-primary relative transition-colors duration-300">
        {/* Premium Ambient Orbs — Apple-style animated gradient blobs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full orb-float-1"
            style={{ background: 'radial-gradient(circle, rgba(106, 27, 154, 0.25) 0%, transparent 70%)', filter: 'blur(100px)' }} />
          <div className="absolute top-[30%] right-[-15%] w-[700px] h-[700px] rounded-full orb-float-2"
            style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', filter: 'blur(120px)' }} />
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full orb-float-3"
            style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)', filter: 'blur(90px)' }} />
          <div className="absolute top-[60%] right-[30%] w-[500px] h-[500px] rounded-full orb-float-1"
            style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)', filter: 'blur(110px)', animationDelay: '-8s' }} />
        </div>
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
          {/* Hero Section — Clean Apple-style */}
          <section className="min-h-[100vh] flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse 120% 80% at 50% 30%, rgba(106, 27, 154, 0.12) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 80% 60%, rgba(59, 130, 246, 0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 20% 70%, rgba(236, 72, 153, 0.05) 0%, transparent 50%)',
            }}
          >

            <div className="relative z-10 text-center max-w-[900px] mx-auto px-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide uppercase"
                  style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    letterSpacing: '0.1em',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  DAT406 — Multi-Agent AI Commerce
                </div>
              </motion.div>

              <motion.h1
                className="text-[42px] md:text-[56px] xl:text-[72px] leading-[1.08] mb-6 text-white"
                style={{ fontWeight: '200', letterSpacing: '-2px' }}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
              >
                Shop smarter with<br />
                <span className="gradient-text-chrome" style={{
                  fontSize: 'inherit',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontWeight: '600',
                  letterSpacing: '0.01em'
                }}>
                  Blaize Bazaar
                </span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-white/60 mb-10 md:mb-12 max-w-[600px] mx-auto leading-relaxed"
                style={{ fontWeight: '300' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
              >
                Five AI agents collaborate in real-time to search, compare, and recommend — powered by Aurora PostgreSQL, pgvector, and Strands Agents SDK.
              </motion.p>

              <motion.div
                className="flex gap-4 justify-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
              >
                <button
                  ref={magneticCta.ref as React.RefObject<HTMLButtonElement>}
                  onMouseMove={magneticCta.onMouseMove}
                  onMouseLeave={magneticCta.onMouseLeave}
                  className="px-8 py-3.5 font-medium rounded-full transition-all duration-300 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c2bad 0%, #a855f7 100%)',
                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
                  }}
                  onClick={() => {
                    const bubble = document.querySelector('[alt="Chat"]')?.parentElement as HTMLElement
                    if (bubble) bubble.click()
                  }}
                >
                  Talk to the Agents
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    document.getElementById('collections-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
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
                <span className="text-white/30 text-xs tracking-widest uppercase">Scroll to explore</span>
                <motion.div
                  className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1 h-2 rounded-full bg-purple-400/60" />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Collections Section — each card reveals independently on scroll */}
          <section
            id="collections-section"
            className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24"
          >
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <h2 className="text-3xl lg:text-5xl font-light mb-4 text-gray-900 dark:text-white">Curated Collections</h2>
              <p className="text-text-secondary text-lg">AI-powered collections tailored to your preferences</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
              {[
                { icon: '🔌', title: 'Cables & Chargers', count: 'Power everything, beautifully', query: 'cable charger', img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80', badge: 'Most Popular' },
                { icon: '🏠', title: 'Smart Home', count: 'Your home, intelligently connected', query: 'smart home security camera doorbell', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80', badge: 'Trending' },
                { icon: '📷', title: 'Cameras', count: 'Capture every moment', query: 'camera', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80' },
                { icon: '💻', title: 'Laptops', count: 'Performance meets portability', query: 'laptop', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80' },
                { icon: '🎧', title: 'Headphones', count: 'Immersive sound, zero distractions', query: 'headphones earbuds', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' },
                { icon: '🎮', title: 'Gaming', count: 'Level up your setup', query: 'gaming', img: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&q=80' },
                { icon: '🏥', title: 'Health & Wellness', count: 'Feel your best, every day', query: 'health household', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80' },
                { icon: '🎓', title: 'Learning & Education', count: 'Curiosity starts here', query: 'learning education toys', img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80' },
                { icon: '⚽', title: 'Sports & Outdoors', count: 'Gear up for adventure', query: 'sports outdoors', img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80' },
              ].map((collection, index) => (
                <motion.div
                  key={index}
                  className="card cursor-pointer overflow-hidden group relative"
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{
                    delay: (index % 3) * 0.1,
                    type: 'spring',
                    stiffness: 200,
                    damping: 22,
                  }}
                  whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                  onClick={() => {
                    setSearchQuery(collection.query)
                    setSearchOverlayVisible(true)
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                  {collection.badge && (
                    <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg animate-pulse">
                      {collection.badge}
                    </div>
                  )}
                  <div className="relative w-full h-52 mb-4 rounded-xl overflow-hidden">
                    <img
                      src={collection.img}
                      alt={collection.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  <div className="text-2xl font-normal mb-2 text-gray-900 dark:text-white transition-colors duration-300 group-hover:text-purple-300">{collection.title}</div>
                  <div className="text-white/40 text-sm font-light">{collection.count}</div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Agent Demo — "Meet the agents" */}
          <DemoChatCarousel onOpenChat={() => {
            const bubble = document.querySelector('[alt="Chat"]')?.parentElement as HTMLElement
            if (bubble) bubble.click()
          }} />

          {/* Footer with Stats */}
          <footer className="border-t border-purple-500/20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
                {[
                  { value: `${(productCount / 1000).toFixed(0)}K+`, label: 'Products' },
                  { value: `${categoryCount || '9+'}`, label: 'Categories' },
                  { value: '5', label: 'AI Agents' },
                  { value: 'pgvector', label: 'Vector Search' },
                  { value: 'Strands', label: 'Agent SDK' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 250, damping: 22 }}
                  >
                    <div className="text-4xl font-light text-purple-300 mb-2">{stat.value}</div>
                    <div className="text-sm text-text-secondary">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center text-xs text-text-secondary pt-8 border-t border-purple-500/10">
                <p className="mb-2">© 2026 Shayon Sanyal | DAT406: Build Agentic AI-Powered Search with Amazon Aurora</p>
                <p className="text-purple-400">Aurora PostgreSQL • Amazon Bedrock • pgvector • AWS Strands Agents SDK • Multi-Agent Orchestration</p>
              </div>
            </div>
          </footer>
        </main>

        {/* AI Assistant */}
        <AIAssistant />

        {/* Recently Viewed Products */}
        <RecentlyViewed />

        {/* Dev Tools — Auto-folding left panel */}
        <div
          className="fixed left-0 top-[72px] z-40"
          style={{ height: 'calc(100vh - 72px)' }}
          onMouseEnter={() => setShowDevTools(true)}
          onMouseLeave={() => setShowDevTools(false)}
        >
          {/* Collapsed tab (always visible) */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 py-5 rounded-r-xl flex flex-col items-center gap-2 cursor-pointer transition-opacity duration-300"
            style={{
              background: 'rgba(13, 13, 26, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderLeft: 'none',
              backdropFilter: 'blur(12px)',
              opacity: showDevTools ? 0 : 1,
              pointerEvents: showDevTools ? 'none' : 'auto',
            }}
          >
            <Wrench className="h-4 w-4 text-purple-400" />
            <span className="text-[9px] text-purple-400/70 font-semibold tracking-widest uppercase" style={{ writingMode: 'vertical-lr' }}>DEV</span>
          </div>

          {/* Expanded panel */}
          <div
            className="h-full bg-gradient-to-b from-gray-900/98 to-gray-800/98 backdrop-blur-xl border-r border-purple-500/30 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden"
            style={{ width: showDevTools ? 320 : 0 }}
          >
            <div className="w-80 p-6 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Developer Tools</h2>
                <p className="text-sm text-purple-300">Workshop debugging & monitoring</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto">
                <button onClick={() => { setShowSQLInspector(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">SQL Query Inspector</p>
                      <p className="text-xs text-purple-300">Monitor pgvector queries</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setShowIndexPerformance(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Index Performance</p>
                      <p className="text-xs text-purple-300">Tune HNSW parameters</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setShowContextDashboard(!showContextDashboard); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Context Monitor</p>
                      <p className="text-xs text-purple-300">Token & prompt management</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setAgentPanelMode(agentPanelMode === 'expanded' ? 'hidden' : 'expanded'); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Agent Reasoning Traces</p>
                      <p className="text-xs text-purple-300">Multi-agent workflow</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setShowHybridComparison(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <GitCompare className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Hybrid Search Comparison</p>
                      <p className="text-xs text-purple-300">Vector vs Hybrid side-by-side</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setShowPersonalizationRadar(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <Radar className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Personalization Radar</p>
                      <p className="text-xs text-purple-300">User preference analysis</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => { setShowAgentActivity(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium mb-1">Agent Activity Dashboard</p>
                      <p className="text-xs text-purple-300">Session analytics & flow</p>
                    </div>
                  </div>
                </button>

                {/* Architecture Diagrams */}
                <div className="pt-3 mt-3 border-t border-purple-500/20">
                  <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-3">Architecture</p>
                  {[
                    { title: 'Semantic Search', img: 'part1_architecture.png' },
                    { title: 'Custom Agent Tools', img: 'part2_architecture.png' },
                    { title: 'Multi-Agent Orchestration', img: 'part3_architecture.png' },
                  ].map((diagram, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setExpandedDiagram(diagram.img); setShowDevTools(false); }}
                      className="w-full p-3 rounded-xl bg-purple-900/20 hover:bg-purple-800/40 hover:scale-[1.02] border border-purple-500/20 text-left transition-all duration-200 mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🏗️</span>
                        <p className="text-sm text-white font-medium">{diagram.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-500/30">
                <p className="text-xs text-purple-400 text-center">Workshop Tools • DAT406</p>
              </div>
            </div>
          </div>
        </div>

        {/* Context Dashboard - Floating Panel (Next to FABs) */}
        {showContextDashboard && (
          <div className="fixed bottom-8 left-24 z-40 w-[420px] max-h-[calc(100vh-100px)] overflow-y-auto">
            <div 
              className="rounded-2xl shadow-2xl backdrop-blur-xl border border-purple-500/30 p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)'
              }}
            >
              <ContextDashboard onClose={() => setShowContextDashboard(false)} />
            </div>
          </div>
        )}
        

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

        {/* Hybrid Search Comparison Modal */}
        <HybridSearchComparison
          isOpen={showHybridComparison}
          onClose={() => setShowHybridComparison(false)}
        />

        {/* Personalization Radar */}
        <PersonalizationRadar
          isOpen={showPersonalizationRadar}
          onClose={() => setShowPersonalizationRadar(false)}
        />

        {/* Agent Activity Dashboard */}
        <AgentActivityDashboard
          isOpen={showAgentActivity}
          onClose={() => setShowAgentActivity(false)}
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
                  className="absolute -top-12 right-0 p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
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