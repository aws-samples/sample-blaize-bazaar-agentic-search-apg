import { X, ShoppingBag, Plus, Minus, ChevronRight, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart, type CheckoutMetrics } from '../contexts/CartContext'
import { useLayout, type WorkshopMode } from '../contexts/LayoutContext'

// Re-export CartItem for backward compatibility with existing import paths
export type { CartItem } from '../contexts/CartContext'

interface CartPanelProps {
  isOpen: boolean
  onClose: () => void
}

const MODE_LABELS: Record<WorkshopMode, string> = {
  legacy: 'Keyword Search',
  search: 'Smart Search',
  agentic: 'Agentic AI',
  production: 'Production',
}

function getStepMessage(mode: WorkshopMode, steps: number): { text: string; color: string } {
  const n = steps === 0 ? 'no' : String(steps)
  switch (mode) {
    case 'legacy':
      return { text: `Cart built in ${n} steps`, color: 'var(--text-tertiary)' }
    case 'search':
      return { text: `Cart built in ${n} steps — smart search helped`, color: '#0071e3' }
    case 'agentic':
      return { text: `Cart built in ${n} steps — specialists collaborated`, color: '#7c3aed' }
    case 'production':
      return { text: `Cart built in ${n} steps — your preferences did the work`, color: '#10b981' }
  }
}

function computeSteps(m: CheckoutMetrics): number {
  return m.searchCount + m.productViews + m.additions.length
}

const CartPanel = ({ isOpen, onClose }: CartPanelProps) => {
  const { items, metrics, previousModeSteps, updateQuantity, removeFromCart, handleCheckout, clearCart } = useCart()
  const { workshopMode } = useLayout()

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const steps = computeSteps(metrics)
  const stepInfo = getStepMessage(workshopMode, steps)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Cart Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full sm:w-[440px] z-50 flex flex-col"
            style={{
              background: 'var(--bg-primary)',
              boxShadow: '-8px 0 48px rgba(0, 0, 0, 0.35)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* Header */}
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Bag
                  </h2>
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: '#0A84FF', color: '#ffffff' }}
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {items.length > 0 && (
                    <button
                      onClick={clearCart}
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
                    aria-label="Close cart"
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
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'var(--input-bg)' }}
                  >
                    <ShoppingBag className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
                  </motion.div>
                  <p className="text-lg font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Your bag is empty
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    Items you add from chat or search will appear here
                  </p>
                </div>
              ) : (
                <div className="px-7 py-5">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <motion.div
                        key={item.productId}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                      >
                        <div className="flex gap-4 py-4">
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
                                  onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                  className="px-2.5 py-1.5 transition-colors duration-150 hover:bg-white/5 active:bg-white/10"
                                  style={{ color: item.quantity <= 1 ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" strokeWidth={2.5} />
                                </button>
                                <motion.span
                                  key={item.quantity}
                                  initial={{ scale: 0.7, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-xs font-semibold w-7 text-center tabular-nums"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {item.quantity}
                                </motion.span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="px-2.5 py-1.5 transition-colors duration-150 hover:bg-white/5 active:bg-white/10"
                                  style={{ color: 'var(--text-primary)' }}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                                </button>
                              </div>

                              {/* Remove — always visible but subtle */}
                              <button
                                onClick={() => removeFromCart(item.productId)}
                                className="text-[11px] font-medium px-2 py-1 rounded-md transition-all duration-200
                                         hover:bg-red-500/10 hover:text-red-400 active:scale-95"
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                className="px-7 pb-7 pt-5"
                style={{ borderTop: '1px solid var(--border-color)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
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
                  <span className="text-sm font-medium" style={{ color: '#30D158' }}>Free</span>
                </div>

                {/* Total */}
                <div
                  className="flex items-center justify-between mb-5 pt-4"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                >
                  <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
                  <motion.span
                    key={total.toFixed(2)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xl font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    ${total.toFixed(2)}
                  </motion.span>
                </div>

                {/* Checkout Button */}
                <motion.button
                  onClick={handleCheckout}
                  whileHover={{ scale: 1.015, boxShadow: '0 6px 20px rgba(10, 132, 255, 0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-full font-medium text-[15px] flex items-center justify-center gap-2"
                  style={{
                    background: '#0A84FF',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  Check Out
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </motion.button>

                {/* Step Counter */}
                {steps > 0 && (
                  <div className="mt-3 text-center">
                    <p className="text-[11px] font-medium" style={{ color: stepInfo.color }}>
                      {stepInfo.text}
                    </p>
                    {previousModeSteps && previousModeSteps.totalSteps > 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
                        was {previousModeSteps.totalSteps} in {MODE_LABELS[previousModeSteps.mode]}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-center mt-3 tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Demo only — no real transactions
                </p>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CartPanel
