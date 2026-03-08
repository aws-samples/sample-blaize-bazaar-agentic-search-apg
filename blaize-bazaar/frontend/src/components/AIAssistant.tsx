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
  const { chatMode, setChatMode, setChatOpen } = useLayout()
  const [isOpen, setIsOpenRaw] = useState(false)
  const setIsOpen = (open: boolean) => { setIsOpenRaw(open); setChatOpen(open) }

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
        'Wireless headphones under $100',
        'Best rated cameras',
        'Show me laptop deals',
        'Top gaming accessories'
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
        'Wireless headphones under $100',
        'Best rated cameras',
        'Show me laptop deals',
        'Top gaming accessories'
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

    // Add thinking placeholder
    const loadingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentStatus: 'thinking',
      agentExecution: {
        agent_steps: [{ agent: 'Orchestrator', action: 'Analyzing query', status: 'in_progress', timestamp: Date.now(), duration_ms: 0 }],
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
        }
      )

      // Update the existing message in-place (products may already be streamed in)
      let agentType: 'search' | 'pricing' | 'recommendation' | 'orchestrator' = 'orchestrator'
      if (!response.agent_execution || response.agent_execution.agent_steps.length === 0) {
        const q = messageText.toLowerCase()
        if (q.includes('cheap') || q.includes('price') || q.includes('deal') || q.includes('cost')) agentType = 'pricing'
        else if (q.includes('recommend') || q.includes('suggest') || q.includes('best') || q.includes('top')) agentType = 'recommendation'
        else agentType = 'search'
      }

      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        // Update the streaming message with final data
        // Keep content from streaming if final response is empty
        if (response.response) lastMsg.content = response.response
        // Only overwrite products if none were streamed in via individual product events
        if (!lastMsg.products?.length && response.products?.length) {
          lastMsg.products = response.products
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
              background: 'rgba(13, 13, 20, 0.92)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(168, 85, 247, 0.12)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="px-5 py-4 rounded-t-[20px] border-b border-white/[0.06] flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' }}>
                  <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="AI" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-medium text-sm text-white">Blaize AI</div>
                  <div className="text-[11px] flex items-center gap-1">
                    {isLoading ? (
                      <span className="text-purple-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        Thinking...
                      </span>
                    ) : !backendOnline ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Offline
                      </span>
                    ) : (
                      <span className="text-white/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors text-[11px] text-white/30 hover:text-white/60"
                  title="Reset conversation"
                >
                  Reset
                </button>
                <button
                  onClick={() => setChatMode(chatMode === 'floating' ? 'docked' : 'floating')}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                  title={chatMode === 'floating' ? 'Dock to side' : 'Float window'}
                >
                  {chatMode === 'floating'
                    ? <PanelRightOpen className="h-4 w-4 text-white/30" />
                    : <PanelRightClose className="h-4 w-4 text-white/30" />
                  }
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4 text-white/30" />
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
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                              style={{ background: AGENT_IDENTITIES[message.agent as AgentType]?.gradient || 'linear-gradient(135deg, #7c2bad, #a855f7)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.icon || '🤖'}
                            </div>
                            <span className="text-[10px] text-white/40 font-medium">
                              {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                            </span>
                          </div>
                        )}

                        <div
                          className="px-4 py-3 text-[14px] leading-relaxed"
                          style={{
                            background: message.role === 'user'
                              ? 'linear-gradient(135deg, rgba(124, 43, 173, 0.5), rgba(168, 85, 247, 0.35))'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: message.role === 'assistant' ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                            color: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: message.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                          }}
                        >
                          {/* Thinking skeleton */}
                          {message.agentStatus === 'thinking' && !message.content ? (
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="flex gap-1">
                                <motion.div className="w-2 h-2 rounded-full bg-purple-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
                                <motion.div className="w-2 h-2 rounded-full bg-purple-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
                                <motion.div className="w-2 h-2 rounded-full bg-purple-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
                              </div>
                              <span className="text-sm text-white/40">Thinking...</span>
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
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                              style={{ background: AGENT_IDENTITIES[message.agent as AgentType]?.gradient || 'linear-gradient(135deg, #7c2bad, #a855f7)' }}>
                              {AGENT_IDENTITIES[message.agent as AgentType]?.icon || '🤖'}
                            </div>
                            <span className="text-[10px] text-white/40 font-medium">
                              {AGENT_IDENTITIES[message.agent as AgentType]?.name || 'AI'}
                            </span>
                          </div>
                        )}
                        {message.content && (
                          <div className="text-sm text-white/60 font-light leading-relaxed">
                            {message.content.substring(0, 150)}{message.content.length > 150 ? '...' : ''}
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
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.2)',
                              color: '#c084fc',
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

                    {/* Conversation Memory Indicator */}
                    {message.role === 'assistant' && message.agentStatus === 'complete' && index >= 4 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-purple-400/60 italic ml-1">
                        <span className="w-1 h-1 rounded-full bg-purple-400/40" />
                        Using context from {Math.floor((index - 1) / 2)} previous {Math.floor((index - 1) / 2) === 1 ? 'exchange' : 'exchanges'}
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
                              background: 'rgba(168, 85, 247, 0.08)',
                              border: '1px solid rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                            }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 25 }}
                            whileHover={{ scale: 1.05, borderColor: 'rgba(168, 85, 247, 0.4)' }}
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
            <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isLoading ? 'Searching...' : 'Ask for products...'}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-40 text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                />
                <motion.button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-5 py-3 rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: inputValue.trim() && !isLoading
                      ? 'linear-gradient(135deg, #7c2bad, #a855f7)'
                      : 'rgba(255, 255, 255, 0.04)',
                  }}
                  whileHover={inputValue.trim() && !isLoading ? { scale: 1.05 } : {}}
                  whileTap={inputValue.trim() && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
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
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <motion.div
              className="px-4 py-2.5 rounded-full text-sm text-white/90 whitespace-nowrap"
              style={{
                background: 'rgba(13, 13, 20, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              Ask me anything
            </motion.div>
            <motion.div
              className="w-[60px] h-[60px] rounded-full flex-shrink-0 overflow-hidden"
              style={{
                boxShadow: '0 6px 28px rgba(106, 27, 154, 0.5)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
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
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden opacity-40 hover:opacity-80 transition-opacity"
            style={{
              boxShadow: '0 4px 16px rgba(106, 27, 154, 0.2)',
              border: '2px solid rgba(168, 85, 247, 0.2)',
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
