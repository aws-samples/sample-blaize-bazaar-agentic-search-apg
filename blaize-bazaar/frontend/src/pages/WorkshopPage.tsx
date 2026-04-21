/**
 * WorkshopPage — the `/workshop` route.
 *
 * DAT406 instrumentation surface. Two-column layout:
 *   - Left: WorkshopChat (slim, purpose-built; no storefront chrome).
 *   - Right: two-tab panel, Architecture | Telemetry.
 *     * Architecture: 6 static teaching cards (Memory, Tool Registry /
 *       Gateway, MCP, State Management, Grounding + Approvals +
 *       Guardrails, Evaluations). Each card surfaces a button that
 *       opens the matching AgentCore modal dashboard — this is how
 *       the four currently-built-but-unmounted panels re-enter the
 *       workshop flow.
 *     * Telemetry: WorkshopTelemetry replays the event stream from
 *       the most recent chat turn. Panel count badge on the tab label.
 *
 * Teaching narrative anchor: "Use AgentCore for solved primitives.
 * Use Aurora for domain state you own." Each architecture card carries
 * a provenance label (AGENTCORE / AURORA-domain / AURORA-teaching /
 * HYBRID) so attendees can read the build-vs-buy decision at a glance.
 *
 * Note: placeholder cyan/amber/green palette per Week 1 plan. Final
 * boutique palette integration is deferred to Week 7.
 */
import { useState } from 'react'
import Footer from '../components/Footer'
import { AuthGate } from '../App'
import WorkshopChat from '../components/WorkshopChat'
import WorkshopTelemetry from '../components/WorkshopTelemetry'
import MemoryDashboard from '../components/MemoryDashboard'
import GatewayToolsPanel from '../components/GatewayToolsPanel'
import ObservabilityPanel from '../components/ObservabilityPanel'
import RuntimeStatusPanel from '../components/RuntimeStatusPanel'
import IndexPerformanceDashboard from '../components/IndexPerformanceDashboard'
import type { WorkshopEvent } from '../services/workshop'

const CREAM = '#fbf4e8'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const CREAM_WARM = '#f5e8d3'

type Tab = 'architecture' | 'telemetry' | 'performance'

type Provenance = 'AGENTCORE' | 'AURORA-domain' | 'AURORA-teaching' | 'HYBRID'

// Provenance colors use the Week 1 placeholder cyan/amber/green palette.
// Week 7 swaps to the full boutique palette.
const PROV_COLORS: Record<Provenance, { bg: string; border: string; fg: string }> = {
  AGENTCORE:        { bg: '#e0f2fe', border: '#7dd3fc', fg: '#0369a1' },
  'AURORA-domain':  { bg: '#ecfdf5', border: '#86efac', fg: '#047857' },
  'AURORA-teaching': { bg: '#fef3c7', border: '#fcd34d', fg: '#b45309' },
  HYBRID:           { bg: '#f3e8ff', border: '#d8b4fe', fg: '#7e22ce' },
}

interface ArchCard {
  id: string
  title: string
  provenance: Provenance
  description: string
  // Action label when a modal is attached; otherwise falls through to
  // a static "deferred" note for Weeks 3-6 content.
  action?: { label: string; open: (setters: ModalSetters) => void }
  deferredUntil?: string
}

interface ModalSetters {
  setMemoryOpen: (v: boolean) => void
  setGatewayOpen: (v: boolean) => void
  setObsOpen: (v: boolean) => void
  setRuntimeOpen: (v: boolean) => void
  setBenchOpen: (v: boolean) => void
}

const ARCH_CARDS: ArchCard[] = [
  {
    id: 'memory',
    title: 'Memory',
    provenance: 'HYBRID',
    description:
      'AgentCore Memory for short-term conversation state; Aurora pgvector for long-term semantic + procedural recall. Two-tier, one session id.',
    action: {
      label: 'Open memory dashboard',
      open: (s) => s.setMemoryOpen(true),
    },
  },
  {
    id: 'tool-registry',
    title: 'Tool Registry · Gateway',
    provenance: 'HYBRID',
    description:
      'AgentCore Gateway publishes tools via MCP to any runtime; the teaching deconstruction shows the same discovery primitive implemented over Aurora pgvector for explainability.',
    action: {
      label: 'Open gateway tools',
      open: (s) => s.setGatewayOpen(true),
    },
  },
  {
    id: 'mcp',
    title: 'MCP',
    provenance: 'AGENTCORE',
    description:
      'Model Context Protocol. How tools, prompts, and resources flow from the registry into the agent turn. Card expands in Week 2 once live MCP calls stream into the panel strip.',
    deferredUntil: 'Week 2',
  },
  {
    id: 'state',
    title: 'State Management',
    provenance: 'AURORA-domain',
    description:
      'Session state persists in Postgres (orders, customers, approvals). Aurora is the source of truth for domain facts the agents grant themselves access to.',
    action: {
      label: 'Open pgvector benchmarks',
      open: (s) => s.setBenchOpen(true),
    },
  },
  {
    id: 'grounding',
    title: 'Grounding · Approvals · Guardrails',
    provenance: 'HYBRID',
    description:
      'Bedrock guardrails on the LLM; Aurora-backed approvals queue for sensitive tool calls (place_order, restock). One card because the three fire on the same turn boundary.',
    action: {
      label: 'Open runtime status',
      open: (s) => s.setRuntimeOpen(true),
    },
  },
  {
    id: 'evaluations',
    title: 'Evaluations',
    provenance: 'AURORA-teaching',
    description:
      'Offline eval harness + golden-set regression. Static copy in Week 1; live results and the evaluation_results table land in Week 6.',
    deferredUntil: 'Week 6',
  },
]

function ProvenancePill({ kind }: { kind: Provenance }) {
  const c = PROV_COLORS[kind]
  return (
    <span
      className="font-mono text-[9.5px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded whitespace-nowrap"
      style={{ color: c.fg, border: `1px solid ${c.border}`, background: c.bg }}
    >
      {kind}
    </span>
  )
}

function ArchitectureCard({ card, setters }: { card: ArchCard; setters: ModalSetters }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${INK_QUIET}30`,
      }}
    >
      <div className="flex items-center gap-2">
        <ProvenancePill kind={card.provenance} />
        <span
          className="text-[14.5px] font-semibold"
          style={{ color: INK, fontFamily: "'Fraunces', serif" }}
        >
          {card.title}
        </span>
      </div>
      <p className="text-[13px] leading-[1.55]" style={{ color: INK_SOFT }}>
        {card.description}
      </p>
      {card.action ? (
        <button
          type="button"
          onClick={() => card.action!.open(setters)}
          className="self-start mt-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-85"
          style={{ background: INK, color: CREAM }}
        >
          {card.action.label}
        </button>
      ) : (
        <span
          className="self-start font-mono text-[10px] uppercase tracking-[1px] mt-1"
          style={{ color: INK_QUIET }}
        >
          Wires up · {card.deferredUntil}
        </span>
      )}
    </div>
  )
}

function WorkshopContent() {
  const [events, setEvents] = useState<WorkshopEvent[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('architecture')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [gatewayOpen, setGatewayOpen] = useState(false)
  const [obsOpen, setObsOpen] = useState(false)
  const [runtimeOpen, setRuntimeOpen] = useState(false)
  const [benchOpen, setBenchOpen] = useState(false)

  const setters: ModalSetters = {
    setMemoryOpen,
    setGatewayOpen,
    setObsOpen,
    setRuntimeOpen,
    setBenchOpen,
  }

  const panelCount = events.filter((e) => e.type === 'panel').length

  return (
    <div style={{ minHeight: '100vh', background: CREAM, color: INK }}>
      <header
        className="max-w-6xl mx-auto px-6 py-10"
        style={{ borderBottom: `1px solid ${INK_QUIET}30` }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.18em] mb-2"
          style={{ color: INK_QUIET }}
        >
          DAT406 · Builders Session
        </p>
        <h1
          className="text-4xl mb-2"
          style={{ fontFamily: "'Fraunces', serif", color: INK }}
        >
          Workshop · agentic telemetry
        </h1>
        <p className="text-base" style={{ color: INK_SOFT, maxWidth: '44rem' }}>
          Use AgentCore for solved primitives. Use Aurora for domain state you
          own. Chat on the left, watch the plan → panels → response trail replay
          on the right.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 grid-cols-1 lg:grid-cols-[minmax(360px,_1fr)_minmax(0,_1.45fr)]">
        {/* Left: chat */}
        <div className="min-h-[640px] lg:h-[calc(100vh-260px)] lg:sticky lg:top-6">
          <WorkshopChat onEvents={setEvents} />
        </div>

        {/* Right: tabbed panel */}
        <div className="flex flex-col gap-3">
          <div
            role="tablist"
            className="flex items-center gap-1 p-1 rounded-full self-start"
            style={{ background: CREAM_WARM, border: `1px solid ${INK_QUIET}25` }}
          >
            {(['architecture', 'telemetry', 'performance'] as Tab[]).map((t) => {
              const active = activeTab === t
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t)}
                  className="px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors flex items-center gap-1.5"
                  style={{
                    background: active ? INK : 'transparent',
                    color: active ? CREAM : INK_SOFT,
                  }}
                >
                  <span className="capitalize">{t}</span>
                  {t === 'telemetry' && panelCount > 0 && (
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: active ? 'rgba(255,255,255,0.15)' : INK_QUIET + '30',
                        color: active ? CREAM : INK_SOFT,
                      }}
                    >
                      {panelCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ARCH_CARDS.map((c) => (
                <ArchitectureCard key={c.id} card={c} setters={setters} />
              ))}
              <div
                className="md:col-span-2 rounded-xl p-4 text-[12.5px] leading-[1.6]"
                style={{
                  background: CREAM_WARM,
                  border: `1px dashed ${INK_QUIET}40`,
                  color: INK_SOFT,
                }}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-[1.5px] font-semibold mr-2"
                  style={{ color: INK }}
                >
                  Legend
                </span>
                <ProvenancePill kind="AGENTCORE" /> AWS managed primitive.{' '}
                <ProvenancePill kind="AURORA-domain" /> Postgres owns the data.{' '}
                <ProvenancePill kind="AURORA-teaching" /> Postgres as a pedagogical
                reimplementation.{' '}
                <ProvenancePill kind="HYBRID" /> Both, on purpose.
              </div>
            </div>
          )}
          {activeTab === 'telemetry' && <WorkshopTelemetry events={events} />}
          {activeTab === 'performance' && (
            <div
              className="rounded-xl p-6 text-[13px] leading-[1.6]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: `1px dashed ${INK_QUIET}40`,
                color: INK_SOFT,
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-[1.5px] font-semibold mb-2"
                style={{ color: INK_QUIET }}
              >
                Coming in Week 7.5
              </div>
              <p style={{ color: INK }}>
                Performance surface: runtime cold-start benchmarks, per-panel p50/p95
                latency, pgvector index comparison charts. Telemetry from the live
                agent turns will feed this board once the Week 2-6 emitters land.
              </p>
            </div>
          )}

          {/* Observability is deliberately outside the architecture grid —
              it's more of a cross-cutting utility than an architecture
              card, and attendees typically open it while skimming traces. */}
          <button
            type="button"
            onClick={() => setObsOpen(true)}
            className="self-start text-[11.5px] underline-offset-2 hover:underline"
            style={{ color: INK_QUIET }}
          >
            Observability dashboard →
          </button>
        </div>
      </main>

      <Footer />

      {memoryOpen && <MemoryDashboard onClose={() => setMemoryOpen(false)} />}
      {gatewayOpen && <GatewayToolsPanel onClose={() => setGatewayOpen(false)} />}
      {obsOpen && <ObservabilityPanel onClose={() => setObsOpen(false)} />}
      {runtimeOpen && <RuntimeStatusPanel onClose={() => setRuntimeOpen(false)} />}
      <IndexPerformanceDashboard isOpen={benchOpen} onClose={() => setBenchOpen(false)} />
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <AuthGate>
      <WorkshopContent />
    </AuthGate>
  )
}
