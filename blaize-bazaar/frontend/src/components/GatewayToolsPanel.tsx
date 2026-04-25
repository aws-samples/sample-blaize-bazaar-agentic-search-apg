/**
 * GatewayToolsPanel — Card 7 "Tool Registry · Gateway".
 *
 * Week 2 dual-ranking view (Aurora pgvector teaching vs AgentCore
 * Gateway production), re-skinned in the pre-Week-3 layout pass to the
 * boutique cream/ink palette and rendered inline inside the /workshop
 * detail slot (artifact pattern) rather than a full-screen modal.
 *
 * Key UX rules preserved from Week 2:
 *   - Gateway-unset banner is deliberately loud (amber warning at the
 *     top, not a greyed footer). Attendees tell dual-rank vs single-
 *     source at a glance.
 *   - Interactive query input re-fetches ranking.
 *   - Both columns render even when one side is empty/unconfigured.
 */
import { useCallback, useEffect, useState } from 'react'
import { Wrench, RefreshCw, Database, Globe, AlertTriangle, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'
const AMBER_FG = '#b45309'
const AMBER_BG = '#fef3c7'
const AMBER_BORDER = '#fcd34d'
const CYAN_FG = '#0369a1'
const CYAN_BORDER = '#7dd3fc'

interface PgvectorRow {
  tool_id: string
  name: string
  description: string
  similarity: number
}

interface GatewayTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface ToolRegistryResponse {
  query: string
  pgvector: {
    rows: PgvectorRow[]
    duration_ms: number
    total_count: number
    error: string | null
  }
  gateway: {
    configured: boolean
    url: string | null
    tools: GatewayTool[]
    error: string | null
  }
}

const DEFAULT_QUERY = 'show me something for long summer walks'

export default function GatewayToolsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ToolRegistryResponse | null>(null)
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [pendingQuery, setPendingQuery] = useState(DEFAULT_QUERY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRanking = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/workshop/tool-registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 3 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as ToolRegistryResponse
      setData(body)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRanking(DEFAULT_QUERY)
  }, [fetchRanking])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = pendingQuery.trim()
    if (!trimmed) return
    setQuery(trimmed)
    fetchRanking(trimmed)
  }

  const gatewayConfigured = data?.gateway.configured ?? false

  return (
    <section
      data-testid="card-7-panel"
      className="h-full flex flex-col overflow-hidden rounded-2xl"
      style={{ background: CREAM, border: `1px solid ${INK_QUIET}30` }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${INK_QUIET}25`, background: CREAM_WARM }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}
          >
            <Wrench className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: INK, fontFamily: "'Fraunces', serif" }}
            >
              Tool Registry · Gateway
            </h2>
            <p className="text-xs" style={{ color: INK_QUIET }}>
              Aurora pgvector (teaching) vs AgentCore Gateway (production)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="refresh rankings"
            onClick={() => fetchRanking(query)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="close tool registry panel"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Gateway-unset banner — loud and boutique-palette. */}
        {data && !gatewayConfigured && (
          <div
            data-testid="gateway-unset-banner"
            className="rounded-xl p-3.5 flex gap-3"
            style={{
              background: AMBER_BG,
              border: `2px solid ${AMBER_BORDER}`,
            }}
          >
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: AMBER_FG }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: AMBER_FG }}>
                Gateway not configured — showing Aurora ranking only
              </p>
              <p className="text-[12px] mt-1 leading-[1.5]" style={{ color: AMBER_FG }}>
                Set{' '}
                <code
                  className="font-mono px-1 py-0.5 rounded text-[11px]"
                  style={{ background: 'rgba(0,0,0,0.06)', color: INK }}
                >
                  AGENTCORE_GATEWAY_URL
                </code>{' '}
                in{' '}
                <code
                  className="font-mono px-1 py-0.5 rounded text-[11px]"
                  style={{ background: 'rgba(0,0,0,0.06)', color: INK }}
                >
                  blaize-bazaar/backend/.env
                </code>{' '}
                to see the side-by-side dual ranking.
              </p>
            </div>
          </div>
        )}

        {/* Query input */}
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            data-testid="card-7-query-input"
            type="text"
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
            placeholder="Demo query…"
            className="flex-1 px-3.5 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.75)',
              border: `1px solid ${INK_QUIET}40`,
              color: INK,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-85"
            style={{ background: INK, color: CREAM }}
          >
            Rank
          </button>
        </form>

        {error && (
          <div
            className="px-3.5 py-2.5 rounded-lg text-[13px]"
            style={{
              background: '#fee2e2',
              border: `1px solid #fca5a5`,
              color: '#991b1b',
            }}
          >
            Failed to load rankings: {error}
          </div>
        )}

        {/* Dual column body */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* Left: Aurora pgvector (teaching) */}
          <section
            data-testid="card-7-pgvector-column"
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: `1px solid ${INK_QUIET}30`,
            }}
          >
            <header className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4" style={{ color: CYAN_FG }} />
              <span className="text-sm font-semibold" style={{ color: INK }}>
                Aurora pgvector
              </span>
              <span
                className="font-mono text-[9.5px] tracking-[1.5px] uppercase px-1.5 py-0.5 rounded"
                style={{
                  color: AMBER_FG,
                  background: AMBER_BG,
                  border: `1px solid ${AMBER_BORDER}`,
                }}
              >
                Teaching
              </span>
            </header>
            <p className="text-[11.5px] leading-[1.55] mb-3" style={{ color: INK_SOFT }}>
              Top-K by cosine similarity on{' '}
              <code
                className="font-mono px-1 rounded text-[10.5px]"
                style={{ background: 'rgba(0,0,0,0.05)', color: INK }}
              >
                tools.description_emb
              </code>
              . The same primitive Gateway provides, implemented directly on your table.
            </p>
            {data?.pgvector.rows.length ? (
              <ol className="flex flex-col gap-2">
                {data.pgvector.rows.map((r, i) => (
                  <li
                    key={r.tool_id}
                    className="flex items-start gap-3 p-2.5 rounded-lg"
                    style={{ background: CREAM_WARM }}
                  >
                    <span className="font-mono text-[10px] pt-0.5" style={{ color: INK_QUIET }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-mono truncate"
                        style={{ color: INK }}
                      >
                        {r.name}
                      </p>
                      <p
                        className="text-[11.5px] mt-0.5 line-clamp-2"
                        style={{ color: INK_SOFT }}
                      >
                        {r.description}
                      </p>
                    </div>
                    <span
                      className="font-mono text-[11px] pt-0.5"
                      style={{ color: INK_SOFT }}
                    >
                      {r.similarity.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-[12px] py-6 text-center" style={{ color: INK_QUIET }}>
                {data?.pgvector.error
                  ? `error: ${data.pgvector.error}`
                  : data?.pgvector.total_count === 0
                  ? 'No tools indexed yet. Run scripts/seed_tool_registry.py.'
                  : 'Loading…'}
              </div>
            )}
            {data && (
              <footer
                className="mt-3 pt-3 flex items-center justify-between text-[10.5px] font-mono"
                style={{
                  borderTop: `1px solid ${INK_QUIET}25`,
                  color: INK_QUIET,
                }}
              >
                <span>{data.pgvector.total_count} tool(s) indexed</span>
                <span>{data.pgvector.duration_ms}ms</span>
              </footer>
            )}
          </section>

          {/* Right: AgentCore Gateway (production) */}
          <section
            data-testid="card-7-gateway-column"
            className="rounded-xl p-4"
            style={{
              background: gatewayConfigured ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${INK_QUIET}30`,
            }}
          >
            <header className="flex items-center gap-2 mb-3">
              <Globe
                className="w-4 h-4"
                style={{ color: gatewayConfigured ? ACCENT : INK_QUIET }}
              />
              <span className="text-sm font-semibold" style={{ color: INK }}>
                AgentCore Gateway
              </span>
              <span
                className="font-mono text-[9.5px] tracking-[1.5px] uppercase px-1.5 py-0.5 rounded"
                style={
                  gatewayConfigured
                    ? {
                        color: CYAN_FG,
                        background: 'rgba(125,211,252,0.15)',
                        border: `1px solid ${CYAN_BORDER}`,
                      }
                    : {
                        color: INK_QUIET,
                        background: 'rgba(0,0,0,0.04)',
                        border: `1px solid ${INK_QUIET}40`,
                      }
                }
              >
                {gatewayConfigured ? 'Production' : 'Not Configured'}
              </span>
            </header>
            <p className="text-[11.5px] leading-[1.55] mb-3" style={{ color: INK_SOFT }}>
              Full tool catalog published via MCP streamable-http. Auth, schema validation, and
              discovery are Gateway's job, not yours.
            </p>
            {gatewayConfigured ? (
              data?.gateway.tools.length ? (
                <ul className="flex flex-col gap-2">
                  {data.gateway.tools.slice(0, 9).map((t) => (
                    <li
                      key={t.name}
                      className="p-2.5 rounded-lg"
                      style={{ background: CREAM_WARM }}
                    >
                      <p className="text-[13px] font-mono truncate" style={{ color: INK }}>
                        {t.name}
                      </p>
                      <p
                        className="text-[11.5px] mt-0.5 line-clamp-2"
                        style={{ color: INK_SOFT }}
                      >
                        {t.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[12px] py-6 text-center" style={{ color: INK_QUIET }}>
                  {data?.gateway.error ? `error: ${data.gateway.error}` : 'Loading…'}
                </div>
              )
            ) : (
              <div className="text-center py-6 flex flex-col items-center gap-2">
                <Globe className="w-7 h-7" style={{ color: INK_QUIET }} />
                <p
                  className="text-[12px] leading-[1.55] max-w-xs"
                  style={{ color: INK_QUIET }}
                >
                  Gateway is the production tool-discovery primitive. See the banner above for
                  configuration.
                </p>
              </div>
            )}
            {data && gatewayConfigured && (
              <footer
                className="mt-3 pt-3 text-[10.5px] font-mono"
                style={{ borderTop: `1px solid ${INK_QUIET}25`, color: INK_QUIET }}
              >
                {data.gateway.tools.length} tool(s) via MCP
              </footer>
            )}
          </section>
        </div>

        {/* Teaching footer */}
        <div
          className="rounded-xl p-3.5 text-[12px] leading-[1.6]"
          style={{
            background: CREAM_WARM,
            border: `1px dashed ${INK_QUIET}50`,
            color: INK_SOFT,
          }}
        >
          <span className="font-semibold" style={{ color: INK }}>
            Teaching moment:
          </span>{' '}
          both columns rank the same 9 tools. Aurora shows{' '}
          <em>how</em> similarity search picks tools; Gateway abstracts that away behind a managed
          MCP endpoint. In production you'd use Gateway; this card exists to demystify what Gateway
          does for you.
        </div>
      </div>
    </section>
  )
}
