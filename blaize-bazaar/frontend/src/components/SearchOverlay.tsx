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

const ITEMS_PER_PAGE = 3

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isVisible && searchTerm) {
      setLoading(true)
      setCurrentPage(1)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setResults([])
        setAllResults([])
        performSearch()
      }, 300)
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [isVisible, searchTerm])

  const performSearch = async () => {
    const startTime = performance.now()

    try {
      const categoryTerms = ['security cameras', 'vacuum cleaners', 'gaming consoles', 'shaving grooming', 'kids watches', 'kids play tractors']
      const isCategorySearch = categoryTerms.some(term => searchTerm.toLowerCase().includes(term))

      let response
      if (isCategorySearch) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/api/products/category/${encodeURIComponent(searchTerm)}?limit=10`)
        response = await res.json()
        setIsSemanticSearch(false)
      } else {
        response = await apiClient.search({
          query: searchTerm,
          limit: 10,
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
            <div className="max-w-[1200px] w-full mx-auto flex flex-col h-full px-4 md:px-6 pt-6 pb-4">
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
                        <Sparkles className="h-4.5 w-4.5 text-text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-text-secondary text-xs font-medium uppercase tracking-widest mb-0.5">Results for</div>
                        <h2 className="text-xl md:text-2xl font-light text-text-primary truncate" style={{ letterSpacing: '-0.5px' }}>
                          {searchTerm}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Stats pills */}
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

                  {/* Filters + Sort row */}
                  <div className="flex items-center justify-between mt-4 gap-4">
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
                  </div>
                </div>

                {/* Results area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 search-scroll">
                  {/* Loading skeleton — single column, large cards */}
                  {loading && (
                    <div className="space-y-5 max-w-[800px] mx-auto">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl p-6 animate-pulse"
                          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                          <div className="flex gap-6">
                            <div className="w-32 h-32 rounded-xl skeleton-shimmer flex-shrink-0" />
                            <div className="flex-1 space-y-3 py-2">
                              <div className="h-5 skeleton-shimmer rounded-lg w-4/5" />
                              <div className="h-4 skeleton-shimmer rounded-lg w-1/2" />
                              <div className="h-3 skeleton-shimmer rounded-lg w-1/3 mt-4" />
                              <div className="h-6 skeleton-shimmer rounded-lg w-1/4 mt-2" />
                            </div>
                          </div>
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
                      <p className="text-text-secondary text-lg font-light">Searching across 21,000+ products...</p>
                    </div>
                  )}

                  {/* Product list — single column, large showcase cards */}
                  {!loading && paginatedResults.length > 0 && (
                    <>
                      <div className="space-y-5 max-w-[800px] mx-auto">
                        {paginatedResults.map((result, index) => (
                          <motion.a
                            key={result.id}
                            href={result.productUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-2xl overflow-hidden block"
                            style={{
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                            whileHover={{
                              scale: 1.01,
                              transition: { type: 'spring', stiffness: 400, damping: 20 }
                            }}
                          >
                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500"
                              style={{ background: theme === 'dark' ? 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent 60%)' : 'linear-gradient(135deg, rgba(0,0,0,0.02), transparent 60%)' }} />

                            <div className="relative p-6 flex gap-6">
                              {/* Product image — large */}
                              <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden flex items-center justify-center"
                                style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
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
                                        div.className = 'w-10 h-10 text-text-secondary opacity-30'
                                        div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
                                        parent.appendChild(div)
                                      }
                                    }}
                                  />
                                ) : (
                                  <Package className="h-10 w-10 text-text-secondary opacity-30" />
                                )}
                              </div>

                              {/* Info — spacious layout */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                  <h3 className="text-[17px] font-medium text-text-primary mb-2 line-clamp-2 leading-snug transition-colors duration-300">
                                    {result.name}
                                  </h3>

                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium text-text-secondary"
                                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                                      {result.category}
                                    </span>
                                    {isSemanticSearch && result.similarity > 0 && (
                                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium"
                                        style={{
                                          background: 'rgba(59, 130, 246, 0.08)',
                                          border: '1px solid rgba(59, 130, 246, 0.15)',
                                          color: 'rgba(147, 197, 253, 0.9)',
                                        }}>
                                        {Math.round(result.similarity * 100)}% match
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-xl font-semibold text-text-primary" style={{ letterSpacing: '-0.3px' }}>
                                    ${result.price.toFixed(2)}
                                  </span>
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-0.5">
                                      {renderStars(result.stars)}
                                    </div>
                                    <span className="text-text-secondary text-[12px] font-medium">{result.stars}</span>
                                    <span className="text-text-secondary opacity-40">·</span>
                                    <span className="text-text-secondary text-[12px]">{result.reviews.toLocaleString()} reviews</span>
                                  </div>
                                </div>
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
                                  transition={{ delay: index * 0.08 + 0.3, duration: 0.8, ease: 'easeOut' }}
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
