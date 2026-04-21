/**
 * LiveStatusStrip — the reassuring status line above the category chips.
 *
 * Validates Requirements 1.5.1 and 1.5.2.
 *
 * Behavior:
 *   - Fetches `GET /api/inventory` on mount, reading the shape
 *     `{ last_refreshed: string, counts: Record<string, number>, stale: boolean }`
 *     returned by the backend route at `routes/products.py`.
 *   - Renders the `LIVE_STATUS` copy alongside Shipping / Returns /
 *     Secure checkout links (Req 1.5.1).
 *   - Hides the stale-data warning when `stale=false` (Req 1.5.2).
 *   - Surfaces an amber warning line with `ERRORS.STATUS_STRIP_STALE`
 *     when `stale=true` (Req 1.5.2 is "when recent, no warning"; the
 *     converse is the task's "shows stale-data warning if stale=true").
 *   - Tolerates fetch failures gracefully: the static copy stays on the
 *     strip and no warning is shown. Keeps the UI from flashing amber
 *     when the network is simply slow.
 */
import { useEffect, useState } from 'react'
import {
  LIVE_STATUS,
  SHIPPING,
  RETURNS,
  SECURE_CHECKOUT,
  ERRORS,
} from '../copy'

// --- Design tokens (storefront.md) --------------------------------------
const CREAM = '#fbf4e8'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const ACCENT = '#c44536'

// Amber warning tone for the stale-data strip. Warmer than a cold amber to
// stay inside the storefront palette; derived from the accent + cream-warm.
const STALE_AMBER = '#a86a2a'

// Shape of the `/api/inventory` response. Matches backend routes/products.py.
export interface InventorySignal {
  last_refreshed: string
  counts: Record<string, number>
  stale: boolean
}

// Exported so tests can override the endpoint path without touching fetch.
export const INVENTORY_ENDPOINT = '/api/inventory'

interface LiveStatusStripProps {
  /**
   * Optional injector used by tests. Defaults to the global `fetch` so the
   * component reads the real endpoint in production.
   */
  fetchImpl?: typeof fetch
}

export default function LiveStatusStrip({ fetchImpl }: LiveStatusStripProps = {}) {
  const [signal, setSignal] = useState<InventorySignal | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const f = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null)
      if (!f) return
      try {
        const resp = await f(INVENTORY_ENDPOINT)
        if (!resp.ok) return
        const body = (await resp.json()) as InventorySignal
        if (!cancelled) setSignal(body)
      } catch {
        // Swallow — keep the static strip copy visible on network failure.
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fetchImpl])

  const stale = signal?.stale === true

  return (
    <section
      data-testid="live-status-strip"
      aria-label="Live inventory status"
      className="w-full border-y"
      style={{
        background: CREAM,
        color: INK,
        borderColor: 'rgba(45, 24, 16, 0.08)',
        padding: '10px 24px',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span
            data-testid="live-status-pulse-dot"
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: ACCENT,
              boxShadow: `0 0 0 0 ${ACCENT}`,
              animation: 'pulse-glow 2s infinite',
            }}
          />
          <span
            data-testid="live-status-copy"
            style={{
              fontSize: '12px',
              letterSpacing: '0.04em',
              color: INK_SOFT,
            }}
          >
            {LIVE_STATUS}
          </span>
        </div>
        <div
          className="flex items-center gap-4"
          style={{
            fontSize: '12px',
            color: INK_SOFT,
            letterSpacing: '0.04em',
          }}
        >
          <span
            data-testid="live-status-shipping"
            style={{ color: INK_SOFT }}
          >
            {SHIPPING}
          </span>
          <span
            data-testid="live-status-returns"
            style={{ color: INK_SOFT }}
          >
            {RETURNS}
          </span>
          <span
            data-testid="live-status-secure"
            style={{ color: INK_SOFT }}
          >
            {SECURE_CHECKOUT}
          </span>
        </div>
      </div>
      {stale && (
        <div
          data-testid="live-status-stale-warning"
          role="status"
          className="mx-auto mt-2 flex max-w-6xl items-center justify-center gap-2 md:justify-start"
          style={{
            color: STALE_AMBER,
            fontSize: '12px',
            letterSpacing: '0.04em',
          }}
        >
          <span aria-hidden="true">•</span>
          <span>{ERRORS.STATUS_STRIP_STALE}</span>
        </div>
      )}
    </section>
  )
}
