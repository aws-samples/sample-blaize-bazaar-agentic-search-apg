/**
 * ObservabilityPanel — CloudWatch/X-Ray trace viewer for Lab 4d.
 * Shows OTEL status, recent trace IDs, and links to CloudWatch console.
 */
import { useState, useEffect } from 'react'
import { Activity, ExternalLink, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

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

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/agentcore/observability/status`)
      if (res.ok) {
        setStatus(await res.json())
      }
    } catch (e) {
      console.warn('Failed to fetch OTEL status:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const region = import.meta.env.VITE_AWS_REGION || 'us-west-2'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Observability</h2>
              <p className="text-xs text-white/40">CloudWatch X-Ray Traces</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* OTEL Status Badge */}
        <div className="mb-6 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-3">
            {status?.enabled ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm font-medium text-white">
              OTLP Exporter: {status?.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          {status?.enabled && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-white/40">Service:</span>
                <span className="ml-2 text-white/70">{status.service_name}</span>
              </div>
              <div>
                <span className="text-white/40">Endpoint:</span>
                <span className="ml-2 text-white/70 truncate">{status.endpoint}</span>
              </div>
            </div>
          )}
        </div>

        {/* Architecture Diagram */}
        <div className="mb-6 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">Trace Flow</p>
          <div className="flex items-center justify-between text-xs text-white/60 font-mono">
            <div className="text-center">
              <div className="w-16 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-1">
                <span className="text-amber-400 text-[10px]">Client</span>
              </div>
            </div>
            <span className="text-white/20">&rarr;</span>
            <div className="text-center">
              <div className="w-16 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-1">
                <span className="text-blue-400 text-[10px]">FastAPI</span>
              </div>
            </div>
            <span className="text-white/20">&rarr;</span>
            <div className="text-center">
              <div className="w-16 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-1">
                <span className="text-emerald-400 text-[10px]">Strands</span>
              </div>
            </div>
            <span className="text-white/20">&rarr;</span>
            <div className="text-center">
              <div className="w-16 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-1">
                <span className="text-violet-400 text-[10px]">OTLP</span>
              </div>
            </div>
            <span className="text-white/20">&rarr;</span>
            <div className="text-center">
              <div className="w-16 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-1">
                <span className="text-orange-400 text-[10px]">X-Ray</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Traces */}
        <div>
          <p className="text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">Recent Traces</p>
          {status?.recent_traces && status.recent_traces.length > 0 ? (
            <div className="space-y-2">
              {status.recent_traces.map((trace, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-xs font-mono text-white/70">{trace.trace_id}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {trace.spans} spans &middot; {trace.duration_ms}ms &middot; {new Date(trace.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <a
                    href={`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#xray:traces/${trace.trace_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-violet-400 transition-colors"
                    title="View in CloudWatch"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">
              {loading ? 'Loading traces...' : 'No traces yet. Chat with the agent to generate traces.'}
            </div>
          )}
        </div>

        {/* CloudWatch Console Link */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <a
            href={`https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#xray:service-map/map`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm hover:bg-violet-500/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open CloudWatch X-Ray Console
          </a>
        </div>
      </div>
    </div>
  )
}
