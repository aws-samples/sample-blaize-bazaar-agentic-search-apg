import { ShoppingCart, Star } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  rating?: number
  reviews?: number
  image?: string
  category?: string
  url?: string
}

interface ProductCardCompactProps {
  product: Product
  onAddToCart?: () => void
}

const ProductCardCompact = ({ product, onAddToCart }: ProductCardCompactProps) => {
  // Construct Amazon URL from product ID if url is missing
  const amazonUrl = product.url || `https://www.amazon.com/dp/${product.id}`
  
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group">
      {/* Product Image */}
      {product.image && (
        <a 
          href={amazonUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all"
        >
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-contain p-2"
          />
        </a>
      )}
      
      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <a 
            href={amazonUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <h4 className="text-white font-medium text-sm mb-1 line-clamp-2 group-hover:text-purple-300 transition-colors hover:underline">
              {product.name}
            </h4>
          </a>
          <div className="flex items-center gap-2 text-xs">
            {product.rating && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
            )}
            {product.reviews && (
              <span className="text-gray-400">({product.reviews.toLocaleString()})</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-purple-300 font-bold text-lg">${product.price.toFixed(2)}</span>
          {onAddToCart && (
            <button
              onClick={onAddToCart}
              className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ShoppingCart className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCardCompact
