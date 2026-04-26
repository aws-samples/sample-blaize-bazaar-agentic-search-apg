/**
 * RuntimeStatusPanel — Local vs AgentCore Runtime execution status.
 *
 * Pre-Week-3 layout pass: inline content inside /workshop detail slot,
 * cream/ink boutique palette, no modal chrome. Shows whether the
 * orchestrator is running in-process or invoking a deployed Runtime
 * endpoint, plus the deploy command trio.
 */
import { useCallback, useEffect, useState } from 'react'
import { Server, RefreshCw, CheckCircle2, Cloud, Monitor, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'
const OK_GREEN = '#047857'
const ERR_RED = '#b91c1c'

interface RuntimeStatus {
  mode: 'local' | 'agentcore'
  endpoint: string
  healthy: boolean
  latency_ms?: number
}

export default function RuntimeStatusPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/agentcore/runtime/status`)
      if (res.ok) setStatus(await res.json())
    } catch (e) {
      console.warn('Failed to fetch runtime status:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const isLocal = status?.mode === 'local'
  const isAgentcore = status?.mode === 'agentcore'

  return (
    <section
      data-testid="runtime-status-panel"
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
            <Server className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: INK, fontFamily: "'Iowan Old Style', Georgia, 'Times New Roman', serif" }}
            >
              AgentCore Runtime
            </h2>
            <p className="text-xs" style={{ color: INK_QUIET }}>
              Execution environment · local vs managed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="refresh runtime status"
            onClick={fetchStatus}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="close runtime panel"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Mode cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3.5"
            style={{
              background: isLocal ? `${ACCENT}10` : 'rgba(255,255,255,0.6)',
              border: `1px solid ${isLocal ? `${ACCENT}60` : `${INK_QUIET}30`}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Monitor
                className="w-4 h-4"
                style={{ color: isLocal ? ACCENT : INK_QUIET }}
              />
              <span className="text-sm font-medium" style={{ color: INK }}>
                Local
              </span>
            </div>
            <p className="text-[11px]" style={{ color: INK_QUIET }}>
              FastAPI on localhost
            </p>
            {isLocal && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3" style={{ color: OK_GREEN }} />
                <span className="text-[10.5px] font-mono uppercase" style={{ color: OK_GREEN }}>
                  Active
                </span>
              </div>
            )}
          </div>

          <div
            className="rounded-xl p-3.5"
            style={{
              background: isAgentcore ? `${ACCENT}10` : 'rgba(255,255,255,0.6)',
              border: `1px solid ${isAgentcore ? `${ACCENT}60` : `${INK_QUIET}30`}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cloud
                className="w-4 h-4"
                style={{ color: isAgentcore ? ACCENT : INK_QUIET }}
              />
              <span className="text-sm font-medium" style={{ color: INK }}>
                AgentCore
              </span>
            </div>
            <p className="text-[11px]" style={{ color: INK_QUIET }}>
              Bedrock managed Runtime
            </p>
            {isAgentcore && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3" style={{ color: OK_GREEN }} />
                <span className="text-[10.5px] font-mono uppercase" style={{ color: OK_GREEN }}>
                  Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        {status && (
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
              Runtime details
            </p>
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-[12px]">
              <span style={{ color: INK_QUIET }}>mode</span>
              <span className="font-mono" style={{ color: INK }}>
                {status.mode}
              </span>
              <span style={{ color: INK_QUIET }}>endpoint</span>
              <span
                className="font-mono text-[10.5px] truncate"
                style={{ color: INK }}
                title={status.endpoint}
              >
                {status.endpoint}
              </span>
              <span style={{ color: INK_QUIET }}>health</span>
              <span
                className="font-mono uppercase text-[11px]"
                style={{ color: status.healthy ? OK_GREEN : ERR_RED }}
              >
                {status.healthy ? 'healthy' : 'unhealthy'}
              </span>
              {status.latency_ms !== undefined && (
                <>
                  <span style={{ color: INK_QUIET }}>latency</span>
                  <span className="font-mono" style={{ color: INK }}>
                    {status.latency_ms}ms
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Deploy hint */}
        <div
          className="rounded-xl p-3.5"
          style={{
            background: CREAM_WARM,
            border: `1px dashed ${INK_QUIET}50`,
          }}
        >
          <p
            className="text-[10.5px] uppercase tracking-[1.5px] font-semibold mb-2"
            style={{ color: INK_QUIET }}
          >
            Deploy to AgentCore
          </p>
          <ol className="flex flex-col gap-1 font-mono text-[11.5px]" style={{ color: INK_SOFT }}>
            <li>$ pip install bedrock-agentcore</li>
            <li>$ agentcore configure</li>
            <li>$ agentcore launch</li>
          </ol>
        </div>
      </div>
    </section>
  )
}
