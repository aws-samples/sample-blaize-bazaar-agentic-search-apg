/**
 * WorkshopChat — Atelier chat column on the /workshop left rail.
 *
 * Owns the submit loop, session state, scroll behavior, and customer
 * picker. Delegates the visual composition of each agent reply to
 * ``AssistantTurn`` and the Turn primitive from services/workshop.ts,
 * which categorizes each event bundle into plan / panels / products /
 * confidence / text.
 *
 * Flow:
 *   1. User picks a seeded customer or stays anonymous.
 *   2. User submits a query (text or quick-query chip).
 *   3. ``queryWorkshop()`` returns ``{session_id, events}``.
 *   4. The turn is stored as ``Turn`` and handed up to the right
 *      rail via ``onEvents`` so the telemetry tab replays the same
 *      stream.
 *   5. ``AssistantTurn`` composes plan chip + tool chips + text.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import {
  queryWorkshop,
  eventsToTurn,
  type Turn,
  type WorkshopEvent,
} from '../services/workshop'
import CustomerCard from './atelier-chat/CustomerCard'
import UserMessage from './atelier-chat/UserMessage'
import AssistantTurn from './atelier-chat/AssistantTurn'
import QuickQueryChips from './atelier-chat/QuickQueryChips'

const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'

// Seeded demo customers from scripts/migrations/002_workshop_seed.sql.
const DEMO_CUSTOMERS: Array<{ id: string; label: string; sublabel?: string }> = [
  { id: 'anonymous', label: 'Anonymous' },
  { id: 'CUST-0001', label: 'Marco', sublabel: '3 prior orders · linen' },
  { id: 'CUST-0002', label: 'Anya', sublabel: 'workwear' },
  { id: 'CUST-0003', label: 'Priya', sublabel: 'evening' },
  { id: 'CUST-0004', label: 'Kenji', sublabel: 'tech' },
  { id: 'CUST-0005', label: 'Sofia', sublabel: 'beauty' },
  { id: 'CUST-0006', label: 'Leo', sublabel: 'sport' },
  { id: 'CUST-0007', label: 'Imani', sublabel: 'bags' },
  { id: 'CUST-0008', label: 'Haruto', sublabel: 'mobile' },
]

const QUICK_QUERIES = [
  "what's low on stock right now?",
  'compare two mens shirts',
  'return policy?',
]

interface WorkshopChatProps {
  /**
   * Parent owns the event list so WorkshopTelemetry (rendered in a
   * sibling column) can subscribe to the same stream.
   */
  onEvents: (events: WorkshopEvent[]) => void
  /**
   * Fired whenever the session id or customer identity changes so the
   * Atelier's SessionHeader (on the right rail) can stay in sync with
   * the chat's local state without lifting the state out of this
   * component.
   */
  onSession?: (state: { sessionId: string | null; customerLabel: string }) => void
  /**
   * Fired when a citation pill / "view trace" / "Open in trace" link
   * is clicked. The parent scrolls the telemetry tab to the matching
   * panel and flashes a terracotta border on it. The ``traceRef`` is
   * either ``"plan"``, a panel ``tag`` ("TOOL REGISTRY · DISCOVER"),
   * or a citation ``ref`` ("trace 7") — the scroll-and-flash hook on
   * the parent resolves each shape to the matching DOM node.
   */
  onOpenTrace?: (traceRef: string) => void
}

export default function WorkshopChat({
  onEvents,
  onSession,
  onOpenTrace,
}: WorkshopChatProps) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [customerId, setCustomerId] = useState<string>('anonymous')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const customer = useMemo(
    () => DEMO_CUSTOMERS.find((c) => c.id === customerId) ?? DEMO_CUSTOMERS[0],
    [customerId],
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns, isLoading])

  useEffect(() => {
    onSession?.({ sessionId, customerLabel: customer.label })
  }, [sessionId, customer.label, onSession])

  function resetSession() {
    setSessionId(null)
    setTurns([])
    setError(null)
    onEvents([])
  }

  async function submit(query: string) {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setInput('')
    setError(null)
    const turnId = `t-${Date.now()}`

    // Show the user message + a placeholder in-flight turn immediately
    // so the chat doesn't feel frozen while the request is in flight.
    setTurns((prev) => [
      ...prev,
      { id: turnId, user_text: trimmed, assistant_text: null, panels: [] },
    ])
    setIsLoading(true)

    try {
      const res = await queryWorkshop({
        query: trimmed,
        session_id: sessionId,
        customer_id: customerId === 'anonymous' ? null : customerId,
      })
      setSessionId(res.session_id)
      onEvents(res.events)

      // Replace the in-flight turn with the resolved one.
      const resolved = eventsToTurn(turnId, trimmed, res.events)
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? resolved : t)),
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, assistant_text: `Error: ${msg}` }
            : t,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${INK_QUIET}30`,
      }}
    >
      {/* Sticky section label — "ATELIER / CHAT → TELEMETRY" */}
      <div
        className="flex items-center gap-3 px-5 py-[14px] text-[10px] uppercase font-medium"
        style={{
          background: CREAM_WARM,
          borderBottom: `1px solid ${INK_QUIET}20`,
          color: INK_QUIET,
          letterSpacing: '0.16em',
        }}
      >
        <span>Atelier / Chat</span>
        <span className="flex-1 h-[1px]" style={{ background: `${INK_QUIET}30` }} />
        <span style={{ color: INK_SOFT }}>→ Telemetry</span>
      </div>

      {/* Scrolling turn list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        <CustomerCard
          name={customer.label}
          sublabel={customer.sublabel}
          sessionId={sessionId}
          onReset={resetSession}
          disabled={isLoading}
        />

        {turns.length === 0 && (
          <div
            className="text-center py-8 text-[13px]"
            style={{ color: INK_QUIET }}
          >
            Ask anything, or pick a quick query below. Telemetry renders on the right.
          </div>
        )}

        {turns.map((t) => (
          <div key={t.id}>
            <UserMessage text={t.user_text} />
            <AssistantTurn turn={t} onOpenTrace={onOpenTrace} />
          </div>
        ))}

        {/* Post-turn "try asking" strip — only once a turn has
            completed. Pre-turn the welcome + customer picker row
            below the list fills this role. */}
        {turns.length > 0 && turns[turns.length - 1].assistant_text !== null && (
          <QuickQueryChips
            queries={QUICK_QUERIES}
            onPick={submit}
            disabled={isLoading}
          />
        )}

        {isLoading && (
          <div
            className="text-[13px] italic"
            style={{ color: INK_QUIET, paddingLeft: 2 }}
          >
            thinking…
          </div>
        )}
        {error && !isLoading && (
          <div
            className="text-[12px] font-mono px-3 py-2 rounded-md mt-2"
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Customer picker + quick queries row (pre-turn only, so the
          starting experience stays inviting; once a turn lands, the
          QuickQueryChips panel in commit 4 takes over the recovery
          suggestions). */}
      {turns.length === 0 && (
        <div
          className="px-5 py-3 flex items-center gap-2 flex-wrap"
          style={{ borderTop: `1px solid ${INK_QUIET}20` }}
        >
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={isLoading}
            className="text-[12px] rounded-md px-2 py-1 font-mono"
            style={{
              background: CREAM,
              border: `1px solid ${INK_QUIET}40`,
              color: INK,
            }}
          >
            {DEMO_CUSTOMERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.sublabel ? ` · ${c.sublabel}` : ''}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submit(q)}
                disabled={isLoading}
                className="text-[11px] italic px-3 py-[5px] rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                  background: 'white',
                  color: INK_SOFT,
                  border: `1px solid ${INK_QUIET}30`,
                }}
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderTop: `1px solid ${INK_QUIET}20`, background: CREAM_WARM }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Blaize anything…"
          disabled={isLoading}
          className="flex-1 rounded-full px-4 py-[10px] text-[14px] outline-none"
          style={{
            background: 'white',
            color: INK,
            border: `1px solid ${INK_QUIET}40`,
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send"
          className="flex items-center justify-center rounded-full h-8 w-8 transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: INK, color: CREAM }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
