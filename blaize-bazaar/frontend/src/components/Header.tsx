import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../App'
import { useLayout, type WorkshopMode } from '../contexts/LayoutContext'
import { useCart } from '../contexts/CartContext'
import ImageSearchModal from './ImageSearchModal'
import { Camera, Sun, Moon, Check, Compass, Wrench } from 'lucide-react'

interface HeaderProps {
  activeSection?: 'shop' | 'collections'
  onNavigate?: (section: 'shop' | 'collections') => void
  onSearch?: (query: string) => void
  onPlaygroundClick?: () => void
  loginSlot?: React.ReactNode
  completedModules?: Set<string>
  onModeSwitch?: () => void
}

const WORKSHOP_STEPS: { key: WorkshopMode; label: string }[] = [
  { key: 'legacy', label: 'Keyword Search' },
  { key: 'search', label: 'Smart Search' },
  { key: 'agentic', label: 'Agentic AI' },
  { key: 'production', label: 'Production' },
]
const MODE_ORDER: WorkshopMode[] = ['legacy', 'search', 'agentic', 'production']

const Header = ({ onSearch, onPlaygroundClick, loginSlot, completedModules, onModeSwitch }: HeaderProps) => {
  const { items: cartItems, setCartOpen } = useCart()
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{text: string, category: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showImageSearch, setShowImageSearch] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { workshopMode, setWorkshopMode, startTour, resetWorkshop } = useLayout()
  const searchRef = useRef<HTMLDivElement>(null)
  const currentModeIdx = MODE_ORDER.indexOf(workshopMode)

  const placeholders = [
    'Chanel perfume',
    'comfortable shoes for standing all day',
    'luxury watch for a gift',
    'best laptop for college',
    'something to make my skin glow'
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])


  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}&limit=5`)
      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(data.suggestions && data.suggestions.length > 0)
    } catch (error) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    fetchSuggestions(value)
  }

  const handleSuggestionSelect = (text: string) => {
    setSearchQuery(text)
    setShowSuggestions(false)
    if (onSearch) onSearch(text)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && onSearch) {
      onSearch(searchQuery)
      setShowSuggestions(false)
    }
  }

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: theme === 'dark' 
            ? 'rgba(0, 0, 0, 0.85)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderColor: theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <nav className="h-[72px] px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="h-full max-w-[1920px] mx-auto flex items-center justify-between gap-3">
            {/* Left: Logo + Playground */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div 
                className="text-xl sm:text-2xl cursor-pointer whitespace-nowrap select-none"
                style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onDoubleClick={() => {
                  resetWorkshop()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                title="Double-click to reset workshop"
              >
                Blaize Bazaar
              </div>

              {/* Playground Button */}
              <button
                onClick={onPlaygroundClick}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 hover:opacity-90"
                data-tour="dev-tools-tab"
                style={{
                  background: '#0071e3',
                  color: '#ffffff',
                }}
                title="Open Playground (⌘⇧D)"
              >
                <Wrench className="h-3.5 w-3.5" />
                Playground
              </button>
            </div>

            {/* Center: Workshop Progress Pills */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0" data-tour="workshop-pills">
              {WORKSHOP_STEPS.map((step, idx) => {
                const isCurrent = step.key === workshopMode
                const isCompleted = completedModules?.has(step.key) || idx < currentModeIdx
                return (
                  <button
                    key={step.key}
                    onClick={() => { setWorkshopMode(step.key); onModeSwitch?.() }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      background: isCurrent ? '#0071e3' : 'rgba(255, 255, 255, 0.08)',
                      color: isCurrent ? '#ffffff' : isCompleted ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)',
                    }}
                    title={`Switch to ${step.label}`}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="h-3 w-3" style={{ color: 'rgba(52, 211, 153, 0.9)' }} />
                    ) : null}
                    {step.label}
                  </button>
                )
              })}
              <button
                onClick={() => startTour(workshopMode)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ml-1 hover:opacity-90"
                style={{
                  background: '#0071e3',
                  color: '#ffffff',
                }}
                title="Start guided tour"
              >
                <Compass className="h-3 w-3" />
                Tour
              </button>
            </div>

            {/* Right Side - Search (Lab 2/3 only), Cart & GitHub */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search Section — only visible in tools/full (Lab 2 & 3) */}
              {(workshopMode === 'agentic' || workshopMode === 'production') && (
              <div className="flex items-center gap-2">
                <div className="relative w-[280px] sm:w-[320px] md:w-[360px] lg:w-[380px] xl:w-[420px] group" ref={searchRef} data-tour="search-bar">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={`Try: "${placeholders[placeholderIndex]}"`}
                    className="w-full px-3 py-2 pr-20 text-sm input-field rounded-lg overflow-hidden text-ellipsis whitespace-nowrap"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden shadow-xl max-h-80 overflow-y-auto z-50" style={{ border: '1px solid var(--border-color)' }}>
                      {suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSuggestionSelect(suggestion.text)}
                          className="px-4 py-3 cursor-pointer transition-colors last:border-b-0"
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div className="text-sm text-text-primary font-medium">{suggestion.text}</div>
                          <div className="text-xs text-text-secondary mt-1">{suggestion.category}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Camera Icon for Image Search */}
                  <button
                    onClick={() => setShowImageSearch(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-300 group/camera z-10"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    title="Search by image - AI-powered visual search"
                  >
                    <Camera className="h-4 w-4 text-text-secondary group-hover/camera:text-text-primary transition-colors" />
                  </button>

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary text-lg leading-none"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => searchQuery.trim() && onSearch?.(searchQuery)}
                  disabled={!searchQuery.trim()}
                  className="hidden sm:block px-3 md:px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={{
                    background: searchQuery.trim() ? 'var(--link-color)' : 'var(--input-bg)',
                    color: searchQuery.trim() ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  Search
                </button>
              </div>
              )}

              {/* Shopping Cart Icon */}
              <button
                  onClick={() => setCartOpen(true)}
                  className="relative p-2 rounded-lg transition-all duration-300 group flex-shrink-0"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  aria-label="Shopping Cart"
                  title="View shopping cart"
                >
                  <span className="text-lg leading-none">🛒</span>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse"
                      style={{ background: 'var(--link-color)', color: '#fff' }}>
                      {cartItemCount}
                    </span>
                  )}
                </button>

              {/* Login (Lab 4) */}
              {loginSlot}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-all duration-300 group flex-shrink-0"
                style={{ background: 'transparent' }}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                ) : (
                  <Moon className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                )}
              </button>

              {/* GitHub Link */}
              <a
                href="https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-all duration-300 group flex-shrink-0"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--input-bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                aria-label="View on GitHub"
                title="View source code on GitHub"
              >
                <svg 
                  className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* Image Search Modal */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onSearch={(data) => {
          setShowImageSearch(false);
          if (onSearch) {
            onSearch(data.query);
          }
        }}
      />
    </>
  )
}

export default Header