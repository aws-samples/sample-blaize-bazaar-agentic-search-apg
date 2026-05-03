/**
 * AtelierPage — the `/atelier` route, redesigned shell.
 *
 * Composes the atelier-v2 components into the mockup's layout:
 *
 *   ┌─────────────┬────────────────────────────────────────┐
 *   │             │  AtelierTopBar                         │
 *   │  Atelier    ├────────────────────────────────────────┤
 *   │  Sidebar    │  AtelierSessionHero                    │
 *   │  (260px)    │  ┌──────────────┬───────────────────┐ │
 *   │             │  │ Timeline     │ RecommendationPanel│ │
 *   │             │  └──────────────┴───────────────────┘ │
 *   │             │  AtelierInputBar                       │
 *   │             │  AtelierBottomCards (3 cards)          │
 *   │             │  AtelierFooterStats                    │
 *   └─────────────┴────────────────────────────────────────┘
 *
 * When the sidebar is on "observatory" (default) we render the full
 * live session view above. When the user clicks Memory / Tools / etc.
 * in the sidebar, we render the existing architecture detail page
 * for that section in the main canvas so the deep instrumentation
 * work doesn't need to be re-done. The route
 * `/atelier/architecture/:section` still points at WorkshopPage for
 * backwards-compatibility with existing deep links.
 *
 * Chat wiring: we reuse `useAgentChat` so every SSE event
 * (skill_routing, agent_step, tool_call, content_delta, product,
 * runtime_timing, db_queries, complete) flows into the same
 * localStorage bridge that the arch pages already poll. No new
 * backend routes.
 */
import { useMemo, useState } from 'react'

import AtelierSidebar, {
  type AtelierSection,
} from '../components/atelier-v2/AtelierSidebar'
import AtelierTopBar from '../components/atelier-v2/AtelierTopBar'
import AtelierSessionHero from '../components/atelier-v2/AtelierSessionHero'
import AtelierTimeline, {
  type TimelineStep,
} from '../components/atelier-v2/AtelierTimeline'
import AtelierRecommendationPanel from '../components/atelier-v2/AtelierRecommendationPanel'
import AtelierInputBar from '../components/atelier-v2/AtelierInputBar'
import AtelierBottomCards from '../components/atelier-v2/AtelierBottomCards'
import AtelierFooterStats from '../components/atelier-v2/AtelierFooterStats'

import MemoryArchPage from '../components/atelier-arch/MemoryArchPage'
import ToolRegistryArchPage from '../components/atelier-arch/ToolRegistryArchPage'
import EvaluationsArchPage from '../components/atelier-arch/EvaluationsArchPage'

import { useAgentChat } from '../hooks/useAgentChat'
import { AuthGate } from '../App'
import { useCatalog } from '../components/atelier-arch/shared-catalog'

const CREAM = '#f7f3ee'

// ---------------------------------------------------------------------------
// Observatory — the default live-session view composed of all 8 v2 components
// ---------------------------------------------------------------------------

function ObservatoryView() {
  const { messages, sendMessage, isLoading } = useAgentChat({
    mode: 'atelier',
    persistKey: 'blaize-concierge-atelier',
  })
  const { catalog } = useCatalog()

  // Last user turn drives the hero headline. We strip any persona
  // preamble the backend may have prepended so the headline reads
  // like the shopper's own question, not like engineering log output.
  const lastQuery = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'user' && typeof m.content === 'string') {
        return m.content.trim()
      }
    }
    return undefined
  }, [messages])

  // Timeline steps — for now we render placeholder steps until the
  // backend emits structured `reasoning_step` events. When the real
  // event stream lands, map each event → TimelineStep here.
  // The timeline component itself handles the empty state with a
  // muted placeholder grid, so passing `undefined` is the right move.
  const steps: TimelineStep[] | undefined = undefined

  // Product recommendation — reads the last product event the hook
  // captured. useAgentChat persists products on each message so we
  // can find the freshest one by walking backwards through messages.
  const lastProduct = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as { products?: unknown[] }
      if (Array.isArray(m.products) && m.products.length > 0) {
        const p = m.products[0] as {
          name?: string
          brand?: string
          price?: number
          imageUrl?: string
          description?: string
        }
        if (p.name && typeof p.price === 'number') {
          return {
            name: p.name,
            brand: p.brand,
            price: p.price,
            imageUrl: p.imageUrl ?? '',
            description: p.description,
          }
        }
      }
    }
    return undefined
  }, [messages])

  return (
    <div
      className="flex flex-col"
      style={{ background: CREAM, minHeight: '100dvh' }}
    >
      {/* Session hero */}
      <AtelierSessionHero
        query={lastQuery}
        sessionId="7F5A"
        agentName="Style Advisor"
      />

      {/* Main split: Timeline left, Recommendation right */}
      <div
        className="max-w-[1440px] mx-auto w-full grid gap-6 px-8 py-8"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
        }}
      >
        <div>
          <AtelierTimeline steps={steps} />
          <div className="mt-6">
            <AtelierInputBar
              onSubmit={(v) => sendMessage(v)}
              isLoading={isLoading}
            />
          </div>
        </div>
        <div>
          <AtelierRecommendationPanel product={lastProduct} />
        </div>
      </div>

      {/* Three expanded detail cards */}
      <div className="max-w-[1440px] mx-auto w-full px-8 pb-8">
        <AtelierBottomCards sessionId="7F5A" />
      </div>

      {/* Footer stats */}
      <AtelierFooterStats
        activeAgents={catalog?.agents?.length ?? 12}
        dataSources={4}
        decisionsToday="3.2K"
        successRate="96.7%"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section router — maps sidebar selection to the rendered main canvas.
// ---------------------------------------------------------------------------

function SectionContent({ section }: { section: AtelierSection }) {
  switch (section) {
    case 'observatory':
      return <ObservatoryView />
    case 'memory':
      return (
        <div style={{ background: CREAM, minHeight: '100dvh' }} className="px-8 py-8">
          <MemoryArchPage />
        </div>
      )
    case 'tools':
      return (
        <div style={{ background: CREAM, minHeight: '100dvh' }} className="px-8 py-8">
          <ToolRegistryArchPage />
        </div>
      )
    case 'evaluations':
      return (
        <div style={{ background: CREAM, minHeight: '100dvh' }} className="px-8 py-8">
          <EvaluationsArchPage />
        </div>
      )
    case 'sessions':
    case 'inventory':
    case 'agents':
    case 'settings':
      return (
        <div
          style={{ background: CREAM, minHeight: '100dvh' }}
          className="flex items-center justify-center px-8 py-8"
        >
          <ComingSoon section={section} />
        </div>
      )
    default:
      return <ObservatoryView />
  }
}

function ComingSoon({ section }: { section: string }) {
  const label = section.charAt(0).toUpperCase() + section.slice(1)
  return (
    <div className="text-center max-w-md">
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(31, 20, 16, 0.55)',
          marginBottom: 12,
          fontWeight: 600,
        }}
      >
        Coming soon
      </div>
      <h2
        style={{
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 36,
          lineHeight: 1.1,
          color: '#1f1410',
          marginBottom: 16,
        }}
      >
        {label} is next.
      </h2>
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'rgba(31, 20, 16, 0.65)',
        }}
      >
        This surface is reserved for the {label.toLowerCase()} view — it lands in the
        next Atelier iteration. Observatory is the default for this session.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AtelierPage — top-level grid (sidebar + main canvas)
// ---------------------------------------------------------------------------

function AtelierContent() {
  const [activeSection, setActiveSection] = useState<AtelierSection>('observatory')

  return (
    <div
      className="grid min-h-dvh"
      style={{
        gridTemplateColumns: '260px minmax(0, 1fr)',
        background: CREAM,
      }}
    >
      <AtelierSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />
      <div className="flex flex-col min-w-0">
        <AtelierTopBar />
        <div className="flex-1 min-w-0">
          <SectionContent section={activeSection} />
        </div>
      </div>
    </div>
  )
}

export default function AtelierPage() {
  return (
    <AuthGate>
      <AtelierContent />
    </AuthGate>
  )
}
