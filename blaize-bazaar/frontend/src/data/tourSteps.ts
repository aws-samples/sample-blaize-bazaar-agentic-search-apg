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
  // ─────────────────────────────────────────────────────────────
  // LEGACY — Emphasize limitations. This is the "before" state.
  // ─────────────────────────────────────────────────────────────
  legacy: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'The Legacy App',
      description: 'This is Blaize Bazaar before any AI. The search engine uses basic SQL keyword matching — it can only find products when you type the exact words in the product name. No intelligence, no understanding of intent.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="hero-search"]',
      title: 'Keyword Search Only',
      description: 'Try searching "MacBook Air" — it works because those exact words exist in a product name. Now try "something to keep my drinks cold" — zero results. Keyword search has no concept of meaning or intent.',
      position: 'bottom',
      tryItAction: { label: 'Try Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'What\'s Missing',
      description: 'No semantic search. No AI chat. No product recommendations. No agent tools. This is where most e-commerce platforms start — and where you\'ll begin building. Click "Smart Search" to add intelligence.',
      position: 'bottom',
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // SMART SEARCH — The first upgrade. Search understands meaning.
  // ─────────────────────────────────────────────────────────────
  search: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Smart Search Active',
      description: 'The database now understands meaning, not just keywords. Every product has a 1024-dimensional vector embedding from Cohere Embed v4, and pgvector finds the closest matches using cosine similarity.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="hero-search"]',
      title: 'Search by Intent',
      description: 'Try "something to keep my drinks cold" again — this time you\'ll get insulated bottles and tumblers. The search understands what you mean, even when you don\'t use product names.',
      position: 'bottom',
      tryItAction: { label: 'Try Search', actionKey: 'focus-search' },
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'See the SQL',
      description: 'Open the Developer Tools to inspect the actual pgvector query — you\'ll see the <=> cosine distance operator, HNSW index usage, and how business filters combine with vector similarity.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
      spotlightPadding: 10,
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Search Works — Now Add Agents',
      description: 'Semantic search is live. Next step: build agent tools, specialist agents, and a multi-agent orchestrator. Click "Agentic AI" to continue.',
      position: 'bottom',
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // AGENTIC AI — Tools, agents, and orchestration.
  // ─────────────────────────────────────────────────────────────
  agentic: [
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'AI Chat Assistant',
      description: 'The search functions are now wrapped as @tool functions that an AI agent can discover and call. Open the chat to talk to the agent — it decides which tools to invoke based on your question.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="chat-bubble"]',
      title: 'Multi-Agent Orchestration',
      description: 'Five specialist agents collaborate: Search, Recommendation, Pricing, Inventory, and Customer Support. Try: "What\'s trending right now?" or a complex question that spans multiple domains.',
      position: 'top',
      tryItAction: { label: 'Open Chat', actionKey: 'open-chat' },
      spotlightPadding: 16,
    },
    {
      selector: '[data-tour="search-bar"]',
      title: 'Search Moves to Header',
      description: 'With the chat assistant active, the search bar moves to the header for quick access. You can also use the camera icon for visual search — upload a product image to find similar items.',
      position: 'bottom',
      spotlightPadding: 12,
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Inspect Tool Calls',
      description: 'Open Agent Traces to see every tool call the agent made — inputs, outputs, latency, and token cost. This is how you debug and optimize agent behavior.',
      position: 'right',
      tryItAction: { label: 'Open Traces', actionKey: 'open-agent-traces' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Guardrails & Chaos',
      description: 'Amazon Bedrock Guardrails filter unsafe content and PII. Toggle Chaos Mode to inject random failures and test retry patterns.',
      position: 'right',
      tryItAction: { label: 'Open Guardrails', actionKey: 'open-guardrails' },
    },
    {
      selector: '[data-tour="workshop-pills"]',
      title: 'Local Dev Complete',
      description: 'You have semantic search, agent tools, and multi-agent orchestration running locally. Click "Production" to deploy with AgentCore — managed memory, secure gateway, Cedar policies, and serverless runtime.',
      position: 'bottom',
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // PRODUCTION — AgentCore infrastructure for enterprise deployment.
  // ─────────────────────────────────────────────────────────────
  production: [
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Production with AgentCore',
      description: 'The same agents now run on production infrastructure: Cognito authentication, AgentCore Memory for persistent preferences, MCP Gateway for secure tool discovery, and Cedar policies for authorization.',
      position: 'bottom',
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Persistent Memory',
      description: 'AgentCore Memory replaces local PostgreSQL sessions. The agent remembers user preferences across sessions — tell it "I prefer Nike shoes" and it remembers next time you visit.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Observability & Traces',
      description: 'Every agent interaction is traced via OpenTelemetry. Open the Observability panel to see the full request waterfall: Orchestrator → Specialist → Tool → Aurora PostgreSQL, with latency and cost at each hop.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="dev-tools-tab"]',
      title: 'Cedar Policy Enforcement',
      description: 'AgentCore Policy evaluates Cedar rules before every tool call. Try restocking 1000 units — the policy engine blocks it before the agent can act. Policies can also be authored in natural language.',
      position: 'right',
      tryItAction: { label: 'Open Dev Tools', actionKey: 'open-dev-tools' },
    },
    {
      selector: '[data-tour="hero-badge"]',
      title: 'Workshop Complete!',
      description: 'You built a production-grade agentic AI search system: pgvector semantic search, Strands SDK agent tools, multi-agent orchestration, and AgentCore production infrastructure — all on Aurora PostgreSQL.',
      position: 'bottom',
      celebration: true,
    },
  ],
}
