import { X, ShoppingBag, Trash2, Plus, Minus, Trash } from 'lucide-react'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartPanelProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onCheckout: () => void
  onClearCart?: () => void
}

const CartPanel = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart }: CartPanelProps) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Cart Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-light text-white">Shopping Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && onClearCart && (
                <button
                  onClick={onClearCart}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                  title="Clear Cart"
                >
                  <Trash className="h-5 w-5 text-gray-400 group-hover:text-red-400" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
          <p className="text-sm text-purple-300">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">Your cart is empty</p>
              <p className="text-gray-500 text-sm">Add items from chat or search</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="bg-white/5 rounded-xl p-4 border border-purple-500/20">
                <div className="flex gap-4">
                  {/* Product Image */}
                  {item.image && (
                    <div className="w-20 h-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm mb-2 line-clamp-2">{item.name}</h3>
                    <p className="text-purple-300 font-semibold text-lg mb-3">${item.price.toFixed(2)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-300" />
                        </button>
                        <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-300" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.productId)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer - Total & Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-purple-500/30 bg-gray-900/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300 text-lg">Total</span>
              <span className="text-white text-2xl font-semibold">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 rounded-xl font-medium text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)'
              }}
            >
              Proceed to Checkout
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              ✨ Demo checkout - No real transactions
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPanel
