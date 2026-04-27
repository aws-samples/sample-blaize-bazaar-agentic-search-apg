/**
 * StorefrontChat — editorial chat rendering for the storefront concierge.
 *
 * Matches docs/blaize-chat-experience.html. Renders inside ConciergeModal
 * when mode === 'storefront'. The atelier branch stays in ConciergeModal
 * untouched.
 *
 * Elements: editorial header with burgundy tick + pulsing status dot,
 * edition strip, italic-serif user bubbles with curly quotes, agent
 * blocks with mini-B eyebrow, streaming text with burgundy cursor,
 * sticky input with espresso send button.
 *
 * No telemetry language. No agent badges. No Under the Hood. No raw
 * tool names. Those live on the atelier toggle.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { AgentChatMessage } from '../hooks/useAgentChat'
import type { CartItemOrigin } from '../contexts/CartContext'
import { usePersona } from '../contexts/PersonaContext'
import MarkdownMessage from './MarkdownMessage'
import StorefrontWelcome from './StorefrontWelcome'
import ProductArtifactCard from './ProductArtifactCard'
import '../styles/storefront-chat.css'

interface StorefrontChatProps {
  messages: AgentChatMessage[]
  inputValue: string
  setInputValue: (v: string) => void
  isLoading: boolean
  backendOnline: boolean
  sendMessage: (text?: string) => Promise<void>
  clearChat: (resetTo?: AgentChatMessage[]) => void
  initialMessages: AgentChatMessage[]
  closeModal: () => void
  addToCart: (item: {
    productId: number
    name: string
    price: number
    image?: string
    origin: CartItemOrigin
  }) => void
}

/** Relative time label for user message eyebrow. */
function relativeTime(ts: Date): string {
  const diff = Date.now() - ts.getTime()
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export default function StorefrontChat({
  messages,
  inputValue,
  setInputValue,
  isLoading,
  backendOnline,
  sendMessage,
  clearChat,
  initialMessages,
  closeModal,
  addToCart,
}: StorefrontChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { persona } = usePersona()

  // Auto-scroll only if user is near the bottom.
  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) {
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [messages])

  const hasUserMessages = messages.some((m) => m.role === 'user')

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Status state for the header.
  const statusLabel = !backendOnline
    ? 'Offline'
    : isLoading
      ? 'Composing'
      : 'Concierge in residence'
  const statusState: 'idle' | 'composing' | 'offline' = !backendOnline
    ? 'offline'
    : isLoading
      ? 'composing'
      : 'idle'

  // Current time for edition strip.
  const now = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <>
      {/* ---- Header ---- */}
      <div className="ec-header">
        <div className="ec-brand">
          <div className="ec-b-mark">B</div>
          <div className="ec-title-stack">
            <div className="ec-title">Ask Blaize</div>
            <div className="ec-status">
              {statusState === 'composing' ? (
                <>
                  <span className="ec-dot-typing" />
                  <span className="ec-status-label">&nbsp;&nbsp;&nbsp;&nbsp;Composing</span>
                </>
              ) : statusState === 'offline' ? (
                <span className="ec-status-label" style={{ color: 'var(--red-1)' }}>Offline</span>
              ) : (
                <>
                  <span className="ec-dot ec-dot-pulse" />
                  <span className="ec-status-label">{statusLabel}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ec-actions">
          <button
            type="button"
            className="ec-text-link"
            onClick={() => clearChat(initialMessages)}
          >
            Reset
          </button>
          <button
            type="button"
            className="ec-icon-btn"
            aria-label="Close"
            onClick={closeModal}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ---- Edition strip ---- */}
      <div className="ec-edition-strip">
        <div className="ec-edition-left">
          <span className="ec-edition-dot" />
          Edition 06 &middot; Tonight at the boutique
        </div>
        <div>{timeStr}</div>
      </div>

      {/* ---- Conversation scroll area ---- */}
      <div className="ec-conversation" ref={scrollAreaRef}>
        {/* Welcome state */}
        {!hasUserMessages && (
          <StorefrontWelcome
            persona={persona}
            onSend={(text) => void sendMessage(text)}
          />
        )}

        {/* Messages — once the user sends a message, render the full
            conversation. Skip the pre-seeded assistant welcome. */}
        <AnimatePresence initial={false}>
          {hasUserMessages && messages.map((message, index) => {
            // Skip the initial assistant welcome message (index 0, before any user message)
            if (index === 0 && message.role === 'assistant' && messages.length > 1 && messages[1]?.role === 'user') {
              return null
            }
            return (
            <motion.div
              key={`msg-${index}-${message.timestamp.getTime()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {message.role === 'user' ? (
                <UserMessage message={message} />
              ) : (
                <AgentMessage
                  message={message}
                  addToCart={addToCart}
                />
              )}
            </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ---- Sticky input ---- */}
      <div className="ec-input">
        <input
          type="text"
          className="ec-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tell Blaize what you're looking for..."
          disabled={isLoading}
        />
        <button
          type="button"
          className="ec-send"
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send"
          onClick={() => sendMessage()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </>
  )
}


/* ---- User message bubble ---- */
function UserMessage({ message }: { message: AgentChatMessage }) {
  return (
    <div className="ec-msg-user">
      <div className="ec-msg-user-eyebrow">
        <span style={{ color: 'var(--red-1)' }}>&middot;</span>
        You &middot; {relativeTime(message.timestamp)}
      </div>
      <div className="ec-msg-user-text">
        {message.content}
      </div>
    </div>
  )
}

/* ---- Agent message block ---- */

/**
 * toolLabel — maps raw tool function names to boutique language.
 * Never shows the raw function call in storefront mode.
 */
function toolLabel(
  toolName: string,
  _status: string,
): { label: string; meta?: string } {
  const n = toolName.toLowerCase()
  if (n.includes('search_products') || n.includes('search'))
    return { label: 'Searched the boutique' }
  if (n.includes('get_trending') || n.includes('recommendation') || n.includes('get_recommendations'))
    return { label: 'Pulled recommendations' }
  if (n.includes('check_inventory') || n.includes('inventory') || n.includes('get_low_stock'))
    return { label: 'Checked the floor' }
  if (n.includes('get_price') || n.includes('pricing') || n.includes('price_analysis'))
    return { label: 'Confirmed pricing' }
  if (n.includes('recall') || n.includes('memory') || n.includes('session'))
    return { label: 'Read your last visit' }
  if (n.includes('restock'))
    return { label: 'Flagged for restock' }
  // Fallback: clean up the function name into a readable phrase
  const cleaned = toolName
    .replace(/_/g, ' ')
    .replace(/^get /i, '')
    .replace(/^check /i, 'Checked ')
  return { label: cleaned.charAt(0).toUpperCase() + cleaned.slice(1) }
}

/**
 * skillDisplayName — fallback for routing events that arrive before
 * the full skill registry is fetched. The backend emits the lowercase
 * canonical name in ``loaded_skills`` (e.g. ``style-advisor``); for
 * the storefront we want the reader-friendly form (``style advisor``).
 *
 * The ``display_name`` field in SKILL.md frontmatter is the source of
 * truth, but the SSE event only carries the canonical name. We map
 * the two shipping skills here; unknown skills fall through to
 * hyphen-split which is still readable.
 */
const SKILL_DISPLAY_NAMES: Record<string, string> = {
  'style-advisor': 'style advisor',
  'gift-concierge': 'gift concierge',
}

function skillDisplayName(canonicalName: string): string {
  return (
    SKILL_DISPLAY_NAMES[canonicalName] ?? canonicalName.replace(/-/g, ' ')
  )
}

/**
 * formatAttribution — compose the "Drawing from..." line.
 *
 *   0 skills: empty string (caller must not render anything)
 *   1 skill:  "Drawing from the style advisor"
 *   2 skills: "Drawing from the style advisor and the gift concierge"
 *   3+:       "Drawing from the X, the Y, and the Z"
 *
 * Oxford comma for 3+ per storefront copy style. Never shown when the
 * list is empty — the storefront treats "no skills active" as invisible.
 */
function formatAttribution(loadedSkills: string[]): string {
  const names = loadedSkills.map(skillDisplayName)
  if (names.length === 0) return ''
  if (names.length === 1) return `Drawing from the ${names[0]}`
  if (names.length === 2)
    return `Drawing from the ${names[0]} and the ${names[1]}`
  const head = names.slice(0, -1).map((n) => `the ${n}`).join(', ')
  return `Drawing from ${head}, and the ${names[names.length - 1]}`
}

function AgentMessage({
  message,
  addToCart,
}: {
  message: AgentChatMessage
  addToCart: StorefrontChatProps['addToCart']
}) {
  const isThinking = message.agentStatus === 'thinking' && !message.content
  const isStreaming = message.agentStatus === 'streaming'
  const isComplete = message.agentStatus === 'complete'
  const [thinkingOpen, setThinkingOpen] = useState(!isComplete)

  // Auto-collapse thinking when body starts streaming
  useEffect(() => {
    if (message.content && message.content.length > 0 && thinkingOpen) {
      setThinkingOpen(false)
    }
  }, [message.content]) // eslint-disable-line react-hooks/exhaustive-deps

  const reasoning = message.agentExecution?.reasoning_steps
  const hasReasoning = reasoning && reasoning.length > 0
  const reasoningText = hasReasoning
    ? reasoning.map((r) => r.content).join(' ')
    : null
  const toolCalls = message.agentExecution?.tool_calls
  const durationSec = message.agentExecution?.total_duration_ms
    ? (message.agentExecution.total_duration_ms / 1000).toFixed(1)
    : null

  return (
    <div className="ec-msg-agent">
      {/* Eyebrow */}
      <div className="ec-msg-agent-eyebrow">
        <span className="ec-b-mini">B</span>
        Blaize
      </div>

      {/* Skill attribution — renders only when the router loaded one or
          more skills for this turn. Matches the italic burgundy eyebrow
          register used elsewhere in the editorial chat; intentionally
          minimal (a whisper, not a badge). */}
      {message.skillRouting &&
        message.skillRouting.loaded_skills.length > 0 && (
          <div className="ec-msg-attribution">
            {formatAttribution(message.skillRouting.loaded_skills)}
          </div>
        )}

      {/* Thinking state — inline dots when no reasoning yet */}
      {isThinking && !hasReasoning && (
        <div className="ec-thinking-inline">
          <span className="ec-thinking-label">Considering</span>
          <span className="ec-dot-typing ec-dot-typing-sm" />
        </div>
      )}

      {/* Thinking block — collapsible with shimmer */}
      {hasReasoning && (
        <div className={`ec-thinking ${thinkingOpen ? 'ec-thinking-open' : ''}`}>
          <button
            type="button"
            className="ec-thinking-header"
            onClick={() => setThinkingOpen((o) => !o)}
          >
            <div className="ec-thinking-header-left">
              <span className="ec-thinking-header-label">Considering</span>
              {durationSec && (
                <span className="ec-thinking-header-duration">{durationSec}s</span>
              )}
            </div>
            <span className={`ec-thinking-chevron ${thinkingOpen ? 'ec-thinking-chevron-open' : ''}`}>
              &#x25BE;
            </span>
          </button>
          {thinkingOpen && (
            <div className="ec-thinking-body">
              <p className={isStreaming && !message.content ? 'shimmer-text' : ''}>
                {reasoningText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tool-call lines */}
      {toolCalls && toolCalls.length > 0 && (
        <div className="ec-toolcalls">
          {toolCalls.map((tc, i) => {
            const isActive = tc.status !== 'success' && tc.status !== 'error'
            const { label, meta } = toolLabel(tc.tool, tc.status)
            return (
              <div
                key={i}
                className={`ec-toolcall ${isActive ? 'ec-toolcall-active' : 'ec-toolcall-complete'}`}
              >
                <span className="ec-toolcall-indicator">
                  {isActive ? '\u25CF' : '\u2713'}
                </span>
                <span className="ec-toolcall-label">{label}</span>
                {meta && <span className="ec-toolcall-meta">{meta}</span>}
                {tc.duration_ms > 0 && !meta && (
                  <span className="ec-toolcall-meta">
                    {tc.duration_ms < 1000
                      ? `${tc.duration_ms}ms`
                      : `${(tc.duration_ms / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Message body */}
      {message.content && (
        <div className={`ec-msg-body ${isStreaming ? 'ec-msg-streaming' : ''}`}>
          <MarkdownMessage content={message.content} />
          {isStreaming && <span className="ec-cursor" />}
        </div>
      )}

      {/* Product cards */}
      {message.products && message.products.length > 0 && (
        <div className="ec-artifacts">
          {message.products.map((product, pIdx) => (
            <motion.div
              key={product.id || pIdx}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: pIdx * 0.1,
                duration: 0.38,
                ease: [0.2, 0.9, 0.3, 1.05],
              }}
            >
              <ProductArtifactCard
                product={product}
                onAddToCart={() => {
                  addToCart({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image || '',
                    origin: 'chat',
                  })
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
