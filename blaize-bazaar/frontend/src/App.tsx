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
import HybridSearchComparison from './components/HybridSearchComparison'
import AgentActivityDashboard from './components/AgentActivityDashboard'
import ContextDashboard from './components/ContextDashboard'
import RAGDemo from './components/RAGDemo'
import PersonalizationDemo from './components/PersonalizationDemo'
import GuardrailsDemo from './components/GuardrailsDemo'
import LoginButton from './components/LoginButton'
import MemoryDashboard from './components/MemoryDashboard'
import GatewayToolsPanel from './components/GatewayToolsPanel'
import ObservabilityPanel from './components/ObservabilityPanel'
import RuntimeStatusPanel from './components/RuntimeStatusPanel'
import SpotlightWalkthrough from './components/SpotlightWalkthrough'
import { AuthProvider } from './contexts/AuthContext'
import type { TourAction } from './data/tourSteps'
import { Database, BarChart3, Brain, Wrench, X, Zap, Activity, DollarSign, Shield, BookOpen, User, AlertOctagon, Search } from 'lucide-react'
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
  const { mainContentMarginRight, workshopMode, setWorkshopMode, guardrailsEnabled, setGuardrailsEnabled, showOnboarding, setShowOnboarding } = useLayout()
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
  const [heroSearchQuery, setHeroSearchQuery] = useState('')
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
  const [showHybridComparison, setShowHybridComparison] = useState(false)
  const [showAgentDashboard, setShowAgentDashboard] = useState(false)
  const [showContextDashboard, setShowContextDashboard] = useState(false)
  const [showRAGDemo, setShowRAGDemo] = useState(false)
  const [showPersonalization, setShowPersonalization] = useState(false)
  const [showGuardrailsDemo, setShowGuardrailsDemo] = useState(false)
  const [chaosMode, setChaosMode] = useState(false)
  const [modeToast, setModeToast] = useState<string | null>(null)
  // Lab 4 — AgentCore panels
  const [showMemoryDashboard, setShowMemoryDashboard] = useState(false)
  const [showGatewayTools, setShowGatewayTools] = useState(false)
  const [showObservability, setShowObservability] = useState(false)
  const [showRuntimeStatus, setShowRuntimeStatus] = useState(false)

  // Hero background carousel
  const heroImages = [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1920&q=80',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80',
  ]
  const [heroIdx, setHeroIdx] = useState(0)

  // Hero search bar rotating placeholders (mode-specific)
  const legacyPlaceholders = [
    'running shoes',
    'wireless headphones',
    'laptop stand',
    'water bottle',
    'kitchen knife set'
  ]
  const semanticPlaceholders = [
    'something to keep my drinks cold',
    'comfortable shoes for long runs',
    'a gift for someone who loves cooking',
    'tech for working from home',
    'gear for outdoor adventures'
  ]
  const heroPlaceholders = workshopMode === 'legacy' ? legacyPlaceholders : semanticPlaceholders
  const [heroPlaceholderIndex, setHeroPlaceholderIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroPlaceholderIndex((prev) => (prev + 1) % heroPlaceholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // (scroll reveal now handled by framer-motion whileInView on each element)

  // Mode-aware dev tools — buttons filtered by current workshop mode
  const MODE_ORDER = ['legacy', 'semantic', 'tools', 'full', 'agentcore'] as const
  const modeIndex = MODE_ORDER.indexOf(workshopMode)
  const devToolButtons = [
    { icon: <Database className="h-5 w-5" />, label: 'SQL Inspector', desc: 'Monitor pgvector queries', action: () => { setShowSQLInspector(true); setShowDevTools(false) }, minMode: 'semantic' as const },
    { icon: <Zap className="h-5 w-5" />, label: 'Hybrid Search', desc: 'Vector vs hybrid comparison', action: () => { setShowHybridComparison(true); setShowDevTools(false) }, minMode: 'semantic' as const },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Index Performance', desc: 'Tune HNSW parameters', action: () => { setShowIndexPerformance(true); setShowDevTools(false) }, minMode: 'semantic' as const },
    { icon: <BookOpen className="h-5 w-5" />, label: 'RAG Demo', desc: 'Naive vs RAG comparison', action: () => { setShowRAGDemo(true); setShowDevTools(false) }, minMode: 'semantic' as const },
    { icon: <Brain className="h-5 w-5" />, label: 'Agent Traces', desc: 'Multi-agent workflow', action: () => { setAgentPanelMode(agentPanelMode === 'expanded' ? 'hidden' : 'expanded'); setShowDevTools(false) }, minMode: 'tools' as const },
    { icon: <Activity className="h-5 w-5" />, label: 'Agent Dashboard', desc: 'Session agent stats', action: () => { setShowAgentDashboard(true); setShowDevTools(false) }, minMode: 'tools' as const },
    { icon: <DollarSign className="h-5 w-5" />, label: 'Context & Cost', desc: 'Token usage & cost', action: () => { setShowContextDashboard(true); setShowDevTools(false) }, minMode: 'tools' as const },
    { icon: <User className="h-5 w-5" />, label: 'Personalization', desc: 'Preference-based re-ranking', action: () => { setShowPersonalization(true); setShowDevTools(false) }, minMode: 'tools' as const },
    { icon: <Shield className="h-5 w-5" />, label: 'Guardrails Demo', desc: 'Content safety & PII detection', action: () => { setShowGuardrailsDemo(true); setShowDevTools(false) }, minMode: 'full' as const },
    { icon: <AlertOctagon className="h-5 w-5" />, label: chaosMode ? 'Chaos: ON' : 'Chaos Mode', desc: chaosMode ? 'Click to disable' : 'Test resilience & retries', action: () => {
      const next = !chaosMode
      setChaosMode(next)
      fetch('/api/dev/chaos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) }).catch(() => {})
      setShowDevTools(false)
    }, minMode: 'full' as const },
    // Lab 4: AgentCore dev tools
    { icon: <Brain className="h-5 w-5" />, label: 'Memory Dashboard', desc: 'AgentCore persistent memory', action: () => { setShowMemoryDashboard(true); setShowDevTools(false) }, minMode: 'agentcore' as const },
    { icon: <Zap className="h-5 w-5" />, label: 'Gateway Tools', desc: 'MCP tool discovery', action: () => { setShowGatewayTools(true); setShowDevTools(false) }, minMode: 'agentcore' as const },
    { icon: <Activity className="h-5 w-5" />, label: 'Observability', desc: 'CloudWatch X-Ray traces', action: () => { setShowObservability(true); setShowDevTools(false) }, minMode: 'agentcore' as const },
    { icon: <Search className="h-5 w-5" />, label: 'Runtime Status', desc: 'AgentCore Lambda runtime', action: () => { setShowRuntimeStatus(true); setShowDevTools(false) }, minMode: 'agentcore' as const },
  ]
  const visibleButtons = devToolButtons.filter(b => MODE_ORDER.indexOf(b.minMode) <= modeIndex)

  // Mode switch handler with enhanced toast
  const MODE_LABELS: Record<string, string> = {
    legacy: 'Legacy — Keyword Only',
    semantic: 'Lab 1 — Semantic Search',
    tools: 'Lab 2 — Agent Tools',
    full: 'Lab 3 — Orchestration',
    agentcore: 'Lab 4 — AgentCore',
  }
  const MODE_FEATURES: Record<string, string[]> = {
    legacy: ['Keyword-only search', 'Full-text matching'],
    semantic: ['+ Vector search (pgvector)', '+ Hybrid search comparison', '+ SQL Inspector', '+ Index Performance'],
    tools: ['+ AI Chat Assistant', '+ Agent reasoning traces', '+ Custom tool integration', '+ Cost tracking'],
    full: ['+ Multi-agent orchestration', '+ Guardrails & safety', '+ Context management', '+ Full observability'],
    agentcore: ['+ Cognito authentication', '+ AgentCore Memory', '+ MCP Gateway', '+ CloudWatch traces', '+ Lambda Runtime'],
  }
  const handleModeSwitch = (mode: typeof workshopMode) => {
    setWorkshopMode(mode) // auto-starts tour via LayoutContext if not completed
    setModeToast(MODE_LABELS[mode] || mode)
    setTimeout(() => setModeToast(null), 4000)
  }

  // Tour action dispatcher — maps action keys to UI state changes
  const handleTourAction = (actionKey: TourAction['actionKey']) => {
    switch (actionKey) {
      case 'focus-search': {
        // In legacy/semantic, focus the hero search bar; in tools/full, focus the header search bar
        const selector = (workshopMode === 'legacy' || workshopMode === 'semantic')
          ? '[data-tour="hero-search"] input'
          : '[data-tour="search-bar"] input'
        const input = document.querySelector(selector) as HTMLInputElement
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => input.focus(), 400)
        }
        break
      }
      case 'open-sql-inspector':
        setShowSQLInspector(true)
        break
      case 'open-hybrid-search':
        setShowHybridComparison(true)
        break
      case 'open-agent-traces':
        setAgentPanelMode('expanded')
        break
      case 'open-context-dashboard':
        setShowContextDashboard(true)
        break
      case 'open-chat': {
        const bubble = document.querySelector('[data-tour="chat-bubble"]') as HTMLElement
        bubble?.click()
        break
      }
      case 'open-guardrails':
        setShowGuardrailsDemo(true)
        break
      case 'toggle-chaos': {
        const next = !chaosMode
        setChaosMode(next)
        fetch('/api/dev/chaos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) }).catch(() => {})
        break
      }
      case 'open-dev-tools':
        setShowDevTools(true)
        break
    }
  }

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
          loginSlot={<LoginButton />}
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

            {/* Hero content — split layout for agent modes, centered for legacy/semantic */}
            {(() => {
              const isAgentMode = workshopMode === 'tools' || workshopMode === 'full'

              const heroBadge = (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide uppercase"
                    data-tour="hero-badge"
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
              )

              const heroHeading = (
                <motion.h1
                  className={`${isAgentMode ? 'text-[40px] md:text-[48px] xl:text-[56px]' : 'text-[48px] md:text-[64px] xl:text-[80px]'} leading-[1.05] mb-4 text-white`}
                  style={{ fontWeight: 600, letterSpacing: '-0.02em' }}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
                >
                  Blaize Bazaar
                </motion.h1>
              )

              const heroSubtitle = (
                <motion.p
                  className={`text-xl md:text-2xl mb-10 md:mb-12 ${isAgentMode ? '' : 'max-w-[650px] mx-auto'} leading-relaxed`}
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
              )

              const heroButtons = (
                <motion.div
                  className={`flex gap-8 ${isAgentMode ? 'justify-start' : 'justify-center'} items-center mb-16`}
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
                        const bubble = document.querySelector('[data-tour="chat-bubble"]') as HTMLElement
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
              )

              const scrollIndicator = (
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
              )

              const heroSearchBar = (workshopMode === 'legacy' || workshopMode === 'semantic') ? (
                <motion.div
                  className="w-full max-w-[600px] mx-auto mb-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.45 }}
                  data-tour="hero-search"
                >
                  <div className="relative group">
                    <div className="absolute -inset-1 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
                      style={{ background: 'radial-gradient(ellipse, rgba(41, 151, 255, 0.12), transparent 70%)' }} />
                    <div className="relative flex items-center rounded-2xl overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      }}>
                      <Search className="h-5 w-5 ml-5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.35)' }} />
                      <input
                        type="text"
                        value={heroSearchQuery}
                        onChange={(e) => setHeroSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && heroSearchQuery.trim()) {
                            setSearchQuery(heroSearchQuery)
                            setSearchOverlayVisible(true)
                          }
                        }}
                        placeholder={`Try: "${heroPlaceholders[heroPlaceholderIndex]}"`}
                        className="flex-1 px-4 py-4 bg-transparent text-lg text-white placeholder-white/30 focus:outline-none"
                        style={{ letterSpacing: '-0.01em' }}
                      />
                      <button
                        onClick={() => {
                          if (heroSearchQuery.trim()) {
                            setSearchQuery(heroSearchQuery)
                            setSearchOverlayVisible(true)
                          }
                        }}
                        disabled={!heroSearchQuery.trim()}
                        className="px-6 py-2.5 mr-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:cursor-default"
                        style={{
                          background: heroSearchQuery.trim() ? '#0071e3' : 'rgba(255, 255, 255, 0.06)',
                          color: heroSearchQuery.trim() ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null

              if (isAgentMode) {
                return (
                  <div className="relative z-10 max-w-[1200px] mx-auto px-8">
                    {/* Section heading */}
                    <motion.div
                      className="text-center mb-12"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.05 }}
                    >
                      <h2 className="text-3xl lg:text-4xl font-extralight mb-3 tracking-tight text-white">
                        Meet the <span style={{ color: '#0071e3' }}>agents</span>
                      </h2>
                      <p className="text-lg font-light" style={{ color: '#a1a1a6' }}>Five specialized AI agents collaborate to find exactly what you need</p>
                    </motion.div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                      {/* Left: text content */}
                      <div className="text-center lg:text-left">
                        {heroBadge}
                        {heroHeading}
                        {heroSubtitle}
                        {heroButtons}
                      </div>
                      {/* Right: DemoChatCarousel */}
                      <motion.div
                        className="flex justify-center lg:justify-end"
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 150, damping: 25, delay: 0.3 }}
                      >
                        <DemoChatCarousel
                          compact
                          onOpenChat={() => {
                            const bubble = document.querySelector('[data-tour="chat-bubble"]') as HTMLElement
                            if (bubble) bubble.click()
                          }}
                        />
                      </motion.div>
                    </div>
                    <div className="mt-8">
                      {scrollIndicator}
                    </div>
                  </div>
                )
              }

              // Legacy / Semantic: centered single-column (original layout)
              return (
                <div className="relative z-10 text-center max-w-[900px] mx-auto px-8">
                  {heroBadge}
                  {heroHeading}
                  {heroSubtitle}
                  {heroSearchBar}
                  {heroButtons}
                  {scrollIndicator}
                </div>
              )
            })()}
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

          {/* Agent Demo now embedded in hero section for Labs 2/3 */}

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

        {/* Dev Tools — Clean dark panel */}
        <div
          className="fixed left-0 top-[72px] z-40"
          style={{ height: 'calc(100vh - 72px)' }}
          onMouseEnter={() => setShowDevTools(true)}
          onMouseLeave={() => setShowDevTools(false)}
        >
          {/* Collapsed tab */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-11 py-8 rounded-r-xl flex flex-col items-center gap-3 cursor-pointer transition-opacity duration-300"
            data-tour="dev-tools-tab"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: 'none', boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
              opacity: showDevTools ? 0 : 1,
              pointerEvents: showDevTools ? 'none' : 'auto',
            }}
          >
            <Wrench className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ writingMode: 'vertical-lr', color: 'rgba(255, 255, 255, 0.5)' }}>Tools</span>
          </div>

          {/* Expanded panel */}
          <div
            className="h-full transition-all duration-300 ease-in-out overflow-hidden"
            style={{
              width: showDevTools ? 300 : 0,
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="w-[300px] p-5 h-full flex flex-col overflow-y-auto search-scroll" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
              {/* Header */}
              <div className="mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h2 className="text-2xl font-semibold mb-1.5" style={{ letterSpacing: '-0.02em', color: '#ffffff' }}>Developer Tools</h2>
                <p className="text-[15px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Workshop debugging & monitoring</p>
              </div>

              <div className="flex-1 space-y-2">
                {/* Workshop Mode Switcher */}
                <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <p className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#ffffff' }}>Workshop Progression</p>
                  {([
                    { key: 'legacy' as const, label: 'Legacy', desc: 'Keyword Only' },
                    { key: 'semantic' as const, label: 'Lab 1', desc: 'Semantic Search' },
                    { key: 'tools' as const, label: 'Lab 2', desc: 'Agent Tools' },
                    { key: 'full' as const, label: 'Lab 3', desc: 'Orchestration' },
                  ] as const).map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => handleModeSwitch(mode.key)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all duration-200 mb-1"
                      style={{
                        background: workshopMode === mode.key ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        border: workshopMode === mode.key ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-200"
                        style={{
                          background: workshopMode === mode.key ? '#ffffff' : 'transparent',
                          border: workshopMode === mode.key ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                      <div>
                        <span className="text-[15px] font-medium" style={{ color: workshopMode === mode.key ? '#ffffff' : 'rgba(255, 255, 255, 0.75)' }}>
                          {mode.label}
                        </span>
                        <span className="text-[13px] ml-2" style={{ color: workshopMode === mode.key ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.45)' }}>
                          {mode.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Tool buttons — filtered by workshop mode */}
                {visibleButtons.map((tool, idx) => (
                  <button
                    key={idx}
                    onClick={tool.action}
                    className="w-full p-3.5 rounded-lg text-left transition-all duration-200 hover:translate-x-0.5"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{tool.icon}</span>
                      <div>
                        <p className="text-[16px] font-medium mb-0.5" style={{ color: '#ffffff' }}>{tool.label}</p>
                        <p className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{tool.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Guardrails toggle — Lab 3 only */}
                {workshopMode === 'full' && (
                  <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      onClick={() => setGuardrailsEnabled(!guardrailsEnabled)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-200"
                      style={{ background: guardrailsEnabled ? 'rgba(255, 255, 255, 0.06)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5" style={{ color: guardrailsEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.4)' }} />
                        <div className="text-left">
                          <p className="text-[15px] font-medium" style={{ color: '#ffffff' }}>Guardrails</p>
                          <p className="text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Content moderation</p>
                        </div>
                      </div>
                      <div
                        className="w-10 h-[22px] rounded-full relative transition-colors duration-200"
                        style={{ background: guardrailsEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.15)' }}
                      >
                        <div
                          className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: guardrailsEnabled ? 'translateX(21px)' : 'translateX(3px)' }}
                        />
                      </div>
                    </button>
                  </div>
                )}

                {/* Architecture */}
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <p className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#ffffff' }}>Architecture</p>
                  {[
                    { title: 'Semantic Search', img: 'part1_architecture.png' },
                    { title: 'Custom Agent Tools', img: 'part2_architecture.png' },
                    { title: 'Multi-Agent Orchestration', img: 'part3_architecture.png' },
                  ].map((diagram, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setExpandedDiagram(diagram.img); setShowDevTools(false) }}
                      className="w-full p-3 rounded-lg text-left transition-all duration-200 mb-1 hover:translate-x-0.5"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <p className="text-[15px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{diagram.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 rounded-b-lg px-2 py-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <p className="text-[12px] text-center" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Workshop Tools · DAT406</p>
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

        {/* Hybrid Search Comparison */}
        <HybridSearchComparison
          isOpen={showHybridComparison}
          onClose={() => setShowHybridComparison(false)}
        />

        {/* Agent Activity Dashboard */}
        <AgentActivityDashboard
          isOpen={showAgentDashboard}
          onClose={() => setShowAgentDashboard(false)}
        />

        {/* Context & Cost Dashboard */}
        <ContextDashboard
          isOpen={showContextDashboard}
          onClose={() => setShowContextDashboard(false)}
        />

        {/* RAG Demo */}
        <RAGDemo
          isOpen={showRAGDemo}
          onClose={() => setShowRAGDemo(false)}
        />

        {/* Personalization Demo */}
        <PersonalizationDemo
          isOpen={showPersonalization}
          onClose={() => setShowPersonalization(false)}
        />

        {/* Guardrails Demo */}
        <GuardrailsDemo
          isOpen={showGuardrailsDemo}
          onClose={() => setShowGuardrailsDemo(false)}
        />

        {/* Lab 4 — AgentCore Panels */}
        {showMemoryDashboard && <MemoryDashboard onClose={() => setShowMemoryDashboard(false)} />}
        {showGatewayTools && <GatewayToolsPanel onClose={() => setShowGatewayTools(false)} />}
        {showObservability && <ObservabilityPanel onClose={() => setShowObservability(false)} />}
        {showRuntimeStatus && <RuntimeStatusPanel onClose={() => setShowRuntimeStatus(false)} />}

        {/* Spotlight Walkthrough */}
        <SpotlightWalkthrough onAction={handleTourAction} />

        {/* Mode Switch Toast — enhanced with feature bullets */}
        <AnimatePresence>
          {modeToast && (
            <motion.div
              className="fixed bottom-8 left-1/2 z-[2000] px-5 py-3 rounded-2xl text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                transform: 'translateX(-50%)',
                minWidth: 260,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="font-semibold mb-1.5" style={{ color: '#ffffff' }}>{modeToast}</p>
              <div className="space-y-0.5">
                {(MODE_FEATURES[workshopMode] || []).map((f, i) => (
                  <p key={i} className="text-[11px]" style={{ color: f.startsWith('+') ? 'rgba(52, 211, 153, 0.8)' : 'rgba(255, 255, 255, 0.45)' }}>{f}</p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Onboarding Modal — first visit */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-[480px] rounded-[24px] p-8 text-center"
                style={{
                  background: 'rgba(0, 0, 0, 0.95)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="text-3xl mb-2">&#x1F680;</div>
                <h2 className="text-xl font-semibold mb-1" style={{ color: '#ffffff' }}>Welcome to DAT406</h2>
                <p className="text-sm mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Build Agentic AI-Powered Search with Aurora & pgvector</p>

                <div className="space-y-2 mb-8 text-left">
                  {[
                    { step: 'Legacy', desc: 'Start with keyword-only search', icon: '1' },
                    { step: 'Lab 1 — Semantic', desc: 'Add vector search + hybrid comparison', icon: '2' },
                    { step: 'Lab 2 — Tools', desc: 'Build AI agents with custom tools', icon: '3' },
                    { step: 'Lab 3 — Full', desc: 'Multi-agent orchestration + guardrails', icon: '4' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)' }}>{s.icon}</span>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: '#ffffff' }}>{s.step}</p>
                        <p className="text-[11px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setShowOnboarding(false)
                    localStorage.setItem('blaize-onboarding-done', '1')
                    setWorkshopMode('legacy')
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                >
                  Start Workshop
                </button>
                <p className="text-[10px] mt-3" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Use the progress pills in the header to switch modes anytime</p>
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
    <AuthProvider>
      <LayoutProvider>
        <AppContent />
      </LayoutProvider>
    </AuthProvider>
  )
}

export default App