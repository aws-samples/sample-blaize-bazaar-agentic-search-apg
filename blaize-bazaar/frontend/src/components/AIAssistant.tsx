/**
 * AI Assistant — Premium chat with smooth animations
 * Connects to FastAPI backend for actual product search
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, AlertCircle, GitCompare, PanelRightOpen, PanelRightClose, Sparkles, MessageSquare, Shield } from 'lucide-react'
import ProductCardCompact from './ProductCardCompact'
import MarkdownMessage from './MarkdownMessage'
import ProductComparison from './ProductComparison'
import { sendChatMessageStreaming, ChatProduct, checkBackendHealth } from '../services/chat'
import { AGENT_IDENTITIES, type AgentType } from '../utils/agentIdentity'
import { useLayout } from '../contexts/LayoutContext'
import { useCart } from '../contexts/CartContext'
import { useUI } from '../contexts/UIContext'
import { useTheme } from '../App'

interface AgentExecution {
  agent_steps: Array<{agent: string, action: string, status: string, timestamp: number, duration_ms: number}>
  tool_calls: Array<{tool: string, params?: string, timestamp: number, duration_ms: number, status: string}>
  reasoning_steps: Array<{step: string, content: string, timestamp: number}>
  total_duration_ms: number
  success_rate: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  products?: ChatProduct[]
  suggestions?: string[]
  agent?: 'search' | 'pricing' | 'recommendation' | 'orchestrator'
  agentStatus?: 'thinking' | 'streaming' | 'complete'
  agentExecution?: AgentExecution
}

// Simple in-memory response cache
const responseCache = new Map<string, { response: string; products?: ChatProduct[]; suggestions?: string[]; agent: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedResponse(query: string) {
  const key = query.trim().toLowerCase()
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached
  return null
}

function setCachedResponse(query: string, data: { response: string; products?: ChatProduct[]; suggestions?: string[]; agent: string }) {
  responseCache.set(query.trim().toLowerCase(), { ...data, timestamp: Date.now() })
}

// Mode → accent color mapping (eliminates repeated ternary chains)
const MODE_ACCENT: Record<string, string> = {
  legacy: '#0A84FF',
  semantic: '#0A84FF',
  tools: '#0A84FF',
  full: '#FF9F0A',
  agentcore: '#30D158',
}
const MODE_ACCENT_DARK: Record<string, string> = {
  legacy: '#0066CC',
  semantic: '#0066CC',
  tools: '#0066CC',
  full: '#D97706',
  agentcore: '#25A14A',
}

function accentAlpha(mode: string, alpha: number): string {
  const hex = MODE_ACCENT[mode] || MODE_ACCENT.tools
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const AIAssistant = () => {
  const { chatMode, setChatMode, setChatOpen, workshopMode, guardrailsEnabled } = useLayout()
  const { addToCart } = useCart()
  const { announcementDismissed, dismissAnnouncement } = useUI()
  const { theme } = useTheme()
  const [isOpen, setIsOpenRaw] = useState(false)
  const [hasOpenedChat, setHasOpenedChat] = useState(false)
  const setIsOpen = (open: boolean) => {
    setIsOpenRaw(open)
    setChatOpen(open)
    if (open) setHasOpenedChat(true)
  }
  const [sessionCost, setSessionCost] = useState(0)
  const [expandedHoods, setExpandedHoods] = useState<Set<number>>(new Set())
  const toggleHood = (idx: number) => {
    setExpandedHoods(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  // Mode-specific welcome messages and suggestions
  const getWelcomeMessage = (mode: string): { content: string; suggestions: string[] } => {
    switch (mode) {
      case 'tools':
        return {
          content: "Hey! I'm your AI shopping assistant — powered by custom tools that query live data from Aurora PostgreSQL. Ask me about products, trends, or inventory and watch the tools fire in real-time.",
          suggestions: [
            "What's trending in electronics right now?",
            'I need a gift for someone who loves cooking',
            'Show me kitchen accessories under $30',
            'What running shoes have the best reviews?',
          ],
        }
      case 'full':
        return {
          content: "Hey! I'm backed by a team of specialist agents — search, pricing, inventory, and recommendation — all coordinated by an orchestrator. Ask something complex and watch them collaborate.",
          suggestions: [
            'Find me the best laptop under $1500',
            "What's low on stock that I should grab before it's gone?",
            'I need a birthday gift — something unique under $75',
            'Show me trending watches and compare prices',
          ],
        }
      case 'agentcore':
        return {
          content: "Hey! I'm running on Bedrock AgentCore — with persistent memory across sessions, Cedar authorization policies, and MCP Gateway for dynamic tool discovery. Try testing the guardrails.",
          suggestions: [
            'Remember that I prefer premium brands',
            'Can you restock 1000 units of the Travel Camera?',
            'What preferences do you remember about me?',
            'Find me something similar to what I looked at before',
          ],
        }
      default:
        return {
          content: "Hey! I'm your AI shopping assistant. I can search our entire catalog, compare products side by side, analyze pricing trends, and check what's in stock — all in one conversation. What are you working with today?",
          suggestions: [
            'Find me the best laptop under $1500',
            "What's trending in electronics right now?",
            'Show me running shoes with great reviews',
            'I need a gift under $50 — surprise me',
          ],
        }
    }
  }

  const loadConversationHistory = (): Message[] => {
    try {
      const saved = localStorage.getItem('blaize-conversation-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    } catch {
      // ignore
    }
    const welcome = getWelcomeMessage(workshopMode)
    return [{
      role: 'assistant',
      content: welcome.content,
      timestamp: new Date(),
      suggestions: welcome.suggestions,
    }]
  }

  const [messages, setMessages] = useState<Message[]>(loadConversationHistory())
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendOnline, setBackendOnline] = useState(true)
  const [compareProducts, setCompareProducts] = useState<ChatProduct[] | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Debounce scroll to avoid jank during rapid streaming updates
    const scrollTimeout = setTimeout(scrollToBottom, 50)
    // Debounce localStorage writes to avoid thrashing during rapid SSE events
    const storageTimeout = setTimeout(() => {
      localStorage.setItem('blaize-conversation-history', JSON.stringify(messages))
    }, 500)
    return () => { clearTimeout(scrollTimeout); clearTimeout(storageTimeout) }
  }, [messages])

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline)
  }, [])

  // Reset chat with mode-appropriate welcome when workshop mode changes
  useEffect(() => {
    const welcome = getWelcomeMessage(workshopMode)
    localStorage.removeItem('blaize-conversation-history')
    setMessages([{
      role: 'assistant',
      content: welcome.content,
      timestamp: new Date(),
      suggestions: welcome.suggestions,
    }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopMode])

  const handleClearChat = () => {
    localStorage.removeItem('blaize-conversation-history')
    localStorage.removeItem('blaize-session-id')
    responseCache.clear()
    const welcome = getWelcomeMessage(workshopMode)
    setMessages([{
      role: 'assistant',
      content: welcome.content,
      timestamp: new Date(),
      suggestions: welcome.suggestions,
    }])
  }

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || inputValue
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Check cache first
    const cached = getCachedResponse(messageText)
    if (cached) {
      const aiMessage: Message = {
        role: 'assistant',
        content: cached.response,
        timestamp: new Date(),
        products: cached.products,
        suggestions: cached.suggestions,
        agent: cached.agent as any,
        agentStatus: 'complete',
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
      return
    }

    // Add thinking placeholder — agent name depends on workshop mode
    const thinkingAgentName = workshopMode === 'full' ? 'Orchestrator'
      : workshopMode === 'agentcore' ? 'AgentCore'
      : 'Search Agent'
    const loadingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentStatus: 'thinking',
      agent: (workshopMode === 'full' || workshopMode === 'agentcore') ? 'orchestrator' : 'search',
      agentExecution: {
        agent_steps: [{ agent: thinkingAgentName, action: 'Analyzing query', status: 'in_progress', timestamp: Date.now(), duration_ms: 0 }],
        tool_calls: [],
        reasoning_steps: [],
        total_duration_ms: 0,
        success_rate: 0
      }
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const historyBeforeUser = messages.slice(0, -1)

      const response = await sendChatMessageStreaming(
        messageText,
        historyBeforeUser,
        (data) => {
          if (data.type === 'agent_step') {
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
                const existingStep = lastMsg.agentExecution.agent_steps.find(s => s.agent === data.agent)
                if (existingStep) {
                  existingStep.status = data.status
                } else {
                  lastMsg.agentExecution.agent_steps.push({
                    agent: data.agent,
                    action: data.action,
                    status: data.status,
                    timestamp: Date.now(),
                    duration_ms: 0
                  })
                }
              }
              return updated
            })
          } else if (data.type === 'tool_call') {
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
                lastMsg.agentExecution.tool_calls.push({
                  tool: data.tool,
                  timestamp: Date.now(),
                  duration_ms: 0,
                  status: data.status
                })
              }
              return updated
            })
          } else if (data.type === 'content_delta') {
            // Streaming: append token progressively for live typing effect
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
            // Tool completed — clear accumulated thinking text before final response streams
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              lastMsg.content = ''
              return [...updated]
            })
          } else if (data.type === 'content') {
            // Final clean content — only replace streamed text if it adds value
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              // If we already have streamed content and the final is shorter/empty, keep streamed
              if (lastMsg.agentStatus === 'streaming' && lastMsg.content && (!data.content || data.content.length < lastMsg.content.length * 0.5)) {
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
            // Product arrived — append to the current message's products
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (!lastMsg.products) lastMsg.products = []
              // Map backend product format to ChatProduct
              const p = data.product
              const chatProduct: ChatProduct = {
                id: p.id || p.productId || '',
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
              // Deduplicate by id or name
              const isDupe = lastMsg.products.some(
                existing => (existing.id && existing.id === chatProduct.id) ||
                            (existing.name && existing.name === chatProduct.name)
              )
              if (!isDupe) {
                lastMsg.products = [...lastMsg.products, chatProduct]
              }
              // Clear thinking state once products start arriving
              lastMsg.agentStatus = 'complete'
              lastMsg.agentExecution = undefined
              return [...updated]  // New array ref to trigger re-render
            })
          }
        },
        workshopMode,
        guardrailsEnabled
      )

      // Accumulate session cost
      if (response.estimated_cost_usd) {
        setSessionCost(prev => prev + response.estimated_cost_usd!)
      }

      // Determine agent badge based on workshop mode
      let agentType: 'search' | 'pricing' | 'recommendation' | 'orchestrator' | 'support' = 'search'
      if (workshopMode === 'full' || response.orchestrator_enabled) {
        // Lab 3: Multi-agent orchestrator
        agentType = 'orchestrator'
      } else {
        // Lab 2: Single agent — infer type from query keywords
        const q = messageText.toLowerCase()
        if (q.includes('return') || q.includes('refund') || q.includes('policy') || q.includes('support') || q.includes('warranty') || q.includes('help')) {
          agentType = 'support'
        } else if (q.includes('cheap') || q.includes('price') || q.includes('deal') || q.includes('cost') || q.includes('budget') || q.includes('afford')) {
          agentType = 'pricing'
        } else if (q.includes('recommend') || q.includes('suggest') || q.includes('best') || q.includes('top') || q.includes('popular') || q.includes('trending')) {
          agentType = 'recommendation'
        } else {
          agentType = 'search'
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        // Update the streaming message with final data
        // Keep content from streaming if final response is empty
        if (response.response) lastMsg.content = response.response
        // Always use complete event's products — they have backfilled images
        if (response.products?.length) {
          lastMsg.products = response.products.map((p: any) => ({
            id: p.id || p.productId || '',
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
          }))
        }
        lastMsg.suggestions = response.suggestions
        lastMsg.agent = agentType
        lastMsg.agentStatus = 'complete'
        lastMsg.agentExecution = response.agent_execution
        return [...updated]
      })
      setBackendOnline(true)

      // Cache the response
      setCachedResponse(messageText, {
        response: response.response,
        products: response.products,
        suggestions: response.suggestions,
        agent: agentType,
      })

    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        lastMsg.content = 'Unable to connect. Please check that the backend is running.'
        lastMsg.agentStatus = 'complete'
        lastMsg.agentExecution = undefined
        return [...updated]
      })
      setBackendOnline(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      handleSend()
    }
  }

  // Hide entire chat in legacy/semantic workshop modes
  if (workshopMode === 'legacy' || workshopMode === 'semantic') {
    return null
  }

  return (
    <>
      {/* Announcement Banner — appears once per mode transition */}
      <AnimatePresence>
        {!isOpen && !announcementDismissed[workshopMode] && (
          <motion.div
            className="fixed top-20 left-0 right-0 z-[1001] flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div
              className="pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl max-w-lg"
              style={{
                background: theme === 'dark' ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                border: `1px solid ${accentAlpha(workshopMode, 0.3)}`,
                boxShadow: theme === 'dark'
                  ? '0 16px 48px -8px rgba(0, 0, 0, 0.6)'
                  : '0 16px 48px -8px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: accentAlpha(workshopMode, 0.15) }}
              >
                <Sparkles className="h-5 w-5" style={{ color: MODE_ACCENT[workshopMode] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {workshopMode === 'agentcore' ? 'Production stack deployed'
                    : workshopMode === 'full' ? 'Five specialist agents are ready'
                    : 'AI Assistant is now active'}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {workshopMode === 'agentcore' ? 'Memory-aware agents with Cedar policy enforcement'
                    : workshopMode === 'full' ? 'Search, recommendations, pricing, inventory, and support — working together'
                    : 'Search products, check inventory, and analyze pricing through conversation'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setIsOpen(true); dismissAnnouncement(workshopMode) }}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium"
                  style={{ background: MODE_ACCENT[workshopMode], color: '#fff' }}
                >
                  Open Chat
                </button>
                <button
                  onClick={() => dismissAnnouncement(workshopMode)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`fixed flex flex-col z-[999] shadow-2xl ${
              chatMode === 'docked'
                ? 'right-0 top-[72px] w-[30vw] min-w-[380px] max-w-[480px] h-[calc(100vh-72px)] rounded-l-[20px] rounded-r-none'
                : 'bottom-32 right-8 w-[420px] max-w-[calc(100vw-4rem)] h-[680px] max-h-[calc(100vh-10rem)] rounded-[20px]'
            }`}
            style={{
              background: theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : '#ffffff',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: theme === 'dark'
                ? `1px solid ${workshopMode === 'agentcore' ? 'rgba(16, 185, 129, 0.2)' : workshopMode === 'full' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.08)'}`
                : '1px solid rgba(0,0,0,0.1)',
              boxShadow: theme === 'dark'
                ? `0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)${workshopMode === 'agentcore' ? ', 0 0 40px rgba(16, 185, 129, 0.08)' : workshopMode === 'full' ? ', 0 0 40px rgba(245, 158, 11, 0.08)' : ''}`
                : '0 25px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08)',
            }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="px-5 py-4 rounded-t-[20px] flex justify-between items-center flex-shrink-0"
              style={{
                borderBottom: theme === 'dark'
                  ? `1px solid ${workshopMode === 'agentcore' ? 'rgba(16, 185, 129, 0.15)' : workshopMode === 'full' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)'}`
                  : '1px solid rgba(0,0,0,0.08)',
                background: workshopMode === 'agentcore'
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, transparent 100%)'
                  : workshopMode === 'full'
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, transparent 100%)'
                  : 'transparent',
              }}>
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)', border: '1.5px solid var(--border-color)' }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.15 }}
                >
                  <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="AI" className="w-full h-full object-cover" />
                </motion.div>
                <div>
                  <div className="font-medium text-sm text-text-primary">Blaize AI</div>
                  <div className="text-[11px] flex items-center gap-1">
                    {isLoading ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-secondary)' }} />
                        Thinking...
                      </span>
                    ) : !backendOnline ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Offline
                      </span>
                    ) : (
                      <span className="flex items-center gap-1" style={{
                        color: workshopMode === 'agentcore' ? '#34d399' : workshopMode === 'full' ? '#fbbf24' : '#22c55e',
                      }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
                          background: workshopMode === 'agentcore' ? '#34d399' : workshopMode === 'full' ? '#fbbf24' : '#22c55e',
                        }} />
                        {workshopMode === 'agentcore'
                          ? 'AgentCore Runtime · 5 services'
                          : workshopMode === 'full'
                          ? 'Orchestrator → 5 specialists'
                          : '1 agent online'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Cost pill — visible in tools/full mode */}
                {(workshopMode === 'tools' || workshopMode === 'full') && sessionCost > 0 && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full mr-1"
                    style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}
                    title="Estimated session cost"
                  >
                    ${sessionCost.toFixed(4)}
                  </span>
                )}
                {/* Mode-specific status pills */}
                {workshopMode === 'full' && guardrailsEnabled && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full mr-1"
                    style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}
                    title="Guardrails active"
                  >
                    Guarded
                  </span>
                )}
                {workshopMode === 'agentcore' && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full mr-1 flex items-center gap-1"
                    style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}
                    title="AgentCore production services"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Cedar + MCP
                  </span>
                )}
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1 rounded-lg transition-colors text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title="Reset conversation"
                >
                  Reset
                </button>
                <button
                  onClick={() => setChatMode(chatMode === 'floating' ? 'docked' : 'floating')}
                  className="p-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title={chatMode === 'floating' ? 'Dock to side' : 'Float window'}
                >
                  {chatMode === 'floating'
                    ? <PanelRightOpen className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    : <PanelRightClose className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  }
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 search-scroll">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={`${index}-${message.timestamp.getTime()}`}
                    className="flex flex-col gap-2.5"
                    initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      delay: index === messages.length - 1 ? 0.05 : 0,
                    }}
                  >
                    {/* Text-only messages */}
                    {!(message.products && message.products.length > 0) && (
                      <div className={message.role === 'assistant' ? 'self-start max-w-[90%]' : 'self-end max-w-[85%]'}>
                        <div
                          className={`px-4 py-3 text-[14px] leading-relaxed ${
                            message.role === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
                          }`}
                          style={{
                            background: message.role === 'user'
                              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#0071e3')
                              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f2f2f7'),
                            border: message.role === 'assistant'
                              ? (theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)')
                              : 'none',
                            color: message.role === 'user' && theme === 'light' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          {/* Inline agent badges */}
                          {message.role === 'assistant' && message.agent && message.agentStatus !== 'thinking' && (
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              {message.agent === 'orchestrator' && message.agentExecution?.agent_steps ? (
                                message.agentExecution.agent_steps
                                  .filter(s => s.agent !== 'Orchestrator' && s.agent !== 'Aggregator')
                                  .map((step, i) => {
                                    const badgeColors: Record<string, { bg: string; text: string }> = {
                                      'SearchAssistant': { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
                                      'Search Agent': { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
                                      'Pricing Agent': { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' },
                                      'Price Optimization': { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' },
                                      'Recommendation': { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047' },
                                      'Product Recommendation': { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047' },
                                      'Inventory': { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7' },
                                      'Inventory & Restock': { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7' },
                                      'Support Agent': { bg: 'rgba(20, 184, 166, 0.2)', text: '#5eead4' },
                                      'Customer Support': { bg: 'rgba(20, 184, 166, 0.2)', text: '#5eead4' },
                                    }
                                    const colors = badgeColors[step.agent] || { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc' }
                                    return (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                        style={{ background: colors.bg, color: colors.text }}>
                                        {step.agent}
                                      </span>
                                    )
                                  })
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: message.agent === 'search' ? 'rgba(59, 130, 246, 0.2)'
                                      : message.agent === 'pricing' ? 'rgba(245, 158, 11, 0.2)'
                                      : message.agent === 'recommendation' ? 'rgba(234, 179, 8, 0.2)'
                                      : 'rgba(168, 85, 247, 0.2)',
                                    color: message.agent === 'search' ? '#93c5fd'
                                      : message.agent === 'pricing' ? '#fcd34d'
                                      : message.agent === 'recommendation' ? '#fde047'
                                      : '#c084fc',
                                  }}>
                                  {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Thinking skeleton */}
                          {message.agentStatus === 'thinking' && !message.content ? (
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="flex gap-1">
                                <motion.div className="w-2 h-2 rounded-full" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
                                <motion.div className="w-2 h-2 rounded-full" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
                                <motion.div className="w-2 h-2 rounded-full" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
                              </div>
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
                            </div>
                          ) : message.role === 'assistant' ? (
                            <>
                              <MarkdownMessage content={message.content} />
                              {message.agentStatus === 'streaming' && (
                                <motion.span
                                  className="inline-block w-2 h-4 ml-0.5 align-middle rounded-sm"
                                  style={{ background: 'var(--link-color, #6366f1)' }}
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                                />
                              )}
                            </>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Product Cards */}
                    {message.products && message.products.length > 0 && (
                      <div className="flex flex-col gap-2.5 w-full">
                        {message.agent && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: message.agent === 'search' ? 'rgba(59, 130, 246, 0.2)'
                                  : message.agent === 'pricing' ? 'rgba(245, 158, 11, 0.2)'
                                  : message.agent === 'recommendation' ? 'rgba(234, 179, 8, 0.2)'
                                  : 'rgba(168, 85, 247, 0.2)',
                                color: message.agent === 'search' ? '#93c5fd'
                                  : message.agent === 'pricing' ? '#fcd34d'
                                  : message.agent === 'recommendation' ? '#fde047'
                                  : '#c084fc',
                              }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                            </span>
                          </div>
                        )}
                        {message.content && (
                          <div className="text-sm text-text-secondary font-light leading-relaxed">
                            <MarkdownMessage content={message.content} />
                          </div>
                        )}

                        {/* Staggered product cards */}
                        <div className="flex flex-col gap-2">
                          {message.products.map((product, pIdx) => (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: pIdx * 0.08,
                                type: 'spring',
                                stiffness: 400,
                                damping: 25,
                              }}
                            >
                              <ProductCardCompact
                                product={product}
                                agentSource={message.agent as AgentType}
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

                        {/* Compare button */}
                        {message.products.length >= 2 && (
                          <motion.button
                            onClick={() => setCompareProducts(message.products!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium self-start"
                            style={{
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--link-color)',
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <GitCompare className="h-3 w-3" />
                            Compare {message.products.length} products
                          </motion.button>
                        )}
                      </div>
                    )}

                    {/* Under the Hood — contextual feature indicator */}
                    {message.role === 'assistant' && message.agentStatus === 'complete' &&
                     (workshopMode === 'tools' || workshopMode === 'full' || workshopMode === 'agentcore') && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleHood(index)}
                          className="flex items-center gap-1.5 text-[10px] w-full text-left px-2 py-1 rounded-md transition-colors"
                          style={{
                            color: 'var(--text-secondary)',
                            background: expandedHoods.has(index)
                              ? (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
                              : 'transparent',
                          }}
                        >
                          <svg className="h-3 w-3 flex-shrink-0 transition-transform" style={{ transform: expandedHoods.has(index) ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium">Under the Hood</span>
                          {message.agent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: AGENT_IDENTITIES[message.agent as AgentType]?.accentHex || 'var(--text-secondary)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                            </span>
                          )}
                          {message.agentExecution?.tool_calls && message.agentExecution.tool_calls.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px]"
                              style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                              {message.agentExecution.tool_calls.length} tool{message.agentExecution.tool_calls.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {guardrailsEnabled && (workshopMode === 'full' || workshopMode === 'agentcore') && (
                            <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                              Guarded
                            </span>
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedHoods.has(index) && (
                            <motion.div
                              className="px-3 py-2 mt-1 rounded-lg text-[11px] space-y-1.5"
                              style={{
                                background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                              }}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {/* Agent info */}
                              {message.agent && (
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Agent: </span>
                                  <span style={{ color: AGENT_IDENTITIES[message.agent as AgentType]?.accentHex || 'var(--text-primary)' }}>
                                    {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                                  </span>
                                  <span className="ml-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                                    {message.agent === 'search' && '— finds products via semantic search and filters'}
                                    {message.agent === 'pricing' && '— analyzes price trends, deals, and budget options'}
                                    {message.agent === 'recommendation' && '— suggests products based on preferences'}
                                    {message.agent === 'orchestrator' && '— coordinates multiple agents for complex queries'}
                                  </span>
                                </div>
                              )}

                              {/* Tool calls */}
                              {message.agentExecution?.tool_calls && message.agentExecution.tool_calls.length > 0 && (
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Tools called: </span>
                                  <span className="inline-flex flex-wrap gap-1 ml-1">
                                    {message.agentExecution.tool_calls.map((tc, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px]"
                                        style={{
                                          background: tc.status === 'success' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                          color: tc.status === 'success' ? '#34d399' : '#f87171',
                                        }}>
                                        {tc.tool}{tc.duration_ms ? ` (${tc.duration_ms}ms)` : ''}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              )}

                              {/* Guardrails */}
                              {guardrailsEnabled && (workshopMode === 'full' || workshopMode === 'agentcore') && (
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Guardrails: </span>
                                  <span style={{ color: '#34d399' }}>Passed</span>
                                  <span className="ml-1" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>(content safety + PII check)</span>
                                </div>
                              )}

                              {/* Context window */}
                              {index >= 4 && (
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Context: </span>
                                  <span style={{ color: 'var(--text-primary)' }}>
                                    {Math.floor((index - 1) / 2)} prior {Math.floor((index - 1) / 2) === 1 ? 'exchange' : 'exchanges'} in window
                                  </span>
                                  <span className="ml-1" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>(more context = better answers, higher cost)</span>
                                </div>
                              )}

                              {/* Response time */}
                              {message.agentExecution?.total_duration_ms && (
                                <div>
                                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Response time: </span>
                                  <span style={{ color: 'var(--text-primary)' }}>{message.agentExecution.total_duration_ms}ms</span>
                                </div>
                              )}

                              {/* Educational tip */}
                              <div className="pt-1.5 mt-1" style={{ borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                                <p className="italic" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                  {workshopMode === 'tools' && 'In Lab 2, one agent handles everything using custom tools. Lab 3 adds multi-agent orchestration.'}
                                  {workshopMode === 'full' && 'The orchestrator decided which agents to invoke based on your query. Try the Graph Orchestrator in the Playground to visualize this.'}
                                  {workshopMode === 'agentcore' && 'AgentCore adds persistent memory, so the agent remembers your preferences across sessions.'}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <motion.button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isLoading}
                            className="px-3.5 py-2 rounded-full text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--link-color)',
                            }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 25 }}
                            whileHover={{ scale: 1.05, borderColor: 'rgba(255, 255, 255, 0.25)', boxShadow: '0 0 12px rgba(99, 102, 241, 0.15)' }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Product Comparison Overlay */}
            {compareProducts && (
              <ProductComparison products={compareProducts} onClose={() => setCompareProducts(null)} />
            )}

            {/* Input */}
            <div className="px-5 py-4 flex-shrink-0"
              style={{ borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isLoading ? 'Searching...'
                    : workshopMode === 'agentcore' ? "Try: 'remember I like premium brands' or 'restock 1000 cameras'"
                    : workshopMode === 'full' ? "Try: 'find headphones, check stock, and compare prices'"
                    : workshopMode === 'tools' ? "Try: 'what's trending?' or 'is the travel camera in stock?'"
                    : "Try: 'compare headphones under $200' or 'what's trending?'"}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-40 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-white/20"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                  }}
                />
                <motion.button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: inputValue.trim() && !isLoading
                      ? (workshopMode === 'agentcore' ? '#10b981' : workshopMode === 'full' ? '#f59e0b' : 'var(--link-color)')
                      : theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                  }}
                  whileHover={inputValue.trim() && !isLoading ? { scale: 1.05 } : {}}
                  whileTap={inputValue.trim() && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Spark FAB — closed state (mode-aware gradient button with hover tooltip) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 right-6 z-[1000] appearance-none border-0 p-0 bg-transparent group"
            data-tour="chat-bubble"
            onClick={() => setIsOpen(true)}
            aria-label="Open chat"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            {/* Tooltip — slides in on hover */}
            <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
              <div
                className="rounded-xl py-3 px-4"
                style={{
                  background: theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${accentAlpha(workshopMode, 0.25)}`,
                  boxShadow: theme === 'dark' ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(20px)',
                  minWidth: 180,
                }}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#34d399' }} />
                  {workshopMode === 'agentcore' ? 'AgentCore Active'
                    : workshopMode === 'full' ? 'Multi-Agent Ready'
                    : 'Agent Ready'}
                </div>
                {(workshopMode === 'full' || workshopMode === 'agentcore') && (
                  <div className="mt-2 space-y-1">
                    {[
                      { color: '#a855f7', label: 'Orchestrator' },
                      { color: '#3b82f6', label: 'Search Agent' },
                      { color: '#ec4899', label: 'Recommendation Agent' },
                      { color: '#f59e0b', label: 'Pricing Agent' },
                      { color: '#10b981', label: 'Inventory Agent' },
                      { color: '#06b6d4', label: 'Customer Support' },
                    ].map(a => (
                      <div key={a.label} className="flex items-center gap-2 py-px">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Spark button */}
            <motion.div
              className="relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${MODE_ACCENT[workshopMode]}, ${MODE_ACCENT_DARK[workshopMode]})`,
                boxShadow: `0 4px 20px ${accentAlpha(workshopMode, 0.35)}, 0 0 0 1px ${accentAlpha(workshopMode, 0.15)}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
              }}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              // Entrance glow pulse — plays twice then stops
              {...(!hasOpenedChat ? {
                animate: { boxShadow: [
                  `0 4px 20px ${accentAlpha(workshopMode, 0.35)}, 0 0 0 1px ${accentAlpha(workshopMode, 0.15)}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                  `0 8px 32px ${accentAlpha(workshopMode, 0.5)}, 0 0 0 1px ${accentAlpha(workshopMode, 0.3)}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
                  `0 4px 20px ${accentAlpha(workshopMode, 0.35)}, 0 0 0 1px ${accentAlpha(workshopMode, 0.15)}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                ]},
                transition: { boxShadow: { duration: 2, repeat: 2 } },
              } : {})}
            >
              {/* Glossy overlay */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 100%)' }} />
              {/* Chat icon */}
              {workshopMode === 'agentcore'
                ? <Shield className="w-6 h-6 text-white relative z-[1]" strokeWidth={2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                : <MessageSquare className="w-6 h-6 text-white relative z-[1]" strokeWidth={2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
              }
              {/* Agent count badge */}
              <div
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-[9px] flex items-center justify-center z-[2] px-1"
                style={{
                  background: '#10b981',
                  border: `2px solid ${theme === 'dark' ? '#0f172a' : '#ffffff'}`,
                }}
              >
                <span className="text-[10px] font-semibold text-white leading-none">
                  {workshopMode === 'full' || workshopMode === 'agentcore' ? '5' : '1'}
                </span>
              </div>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Minimized status dot when chat IS open */}
      <AnimatePresence>
        {isOpen && chatMode !== 'docked' && (
          <motion.button
            className="fixed bottom-6 right-6 z-[998] appearance-none border-0 p-0 bg-transparent"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize chat"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: theme === 'dark' ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: MODE_ACCENT[workshopMode] }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIAssistant
