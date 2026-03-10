import type { WorkshopMode } from '../contexts/LayoutContext'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TourAction {
  label: string
  actionKey: 'focus-search' | 'open-sql-inspector' | 'open-hybrid-search' |
    'open-agent-traces' | 'open-context-dashboard' | 'open-chat' |
    'open-guardrails' | 'toggle-chaos' | 'open-dev-tools'
}

export interface TourStep {
  selector: string
  title: string
  description: string
  position: TooltipPosition
  tryItAction?: TourAction
  spotlightPadding?: number
  celebration?: boolean
}

export const TOUR_STEPS: Record<WorkshopMode, TourStep[]> = {
  legacy: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Welcome to Legacy Mode',
      description: 'You\'re starting with a traditional keyword-only search engine. This is how most e-commerce search works today — simple SQL pattern matching.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="hero-search"]',
      title: 'Try a Keyword Search',
      description: 'Type a product name like "running shoes" or "wireless headphones" and press Enter. Keyword search works great for exact terms, but struggles with natural language.',
      position: 'bottom',
      tryItAction: { label: 'Focus Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 1?',
      description: 'Now try searching "something to keep my drinks cold" — keyword search can\'t find anything useful. Click "Lab 1" to unlock semantic search and see the difference!',
      position: 'bottom',
    },
  ],

  semantic: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Semantic Search Unlocked!',
      description: 'Lab 1 upgrades your search with pgvector embeddings from Amazon Bedrock. The search bar now runs BOTH keyword and semantic searches side-by-side so you can compare.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="hero-search"]',
      title: 'Compare Keyword vs Semantic',
      description: 'Search for "something to keep my drinks cold" — you\'ll see keyword results (left) vs semantic results (right). Semantic search understands intent and finds coolers, bottles, and thermoses!',
      position: 'bottom',
      tryItAction: { label: 'Try Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Developer Tools Unlocked',
      description: 'Lab 1 also unlocks 4 developer tools: SQL Inspector (see the pgvector query), Hybrid Search, Index Performance, and RAG Demo.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
      spotlightPadding: 10,
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 2?',
      description: 'You\'ve seen the power of semantic search! Click "Lab 2" to add an AI chat assistant powered by the Strands Agents SDK with custom tool calling.',
      position: 'bottom',
    },
  ],

  tools: [
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'AI Chat Assistant',
      description: 'Lab 2 adds an AI assistant powered by Amazon Bedrock and the Strands Agents SDK. Click the chat bubble to open it and ask a shopping question.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Try a Question',
      description: 'Ask: "Find waterproof running shoes under $120 with high ratings." Watch the agent call search tools and synthesize personalized results in real time.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="search-bar"]',
      title: 'Search & Visual Search',
      description: 'The search bar has moved to the header. You can also click the camera icon for AI-powered visual search — upload an image to find similar products.',
      position: 'bottom',
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Agent Reasoning Traces',
      description: 'After chatting, open Agent Traces to inspect every tool call — inputs, outputs, latency, and the orchestrator\'s decision chain.',
      position: 'right',
      tryItAction: { label: 'Open Traces', actionKey: 'open-agent-traces' },
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 3?',
      description: 'Experiment with the AI assistant, then click "Lab 3" for multi-agent orchestration, guardrails, and chaos testing.',
      position: 'bottom',
    },
  ],

  full: [
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Guardrails & Safety',
      description: 'Lab 3 adds Amazon Bedrock Guardrails. Open the Guardrails Demo to test content filtering and PII detection in real time.',
      position: 'right',
      tryItAction: { label: 'Open Guardrails', actionKey: 'open-guardrails' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Chaos Mode',
      description: 'Toggle Chaos Mode to inject random backend failures. Watch Agent Traces for exponential backoff and retry patterns.',
      position: 'right',
      tryItAction: { label: 'Toggle Chaos', actionKey: 'toggle-chaos' },
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Multi-Agent Orchestration',
      description: 'The orchestrator now delegates to specialized sub-agents: Search, Pricing, and Recommendation. Ask a complex question and watch them collaborate.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 4?',
      description: 'You\'ve mastered semantic search, agent tools, and multi-agent orchestration. Click "Lab 4" to productionize with Amazon Bedrock AgentCore!',
      position: 'bottom',
    },
  ],

  agentcore: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'AgentCore — Production Ready',
      description: 'Lab 4 adds Amazon Bedrock AgentCore: Cognito login, persistent memory, MCP tool discovery, CloudWatch traces, and Lambda runtime. Let\'s productionize your agent!',
      position: 'bottom',
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'AgentCore Memory',
      description: 'Your agent now remembers user preferences across sessions. Open the Memory Dashboard to see extracted preferences and conversation summaries.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Persistent Conversations',
      description: 'Chat with the agent, close the browser, come back — it remembers! Try: "I love running shoes under $100" then return and ask "what do you recommend?"',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'CloudWatch Observability',
      description: 'Every agent interaction is traced in CloudWatch X-Ray. Open the Observability panel to see the full request waterfall: Orchestrator → Agent → Tool → Bedrock LLM.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Cedar Policy Engine',
      description: 'AgentCore Policy uses Cedar language for real-time authorization. Try blocking a 1000-unit restock or a restricted search term — the policy engine evaluates before the agent acts.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Workshop Complete!',
      description: 'You built a production-grade agentic AI search system with Aurora PostgreSQL, pgvector, Amazon Bedrock, Strands SDK, and AgentCore. Deploy it with confidence!',
      position: 'bottom',
      celebration: true,
    },
  ],
}
