/**
 * ObservabilityPanel — OTEL / X-Ray trace viewer for /workshop card.
 *
 * Pre-Week-3 layout pass: rendered inline in the /workshop detail slot
 * (artifact pattern) rather than a full-screen modal. Cream/ink boutique
 * palette. Lists OTLP status + recent trace ids + a CloudWatch deep
 * link.
 *
 * Kept narrow — the cross-cutting role means attendees dip in for a
 * trace id and dip out. The content surface is intentionally smaller
 * than the atelier-arch/* detail pages.
 */
import { useCallback, useEffect, useState } from 'react'
import { Activity, ExternalLink, RefreshCw, CheckCircle2, XCircle, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'
const OK_GREEN = '#047857'
const ERR_RED = '#b91c1c'

interface OtelStatus {
  enabled: boolean
  service_name: string
  endpoint: string
  recent_traces: Array<{
    trace_id: string
    timestamp: string
    duration_ms: number
    spans: number
  }>
}

export default function ObservabilityPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<OtelStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/agentcore/observability/status`)
      if (res.ok) setStatus(await res.json())
    } catch (e) {
      console.warn('Failed to fetch OTEL status:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const region = import.meta.env.VITE_AWS_REGION || 'us-west-2'

  return (
    <section
      data-testid="observability-panel"
      className="h-full flex flex-col overflow-hidden rounded-2xl"
      style={{ background: CREAM, border: `1px solid ${INK_QUIET}30` }}
    >
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${INK_QUIET}25`, background: CREAM_WARM }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}
          >
            <Activity className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: INK, fontFamily: "'Iowan Old Style', Georgia, 'Times New Roman', serif" }}
            >
              Observability
            </h2>
            <p className="text-xs" style={{ color: INK_QUIET }}>
              OTEL traces · CloudWatch X-Ray
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="refresh observability status"
            onClick={fetchStatus}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="close observability panel"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* OTEL status */}
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: `1px solid ${INK_QUIET}30`,
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            {status?.enabled ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: OK_GREEN }} />
            ) : (
              <XCircle className="w-4 h-4" style={{ color: ERR_RED }} />
            )}
            <span className="text-sm font-medium" style={{ color: INK }}>
              OTLP exporter: {status?.enabled ? 'active' : 'inactive'}
            </span>
          </div>
          {status?.enabled && (
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[12px]">
              <span style={{ color: INK_QUIET }}>service</span>
              <span className="font-mono" style={{ color: INK }}>
                {status.service_name}
              </span>
              <span style={{ color: INK_QUIET }}>endpoint</span>
              <span className="font-mono truncate" style={{ color: INK }}>
                {status.endpoint}
              </span>
            </div>
          )}
        </div>

        {/* Trace flow */}
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: `1px solid ${INK_QUIET}30`,
          }}
        >
          <p
            className="text-[10.5px] uppercase tracking-[1.5px] font-semibold mb-2.5"
            style={{ color: INK_QUIET }}
          >
            Trace flow
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
            {['client', 'fastapi', 'strands', 'otlp', 'x-ray'].map((node, i, arr) => (
              <div key={node} className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded"
                  style={{
                    background: CREAM_WARM,
                    color: INK,
                    border: `1px solid ${INK_QUIET}35`,
                  }}
                >
                  {node}
                </span>
                {i < arr.length - 1 && <span style={{ color: INK_QUIET }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Recent traces */}
        <div>
          <p
            className="text-[10.5px] uppercase tracking-[1.5px] font-semibold mb-2"
            style={{ color: INK_QUIET }}
          >
            Recent traces
          </p>
          {status?.recent_traces && status.recent_traces.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {status.recent_traces.map((trace, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${INK_QUIET}25` }}
                >
                  <div>
                    <p className="text-[12px] font-mono" style={{ color: INK }}>
                      {trace.trace_id}
                    </p>
                    <p
                      className="text-[10.5px] mt-0.5 font-mono"
                      style={{ color: INK_QUIET }}
                    >
                      {trace.spans} spans · {trace.duration_ms}ms ·{' '}
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <a
                    href={`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#xray:traces/${trace.trace_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                    style={{ color: INK_QUIET }}
                    title="View in CloudWatch"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-[13px]" style={{ color: INK_QUIET }}>
              {loading ? 'Loading traces…' : 'No traces yet. Chat with the agent to generate traces.'}
            </div>
          )}
        </div>

        {/* CloudWatch deep link */}
        <a
          href={`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#xray:service-map/map`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: INK, color: CREAM }}
        >
          <ExternalLink className="w-4 h-4" />
          Open CloudWatch X-Ray console
        </a>
      </div>
    </section>
  )
}
