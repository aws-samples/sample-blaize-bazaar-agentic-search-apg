/**
 * useAgentChat — streaming chat state machine shared by ConciergeModal and
 * (transitionally) AIAssistant. Owns the SSE event loop, message array,
 * input value, loading/backend/session-cost state, and persistence.
 *
 * Rendering concerns (scroll, animations, badge layout, Under the Hood
 * block) stay in the component; the hook only produces well-shaped
 * AgentChatMessage objects with all metadata populated.
 *
 * `mode` switches high-level behavior:
 *   - 'storefront' — no agent inference, no agent badges, plain chat
 *   - 'atelier'    — populate agent/agentExecution so instrumentation UI
 *                    (badges, Under the Hood) can render
 *
 * `workshopMode` and `guardrailsEnabled` are passed through to the
 * streaming endpoint so backend routing (legacy/search/agentic/production)
 * works identically to the old AIAssistant flow.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkBackendHealth,
  sendChatMessageStreaming,
  type ChatProduct,
} from '../services/chat'
import type { WorkshopMode } from '../contexts/LayoutContext'

export type ChatMode = 'storefront' | 'atelier'

export interface AgentStep {
  agent: string
  action: string
  status: string
  timestamp: number
  duration_ms: number
}

export interface ToolCall {
  tool: string
  params?: string
  timestamp: number
  duration_ms: number
  status: string
}

export interface AgentExecution {
  agent_steps: AgentStep[]
  tool_calls: ToolCall[]
  reasoning_steps: Array<{ step: string; content: string; timestamp: number }>
  total_duration_ms: number
  success_rate: number
  /** False when Strands' TracerProvider isn't SDK-backed. UI shows a
   * banner and suppresses the waterfall when this is explicitly false. */
  otel_enabled?: boolean
  /** Actionable failure string from the backend when otel_enabled is
   * false. Rendered verbatim in the banner. */
  reason?: string
}

/**
 * Skill routing decision for one turn.
 *
 * Shape mirrors the backend ``RouterDecision`` Pydantic model. Emitted
 * once per turn via the ``skill_routing`` SSE event, before any text
 * tokens, so the storefront can render the attribution line above the
 * reply and the Atelier can render the live activation log.
 */
export interface SkillRouting {
  loaded_skills: string[]
  considered: Array<{ name: string; reason: string }>
  elapsed_ms: number
  raw_response?: string
  user_message: string
}

export type AgentBadge =
  | 'search'
  | 'pricing'
  | 'recommendation'
  | 'orchestrator'
  | 'inventory'
  | 'support'

export interface AgentChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  products?: ChatProduct[]
  suggestions?: string[]
  agent?: AgentBadge
  agentStatus?: 'thinking' | 'streaming' | 'complete'
  agentExecution?: AgentExecution
  /** Skill routing decision for this turn. Set when the backend emits
   * a ``skill_routing`` SSE event. Storefront uses ``loaded_skills`` to
   * render the italic burgundy attribution line; Atelier renders the
   * full decision in its live activation log. */
  skillRouting?: SkillRouting
}

export interface UseAgentChatOptions {
  mode?: ChatMode
  workshopMode?: WorkshopMode
  guardrailsEnabled?: boolean
  initialMessages?: AgentChatMessage[]
  /** localStorage key for conversation persistence. Omit to disable. */
  persistKey?: string
}

export interface UseAgentChatReturn {
  messages: AgentChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>
  inputValue: string
  setInputValue: React.Dispatch<React.SetStateAction<string>>
  isLoading: boolean
  backendOnline: boolean
  sessionCost: number
  sendMessage: (customText?: string) => Promise<void>
  clearChat: (resetTo?: AgentChatMessage[]) => void
}

const CACHE_TTL = 5 * 60 * 1000
const responseCache = new Map<
  string,
  {
    response: string
    products?: ChatProduct[]
    suggestions?: string[]
    agent: AgentBadge
    timestamp: number
  }
>()

function cacheKey(query: string) {
  return query.trim().toLowerCase()
}

function getCachedResponse(query: string) {
  const cached = responseCache.get(cacheKey(query))
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached
  return null
}

function setCachedResponse(
  query: string,
  data: {
    response: string
    products?: ChatProduct[]
    suggestions?: string[]
    agent: AgentBadge
  },
) {
  responseCache.set(cacheKey(query), { ...data, timestamp: Date.now() })
}

function mapProduct(p: any): ChatProduct {
  return {
    id: p.id ?? p.productId ?? 0,
    name: p.name || p.product_description || '',
    price: p.price || 0,
    image: p.image || p.imgUrl || p.imgurl || p.image_url || '',
    category: p.category || p.category_name || '',
    rating: p.stars || p.rating || 0,
    reviews: p.reviews || 0,
    url: p.url || p.producturl || '',
    quantity: p.quantity,
    inStock: p.inStock,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
  }
}

function inferAgentFromQuery(q: string): AgentBadge {
  const lower = q.toLowerCase()
  if (
    lower.includes('return') ||
    lower.includes('refund') ||
    lower.includes('policy') ||
    lower.includes('support') ||
    lower.includes('warranty') ||
    lower.includes('help')
  ) return 'support'
  if (
    lower.includes('cheap') ||
    lower.includes('price') ||
    lower.includes('deal') ||
    lower.includes('cost') ||
    lower.includes('budget') ||
    lower.includes('afford')
  ) return 'pricing'
  if (
    lower.includes('recommend') ||
    lower.includes('suggest') ||
    lower.includes('best') ||
    lower.includes('top') ||
    lower.includes('popular') ||
    lower.includes('trending')
  ) return 'recommendation'
  return 'search'
}

function loadPersistedMessages(
  persistKey: string | undefined,
  fallback: AgentChatMessage[],
): AgentChatMessage[] {
  if (!persistKey) return fallback
  try {
    const saved = localStorage.getItem(persistKey)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
    }
  } catch {
    // ignore corrupted persistence
  }
  return fallback
}

export function useAgentChat(
  options: UseAgentChatOptions = {},
): UseAgentChatReturn {
  const {
    mode = 'storefront',
    workshopMode,
    guardrailsEnabled = false,
    initialMessages = [],
    persistKey,
  } = options

  const [messages, setMessages] = useState<AgentChatMessage[]>(() =>
    loadPersistedMessages(persistKey, initialMessages),
  )
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendOnline, setBackendOnline] = useState(true)
  const [sessionCost, setSessionCost] = useState(0)

  // Keep a ref of the latest messages so sendMessage can read history
  // without re-creating the callback on every message update.
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Debounced persistence
  useEffect(() => {
    if (!persistKey) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(persistKey, JSON.stringify(messages))
      } catch {
        // quota exceeded — drop oldest? For now, ignore
      }
    }, 500)
    return () => clearTimeout(t)
  }, [messages, persistKey])

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline)
  }, [])

  const sendMessage = useCallback(
    async (customText?: string) => {
      const text = (customText ?? inputValue).trim()
      if (!text || isLoading) return

      const userMessage: AgentChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])
      setInputValue('')
      setIsLoading(true)

      // Cache check
      const cached = getCachedResponse(text)
      if (cached) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: cached.response,
            timestamp: new Date(),
            products: cached.products,
            suggestions: cached.suggestions,
            agent: cached.agent,
            agentStatus: 'complete',
          },
        ])
        setIsLoading(false)
        return
      }

      // Thinking placeholder — only populate agentExecution when atelier mode
      const showInstrumentation = mode === 'atelier'
      const thinkingAgentName =
        workshopMode === 'production'
          ? 'AgentCore'
          : workshopMode === 'agentic'
            ? 'Orchestrator'
            : 'Search Agent'
      const loadingMessage: AgentChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        agentStatus: 'thinking',
        agent: showInstrumentation
          ? workshopMode === 'agentic' || workshopMode === 'production'
            ? 'orchestrator'
            : 'search'
          : undefined,
        agentExecution: showInstrumentation
          ? {
              agent_steps: [
                {
                  agent: thinkingAgentName,
                  action: 'Analyzing query',
                  status: 'in_progress',
                  timestamp: Date.now(),
                  duration_ms: 0,
                },
              ],
              tool_calls: [],
              reasoning_steps: [],
              total_duration_ms: 0,
              success_rate: 0,
            }
          : undefined,
      }
      setMessages(prev => [...prev, loadingMessage])

      try {
        const historyBeforeUser = messagesRef.current

        const response = await sendChatMessageStreaming(
          text,
          historyBeforeUser,
          data => {
            if (data.type === 'skill_routing') {
              // Routing event arrives BEFORE any text tokens per the
              // backend ordering contract. Attach to the current
              // assistant message (the thinking placeholder) so both
              // the storefront attribution line and the Atelier
              // activation log can read it.
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.skillRouting = data.routing
                }
                return [...updated]
              })
              // Persist the most recent routing to localStorage so the
              // Atelier Skills panel (which lives on a different route)
              // can render the live activation log without plumbing
              // cross-route state through a context provider.
              try {
                localStorage.setItem(
                  'blaize-skill-routing-latest',
                  JSON.stringify(data.routing),
                )
              } catch {
                // quota or private mode — silent
              }
            } else if (data.type === 'agent_step') {
              if (!showInstrumentation) return
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
                  const existing = lastMsg.agentExecution.agent_steps.find(
                    s => s.agent === data.agent,
                  )
                  if (existing) {
                    existing.status = data.status
                  } else {
                    lastMsg.agentExecution.agent_steps.push({
                      agent: data.agent,
                      action: data.action,
                      status: data.status,
                      timestamp: Date.now(),
                      duration_ms: 0,
                    })
                  }
                }
                return updated
              })
            } else if (data.type === 'tool_call') {
              if (!showInstrumentation) return
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
                  lastMsg.agentExecution.tool_calls.push({
                    tool: data.tool,
                    timestamp: Date.now(),
                    duration_ms: 0,
                    status: data.status,
                  })
                }
                return updated
              })
            } else if (data.type === 'content_delta') {
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                lastMsg.content = (lastMsg.content || '') + data.delta
                if (lastMsg.agentStatus === 'thinking') {
                  lastMsg.agentStatus = 'streaming'
                  lastMsg.agentExecution = undefined
                }
                return [...updated]
              })
            } else if (data.type === 'content_reset') {
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                lastMsg.content = ''
                return [...updated]
              })
            } else if (data.type === 'content') {
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                if (
                  lastMsg.agentStatus === 'streaming' &&
                  lastMsg.content &&
                  (!data.content ||
                    data.content.length < lastMsg.content.length * 0.5)
                ) {
                  lastMsg.agentStatus = 'complete'
                  lastMsg.agentExecution = undefined
                } else {
                  lastMsg.content = data.content
                  lastMsg.agentStatus = 'complete'
                  lastMsg.agentExecution = undefined
                }
                return [...updated]
              })
            } else if (data.type === 'product') {
              setMessages(prev => {
                const updated = [...prev]
                const lastMsg = updated[updated.length - 1]
                if (!lastMsg.products) lastMsg.products = []
                const chatProduct = mapProduct(data.product)
                const isDupe = lastMsg.products.some(
                  existing =>
                    (existing.id && existing.id === chatProduct.id) ||
                    (existing.name && existing.name === chatProduct.name),
                )
                if (!isDupe) {
                  lastMsg.products = [...lastMsg.products, chatProduct]
                }
                lastMsg.agentStatus = 'complete'
                lastMsg.agentExecution = undefined
                return [...updated]
              })
            }
          },
          // Storefront mode always gets full chat access regardless of
          // which workshop module the participant has completed.
          mode === 'storefront' ? undefined : workshopMode,
          guardrailsEnabled,
        )

        if (response.estimated_cost_usd) {
          setSessionCost(prev => prev + response.estimated_cost_usd!)
        }

        // Determine agent badge — only when instrumentation is on
        let agentType: AgentBadge | undefined
        if (showInstrumentation) {
          if (
            workshopMode === 'agentic' ||
            workshopMode === 'production' ||
            response.orchestrator_enabled
          ) {
            agentType = 'orchestrator'
          } else {
            agentType = inferAgentFromQuery(text)
          }
        }

        setMessages(prev => {
          const updated = [...prev]
          const lastMsg = updated[updated.length - 1]
          if (response.response) {
            lastMsg.content = response.response
          } else if (!lastMsg.content) {
            // Defense in depth: the backend synthesizes a fallback
            // line when the orchestrator returns empty, but if
            // something slips through (older backend, mid-stream
            // reconnect) don't leave the user staring at a blank
            // bubble.
            lastMsg.content =
              "I couldn't land on a clear answer — try rephrasing or narrowing the ask."
          }
          if (response.products?.length) {
            lastMsg.products = response.products.map(mapProduct)
          }
          lastMsg.suggestions = response.suggestions
          lastMsg.agent = agentType
          lastMsg.agentStatus = 'complete'
          lastMsg.agentExecution = showInstrumentation
            ? response.agent_execution
            : undefined
          return [...updated]
        })
        setBackendOnline(true)

        if (agentType) {
          setCachedResponse(text, {
            response: response.response,
            products: response.products,
            suggestions: response.suggestions,
            agent: agentType,
          })
        } else {
          setCachedResponse(text, {
            response: response.response,
            products: response.products,
            suggestions: response.suggestions,
            agent: 'search',
          })
        }
      } catch {
        setMessages(prev => {
          const updated = [...prev]
          const lastMsg = updated[updated.length - 1]
          lastMsg.content =
            'Unable to connect. Please check that the backend is running.'
          lastMsg.agentStatus = 'complete'
          lastMsg.agentExecution = undefined
          return [...updated]
        })
        setBackendOnline(false)
      } finally {
        setIsLoading(false)
      }
    },
    [inputValue, isLoading, mode, workshopMode, guardrailsEnabled],
  )

  const clearChat = useCallback(
    (resetTo?: AgentChatMessage[]) => {
      if (persistKey) {
        localStorage.removeItem(persistKey)
        localStorage.removeItem('blaize-session-id')
      }
      responseCache.clear()
      setMessages(resetTo ?? initialMessages)
    },
    [persistKey, initialMessages],
  )

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    backendOnline,
    sessionCost,
    sendMessage,
    clearChat,
  }
}
