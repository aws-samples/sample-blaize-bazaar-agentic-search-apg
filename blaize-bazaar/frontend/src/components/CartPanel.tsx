import { X, ShoppingBag, Trash2, Plus, Minus, Trash } from 'lucide-react'
import { useTheme } from '../App'

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
  const { theme } = useTheme()
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
      <div className="fixed right-0 top-0 h-full w-[420px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        style={{ background: theme === 'dark' ? 'linear-gradient(to bottom, rgb(17, 24, 39), rgb(31, 41, 55))' : 'linear-gradient(to bottom, rgb(249, 250, 251), rgb(243, 244, 246))' }}>
        {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-text-secondary" />
              <h2 className="text-2xl font-light text-text-primary">Shopping Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && onClearCart && (
                <button
                  onClick={onClearCart}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                  title="Clear Cart"
                >
                  <Trash className="h-5 w-5 text-text-secondary group-hover:text-red-400" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ ['--tw-bg-opacity' as any]: 1 }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
          </div>
          <p className="text-sm text-text-secondary">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 text-text-secondary mb-4" style={{ opacity: 0.5 }} />
              <p className="text-text-secondary text-lg mb-2">Your cart is empty</p>
              <p className="text-text-secondary text-sm" style={{ opacity: 0.7 }}>Add items from chat or search</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="rounded-xl p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                <div className="flex gap-4">
                  {/* Product Image */}
                  {item.image && (
                    <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-medium text-sm mb-2 line-clamp-2">{item.name}</h3>
                    <p className="text-text-secondary font-semibold text-lg mb-3">${item.price.toFixed(2)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg p-1" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-1 rounded transition-colors"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Minus className="h-4 w-4 text-text-secondary" />
                        </button>
                        <span className="text-text-primary font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 rounded transition-colors"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Plus className="h-4 w-4 text-text-secondary" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.productId)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                      >
                        <Trash2 className="h-4 w-4 text-text-secondary group-hover:text-red-400" />
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
          <div className="p-6" style={{ borderTop: '1px solid var(--border-color)', background: theme === 'dark' ? 'rgba(17, 24, 39, 0.5)' : 'rgba(249, 250, 251, 0.5)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-secondary text-lg">Total</span>
              <span className="text-text-primary text-2xl font-semibold">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--link-color)', color: '#fff' }}
            >
              Proceed to Checkout
            </button>
            <p className="text-xs text-text-secondary text-center mt-3">
              Demo checkout - No real transactions
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPanel
