/**
 * WorkshopPage — the `/workshop` route.
 *
 * Pre-Week-3 layout redesign: Claude Desktop / artifact pattern.
 *
 * Three zones:
 *   LEFT   — WorkshopChat (primary input surface, default ~40%).
 *   CENTER — Architecture | Telemetry | Performance tabs (default ~60%).
 *   RIGHT  — Detail panel slot (hidden by default, slides in when an
 *            architecture card opens a dashboard; compresses the center
 *            zone rather than replacing it so the trace narrative stays
 *            visible during live demos).
 *
 * Full viewport width, no max-width cap — laptop-optimized for 1280+
 * screens. Three responsive bands:
 *   ≥ 1280px  three-zone resizable split (react-resizable-panels).
 *   1024-1280 detail panel overlays the telemetry half when open.
 *   < 1024    single-column vertical stack, detail pushes below.
 *
 * Teaching narrative: "Use AgentCore for solved primitives. Use
 * Aurora for domain state you own." Each architecture card carries a
 * provenance label (AGENTCORE / AURORA-domain / AURORA-teaching /
 * HYBRID).
 *
 * Note: placeholder cyan/amber/green palette on telemetry panels per
 * Week 1 plan. Animation beats for panel-by-panel streaming land in
 * Week 7.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
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

type DetailPanelKey = 'memory' | 'gateway' | 'obs' | 'runtime' | 'bench' | null

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
  detail?: { label: string; open: DetailPanelKey }
  deferredUntil?: string
}

const ARCH_CARDS: ArchCard[] = [
  {
    id: 'memory',
    title: 'Memory',
    provenance: 'HYBRID',
    description:
      'AgentCore Memory for short-term conversation state; Aurora pgvector for long-term semantic + procedural recall. Two-tier, one session id.',
    detail: { label: 'Open memory dashboard', open: 'memory' },
  },
  {
    id: 'tool-registry',
    title: 'Tool Registry · Gateway',
    provenance: 'HYBRID',
    description:
      'AgentCore Gateway publishes tools via MCP to any runtime; the teaching deconstruction shows the same discovery primitive implemented over Aurora pgvector for explainability.',
    detail: { label: 'Open gateway tools', open: 'gateway' },
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
    detail: { label: 'Open pgvector benchmarks', open: 'bench' },
  },
  {
    id: 'grounding',
    title: 'Grounding · Approvals · Guardrails',
    provenance: 'HYBRID',
    description:
      'Bedrock guardrails on the LLM; Aurora-backed approvals queue for sensitive tool calls (place_order, restock). One card because the three fire on the same turn boundary.',
    detail: { label: 'Open runtime status', open: 'runtime' },
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

/**
 * Architecture card — single-column, wider layout per pre-Week-3 redesign.
 * Action buttons open the matching detail panel in the right zone via
 * `onOpen`, so the modal pattern is replaced by docked content.
 */
function ArchitectureCard({
  card,
  onOpen,
  active,
}: {
  card: ArchCard
  onOpen: (key: DetailPanelKey) => void
  active: boolean
}) {
  return (
    <div
      className="rounded-xl p-5 flex gap-4 items-start transition-shadow"
      style={{
        background: active ? CREAM_WARM : 'rgba(255,255,255,0.7)',
        border: `1px solid ${active ? `${INK_QUIET}50` : `${INK_QUIET}30`}`,
        boxShadow: active ? `0 2px 8px ${INK_QUIET}20` : 'none',
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ProvenancePill kind={card.provenance} />
          <span
            className="text-[15px] font-semibold"
            style={{ color: INK, fontFamily: "'Fraunces', serif" }}
          >
            {card.title}
          </span>
        </div>
        <p className="text-[13.5px] leading-[1.6]" style={{ color: INK_SOFT }}>
          {card.description}
        </p>
      </div>
      {card.detail ? (
        <button
          type="button"
          onClick={() => onOpen(card.detail!.open)}
          data-testid={`arch-card-open-${card.id}`}
          className="self-start px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-85 whitespace-nowrap"
          style={{ background: INK, color: CREAM }}
        >
          {card.detail.label}
        </button>
      ) : (
        <span
          className="self-start font-mono text-[10px] uppercase tracking-[1px] whitespace-nowrap"
          style={{ color: INK_QUIET }}
        >
          Wires up · {card.deferredUntil}
        </span>
      )}
    </div>
  )
}

/**
 * matchMedia hook. Returns true when the viewport matches ``query``.
 * Re-evaluates on resize / orientation change.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

function WorkshopContent() {
  const [events, setEvents] = useState<WorkshopEvent[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('architecture')
  const [detailPanel, setDetailPanel] = useState<DetailPanelKey>(null)

  // Three bands: ≥ 1280 three-zone resizable, 1024-1280 detail overlays,
  // < 1024 vertical stack.
  const isLaptop = useMediaQuery('(min-width: 1280px)')
  const isTablet = useMediaQuery('(min-width: 1024px) and (max-width: 1279.98px)')

  const panelCount = events.filter((e) => e.type === 'panel').length
  const detailOpen = detailPanel !== null
  const isBenchModal = detailPanel === 'bench' // IndexPerformanceDashboard is still a modal (deferred)

  const closeDetail = () => setDetailPanel(null)

  // Render the active detail panel's inline content. Bench stays modal
  // for now — re-skinning it is Week 7.5 performance tab scope.
  const renderDetail = () => {
    if (detailPanel === 'memory') return <MemoryDashboard onClose={closeDetail} />
    if (detailPanel === 'gateway') return <GatewayToolsPanel onClose={closeDetail} />
    if (detailPanel === 'obs') return <ObservabilityPanel onClose={closeDetail} />
    if (detailPanel === 'runtime') return <RuntimeStatusPanel onClose={closeDetail} />
    return null
  }

  const workArea = (
    <div className="h-full flex flex-col gap-3 min-w-0">
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
              style={{ background: active ? INK : 'transparent', color: active ? CREAM : INK_SOFT }}
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

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'architecture' && (
          <div className="flex flex-col gap-3">
            {ARCH_CARDS.map((c) => (
              <ArchitectureCard
                key={c.id}
                card={c}
                onOpen={setDetailPanel}
                active={c.detail?.open === detailPanel}
              />
            ))}
            <div
              className="rounded-xl p-4 text-[12.5px] leading-[1.65]"
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
            <button
              type="button"
              onClick={() => setDetailPanel('obs')}
              data-testid="open-observability-secondary"
              className="self-start text-[11.5px] underline-offset-2 hover:underline mt-1"
              style={{ color: INK_QUIET }}
            >
              Observability dashboard →
            </button>
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
              Performance surface: runtime cold-start benchmarks, per-panel p50/p95 latency,
              pgvector index comparison charts.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const chatArea = (
    <div className="h-full min-w-0">
      <WorkshopChat onEvents={setEvents} />
    </div>
  )

  const detailArea = detailOpen && !isBenchModal && (
    <motion.div
      key={detailPanel}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full min-w-0"
      data-testid="detail-panel-slot"
    >
      {renderDetail()}
    </motion.div>
  )

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: CREAM, color: INK }}
    >
      {/* Top chrome — back-to-storefront + title + subtitle */}
      <header
        className="px-6 py-5 flex items-start gap-4"
        style={{ borderBottom: `1px solid ${INK_QUIET}30` }}
      >
        <Link
          to="/"
          data-testid="back-to-storefront"
          aria-label="Back to Blaize Bazaar storefront"
          className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
          style={{ color: INK_SOFT, border: `1px solid ${INK_QUIET}30` }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Blaize Bazaar
        </Link>
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] uppercase tracking-[0.18em] mb-1"
            style={{ color: INK_QUIET }}
          >
            DAT406 · Builders Session
          </p>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Fraunces', serif", color: INK }}
          >
            Workshop · agentic telemetry
          </h1>
          <p
            className="text-[13.5px] mt-1 max-w-3xl"
            style={{ color: INK_SOFT }}
          >
            Use AgentCore for solved primitives. Use Aurora for domain state you own. Chat on the
            left, watch the plan → panels → response trail replay in the middle, dig into
            dashboards on the right.
          </p>
        </div>
      </header>

      {/* Main — responsive three-band layout */}
      <main
        className="flex-1 px-4 md:px-6 py-5 min-h-0"
        data-testid="workshop-main"
        data-layout={isLaptop ? 'three-zone' : isTablet ? 'tablet-overlay' : 'vertical-stack'}
      >
        {isLaptop ? (
          // ≥ 1280px: resizable three-zone split via react-resizable-panels.
          // Default split is 38 / 62 (two-zone) → 30 / 30 / 40 (three-zone)
          // when a detail panel opens. Users can drag handles to adjust.
          <PanelGroup
            orientation="horizontal"
            className="h-[calc(100vh-180px)] flex"
          >
            <Panel defaultSize={detailOpen ? '30%' : '38%'} minSize="22%">
              {chatArea}
            </Panel>
            <PanelResizeHandle
              className="w-1.5 transition-colors hover:bg-[rgba(0,0,0,0.05)]"
              style={{ background: `${INK_QUIET}20` }}
            />
            <Panel defaultSize={detailOpen ? '30%' : '62%'} minSize="22%">
              {workArea}
            </Panel>
            <AnimatePresence>
              {detailArea && (
                <>
                  <PanelResizeHandle
                    className="w-1.5 transition-colors hover:bg-[rgba(0,0,0,0.05)]"
                    style={{ background: `${INK_QUIET}20` }}
                  />
                  <Panel defaultSize="40%" minSize="28%">
                    {detailArea}
                  </Panel>
                </>
              )}
            </AnimatePresence>
          </PanelGroup>
        ) : isTablet ? (
          // 1024-1280: two-zone work area. Detail panel overlays the
          // telemetry half when open — artifact pattern collapses to a
          // docked right overlay rather than a third column.
          <div className="relative h-[calc(100vh-180px)] grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4">
            {chatArea}
            <div className="relative min-w-0">
              {workArea}
              <AnimatePresence>
                {detailArea && (
                  <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="absolute inset-0 z-10"
                    data-testid="detail-panel-tablet-overlay"
                  >
                    {renderDetail()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // < 1024: vertical stack. Chat, tabs, detail pushed down below.
          <div className="flex flex-col gap-4">
            <div className="min-h-[520px]">{chatArea}</div>
            <div className="min-h-[520px]">{workArea}</div>
            {detailOpen && !isBenchModal && (
              <div className="min-h-[520px]" data-testid="detail-panel-stacked">
                {renderDetail()}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* IndexPerformanceDashboard is still a modal — the performance
          tab redesign is Week 7.5 scope. Keeping it out of the detail
          slot so its chart-heavy layout doesn't fight the panel's
          vertical space constraint. */}
      <IndexPerformanceDashboard
        isOpen={detailPanel === 'bench'}
        onClose={closeDetail}
      />
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
