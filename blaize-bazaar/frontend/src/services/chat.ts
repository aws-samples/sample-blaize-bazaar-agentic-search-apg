/**
 * Chat Service - Connects to FastAPI Backend
 * Handles product search and AI chat functionality
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Get or create session ID for conversation persistence
 */
function getSessionId(): string {
  let sessionId = localStorage.getItem('blaize-session-id')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('blaize-session-id', sessionId)
  }
  return sessionId
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  products?: ChatProduct[]
  suggestions?: string[]
}

export interface ChatProduct {
  id: string
  name: string
  price: number
  image: string
  category?: string
  rating?: number
  reviews?: number
  url?: string
  similarityScore?: number
  quantity?: number
  inStock?: boolean
  originalPrice?: number
  discountPercent?: number
}

export interface AgentExecution {
  agent_steps: Array<{agent: string, action: string, status: string, timestamp: number, duration_ms: number}>
  tool_calls: Array<{tool: string, params?: string, timestamp: number, duration_ms: number, status: string}>
  reasoning_steps: Array<{step: string, content: string, timestamp: number}>
  total_duration_ms: number
  success_rate: number
}

export interface ChatResponse {
  response: string
  products: ChatProduct[]
  suggestions?: string[]
  agent_execution?: AgentExecution
}

/**
 * Send a chat message with streaming support
 */
export async function sendChatMessageStreaming(
  query: string,
  conversationHistory: ChatMessage[] = [],
  onUpdate: (data: any) => void
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        conversation_history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        session_id: getSessionId()
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let finalResponse: ChatResponse | null = null
    let lastContent = ''

    if (reader) {
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onUpdate(data)

              // Track content updates
              if (data.type === 'content') {
                lastContent = data.content
              }

              if (data.type === 'complete') {
                finalResponse = {
                  response: data.response.response,
                  products: data.response.products || [],
                  suggestions: data.response.suggestions || [],
                  agent_execution: data.response.agent_execution
                }
              }
            } catch {
              // Partial data, will be completed in next chunk
            }
          }
        }
      }
    }

    return finalResponse || {
      response: lastContent || 'Response completed',
      products: [],
      suggestions: []
    }
  } catch (error) {
    console.error('Streaming chat error:', error)
    throw error
  }
}

/**
 * Send a chat message to the backend and get AI response with products
 */
export async function sendChatMessage(query: string, conversationHistory: ChatMessage[] = [], enableThinking: boolean = false): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat?enable_thinking=${enableThinking}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: query,
        conversation_history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        session_id: getSessionId()
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Backend already returns formatted products
    const chatProducts: ChatProduct[] = (data.products || []).map((p: any) => ({
        id: p.id || p.productId || '',
        name: p.name || p.product_description || '',
        price: p.price || 0,
        image: p.image || p.imgUrl || p.imgurl || '📦',
        category: p.category || p.category_name,
        rating: p.stars || p.rating,
        reviews: p.reviews,
        url: p.url || p.producturl || `https://www.amazon.com/dp/${p.id || p.productId}`
      }
    ))

    return {
      response: data.response || 'I found some products for you!',
      products: chatProducts,
      suggestions: data.suggestions || generateSmartSuggestions(query, chatProducts),
      agent_execution: data.agent_execution
    }
  } catch (error) {
    console.error('Chat API error:', error)
    throw error
  }
}

/**
 * Generate smart suggestions based on the search query and results
 */
function generateSmartSuggestions(query: string, products: ChatProduct[]): string[] {
  const lowerQuery = query.toLowerCase()
  
  // Use actual product data to generate relevant suggestions
  if (products.length > 0) {
    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
    const suggestions: string[] = []

    // Price-based follow-up
    if (avgPrice > 100) {
      suggestions.push(`Budget options under $${Math.round(avgPrice / 2)}`)
    } else {
      suggestions.push(`Premium options up to $${Math.round(avgPrice * 3)}`)
    }

    // Category-based follow-up
    if (categories.length > 0) {
      suggestions.push(`More in ${categories[0]}`)
    }

    // Action-based follow-up
    if (products.length >= 2) {
      suggestions.push('Compare the top picks')
    } else {
      suggestions.push("What's trending right now?")
    }

    return suggestions.slice(0, 3)
  }
  
  // Query-type based fallbacks (no products returned)
  if (lowerQuery.includes('headphone') || lowerQuery.includes('audio') || lowerQuery.includes('earbud')) {
    return ['Wireless under $80', 'Best for working out', 'Noise-cancelling options']
  }
  
  if (lowerQuery.includes('laptop') || lowerQuery.includes('computer')) {
    return ['Best battery life', 'Lightweight under 3 lbs', 'Gaming laptops']
  }
  
  if (lowerQuery.includes('camera') || lowerQuery.includes('photo')) {
    return ['Best for low light', 'Compact travel cameras', 'Camera accessories']
  }
  
  return ["What's trending?", 'Best rated under $50', 'Show me something surprising']
}

/**
 * Health check for the backend
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    return response.ok
  } catch {
    return false
  }
}