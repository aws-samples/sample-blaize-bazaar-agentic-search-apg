/**
 * MemoryDashboard — Shows stored user preferences from AgentCore Memory (Lab 4b).
 * Displays extracted preferences, conversation summaries, and semantic facts.
 */
import { useState, useEffect } from 'react'
import { Brain, RefreshCw, User } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface Memory {
  id: string
  type: string
  content: string
  created_at: string
  metadata: Record<string, unknown>
}

export default function MemoryDashboard({ onClose }: { onClose: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMemories = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('blaize-access-token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}/api/agentcore/memories`, { headers })
      if (res.ok) {
        const data = await res.json()
        setMemories(data.memories || [])
      }
    } catch (e) {
      console.warn('Failed to fetch memories:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMemories() }, [])

  const typeColors: Record<string, string> = {
    preference: 'from-emerald-500/20 to-green-500/20 border-emerald-500/20 text-emerald-400',
    summary: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20 text-blue-400',
    fact: 'from-amber-500/20 to-orange-500/20 border-amber-500/20 text-amber-400',
    unknown: 'from-gray-500/20 to-slate-500/20 border-gray-500/20 text-gray-400',
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0f]/95 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AgentCore Memory</h2>
              <p className="text-xs text-white/40">Persistent user preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchMemories} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-5 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-xs text-white/50 mb-2 font-medium">How AgentCore Memory Works</p>
          <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono">
            <div className="px-2 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400">Chat</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Extract</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">Store</div>
            <span>&rarr;</span>
            <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Recall</div>
          </div>
          <p className="text-[10px] text-white/30 mt-2">Preferences are automatically extracted from conversations and recalled in future sessions.</p>
        </div>

        {/* Memories List */}
        {memories.length > 0 ? (
          <div className="space-y-3">
            {memories.map((mem, i) => {
              const colorClass = typeColors[mem.type] || typeColors.unknown
              return (
                <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r border ${colorClass}`}>
                      {mem.type}
                    </span>
                    <span className="text-[10px] text-white/20">{new Date(mem.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-white/70">{mem.content}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 mb-1">No memories stored yet</p>
            <p className="text-xs text-white/20">Chat with the agent to build preferences. Try: "I love running shoes under $100"</p>
          </div>
        )}
      </div>
    </div>
  )
}
