/**
 * AI Assistant — Premium chat with smooth animations
 * Connects to FastAPI backend for actual product search
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, AlertCircle, GitCompare, PanelRightOpen, PanelRightClose } from 'lucide-react'
import ProductCardCompact from './ProductCardCompact'
import MarkdownMessage from './MarkdownMessage'
import ProductComparison from './ProductComparison'
import { sendChatMessageStreaming, ChatProduct, checkBackendHealth } from '../services/chat'
import { AGENT_IDENTITIES, type AgentType } from '../utils/agentIdentity'
import { useLayout } from '../contexts/LayoutContext'
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
  agentStatus?: 'thinking' | 'complete'
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

const AIAssistant = () => {
  const { chatMode, setChatMode, setChatOpen, workshopMode, guardrailsEnabled } = useLayout()
  const { theme } = useTheme()
  const [isOpen, setIsOpenRaw] = useState(false)
  const setIsOpen = (open: boolean) => { setIsOpenRaw(open); setChatOpen(open) }
  const [sessionCost, setSessionCost] = useState(0)
  const [expandedHoods, setExpandedHoods] = useState<Set<number>>(new Set())
  const toggleHood = (idx: number) => {
    setExpandedHoods(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
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
    return [{
      role: 'assistant',
      content: 'I can help you find products, compare options, and get recommendations. What are you looking for?',
      timestamp: new Date(),
      suggestions: [
        'Luxury fragrances under $100',
        'Best laptops for programming',
        'Top-rated running shoes',
        'Trending smartwatches'
      ]
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
    scrollToBottom()
    // Debounce localStorage writes to avoid thrashing during rapid SSE events
    const timeout = setTimeout(() => {
      localStorage.setItem('blaize-conversation-history', JSON.stringify(messages))
    }, 500)
    return () => clearTimeout(timeout)
  }, [messages])

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline)
  }, [])

  const handleClearChat = () => {
    localStorage.removeItem('blaize-conversation-history')
    localStorage.removeItem('blaize-session-id')
    responseCache.clear()
    setMessages([{
      role: 'assistant',
      content: 'Fresh start! What can I help you find?',
      timestamp: new Date(),
      suggestions: [
        'Best smartphones under $500',
        'Show me premium sunglasses',
        'Comfortable furniture for home',
        'Top kitchen essentials'
      ]
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
    const isOrchestrator = workshopMode === 'full'
    const thinkingAgentName = isOrchestrator ? 'Orchestrator' : 'Search Agent'
    const loadingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentStatus: 'thinking',
      agent: isOrchestrator ? 'orchestrator' : 'search',
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
          } else if (data.type === 'content') {
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg.agentStatus === 'thinking') {
                lastMsg.content = data.content
                // Switch from thinking to showing content
                lastMsg.agentExecution = undefined
              }
              return updated
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
      let agentType: 'search' | 'pricing' | 'recommendation' | 'orchestrator' = 'search'
      if (workshopMode === 'full' || response.orchestrator_enabled) {
        // Lab 3: Multi-agent orchestrator
        agentType = 'orchestrator'
      } else {
        // Lab 2: Single agent — infer type from query keywords
        const q = messageText.toLowerCase()
        if (q.includes('cheap') || q.includes('price') || q.includes('deal') || q.includes('cost') || q.includes('budget') || q.includes('afford')) {
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
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
              boxShadow: theme === 'dark'
                ? '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                : '0 25px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08)',
            }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="px-5 py-4 rounded-t-[20px] flex justify-between items-center flex-shrink-0"
              style={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.08)' }}>
                  <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="AI" className="w-full h-full object-cover" />
                </div>
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
                      <span className="text-text-secondary flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Ready
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
                {/* Guardrails indicator */}
                {workshopMode === 'full' && guardrailsEnabled && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full mr-1"
                    style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}
                    title="Guardrails active"
                  >
                    Guarded
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
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      delay: index === messages.length - 1 ? 0.05 : 0,
                    }}
                    layout
                  >
                    {/* Text-only messages */}
                    {!(message.products && message.products.length > 0) && (
                      <div className={message.role === 'assistant' ? 'self-start max-w-[90%]' : 'self-end max-w-[85%]'}>
                        {/* Agent label */}
                        {message.role === 'assistant' && message.agent && (
                          <div className="flex items-center gap-1.5 ml-1 mb-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: AGENT_IDENTITIES[message.agent as AgentType]?.gradient || 'linear-gradient(135deg, #444, #666)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.icon || 'A'}
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                            </span>
                          </div>
                        )}

                        <div
                          className="px-4 py-3 text-[14px] leading-relaxed"
                          style={{
                            background: message.role === 'user'
                              ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#0071e3')
                              : (theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f5f5f7'),
                            border: message.role === 'assistant'
                              ? (theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)')
                              : 'none',
                            color: message.role === 'user' && theme === 'light' ? '#ffffff' : 'var(--text-primary)',
                            borderRadius: message.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                          }}
                        >
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
                            <MarkdownMessage content={message.content} />
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: AGENT_IDENTITIES[message.agent as AgentType]?.gradient || 'linear-gradient(135deg, #444, #666)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.icon || 'A'}
                            </div>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
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
                                  if ((window as any).addToCart) {
                                    (window as any).addToCart({
                                      productId: product.id,
                                      name: product.name,
                                      price: product.price,
                                      quantity: 1,
                                      image: product.image || ''
                                    })
                                  }
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
                            whileHover={{ scale: 1.05, borderColor: 'rgba(255, 255, 255, 0.25)' }}
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
                  placeholder={isLoading ? 'Searching...' : 'Ask for products...'}
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
                  className="px-5 py-3 rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: inputValue.trim() && !isLoading
                      ? 'var(--link-color)'
                      : 'rgba(255, 255, 255, 0.04)',
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

      {/* Floating Bubble — closed state */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-[1000] flex items-center gap-3 cursor-pointer"
            data-tour="chat-bubble"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <motion.div
              className="px-5 py-3 rounded-full text-[15px] font-medium whitespace-nowrap"
              style={{
                background: theme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : '#ffffff',
                backdropFilter: 'blur(12px)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                color: 'var(--text-primary)',
                boxShadow: theme === 'light' ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              Ask me anything
            </motion.div>
            <motion.div
              className="w-[76px] h-[76px] rounded-full flex-shrink-0 overflow-hidden"
              style={{
                boxShadow: '0 6px 28px rgba(0, 0, 0, 0.5)',
                border: '2px solid var(--border-color)',
              }}
              whileHover={{ scale: 1.1 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="Chat" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized icon when chat IS open */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[998]">
          <motion.div
            onClick={() => setIsOpen(false)}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden opacity-40 hover:opacity-80 transition-opacity"
            style={{
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              border: '2px solid var(--border-color)',
            }}
            whileHover={{ scale: 1.1 }}
          >
            <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="Chat" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      )}
    </>
  )
}

export default AIAssistant
