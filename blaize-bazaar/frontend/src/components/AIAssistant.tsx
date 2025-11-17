/**
 * Connects to FastAPI backend for actual product search
 */
import { useState, useRef, useEffect } from 'react'
import { Send, X, AlertCircle, Download } from 'lucide-react'
import ProductCardCompact from './ProductCardCompact'
import AgentWorkflowVisualizer from './AgentWorkflowVisualizer'
import MarkdownMessage from './MarkdownMessage'
import QueryInsight from './QueryInsight'
import { sendChatMessageStreaming, ChatProduct, checkBackendHealth } from '../services/chat'

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

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  /**
   * Load conversation history from localStorage
   */
  const loadConversationHistory = (): Message[] => {
    try {
      const saved = localStorage.getItem('blaize-conversation-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    } catch (e) {
      console.error('Failed to load conversation history:', e)
    }
    
    // Default welcome message
    return [
      {
        role: 'assistant',
        content: '✨ I\'m Blaize Bazaar AI Assist. I can help you find products, compare options, and get recommendations. What are you looking for?',
        timestamp: new Date(),
        suggestions: [
          '🎧 Wireless headphones under $100',
          '📦 What products need restocking?',
          '💰 Show me the best deals',
          '⭐ Recommend top-rated products'
        ]
      }
    ]
  }

  const [messages, setMessages] = useState<Message[]>(loadConversationHistory())
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendOnline, setBackendOnline] = useState(true)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    // Save conversation to localStorage on every message change
    localStorage.setItem('blaize-conversation-history', JSON.stringify(messages))
  }, [messages])

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline)
  }, [])



  const handleClearChat = () => {
    if (window.confirm('Clear chat history? This will start a new conversation.')) {
      // Clear localStorage
      localStorage.removeItem('blaize-conversation-history')
      localStorage.removeItem('blaize-session-id')
      
      // Reset to welcome message
      setMessages([
        {
          role: 'assistant',
          content: '✨ I\'m Blaize Bazaar AI Assist. I can help you find products, compare options, and get recommendations. What are you looking for?',
          timestamp: new Date(),
          suggestions: [
            '🎧 Wireless headphones under $100',
            '📦 What products need restocking?',
            '💰 Show me the best deals',
            '⭐ Recommend top-rated products'
          ]
        }
      ])
    }
  }

  const handleExportConversation = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      session_id: localStorage.getItem('blaize-session-id'),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        agent: msg.agent,
        products_count: msg.products?.length || 0,
        suggestions: msg.suggestions
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blaize-conversation-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || inputValue
    if (!messageText.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add loading message with skeleton
    setActiveAgent('Aurora AI')
    const loadingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentStatus: 'thinking',
      agentExecution: {
        agent_steps: [
          { agent: 'Orchestrator', action: 'Analyzing query and routing to specialists', status: 'in_progress', timestamp: Date.now(), duration_ms: 0 }
        ],
        tool_calls: [],
        reasoning_steps: [],
        total_duration_ms: 0,
        success_rate: 0
      }
    }
    setMessages(prev => [...prev, loadingMessage])
    
    // Simulate agent steps appearing
    setTimeout(() => {
      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
          lastMsg.agentExecution.agent_steps.push({
            agent: 'Analyzing',
            action: 'Processing with specialized agents',
            status: 'in_progress',
            timestamp: Date.now(),
            duration_ms: 0
          })
        }
        return updated
      })
    }, 500)

    try {
      // Call streaming API for real-time updates
      const historyBeforeUser = messages.slice(0, -1)  // Exclude loading message
      
      const response = await sendChatMessageStreaming(
        messageText,
        historyBeforeUser,
        (data) => {
          // Handle streaming updates
          if (data.type === 'agent_step') {
            // Emit event for Agent Reasoning Traces
            window.dispatchEvent(new CustomEvent('agent-trace', {
              detail: { agent: data.agent, action: data.action, status: data.status }
            }));
            
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg.agentStatus === 'thinking' && lastMsg.agentExecution) {
                // Update or add agent step
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
            // Update message content as it streams
            setMessages(prev => {
              const updated = [...prev]
              const lastMsg = updated[updated.length - 1]
              if (lastMsg.agentStatus === 'thinking') {
                lastMsg.content = data.content
              }
              return updated
            })
          }
        }
      )

      // Remove loading message
      setMessages(prev => prev.slice(0, -1))
      setActiveAgent(null)

      // Determine agent type - use orchestrator if agent execution is present
      let agentType: 'search' | 'pricing' | 'recommendation' | 'orchestrator' = 'orchestrator'
      if (!response.agent_execution || response.agent_execution.agent_steps.length === 0) {
        const queryLower = messageText.toLowerCase()
        if (queryLower.includes('cheap') || queryLower.includes('price') || queryLower.includes('deal') || queryLower.includes('cost') || queryLower.includes('value')) {
          agentType = 'pricing'
        } else if (queryLower.includes('recommend') || queryLower.includes('suggest') || queryLower.includes('best') || queryLower.includes('top')) {
          agentType = 'recommendation'
        } else {
          agentType = 'search'
        }
      }

      // Add AI response (products already formatted by chat service)
      console.log('🔍 Agent execution received:', response.agent_execution)
      
      // Emit complete agent execution for Agent Reasoning Traces
      if (response.agent_execution) {
        console.log('🚀 Emitting agent-execution-complete event:', response.agent_execution);
        window.dispatchEvent(new CustomEvent('agent-execution-complete', {
          detail: response.agent_execution
        }));
      } else {
        console.log('⚠️ No agent_execution in response');
      }
      
      const aiMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        products: response.products,
        suggestions: response.suggestions,
        agent: agentType,
        agentStatus: 'complete',
        agentExecution: response.agent_execution
      }
      
      console.log('💬 Message with agent execution:', aiMessage)

      setMessages(prev => [...prev, aiMessage])
      setBackendOnline(true)

    } catch (error) {
      console.error('Chat error:', error)
      
      // Remove loading message
      setMessages(prev => prev.slice(0, -1))
      setActiveAgent(null)
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Unable to connect. Please check that the backend service is running.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
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
      {isOpen && (
        <div className="fixed bottom-32 right-8 w-[420px] max-w-[calc(100vw-4rem)] h-[680px] max-h-[calc(100vh-10rem)] glass-strong rounded-[20px] flex flex-col z-[999] animate-slideUp shadow-2xl">
          {/* Header */}
          <div className="px-6 py-6 rounded-t-[20px] border-b border-accent-light/20 flex justify-between items-center"
               style={{
                 background: 'linear-gradient(135deg, rgba(106, 27, 154, 0.1) 0%, rgba(186, 104, 200, 0.1) 100%)'
               }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="Aurora AI" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-medium text-lg text-text-primary">Blaize Bazaar AI Assist</div>
                <div className="text-xs text-text-secondary flex items-center gap-1">
                  {activeAgent ? (
                    <div className="flex items-center gap-1 text-purple-400 animate-pulse">
                      Analyzing your request...
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center gap-1">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  ) : !backendOnline ? (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Backend Offline
                    </>
                  ) : (
                    <><span className="text-green-500">🟢</span> Online</>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportConversation}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Export conversation"
              >
                <Download className="h-4 w-4 text-text-primary" />
              </button>
              <button 
                onClick={handleClearChat}
                className="text-text-primary hover:text-accent-light transition-colors text-xl"
                title="Clear chat history"
              >
                🧹
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-text-primary hover:text-accent-light transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>



          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 custom-scrollbar">
            {messages.map((message, index) => (
              <div key={index} className="flex flex-col gap-3">
                {/* Agent Workflow Visualization */}
                {message.role === 'assistant' && message.agentExecution && (
                  <AgentWorkflowVisualizer 
                    execution={message.agentExecution}
                    isActive={message.agentStatus === 'thinking'}
                  />
                )}
                {/* Query Insight - Show for user messages with products */}
                {message.role === 'user' && index < messages.length - 1 && messages[index + 1].products && messages[index + 1].products!.length > 0 && (
                  <QueryInsight query={message.content} agent={messages[index + 1].agent} />
                )}
                
                {/* Message Bubble - Skip if products exist */}
                {!(message.products && message.products.length > 0) && (
                  <div
                    className={`max-w-[85%] px-[18px] py-[14px] rounded-2xl text-base leading-relaxed animate-slideUp ${
                      message.role === 'assistant'
                        ? 'self-start text-text-primary'
                        : 'self-end'
                    }`}
                    style={{
                      background: message.role === 'assistant'
                        ? 'linear-gradient(135deg, rgba(106, 27, 154, 0.1) 0%, rgba(186, 104, 200, 0.05) 100%)'
                        : 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)',
                      border: message.role === 'assistant' ? '1px solid rgba(186, 104, 200, 0.2)' : 'none',
                      color: message.role === 'user' ? 'white' : undefined
                    }}
                  >
                    {message.agentStatus === 'thinking' && !message.content ? (
                      <div className="flex items-center gap-2 text-purple-300">
                        <span className="animate-pulse">✨</span>
                        <span>Analyzing your request...</span>
                      </div>
                    ) : message.role === 'assistant' ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                    )}
                  </div>
                )}

                {/* Product Cards - Compact Display */}
                {message.products && message.products.length > 0 && (
                  <div className="flex flex-col gap-3 w-full">
                    {/* Short intro text - first 150 chars */}
                    {message.content && (
                      <div className="text-sm text-purple-300 font-medium">
                        {message.content.substring(0, 150)}{message.content.length > 150 ? '...' : ''}
                      </div>
                    )}
                    
                    {/* Product cards */}
                    <div className="flex flex-col gap-2">
                      {message.products.map((product) => (
                        <ProductCardCompact
                          key={product.id}
                          product={product}
                          onAddToCart={() => {
                            if ((window as any).addToCart) {
                              (window as any).addToCart({
                                productId: product.id,
                                name: product.name,
                                price: product.price,
                                quantity: 1,
                                image: product.image || '📦'
                              })
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-0">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'rgba(106, 27, 154, 0.2)',
                          border: '1px solid rgba(186, 104, 200, 0.3)',
                          color: '#ba68c8'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}


              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-accent-light/20">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isLoading ? 'Searching...' : 'Ask for products...'}
                disabled={isLoading}
                className="flex-1 px-[14px] py-[14px] input-field rounded-xl text-sm disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-[14px] rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #6a1b9a 0%, #ba68c8 100%)'
                }}
              >
                {isLoading ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Floating Bubble */}
      <div className="fixed bottom-6 right-6 z-[1000]">
        {/* Tooltip Bubble */}
        {!isOpen && (
          <div className="absolute bottom-24 right-0 animate-slideIn">
            <div 
              className="px-4 py-2 pr-8 rounded-2xl text-base font-medium text-white whitespace-nowrap relative"
              style={{
                background: 'rgba(10, 10, 15, 0.95)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(186, 104, 200, 0.2)'
              }}
            >
              Hi there! What can I help you find today? 👋
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const tooltip = e.currentTarget.closest('.animate-slideIn') as HTMLElement
                  if (tooltip) tooltip.style.display = 'none'
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Chat bubble tail */}
              <div 
                className="absolute -bottom-2 right-6 w-4 h-4 rotate-45"
                style={{
                  background: 'rgba(10, 10, 15, 0.95)',
                  borderRight: '1px solid rgba(186, 104, 200, 0.2)',
                  borderBottom: '1px solid rgba(186, 104, 200, 0.2)'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Chat Icon */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-[100px] h-[100px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 animate-float relative overflow-hidden group"
          style={{
            boxShadow: '0 8px 32px rgba(106, 27, 154, 0.5)'
          }}
          title="Powered by AWS Strands SDK & Custom Tools"
        >
          <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="Chat" className="w-full h-full object-cover" />
          
          {/* Hover Tooltip */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            <div 
              className="px-3 py-2 rounded-lg text-xs font-medium text-white"
              style={{
                background: 'rgba(10, 10, 15, 0.95)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(186, 104, 200, 0.3)'
              }}
            >
              🤖 Multi-Agent Orchestrator + AWS Strands
            </div>
          </div>
        </div>
      </div>

    </>
  )
}

export default AIAssistant