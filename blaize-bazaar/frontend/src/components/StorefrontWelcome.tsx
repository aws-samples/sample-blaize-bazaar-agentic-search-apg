/**
 * StorefrontWelcome — editorial welcome state for the storefront concierge.
 *
 * Renders when the conversation is empty (no user messages yet) in
 * storefront mode. Matches the design in docs/blaize-chat-synthesis.html:
 *
 *   Cover image (CSS-only vessel composition) → greeting → boutique
 *   stats → pre-vetted picks (3 stacked pills) → centered-dot divider
 *   → "Or tell me what you're after" prompt → P.S. close with 3
 *   quoted suggestions.
 *
 * When a persona is active (Marco, Anna), greeting + picks + P.S. chips
 * swap to persona-specific copy grounded in their signals from
 * docs/personas-config.json. Fresh visitors see the editorial default.
 *
 * All picks and P.S. suggestions fire `onSend(text)` on click, which
 * the parent wires to `useAgentChat.sendMessage`.
 */
import '../styles/storefront-welcome.css'
import type { PersonaSnapshot } from '../contexts/PersonaContext'
import { useCatalogStats, type CatalogStats } from '../hooks/useCatalogStats'
import { SHOWCASE_PRODUCTS } from '../data/showcaseProducts'
import type { StorefrontProduct } from '../services/types'

interface StorefrontWelcomeProps {
  onSend: (text: string) => void
  persona?: PersonaSnapshot | null
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

function timeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const TOD_GREETING: Record<TimeOfDay, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
}

const TOD_EYEBROW: Record<TimeOfDay, string> = {
  morning: 'This morning at the boutique',
  afternoon: 'This afternoon at the boutique',
  evening: 'Tonight at the boutique',
}

const TOD_COVER_EYEBROW: Record<TimeOfDay, string> = {
  morning: "This morning's standout",
  afternoon: "This afternoon's standout",
  evening: "Tonight's standout",
}

// ---------------------------------------------------------------------------
// Cover resolution — picks the cover product + its eyebrow per persona.
//
// Each returning persona gets a pinned cover piece anchored to their
// clearest signal, with an eyebrow that swaps the newsroom "standout"
// language for something that reads as curated-for-them. Fresh users
// (and null) fall through to the global standout from the catalog-
// stats endpoint with the time-of-day eyebrow — no signal to tailor
// against, so the boutique voice stays honest.
//
// If a pinned piece isn't found in the provided catalog (defensive
// guard against future showcase edits), the persona falls through to
// the global path so the cover never disappears.
// ---------------------------------------------------------------------------

interface PersonaCover {
  /** Product name to find in the catalog (exact match on `name`). */
  coverName: string
  /** Eyebrow copy that replaces the time-of-day "standout" line. */
  eyebrow: string
}

// Pinned covers keyed by persona id. Extending this is the one-line
// way to tailor a new persona's welcome cover.
const PERSONA_COVERS: Record<string, PersonaCover> = {
  marco: {
    coverName: 'Italian Linen Camp Shirt',
    eyebrow: 'Matched to your thread',
  },
  anna: {
    // Swapped from Ceramic Tumbler Set (now Theo's) to the Straw
    // Tote — bestseller, under $100, reads as a considered gift.
    coverName: 'Signature Straw Tote',
    eyebrow: 'A gift, ready to go',
  },
  theo: {
    coverName: 'Ceramic Tumbler Set',
    eyebrow: 'Quiet pieces for slow days',
  },
}

export interface CoverResolution {
  product: StorefrontProduct
  eyebrow: string
}

export function resolveCover(
  persona: PersonaSnapshot | null | undefined,
  stats: CatalogStats | null,
  tod: TimeOfDay,
  catalog: readonly StorefrontProduct[] = SHOWCASE_PRODUCTS,
): CoverResolution {
  // Persona-specific cover path. Try the pinned piece; fall through if
  // it isn't in the catalog.
  const pinned = persona?.id ? PERSONA_COVERS[persona.id] : undefined
  if (pinned) {
    const product = catalog.find((p) => p.name === pinned.coverName)
    if (product) {
      return { product, eyebrow: pinned.eyebrow }
    }
  }

  // Global standout — match the stats endpoint's standout_name against
  // the showcase catalog, otherwise fall back to the first piece.
  const standoutMatch = stats?.standout_name
    ? catalog.find(
        (p) =>
          p.name.toLowerCase().includes(stats.standout_name!.toLowerCase()) ||
          stats.standout_name!.toLowerCase().includes(p.name.toLowerCase()),
      )
    : undefined
  return {
    product: standoutMatch ?? catalog[0],
    eyebrow: TOD_COVER_EYEBROW[tod],
  }
}

interface PersonaCopy {
  /** Greeting line without time-of-day prefix. For fresh visitors this
   * is empty and the time-of-day stands alone ("Good evening."). For
   * returning personas it's the warm back-reference ("Marco — welcome
   * back."). */
  greetingSuffix: (firstName: string) => string
  /** Short context paragraph that follows the greeting. Grounded in
   * persona signals so it reads like the storefront remembers them.
   * Receives live catalog stats so copy that cites the catalog size
   * never goes stale. */
  context: (stats: CatalogStats | null) => React.ReactNode
  picks: ReadonlyArray<{ label: string; primary: boolean }>
  ps: ReadonlyArray<string>
}

// CatalogStats is imported from the hook module so resolveCover and
// PersonaCopy.context can both reference the same shape.

const FRESH_COPY: PersonaCopy = {
  greetingSuffix: () => '',
  context: (stats) => {
    // During the first paint (stats === null) we keep the sentence
    // grammatical without numbers — "I've been watching the boutique."
    // — so the layout doesn't flash.
    if (!stats || stats.product_count === 0) {
      return (
        <>
          I've been watching the boutique. Tell me what you're after and
          I'll curate from the floor.
        </>
      )
    }
    const standout = stats.standout_name?.trim()
    const category = stats.standout_category?.trim()
    return (
      <>
        I've been watching the floor —{' '}
        <span className="sf-context-num">{stats.product_count}</span>{' '}
        pieces across {stats.category_count} categories.
        {standout && category && (
          <>
            {' '}
            Today's standout is the{' '}
            <span className="sf-context-product">{standout}</span> in{' '}
            {category}.
          </>
        )}
      </>
    )
  },
  picks: [
    { label: "Show me today's picks", primary: true },
    { label: "What's new since my last visit", primary: false },
    { label: 'Why did the agent pick these?', primary: false },
  ],
  ps: [
    'something for long summer walks',
    'a linen piece that earns its golden hour',
    'pieces that travel well',
  ],
}

const MARCO_COPY: PersonaCopy = {
  greetingSuffix: (firstName) => `, ${firstName}. Welcome back.`,
  context: () => (
    <>
      It's been three weeks since your last visit. Seven orders in your
      history, with a steady thread of{' '}
      <span className="sf-context-product">natural fibers and oat tones</span>.
      A new sage linen camp shirt just landed that picks up where your
      last saved piece left off.
    </>
  ),
  picks: [
    { label: 'Show me what I saved last time', primary: true },
    { label: 'New linen arrivals since my last visit', primary: false },
    { label: 'Something wrinkle-resistant for travel', primary: false },
  ],
  ps: [
    'what did I buy last time?',
    'something similar to what I bought last time',
    'pieces that travel well for Lisbon',
  ],
}

const ANNA_COPY: PersonaCopy = {
  greetingSuffix: (firstName) => `, ${firstName}. Welcome back.`,
  context: () => (
    <>
      Nine days since your last visit. Five orders in your history, all
      gift-shaped across milestone and everyday price bands. A handful of{' '}
      <span className="sf-context-product">gift-ready pieces</span>{' '}
      arrived since — I can narrow by occasion or recipient whenever
      you're ready.
    </>
  ),
  picks: [
    { label: 'Show me gift-ready pieces this week', primary: true },
    { label: 'Milestone gifts under $200', primary: false },
    { label: 'Help me build a small gift set', primary: false },
  ],
  ps: [
    'a thoughtful gift for my mother',
    'something milestone-shaped under $200',
    'help me build a small gift set with wrapping',
  ],
}

const THEO_COPY: PersonaCopy = {
  greetingSuffix: (firstName) => `, ${firstName}. Good to see you.`,
  context: () => (
    <>
      Two weeks since your last visit. Four orders in your history, all{' '}
      <span className="sf-context-product">ceramics, linen, and stoneware</span>.
      A new run of serving bowls landed last week that sits beside your
      tumbler set as if they were fired together.
    </>
  ),
  picks: [
    { label: 'New home arrivals since my last visit', primary: true },
    { label: 'Stoneware pieces that wear in', primary: false },
    { label: 'Linen throws for a small room', primary: false },
  ],
  ps: [
    'pieces that wear in slowly',
    'something for quiet mornings',
    'stoneware for serving, not just display',
  ],
}

function copyForPersona(persona?: PersonaSnapshot | null): PersonaCopy {
  if (!persona) return FRESH_COPY
  switch (persona.id) {
    case 'marco':
      return MARCO_COPY
    case 'anna':
      return ANNA_COPY
    case 'theo':
      return THEO_COPY
    case 'fresh':
    default:
      return FRESH_COPY
  }
}

export default function StorefrontWelcome({ onSend, persona }: StorefrontWelcomeProps) {
  const copy = copyForPersona(persona)
  const tod = timeOfDay()
  const firstName = persona ? persona.display_name.split(' ')[0] : ''
  const greeting = `${TOD_GREETING[tod]}${copy.greetingSuffix(firstName)}.`
  const stats = useCatalogStats()

  // Resolve cover product + eyebrow per persona. Anna's gift branch
  // diverges from Marco/Fresh (who get the global standout); the
  // helper is the single place that encodes that rule.
  const { product: coverProduct, eyebrow: coverEyebrow } = resolveCover(
    persona,
    stats,
    tod,
  )

  return (
    <div className="sf-welcome">
      {/* Cover image — real product photo from the catalog */}
      <div className="sf-cover">
        <img
          src={coverProduct.imageUrl}
          alt={coverProduct.name}
          className="sf-cover-img"
        />
        <div className="sf-cover-overlay">
          <div className="sf-cover-eyebrow">
            <span className="sf-cover-dot" />
            {coverEyebrow}
          </div>
          <div className="sf-cover-edition">No. 06</div>
        </div>
      </div>

      {/* Body */}
      <div className="sf-body">
        {/* Eyebrow row */}
        <div className="sf-eyebrow-row">
          <span className="sf-eyebrow-sm">{TOD_EYEBROW[tod]}</span>
          <span className="sf-eyebrow-rule" />
        </div>

        {/* Greeting */}
        <h2 className="sf-greeting">
          <em>{greeting}</em>
        </h2>
        <p className="sf-context">{copy.context(stats)}</p>

        {/* Pre-vetted picks */}
        <div className="sf-section">
          <div className="sf-section-head">
            <span className="sf-eyebrow-sm sf-eyebrow-red">
              <span className="sf-dot" />
              {persona && persona.id !== 'fresh' ? 'Curated for you' : 'Pre-vetted picks'}
            </span>
            <span className="sf-count">3 OF 9</span>
          </div>
          <div className="sf-actions-stack">
            {copy.picks.map((pick) => (
              <button
                key={pick.label}
                type="button"
                className={`sf-action ${pick.primary ? 'sf-action-primary' : ''}`}
                onClick={() => onSend(pick.label)}
              >
                {pick.label}
                <span className="sf-action-arrow">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Centered-dot divider */}
        <div className="sf-divider" />

        {/* Prompt */}
        <p className="sf-prompt">Or tell me what you're after.</p>

        {/* P.S. close */}
        <div className="sf-postscript">
          <p className="sf-postscript-lead">
            <span className="sf-ps-mark">P.S.</span>
            <span className="sf-ps-dash">&mdash;</span>
            {persona && persona.id !== 'fresh'
              ? " If nothing comes to mind, here's what you've been asking lately:"
              : " If nothing comes to mind, here's what others have been asking lately:"}
          </p>
          <div className="sf-postscript-list">
            {copy.ps.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="sf-overheard"
                onClick={() => onSend(suggestion)}
              >
                <span className="sf-overheard-bullet">&middot;</span>
                <span className="sf-overheard-quote">
                  &ldquo;{suggestion}&rdquo;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
