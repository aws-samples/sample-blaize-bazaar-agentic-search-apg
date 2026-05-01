/**
 * ProductGrid — the 9-card editorial grid on the home page.
 *
 * Validates Requirements 1.6.1, 1.6.3, 1.6.6.
 *
 * Layout (Req 1.6.1):
 *   - Mobile  (<640px):  1 column
 *   - Tablet  (≥640px):  2 columns
 *   - Desktop (≥1024px): 3 columns
 *   - Cards are `aspect-[4/5]` image cards (enforced in `ProductCard`).
 *
 * Parallax re-firing on preference save (Req 1.6.6):
 *   - The grid is expected to be mounted by its parent with
 *     `<ProductGrid key={prefsVersion} ... />`. When `prefsVersion`
 *     advances (after `useAuth().savePreferences(...)`), React tears
 *     down this tree and mounts a fresh one. Every `<ProductCard/>`
 *     attaches a new `useScrollReveal` observer, so parallax fires
 *     again for the now-re-ordered list.
 *   - That key contract is a parent responsibility; this component
 *     does not read `useAuth()` directly to keep it easy to unit-test
 *     (the test harness just re-mounts with a fresh key).
 *
 * Data (Req 1.6.3):
 *   - `products` prop defaults to the 9 showcase products from
 *     `storefront.md` so the grid renders without a running backend.
 *     When Task 3.6's `/api/products?personalized=true` endpoint is
 *     wired, `HomePage.tsx` passes the server-returned list in.
 *
 * Stagger:
 *   - Each card receives its column position within its row (`index % 3`)
 *     as the stagger index, which `useScrollReveal` converts into a
 *     `220ms * (index % 3)` delay. This produces the left-to-right sweep
 *     per row documented in `storefront.md` — each row of 3 plays 0ms,
 *     220ms, 440ms — instead of an ever-growing staircase. On narrower
 *     breakpoints the same values still read as a small cascade.
 */
import type { StorefrontProduct } from '../services/types'
import { SHOWCASE_PRODUCTS } from '../data/showcaseProducts'
import ProductCard from './ProductCard'

interface ProductGridProps {
  /**
   * Products to render. Defaults to the 9 showcase products from
   * `storefront.md`. When the personalized endpoint lands, the parent
   * passes in the server-sorted list instead.
   */
  products?: StorefrontProduct[]
  /** Called when a card's `Add to bag` button is clicked. */
  onAddToBag?: (product: StorefrontProduct) => void
}

export default function ProductGrid({
  products = SHOWCASE_PRODUCTS,
  onAddToBag,
}: ProductGridProps) {
  return (
    <section
      id="shop"
      data-testid="product-grid"
      aria-label="Featured products"
      style={{
        width: '100%',
        padding: '32px 24px 48px',
        background: '#fbf4e8',
        scrollMarginTop: 84, // clear the sticky header when scrolled to
      }}
    >
      <div
        className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
        style={{
          // Fallback for environments where Tailwind utilities don't
          // apply (e.g., the jsdom test renderer with `css: false`):
          // pair an inline `display: grid` with the utility-driven
          // column counts above.
          display: 'grid',
        }}
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index % 3}
            onAddToBag={onAddToBag}
          />
        ))}
      </div>
    </section>
  )
}
