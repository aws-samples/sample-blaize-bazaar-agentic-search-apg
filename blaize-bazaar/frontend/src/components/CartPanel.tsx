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
      <div className="fixed right-0 top-0 h-full w-[420px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
        {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              <h2 className="text-2xl font-light" style={{ color: '#ffffff' }}>Shopping Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && onClearCart && (
                <button
                  onClick={onClearCart}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                  title="Clear Cart"
                >
                  <Trash className="h-5 w-5 group-hover:text-red-400" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
              </button>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 mb-4" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
              <p className="text-lg mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Your cart is empty</p>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>Add items from chat or search</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="rounded-xl p-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex gap-4">
                  {/* Product Image */}
                  {item.image && (
                    <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-2 line-clamp-2" style={{ color: '#ffffff' }}>{item.name}</h3>
                    <p className="font-semibold text-lg mb-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>${item.price.toFixed(2)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg p-1" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                          className="p-1 rounded transition-colors hover:bg-white/10"
                        >
                          <Minus className="h-4 w-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                        </button>
                        <span className="font-medium w-8 text-center" style={{ color: '#ffffff' }}>{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 rounded transition-colors hover:bg-white/10"
                        >
                          <Plus className="h-4 w-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.productId)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                      >
                        <Trash2 className="h-4 w-4 group-hover:text-red-400" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
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
          <div className="p-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total</span>
              <span className="text-2xl font-semibold" style={{ color: '#ffffff' }}>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#ffffff', color: '#000000' }}
            >
              Proceed to Checkout
            </button>
            <p className="text-xs text-center mt-3" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              Demo checkout - No real transactions
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPanel
