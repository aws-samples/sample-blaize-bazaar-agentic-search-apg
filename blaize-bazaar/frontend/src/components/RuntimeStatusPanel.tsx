/**
 * RuntimeStatusPanel — Shows local vs Lambda execution status for Lab 4e.
 * Displays whether the agent is running locally or on AgentCore Runtime.
 */
import { useState, useEffect } from 'react'
import { Server, RefreshCw, CheckCircle2, Cloud, Monitor } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface RuntimeStatus {
  mode: 'local' | 'agentcore'
  endpoint: string
  healthy: boolean
  latency_ms?: number
}

export default function RuntimeStatusPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/agentcore/runtime/status`)
      if (res.ok) {
        setStatus(await res.json())
      }
    } catch (e) {
      console.warn('Failed to fetch runtime status:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AgentCore Runtime</h2>
              <p className="text-xs text-white/40">Execution Environment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Local */}
          <div className={`p-4 rounded-xl border transition-colors ${
            status?.mode === 'local'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-white/5 bg-white/[0.02]'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Monitor className={`w-5 h-5 ${status?.mode === 'local' ? 'text-emerald-400' : 'text-white/20'}`} />
              <span className="text-sm font-medium text-white/80">Local</span>
            </div>
            <p className="text-[10px] text-white/40">FastAPI on localhost</p>
            {status?.mode === 'local' && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Active</span>
              </div>
            )}
          </div>

          {/* AgentCore */}
          <div className={`p-4 rounded-xl border transition-colors ${
            status?.mode === 'agentcore'
              ? 'border-orange-500/30 bg-orange-500/5'
              : 'border-white/5 bg-white/[0.02]'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Cloud className={`w-5 h-5 ${status?.mode === 'agentcore' ? 'text-orange-400' : 'text-white/20'}`} />
              <span className="text-sm font-medium text-white/80">AgentCore</span>
            </div>
            <p className="text-[10px] text-white/40">Lambda microVM</p>
            {status?.mode === 'agentcore' && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-orange-400">Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        {status && (
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">Runtime Details</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Mode</span>
                <span className="text-white/70 font-mono">{status.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Endpoint</span>
                <span className="text-white/70 font-mono text-[10px] truncate max-w-[200px]">{status.endpoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Health</span>
                <span className={status.healthy ? 'text-emerald-400' : 'text-red-400'}>
                  {status.healthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              {status.latency_ms !== undefined && (
                <div className="flex justify-between">
                  <span className="text-white/40">Latency</span>
                  <span className="text-white/70 font-mono">{status.latency_ms}ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deploy Instructions */}
        <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Deploy to AgentCore</p>
          <div className="space-y-1.5 font-mono text-[10px] text-white/50">
            <p className="text-amber-400/60">$ pip install bedrock-agentcore</p>
            <p className="text-amber-400/60">$ agentcore configure</p>
            <p className="text-amber-400/60">$ agentcore launch</p>
          </div>
        </div>
      </div>
    </div>
  )
}
