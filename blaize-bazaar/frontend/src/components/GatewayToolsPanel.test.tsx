/**
 * GatewayToolsPanel tests — Week 2 Card 7 dual-ranking + banner states.
 *
 * Covers:
 *   - Banner renders prominently when AGENTCORE_GATEWAY_URL is unset
 *     (the "attendees tell dual-rank vs single-source at a glance" goal).
 *   - Banner hides when Gateway is configured.
 *   - Aurora pgvector column renders ranked rows with similarity scores.
 *   - Gateway column renders the tool catalog when configured.
 *   - Gateway column shows the deliberately-loud "not configured" state
 *     when the URL is missing.
 *   - Query input re-fetches on submit.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GatewayToolsPanel from './GatewayToolsPanel'

interface MockShape {
  query: string
  pgvector: {
    rows: Array<{ tool_id: string; name: string; description: string; similarity: number }>
    duration_ms: number
    total_count: number
    error: string | null
  }
  gateway: {
    configured: boolean
    url: string | null
    tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
    error: string | null
  }
}

function mockFetch(response: MockShape) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => response,
  })
}

const BASE: MockShape = {
  query: 'show me something for long summer walks',
  pgvector: {
    rows: [
      {
        tool_id: 'search_products',
        name: 'search_products',
        description: 'Semantic product search.',
        similarity: 0.87,
      },
      {
        tool_id: 'get_trending_products',
        name: 'get_trending_products',
        description: 'Bestsellers.',
        similarity: 0.42,
      },
    ],
    duration_ms: 18,
    total_count: 9,
    error: null,
  },
  gateway: {
    configured: false,
    url: null,
    tools: [],
    error: null,
  },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GatewayToolsPanel — Gateway unset (banner + single-source)', () => {
  it('renders the visible "not configured" banner when gateway.configured is false', async () => {
    vi.stubGlobal('fetch', mockFetch(BASE))
    render(<GatewayToolsPanel onClose={() => {}} />)
    await waitFor(() =>
      expect(screen.getByTestId('gateway-unset-banner')).toBeInTheDocument(),
    )
    const banner = screen.getByTestId('gateway-unset-banner')
    expect(banner.textContent).toContain('Gateway not configured')
    expect(banner.textContent).toContain('AGENTCORE_GATEWAY_URL')
  })

  it('renders the Gateway column with a "Not Configured" label, not an empty state', async () => {
    vi.stubGlobal('fetch', mockFetch(BASE))
    render(<GatewayToolsPanel onClose={() => {}} />)
    await waitFor(() =>
      expect(screen.getByTestId('card-7-gateway-column')).toBeInTheDocument(),
    )
    const gatewayCol = screen.getByTestId('card-7-gateway-column')
    expect(gatewayCol.textContent).toContain('Not Configured')
  })

  it('still renders the Aurora pgvector ranking in single-source mode', async () => {
    vi.stubGlobal('fetch', mockFetch(BASE))
    render(<GatewayToolsPanel onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('search_products')).toBeInTheDocument())
    expect(screen.getByText('0.870')).toBeInTheDocument()
    expect(screen.getByText('get_trending_products')).toBeInTheDocument()
  })
})

describe('GatewayToolsPanel — Gateway configured (dual-rank)', () => {
  const configured: MockShape = {
    ...BASE,
    gateway: {
      configured: true,
      url: 'https://example.com/mcp',
      tools: [
        { name: 'search_products', description: 'Semantic product search.', input_schema: {} },
        { name: 'restock_product', description: 'Restock.', input_schema: {} },
      ],
      error: null,
    },
  }

  it('hides the "not configured" banner', async () => {
    vi.stubGlobal('fetch', mockFetch(configured))
    render(<GatewayToolsPanel onClose={() => {}} />)
    await waitFor(() =>
      expect(screen.getByTestId('card-7-gateway-column')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('gateway-unset-banner')).not.toBeInTheDocument()
  })

  it('renders both columns with their tool lists', async () => {
    vi.stubGlobal('fetch', mockFetch(configured))
    render(<GatewayToolsPanel onClose={() => {}} />)
    await waitFor(() =>
      expect(screen.getByTestId('card-7-gateway-column')).toBeInTheDocument(),
    )
    const pgCol = screen.getByTestId('card-7-pgvector-column')
    const gwCol = screen.getByTestId('card-7-gateway-column')
    expect(pgCol.textContent).toContain('search_products')
    // Gateway column shows both catalog tools.
    expect(gwCol.textContent).toContain('search_products')
    expect(gwCol.textContent).toContain('restock_product')
    expect(gwCol.textContent).toContain('Production')
  })
})

describe('GatewayToolsPanel — query input re-fetches', () => {
  it('re-issues the POST with the user-entered query', async () => {
    const fetchSpy = mockFetch(BASE)
    vi.stubGlobal('fetch', fetchSpy)
    const user = userEvent.setup()
    render(<GatewayToolsPanel onClose={() => {}} />)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const input = screen.getByTestId('card-7-query-input') as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'warm oversized cashmere')
    await user.click(screen.getByRole('button', { name: /^rank$/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    const secondCall = fetchSpy.mock.calls[1]
    const body = JSON.parse(secondCall[1].body as string)
    expect(body.query).toBe('warm oversized cashmere')
  })
})
