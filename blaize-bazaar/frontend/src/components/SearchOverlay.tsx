/**
 * Premium Search Overlay — Apple-inspired glassmorphism (theme-aware)
 * Full-screen takeover with elegant product cards, pagination, and refined filters
 */
import { useEffect, useState, useRef } from 'react'
import { X, Sparkles, Zap, Search, Package, ChevronLeft, ChevronRight, ArrowUpDown, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../services/api'
import { useLayout } from '../contexts/LayoutContext'
import { useTheme } from '../App'

interface SearchResult {
  id: string
  name: string
  category: string
  price: number
  icon: string
  similarity: number
  stars: number
  reviews: number
  productUrl?: string
}

interface SearchOverlayProps {
  isVisible: boolean
  onClose: () => void
  searchTerm: string
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'top_rated'

const ITEMS_PER_PAGE = 6

const renderStars = (rating: number, size = 'h-3.5 w-3.5') => {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.25
  const stars = []
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className={`${size} fill-amber-400 text-amber-400`} />)
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <span key={i} className={`relative inline-flex ${size}`}>
          <Star className={`${size} text-amber-400/30 absolute`} />
          <span className="overflow-hidden w-[50%] absolute">
            <Star className={`${size} fill-amber-400 text-amber-400`} />
          </span>
        </span>
      )
    } else {
      stars.push(<Star key={i} className={`${size} text-amber-400/30`} />)
    }
  }
  return stars
}

const SearchOverlay = ({
  isVisible,
  onClose,
  searchTerm
}: SearchOverlayProps) => {
  const [results, setResults] = useState<SearchResult[]>([])
  const [allResults, setAllResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [latency, setLatency] = useState('0ms')
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(10000)
  const [minStars, setMinStars] = useState<number>(0)
  const [isSemanticSearch, setIsSemanticSearch] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const { workshopMode } = useLayout()
  const { theme } = useTheme()
  const sortRef = useRef<HTMLDivElement>(null)

  // Dual-mode state (Lab 1 / semantic comparison)
  const [keywordResults, setKeywordResults] = useState<SearchResult[]>([])
  const [keywordLatency, setKeywordLatency] = useState('0ms')
  const [keywordLoading, setKeywordLoading] = useState(false)
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([])
  const [semanticLatency, setSemanticLatency] = useState('0ms')
  const [semanticLoading, setSemanticLoading] = useState(false)
  const isDualMode = false // Dual mode disabled — use Playground "Hybrid Search" for side-by-side comparison

  // Hybrid + Rerank state
  const [rerankResults, setRerankResults] = useState<any[]>([])
  const [rerankLoading, setRerankLoading] = useState(false)
  const [rerankPipeline, setRerankPipeline] = useState<any>(null)
  const [rerankTiming, setRerankTiming] = useState<any>(null)
  const [rerankRevealed, setRerankRevealed] = useState(false)
  const rerankSectionRef = useRef<HTMLDivElement>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isVisible && searchTerm) {
      setLoading(true)
      setCurrentPage(1)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (isDualMode) {
          setKeywordResults([])
          setSemanticResults([])
          setRerankResults([])
          setRerankPipeline(null)
          setRerankTiming(null)
          performDualSearch()
        } else {
          setResults([])
          setAllResults([])
          performSearch()
        }
      }, 300)
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [isVisible, searchTerm])

  const performSearch = async () => {
    const startTime = performance.now()

    try {
      // Exact DB category names (lowercase) + common variants for reliable category browsing
      const categoryTerms = [
        'smartphones', 'mens watches', 'womens watches', 'watches', 'laptops', 'furniture',
        'fragrances', 'sunglasses', 'sports accessories', 'mens shoes', 'womens shoes', 'shoes',
        'kitchen accessories', 'beauty', 'skin care', 'groceries', 'home decoration',
        'mobile accessories', 'motorcycle', 'tablets', 'tops', 'mens shirts', 'vehicle',
        'womens bags', 'womens dresses', 'womens jewellery',
        'security cameras', 'vacuum cleaners', 'gaming consoles', 'shaving grooming',
        'kids watches', 'kids play tractors',
      ]
      const isCategorySearch = categoryTerms.some(term => searchTerm.toLowerCase().includes(term))

      let response
      if (isCategorySearch) {
        const apiUrl = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${apiUrl}/api/products/category/${encodeURIComponent(searchTerm)}?limit=12`)
        response = await res.json()
        setIsSemanticSearch(false)
      } else {
        response = await apiClient.search({
          query: searchTerm,
          limit: 5,
          min_similarity: 0.0,
          search_mode: workshopMode === 'legacy' ? 'keyword' : 'vector'
        })
        setIsSemanticSearch(workshopMode !== 'legacy')
      }

      const endTime = performance.now()
      setLatency(`${Math.round(endTime - startTime)}ms`)

      if (!response || !response.results || !Array.isArray(response.results)) {
        setResults([])
        setAllResults([])
        setLoading(false)
        return
      }

      const transformedResults: SearchResult[] = response.results.map((r: any) => {
        const product = r.product || r
        return {
          id: product.productId || product.id || '',
          name: product.product_description || product.name || '',
          category: product.category_name || product.category || 'General',
          price: product.price || 0,
          icon: product.imgurl || product.image_url || '',
          similarity: product.similarity_score || r.similarity_score || 0,
          stars: product.stars || 0,
          reviews: product.reviews || 0,
          productUrl: product.producturl || product.productUrl || ''
        }
      })

      setAllResults(transformedResults)
      setResults(transformedResults)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const transformApiResults = (response: any): SearchResult[] => {
    if (!response || !response.results || !Array.isArray(response.results)) return []
    return response.results.map((r: any) => {
      const product = r.product || r
      return {
        id: product.productId || product.id || '',
        name: product.product_description || product.name || '',
        category: product.category_name || product.category || 'General',
        price: product.price || 0,
        icon: product.imgurl || product.image_url || '',
        similarity: product.similarity_score || r.similarity_score || 0,
        stars: product.stars || 0,
        reviews: product.reviews || 0,
        productUrl: product.producturl || product.productUrl || ''
      }
    })
  }

  const performDualSearch = async () => {
    setKeywordLoading(true)
    setSemanticLoading(true)
    setRerankLoading(true)
    setRerankResults([])
    setRerankPipeline(null)
    setRerankTiming(null)
    setRerankRevealed(false)

    // Category bypass for keyword side (same list as performSearch)
    const categoryTerms = [
      'smartphones', 'mens watches', 'womens watches', 'watches', 'laptops', 'furniture',
      'fragrances', 'sunglasses', 'sports accessories', 'mens shoes', 'womens shoes', 'shoes',
      'kitchen accessories', 'beauty', 'skin care', 'groceries', 'home decoration',
      'mobile accessories', 'motorcycle', 'tablets', 'tops', 'mens shirts', 'vehicle',
      'womens bags', 'womens dresses', 'womens jewellery',
      'security cameras', 'vacuum cleaners', 'gaming consoles', 'shaving grooming',
      'kids watches', 'kids play tractors',
    ]
    const isCategorySearch = categoryTerms.some(term => searchTerm.toLowerCase().includes(term))

    await Promise.allSettled([
      (async () => {
        const startTime = performance.now()
        try {
          let response
          if (isCategorySearch) {
            const apiUrl = import.meta.env.VITE_API_URL || ''
            const res = await fetch(`${apiUrl}/api/products/category/${encodeURIComponent(searchTerm)}?limit=12`)
            response = await res.json()
          } else {
            response = await apiClient.search({
              query: searchTerm,
              limit: 5,
              min_similarity: 0.0,
              search_mode: 'keyword'
            })
          }
          setKeywordLatency(`${Math.round(performance.now() - startTime)}ms`)
          setKeywordResults(transformApiResults(response))
        } catch {
          setKeywordResults([])
        } finally {
          setKeywordLoading(false)
        }
      })(),
      (async () => {
        const startTime = performance.now()
        try {
          const response = await apiClient.search({
            query: searchTerm,
            limit: 5,
            min_similarity: 0.0,
            search_mode: 'vector'
          })
          setSemanticLatency(`${Math.round(performance.now() - startTime)}ms`)
          setSemanticResults(transformApiResults(response))
        } catch {
          setSemanticResults([])
        } finally {
          setSemanticLoading(false)
        }
      })()
    ])

    setLoading(false)

    // Fire hybrid-rerank after keyword+semantic complete
    try {
      const res = await fetch('/api/search/hybrid-rerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm, limit: 5, min_similarity: 0.0 })
      })
      if (res.ok) {
        const data = await res.json()
        setRerankResults(data.results || [])
        setRerankPipeline(data.pipeline || null)
        setRerankTiming(data.timing || null)
      }
    } catch (err) {
      console.error('Hybrid rerank failed:', err)
    } finally {
      setRerankLoading(false)
    }
  }

  // Render comparison card inline (not as a component to avoid remount flicker)
  const renderComparisonCard = (result: SearchResult, index: number, showSimilarity: boolean) => (
    <motion.a
      key={result.id}
      href={result.productUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl transition-all group/card"
      style={{
        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
    >
      <span className="text-sm font-bold flex-shrink-0 w-6 text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
        #{index + 1}
      </span>
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
        {result.icon ? (
          <img src={result.icon} alt={result.name} className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <Package className="h-6 w-6 m-auto mt-4 text-text-secondary opacity-30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">{result.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-secondary">{result.category}</span>
          <span className="text-sm font-semibold text-text-primary">${result.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex items-center gap-0.5">{renderStars(result.stars, 'h-2.5 w-2.5')}</div>
          <span className="text-[10px] text-text-secondary">({result.reviews.toLocaleString()})</span>
          {showSimilarity && result.similarity > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgba(96, 165, 250, 0.9)' }}>
              {Math.round(result.similarity * 100)}% match
            </span>
          )}
        </div>
      </div>
    </motion.a>
  )

  // Filter + sort
  useEffect(() => {
    let filtered = allResults.filter(r =>
      r.price >= minPrice &&
      r.price <= maxPrice &&
      r.stars >= minStars
    )

    // Apply sort
    switch (sortBy) {
      case 'price_asc':
        filtered = [...filtered].sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        filtered = [...filtered].sort((a, b) => b.price - a.price)
        break
      case 'top_rated':
        filtered = [...filtered].sort((a, b) => b.stars - a.stars || b.reviews - a.reviews)
        break
      // 'relevance' keeps original API order
    }

    setResults(filtered)
    setCurrentPage(1)
  }, [minPrice, maxPrice, minStars, allResults, sortBy])

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isVisible) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isVisible, onClose])

  // Close sort menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    if (showSortMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSortMenu])

  const displayResults = results
  const totalPages = Math.ceil(displayResults.length / ITEMS_PER_PAGE)
  const paginatedResults = displayResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const hasActiveFilters = minPrice > 0 || maxPrice < 10000 || minStars > 0

  const sortLabels: Record<SortOption, string> = {
    relevance: 'Relevance',
    price_asc: 'Price: Low to High',
    price_desc: 'Price: High to Low',
    top_rated: 'Top Rated',
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop — deep blur */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Overlay Panel */}
          <motion.div
            className="fixed inset-x-0 top-[72px] bottom-0 z-50 flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className={`${isDualMode ? 'max-w-[1400px]' : 'max-w-[1200px]'} w-full mx-auto flex flex-col h-full px-4 md:px-6 pt-6 pb-4`}>
              {/* Glass container */}
              <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden"
                style={{
                  background: theme === 'dark' ? 'rgba(0, 0, 0, 0.97)' : 'rgba(255, 255, 255, 0.97)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: '1px solid var(--border-color)',
                  boxShadow: theme === 'dark'
                    ? '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
                    : '0 25px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                }}
              >
                {/* Header */}
                <div className="flex-shrink-0 px-6 md:px-8 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                        {isDualMode ? <Zap className="h-4.5 w-4.5 text-text-secondary" /> : <Sparkles className="h-4.5 w-4.5 text-text-secondary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-text-secondary text-xs font-medium uppercase tracking-widest mb-0.5">{isDualMode ? 'Comparing results for' : 'Results for'}</div>
                        <h2 className="text-xl md:text-2xl font-light text-text-primary truncate" style={{ letterSpacing: '-0.5px' }}>
                          {searchTerm}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Stats pills */}
                      {isDualMode ? (
                        <div className="hidden md:flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                            <span className="text-xs font-medium" style={{ color: '#f87171' }}>Keyword</span>
                          </div>
                          <span className="text-text-secondary text-xs">vs</span>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                            style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>Semantic</span>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden md:flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                            <Zap className="h-3 w-3 text-amber-400" />
                            <span className="text-text-primary font-medium">{latency}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                            <span className="text-text-primary font-medium">{displayResults.length} results</span>
                          </div>
                        </div>
                      )}

                      {/* Close */}
                      <button
                        onClick={onClose}
                        className="p-2 rounded-xl transition-colors duration-200"
                        style={{ ['--tw-bg-opacity' as any]: 1 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <X className="h-5 w-5 text-text-secondary" />
                      </button>
                    </div>
                  </div>

                  {/* Filters + Sort row (hidden in dual mode) */}
                  {!isDualMode && <div className="flex items-center justify-between mt-4 gap-4">
                    <div className="flex items-center gap-2.5 flex-wrap flex-1">
                      {/* Price label */}
                      <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Price</span>

                      {/* Price quick filters */}
                      {[
                        { label: 'All', min: 0, max: 10000 },
                        { label: 'Under $50', min: 0, max: 50 },
                        { label: '$50 – $200', min: 50, max: 200 },
                        { label: '$200+', min: 200, max: 10000 },
                      ].map((f) => {
                        const active = minPrice === f.min && maxPrice === f.max
                        return (
                          <button
                            key={f.label}
                            onClick={() => { setMinPrice(f.min); setMaxPrice(f.max) }}
                            className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                            style={{
                              background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                              border: `1px solid ${active ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-color)'}`,
                              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                              boxShadow: active ? '0 0 8px rgba(255, 255, 255, 0.04)' : 'none',
                            }}
                          >
                            {f.label}
                          </button>
                        )
                      })}

                      <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />

                      {/* Rating label */}
                      <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Rating</span>

                      {/* Rating quick filters */}
                      {[
                        { label: 'Any', stars: 0, showStars: false },
                        { label: '4+', stars: 4, showStars: true },
                        { label: '4.5+', stars: 4.5, showStars: true },
                      ].map((f) => {
                        const active = minStars === f.stars
                        return (
                          <button
                            key={f.label}
                            onClick={() => setMinStars(f.stars)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                            style={{
                              background: active ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                              border: `1px solid ${active ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-color)'}`,
                              color: active ? '#fcd34d' : 'var(--text-secondary)',
                              boxShadow: active ? '0 0 8px rgba(245, 158, 11, 0.08)' : 'none',
                            }}
                          >
                            {f.showStars && <Star className={`h-3 w-3 ${active ? 'fill-amber-400 text-amber-400' : 'text-current'}`} />}
                            {f.label}
                          </button>
                        )
                      })}

                      {hasActiveFilters && (
                        <button
                          onClick={() => { setMinPrice(0); setMaxPrice(10000); setMinStars(0) }}
                          className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 hover:text-text-primary"
                          style={{
                            color: 'var(--text-secondary)',
                            border: '1px solid transparent',
                          }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Sort dropdown */}
                    <div className="relative flex-shrink-0" ref={sortRef}>
                      <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                        style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
                      </button>

                      <AnimatePresence>
                        {showSortMenu && (
                          <motion.div
                            className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-10"
                            style={{
                              background: theme === 'dark' ? 'rgba(20, 20, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                              border: '1px solid var(--border-color)',
                              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                              minWidth: 180,
                            }}
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                          >
                            {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                              <button
                                key={key}
                                onClick={() => { setSortBy(key); setShowSortMenu(false) }}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-medium transition-colors duration-150"
                                style={{
                                  color: sortBy === key ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  background: sortBy === key ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                                }}
                                onMouseEnter={(e) => { if (sortBy !== key) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
                                onMouseLeave={(e) => { if (sortBy !== key) e.currentTarget.style.background = 'transparent' }}
                              >
                                {sortLabels[key]}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>}

                  {/* Pipeline indicator strip */}
                  {!isDualMode && !loading && displayResults.length > 0 && workshopMode !== 'legacy' && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                        Pipeline
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium"
                        style={{
                          background: isSemanticSearch ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          border: `1px solid ${isSemanticSearch ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                          color: isSemanticSearch
                            ? (theme === 'dark' ? '#60a5fa' : '#2563eb')
                            : (theme === 'dark' ? '#f87171' : '#dc2626'),
                        }}>
                        {isSemanticSearch ? (
                          <><Sparkles className="h-3 w-3" /> Semantic (Vector)</>
                        ) : (
                          <><Search className="h-3 w-3" /> Keyword (Full-text)</>
                        )}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>&rarr;</span>
                      <span className="px-2 py-1 rounded-md text-[11px]"
                        style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {isSemanticSearch ? 'Aurora + pgvector (HNSW)' : 'Aurora PostgreSQL (LIKE)'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>&rarr;</span>
                      <span className="px-2 py-1 rounded-md text-[11px] font-mono"
                        style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {latency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Results area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 search-scroll">
                  {isDualMode ? (
                    <>
                    {/* ===== DUAL-PANEL COMPARISON MODE (Lab 1 / Semantic) ===== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1300px] mx-auto">
                      {/* LEFT: Keyword Search Results */}
                      <div className="flex flex-col">
                        <div className="mb-4 p-4 rounded-xl"
                          style={{
                            background: theme === 'dark' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.04)',
                            border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)'}`,
                          }}>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>
                              Keyword Search
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: theme === 'dark' ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.7)' }}>
                                {keywordLatency}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: theme === 'dark' ? '#fca5a5' : '#ef4444' }}>
                                {keywordResults.length} results
                              </span>
                            </div>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Traditional full-text pattern matching
                          </p>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto search-scroll">
                          {keywordLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="p-3 rounded-xl animate-pulse flex gap-3"
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                                <div className="w-6 flex-shrink-0" />
                                <div className="w-14 h-14 rounded-lg skeleton-shimmer flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="h-3 skeleton-shimmer rounded w-4/5 mb-2" />
                                  <div className="h-2.5 skeleton-shimmer rounded w-1/2" />
                                </div>
                              </div>
                            ))
                          ) : keywordResults.length === 0 ? (
                            <div className="text-center py-12">
                              <Search className="h-8 w-8 mx-auto mb-3 opacity-20 text-text-secondary" />
                              <p className="text-text-secondary text-sm">No keyword matches found</p>
                              <p className="text-text-secondary text-xs mt-1 opacity-60">
                                Keyword search can't understand intent
                              </p>
                            </div>
                          ) : (
                            keywordResults.map((result, index) =>
                              renderComparisonCard(result, index, false)
                            )
                          )}
                        </div>
                      </div>

                      {/* RIGHT: Semantic Search Results */}
                      <div className="flex flex-col">
                        <div className="mb-4 p-4 rounded-xl"
                          style={{
                            background: theme === 'dark' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(59, 130, 246, 0.04)',
                            border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.12)'}`,
                          }}>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold" style={{ color: theme === 'dark' ? '#60a5fa' : '#2563eb' }}>
                              Semantic Search
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: theme === 'dark' ? 'rgba(96, 165, 250, 0.7)' : 'rgba(37, 99, 235, 0.7)' }}>
                                {semanticLatency}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(59, 130, 246, 0.1)', color: theme === 'dark' ? '#93c5fd' : '#3b82f6' }}>
                                {semanticResults.length} results
                              </span>
                            </div>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            pgvector HNSW — understands meaning and intent
                          </p>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto search-scroll">
                          {semanticLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="p-3 rounded-xl animate-pulse flex gap-3"
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                                <div className="w-6 flex-shrink-0" />
                                <div className="w-14 h-14 rounded-lg skeleton-shimmer flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="h-3 skeleton-shimmer rounded w-4/5 mb-2" />
                                  <div className="h-2.5 skeleton-shimmer rounded w-1/2" />
                                </div>
                              </div>
                            ))
                          ) : semanticResults.length === 0 ? (
                            <div className="text-center py-12">
                              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-20 text-text-secondary" />
                              <p className="text-text-secondary text-sm">Searching semantically...</p>
                            </div>
                          ) : (
                            semanticResults.map((result, index) =>
                              renderComparisonCard(result, index, true)
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* HYBRID + RERANKED — Spotlight Reveal */}
                    {(keywordResults.length > 0 || semanticResults.length > 0) && (
                      <div className="max-w-[1300px] mx-auto mt-8" ref={rerankSectionRef}>
                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-5">
                          <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)' }} />
                          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: theme === 'dark' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(5, 150, 105, 0.5)' }}>
                            Next Level
                          </span>
                          <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)' }} />
                        </div>

                        {/* Spotlight CTA — shown when rerank is ready but not yet revealed */}
                        <AnimatePresence mode="wait">
                          {!rerankRevealed && (
                            <motion.div
                              key="spotlight-cta"
                              className="relative overflow-hidden rounded-2xl cursor-pointer group"
                              style={{
                                background: theme === 'dark'
                                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)'
                                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.02) 100%)',
                                border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`,
                              }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                              transition={{ delay: 0.4, duration: 0.5 }}
                              onClick={() => {
                                setRerankRevealed(true)
                                setTimeout(() => rerankSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                              }}
                            >
                              {/* Animated glow border */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                  background: `radial-gradient(circle at 50% 50%, ${theme === 'dark' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(16, 185, 129, 0.06)'} 0%, transparent 70%)`,
                                }} />

                              <div className="relative p-5 flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                                  style={{
                                    background: theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                                  }}>
                                  {rerankLoading ? (
                                    <div className="w-5 h-5 border-2 rounded-full animate-spin"
                                      style={{ borderColor: 'rgba(52, 211, 153, 0.2)', borderTopColor: '#34d399' }} />
                                  ) : (
                                    <ArrowUpDown className="w-5 h-5" style={{ color: theme === 'dark' ? '#34d399' : '#059669' }} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: theme === 'dark' ? '#34d399' : '#059669' }}>
                                    {rerankLoading ? 'Running Hybrid + Rerank pipeline...' : 'Can we do better? Hybrid + Cohere Rerank'}
                                  </h3>
                                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {rerankLoading
                                      ? 'Merging keyword & semantic candidates, then re-ranking with Cohere...'
                                      : 'Combine both search approaches, then let Cohere AI re-rank by true relevance'
                                    }
                                  </p>
                                </div>
                                {!rerankLoading && rerankResults.length > 0 && (
                                  <div className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all group-hover:scale-105"
                                    style={{
                                      background: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                      color: theme === 'dark' ? '#34d399' : '#059669',
                                    }}>
                                    Reveal Results
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {/* Expanded rerank results */}
                          {rerankRevealed && (
                            <motion.div
                              key="rerank-results"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              {/* Header with pipeline + timing */}
                              <div className="p-4 rounded-xl mb-3" style={{
                                background: theme === 'dark' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)',
                                border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)'}`,
                              }}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <ArrowUpDown className="w-4 h-4" style={{ color: theme === 'dark' ? '#34d399' : '#059669' }} />
                                    <h3 className="text-base font-semibold" style={{ color: theme === 'dark' ? '#34d399' : '#059669' }}>
                                      Hybrid + Cohere Rerank
                                    </h3>
                                  </div>
                                  {rerankTiming && (
                                    <span className="text-sm font-mono" style={{ color: 'rgba(52, 211, 153, 0.7)' }}>
                                      {rerankTiming.total_time_ms?.toFixed(0)}ms total
                                    </span>
                                  )}
                                </div>

                                {/* Pipeline flow visualization */}
                                {rerankPipeline && (
                                  <div className="flex items-center gap-2 text-xs flex-wrap mt-2" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(239, 68, 68, 0.08)', color: theme === 'dark' ? '#f87171' : '#dc2626' }}>
                                      {rerankPipeline.fulltext_candidates} keyword
                                    </span>
                                    <span style={{ opacity: 0.4 }}>+</span>
                                    <span className="px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(59, 130, 246, 0.08)', color: theme === 'dark' ? '#60a5fa' : '#2563eb' }}>
                                      {rerankPipeline.vector_candidates} semantic
                                    </span>
                                    <span style={{ opacity: 0.3 }}>&rarr;</span>
                                    <span className="px-2 py-1 rounded-md" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                                      {rerankPipeline.unique_candidates} unique
                                    </span>
                                    <span style={{ opacity: 0.3 }}>&rarr;</span>
                                    <span className="px-2 py-1 rounded-md font-semibold" style={{ background: 'rgba(16, 185, 129, 0.1)', color: theme === 'dark' ? '#34d399' : '#059669' }}>
                                      Cohere Rerank &rarr; top {rerankPipeline.reranked_top_n}
                                    </span>
                                  </div>
                                )}

                                {/* Latency breakdown */}
                                {rerankTiming && (
                                  <div className="flex items-center gap-4 mt-2.5 text-[10px] font-mono" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                    <span>Embed {rerankTiming.embed_time_ms?.toFixed(0)}ms</span>
                                    <span>Search {rerankTiming.search_time_ms?.toFixed(0)}ms</span>
                                    <span>Rerank {rerankTiming.rerank_time_ms?.toFixed(0)}ms</span>
                                  </div>
                                )}
                              </div>

                              {/* Result cards */}
                              <div className="space-y-2">
                                {rerankResults.map((result: any, index: number) => (
                                  <motion.div
                                    key={result.product_id || index}
                                    className="p-3 rounded-xl flex gap-3 group/rr"
                                    style={{
                                      background: 'var(--input-bg)',
                                      border: `1px solid ${theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)'}`,
                                    }}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + index * 0.08 }}
                                  >
                                    <span className="text-sm font-bold w-6 text-center mt-1 flex-shrink-0"
                                      style={{ color: theme === 'dark' ? '#34d399' : '#059669' }}>
                                      #{index + 1}
                                    </span>
                                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                                      style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                                      {result.img_url ? (
                                        <img src={result.img_url} alt="" className="w-full h-full object-cover"
                                          onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
                                      ) : (
                                        <Package className="h-6 w-6 m-auto mt-4 text-text-secondary opacity-30" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                                        {result.product_description}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                          ${Number(result.price).toFixed(2)}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                          style={{ background: 'rgba(16, 185, 129, 0.1)', color: theme === 'dark' ? '#34d399' : '#059669' }}>
                                          {(result.relevance_score * 100).toFixed(1)}% relevance
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                          via {result.source}
                                        </span>
                                      </div>
                                      {/* Relevance score bar */}
                                      <div className="mt-1.5 h-1 rounded-full w-full" style={{ background: 'var(--border-color)' }}>
                                        <motion.div
                                          className="h-full rounded-full"
                                          style={{ background: 'linear-gradient(90deg, #34d399, #059669)' }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${result.relevance_score * 100}%` }}
                                          transition={{ delay: 0.3 + index * 0.08, duration: 0.6 }}
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    </>
                  ) : (
                  <>
                  {/* ===== SINGLE-PANEL MODE (Legacy, Tools, Full) ===== */}
                  {/* Loading skeleton — 3-column grid */}
                  {loading && (
                    <div className="grid grid-cols-3 gap-5 max-w-[1100px] mx-auto">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl p-5 animate-pulse flex flex-col"
                          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                          <div className="w-full aspect-square rounded-xl skeleton-shimmer mb-4" />
                          <div className="h-4 skeleton-shimmer rounded-lg w-4/5 mb-2" />
                          <div className="h-3 skeleton-shimmer rounded-lg w-1/2 mb-4" />
                          <div className="h-3 skeleton-shimmer rounded-lg w-1/3 mb-2" />
                          <div className="h-5 skeleton-shimmer rounded-lg w-1/3 mt-auto" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state — filters active but no match */}
                  {!loading && displayResults.length === 0 && allResults.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Search className="h-10 w-10 text-text-secondary opacity-40 mb-4" />
                      <p className="text-text-secondary text-lg font-light">No results match your filters</p>
                      <button
                        onClick={() => { setMinPrice(0); setMaxPrice(10000); setMinStars(0) }}
                        className="mt-4 text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}

                  {!loading && displayResults.length === 0 && allResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Sparkles className="h-10 w-10 text-text-secondary opacity-40 mb-4" />
                      <p className="text-text-secondary text-lg font-light">No results found. Try a different search term.</p>
                    </div>
                  )}

                  {/* Product grid — 3 vertical cards per row */}
                  {!loading && paginatedResults.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-5 max-w-[1100px] mx-auto">
                        {paginatedResults.map((result, index) => (
                          <motion.a
                            key={result.id}
                            href={result.productUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-2xl overflow-hidden flex flex-col"
                            style={{
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                            whileHover={{
                              scale: 1.02,
                              transition: { type: 'spring', stiffness: 400, damping: 20 }
                            }}
                          >
                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500"
                              style={{ background: theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 60%)' : 'linear-gradient(180deg, rgba(0,0,0,0.02), transparent 60%)' }} />

                            {/* Product image — tall */}
                            <div className="relative w-full aspect-square rounded-t-2xl overflow-hidden flex items-center justify-center"
                              style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                              {result.icon ? (
                                <img
                                  src={result.icon}
                                  alt={result.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent && !parent.querySelector('svg')) {
                                      const div = document.createElement('div')
                                      div.className = 'w-12 h-12 text-text-secondary opacity-30'
                                      div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
                                      parent.appendChild(div)
                                    }
                                  }}
                                />
                              ) : (
                                <Package className="h-12 w-12 text-text-secondary opacity-30" />
                              )}

                              {/* Similarity badge on image */}
                              {isSemanticSearch && result.similarity > 0 && (
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                                  style={{
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(8px)',
                                    color: 'rgba(147, 197, 253, 0.95)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                  }}>
                                  {Math.round(result.similarity * 100)}% match
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="relative flex-1 flex flex-col p-5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium text-text-secondary self-start mb-2"
                                style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                                {result.category}
                              </span>

                              <h3 className="text-[15px] font-medium text-text-primary mb-3 leading-snug transition-colors duration-300 line-clamp-2">
                                {result.name}
                              </h3>

                              <div className="mt-auto">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className="flex items-center gap-0.5">
                                    {renderStars(result.stars, 'h-3 w-3')}
                                  </div>
                                  <span className="text-text-secondary text-[11px] font-medium">{result.stars}</span>
                                  <span className="text-text-secondary opacity-40 text-[11px]">({result.reviews.toLocaleString()})</span>
                                </div>
                                <span className="text-xl font-semibold text-text-primary" style={{ letterSpacing: '-0.3px' }}>
                                  ${result.price.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Similarity bar */}
                            {isSemanticSearch && result.similarity > 0 && (
                              <div className="h-[2px] w-full" style={{ background: 'var(--border-color)' }}>
                                <motion.div
                                  className="h-full"
                                  style={{ background: `linear-gradient(90deg, var(--link-color), var(--border-color))` }}
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${Math.round(result.similarity * 100)}%` }}
                                  transition={{ delay: index * 0.06 + 0.3, duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                            )}
                          </motion.a>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8 mb-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: currentPage === 1 ? 'transparent' : 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                            onMouseEnter={(e) => { if (currentPage > 1) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            onMouseLeave={(e) => { if (currentPage > 1) e.currentTarget.style.background = 'var(--input-bg)' }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[36px] h-9 rounded-lg text-[13px] font-medium transition-all duration-200"
                              style={{
                                background: page === currentPage ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                border: `1px solid ${page === currentPage ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-color)'}`,
                                color: page === currentPage ? 'var(--text-primary)' : 'var(--text-secondary)',
                              }}
                              onMouseEnter={(e) => { if (page !== currentPage) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                              onMouseLeave={(e) => { if (page !== currentPage) e.currentTarget.style.background = 'transparent' }}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: currentPage === totalPages ? 'transparent' : 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                            onMouseEnter={(e) => { if (currentPage < totalPages) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                            onMouseLeave={(e) => { if (currentPage < totalPages) e.currentTarget.style.background = 'var(--input-bg)' }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          <span className="text-[11px] text-text-secondary ml-3">
                            Page {currentPage} of {totalPages}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SearchOverlay
