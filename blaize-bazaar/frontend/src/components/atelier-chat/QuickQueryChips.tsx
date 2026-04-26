/**
 * QuickQueryChips — "● TRY ASKING" strip shown beneath a completed
 * turn, offering one-click follow-ups.
 *
 * Displays above the composer between turns so the chat stays warm.
 * Copy lives in a small const array here; no dynamic suggestion
 * generation — that's a future Replay Mode concern.
 */

const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'

export interface QuickQueryChipsProps {
  queries: string[]
  /** Fires with the chip's raw query text on click. */
  onPick: (query: string) => void
  /** Disable all chips while a request is mid-flight. */
  disabled?: boolean
}

export default function QuickQueryChips({
  queries,
  onPick,
  disabled,
}: QuickQueryChipsProps) {
  return (
    <div
      data-testid="quick-query-chips"
      className="mt-5 pt-4"
      style={{ borderTop: '1px solid rgba(45, 24, 16, 0.1)' }}
    >
      <div
        className="text-[10px] uppercase mb-[9px]"
        style={{ color: INK_QUIET, letterSpacing: '0.16em' }}
      >
        <span style={{ color: ACCENT }}>●</span>
        &nbsp;&nbsp;Try asking
      </div>
      <div className="flex flex-wrap gap-1.5">
        {queries.map((q) => (
          <button
            key={q}
            type="button"
            data-testid={`quick-query-chip-${q}`}
            disabled={disabled}
            onClick={() => onPick(q)}
            className="px-3 py-[5px] rounded-full text-[11px] italic transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{
              background: 'white',
              color: INK_SOFT,
              border: '1px solid rgba(45, 24, 16, 0.14)',
            }}
          >
            "{q}"
          </button>
        ))}
      </div>
    </div>
  )
}
