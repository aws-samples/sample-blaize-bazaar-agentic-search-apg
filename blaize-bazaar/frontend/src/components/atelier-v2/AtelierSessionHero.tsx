/**
 * AtelierSessionHero — editorial header for the live Atelier session.
 *
 * Renders as the first surface below the top bar and sets the tone for the
 * whole trace. Four tiers of type carry the content hierarchy:
 *
 *   1. EYEBROW — "LIVE SESSION · #7F5A" in Inter small-caps with a burgundy
 *      indicator dot to match the ATELIER label on the top bar.
 *   2. HEADLINE — the user's most recent query, rendered in Fraunces italic
 *      at a fluid ~56px. Defaults to "Ready when you are." as a graceful
 *      placeholder before a query exists.
 *   3. ATTRIBUTION — muted Fraunces italic line naming the agent on stage
 *      and the timestamp of the query.
 *   4. SUBTITLE — two Inter lines reinforcing the "real-time reasoning"
 *      promise of the Atelier.
 *
 * Pure display component, no side effects.
 */
export interface AtelierSessionHeroProps {
  /** Last user query; falls back to "Ready when you are." */
  query?: string
  /** Short session identifier shown in the eyebrow, e.g. "7F5A". */
  sessionId?: string
  /** Agent handling the current step, e.g. "Style Advisor". */
  agentName?: string
  /** Human-readable clock time for the query, e.g. "10:42 AM". */
  timestamp?: string
}

export function AtelierSessionHero({
  query,
  sessionId = '7F5A',
  agentName = 'Style Advisor',
  timestamp = '10:42 AM',
}: AtelierSessionHeroProps) {
  const headline = query && query.trim().length > 0 ? query : 'Ready when you are.'

  const eyebrowStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(31, 20, 16, 0.66)',
  }

  return (
    <section
      style={{
        background: '#faf3e8',
        padding: '40px 48px',
        maxWidth: '1200px',
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: '48px' }}>
        <div style={{ flex: 1 }}>
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '20px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '999px',
                background: '#c44536',
                display: 'inline-block',
              }}
            />
            <span className="font-sans" style={eyebrowStyle}>Live session · #{sessionId}</span>
          </div>

          <h1
            className="text-display italic text-espresso"
            style={{
              fontSize: 'clamp(36px, 4.5vw, 56px)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {headline}
          </h1>

          <p
            className="font-display italic text-ink-quiet"
            style={{
              fontSize: '13px',
              margin: '16px 0 0',
            }}
          >
            Agent: {agentName} · {timestamp}
          </p>

          <div style={{ marginTop: '24px' }}>
            <p
              className="text-body"
              style={{
                color: 'rgba(31, 20, 16, 0.66)',
                margin: 0,
              }}
            >
              The Atelier is reasoning in real time.
            </p>
            <p
              className="text-body"
              style={{
                color: 'rgba(31, 20, 16, 0.66)',
                margin: '2px 0 0',
              }}
            >
              Every step is logged. Every decision is intentional.
            </p>
          </div>
        </div>

        <div
          aria-hidden
          style={{
            width: '120px',
            height: '120px',
            flexShrink: 0,
            background:
              'radial-gradient(circle at 30% 30%, rgba(196, 69, 54, 0.12), transparent 60%), radial-gradient(circle at 70% 80%, rgba(31, 20, 16, 0.06), transparent 65%)',
            borderRadius: '999px',
          }}
        />
      </div>
    </section>
  )
}

export default AtelierSessionHero
