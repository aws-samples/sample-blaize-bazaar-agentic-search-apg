/**
 * ProductGridHeader — section header rendered above <ProductGrid/>.
 *
 * Layout (per mock): left-aligned eyebrow + italic Fraunces heading, with a
 * right-aligned "Sort: Most loved" button on md+. The eyebrow leads with a
 * pulsing terracotta dot (.pulse-dot in index.css).
 *
 * The header itself renders statically so it always acts as a landmark. The
 * Apple-style parallax reveal belongs to the grid cards below
 * (<ProductCard/>, via useScrollReveal) where it reads as content settling
 * in; making the section label itself animate in hides the landmark before
 * users know what they are scrolling toward.
 */
import { ChevronDown } from 'lucide-react'

import { PRODUCT_GRID_HEADER } from '../copy'

const INK = '#2d1810'
const ACCENT = '#c44536'

export default function ProductGridHeader() {
  return (
    <section
      data-testid="product-grid-header"
      className="mx-auto w-full max-w-7xl px-6 pt-14 pb-8"
    >
      <div className="flex items-end justify-between">
        <div>
          <div
            data-testid="product-grid-header-eyebrow"
            className="mb-2 flex items-center gap-2"
          >
            <span
              data-testid="product-grid-header-pulse-dot"
              aria-hidden
              className="pulse-dot inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: ACCENT }}
            />
            <span
              className="text-[11px] font-medium uppercase tracking-[0.2em]"
              style={{ color: ACCENT, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {PRODUCT_GRID_HEADER.EYEBROW}
            </span>
          </div>
          <h2
            data-testid="product-grid-header-title"
            className="font-[Fraunces] italic leading-tight"
            style={{
              margin: 0,
              color: INK,
              fontSize: '2.5rem',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            {PRODUCT_GRID_HEADER.TITLE}
          </h2>
        </div>
        <button
          type="button"
          data-testid="product-grid-header-sort"
          className="hidden items-center gap-1 text-xs font-medium hover:underline md:flex"
          style={{ color: INK, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {PRODUCT_GRID_HEADER.SORT_LABEL}
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </section>
  )
}
