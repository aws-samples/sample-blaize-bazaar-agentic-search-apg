/**
 * PlaygroundOverlay — Full-screen overlay for lab demos & workshop progression
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield } from 'lucide-react'
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

const MODE_LABELS: Record<string, { label: string; desc: string }> = {
  legacy: { label: 'Meet Bazaar', desc: 'Keyword Only' },
  semantic: { label: 'Search', desc: 'Semantic + Hybrid' },
  tools: { label: 'First Agent', desc: 'Custom Tools' },
  full: { label: 'Agent Team', desc: 'Orchestration' },
  agentcore: { label: 'Ship It', desc: 'AgentCore' },
}

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

  // Escape key
  useEffect(() => {
    if (!isVisible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 top-[72px] bottom-0 z-[61] flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              className="flex flex-col flex-1 min-h-0 mx-4 mt-2 mb-4 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(0, 0, 0, 0.97)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-8 py-5 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Playground</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Explore each lab's tools and demos</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-colors duration-200 hover:bg-white/10"
                >
                  <X className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                </button>
              </div>

              {/* Workshop mode switcher */}
              <div
                className="flex items-center gap-1.5 px-8 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider mr-3" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                  Mode
                </span>
                {MODE_ORDER.map((mode) => {
                  const isCurrent = workshopMode === mode
                  const info = MODE_LABELS[mode]
                  return (
                    <button
                      key={mode}
                      onClick={() => onModeSwitch(mode)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-left transition-all duration-200"
                      style={{
                        background: isCurrent ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        border: isCurrent ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: isCurrent ? '#ffffff' : 'transparent',
                          border: isCurrent ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                      <span className="text-[13px] font-medium" style={{ color: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.6)' }}>
                        {info.label}
                      </span>
                      <span className="text-[11px] hidden sm:inline" style={{ color: isCurrent ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)' }}>
                        {info.desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-8 search-scroll">
                {/* Lab sections — show only the current lab */}
                {labSections
                  .filter(section => section.minMode === workshopMode)
                  .map((section) => {
                    const sectionTools = devToolButtons.filter(
                      b => b.group === section.key
                    )
                    if (sectionTools.length === 0) return null

                    return (
                      <motion.div
                        key={section.key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">{section.label}</h3>
                            <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{section.desc}</span>
                          </div>

                          {/* Guardrails toggle — inline in Lab 3 header */}
                          {section.key === 'lab3' && (
                            <button
                              onClick={() => setGuardrailsEnabled(!guardrailsEnabled)}
                              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-200"
                              style={{
                                background: guardrailsEnabled ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.04)',
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
                          className="text-[13px] leading-relaxed mb-4 px-4 py-3 rounded-xl"
                          style={{ color: 'rgba(255, 255, 255, 0.5)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                        >
                          {section.intro}
                        </p>

                        {/* Tool cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {sectionTools.map((tool, idx) => (
                            <motion.button
                              key={idx}
                              onClick={() => { tool.action(); onClose() }}
                              className="text-left p-4 rounded-xl transition-all duration-200 group"
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                              }}
                              whileHover={{
                                scale: 1.02,
                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {tool.icon}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[14px] font-medium text-white mb-1">{tool.label}</p>
                                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                    {tool.desc}
                                  </p>
                                  {tool.tryHint && (
                                    <p className="text-[11px] mt-2 italic" style={{ color: 'rgba(96, 165, 250, 0.6)' }}>
                                      Try: {tool.tryHint}
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

                {/* Architecture Diagrams */}
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h3 className="text-lg font-semibold text-white mb-3">Architecture</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {archDiagrams.map((diagram, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => { onArchDiagram(diagram.img); onClose() }}
                        className="text-left p-4 rounded-xl transition-all duration-200"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: 'rgba(255, 255, 255, 0.07)',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <p className="text-[14px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{diagram.title}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 pb-2 text-center">
                  <p className="text-[12px]" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>Blaize Bazaar Playground · DAT406</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
