/**
 * SessionHeader — top-of-right-rail session identity strip.
 *
 * Small, letter-spaced uppercase labels in ink-quiet, monospace values
 * in ink. Sits directly above the TabNav on the Atelier's right rail.
 *
 * Left side: session id (short, stable per session) + customer name.
 * Right side: elapsed wall-clock ms of the current turn (or em-dash
 * pre-turn).
 *
 * Thin ink-quiet rule below separates the session strip from the
 * tablist that follows.
 */

const INK = '#2d1810'
const INK_QUIET = '#a68668'

export interface SessionHeaderProps {
  /** Short session id (backend-assigned, e.g. "39b5f398"). */
  sessionId: string | null
  /** Customer label. Anonymous ⇒ "Anonymous". */
  customerLabel: string
  /** Wall-clock ms since the first event of the current turn. */
  elapsedMs: number | null
}

export default function SessionHeader({
  sessionId,
  customerLabel,
  elapsedMs,
}: SessionHeaderProps) {
  return (
    <div
      data-testid="session-header"
      className="flex justify-between items-baseline pb-[14px] mb-[18px]"
      style={{ borderBottom: '1px solid rgba(45, 24, 16, 0.10)' }}
    >
      <div>
        <div
          className="text-[10px] uppercase mb-[5px]"
          style={{ color: INK_QUIET, letterSpacing: '0.18em' }}
        >
          Session
        </div>
        <div className="font-mono text-[13px]" style={{ color: INK }}>
          {(sessionId ?? '—')}
          <span style={{ color: INK_QUIET }}> · </span>
          {customerLabel}
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-[10px] uppercase mb-[5px]"
          style={{ color: INK_QUIET, letterSpacing: '0.18em' }}
        >
          Elapsed
        </div>
        <div className="font-mono text-[13px]" style={{ color: INK }}>
          {elapsedMs === null ? '—' : `${elapsedMs}ms`}
        </div>
      </div>
    </div>
  )
}
