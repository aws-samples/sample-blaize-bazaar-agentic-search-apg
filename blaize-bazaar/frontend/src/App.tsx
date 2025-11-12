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
  const backgroundImage = `${import.meta.env.BASE_URL}backgrounds/bg-1.png`

  // Apply dark theme to document
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div className="min-h-screen bg-bg-primary relative transition-colors duration-300">
        {/* Header */}
        <Header
          activeSection={activeSection}
          onNavigate={setActiveSection}
          onSearch={(query) => {
            setSearchQuery(query)
            setSearchOverlayVisible(true)
          }}
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
            <section 
              className="h-[calc(100vh-72px)] flex items-center relative"
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
                  <div className="flex gap-4">
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
                </div>

                {/* Right: Empty space (product showcase removed, kept as backup in code) */}
                <div className="h-[500px] flex items-center justify-center">
                  {/* Product showcase hidden - uncomment below to restore */}
                </div>
              </div>
            </section>
          )}

          {/* Collections Section */}
          {activeSection === 'collections' && (
            <section className="max-w-[1400px] mx-auto px-10 py-24">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-light mb-4 text-gray-900 dark:text-white">Curated Collections</h2>
                <p className="text-text-secondary text-lg">AI-powered collections tailored to your preferences</p>
              </div>
              <div className="grid grid-cols-3 gap-8">
                {[
                  { icon: '🔌', title: 'Cables & Chargers', count: '585 products • Essential accessories', query: 'cable charger', img: 'https://m.media-amazon.com/images/I/71yHIdTRluL._AC_UL320_.jpg' },
                  { icon: '⌚', title: 'Watches', count: '481 products • Premium timepieces', query: 'watch', img: 'https://m.media-amazon.com/images/I/615uKIrhCdL._AC_UL320_.jpg' },
                  { icon: '📷', title: 'Cameras', count: '437 products • Capture moments', query: 'camera', img: 'https://m.media-amazon.com/images/I/61+L7P7W0+S._AC_UL320_.jpg' },
                  { icon: '💻', title: 'Laptops', count: '306 products • Power & performance', query: 'laptop', img: 'https://m.media-amazon.com/images/I/61KUIjmfe7L._AC_UL320_.jpg' },
                  { icon: '🎧', title: 'Headphones', count: '175 products • Immersive audio', query: 'headphones earbuds', img: 'https://m.media-amazon.com/images/I/81ZTs2AvxiL._AC_UL320_.jpg' },
                  { icon: '🎮', title: 'Gaming', count: '170 products • Next-gen gaming', query: 'gaming', img: 'https://m.media-amazon.com/images/I/71vyo6WLiCL._AC_UL320_.jpg' },
                ].map((collection, index) => (
                  <div 
                    key={index} 
                    className="card cursor-pointer overflow-hidden"
                    onClick={() => {
                      setSearchQuery(collection.query)
                      setSearchOverlayVisible(true)
                    }}
                  >
                    <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden bg-white/5">
                      <img 
                        src={collection.img} 
                        alt={collection.title}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                    <div className="text-2xl font-normal mb-3 text-gray-900 dark:text-white">{collection.title}</div>
                    <div className="text-text-secondary text-sm">{collection.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Architecture Section */}
          {activeSection === 'tech' && (
            <section className="max-w-[1400px] mx-auto px-10 py-24">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-light mb-4 text-gray-900 dark:text-white">Architecture</h2>
              </div>
              
              {/* Architecture Diagrams - 3 Column Grid */}
              <div className="mb-16">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: 'Agent Memory Foundations', img: 'diagram1.png', alt: 'Agent Memory Foundations' },
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

              <div className="text-center">
                <p className="text-xs text-text-secondary">
                  © 2025 Shayon Sanyal | DAT406: Build agentic AI-powered search with Amazon Aurora | AWS re:Invent 2025
                </p>
              </div>
            </section>
          )}
        </main>

        {/* AI Assistant */}
        <AIAssistant />

        {/* Developer Tools FAB */}
        <button
          onClick={() => setShowDevTools(!showDevTools)}
          className="fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{
            background: showDevTools
              ? 'linear-gradient(135deg, #ba68c8 0%, #6a1b9a 100%)'
              : 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)'
          }}
        >
          {showDevTools ? <X className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-90" /> : <Wrench className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-12" />}
        </button>

        {/* Developer Tools Sidebar */}
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