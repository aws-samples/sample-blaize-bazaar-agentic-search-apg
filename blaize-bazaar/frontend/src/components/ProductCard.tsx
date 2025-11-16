/**
 * Product Card Component - Shopping Cart Style
 * Displays product with Add to Cart functionality
 */
import { ShoppingCart, Star } from 'lucide-react'

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    image: string
    category?: string
    rating?: number
    reviews?: number
    similarity?: number
  }
  onAddToCart?: (product: any) => void
  highlighted?: boolean
  aiRecommended?: boolean
}

const ProductCard = ({ product, onAddToCart, aiRecommended = true }: ProductCardProps) => {
  const isImageUrl = product.image.startsWith('http')
  const productUrl = `https://amazon.com/dp/${product.id}`
  
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3 animate-slideUp transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group relative overflow-hidden"
      style={{
        background: 'rgba(30, 30, 40, 0.4)',
        border: '1px solid rgba(106, 27, 154, 0.2)',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(186, 104, 200, 0.2) 0%, rgba(106, 27, 154, 0.15) 100%)'
        e.currentTarget.style.borderColor = 'rgba(186, 104, 200, 0.6)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(186, 104, 200, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(30, 30, 40, 0.4)'
        e.currentTarget.style.borderColor = 'rgba(106, 27, 154, 0.2)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
           style={{
             background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
             animation: 'shimmer 2s infinite'
           }} />
      {/* AI Badge with Similarity Score */}
      {aiRecommended && (
        <div className="absolute top-1 right-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm z-10 group/badge hover:scale-110 transition-transform" title={product.similarity ? `${(product.similarity * 100).toFixed(1)}% semantic match` : 'AI recommended'}>
          <span className="text-[9px] text-purple-300 font-medium">
            ✨ {product.similarity ? `${(product.similarity * 100).toFixed(0)}%` : 'AI Pick'}
          </span>
        </div>
      )}
      
      {/* Product Image - Clickable */}
      <a
        href={productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
        style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {isImageUrl ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">{product.image}</span>
        )}
      </a>

      {/* Product Info - Clickable */}
      <a
        href={productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-medium text-xs mb-1 text-text-primary line-clamp-2">
          {product.name}
        </div>
        
        {/* Rating & Price Row */}
        <div className="flex items-center gap-2 mb-1">
          {product.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs text-text-secondary">
                {product.rating}
              </span>
            </div>
          )}
          <div className="text-accent-light font-bold text-sm">
            ${product.price}
          </div>
        </div>
        
        {/* Similarity Bar */}
        {product.similarity && product.similarity > 0 && (
          <div className="mb-1">
            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${product.similarity * 100}%`,
                  background: product.similarity > 0.9 ? 'linear-gradient(90deg, #10b981, #34d399)' : product.similarity > 0.7 ? 'linear-gradient(90deg, #ba68c8, #9c27b0)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Category */}
        {product.category && (
          <div className="text-xs text-text-secondary">
            {product.category}
          </div>
        )}
      </a>

      {/* Add to Cart Button */}
      <button
        onClick={() => onAddToCart?.(product)}
        className="px-3 py-2 rounded-lg font-semibold text-xs transition-all duration-300 hover:scale-110 hover:shadow-lg flex items-center gap-1 flex-shrink-0 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)',
          color: 'white'
        }}
      >
        <ShoppingCart className="h-3 w-3 group-hover:animate-bounce" />
        Add
      </button>
    </div>
  )
}

export default ProductCard