/**
 * Cart Context — Centralizes cart state, checkout metrics, and toast notifications.
 * Replaces prop-threaded cart state from App.tsx and the window.addToCart global.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useLayout, type WorkshopMode } from './LayoutContext'

// --- Types ---

export type CartItemOrigin = 'manual' | 'search-quick-add' | 'chat' | 'bundle' | 'memory'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
  origin: CartItemOrigin
  addedAt: number
}

interface CartAdditionEvent {
  origin: CartItemOrigin
  timestamp: number
}

export interface CheckoutMetrics {
  searchCount: number
  productViews: number
  additions: CartAdditionEvent[]
}

interface PreviousModeSnapshot {
  mode: WorkshopMode
  totalSteps: number
}

interface CartContextValue {
  items: CartItem[]
  metrics: CheckoutMetrics
  previousModeSteps: PreviousModeSnapshot | null
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  showToast: boolean
  toastMessage: string
  dismissToast: () => void
  addToCart: (product: { productId: string; name: string; price: number; image?: string; origin: CartItemOrigin }) => void
  addAllToCart: (products: Array<{ productId: string; name: string; price: number; image?: string }>, origin: CartItemOrigin) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  handleCheckout: () => void
  incrementSearch: () => void
  incrementProductView: () => void
}

// --- Context + Hook ---

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

// --- Helpers ---

const STORAGE_KEY = 'blaize-cart'

function hydrateItems(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Array<Partial<CartItem>>
      return parsed.map(item => ({
        productId: item.productId ?? '',
        name: item.name ?? '',
        price: item.price ?? 0,
        quantity: item.quantity ?? 1,
        image: item.image,
        origin: item.origin ?? 'manual',
        addedAt: item.addedAt ?? 0,
      }))
    }
  } catch { /* ignore corrupt data */ }
  return []
}

function emptyMetrics(): CheckoutMetrics {
  return { searchCount: 0, productViews: 0, additions: [] }
}

function totalSteps(m: CheckoutMetrics): number {
  return m.searchCount + m.productViews + m.additions.length
}

// --- Provider ---

export function CartProvider({ children }: { children: ReactNode }) {
  const { workshopMode } = useLayout()

  // Cart items
  const [items, setItems] = useState<CartItem[]>(hydrateItems)

  // Checkout metrics
  const [metrics, setMetrics] = useState<CheckoutMetrics>(emptyMetrics)
  const [previousModeSteps, setPreviousModeSteps] = useState<PreviousModeSnapshot | null>(null)

  // UI state
  const [cartOpen, setCartOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Track mode changes — skip initial mount
  const prevModeRef = useRef(workshopMode)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    // Workshop mode changed — snapshot current steps, then reset
    const prevMode = prevModeRef.current
    const steps = totalSteps(metrics)
    if (steps > 0) {
      setPreviousModeSteps({ mode: prevMode, totalSteps: steps })
    }
    setMetrics(emptyMetrics())
    prevModeRef.current = workshopMode
  }, [workshopMode]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only fire on mode change

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // --- Cart operations ---

  const toast = useCallback((msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
  }, [])

  const dismissToast = useCallback(() => {
    setShowToast(false)
  }, [])

  const addToCart = useCallback((product: { productId: string; name: string; price: number; image?: string; origin: CartItemOrigin }) => {
    const now = Date.now()
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.productId)
      if (existing) {
        toast(`Updated quantity for ${product.name.substring(0, 30)}...`)
        return prev.map(i =>
          i.productId === product.productId
            ? { ...i, quantity: i.quantity + 1, origin: product.origin, addedAt: now }
            : i
        )
      }
      toast(`Added ${product.name.substring(0, 30)}... to cart`)
      return [...prev, {
        productId: product.productId,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        origin: product.origin,
        addedAt: now,
      }]
    })
    setMetrics(prev => ({
      ...prev,
      additions: [...prev.additions, { origin: product.origin, timestamp: now }],
    }))
    setCartOpen(true)
  }, [toast])

  const addAllToCart = useCallback((products: Array<{ productId: string; name: string; price: number; image?: string }>, origin: CartItemOrigin) => {
    const now = Date.now()
    setItems(prev => {
      let updated = [...prev]
      for (const product of products) {
        const idx = updated.findIndex(i => i.productId === product.productId)
        if (idx >= 0) {
          updated = updated.map((item, i) =>
            i === idx ? { ...item, quantity: item.quantity + 1, origin, addedAt: now } : item
          )
        } else {
          updated.push({
            productId: product.productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
            origin,
            addedAt: now,
          })
        }
      }
      return updated
    })
    // Single event for the entire bundle
    setMetrics(prev => ({
      ...prev,
      additions: [...prev.additions, { origin, timestamp: now }],
    }))
    toast(`Added ${products.length} items to cart`)
    setCartOpen(true)
  }, [toast])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.productId !== productId))
    } else {
      setItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      )
    }
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    if (confirm('Are you sure you want to clear your cart?')) {
      setItems([])
      toast('Cart cleared')
    }
  }, [toast])

  const handleCheckout = useCallback(() => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    alert(`Demo Checkout\n\nTotal: $${total.toFixed(2)}\n\nThis is a demo - no real transaction will occur.`)
    setItems([])
    setCartOpen(false)
  }, [items])

  const incrementSearch = useCallback(() => {
    setMetrics(prev => ({ ...prev, searchCount: prev.searchCount + 1 }))
  }, [])

  const incrementProductView = useCallback(() => {
    setMetrics(prev => ({ ...prev, productViews: prev.productViews + 1 }))
  }, [])

  return (
    <CartContext.Provider value={{
      items,
      metrics,
      previousModeSteps,
      cartOpen,
      setCartOpen,
      showToast,
      toastMessage,
      dismissToast,
      addToCart,
      addAllToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      handleCheckout,
      incrementSearch,
      incrementProductView,
    }}>
      {children}
    </CartContext.Provider>
  )
}
