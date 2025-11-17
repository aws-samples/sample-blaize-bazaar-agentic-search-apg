interface RecentProduct {
  id: string
  name: string
  price: number
  image?: string
}

const STORAGE_KEY = 'blaize-recently-viewed'
const MAX_ITEMS = 10

export const addRecentlyViewed = (product: RecentProduct): void => {
  const existing = getRecentlyViewed()
  const filtered = existing.filter(p => p.id !== product.id)
  const updated = [product, ...filtered].slice(0, MAX_ITEMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export const getRecentlyViewed = (): RecentProduct[] => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export const clearRecentlyViewed = (): void => {
  localStorage.removeItem(STORAGE_KEY)
}
