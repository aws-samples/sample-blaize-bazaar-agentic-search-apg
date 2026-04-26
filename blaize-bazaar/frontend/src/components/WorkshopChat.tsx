/**
 * WorkshopChat — slim left-column chat for the /workshop route.
 *
 * Purpose-built for the DAT406 telemetry surface. Deliberately thin:
 * no agent badges, no Under the Hood block, no trace-ID footer — all
 * of that teaching content lives in the right-side panels. This
 * component only owns the chat shell + submit loop.
 *
 * Flow:
 *   1. User picks a seeded customer (CUST-0001..0008) or stays anonymous.
 *   2. User submits a query (free text or quick-query button).
 *   3. Component calls queryWorkshop() → flat {session_id, events} reply.
 *   4. events are passed up via onEvents() so WorkshopTelemetry can
 *      replay them in the right column.
 *   5. The `response` event's text is appended to the message list here.
 *
 * Product rendering is Option B (simplified): view-only cards with
 * image, title, price, rating. No cart, no wishlist, no compare, no
 * swatches — this surface is teaching, not commerce. Week 1 returns
 * text only; product cards light up in Week 2 once the recommendation
 * panel is wired to the event stream.
 */
import { useState, useRef, useEffect } from 'react'
import { Send, RotateCw } from 'lucide-react'
import {
  queryWorkshop,
  type WorkshopEvent,
  type WorkshopResponseEvent,
} from '../services/workshop'

const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'

// Seeded demo customers from scripts/migrations/002_workshop_seed.sql.
// Keeping the label short so the dropdown stays compact.
const DEMO_CUSTOMERS: Array<{ id: string; label: string }> = [
  { id: 'anonymous', label: 'Anonymous' },
  { id: 'CUST-0001', label: 'Marco · linen' },
  { id: 'CUST-0002', label: 'Anya · workwear' },
  { id: 'CUST-0003', label: 'Priya · evening' },
  { id: 'CUST-0004', label: 'Kenji · tech' },
  { id: 'CUST-0005', label: 'Sofia · beauty' },
  { id: 'CUST-0006', label: 'Leo · sport' },
  { id: 'CUST-0007', label: 'Imani · bags' },
  { id: 'CUST-0008', label: 'Haruto · mobile' },
]

// Curated Week 1 queries — five one-liners that map to the agents we've
// already wired (search/pricing/recommendation/inventory/support). When
// more panels land in Week 2+ we'll point these at the new showcases.
const QUICK_QUERIES = [
  'Find me the best linen shirt under $150',
  'What is low on stock right now?',
  'Recommend something for a customer who buys summer staples',
  'Compare two mens shirts',
  'What is our return policy?',
]

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  // Reserved for Week 2+ when recommendation panels emit product rows.
  // Keeping the prop in the type now so later mounts don't require a
  // ChatMessage migration in the same branch.
  citations?: Array<{ k: string; ref: string }>
  confidence?: number | null
}

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
}

/** Parse a customer dropdown label ("Marco · linen") → display name ("Marco"). */
function customerDisplayName(customerId: string): string {
  if (customerId === 'anonymous') return 'Anonymous'
  const match = DEMO_CUSTOMERS.find((c) => c.id === customerId)
  if (!match) return customerId
  // "Marco · linen" → "Marco"
  return match.label.split('·')[0].trim()
}

export default function WorkshopChat({ onEvents, onSession }: WorkshopChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [customerId, setCustomerId] = useState<string>('anonymous')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    onSession?.({
      sessionId,
      customerLabel: customerDisplayName(customerId),
    })
  }, [sessionId, customerId, onSession])

  function resetSession() {
    setSessionId(null)
    setMessages([])
    setError(null)
    onEvents([])
  }

  async function submit(query: string) {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setIsLoading(true)

    try {
      const res = await queryWorkshop({
        query: trimmed,
        session_id: sessionId,
        customer_id: customerId === 'anonymous' ? null : customerId,
      })
      setSessionId(res.session_id)
      onEvents(res.events)

      const response = res.events.find(
        (e) => e.type === 'response',
      ) as WorkshopResponseEvent | undefined
      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: response.text,
            citations: response.citations,
            confidence: response.confidence,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '(no response event returned)' },
        ])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${msg}` },
      ])
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
      {/* Session controls */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: `1px solid ${INK_QUIET}20`, background: CREAM_WARM }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[1.5px] font-semibold"
          style={{ color: INK_SOFT }}
        >
          Chat
        </span>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="text-[12px] rounded-md px-2 py-1 font-mono"
          style={{
            background: CREAM,
            border: `1px solid ${INK_QUIET}40`,
            color: INK,
          }}
          disabled={isLoading}
        >
          {DEMO_CUSTOMERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {sessionId && (
          <span
            className="font-mono text-[10px] truncate max-w-[140px]"
            style={{ color: INK_QUIET }}
            title={sessionId}
          >
            {sessionId}
          </span>
        )}
        <button
          type="button"
          onClick={resetSession}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-opacity hover:opacity-70"
          style={{ color: INK_SOFT, border: `1px solid ${INK_QUIET}40`, background: CREAM }}
          disabled={isLoading}
          title="Clear session and events"
        >
          <RotateCw className="h-3 w-3" />
          New session
        </button>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div
            className="text-center py-8 text-[13px]"
            style={{ color: INK_QUIET }}
          >
            Pick a quick query below, or ask anything. Telemetry renders on the right.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-[14px] leading-[1.55] ${
              msg.role === 'user' ? 'self-end' : 'self-start'
            }`}
            style={{
              background: msg.role === 'user' ? INK : 'rgba(255,255,255,0.85)',
              color: msg.role === 'user' ? CREAM : INK,
              border: msg.role === 'assistant' ? `1px solid ${INK_QUIET}25` : 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.text}
            {msg.role === 'assistant' && msg.confidence != null && (
              <div
                className="mt-1.5 font-mono text-[10px] uppercase tracking-[1px]"
                style={{ color: INK_QUIET }}
              >
                confidence · {(msg.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div
            className="self-start text-[13px] italic"
            style={{ color: INK_QUIET }}
          >
            thinking…
          </div>
        )}
        {error && !isLoading && (
          <div
            className="self-start text-[12px] font-mono px-3 py-2 rounded-md"
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

      {/* Quick queries */}
      {messages.length === 0 && (
        <div
          className="px-4 py-3 flex flex-wrap gap-1.5"
          style={{ borderTop: `1px solid ${INK_QUIET}20` }}
        >
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              disabled={isLoading}
              className="text-[11.5px] px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                background: CREAM_WARM,
                color: INK_SOFT,
                border: `1px solid ${INK_QUIET}30`,
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex items-end gap-2 px-4 py-3"
        style={{ borderTop: `1px solid ${INK_QUIET}20`, background: CREAM_WARM }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit(input)
            }
          }}
          placeholder="Ask the agents…"
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-md px-3 py-2 text-[14px] font-sans outline-none"
          style={{
            background: CREAM,
            color: INK,
            border: `1px solid ${INK_QUIET}40`,
            minHeight: '38px',
            maxHeight: '120px',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center rounded-md h-[38px] w-[38px] transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: INK, color: CREAM }}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
