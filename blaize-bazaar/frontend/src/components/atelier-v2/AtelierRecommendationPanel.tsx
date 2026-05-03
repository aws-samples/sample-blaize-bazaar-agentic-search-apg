/**
 * AtelierRecommendationPanel
 *
 * Right-side product recommendation card displayed next to the Atelier timeline.
 * Shows a large editorial-style product image, brand/name/price/description,
 * a "Why this" reasoning checklist, and a thumbnail strip for related views.
 *
 * Part of the Atelier v2 redesign. Self-contained; no cross-imports.
 */

import React from 'react'
import { Check } from 'lucide-react'

interface AtelierRecommendationPanelProps {
  product?: {
    name: string
    brand?: string
    price: number
    imageUrl: string
    description?: string
  }
  reasons?: string[]
}

const DEFAULT_PRODUCT = {
  name: 'The Pellier Linen Shirt',
  brand: 'BLAIZE EDITIONS',
  price: 168,
  imageUrl: '/products/pellier-linen-shirt.png',
  description:
    'Airy, textured, and endlessly versatile. Cut from pure European linen with a relaxed silhouette and mother of pearl buttons.',
}

const DEFAULT_REASONS = [
  'Breathable linen perfect for heat',
  'Relaxed fit for all-day ease',
  'Neutral tone goes with everything',
  'Highly rated by similar customers',
]

const INK = '#1f1410'
const BURGUNDY = '#c44536'
const CREAM_WARM = '#f5e8d3'

const eyebrow: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: 'rgba(31,20,16,0.55)',
  fontFamily: 'var(--sans)',
}

const pill: React.CSSProperties = {
  background: CREAM_WARM,
  color: INK,
  padding: '10px',
  fontSize: '12px',
  fontFamily: 'var(--sans)',
  border: 'none',
  cursor: 'pointer',
}

const productTitle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontWeight: 500,
  fontSize: 'clamp(20px, 2vw, 26px)',
  lineHeight: 1.15,
  color: INK,
  margin: 0,
}

const desc: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: '14px',
  lineHeight: 1.55,
  color: 'rgba(31,20,16,0.65)',
  margin: 0,
}

const whyText: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: '13px',
  color: 'rgba(31,20,16,0.72)',
  lineHeight: 1.45,
}

export function AtelierRecommendationPanel({
  product = DEFAULT_PRODUCT,
  reasons = DEFAULT_REASONS,
}: AtelierRecommendationPanelProps) {
  const brand = product.brand ?? 'BLAIZE EDITIONS'
  const description = product.description ?? ''

  // Split product name at the last space so it wraps into two editorial lines.
  const lastSpace = product.name.lastIndexOf(' ')
  const nameLine1 = lastSpace > 0 ? product.name.slice(0, lastSpace) : product.name
  const nameLine2 = lastSpace > 0 ? product.name.slice(lastSpace + 1) : ''

  return (
    <div
      className="flex flex-col"
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(31,20,16,0.08)',
        maxWidth: '380px',
        fontFamily: 'var(--sans)',
        color: INK,
      }}
    >
      <div className="flex items-center justify-between">
        <span style={eyebrow}>RECOMMENDATION</span>
        <button type="button" className="rounded-full" style={pill}>
          View graph
        </button>
      </div>

      <div
        className="mt-4 w-full"
        style={{ aspectRatio: '1 / 1', borderRadius: '16px', background: CREAM_WARM, overflow: 'hidden' }}
      >
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <div className="mt-5">
        <span style={eyebrow}>{brand}</span>
        <h3 className="mt-2" style={productTitle}>
          {nameLine1}
          {nameLine2 && (
            <>
              <br />
              {nameLine2}
            </>
          )}
        </h3>
        <div className="mt-2" style={{ fontFamily: 'var(--serif)', fontSize: '18px', color: INK }}>
          ${product.price}
        </div>
        {description && (
          <p className="mt-3" style={desc}>
            {description}
          </p>
        )}
      </div>

      <div className="mt-5">
        <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, color: INK }}>
          Why this
        </div>
        <ul
          className="mt-3 flex flex-col gap-2"
          style={{ padding: 0, margin: 0, listStyle: 'none' }}
        >
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check size={14} strokeWidth={2} color={BURGUNDY} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={whyText}>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ width: '72px', height: '72px', borderRadius: '10px', background: CREAM_WARM }}
          />
        ))}
      </div>
    </div>
  )
}

export default AtelierRecommendationPanel
