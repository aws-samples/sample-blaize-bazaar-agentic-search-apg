/**
 * Premium Search Overlay — Apple-inspired dark glassmorphism
 * Full-screen takeover with elegant product cards
 */
import { useEffect, useState, useRef } from 'react'
import { X, Sparkles, Zap, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../services/api'

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isVisible && searchTerm) {
      setLoading(true)
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
          min_similarity: 0.0
        })
        setIsSemanticSearch(true)
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

  useEffect(() => {
    const filtered = allResults.filter(r =>
      r.price >= minPrice &&
      r.price <= maxPrice &&
      r.stars >= minStars
    )
    setResults(filtered)
  }, [minPrice, maxPrice, minStars, allResults])

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isVisible) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isVisible, onClose])

  const displayResults = results
  const hasActiveFilters = minPrice > 0 || maxPrice < 10000 || minStars > 0

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
                  background: 'rgba(13, 13, 20, 0.92)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Header */}
                <div className="flex-shrink-0 px-6 md:px-8 py-5 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">Results for</div>
                        <h2 className="text-xl md:text-2xl font-light text-white truncate" style={{ letterSpacing: '-0.5px' }}>
                          {searchTerm}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Stats pills */}
                      <div className="hidden md:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                          style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Zap className="h-3 w-3 text-amber-400" />
                          <span className="text-white/80 font-medium">{latency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                          style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <span className="text-white/80 font-medium">{displayResults.length} results</span>
                        </div>
                        {isSemanticSearch && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                            style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <Database className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-300 font-medium">pgvector</span>
                          </div>
                        )}
                      </div>

                      {/* Close */}
                      <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors duration-200"
                      >
                        <X className="h-5 w-5 text-white/40 hover:text-white transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Filters — minimal pill row */}
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Filter</span>

                    {/* Price quick filters */}
                    {[
                      { label: 'All prices', min: 0, max: 10000 },
                      { label: 'Under $50', min: 0, max: 50 },
                      { label: '$50–200', min: 50, max: 200 },
                      { label: '$200+', min: 200, max: 10000 },
                    ].map((f) => {
                      const active = minPrice === f.min && maxPrice === f.max
                      return (
                        <button
                          key={f.label}
                          onClick={() => { setMinPrice(f.min); setMaxPrice(f.max) }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                          style={{
                            background: active ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${active ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                            color: active ? '#c084fc' : 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          {f.label}
                        </button>
                      )
                    })}

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    {/* Rating quick filters */}
                    {[
                      { label: 'Any rating', stars: 0 },
                      { label: '4+ stars', stars: 4 },
                      { label: '4.5+', stars: 4.5 },
                    ].map((f) => {
                      const active = minStars === f.stars
                      return (
                        <button
                          key={f.label}
                          onClick={() => setMinStars(f.stars)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                          style={{
                            background: active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${active ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                            color: active ? '#fcd34d' : 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          {f.stars > 0 && <span className="mr-1">★</span>}
                          {f.label}
                        </button>
                      )
                    })}

                    {hasActiveFilters && (
                      <button
                        onClick={() => { setMinPrice(0); setMaxPrice(10000); setMinStars(0) }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Results area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 search-scroll">
                  {/* Loading skeleton */}
                  {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl p-5 animate-pulse"
                          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-xl skeleton-shimmer" />
                            <div className="flex-1 space-y-3 py-1">
                              <div className="h-4 skeleton-shimmer rounded-lg w-3/4" />
                              <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
                              <div className="h-5 skeleton-shimmer rounded-lg w-1/4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loading && displayResults.length === 0 && allResults.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-white/60 text-lg font-light">No results match your filters</p>
                      <button
                        onClick={() => { setMinPrice(0); setMaxPrice(10000); setMinStars(0) }}
                        className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}

                  {!loading && displayResults.length === 0 && allResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="text-4xl mb-4">✨</div>
                      <p className="text-white/60 text-lg font-light">Searching across 21,000+ products...</p>
                    </div>
                  )}

                  {/* Product grid */}
                  {!loading && displayResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayResults.map((result, index) => (
                        <motion.a
                          key={result.id}
                          href={result.productUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative rounded-2xl overflow-hidden block"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                          whileHover={{
                            scale: 1.02,
                            borderColor: 'rgba(168, 85, 247, 0.3)',
                            transition: { type: 'spring', stiffness: 400, damping: 15 }
                          }}
                        >
                          {/* Hover glow */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/[0.06] group-hover:to-blue-500/[0.04] transition-all duration-500" />

                          <div className="relative p-5 flex gap-5">
                            {/* Product image — larger */}
                            <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center"
                              style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                              {result.icon ? (
                                <img
                                  src={result.icon}
                                  alt={result.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      const span = document.createElement('span')
                                      span.className = 'text-3xl'
                                      span.textContent = '📦'
                                      parent.appendChild(span)
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-3xl">📦</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium text-white/90 group-hover:text-white mb-2 line-clamp-2 leading-snug transition-colors duration-300">
                                {result.name}
                              </h3>

                              <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white/40"
                                  style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                                  {result.category}
                                </span>
                                {isSemanticSearch && result.similarity > 0 && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                                    style={{
                                      background: 'rgba(168, 85, 247, 0.12)',
                                      color: '#c084fc',
                                    }}>
                                    {Math.round(result.similarity * 100)}% match
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold text-white" style={{ letterSpacing: '-0.3px' }}>
                                  ${result.price.toFixed(2)}
                                </span>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-amber-400/80">★ {result.stars}</span>
                                  <span className="text-white/20">·</span>
                                  <span className="text-white/30">{result.reviews.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Similarity bar */}
                          {isSemanticSearch && result.similarity > 0 && (
                            <div className="h-[2px] w-full" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                              <motion.div
                                className="h-full"
                                style={{ background: 'linear-gradient(90deg, #7c2bad, #3b82f6)' }}
                                initial={{ width: '0%' }}
                                animate={{ width: `${Math.round(result.similarity * 100)}%` }}
                                transition={{ delay: index * 0.05 + 0.3, duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          )}
                        </motion.a>
                      ))}
                    </div>
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
