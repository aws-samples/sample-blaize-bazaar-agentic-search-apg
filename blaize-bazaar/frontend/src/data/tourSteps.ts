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
      selector: '[data-tour="search-bar"]',
      title: 'Keyword Search',
      description: 'This is a classic SQL LIKE query. It only matches exact words. Try searching "something to keep drinks cold" and notice the limitations.',
      position: 'bottom',
      tryItAction: { label: 'Focus Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Legacy Mode Active',
      description: 'The badge shows the current mode. In Legacy, we run pure Aurora PostgreSQL full-text search with no AI enhancements.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 1?',
      description: 'Use these pills to advance through the labs. Click "Lab 1" to unlock semantic vector search with pgvector and Amazon Bedrock embeddings.',
      position: 'bottom',
    },
  ],

  semantic: [
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Developer Tools Unlocked',
      description: 'Lab 1 unlocks 4 new tools: SQL Inspector, Hybrid Search, Index Performance, and RAG Demo. Hover here to explore them.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
      spotlightPadding: 10,
    },
    {
      selector: '[data-tour="search-bar"]',
      title: 'Semantic Search Enabled',
      description: 'Aurora now uses pgvector embeddings from Amazon Titan. Try "something to keep drinks cold" — it finds ice coolers without exact keyword matches!',
      position: 'bottom',
      tryItAction: { label: 'Try Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'SQL Inspector',
      description: 'Open SQL Inspector to see the exact pgvector cosine similarity query Aurora executes behind every search, including HNSW index stats.',
      position: 'right',
      tryItAction: { label: 'Open SQL Inspector', actionKey: 'open-sql-inspector' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Hybrid Search Comparison',
      description: 'Compare keyword vs vector vs hybrid search side by side. Hybrid blends BM25 + cosine similarity via Reciprocal Rank Fusion.',
      position: 'right',
      tryItAction: { label: 'Open Hybrid Search', actionKey: 'open-hybrid-search' },
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Ready for Lab 2?',
      description: 'You have unlocked semantic vector search! Advance to Lab 2 to add an AI agent with custom tool calling powered by the Strands Agents SDK.',
      position: 'bottom',
    },
  ],

  tools: [
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'AI Chat Assistant',
      description: 'Lab 2 unlocks the AI chat powered by Amazon Bedrock and the Strands Agents SDK. The agent uses custom tools to query Aurora in real time.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Try a Question',
      description: 'Ask: "Find waterproof running shoes under $120 with high ratings." Watch the agent call search tools, then synthesize personalized results.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Agent Reasoning Traces',
      description: 'After chatting, open Agent Traces to inspect every tool call — inputs, outputs, latency, and the orchestrator decision chain.',
      position: 'right',
      tryItAction: { label: 'Open Traces', actionKey: 'open-agent-traces' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Context & Cost Dashboard',
      description: 'Every agent call consumes tokens. Open Context & Cost to see cumulative Bedrock API costs, context window usage, and embedding cache hit rates.',
      position: 'right',
      tryItAction: { label: 'Open Dashboard', actionKey: 'open-context-dashboard' },
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Try It Yourself!',
      description: 'Experiment with multi-turn agent conversations. When ready, advance to Lab 3 for multi-agent orchestration, guardrails, and chaos testing.',
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
      description: 'Chaos Mode injects random backend failures to test retry logic. Toggle it on and watch Agent Traces for exponential backoff patterns.',
      position: 'right',
      tryItAction: { label: 'Toggle Chaos', actionKey: 'toggle-chaos' },
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Multi-Agent Orchestration',
      description: 'The orchestrator now delegates to specialized sub-agents: Search, Pricing, and Recommendation. Ask a complex shopping question and watch them collaborate.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Workshop Complete!',
      description: 'You built a full agentic AI-powered search system on Aurora PostgreSQL with pgvector, Amazon Bedrock, and the Strands Agents SDK.',
      position: 'bottom',
      celebration: true,
    },
  ],
}
