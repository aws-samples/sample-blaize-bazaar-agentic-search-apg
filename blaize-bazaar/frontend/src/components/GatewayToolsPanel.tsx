/**
 * GatewayToolsPanel — Card 7 "Tool Registry · Gateway".
 *
 * Week 2 rewrite: dual-ranking view.
 *   Left column  — Aurora pgvector top-K for the demo query (teaching).
 *   Right column — AgentCore Gateway full tool list (production primitive).
 *
 * When AGENTCORE_GATEWAY_URL is unset, the right column shows a
 * deliberately-loud "Gateway not configured" state so attendees can tell
 * at a glance whether they're looking at dual rankings or Aurora-only
 * single-source. The banner at the top of the modal makes the same call
 * even more prominently.
 *
 * Data source: POST /api/workshop/tool-registry. The modal takes a demo
 * query (pre-filled) and re-runs on submit so attendees can explore how
 * the Aurora ranking changes with different phrasings.
 */
import { useCallback, useEffect, useState } from 'react'
import { Wrench, RefreshCw, Database, Globe, AlertTriangle } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="card-7-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Tool Registry · Gateway</h2>
              <p className="text-xs text-white/40">
                Aurora pgvector (teaching) vs AgentCore Gateway (production)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRanking(query)}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
              aria-label="refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors text-xl leading-none"
              aria-label="close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Gateway-not-configured banner — deliberately loud */}
        {data && !gatewayConfigured && (
          <div
            data-testid="gateway-unset-banner"
            className="mb-5 p-4 rounded-xl border-2 border-amber-400/50 bg-amber-400/10 flex gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-100">
                Gateway not configured — showing Aurora ranking only
              </p>
              <p className="text-xs text-amber-200/70 mt-1">
                Set <code className="font-mono px-1 rounded bg-black/30">AGENTCORE_GATEWAY_URL</code>{' '}
                in <code className="font-mono px-1 rounded bg-black/30">blaize-bazaar/backend/.env</code>{' '}
                to see the side-by-side dual-ranking (Aurora teaching ↔ Gateway production).
              </p>
            </div>
          </div>
        )}

        {/* Query input */}
        <form onSubmit={onSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
            placeholder="Demo query…"
            className="flex-1 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
            data-testid="card-7-query-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
          >
            Rank
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-200">
            Failed to load rankings: {error}
          </div>
        )}

        {/* Dual column body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Aurora pgvector */}
          <section
            data-testid="card-7-pgvector-column"
            className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4"
          >
            <header className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Aurora pgvector</span>
              <span className="font-mono text-[9.5px] tracking-[1.5px] uppercase px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">
                TEACHING
              </span>
            </header>
            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
              Top-K by cosine similarity on <code className="font-mono">tools.description_emb</code>.
              The same primitive Gateway provides, implemented directly on your table so you can see
              what the managed service does for you.
            </p>
            {data?.pgvector.rows.length ? (
              <ol className="space-y-2">
                {data.pgvector.rows.map((r, i) => (
                  <li
                    key={r.tool_id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
                  >
                    <span className="font-mono text-[10px] text-white/30 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-cyan-200 truncate">{r.name}</p>
                      <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{r.description}</p>
                    </div>
                    <span className="font-mono text-[10px] text-white/50 pt-1">
                      {r.similarity.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-xs text-white/30 py-6 text-center">
                {data?.pgvector.error ? (
                  <>error: {data.pgvector.error}</>
                ) : (
                  <>
                    {data?.pgvector.total_count === 0
                      ? 'No tools indexed yet. Run scripts/seed_tool_registry.py.'
                      : 'Loading…'}
                  </>
                )}
              </div>
            )}
            {data && (
              <footer className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30 font-mono">
                <span>{data.pgvector.total_count} tool(s) indexed</span>
                <span>{data.pgvector.duration_ms}ms</span>
              </footer>
            )}
          </section>

          {/* Right: AgentCore Gateway */}
          <section
            data-testid="card-7-gateway-column"
            className={`rounded-xl border p-4 ${
              gatewayConfigured
                ? 'border-violet-400/20 bg-violet-500/5'
                : 'border-white/5 bg-white/[0.02]'
            }`}
          >
            <header className="flex items-center gap-2 mb-3">
              <Globe
                className={`w-4 h-4 ${gatewayConfigured ? 'text-violet-400' : 'text-white/20'}`}
              />
              <span className="text-sm font-semibold text-white">AgentCore Gateway</span>
              <span
                className={`font-mono text-[9.5px] tracking-[1.5px] uppercase px-1.5 py-0.5 rounded border ${
                  gatewayConfigured
                    ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}
              >
                {gatewayConfigured ? 'PRODUCTION' : 'NOT CONFIGURED'}
              </span>
            </header>
            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
              Full tool catalog published via MCP streamable-http. The managed primitive: auth,
              schema validation, and discovery are Gateway's job, not yours.
            </p>
            {gatewayConfigured ? (
              data?.gateway.tools.length ? (
                <ul className="space-y-2">
                  {data.gateway.tools.slice(0, 9).map((t) => (
                    <li
                      key={t.name}
                      className="p-3 rounded-lg bg-white/[0.03] border border-white/5"
                    >
                      <p className="text-sm font-mono text-violet-200 truncate">{t.name}</p>
                      <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">
                        {t.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-white/30 py-6 text-center">
                  {data?.gateway.error ? <>error: {data.gateway.error}</> : 'Loading…'}
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <Globe className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/30 leading-relaxed max-w-xs mx-auto">
                  Gateway is the production tool-discovery primitive. See the banner above for
                  configuration.
                </p>
              </div>
            )}
            {data && gatewayConfigured && (
              <footer className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30 font-mono">
                {data.gateway.tools.length} tool(s) via MCP
              </footer>
            )}
          </section>
        </div>

        {/* Teaching footer */}
        <div className="mt-5 p-3 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] text-white/40 leading-relaxed">
          <span className="font-semibold text-white/70">Teaching moment:</span> both columns rank
          the same 9 tools. Aurora shows you <em>how</em> similarity search picks tools; Gateway
          abstracts that away behind a managed MCP endpoint. In production you'd use Gateway; this
          card exists to demystify what Gateway does for you.
        </div>
      </div>
    </div>
  )
}
