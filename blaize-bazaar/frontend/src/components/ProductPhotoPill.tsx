/**
 * ProductPhotoPill — compact photo chip for retrospective references.
 *
 * Rendered when the backend marks a product with ``variant: "pill"``
 * (see services/chat.py, the persona_orders_for_cards injection path).
 * Reads as a visual footnote to the specialist's prose — "your Italian
 * Linen Camp Shirt" becomes clickable evidence without hijacking the
 * conversation with a full artifact card.
 *
 * Layout: 48px round thumbnail · italic-serif name · price (right).
 * Click adds to cart with origin="chat"; no heart/save action — these
 * are backward references, not forward recommendations.
 */
import type { ChatProduct } from '../services/chat'
import '../styles/product-photo-pill.css'

interface ProductPhotoPillProps {
  product: ChatProduct
  onAddToCart?: () => void
}

export default function ProductPhotoPill({
  product,
  onAddToCart,
}: ProductPhotoPillProps) {
  const hasImage =
    product.image &&
    (product.image.startsWith('http') || product.image.startsWith('data:'))

  // Head-only name display — "Italian Linen Camp Shirt — Sage" renders
  // as "Italian Linen Camp Shirt" so the pill reads tight on a 3-up
  // row. The colour/variant suffix is redundant next to the photo.
  const displayName = (() => {
    const n = product.name || ''
    const head = n.split(' — ')[0]
    return head.length <= 34 ? head : head.substring(0, 34).replace(/\s+\S*$/, '') + '…'
  })()

  const price =
    product.price > 0
      ? `$${product.price.toFixed(product.price % 1 === 0 ? 0 : 2)}`
      : null

  return (
    <button
      type="button"
      className="pp-pill"
      onClick={onAddToCart}
      aria-label={`${displayName}${price ? `, ${price}` : ''} — add to bag`}
    >
      <span className="pp-thumb" aria-hidden>
        {hasImage ? (
          <img
            src={product.image}
            alt=""
            className="pp-thumb-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </span>
      <span className="pp-name">{displayName}</span>
      {price && <span className="pp-price">{price}</span>}
    </button>
  )
}
