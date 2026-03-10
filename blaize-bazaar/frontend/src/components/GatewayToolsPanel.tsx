/**
 * GatewayToolsPanel — Shows MCP tools registered in AgentCore Gateway (Lab 4c).
 * Displays tool names, descriptions, and input schemas from the MCP server.
 */
import { useState, useEffect } from 'react'
import { Wrench, RefreshCw, Globe, ChevronDown, ChevronRight } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface GatewayTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export default function GatewayToolsPanel({ onClose }: { onClose: () => void }) {
  const [tools, setTools] = useState<GatewayTool[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  const fetchTools = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/agentcore/gateway/tools`)
      if (res.ok) {
        const data = await res.json()
        setTools(data.tools || [])
      }
    } catch (e) {
      console.warn('Failed to fetch gateway tools:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTools() }, [])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AgentCore Gateway</h2>
              <p className="text-xs text-white/40">MCP Tool Discovery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchTools} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* How MCP works */}
        <div className="mb-5 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-xs text-white/50 mb-2 font-medium">How MCP Gateway Works</p>
          <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono">
            <div className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">Agent</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">MCP Client</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Gateway</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Tools</div>
          </div>
          <p className="text-[10px] text-white/30 mt-2">Tools are discovered dynamically via MCP protocol — no hard-coded imports needed.</p>
        </div>

        {/* Tools List */}
        {tools.length > 0 ? (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.name} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
                >
                  <Wrench className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-white/80">{tool.name}</p>
                    <p className="text-xs text-white/40 truncate">{tool.description}</p>
                  </div>
                  {expandedTool === tool.name ? (
                    <ChevronDown className="w-4 h-4 text-white/20" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  )}
                </button>
                {expandedTool === tool.name && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    <p className="text-[10px] font-medium text-white/30 mt-3 mb-2 uppercase tracking-wider">Input Schema</p>
                    <pre className="text-[10px] text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono">
                      {JSON.stringify(tool.input_schema, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Globe className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 mb-1">
              {loading ? 'Discovering tools...' : 'No MCP tools registered'}
            </p>
            <p className="text-xs text-white/20">Configure AGENTCORE_GATEWAY_URL to connect to your MCP server.</p>
          </div>
        )}

        {/* Tool count footer */}
        {tools.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/30">{tools.length} tools discovered via MCP</span>
            <span className="text-[10px] text-white/20 font-mono">streamable-http transport</span>
          </div>
        )}
      </div>
    </div>
  )
}
