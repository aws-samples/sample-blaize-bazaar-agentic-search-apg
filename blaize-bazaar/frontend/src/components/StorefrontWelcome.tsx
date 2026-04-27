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

interface StorefrontWelcomeProps {
  onSend: (text: string) => void
  persona?: PersonaSnapshot | null
}

interface PersonaCopy {
  /** Full greeting line, excluding time-of-day. Wrapped in <em> in the
   * markup. "Good evening." for fresh visitors; "Welcome back, Marco."
   * for a returning persona. */
  greeting: string
  /** Short context paragraph that follows the greeting. Grounded in
   * persona signals so it reads like the storefront remembers them. */
  context: React.ReactNode
  picks: ReadonlyArray<{ label: string; primary: boolean }>
  ps: ReadonlyArray<string>
}

const FRESH_COPY: PersonaCopy = {
  greeting: 'Good evening.',
  context: (
    <>
      I've been watching the floor —{' '}
      <span className="sf-context-num">444</span> pieces across 9
      categories. Today's standout is the{' '}
      <span className="sf-context-product">Featherweight Trail Runner</span>{' '}
      in Footwear.
    </>
  ),
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
  greeting: 'Welcome back, Marco.',
  context: (
    <>
      It's been three weeks. The{' '}
      <span className="sf-context-product">Maren tunic</span> in oat is
      still hanging well, and there's a new sage linen camp shirt that
      picked up where your last saved piece left off.
    </>
  ),
  picks: [
    { label: 'Show me what I saved last time', primary: true },
    { label: 'New linen arrivals since my last visit', primary: false },
    { label: 'Something wrinkle-resistant for travel', primary: false },
  ],
  ps: [
    'what did I buy last time?',
    'another linen piece for slow Sundays',
    'something travel-friendly like my Lisbon picks',
  ],
}

const ANNA_COPY: PersonaCopy = {
  greeting: 'Welcome back, Anna.',
  context: (
    <>
      A few new arrivals since your last visit, with{' '}
      <span className="sf-context-product">gift-ready pieces</span> across
      milestone and everyday price bands. I can help narrow by occasion
      or recipient whenever you're ready.
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

function copyForPersona(persona?: PersonaSnapshot | null): PersonaCopy {
  if (!persona) return FRESH_COPY
  switch (persona.id) {
    case 'marco':
      return MARCO_COPY
    case 'anna':
      return ANNA_COPY
    case 'fresh':
    default:
      return FRESH_COPY
  }
}

export default function StorefrontWelcome({ onSend, persona }: StorefrontWelcomeProps) {
  const copy = copyForPersona(persona)

  return (
    <div className="sf-welcome">
      {/* Cover image — CSS-only vessel still life */}
      <div className="sf-cover">
        <div className="sf-cover-floor" />
        <div className="sf-cover-shapes">
          <div className="sf-vessel-wrap">
            <div className="sf-vessel sf-vessel-tall" />
            <div className="sf-vessel-shadow" />
          </div>
          <div className="sf-vessel-wrap">
            <div className="sf-vessel sf-vessel-short" />
            <div className="sf-vessel-shadow" />
          </div>
          <div className="sf-vessel-wrap">
            <div className="sf-vessel sf-vessel-med" />
            <div className="sf-vessel-shadow" />
          </div>
        </div>
        <div className="sf-cover-overlay">
          <div className="sf-cover-eyebrow">
            <span className="sf-cover-dot" />
            Tonight's standout
          </div>
          <div className="sf-cover-edition">No. 06</div>
        </div>
      </div>

      {/* Body */}
      <div className="sf-body">
        {/* Eyebrow row */}
        <div className="sf-eyebrow-row">
          <span className="sf-eyebrow-sm">Tonight at the boutique</span>
          <span className="sf-eyebrow-rule" />
        </div>

        {/* Greeting */}
        <h2 className="sf-greeting">
          <em>{copy.greeting}</em>
        </h2>
        <p className="sf-context">{copy.context}</p>

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
