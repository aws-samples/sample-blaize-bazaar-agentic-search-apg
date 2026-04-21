/**
 * The 9 showcase products from `storefront.md`.
 *
 * These are the hero/featured cards rendered by `<ProductGrid/>` on the
 * home page (Req 1.6.1–1.6.6). The backend `/api/products?personalized=true`
 * endpoint (Task 3.6) returns a superset of these, sorted by match score;
 * while that endpoint is still coming online, the grid uses this constant
 * as its fallback data source and as the seed for unit tests.
 *
 * Tag sets are copied verbatim from the table in `storefront.md` so the
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
// canonical picked → matched → pricing → context rotation for the 9-card
// grid. `assignReasoningChipsCyclic` then guarantees the sequence has no
// two adjacent entries sharing a style (Req 1.7.1). Because the authored
// pattern is already the canonical cycle, the helper is a no-op today,
// but it still runs so the guarantee survives any future edits to the
// ordering or length of the showcase.
const AUTHORED: ReasoningChip[] = [
  // 0 — picked: italic Fraunces editorial reason.
  {
    style: 'picked',
    text: REASONING.picked('linen breathes beautifully in July'),
  },
  // 1 — matched: engineer-voice monospace tag breadcrumb.
  {
    style: 'matched',
    text: REASONING.matched('earth', 'warm', 'everyday'),
  },
  // 2 — pricing: lead clause + terracotta urgent clause (Req 1.7.4).
  {
    style: 'pricing',
    text: REASONING.pricing(14, 3).lead,
    urgentClause: REASONING.pricing(14, 3).urgent,
  },
  // 3 — context: gift-ready free-form line.
  { style: 'context', text: REASONING.DEFAULT_CONTEXT },
  // 4 — picked.
  {
    style: 'picked',
    text: REASONING.picked('you mentioned warm evenings'),
  },
  // 5 — matched.
  {
    style: 'matched',
    text: REASONING.matched('classic', 'warm', 'travel'),
  },
  // 6 — pricing.
  {
    style: 'pricing',
    text: REASONING.pricing(8, 5).lead,
    urgentClause: REASONING.pricing(8, 5).urgent,
  },
  // 7 — context.
  { style: 'context', text: 'Quiet layer that earns its evenings' },
  // 8 — picked.
  { style: 'picked', text: REASONING.picked('you liked outdoor layers') },
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
    brand: 'Blaize Editions',
    name: 'Italian Linen Camp Shirt',
    color: 'Indigo',
    price: 128,
    rating: 4.8,
    reviewCount: 214,
    category: 'Linen',
    imageUrl:
      'https://images.unsplash.com/photo-1740711152088-88a009e877bb?w=1600&q=85',
    badge: 'EDITORS_PICK',
    tags: [
      'minimal',
      'serene',
      'classic',
      'warm',
      'neutral',
      'everyday',
      'slow',
      'linen',
    ],
    reasoning: CHIPS[0],
  },
  {
    id: 2,
    brand: 'Blaize Editions',
    name: 'Wide-Leg Linen Trousers',
    color: 'Oatmeal',
    price: 98,
    rating: 4.7,
    reviewCount: 166,
    category: 'Linen',
    imageUrl:
      'https://images.unsplash.com/photo-1621767527621-ecdea6e1c522?w=1600&q=85',
    tags: [
      'creative',
      'bold',
      'warm',
      'earth',
      'everyday',
      'travel',
      'linen',
    ],
    reasoning: CHIPS[1],
  },
  {
    id: 3,
    brand: 'Blaize Editions',
    name: 'Signature Straw Tote',
    color: 'Sand',
    price: 68,
    rating: 4.9,
    reviewCount: 402,
    category: 'Accessories',
    imageUrl:
      'https://images.unsplash.com/photo-1657118493503-9cabb641a033?w=1600&q=85',
    badge: 'BESTSELLER',
    tags: [
      'classic',
      'serene',
      'neutral',
      'soft',
      'travel',
      'everyday',
      'accessories',
    ],
    reasoning: CHIPS[2],
  },
  {
    id: 4,
    brand: 'Blaize Editions',
    name: 'Relaxed Oxford Shirt',
    color: 'Chambray',
    price: 88,
    rating: 4.6,
    reviewCount: 131,
    category: 'Linen',
    imageUrl:
      'https://images.unsplash.com/photo-1732605559386-bc59426d1b16?w=1600&q=85',
    tags: [
      'classic',
      'minimal',
      'neutral',
      'soft',
      'everyday',
      'work',
      'linen',
    ],
    reasoning: CHIPS[3],
  },
  {
    id: 5,
    brand: 'Blaize Editions',
    name: 'Sundress in Washed Linen',
    color: 'Russet',
    price: 148,
    rating: 4.9,
    reviewCount: 286,
    category: 'Dresses',
    imageUrl:
      'https://images.unsplash.com/photo-1667905632551-361dd00e5e35?w=1600&q=85',
    badge: 'JUST_IN',
    tags: [
      'creative',
      'bold',
      'warm',
      'earth',
      'evening',
      'dresses',
      'linen',
    ],
    reasoning: CHIPS[4],
  },
  {
    id: 6,
    brand: 'Blaize Editions',
    name: 'Leather Slide Sandal',
    color: 'Onyx',
    price: 112,
    rating: 4.7,
    reviewCount: 178,
    category: 'Footwear',
    imageUrl:
      'https://images.unsplash.com/photo-1625318880107-49baad6765fd?w=1600&q=85',
    tags: [
      'minimal',
      'classic',
      'earth',
      'warm',
      'everyday',
      'travel',
      'footwear',
    ],
    reasoning: CHIPS[5],
  },
  {
    id: 7,
    brand: 'Blaize Editions',
    name: 'Cashmere-Blend Cardigan',
    color: 'Forest',
    price: 158,
    rating: 4.8,
    reviewCount: 244,
    category: 'Outerwear',
    imageUrl:
      'https://images.unsplash.com/photo-1687275168013-dcc11d9c74ab?w=1600&q=85',
    tags: [
      'minimal',
      'serene',
      'classic',
      'neutral',
      'earth',
      'slow',
      'evening',
      'outerwear',
    ],
    reasoning: CHIPS[6],
  },
  {
    id: 8,
    brand: 'Blaize Home',
    name: 'Ceramic Tumbler Set',
    color: 'Stoneware',
    price: 52,
    rating: 4.9,
    reviewCount: 358,
    category: 'Home',
    imageUrl:
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=85',
    tags: [
      'minimal',
      'serene',
      'creative',
      'neutral',
      'soft',
      'slow',
      'home',
    ],
    reasoning: CHIPS[7],
  },
  {
    id: 9,
    brand: 'Blaize Editions',
    name: 'Linen Utility Jacket',
    color: 'Flax',
    price: 178,
    rating: 4.7,
    reviewCount: 152,
    category: 'Outerwear',
    imageUrl:
      'https://images.unsplash.com/photo-1691053318576-4bf08315e877?w=1600&q=85',
    tags: [
      'adventurous',
      'creative',
      'earth',
      'neutral',
      'outdoor',
      'travel',
      'outerwear',
    ],
    reasoning: CHIPS[8],
  },
]
