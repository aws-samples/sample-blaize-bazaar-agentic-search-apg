/**
 * PlaygroundOverlay — Full-screen overlay for lab demos & workshop progression
 * Visual overhaul: vibrant cards with colored accents, better contrast, architecture section
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, ChevronRight, Layers, Zap, Activity, Database, Brain, Cpu, Server } from 'lucide-react'
import { useLayout } from '../contexts/LayoutContext'

const MODE_ORDER = ['legacy', 'semantic', 'tools', 'full', 'agentcore'] as const

interface ToolButton {
  icon: React.ReactNode
  label: string
  desc: string
  tryHint?: string
  action: () => void
  minMode: typeof MODE_ORDER[number]
  group: string
}

interface LabSection {
  key: string
  label: string
  desc: string
  minMode: typeof MODE_ORDER[number]
  intro: string
}

interface ArchDiagram {
  title: string
  img: string
}

interface PlaygroundOverlayProps {
  isVisible: boolean
  onClose: () => void
  devToolButtons: ToolButton[]
  labSections: LabSection[]
  archDiagrams: ArchDiagram[]
  onArchDiagram: (img: string) => void
  chaosMode: boolean
  onModeSwitch: (mode: typeof MODE_ORDER[number]) => void
}

const MODE_META: Record<string, { label: string; desc: string; color: string; emoji: string }> = {
  legacy: { label: 'Legacy App', desc: 'Keyword Search Only', color: '#6b7280', emoji: '1' },
  semantic: { label: 'Semantic Search', desc: 'Teaching Your Database to Think', color: '#3b82f6', emoji: '2' },
  tools: { label: 'Agent Tools', desc: 'Structured Capabilities', color: '#8b5cf6', emoji: '3' },
  full: { label: 'Multi-Agent', desc: 'Specialists & Routing', color: '#f59e0b', emoji: '4' },
  agentcore: { label: 'Production', desc: 'Policies, Memory & Runtime', color: '#10b981', emoji: '5' },
}

const LAB_COLORS: Record<string, string> = {
  lab1: '#3b82f6',
  lab2: '#8b5cf6',
  lab3: '#f59e0b',
  lab4: '#10b981',
}

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export default function PlaygroundOverlay({
  isVisible,
  onClose,
  devToolButtons,
  labSections,
  archDiagrams,
  onArchDiagram,
  onModeSwitch,
}: PlaygroundOverlayProps) {
  const { workshopMode, guardrailsEnabled, setGuardrailsEnabled } = useLayout()
  const [cacheStats, setCacheStats] = useState<{
    mode: string; hits: number; misses: number; hit_rate: number; total_keys: number
  } | null>(null)

  // Escape key
  useEffect(() => {
    if (!isVisible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible, onClose])

  // Fetch cache stats for architecture section
  useEffect(() => {
    if (!isVisible || workshopMode !== 'agentcore') return
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cache/stats`)
        if (res.ok) setCacheStats(await res.json())
      } catch { /* backend may not be running */ }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [isVisible, workshopMode])

  const hitRatePercent = cacheStats ? Math.round(cacheStats.hit_rate * 100) : 0

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(24px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 top-[72px] bottom-0 z-[61] flex flex-col"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              className="flex flex-col flex-1 min-h-0 mx-3 sm:mx-5 mt-2 mb-4 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d14 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 24px 80px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 sm:px-8 py-5 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                    <Layers className="h-5 w-5" style={{ color: '#ffffff' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-white">Playground</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Explore tools and demos for each lab
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Workshop mode switcher — pill bar */}
              <div
                className="flex items-center gap-1 px-6 sm:px-8 py-3.5 flex-shrink-0 overflow-x-auto"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                {MODE_ORDER.map((mode) => {
                  const isCurrent = workshopMode === mode
                  const info = MODE_META[mode]
                  return (
                    <button
                      key={mode}
                      onClick={() => onModeSwitch(mode)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-left transition-all duration-200 flex-shrink-0"
                      style={{
                        background: isCurrent ? `${info.color}20` : 'transparent',
                        border: isCurrent ? `1px solid ${info.color}40` : '1px solid transparent',
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          background: isCurrent ? info.color : 'rgba(255, 255, 255, 0.08)',
                          color: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        {info.emoji}
                      </span>
                      <span className="text-[13px] font-medium" style={{ color: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.55)' }}>
                        {info.label}
                      </span>
                      <span className="text-[11px] hidden md:inline" style={{ color: isCurrent ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)' }}>
                        {info.desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-8 search-scroll">
                {/* Lab sections — show only the current lab */}
                {labSections
                  .filter(section => section.minMode === workshopMode)
                  .map((section) => {
                    const sectionTools = devToolButtons.filter(
                      b => b.group === section.key
                    )
                    if (sectionTools.length === 0) return null
                    const accent = LAB_COLORS[section.key] || '#ffffff'

                    return (
                      <motion.div
                        key={section.key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
                            <h3 className="text-lg font-semibold text-white">{section.label}</h3>
                            <span className="text-[13px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{section.desc}</span>
                          </div>

                          {/* Guardrails toggle — inline in Lab 3 header */}
                          {section.key === 'lab3' && (
                            <button
                              onClick={() => setGuardrailsEnabled(!guardrailsEnabled)}
                              className="flex items-center gap-2.5 px-3.5 py-2 rounded-full transition-all duration-200"
                              style={{
                                background: guardrailsEnabled ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${guardrailsEnabled ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                              }}
                            >
                              <Shield className="h-4 w-4" style={{ color: guardrailsEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.4)' }} />
                              <span className="text-[12px] font-medium" style={{ color: guardrailsEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.5)' }}>
                                Guardrails {guardrailsEnabled ? 'On' : 'Off'}
                              </span>
                              <div
                                className="w-8 h-4 rounded-full relative transition-colors duration-200 flex-shrink-0"
                                style={{ background: guardrailsEnabled ? '#34d399' : 'rgba(255, 255, 255, 0.15)' }}
                              >
                                <div
                                  className="absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
                                  style={{ transform: guardrailsEnabled ? 'translateX(16px)' : 'translateX(2px)' }}
                                />
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Section intro */}
                        <p
                          className="text-[13px] leading-relaxed mb-5 px-4 py-3.5 rounded-xl"
                          style={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            background: `linear-gradient(135deg, ${accent}08 0%, ${accent}03 100%)`,
                            border: `1px solid ${accent}15`,
                          }}
                        >
                          {section.intro}
                        </p>

                        {/* Tool cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sectionTools.map((tool, idx) => (
                            <motion.button
                              key={idx}
                              onClick={() => { tool.action(); onClose() }}
                              className="text-left p-5 rounded-xl transition-all duration-200 group relative overflow-hidden"
                              style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                              whileHover={{
                                scale: 1.01,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderColor: `${accent}50`,
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {/* Subtle top accent line */}
                              <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: accent }}
                              />

                              <div className="flex items-start gap-3.5">
                                <span
                                  className="mt-0.5 flex-shrink-0 p-2 rounded-lg"
                                  style={{ background: `${accent}15`, color: accent }}
                                >
                                  {tool.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[14px] font-semibold text-white">{tool.label}</p>
                                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#ffffff' }} />
                                  </div>
                                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    {tool.desc}
                                  </p>
                                  {tool.tryHint && (
                                    <p className="text-[11px] mt-2.5 flex items-center gap-1" style={{ color: `${accent}90` }}>
                                      <Zap className="h-3 w-3" />
                                      {tool.tryHint}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}

                {/* Architecture section — show for agentcore with live system diagram */}
                {workshopMode === 'agentcore' && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 rounded-full" style={{ background: '#10b981' }} />
                      <h3 className="text-lg font-semibold text-white">System Architecture</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Architecture diagram (SVG) */}
                      <div className="rounded-xl p-5" style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}>
                        <p className="text-[11px] font-medium uppercase tracking-wider mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          Production Pipeline
                        </p>
                        <svg viewBox="0 0 360 240" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
                          {/* Flow connections */}
                          <line x1="55" y1="35" x2="55" y2="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="4 4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
                          </line>
                          <line x1="55" y1="100" x2="55" y2="135" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="4 4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
                          </line>
                          <line x1="30" y1="165" x2="30" y2="200" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1.2s" repeatCount="indefinite" />
                          </line>
                          <line x1="100" y1="165" x2="100" y2="200" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1.2s" repeatCount="indefinite" />
                          </line>
                          <line x1="140" y1="150" x2="200" y2="150" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.8s" repeatCount="indefinite" />
                          </line>
                          <line x1="140" y1="85" x2="200" y2="85" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4">
                            <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
                          </line>

                          {/* Nodes */}
                          <rect x="20" y="15" width="70" height="24" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                          <text x="55" y="31" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="500">User</text>

                          <rect x="10" y="72" width="90" height="28" rx="6" fill="rgba(0,113,227,0.12)" stroke="rgba(0,113,227,0.3)" strokeWidth="1" />
                          <circle cx="20" cy="86" r="2.5" fill="#22c55e" />
                          <text x="58" y="90" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="500">FastAPI</text>

                          <rect x="5" y="135" width="135" height="28" rx="6" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
                          <circle cx="15" cy="149" r="2.5" fill="#22c55e" />
                          <text x="75" y="153" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="500">Strands Agent SDK</text>

                          <rect x="0" y="200" width="58" height="34" rx="6" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                          <text x="29" y="216" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="500">Aurora</text>
                          <text x="29" y="228" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7">pgvector</text>

                          <rect x="70" y="200" width="62" height="34" rx="6" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
                          <text x="101" y="216" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500">Bedrock</text>
                          <text x="101" y="228" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7">Claude + Cohere</text>

                          <rect x="200" y="132" width="148" height="36" rx="6" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.25)" strokeWidth="1" />
                          <circle cx="212" cy="147" r="2.5" fill="#22c55e" />
                          <text x="280" y="148" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="500">Valkey / ElastiCache</text>
                          <text x="280" y="160" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7">
                            {cacheStats ? `${hitRatePercent}% hit rate · ${cacheStats.total_keys} keys` : 'connecting...'}
                          </text>

                          <rect x="200" y="48" width="148" height="74" rx="8" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
                          <text x="274" y="64" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="600" letterSpacing="0.06em">AGENTCORE</text>
                          {[
                            { label: 'Memory', y: 78, color: '#f472b6' },
                            { label: 'Gateway (MCP)', y: 90, color: '#67e8f9' },
                            { label: 'Cedar Policy', y: 102, color: '#6ee7b7' },
                            { label: 'Runtime (Lambda)', y: 114, color: '#fb923c' },
                          ].map((item, i) => (
                            <g key={i}>
                              <circle cx="214" cy={item.y} r="2" fill={item.color} opacity="0.7" />
                              <text x="222" y={item.y + 3} fill="rgba(255,255,255,0.55)" fontSize="8">{item.label}</text>
                            </g>
                          ))}
                        </svg>
                      </div>

                      {/* Live cache metrics */}
                      <div className="space-y-3">
                        <div className="rounded-xl p-5" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                        }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" style={{ color: '#f59e0b' }} />
                              <span className="text-sm font-medium text-white">Cache Hit Rate</span>
                            </div>
                            <span className="text-2xl font-bold tabular-nums" style={{ color: '#fcd34d' }}>
                              {cacheStats ? `${hitRatePercent}%` : '--'}
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${hitRatePercent}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <span>{cacheStats?.hits ?? 0} hits / {cacheStats?.misses ?? 0} misses</span>
                            <span>{cacheStats?.total_keys ?? 0} keys</span>
                          </div>
                        </div>

                        {/* Service health */}
                        <div className="rounded-xl p-5" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4" style={{ color: '#10b981' }} />
                            <span className="text-sm font-medium text-white">Service Health</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              { name: 'Aurora', icon: <Database className="h-3.5 w-3.5" />, color: '#3b82f6', ms: '~12ms' },
                              { name: 'Bedrock', icon: <Brain className="h-3.5 w-3.5" />, color: '#a855f7', ms: '~180ms' },
                              { name: 'Valkey', icon: <Zap className="h-3.5 w-3.5" />, color: '#f59e0b', ms: '<1ms' },
                              { name: 'AgentCore', icon: <Cpu className="h-3.5 w-3.5" />, color: '#10b981', ms: '~45ms' },
                            ].map((svc) => (
                              <div key={svc.name} className="rounded-lg px-3 py-2.5"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span style={{ color: svc.color }}>{svc.icon}</span>
                                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{svc.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>{svc.ms}</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="text-[10px]" style={{ color: '#4ade80' }}>OK</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Backend mode */}
                        <div className="rounded-xl px-5 py-3.5 flex items-center justify-between" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                            <span className="text-sm font-medium text-white">Cache Backend</span>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              background: cacheStats?.mode === 'valkey' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              color: cacheStats?.mode === 'valkey' ? '#6ee7b7' : '#fcd34d',
                              border: `1px solid ${cacheStats?.mode === 'valkey' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            }}
                          >
                            {cacheStats?.mode === 'valkey' ? 'ElastiCache' : cacheStats?.mode === 'memory' ? 'In-Memory' : '...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Architecture Diagrams */}
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.3)' }} />
                    <h3 className="text-lg font-semibold text-white">Architecture Diagrams</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {archDiagrams.map((diagram, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => { onArchDiagram(diagram.img); onClose() }}
                        className="text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderColor: 'rgba(255, 255, 255, 0.15)',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Layers className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <p className="text-[14px] font-medium text-white">{diagram.title}</p>
                        <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#ffffff' }} />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 pb-2 text-center">
                  <p className="text-[12px]" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                    Blaize Bazaar Playground · DAT406
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
