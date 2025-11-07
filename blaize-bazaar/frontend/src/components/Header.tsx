import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../App'
import ImageSearchModal from './ImageSearchModal'
import { Camera } from 'lucide-react'

interface HeaderProps {
  activeSection?: 'shop' | 'collections' | 'tech'
  onNavigate?: (section: 'shop' | 'collections' | 'tech') => void
  onSearch?: (query: string) => void
}

const Header = ({ activeSection = 'shop', onNavigate, onSearch }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{text: string, category: string}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCollectionsMenu, setShowCollectionsMenu] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showImageSearch, setShowImageSearch] = useState(false)
  const { theme } = useTheme()
  const searchRef = useRef<HTMLDivElement>(null)
  const collectionsRef = useRef<HTMLDivElement>(null)

  const placeholders = [
    'laptop under $800 for gaming',
    'wireless headphones with noise cancellation',
    'camera for travel photography',
    '4K monitor under $500',
    'ergonomic keyboard for programming'
  ]

  const categories = [
    { icon: '🔌', name: 'Cables & Chargers', query: 'cable charger' },
    { icon: '⌚', name: 'Watches', query: 'watch' },
    { icon: '📷', name: 'Cameras', query: 'camera' },
    { icon: '💻', name: 'Laptops', query: 'laptop' },
    { icon: '🎧', name: 'Headphones', query: 'headphones earbuds' },
    { icon: '🎮', name: 'Gaming', query: 'gaming' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collectionsRef.current && !collectionsRef.current.contains(e.target as Node)) {
        setShowCollectionsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = (section: 'shop' | 'collections' | 'tech') => {
    if (onNavigate) {
      onNavigate(section)
    }
  }

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
        <nav className="h-[72px] flex items-center justify-between relative z-10 px-4 md:px-8 lg:px-16" style={{ paddingLeft: 'max(64px, 10vw)', paddingRight: 'max(64px, 5vw)' }}>
          {/* Logo */}
          <div 
            className="logo gradient-text-chrome text-2xl font-light tracking-tight cursor-pointer"
            onClick={() => handleNavClick('shop')}
          >
            Blaize Bazaar
          </div>

          {/* Center Navigation */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-10">
            <a
              onClick={() => handleNavClick('shop')}
              className={`nav-link text-base font-normal transition-colors duration-300 cursor-pointer relative ${
                activeSection === 'shop' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Shop
              {activeSection === 'shop' && (
                <span className="absolute -bottom-[26px] left-0 right-0 h-[1px] bg-accent-light opacity-60" />
              )}
            </a>
            <div 
              ref={collectionsRef} 
              className="relative"
              onMouseEnter={() => setShowCollectionsMenu(true)}
              onMouseLeave={() => setShowCollectionsMenu(false)}
            >
              <a
                onClick={() => handleNavClick('collections')}
                className={`nav-link text-base font-normal transition-colors duration-300 cursor-pointer relative ${
                  activeSection === 'collections' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Collections
                {activeSection === 'collections' && (
                  <span className="absolute -bottom-[26px] left-0 right-0 h-[1px] bg-accent-light opacity-60" />
                )}
              </a>
              {showCollectionsMenu && (
                <div className="absolute top-full pt-6 left-0 w-64">
                  <div className="glass-strong rounded-2xl shadow-2xl border border-purple-500/20 overflow-hidden animate-slideUp">
                    {categories.map((cat, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setShowCollectionsMenu(false)
                          if (onSearch) onSearch(cat.query)
                        }}
                        className="px-4 py-3 hover:bg-purple-500/10 cursor-pointer border-b border-purple-500/10 last:border-0 transition-all duration-200 flex items-center gap-3"
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-sm text-text-primary">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <a
              onClick={() => handleNavClick('tech')}
              className={`nav-link text-base font-normal transition-colors duration-300 cursor-pointer relative ${
                activeSection === 'tech' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Architecture
              {activeSection === 'tech' && (
                <span className="absolute -bottom-[26px] left-0 right-0 h-[1px] bg-accent-light opacity-60" />
              )}
            </a>
          </div>

          {/* Right Side - Search & Theme Toggle */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-[450px] min-w-[280px] group" ref={searchRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={`Try: "${placeholders[placeholderIndex]}"`}
                  className="w-full px-3 py-2 pr-24 text-sm input-field rounded-lg overflow-hidden text-ellipsis"
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
                
                {/* Multi-Modal Search Tooltip - Shows on hover */}
                {!searchQuery && (
                  <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-purple-400 whitespace-nowrap">
                    ✨ AI-Powered: Text or Image Search
                  </div>
                )}
                
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => searchQuery.trim() && onSearch?.(searchQuery)}
                disabled={!searchQuery.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: searchQuery.trim() ? 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                Search
              </button>
            </div>

            {/* GitHub Link */}
            <a
              href="https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 group"
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
        </nav>

        {/* Animated Purple Data Flow Line - Full Width */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] pointer-events-none z-50">
          <div
            className="absolute h-full w-[20%] top-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(186, 104, 200, 0.8), transparent)',
              boxShadow: '0 0 12px rgba(186, 104, 200, 0.9), 0 0 24px rgba(186, 104, 200, 0.5)',
              animation: 'dataFlowPurple 3s linear infinite'
            }}
          />
        </div>
      </header>

      {/* Image Search Modal - NEW */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onSearch={(data) => {
          setShowImageSearch(false);
          // Trigger search with image results
          if (onSearch) {
            onSearch(data.query);
          }
        }}
      />
    </>
  )
}

export default Header