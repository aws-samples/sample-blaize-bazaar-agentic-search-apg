import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getRecentlyViewed, clearRecentlyViewed } from '../utils/recentlyViewed'

const RecentlyViewed = () => {
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const loadProducts = () => setProducts(getRecentlyViewed())
    loadProducts()
    const interval = setInterval(loadProducts, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleClear = () => {
    clearRecentlyViewed()
    setProducts([])
  }

  if (products.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 to-gray-900/90 backdrop-blur-xl border-t border-purple-500/30 p-4 z-30">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm">Recently Viewed</h3>
          <button onClick={handleClear} className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.map((product) => (
            <a
              key={product.id}
              href={`https://www.amazon.com/dp/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-32 p-2 rounded-lg bg-white/5 border border-purple-500/20 hover:border-purple-500/40 hover:bg-white/10 transition-all"
            >
              <div className="w-full h-20 mb-2 rounded bg-white/10 flex items-center justify-center">
                {product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl">{product.image || '📦'}</span>
                )}
              </div>
              <p className="text-white text-xs line-clamp-2 mb-1">{product.name}</p>
              <p className="text-purple-300 text-xs font-bold">${product.price.toFixed(2)}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RecentlyViewed
