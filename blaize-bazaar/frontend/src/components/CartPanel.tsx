import { X, ShoppingBag, Plus, Minus, ChevronRight, Package } from 'lucide-react'

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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Cart Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 flex flex-col
                   animate-in slide-in-from-right duration-300"
        style={{
          background: 'var(--bg-primary)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Bag
              </h2>
              {itemCount > 0 && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'var(--link-color)', color: '#ffffff' }}
                >
                  {itemCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {items.length > 0 && onClearCart && (
                <button
                  onClick={onClearCart}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200
                           hover:bg-red-500/10 active:scale-95"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'var(--input-bg)' }}
              >
                <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-7" style={{ height: '1px', background: 'var(--border-color)' }} />

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'var(--input-bg)' }}
              >
                <ShoppingBag className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Your bag is empty
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Items you add from chat or search will appear here
              </p>
            </div>
          ) : (
            <div className="px-7 py-5">
              {items.map((item, index) => (
                <div key={item.productId}>
                  <div className="flex gap-4 py-4 group">
                    {/* Product Image */}
                    <div
                      className="w-[72px] h-[72px] rounded-2xl flex-shrink-0 overflow-hidden
                               flex items-center justify-center"
                      style={{ background: 'var(--input-bg)' }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <Package className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3
                          className="font-medium text-[13px] leading-snug line-clamp-2 mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                              ${item.price.toFixed(2)} each
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity + Remove */}
                      <div className="flex items-center justify-between mt-2.5">
                        {/* Pill Stepper */}
                        <div
                          className="inline-flex items-center gap-0 rounded-full overflow-hidden"
                          style={{ border: '1px solid var(--border-color)' }}
                        >
                          <button
                            onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="px-2.5 py-1.5 transition-colors duration-150"
                            style={{ color: item.quantity <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
                          >
                            <Minus className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                          <span
                            className="text-xs font-semibold w-7 text-center tabular-nums"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                            className="px-2.5 py-1.5 transition-colors duration-150"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <Plus className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-[11px] font-medium px-2 py-1 rounded-md transition-all duration-200
                                   opacity-0 group-hover:opacity-100 hover:bg-red-500/10 active:scale-95"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Divider between items */}
                  {index < items.length - 1 && (
                    <div style={{ height: '1px', background: 'var(--border-color)' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-7 pb-7 pt-5"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {/* Subtotal Row */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Shipping</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Free</span>
            </div>

            {/* Total */}
            <div
              className="flex items-center justify-between mb-5 pt-4"
              style={{ borderTop: '1px solid var(--border-color)' }}
            >
              <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-full font-medium text-[15px] transition-all duration-300
                       hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'var(--link-color)', color: '#ffffff' }}
            >
              Check Out
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <p className="text-[11px] text-center mt-3 tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Demo only — no real transactions
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default CartPanel
