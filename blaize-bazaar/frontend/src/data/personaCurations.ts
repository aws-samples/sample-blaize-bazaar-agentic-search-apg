/**
 * personaCurations — the single source of truth for how each persona
 * reshapes the storefront's "Curated for you" ordering and
 * "Because you asked..." editorial lineup.
 *
 * Design:
 *   - Each persona declares a set of weighted tag interests. Those
 *     interests are applied against SHOWCASE_PRODUCTS[*].tags to
 *     compute a score per product; the Curated grid sorts products
 *     descending by score.
 *   - Each persona also declares its own ordered list of editorial
 *     cards for the "Because you asked..." band. Marco sees
 *     travel/linen cards first, Anna sees gift-focused, Theo sees
 *     home rituals.
 *   - The "fresh" persona (anonymous / first-time visitor) falls
 *     through to the canonical unbiased ordering — same product list,
 *     no scoring, and the generic editorial cards.
 *
 * Why not backend: the point of this round is the demo surface — the
 * personalization should be visible the instant an attendee picks a
 * persona from the welcome chip, no network round-trip. When a real
 * recommendation service ships, this file becomes a client-side
 * fallback that mirrors the server's ranking heuristic.
 */

import type { StorefrontProduct } from '../services/types'

// ---------------------------------------------------------------------
// Persona interest profiles. Scores are 0-10; higher = stronger lean.
// Applied as a dot product against the product's tag set.
// ---------------------------------------------------------------------

export interface PersonaInterests {
  /** Tag → weight. Unmatched tags contribute 0. */
  tagWeights: Record<string, number>
  /** Optional section headline override. Falls back to canonical if unset. */
  curatedHeadline?: string
  /** Optional section eyebrow override. */
  curatedEyebrow?: string
}

export const PERSONA_INTERESTS: Record<string, PersonaInterests> = {
  marco: {
    // Natural fibers, travel-ready, timeless accessories. Marco reads
    // the storefront looking for pieces that hold up on the road and
    // get softer with wear.
    tagWeights: {
      linen: 10,
      travel: 9,
      leather: 8,
      classic: 7,
      warm: 6,
      earth: 6,
      timeless: 6,
      accessories: 5,
      minimal: 5,
      resort: 5,
      everyday: 4,
      neutral: 3,
    },
    curatedEyebrow: 'Curated for Marco',
    curatedHeadline: 'Pieces that travel.',
  },
  anna: {
    // Gift-focused, milestone occasions. Anna lands on the site with
    // a someone in mind — she wants pieces that arrive well-wrapped,
    // land across price bands, and read as considered.
    tagWeights: {
      candle: 10,
      beauty: 9,
      apothecary: 9,
      ceramic: 8,
      home: 7,
      sculptural: 7,
      artisanal: 7,
      warm: 6,
      minimal: 6,
      accessories: 5,
      timeless: 5,
      classic: 4,
    },
    curatedEyebrow: 'Curated for Anna',
    curatedHeadline: 'Gifts, thoughtfully matched.',
  },
  theo: {
    // Slow-craft, home rituals. Theo cares about ceramics, linen that
    // softens with washing, objects with patina. The home/wellness
    // cluster wins over travel or accessories.
    tagWeights: {
      ceramic: 10,
      slow: 10,
      artisanal: 9,
      home: 9,
      wellness: 8,
      linen: 8,
      sculptural: 7,
      minimal: 6,
      neutral: 5,
      warm: 5,
      loungewear: 5,
      candle: 4,
    },
    curatedEyebrow: 'Curated for Theo',
    curatedHeadline: 'Quiet pieces, lived-in.',
  },
  fresh: {
    // Canonical editorial ordering — no persona lean. Equal weights
    // are a no-op against the sort comparator, so the products render
    // in their declared showcase order.
    tagWeights: {},
  },
}

/**
 * Score one product against a persona's tag weights. Returns 0 for the
 * fresh persona or any persona with an empty weight map — in that case
 * callers fall through to the product's natural order.
 */
export function scoreProduct(
  product: StorefrontProduct,
  weights: Record<string, number>,
): number {
  if (!product.tags || product.tags.length === 0) return 0
  let score = 0
  for (const tag of product.tags) {
    score += weights[tag] ?? 0
  }
  return score
}

/**
 * Stable sort SHOWCASE_PRODUCTS for a given persona. Products with no
 * matching tags keep their original relative order (stable sort), so
 * a persona without a full coverage of the catalog still sees the
 * remainder in a predictable sequence.
 */
export function rankProductsForPersona<T extends StorefrontProduct>(
  products: readonly T[],
  personaId: string | null | undefined,
): T[] {
  const interests = personaId ? PERSONA_INTERESTS[personaId] : undefined
  if (!interests || Object.keys(interests.tagWeights).length === 0) {
    return [...products]
  }
  // Decorate-sort-undecorate preserves the original index as a
  // tiebreaker, giving a stable sort without needing Array.sort's
  // stability guarantee (which holds in modern engines but is safer
  // made explicit for workshop attendees reading the code).
  const decorated = products.map((p, i) => ({
    product: p,
    score: scoreProduct(p, interests.tagWeights),
    index: i,
  }))
  decorated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.index - b.index
  })
  return decorated.map(d => d.product)
}

// ---------------------------------------------------------------------
// Editorial cards for "Because you asked..."
//
// Each persona gets a hand-picked set of cards that echo the language
// they'd have used in chat. The fresh persona falls back to the
// canonical generic set (Gifts / Performance / Linen / Home Rituals).
// ---------------------------------------------------------------------

export interface EditorialCard {
  category: string
  title: string
  description: string
}

export const CANONICAL_EDITORIAL: EditorialCard[] = [
  {
    category: 'Gifts',
    title: 'The art of giving well.',
    description:
      'Thoughtful pieces that arrive wrapped in tissue and tied with intention. For the person who notices the details.',
  },
  {
    category: 'Performance and Luxury',
    title: 'Where function meets form.',
    description:
      'Technical fabrics, considered construction. Pieces that perform without announcing it.',
  },
  {
    category: 'Linen Edits',
    title: 'The fabric of slower days.',
    description:
      'Washed, softened, lived-in. Our linen collection gets better with every wear and every wash.',
  },
  {
    category: 'Home Rituals',
    title: 'Objects worth reaching for.',
    description:
      'Ceramic, stoneware, hand-thrown. The everyday pieces that turn a morning routine into a ritual.',
  },
]

export const PERSONA_EDITORIAL: Record<string, EditorialCard[]> = {
  marco: [
    {
      category: 'Weekend escapes',
      title: 'Packed in a single bag.',
      description:
        'Linen that wrinkles honestly, leather that patinas. The pieces that make a 48-hour trip feel unhurried.',
    },
    {
      category: 'Linen edits',
      title: 'Softened by the sun.',
      description:
        'Breathable weaves, warm oat tones. Shirts that earn their golden hour and forgive the rest.',
    },
    {
      category: 'Everyday carry',
      title: 'The weekender, reconsidered.',
      description:
        'Full-grain leather, canvas lining, the quiet kind of heft. A bag that outlasts the trips.',
    },
    {
      category: 'Quiet accessories',
      title: 'Classic, undated.',
      description:
        'Rectangular watches, apothecary notes. Pieces that don’t announce themselves — they just show up.',
    },
  ],
  anna: [
    {
      category: 'Gifting',
      title: 'Wrapped with intention.',
      description:
        'Ceramic, candle, tumbler. Pieces that arrive ready — no last-minute ribbon, no second-guessing.',
    },
    {
      category: 'Milestones',
      title: 'For the occasion that matters.',
      description:
        'Anniversary, housewarming, just-because. Considered objects across every price band.',
    },
    {
      category: 'Home rituals',
      title: 'Everyday beauty, wrapped.',
      description:
        'Sculptural vessels, hand-thrown ceramic. The kind of piece someone actually displays.',
    },
    {
      category: 'Apothecary',
      title: 'Scent, considered.',
      description:
        'Neroli, santal, fig. Small-batch candles and oils that make a gift arrive before it’s opened.',
    },
  ],
  theo: [
    {
      category: 'Slow living',
      title: 'Ritual, not routine.',
      description:
        'Hand-thrown ceramic, washed linen, stoneware tumblers. Objects that reward slowness.',
    },
    {
      category: 'Home rituals',
      title: 'The morning table.',
      description:
        'Woven mats, sculptural vessels. Pieces that make a quiet hour feel intentional.',
    },
    {
      category: 'Wellness',
      title: 'Considered craft.',
      description:
        'Small-batch, artisanal, made in volumes that matter. Pieces with patina, not polish.',
    },
    {
      category: 'Linen edits',
      title: 'Softer with every wash.',
      description:
        'Lounge sets that lean into the weekend. Fabric that loosens around you over seasons.',
    },
  ],
}

/**
 * Resolve the editorial lineup for the active persona, falling back to
 * the canonical set for fresh/unknown personas.
 */
export function editorialForPersona(
  personaId: string | null | undefined,
): EditorialCard[] {
  if (!personaId) return CANONICAL_EDITORIAL
  return PERSONA_EDITORIAL[personaId] ?? CANONICAL_EDITORIAL
}
