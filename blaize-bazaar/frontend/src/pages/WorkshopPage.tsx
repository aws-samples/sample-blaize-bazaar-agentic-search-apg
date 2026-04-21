/**
 * WorkshopPage — the `/workshop` route.
 *
 * Instrumentation-only surface for the DAT406 workshop. No storefront
 * chrome, no legacy dev-tool FABs. Just:
 *   - Brief header text explaining how to trigger the specialists
 *   - AgentReasoningTraces side panel (event-driven; picks up
 *     `agent-execution-complete` dispatched by the chat flow)
 *   - IndexPerformanceDashboard (pgvector HNSW vs sequential benchmarks)
 *   - Footer (same component as HomePage)
 *
 * Wrapped in AuthGate so the Cognito-configured / not-configured branching
 * still applies. When Cognito is unset, AuthGate renders children directly;
 * when set, it gates on `isAuthenticated`.
 */
import { useState } from 'react'
import AgentReasoningTraces from '../components/AgentReasoningTraces'
import IndexPerformanceDashboard from '../components/IndexPerformanceDashboard'
import Footer from '../components/Footer'
import { AuthGate } from '../App'

const CREAM = '#fbf4e8'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'

function WorkshopContent() {
  const [tracesMode, setTracesMode] = useState<'hidden' | 'collapsed' | 'expanded'>('collapsed')
  const [benchmarkOpen, setBenchmarkOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: CREAM, color: INK }}>
      <header
        className="max-w-4xl mx-auto px-6 py-12"
        style={{ borderBottom: `1px solid ${INK_QUIET}30` }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.18em] mb-3"
          style={{ color: INK_QUIET }}
        >
          DAT406 · Instrumentation
        </p>
        <h1
          className="text-4xl mb-3"
          style={{ fontFamily: "'Fraunces', serif", color: INK }}
        >
          Instrumentation mode
        </h1>
        <p className="text-base" style={{ color: INK_SOFT, maxWidth: '40rem' }}>
          Press <kbd className="px-1.5 py-0.5 rounded border text-[12px] font-mono" style={{ borderColor: INK_QUIET, background: 'rgba(255,255,255,0.5)', color: INK }}>⌘K</kbd> to
          chat and watch specialist routing in real time. Agent traces stream
          into the side panel as the orchestrator fans out; index benchmarks
          run on demand below.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <section
          className="rounded-xl p-6 mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            border: `1px solid ${INK_QUIET}30`,
          }}
        >
          <h2
            className="text-xl mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: INK }}
          >
            Agent traces
          </h2>
          <p className="text-sm mb-4" style={{ color: INK_SOFT }}>
            Real-time waterfall of agent steps and tool calls from the last
            chat turn. Opens automatically when the orchestrator finishes.
          </p>
          <button
            type="button"
            onClick={() => setTracesMode('expanded')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-85"
            style={{ background: INK, color: CREAM }}
          >
            Open trace panel
          </button>
        </section>

        <section
          className="rounded-xl p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            border: `1px solid ${INK_QUIET}30`,
          }}
        >
          <h2
            className="text-xl mb-2"
            style={{ fontFamily: "'Fraunces', serif", color: INK }}
          >
            pgvector index benchmarks
          </h2>
          <p className="text-sm mb-4" style={{ color: INK_SOFT }}>
            Compare HNSW index performance against a sequential scan across
            dataset sizes, quantization strategies, and iterative-scan filters.
          </p>
          <button
            type="button"
            onClick={() => setBenchmarkOpen(true)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-85"
            style={{ background: INK, color: CREAM }}
          >
            Open benchmark dashboard
          </button>
        </section>
      </main>

      <Footer />

      <AgentReasoningTraces
        mode={tracesMode}
        onCollapse={() => setTracesMode('collapsed')}
        onExpand={() => setTracesMode('expanded')}
        onClose={() => setTracesMode('hidden')}
      />

      <IndexPerformanceDashboard
        isOpen={benchmarkOpen}
        onClose={() => setBenchmarkOpen(false)}
      />
    </div>
  )
}

export default function WorkshopPage() {
  return <AuthGate><WorkshopContent /></AuthGate>
}
