/**
 * MemoryDashboard — AgentCore Memory read-out for /workshop card 1.
 *
 * Renders as inline content inside the /workshop detail slot (artifact
 * pattern), not a full-screen modal. No fixed/inset wrapper — the parent
 * owns positioning. Own close button in the header matches the
 * detail-pane chrome so the layout reads consistently regardless of
 * which card is open.
 *
 * Boutique palette: cream `#fbf4e8` background, ink `#2d1810` text,
 * terracotta accent `#c44536`. No dark backgrounds, no violet/pink
 * gradients — those were re:Invent-era leftovers that fought the
 * storefront look. Matches the architecture card visual language.
 */
import { useCallback, useEffect, useState } from 'react'
import { Brain, RefreshCw, User, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'

interface Memory {
  id: string
  type: string
  content: string
  created_at: string
  metadata: Record<string, unknown>
}

// Preference / summary / fact types map to cream-warm pills with
// boutique accent text — keeps the "source of truth" quiet so the
// content itself reads as the foreground.
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  preference: { label: 'PREFERENCE', color: '#047857' },
  summary: { label: 'SUMMARY', color: '#b45309' },
  fact: { label: 'FACT', color: '#0369a1' },
}

export default function MemoryDashboard({ onClose }: { onClose: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMemories = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  return (
    <section
      data-testid="memory-dashboard"
      className="h-full flex flex-col overflow-hidden rounded-2xl"
      style={{ background: CREAM, border: `1px solid ${INK_QUIET}30` }}
    >
      {/* Header — matches WorkshopChat/WorkshopTelemetry chrome */}
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${INK_QUIET}25`, background: CREAM_WARM }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}
          >
            <Brain className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: INK, fontFamily: "'Iowan Old Style', Georgia, 'Times New Roman', serif" }}
            >
              AgentCore Memory
            </h2>
            <p className="text-xs" style={{ color: INK_QUIET }}>
              Persistent user preferences · short-term + long-term
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchMemories}
            aria-label="refresh memories"
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="close memory dashboard"
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ color: INK_QUIET }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Flow strip — keeps the Chat → Extract → Store → Recall lesson
            visible without the cartoon gradient pills. */}
        <div
          className="rounded-xl p-3 flex items-center gap-2 text-[11px] font-mono"
          style={{
            background: 'rgba(255,255,255,0.65)',
            border: `1px dashed ${INK_QUIET}40`,
            color: INK_SOFT,
          }}
        >
          <span className="font-semibold uppercase tracking-[1.2px]" style={{ color: INK_QUIET }}>
            Flow
          </span>
          <span>chat</span>
          <span style={{ color: INK_QUIET }}>→</span>
          <span>extract</span>
          <span style={{ color: INK_QUIET }}>→</span>
          <span>store</span>
          <span style={{ color: INK_QUIET }}>→</span>
          <span>recall</span>
        </div>

        {memories.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {memories.map((mem, i) => {
              const meta = TYPE_LABELS[mem.type] || { label: mem.type.toUpperCase(), color: INK_SOFT }
              return (
                <li
                  key={i}
                  className="rounded-xl p-3"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    border: `1px solid ${INK_QUIET}25`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="font-mono text-[9.5px] font-semibold tracking-[1.5px] uppercase px-1.5 py-0.5 rounded"
                      style={{
                        color: meta.color,
                        border: `1px solid ${meta.color}40`,
                        background: `${meta.color}10`,
                      }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: INK_QUIET }}>
                      {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-[1.55]" style={{ color: INK }}>
                    {mem.content}
                  </p>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="text-center py-10 flex flex-col items-center gap-2.5">
            <User className="w-8 h-8" style={{ color: INK_QUIET }} />
            <p className="text-sm font-medium" style={{ color: INK_SOFT }}>
              No memories stored yet
            </p>
            <p className="text-[12.5px] leading-[1.55] max-w-sm" style={{ color: INK_QUIET }}>
              Chat with the agent to build preferences. Try:{' '}
              <em style={{ color: INK }}>"I love running shoes under $100"</em>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
