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
 * All picks and P.S. suggestions fire `onSend(text)` on click, which
 * the parent wires to `useAgentChat.sendMessage`.
 */
import '../styles/storefront-welcome.css'

interface StorefrontWelcomeProps {
  onSend: (text: string) => void
}

const PICKS = [
  { label: "Show me today's picks", primary: true },
  { label: "What's new since my last visit", primary: false },
  { label: 'Why did the agent pick these?', primary: false },
] as const

const PS_SUGGESTIONS = [
  'something for long summer walks',
  'a linen piece that earns its golden hour',
  'pieces that travel well',
] as const

export default function StorefrontWelcome({ onSend }: StorefrontWelcomeProps) {
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
          <em>Good evening.</em>
        </h2>
        <p className="sf-context">
          I've been watching the floor —{' '}
          <span className="sf-context-num">444</span> pieces across 9
          categories. Today's standout is the{' '}
          <span className="sf-context-product">Featherweight Trail Runner</span>{' '}
          in Footwear.
        </p>

        {/* Pre-vetted picks */}
        <div className="sf-section">
          <div className="sf-section-head">
            <span className="sf-eyebrow-sm sf-eyebrow-red">
              <span className="sf-dot" />
              Pre-vetted picks
            </span>
            <span className="sf-count">3 OF 9</span>
          </div>
          <div className="sf-actions-stack">
            {PICKS.map((pick) => (
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
            If nothing comes to mind, here's what others have been asking
            lately:
          </p>
          <div className="sf-postscript-list">
            {PS_SUGGESTIONS.map((suggestion) => (
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
