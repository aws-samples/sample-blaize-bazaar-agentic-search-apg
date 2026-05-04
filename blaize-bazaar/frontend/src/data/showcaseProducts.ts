/**
 * The 9 showcase products for the Blaize Bazaar storefront.
 *
 * These are the hero/featured cards rendered by `<ProductGrid/>` on the
 * home page (Req 1.6.1-1.6.6). The backend `/api/products?personalized=true`
 * endpoint (Task 3.6) returns a superset of these, sorted by match score;
 * while that endpoint is still coming online, the grid uses this constant
 * as its fallback data source and as the seed for unit tests.
 *
 * Tag sets are copied verbatim from the product table so the
 * personalization scorer in `services/personalization.py` (Task 1.4) and
 * the frontend render stay aligned.
 */
import type {
  ReasoningChip,
  StorefrontProduct,
} from '../services/types'
import { REASONING } from '../copy'
import {
  assignReasoningChipsCyclic,
  findAdjacentDuplicateStyleIndex,
} from '../components/ReasoningChip'

// Per-card reasoning copy authored in product declaration order.
//
// The copy is written so the authored `style` already lines up with the
// canonical picked -> matched -> pricing -> context rotation for the 9-card
// grid. `assignReasoningChipsCyclic` then guarantees the sequence has no
// two adjacent entries sharing a style (Req 1.7.1). Because the authored
// pattern is already the canonical cycle, the helper is a no-op today,
// but it still runs so the guarantee survives any future edits to the
// ordering or length of the showcase.
const AUTHORED: ReasoningChip[] = [
  // 0 - picked: italic Fraunces editorial reason.
  {
    style: 'picked',
    text: REASONING.picked('sculptural ceramics that anchor a room'),
  },
  // 1 - matched: engineer-voice monospace tag breadcrumb.
  {
    style: 'matched',
    text: REASONING.matched('linen', 'resort', 'minimal'),
  },
  // 2 - pricing: lead clause + terracotta urgent clause (Req 1.7.4).
  {
    style: 'pricing',
    text: REASONING.pricing(14, 3).lead,
    urgentClause: REASONING.pricing(14, 3).urgent,
  },
  // 3 - context: gift-ready free-form line.
  {
    style: 'context',
    text: 'the scent that turns a Tuesday into a ritual',
  },
  // 4 - picked.
  {
    style: 'picked',
    text: REASONING.picked('you mentioned timeless accessories'),
  },
  // 5 - matched.
  {
    style: 'matched',
    text: REASONING.matched('apothecary', 'minimal', 'warm'),
  },
  // 6 - pricing.
  {
    style: 'pricing',
    text: REASONING.pricing(8, 5).lead,
    urgentClause: REASONING.pricing(8, 5).urgent,
  },
  // 7 - context.
  {
    style: 'context',
    text: 'the set that makes staying in feel intentional',
  },
  // 8 - picked.
  {
    style: 'picked',
    text: REASONING.picked('you liked clean activewear'),
  },
]

const CHIPS: ReasoningChip[] = assignReasoningChipsCyclic(AUTHORED)

// Defensive invariant: the grid-level distribution test in
// `ReasoningChip.test.tsx` also enforces this, but keeping the assertion
// here means a bad edit to AUTHORED fails loud at module-load time.
if (findAdjacentDuplicateStyleIndex(CHIPS) !== -1) {
  throw new Error(
    'showcaseProducts: adjacent cards share a reasoning chip style',
  )
}

export const SHOWCASE_PRODUCTS: StorefrontProduct[] = [
  {
    id: 1,
    brand: 'Blaize Home',
    name: 'Olive Branch Vessel',
    color: 'Ivory',
    price: 185,
    rating: 4.9,
    reviewCount: 127,
    category: 'Home Decor',
    imageUrl: '/products/olive-branch-vessel.png',
    imagePosition: 'center 60%',
    tags: ['ceramic', 'sculptural', 'minimal', 'warm', 'neutral', 'home'],
    reasoning: CHIPS[0],
  },
  {
    id: 2,
    brand: 'Blaize Editions',
    name: 'Pellier Linen Shirt',
    color: 'Ivory',
    price: 248,
    rating: 4.8,
    reviewCount: 312,
    category: 'Apparel',
    imageUrl: '/products/pellier-linen-shirt.png',
    badge: 'EDITORS_PICK',
    tags: ['linen', 'minimal', 'resort', 'warm', 'neutral', 'everyday'],
    reasoning: CHIPS[1],
  },
  {
    id: 3,
    brand: 'Blaize Editions',
    name: 'Nocturne Leather Weekender',
    color: 'Cognac',
    price: 695,
    rating: 4.9,
    reviewCount: 89,
    category: 'Bags & Travel',
    imageUrl: '/products/nocturne-leather-weekender.png',
    badge: 'BESTSELLER',
    tags: ['leather', 'travel', 'classic', 'warm', 'earth', 'accessories'],
    reasoning: CHIPS[2],
  },
  {
    id: 4,
    brand: 'Blaize Home',
    name: 'Santal & Fig Candle',
    color: 'Amber',
    price: 92,
    rating: 4.7,
    reviewCount: 445,
    category: 'Home Fragrance',
    imageUrl: '/products/santal-fig-candle.png',
    tags: ['candle', 'home', 'minimal', 'warm', 'slow'],
    reasoning: CHIPS[3],
  },
  {
    id: 5,
    brand: 'Blaize Editions',
    name: 'Heritage Rectangular Watch',
    color: 'Tan',
    price: 420,
    rating: 4.8,
    reviewCount: 203,
    category: 'Watches & Jewelry',
    imageUrl: '/products/heritage-rectangular-watch.png',
    badge: 'JUST_IN',
    tags: ['watch', 'classic', 'minimal', 'timeless', 'accessories'],
    reasoning: CHIPS[4],
  },
  {
    id: 6,
    brand: 'Blaize Home',
    name: 'Neroli Apothecary Bottle',
    color: 'Amber',
    price: 128,
    rating: 4.6,
    reviewCount: 178,
    category: 'Beauty',
    imageUrl: '/products/neroli-apothecary-bottle.png',
    tags: ['beauty', 'apothecary', 'minimal', 'home', 'warm'],
    reasoning: CHIPS[5],
  },
  {
    id: 7,
    brand: 'Blaize Home',
    name: 'Solstice Woven Mat Set',
    color: 'Natural',
    price: 165,
    rating: 4.7,
    reviewCount: 96,
    category: 'Wellness',
    imageUrl: '/products/solstice-woven-mat-set.png',
    tags: ['wellness', 'home', 'neutral', 'artisanal', 'slow'],
    reasoning: CHIPS[6],
  },
  {
    id: 8,
    brand: 'Blaize Editions',
    name: 'Alba Linen Lounge Set',
    color: 'Oat',
    price: 390,
    rating: 4.9,
    reviewCount: 267,
    category: 'Apparel',
    imageUrl: '/products/alba-linen-lounge-set.png',
    tags: ['linen', 'loungewear', 'neutral', 'minimal', 'everyday', 'slow'],
    reasoning: CHIPS[7],
  },
  {
    id: 9,
    brand: 'Blaize Active',
    name: 'Cloudform Studio Runner',
    color: 'Stone',
    price: 210,
    rating: 4.8,
    reviewCount: 341,
    category: 'Footwear',
    imageUrl: '/products/cloudform-studio-runner.png',
    tags: ['activewear', 'neutral', 'minimal', 'wellness', 'footwear'],
    reasoning: CHIPS[8],
  },
]
