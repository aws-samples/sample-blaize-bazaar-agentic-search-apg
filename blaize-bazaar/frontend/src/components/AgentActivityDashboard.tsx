/**
 * Agent Activity Dashboard — Aggregates session stats from conversation history.
 * Shows query counts, agent distribution, products found, and an animated flow diagram.
 */
import { useMemo } from 'react'
import { X, Activity, MessageSquare, Package, Clock, BarChart3 } from 'lucide-react'
import { AGENT_IDENTITIES, type AgentType } from '../utils/agentIdentity'

interface AgentActivityDashboardProps {
  isOpen: boolean
  onClose: () => void
}

interface SessionStats {
  totalQueries: number
  totalProducts: number
  agentDistribution: Record<string, number>
  avgResponseTime: number
  topAgent: string | null
}

function computeStats(): SessionStats {
  const savedHistory = localStorage.getItem('blaize-conversation-history')
  const messages = savedHistory ? JSON.parse(savedHistory) : []

  let totalQueries = 0
  let totalProducts = 0
  const agentCounts: Record<string, number> = {}
  let totalDuration = 0
  let durationCount = 0

  for (const msg of messages) {
    if (msg.role === 'user') totalQueries++
    if (msg.role === 'assistant') {
      if (msg.products?.length) totalProducts += msg.products.length
      if (msg.agent) {
        agentCounts[msg.agent] = (agentCounts[msg.agent] || 0) + 1
      }
      if (msg.agentExecution?.total_duration_ms) {
        totalDuration += msg.agentExecution.total_duration_ms
        durationCount++
      }
    }
  }

  const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return {
    totalQueries,
    totalProducts,
    agentDistribution: agentCounts,
    avgResponseTime: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    topAgent,
  }
}

const AgentActivityDashboard = ({ isOpen, onClose }: AgentActivityDashboardProps) => {
  const stats = useMemo(computeStats, [isOpen])

  if (!isOpen) return null

  const totalAgentCalls = Object.values(stats.agentDistribution).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[520px] max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-slideUp"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-semibold text-white">Agent Activity Dashboard</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <MessageSquare className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{stats.totalQueries}</div>
              <div className="text-[10px] text-gray-400">Queries</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <Package className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{stats.totalProducts}</div>
              <div className="text-[10px] text-gray-400">Products</div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <BarChart3 className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{totalAgentCalls}</div>
              <div className="text-[10px] text-gray-400">Agent Calls</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{stats.avgResponseTime}</div>
              <div className="text-[10px] text-gray-400">Avg ms</div>
            </div>
          </div>

          {/* Agent Distribution */}
          {totalAgentCalls > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-300 mb-3">Agent Distribution</h3>
              <div className="space-y-2">
                {Object.entries(stats.agentDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([agent, count]) => {
                    const identity = AGENT_IDENTITIES[agent as AgentType]
                    const pct = Math.round((count / totalAgentCalls) * 100)
                    return (
                      <div key={agent} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-32">
                          <span className="text-sm">{identity?.icon || 'AI'}</span>
                          <span className="text-xs text-gray-300 truncate">{identity?.name || agent}</span>
                        </div>
                        <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: identity?.gradient || 'rgba(139, 92, 246, 0.5)',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Animated Flow Diagram */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-3">Query Flow</h3>
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-purple-500/20">
              {/* User */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-[9px] text-gray-500">User</span>
              </div>

              <svg width="30" height="12" className="text-purple-500/40 flex-shrink-0">
                <line x1="0" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="animate-dash-flow" />
                <polygon points="22,2 28,6 22,10" fill="currentColor" />
              </svg>

              {/* Orchestrator */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: AGENT_IDENTITIES.orchestrator.gradient }}>
                  <span className="text-sm font-bold" style={{ color: 'rgba(168, 85, 247, 0.8)' }}>O</span>
                </div>
                <span className="text-[9px] text-gray-500">Orchestrator</span>
              </div>

              <svg width="30" height="12" className="text-purple-500/40 flex-shrink-0">
                <line x1="0" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="animate-dash-flow" />
                <polygon points="22,2 28,6 22,10" fill="currentColor" />
              </svg>

              {/* Agents stack */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex -space-x-2">
                  {(['recommendation', 'pricing', 'inventory'] as AgentType[]).map(a => (
                    <div key={a} className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900" style={{ background: AGENT_IDENTITIES[a].gradient }}>
                      <span className="text-xs">{AGENT_IDENTITIES[a].icon}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[9px] text-gray-500">Specialists</span>
              </div>

              <svg width="30" height="12" className="text-green-500/40 flex-shrink-0">
                <line x1="0" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="animate-dash-flow" />
                <polygon points="22,2 28,6 22,10" fill="currentColor" />
              </svg>

              {/* Products */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Package className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-[9px] text-gray-500">Products</span>
              </div>
            </div>
          </div>

          {stats.totalQueries === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">No activity yet. Start chatting with the AI Assistant!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgentActivityDashboard
