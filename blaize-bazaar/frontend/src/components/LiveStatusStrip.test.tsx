/**
 * LiveStatusStrip tests — the reassuring status line above the category chips.
 *
 * Validates Requirements 1.5.1 and 1.5.2.
 *
 * Coverage:
 *   - Renders the verbatim `LIVE_STATUS` copy plus the Shipping /
 *     Returns / Secure checkout links (Req 1.5.1).
 *   - Calls `GET /api/inventory` exactly once on mount.
 *   - Hides the stale-data warning when the endpoint returns `stale: false`
 *     (Req 1.5.2).
 *   - Shows the stale-data warning when the endpoint returns `stale: true`
 *     (task 4.5 acceptance).
 *   - Tolerates fetch failures: the base strip still renders and the
 *     warning is absent.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import LiveStatusStrip, {
  INVENTORY_ENDPOINT,
  type InventorySignal,
} from './LiveStatusStrip'

function mockFetchWith(body: InventorySignal, { ok = true }: { ok?: boolean } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

describe('LiveStatusStrip — static copy (Req 1.5.1)', () => {
  it('renders the LIVE_STATUS line and the three right-side links', async () => {
    const fetchImpl = mockFetchWith({
      last_refreshed: new Date().toISOString(),
      counts: { Linen: 2 },
      stale: false,
    })

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    // Static strip copy is present before any network work.
    expect(screen.getByTestId('live-status-copy')).toHaveTextContent(
      /Live inventory/,
    )
    expect(screen.getByTestId('live-status-copy')).toHaveTextContent(
      /refreshed daily/,
    )
    expect(screen.getByTestId('live-status-copy')).toHaveTextContent(
      /curated by hand/,
    )
    expect(screen.getByTestId('live-status-shipping')).toHaveTextContent(
      /Free shipping over \$150/,
    )
    expect(screen.getByTestId('live-status-returns')).toHaveTextContent(
      /Ships within 1 to 2 days/,
    )
    expect(screen.getByTestId('live-status-secure')).toHaveTextContent(
      'Secure checkout',
    )

    // Let the effect resolve so vitest doesn't warn about act().
    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalled()
    })
  })
})

describe('LiveStatusStrip — fetch contract (Req 1.5.2)', () => {
  it('calls /api/inventory exactly once on mount', async () => {
    const fetchImpl = mockFetchWith({
      last_refreshed: new Date().toISOString(),
      counts: {},
      stale: false,
    })

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })
    expect(fetchImpl).toHaveBeenCalledWith(INVENTORY_ENDPOINT)
  })

  it('does NOT show the stale warning when stale=false (Req 1.5.2)', async () => {
    const fetchImpl = mockFetchWith({
      last_refreshed: new Date().toISOString(),
      counts: { Linen: 5 },
      stale: false,
    })

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    // Wait for the fetch to resolve and state to settle.
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())

    expect(
      screen.queryByTestId('live-status-stale-warning'),
    ).not.toBeInTheDocument()
  })

  it('shows the stale warning copy when stale=true', async () => {
    const fetchImpl = mockFetchWith({
      last_refreshed: new Date(Date.now() - 48 * 3600_000).toISOString(),
      counts: { Linen: 5 },
      stale: true,
    })

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    const warning = await screen.findByTestId('live-status-stale-warning')
    expect(warning).toHaveTextContent(/Catalog refreshing/)
  })
})

describe('LiveStatusStrip — resilience', () => {
  it('leaves the base strip visible when the fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())

    expect(screen.getByTestId('live-status-strip')).toBeInTheDocument()
    expect(
      screen.queryByTestId('live-status-stale-warning'),
    ).not.toBeInTheDocument()
  })

  it('leaves the base strip visible when the response is non-ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response)

    render(<LiveStatusStrip fetchImpl={fetchImpl as unknown as typeof fetch} />)

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())

    expect(screen.getByTestId('live-status-strip')).toBeInTheDocument()
    expect(
      screen.queryByTestId('live-status-stale-warning'),
    ).not.toBeInTheDocument()
  })
})
