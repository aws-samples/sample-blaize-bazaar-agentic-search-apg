/**
 * WorkshopPage — the `/workshop` route (a.k.a. "The Atelier").
 *
 * Claude Desktop / artifact-pattern layout. Three zones:
 *   LEFT   — WorkshopChat (primary input surface, default ~40%).
 *   CENTER — Telemetry | Architecture | Performance tabs (default ~60%).
 *   RIGHT  — Detail panel slot (hidden by default, slides in when an
 *            architecture card opens a dashboard; compresses the center
 *            zone rather than replacing it so the trace narrative stays
 *            visible during live demos).
 *
 * Full viewport width, laptop-optimized for 1280+ screens. Three
 * responsive bands:
 *   ≥ 1280px  three-zone resizable split (react-resizable-panels).
 *   1024-1280 detail panel overlays the telemetry half when open.
 *   < 1024    single-column vertical stack, detail pushes below.
 *
 * Teaching anchor: "Use AgentCore for solved primitives. Use Aurora
 * for domain state you own." Each architecture card carries a
 * provenance pill (Managed / Owned / Both / Teaching).
 *
 * Tab behavior:
 *   - Tabs render in order Telemetry → Architecture → Performance.
 *   - Default active tab is Architecture so first-time visitors get
 *     the orientation before they ask a question.
 *   - Once the first turn produces events, we flip to Telemetry one
 *     time (the "did it work?" moment).
 *   - The user's last explicit choice is persisted in localStorage so
 *     subsequent reloads open to where they last were.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
  Brain,
  Layers,
  Network,
  Server,
  ShieldCheck,
  Ruler,
  Wrench,
  ArrowRight,
} from 'lucide-react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { AuthGate } from '../App'
import { useUI } from '../contexts/UIContext'
import WorkshopChat from '../components/WorkshopChat'
import WorkshopTelemetry from '../components/WorkshopTelemetry'
import MemoryDashboard from '../components/MemoryDashboard'
import GatewayToolsPanel from '../components/GatewayToolsPanel'
import ObservabilityPanel from '../components/ObservabilityPanel'
import RuntimeStatusPanel from '../components/RuntimeStatusPanel'
import IndexPerformanceDashboard from '../components/IndexPerformanceDashboard'
import AtelierHero from '../components/AtelierHero'
import AtmosphereStrip from '../components/AtmosphereStrip'
import MetricsRow from '../components/MetricsRow'
import SessionHeader from '../components/SessionHeader'
import { useScrollAndFlash } from '../hooks/useScrollAndFlash'
import type { WorkshopEvent, WorkshopPanelEvent } from '../services/workshop'

const CREAM = '#fbf4e8'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const CREAM_WARM = '#f5e8d3'
const ACCENT = '#c44536'

type Tab = 'telemetry' | 'architecture' | 'performance'

type Provenance = 'MANAGED' | 'OWNED' | 'BOTH' | 'TEACHING'

type DetailPanelKey = 'memory' | 'gateway' | 'obs' | 'runtime' | 'bench' | null

// Provenance → (pill colors, icon, icon tint). The icon + its tint
// double-encode the provenance so a card reads correctly even if
// the pill falls out of the user's scan path.
const PROV_META: Record<
  Provenance,
  {
    pillBg: string
    pillBorder: string
    pillFg: string
    label: string
    iconFg: string
    iconBg: string
  }
> = {
  MANAGED:  { pillBg: '#e0f2fe', pillBorder: '#7dd3fc', pillFg: '#0369a1', label: 'Managed',  iconFg: '#0369a1', iconBg: '#e0f2fe' },
  OWNED:    { pillBg: '#ecfdf5', pillBorder: '#86efac', pillFg: '#047857', label: 'Owned',    iconFg: '#047857', iconBg: '#ecfdf5' },
  BOTH:     { pillBg: '#f3e8ff', pillBorder: '#d8b4fe', pillFg: '#7e22ce', label: 'Both',     iconFg: '#7e22ce', iconBg: '#f3e8ff' },
  TEACHING: { pillBg: '#fef3c7', pillBorder: '#fcd34d', pillFg: '#b45309', label: 'Teaching', iconFg: '#b45309', iconBg: '#fef3c7' },
}

type CardCTA =
  | { kind: 'action'; label: string; open: Exclude<DetailPanelKey, null> }
  | { kind: 'in-progress' }
  | { kind: 'none' }

interface ArchCard {
  id: string
  title: string
  provenance: Provenance
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  description: string
  cta: CardCTA
}

// Card order follows the agent's actual flow so an L400 reader
// infers the story: context → capabilities → protocol → data →
// compute → safety → measurement.
const ARCH_CARDS: ArchCard[] = [
  {
    id: 'memory',
    title: 'Memory',
    provenance: 'BOTH',
    Icon: Brain,
    description:
      'AgentCore Memory holds short-term conversation state; Aurora pgvector holds long-term semantic + procedural recall. Two tiers, one session id — the agent reads from whichever gives the right context for the turn.',
    cta: { kind: 'action', label: 'Open memory dashboard', open: 'memory' },
  },
  {
    id: 'tool-registry',
    title: 'Tool Registry · Gateway',
    provenance: 'BOTH',
    Icon: Wrench,
    description:
      "AgentCore Gateway publishes tools via MCP to any runtime; the teaching deconstruction shows the same discovery primitive implemented over Aurora pgvector. Both columns rank the same 9 tools — you see what Gateway abstracts for you.",
    cta: { kind: 'action', label: 'Open tool registry', open: 'gateway' },
  },
  {
    id: 'mcp',
    title: 'MCP',
    provenance: 'MANAGED',
    Icon: Network,
    description:
      "Model Context Protocol is an open standard; AgentCore Gateway is AWS's managed MCP server. This workshop uses Gateway as the MCP primitive — you could run your own MCP server, but Gateway handles tool publishing, auth, and observability for you.",
    cta: { kind: 'none' },
  },
  {
    id: 'state',
    title: 'State Management',
    provenance: 'OWNED',
    Icon: Server,
    description:
      'Session state lives in Postgres — orders, customers, approvals, tool audit. Aurora is the source of truth for domain facts the agents grant themselves access to; AgentCore never tries to own this side of the system.',
    cta: { kind: 'action', label: 'Open pgvector benchmarks', open: 'bench' },
  },
  {
    id: 'runtime',
    title: 'Runtime',
    provenance: 'MANAGED',
    Icon: Layers,
    description:
      "AgentCore Runtime runs the orchestrator inside a managed microVM — scale, cold-start, and VPC wiring are AWS's problem. Flip USE_AGENTCORE_RUNTIME on to promote the same code from local FastAPI to the hosted runtime without touching the orchestrator.",
    cta: { kind: 'action', label: 'Open runtime status', open: 'runtime' },
  },
  {
    id: 'grounding',
    title: 'Grounding · Approvals · Guardrails',
    provenance: 'BOTH',
    Icon: ShieldCheck,
    description:
      'Bedrock guardrails on the LLM; Aurora-backed approvals queue for sensitive tool calls (place_order, restock). One card because all three fire on the same turn boundary — the answer leaves only if it survives every check.',
    cta: { kind: 'in-progress' },
  },
  {
    id: 'evaluations',
    title: 'Evaluations',
    provenance: 'TEACHING',
    Icon: Ruler,
    description:
      "Offline evaluation harness + golden-set regression. We're showing this as a Postgres harness so you can see what AgentCore Evaluations does internally — precision, recall, and NDCG@k computed over a curated query set, reproducible row-by-row.",
    cta: { kind: 'none' },
  },
]

function ProvenancePill({ kind }: { kind: Provenance }) {
  const m = PROV_META[kind]
  return (
    <span
      className="font-mono text-[9.5px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded whitespace-nowrap"
      style={{ color: m.pillFg, border: `1px solid ${m.pillBorder}`, background: m.pillBg }}
    >
      {m.label}
    </span>
  )
}

/**
 * Architecture card — magazine-card treatment per the pre-Week-3
 * redesign. Icon tile top-left, provenance pill top-right, title in
 * Instrument Serif, body at 4-line clamp, fine rule before the CTA.
 *
 * CTA patterns:
 *   action       — solid link with arrow, opens the detail panel.
 *   in-progress  — disabled pill labeled "In progress" (operator
 *                  register for deferred surfaces that will ship).
 *   none         — no CTA at all; card stands on its body copy.
 *
 * When the card's detail panel is open, a 3px terracotta left border
 * + quiet cream-warm fill mark it active; the CTA label flips to
 * "Viewing · click to close".
 */
function ArchitectureCard({
  card,
  onOpen,
  active,
}: {
  card: ArchCard
  onOpen: (key: Exclude<DetailPanelKey, null>) => void
  active: boolean
}) {
  const m = PROV_META[card.provenance]
  const Icon = card.Icon
  const isActionCard = card.cta.kind === 'action'

  return (
    <article
      data-testid={`arch-card-${card.id}`}
      data-active={active ? 'true' : 'false'}
      className="group relative rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 ease-out"
      style={{
        background: active ? CREAM_WARM : CREAM,
        border: `1px solid ${active ? `${ACCENT}60` : `${INK_QUIET}25`}`,
        borderLeft: active ? `3px solid ${ACCENT}` : `1px solid ${INK_QUIET}25`,
        boxShadow: active
          ? '0 8px 24px rgba(107, 74, 53, 0.10), 0 4px 8px rgba(107, 74, 53, 0.06)'
          : '0 2px 8px rgba(107, 74, 53, 0.06), 0 1px 3px rgba(107, 74, 53, 0.04)',
        transform: active ? 'translate3d(0, -1px, 0)' : 'translate3d(0, 0, 0)',
      }}
    >
      {/* Top row — icon tile + provenance pill */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: m.iconBg, border: `1px solid ${m.pillBorder}` }}
          aria-hidden
        >
          <Icon className="w-5 h-5" style={{ color: m.iconFg }} />
        </div>
        <ProvenancePill kind={card.provenance} />
      </div>

      {/* Title */}
      <h3
        className="text-[17px] leading-[1.25]"
        style={{ color: INK, fontFamily: "'Iowan Old Style', Georgia, 'Times New Roman', serif", fontWeight: 500 }}
      >
        {card.title}
      </h3>

      {/* Body — 4-line clamp. The clamp is a soft ceiling; we write
          to fit inside it rather than relying on overflow. */}
      <p
        className="text-[13.5px] leading-[1.55]"
        style={{
          color: INK_SOFT,
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {card.description}
      </p>

      {/* Footer rule + CTA */}
      {card.cta.kind !== 'none' && (
        <>
          <div
            aria-hidden
            className="h-px w-full mt-auto"
            style={{ background: `${INK_QUIET}25` }}
          />
          {isActionCard && card.cta.kind === 'action' ? (
            <button
              type="button"
              onClick={() => onOpen(card.cta.kind === 'action' ? card.cta.open : ('memory' as const))}
              data-testid={`arch-card-open-${card.id}`}
              className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-75"
              style={{ color: INK, fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {active ? 'Viewing · click to close' : card.cta.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span
              data-testid={`arch-card-inprogress-${card.id}`}
              className="self-start font-mono text-[10px] uppercase tracking-[1.3px] px-2 py-0.5 rounded"
              style={{
                color: INK_QUIET,
                border: `1px solid ${INK_QUIET}40`,
                background: 'rgba(0,0,0,0.02)',
              }}
            >
              In progress
            </span>
          )}
        </>
      )}
    </article>
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

// Tab order in the UI (Telemetry leads because that's where attendees
// actually test a query). Default active tab is Architecture so the
// first-time visitor gets orientation before dissection — see
// ``useTabState`` below.
const TAB_ORDER: Tab[] = ['telemetry', 'architecture', 'performance']

const TAB_STORAGE_KEY = 'blaize-atelier-tab'

/**
 * Tab state with first-events auto-switch + localStorage persistence.
 *
 * - On first mount: read localStorage; if unset, default to
 *   ``'architecture'``.
 * - When the first panel event arrives on a first-time visit (no
 *   stored preference yet), auto-switch to Telemetry one time and
 *   save that choice. Subsequent events don't re-switch.
 * - Every explicit user tab click is persisted.
 *
 * The "one-time auto-switch" behavior matters for the live demo: we
 * want the first query to move the speaker's focus to the trace
 * without overriding the attendee who clicked back to Architecture
 * mid-turn.
 */
function useTabState(panelCount: number): [Tab, (t: Tab) => void] {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'architecture'
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY) as Tab | null
    return stored && TAB_ORDER.includes(stored) ? stored : 'architecture'
  })
  const autoSwitched = useRef(false)

  const setActiveTabPersisted = (t: Tab) => {
    setActiveTab(t)
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, t)
    } catch {
      // private mode / storage disabled — state-only tab is fine.
    }
    autoSwitched.current = true // explicit user choice ends auto-switching
  }

  useEffect(() => {
    if (autoSwitched.current) return
    if (panelCount === 0) return
    if (typeof window !== 'undefined' && window.localStorage.getItem(TAB_STORAGE_KEY)) {
      autoSwitched.current = true
      return
    }
    setActiveTab('telemetry')
    autoSwitched.current = true
  }, [panelCount])

  return [activeTab, setActiveTabPersisted]
}

function WorkshopContent() {
  const { openModal } = useUI()
  const [events, setEvents] = useState<WorkshopEvent[]>([])
  const [detailPanel, setDetailPanel] = useState<DetailPanelKey>(null)
  // Lifted from WorkshopChat so the SessionHeader on the right rail
  // can stay in sync with the chat's local session state.
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string | null
    customerLabel: string
  }>({ sessionId: null, customerLabel: 'Anonymous' })

  // Cross-panel citation scroll + 800ms terracotta pulse. Chat calls
  // ``scrollToTrace(ref)`` when a citation pill / "view trace" /
  // "Open in trace" link is clicked; the hook resolves the ref
  // against the right-rail panel cards by testid.
  const { containerRef: traceContainerRef, scrollToTrace } = useScrollAndFlash()

  const handleOpenTrace = (traceRef: string) => {
    // Ensure the Telemetry tab is showing before attempting to scroll —
    // a citation click while on Architecture should swap tabs first.
    if (activeTab !== 'telemetry') setActiveTab('telemetry')
    // Defer the scroll so the tab swap has a chance to mount the
    // panel cards before we query for them.
    requestAnimationFrame(() => scrollToTrace(traceRef))
  }

  // Three responsive bands: ≥ 1280 three-zone resizable, 1024-1280
  // detail overlays, < 1024 vertical stack.
  const isLaptop = useMediaQuery('(min-width: 1280px)')
  const isTablet = useMediaQuery('(min-width: 1024px) and (max-width: 1279.98px)')

  const panelCount = events.filter((e) => e.type === 'panel').length
  const [activeTab, setActiveTab] = useTabState(panelCount)

  // Four real metrics feeding the MetricsRow + AtmosphereStrip. All
  // derived from the current turn's events — no stubs, no per-session
  // counters that reset on reload.
  const metrics = useMemo(() => {
    const panels = events.filter(
      (e): e is WorkshopPanelEvent => e.type === 'panel',
    )
    const toolsUsed = panels.filter((p) => p.tag_class === 'cyan').length
    const elapsedMs = events.length
      ? events[events.length - 1].ts_ms - events[0].ts_ms
      : null
    // Median of the current turn's panel durations. AtmosphereStrip
    // renders this; the MetricsRow uses the turn-elapsed instead.
    let medianMs: number | null = null
    if (panels.length > 0) {
      const sorted = [...panels].map((p) => p.duration_ms).sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      medianMs =
        sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid]
    }
    // CONFIDENCE · last reply reads the ``result`` row of the most
    // recent MEMORY · CONFIDENCE panel. The panel's emitter writes
    // the percent as the "result" row's contribution cell (see
    // services/workshop_panels.compute_confidence); we parse leading
    // digits so "94 (clamped to [30, 98])" still yields 94.
    let confidencePercent: number | null = null
    for (let i = panels.length - 1; i >= 0; i--) {
      if (panels[i].tag === 'MEMORY · CONFIDENCE') {
        const resultRow = panels[i].rows.find(
          (r) => r[0]?.toLowerCase() === 'result',
        )
        if (resultRow && resultRow[1]) {
          const match = resultRow[1].match(/\d+/)
          if (match) confidencePercent = parseInt(match[0], 10)
        }
        break
      }
    }
    return { panels, toolsUsed, elapsedMs, medianMs, confidencePercent }
  }, [events])

  const detailOpen = detailPanel !== null
  const isBenchModal = detailPanel === 'bench' // IndexPerformanceDashboard stays modal for now

  const closeDetail = () => setDetailPanel(null)
  const openDetail = (key: Exclude<DetailPanelKey, null>) => setDetailPanel(key)

  const renderDetail = () => {
    if (detailPanel === 'memory') return <MemoryDashboard onClose={closeDetail} />
    if (detailPanel === 'gateway') return <GatewayToolsPanel onClose={closeDetail} />
    if (detailPanel === 'obs') return <ObservabilityPanel onClose={closeDetail} />
    if (detailPanel === 'runtime') return <RuntimeStatusPanel onClose={closeDetail} />
    return null
  }

  const workArea = (
    <div className="h-full flex flex-col gap-3 min-w-0">
      <SessionHeader
        sessionId={sessionInfo.sessionId}
        customerLabel={sessionInfo.customerLabel}
        elapsedMs={metrics.elapsedMs}
      />
      <div
        role="tablist"
        className="flex gap-1.5"
        style={{ borderBottom: '1px solid rgba(45, 24, 16, 0.12)' }}
      >
        {TAB_ORDER.map((t) => {
          const active = activeTab === t
          const showCount = t === 'telemetry' && panelCount > 0
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`workshop-tab-${t}`}
              onClick={() => setActiveTab(t)}
              className="px-[18px] py-[9px] text-[13px] font-medium transition-colors flex items-center gap-1.5"
              style={
                active
                  ? {
                      background: INK,
                      color: CREAM,
                      borderRadius: '8px 8px 0 0',
                    }
                  : { color: INK_SOFT, background: 'transparent' }
              }
            >
              <span className="capitalize">{t}</span>
              {showCount && (
                <span
                  className="font-mono text-[10px] px-[7px] rounded-full"
                  style={{
                    background: '#c44536',
                    color: 'white',
                    lineHeight: 1.6,
                  }}
                >
                  {panelCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div
        ref={traceContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {activeTab === 'architecture' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {ARCH_CARDS.map((c) => (
                <ArchitectureCard
                  key={c.id}
                  card={c}
                  onOpen={openDetail}
                  active={c.cta.kind === 'action' && c.cta.open === detailPanel}
                />
              ))}
            </div>
            <div
              className="rounded-xl p-4 text-[12.5px] leading-[1.7]"
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
              <ProvenancePill kind="MANAGED" /> AWS managed primitive.{' '}
              <ProvenancePill kind="OWNED" /> Postgres is the source of truth.{' '}
              <ProvenancePill kind="BOTH" /> Managed primitive paired with your own state.{' '}
              <ProvenancePill kind="TEACHING" /> Postgres used to demystify a managed primitive.
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
              In progress
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
      <WorkshopChat
        onEvents={setEvents}
        onSession={setSessionInfo}
        onOpenTrace={handleOpenTrace}
      />
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
      className="workshop-surface min-h-screen flex flex-col"
      style={{ background: CREAM, color: INK }}
    >
      {/* Global header chrome — wordmark + SurfaceToggle (Storefront /
          Atelier) + Account + Bag. Mounted on every route, including
          ``/workshop``, so the top navigation stays consistent and
          the surface-switch toggle has a permanent home. */}
      <Header
        current="home"
        onAccountClick={() => openModal('auth')}
      />

      {/* Editorial hero + atmosphere ticker + live metrics row,
          full-width above the chat/tabs split. The cream-warm
          background on the hero zone deepens the magazine feel: the
          white metric cards and white panel cards in the split below
          get to pop against the warmer band. */}
      <div
        data-testid="atelier-header-zone"
        style={{
          background: CREAM_WARM,
          borderBottom: `1px solid ${INK_QUIET}30`,
        }}
      >
        <AtelierHero />
        <AtmosphereStrip
          panelCount={panelCount}
          medianMs={metrics.medianMs}
        />
        <MetricsRow
          panelCount={panelCount}
          elapsedMs={metrics.elapsedMs}
          toolsUsed={metrics.toolsUsed}
          confidencePercent={metrics.confidencePercent}
        />
      </div>

      {/* Main — responsive three-band layout */}
      <main
        className="flex-1 px-4 md:px-6 py-5 min-h-0"
        data-testid="workshop-main"
        data-layout={isLaptop ? 'three-zone' : isTablet ? 'tablet-overlay' : 'vertical-stack'}
      >
        {isLaptop ? (
          <PanelGroup
            orientation="horizontal"
            className="h-[calc(100vh-420px)] min-h-[480px] flex"
          >
            <Panel defaultSize={detailOpen ? '30%' : '42%'} minSize="22%">
              {chatArea}
            </Panel>
            <PanelResizeHandle
              className="w-1.5 transition-colors hover:bg-[rgba(0,0,0,0.05)]"
              style={{ background: `${INK_QUIET}20` }}
            />
            <Panel defaultSize={detailOpen ? '30%' : '58%'} minSize="22%">
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
          <div className="relative h-[calc(100vh-420px)] min-h-[480px] grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4">
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

      {/* IndexPerformanceDashboard stays modal for now — the bench's
          chart-heavy layout fights the panel's vertical space
          constraint, so it retains its original full-screen mount. */}
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
