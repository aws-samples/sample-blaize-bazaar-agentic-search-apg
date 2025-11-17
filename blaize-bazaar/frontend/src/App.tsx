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
import { Database, BarChart3, Activity, Brain, GitCompare, Wrench, X } from 'lucide-react'
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

type Section = 'shop' | 'collections' | 'tech'

function App() {
  const [theme] = useState<Theme>('dark')
  const [activeSection, setActiveSection] = useState<Section>('shop')
  const [searchOverlayVisible, setSearchOverlayVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSQLInspector, setShowSQLInspector] = useState(false)
  const [showIndexPerformance, setShowIndexPerformance] = useState(false)
  const [showContextDashboard, setShowContextDashboard] = useState(false)
  const [showAgentTraces, setShowAgentTraces] = useState(false)
  const [showHybridComparison, setShowHybridComparison] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [expandedDiagram, setExpandedDiagram] = useState<string | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('blaize-cart')
    return saved ? JSON.parse(saved) : []
  })
  const [showCart, setShowCart] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const backgroundImage = `${import.meta.env.BASE_URL}backgrounds/bg-1.png`

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

  // Featured products for carousel
  const featuredProducts = [
    { img: 'https://m.media-amazon.com/images/I/61+L7P7W0+S._AC_UL320_.jpg', name: '4K Digital Camera' },
    { img: 'https://m.media-amazon.com/images/I/61KUIjmfe7L._AC_UL320_.jpg', name: 'HP Chromebook' },
    { img: 'https://m.media-amazon.com/images/I/71HmvDc4bZL._AC_UL320_.jpg', name: 'Wireless Earbuds' },
    { img: 'https://m.media-amazon.com/images/I/61tKyzaZfzL._AC_UL320_.jpg', name: 'Smart Doorbell' },
  ]

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

  // Featured products carousel
  useEffect(() => {
    if (activeSection === 'shop') {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % featuredProducts.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [activeSection, featuredProducts.length])

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
        {/* Floating Particles - Performance optimized with CSS only */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, rgba(186, 104, 200, ${Math.random() * 0.4 + 0.2}), transparent)`,
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${Math.random() * 10 + 15}s`
              }}
            />
          ))}
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

        {/* Main Content */}
        <main className="mt-[72px] relative z-10">
          {/* Shop Section (Hero) */}
          {activeSection === 'shop' && (
            <section className="animate-fadeIn h-[calc(100vh-72px)] flex items-center relative"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                imageRendering: '-webkit-optimize-contrast',
                filter: 'contrast(1.05) saturate(1.1) brightness(1.02)',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                paddingLeft: '180px',
                paddingRight: '64px'
              }}
            >
              <div className="w-full grid grid-cols-2 gap-12 items-center">
                {/* Left: Text */}
                <div>
                    <h1 className="text-hero mb-6 text-gray-900 dark:text-white" style={{ fontWeight: '200' }}>
                      Welcome to<br />
                      <span className="gradient-text-chrome" style={{ 
                        fontSize: 'inherit',
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontWeight: '600',
                        letterSpacing: '0.02em'
                      }}>
                        Blaize Bazaar
                      </span>
                    </h1>
                  <div className="text-subtitle text-white dark:text-white mb-8 font-light">
                    Shop Smart with AI-Powered Search
                  </div>
                  <p className="text-lg text-gray-700 dark:text-white mb-12 leading-relaxed" style={{ fontWeight: '300', letterSpacing: '0.01em' }}>
                    Experience intelligent product discovery powered by Aurora PostgreSQL with pgvector,
                    Amazon Bedrock, and AWS Strands SDK. Real-time semantic search meets premium shopping.
                  </p>
                  <div className="flex gap-4 mb-8">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        const bubble = document.querySelector('[alt="Chat"]')?.parentElement as HTMLElement
                        if (bubble) bubble.click()
                      }}
                    >
                      Chat with Aurora AI
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => setActiveSection('collections')}
                    >
                      Browse Collections
                    </button>
                  </div>

                  {/* Stats Badges */}
                  <div className="flex gap-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                    <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm">
                      <span className="text-purple-300 text-sm font-medium">{(productCount / 1000).toFixed(0)}K+ Products</span>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm">
                      <span className="text-purple-300 text-sm font-medium">✨ AI-Powered</span>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm">
                      <span className="text-purple-300 text-sm font-medium">🔍 Semantic Search</span>
                    </div>
                  </div>
                </div>

                {/* Right: Featured Products Carousel */}
                <div className="h-[500px] flex items-center justify-center">
                  <div className="relative w-[400px] h-[400px]">
                    {featuredProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="absolute inset-0 transition-all duration-1000 ease-in-out"
                        style={{
                          opacity: idx === featuredIndex ? 1 : 0,
                          transform: idx === featuredIndex ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-10deg)',
                          zIndex: idx === featuredIndex ? 10 : 0
                        }}
                      >
                        <div className="w-full h-full rounded-3xl bg-white/5 backdrop-blur-sm border border-purple-500/20 p-8 flex flex-col items-center justify-center">
                          <div className="w-full h-[300px] mb-4 flex items-center justify-center">
                            <img
                              src={product.img}
                              alt={product.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <p className="text-white text-lg font-medium">{product.name}</p>
                          <div className="flex gap-2 mt-4">
                            {featuredProducts.map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                  i === featuredIndex ? 'bg-purple-400 w-6' : 'bg-purple-400/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Collections Section */}
          {activeSection === 'collections' && (
            <section className="max-w-[1400px] mx-auto px-10 py-24 animate-fadeIn">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-light mb-4 text-gray-900 dark:text-white">Curated Collections</h2>
                <p className="text-text-secondary text-lg">AI-powered collections tailored to your preferences</p>
              </div>
              <div className="grid grid-cols-3 gap-8">
                {[
                  { icon: '🔌', title: 'Cables & Chargers', count: '585 products • Essential accessories', query: 'cable charger', img: 'https://m.media-amazon.com/images/I/71yHIdTRluL._AC_UL320_.jpg', badge: 'Most Popular' },
                  { icon: '🏠', title: 'Smart Home', count: '200 products • Security & automation', query: 'smart home security camera doorbell', img: 'https://m.media-amazon.com/images/I/61tKyzaZfzL._AC_UL320_.jpg', badge: 'Trending' },
                  { icon: '📷', title: 'Cameras', count: '437 products • Capture moments', query: 'camera', img: 'https://m.media-amazon.com/images/I/61+L7P7W0+S._AC_UL320_.jpg' },
                  { icon: '💻', title: 'Laptops', count: '306 products • Power & performance', query: 'laptop', img: 'https://m.media-amazon.com/images/I/61KUIjmfe7L._AC_UL320_.jpg' },
                  { icon: '🎧', title: 'Headphones', count: '175 products • Immersive audio', query: 'headphones earbuds', img: 'https://m.media-amazon.com/images/I/71HmvDc4bZL._AC_UL320_.jpg' },
                  { icon: '🎮', title: 'Gaming', count: '170 products • Next-gen gaming', query: 'gaming', img: 'https://m.media-amazon.com/images/I/71vyo6WLiCL._AC_UL320_.jpg' },
                  { icon: '🏥', title: 'Health & Household', count: '200 products • Wellness essentials', query: 'health household', img: 'https://m.media-amazon.com/images/I/71fwzimU8-L._AC_UL320_.jpg' },
                  { icon: '🎓', title: 'Learning & Education', count: '193 products • Educational toys', query: 'learning education toys', img: 'https://m.media-amazon.com/images/I/71PPebaJrYL._AC_UL320_.jpg' },
                  { icon: '⚽', title: 'Sports & Outdoors', count: '187 products • Active lifestyle', query: 'sports outdoors', img: 'https://m.media-amazon.com/images/I/81pWZ1kyDoL._AC_UL320_.jpg' },
                ].map((collection, index) => (
                  <div 
                    key={index} 
                    className="card cursor-pointer overflow-hidden group relative animate-fadeIn"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => {
                      setSearchQuery(collection.query)
                      setSearchOverlayVisible(true)
                    }}
                  >
                    {/* Gradient border glow on hover */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                    
                    {/* Badge for trending/popular */}
                    {collection.badge && (
                      <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg animate-pulse">
                        {collection.badge}
                      </div>
                    )}
                    
                    <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden bg-white/5">
                      <img 
                        src={collection.img} 
                        alt={collection.title}
                        className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="text-2xl font-normal mb-3 text-gray-900 dark:text-white transition-colors duration-300 group-hover:text-purple-300">{collection.title}</div>
                    <div className="text-text-secondary text-sm">{collection.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Architecture Section */}
          {activeSection === 'tech' && (
            <section className="max-w-[1400px] mx-auto px-10 py-24 animate-fadeIn">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-light mb-4 text-gray-900 dark:text-white">Architecture</h2>
              </div>
              
              {/* Architecture Diagrams - 3 Column Grid */}
              <div className="mb-16">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: 'Semantic Search Foundations', img: 'diagram1.png', alt: 'Semantic Search Foundations' },
                    { title: 'Context Management & Custom Agent Tools', img: 'diagram2.png', alt: 'Context Management & Custom Agent Tools' },
                    { title: 'Multi-Agent Orchestration', img: 'diagram3.png', alt: 'Multi-Agent Orchestration' },
                  ].map((diagram, index) => (
                    <div 
                      key={index}
                      className="card p-4 cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                      onClick={() => setExpandedDiagram(diagram.img)}
                    >
                      <h4 className="text-base font-normal text-gray-900 dark:text-white mb-3 text-center">{diagram.title}</h4>
                      <div className="relative w-full rounded-lg overflow-hidden bg-white/5 border border-purple-500/20">
                        <img 
                          src={`${import.meta.env.BASE_URL}architecture/${diagram.img}`}
                          alt={diagram.alt}
                          className="w-full h-auto"
                        />
                      </div>
                      <p className="text-xs text-purple-400 text-center mt-2">Click to expand</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* About & Contact Section */}
              <div className="grid grid-cols-2 gap-8">
                <div className="card p-6">
                  <h3 className="text-xl font-semibold text-purple-300 mb-4">About This Workshop</h3>
                  <h4 className="text-base font-medium text-white mb-3">DAT406: Build agentic AI-powered search with Amazon Aurora</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Learn how to build intelligent product search using Aurora PostgreSQL with pgvector, Amazon Bedrock, and AWS Strands SDK. This workshop demonstrates RAG, agentic AI capabilities, context management, and custom agent tools for personalized user experiences.
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-xl font-semibold text-purple-300 mb-4">Resources</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white mb-2">📧 Workshop Contact</p>
                      <a href="mailto:pgvector-usecase@amazon.com" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                        pgvector-usecase@amazon.com
                      </a>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white mb-2">👨‍💻 GitHub Repository</p>
                      <a href="https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                        View Source Code →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </section>
          )}

          {/* Footer with Stats */}
          <footer className="border-t border-purple-500/20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-[1400px] mx-auto px-10 py-12">
              <div className="grid grid-cols-4 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-light text-purple-300 mb-2">{(productCount / 1000).toFixed(0)}K+</div>
                  <div className="text-sm text-text-secondary">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-purple-300 mb-2">{categoryCount || '9+'}</div>
                  <div className="text-sm text-text-secondary">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-purple-300 mb-2">pgvector</div>
                  <div className="text-sm text-text-secondary">Vector Search</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-light text-purple-300 mb-2">Multi-Agent</div>
                  <div className="text-sm text-text-secondary">AI Architecture</div>
                </div>
              </div>
              <div className="text-center text-xs text-text-secondary pt-8 border-t border-purple-500/10">
                <p className="mb-2">© 2025 Shayon Sanyal | DAT406: Build agentic AI-powered search with Amazon Aurora</p>
                <p className="text-purple-400">Powered by Aurora PostgreSQL • Amazon Bedrock • pgvector • AWS Strands SDK</p>
              </div>
            </div>
          </footer>
        </main>

        {/* AI Assistant */}
        <AIAssistant />

        {/* Recently Viewed Products */}
        {activeSection === 'shop' && <RecentlyViewed />}

        {/* Admin Panel FAB */}
        <button
          onClick={() => setShowDevTools(!showDevTools)}
          className="fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{
            background: showDevTools
              ? 'linear-gradient(135deg, #ba68c8 0%, #6a1b9a 100%)'
              : 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)'
          }}
          title="Admin Panel"
        >
          {showDevTools ? <X className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-90" /> : <Wrench className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-12" />}
        </button>

        {/* Admin Panel Sidebar */}
        {showDevTools && (
          <div className="fixed left-0 top-[72px] w-80 h-[calc(100vh-72px)] z-40 bg-gradient-to-b from-gray-900/98 to-gray-800/98 backdrop-blur-xl border-r border-purple-500/30 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 h-full flex flex-col">
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
                <button onClick={() => { setShowAgentTraces(true); setShowDevTools(false); }} className="w-full p-4 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 hover:scale-[1.02] border border-purple-500/30 text-left transition-all duration-200">
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
              </div>
              <div className="mt-6 pt-4 border-t border-purple-500/30">
                <p className="text-xs text-purple-400 text-center">Workshop Tools • DAT406</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Agent Reasoning Traces Modal */}
        <AgentReasoningTraces
          isOpen={showAgentTraces}
          onClose={() => setShowAgentTraces(false)}
        />

        {/* Hybrid Search Comparison Modal */}
        <HybridSearchComparison
          isOpen={showHybridComparison}
          onClose={() => setShowHybridComparison(false)}
        />

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
        {expandedDiagram && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setExpandedDiagram(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh] p-4">
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
            </div>
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  )
}

export default App