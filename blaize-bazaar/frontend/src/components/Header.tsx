import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../App'
import ImageSearchModal from './ImageSearchModal'
import { Camera, ShoppingCart } from 'lucide-react'

interface HeaderProps {
  activeSection?: 'shop' | 'collections'
  onNavigate?: (section: 'shop' | 'collections') => void
  onSearch?: (query: string) => void
  cartItemCount?: number
  onCartClick?: () => void
}

const Header = ({ onSearch, cartItemCount = 0, onCartClick }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{text: string, category: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showImageSearch, setShowImageSearch] = useState(false)
  const { theme } = useTheme()
  const searchRef = useRef<HTMLDivElement>(null)

  const placeholders = [
    'laptop under $800 for gaming',
    'wireless headphones with noise cancellation',
    'camera for travel photography',
    '4K monitor under $500',
    'ergonomic keyboard for programming'
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
            ? 'rgba(10, 10, 15, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderColor: theme === 'dark' 
            ? 'rgba(106, 27, 154, 0.3)' 
            : 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <nav className="h-[72px] px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="h-full max-w-[1920px] mx-auto flex items-center justify-between gap-4">
            {/* Logo - Fixed width */}
            <div 
              className="logo gradient-text-chrome text-xl sm:text-2xl font-light tracking-tight cursor-pointer flex-shrink-0 whitespace-nowrap"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Blaize Bazaar
            </div>

            {/* Spacer for center alignment */}
            <div className="hidden lg:block flex-shrink-0" />

            {/* Right Side - Search, Cart & GitHub */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Search Section */}
              <div className="flex items-center gap-2">
                <div className="relative w-[280px] sm:w-[320px] md:w-[360px] lg:w-[380px] xl:w-[420px] group" ref={searchRef}>
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
                    <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden shadow-xl border border-accent-light/20 max-h-80 overflow-y-auto z-50">
                      {suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSuggestionSelect(suggestion.text)}
                          className="px-4 py-3 cursor-pointer hover:bg-accent-light/10 transition-colors border-b border-accent-light/10 last:border-b-0"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-purple-500/20 transition-all duration-300 group/camera z-10"
                    title="Search by image - AI-powered visual search"
                  >
                    <Camera className="h-4 w-4 text-purple-400 group-hover/camera:text-purple-300 transition-colors" />
                  </button>
                  
                  {/* Search capabilities hint - only on larger screens */}
                  <div className="hidden xl:block absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-purple-400 whitespace-nowrap">🔍 Semantic Search + 📸 Visual Search</span>
                  </div>
                  
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
                  className="hidden sm:block px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={{
                    background: searchQuery.trim() ? 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }}
                >
                  Search
                </button>
              </div>

              {/* Shopping Cart Icon */}
              {onCartClick && (
                <button
                  onClick={onCartClick}
                  className="relative p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 group flex-shrink-0"
                  aria-label="Shopping Cart"
                  title="View shopping cart"
                >
                  <ShoppingCart className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              )}

              {/* GitHub Link */}
              <a
                href="https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 group flex-shrink-0"
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