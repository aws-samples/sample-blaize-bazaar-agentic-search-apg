# Blaize Bazaar — Agentic AI-Powered Search with Amazon Aurora & Bedrock AgentCore

<div align="center">

[![AWS Workshop](https://img.shields.io/badge/AWS-Workshop-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg)
[![Level 400](https://img.shields.io/badge/Level-400%20Expert-red?style=for-the-badge)](https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg)
[![License](https://img.shields.io/badge/License-MIT-00b300?style=for-the-badge)](LICENSE)

</div>

> **Educational Workshop**: Demonstration code for re:Invent / AWS Summit sessions. Not intended for production deployment without proper security hardening.

---

## What Is This?

**Blaize Bazaar** is a boutique e-commerce storefront powered by a multi-agent AI system. It demonstrates how to build agentic search using **Amazon Aurora PostgreSQL** (pgvector for semantic search), **Amazon Bedrock** (Claude for reasoning), and **Bedrock AgentCore** (managed agent infrastructure).

The application has two surfaces:

- **Boutique** (`/`) — the customer-facing editorial storefront with AI-powered search, personalized recommendations, and a conversational shopping concierge
- **Atelier** (`/atelier`) — the operator-facing observatory that shows every agent decision, tool call, memory read, and reasoning step in real time

### Four Personas

The demo ships with four personas that reshape the entire experience:

| Persona | Profile | Boutique Effect |
|---------|---------|-----------------|
| **Fresh Visitor** | First-time shopper, no history | Nocturne Leather Weekender hero, generic editorial, warm welcome |
| **Marco** | Natural fibers, travel, linen | Pellier Linen Shirt hero, "The Travel Edit", linen/leather grid |
| **Anna** | Gifts, milestones, candles | Santal & Fig Candle hero, "The Gift Edit", gift-forward grid |
| **Theo** | Slow craft, ceramics, home | Solstice Woven Mat hero, "The Slow Edit", artisanal grid |

Switching personas in the header immediately reshapes: hero suggestion pills, featured product, Weekend Edit copy, "Curated for you" grid ordering, "Because you asked..." editorial cards, and the chat concierge greeting.

---

## Two Formats, One Codebase

| Format | Duration | Challenges | What Participants Build |
|--------|----------|------------|------------------------|
| **Workshop** | 2 hours | 9 challenges (all edit) | Full stack: search → agents → production |
| **Builder's Session** | 1 hour | 2 edit + 7 test/read | Search + tools hands-on, rest pre-completed |

### Three Modules

| Module | Name | Challenges | Outcome |
|--------|------|------------|---------|
| 1 | Smart Search | C1: `_vector_search()` | "Your database understands what customers mean." |
| 2 | Agentic AI | C2: `@tool`, C3: agent, C4: orchestrator | "A multi-agent team handles customer queries." |
| 3 | Production Patterns | C5–C9: runtime, memory, gateway, observability, identity | "Your agent system runs on managed infrastructure." |

---

## Quick Start

```bash
# Terminal 1: Backend (auto-reloads on .py changes)
cd blaize-bazaar/backend
cp .env.example .env  # Edit with your Aurora + Bedrock credentials
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend (HMR on .ts/.tsx changes)
cd blaize-bazaar/frontend
npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the Boutique, or [http://localhost:5173/atelier](http://localhost:5173/atelier) for the Atelier.

---

## Architecture

### Multi-Agent System

5 specialist agents + 1 orchestrator, running three orchestration patterns:

| Pattern | Surface | How It Works |
|---------|---------|-------------|
| **Dispatcher** (Pattern III) | Boutique production | Deterministic classifier picks one specialist; no paraphrase cycle. One LLM call. |
| **Agents as Tools** (Pattern I) | Atelier toggle | Haiku orchestrator + five `@tool` specialists. Two LLM calls. |
| **Graph** (Pattern II) | Atelier toggle | Real Strands `GraphBuilder` DAG: Haiku router node → 5 specialist nodes with conditional edges. |

### Specialist Agents

| Agent | Domain | Tools |
|-------|--------|-------|
| Search | Product search, comparisons | `search_products`, `browse_category`, `compare_products` |
| Recommendation | Trending, personalized picks | `trending_products`, `browse_category` |
| Pricing | Price analysis, deals | `price_analysis`, `search_products` |
| Inventory | Stock levels, restocking | `inventory_health`, `low_stock`, `restock_product` |
| Support | Returns, policies | `return_policy`, `search_products` |

### Infrastructure Stack

| Layer | Technologies |
|-------|-------------|
| **Database** | Aurora PostgreSQL Serverless v2, pgvector 0.8.0 (HNSW), `quantity` column for live inventory |
| **AI/ML** | Amazon Bedrock — Claude Opus 4.6 (specialists), Claude Haiku 4.5 (router), Cohere Embed v4 |
| **Agent Infra** | Bedrock AgentCore — Gateway (MCP tool discovery), Memory (STM/LTM), Policy (Cedar), Runtime |
| **Agent Framework** | Strands Agents SDK (Agent, @tool, GraphBuilder, BeforeToolCallEvent hooks) |
| **Backend** | FastAPI, Python 3.13, SSE streaming, psycopg3, boto3 |
| **Frontend** | React 18, TypeScript 5, Tailwind CSS, Vite, Framer Motion |
| **Design System** | Fraunces Variable (editorial), Inter (body), JetBrains Mono (code) |

---

## Boutique Features

- **BoutiqueHero** — editorial photograph with center-aligned search bar (Sparkles icon + Mic button), persona-specific suggestion pills, trust strip
- **Per-persona storefront** — featured product, Weekend Edit headline, curated grid ordering, editorial cards all reshape by persona
- **Chat drawer** — opens from hero search bar or ⌘K. Persona-aware welcome greeting with personal touch. Real-time SSE streaming from the agent.
- **Cart** — session-scoped, wired to "Add to bag" on every product card. CartPanel drawer slides from right.
- **Refinement chips** — "Under $100", "Ships by Friday", "Gift-wrappable", "From smaller makers" with measured latency

## Atelier Features

- **Espresso sidebar** (300px) — Observatory, Sessions, Memory, Inventory, Agents, Tools, Evaluations, Settings navigation with real persona headshot photos
- **Sessions list** — timestamped session cards with opening query, elapsed time, agent count, routing pattern
- **Session detail** — Chat / Telemetry / Brief tabs with numbered timeline, tool call expansion, SQL highlighting, product recommendation cards
- **Architecture index** — 8 concept cards (Memory, MCP, Tool Registry, Skills, Runtime, State, Evaluations, Grounding) with sticky category legend rail
- **Architecture detail pages** — deep-dive with two-tier hero, sequence diagrams, cheat sheets, live state callouts, back navigation
- **Observatory** — wide-angle dashboard with metric numerals, agent status, tool invocations, memory state
- **Live telemetry** — per-turn runtime timing, DB query log, guardrail decisions, policy enforcement audit trail, performance p50/p95

---

## Repository Structure

```
blaize-bazaar/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py              Multi-agent orchestrator (Agents-as-Tools)
│   │   ├── graph_pattern.py             GraphBuilder DAG adapter (Pattern II)
│   │   ├── search_agent.py              Search specialist
│   │   ├── recommendation_agent.py      Recommendation specialist
│   │   ├── pricing_agent.py             Pricing specialist
│   │   ├── inventory_agent.py           Inventory specialist
│   │   └── customer_support_agent.py    Support specialist
│   ├── services/
│   │   ├── chat.py                      SSE streaming chat (3 patterns)
│   │   ├── agent_tools.py               9 @tool functions
│   │   ├── policy_hook.py               Cedar enforcement via BeforeToolCallEvent
│   │   ├── guardrails_log.py            Bedrock guardrail decision buffer
│   │   ├── performance_log.py           Per-turn latency ring buffer
│   │   ├── agentcore_gateway.py         MCP Gateway client/server
│   │   ├── agentcore_memory.py          AgentCore Memory (STM + LTM)
│   │   ├── agentcore_policy.py          Cedar policy engine
│   │   └── database.py                  Aurora connection pool
│   └── app.py                           FastAPI server (60+ endpoints)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BoutiqueHero.tsx         Editorial hero with persona pills
│   │   │   ├── BecauseYouAsked.tsx      Persona-aware editorial cards
│   │   │   ├── ChatDrawer.tsx           Conversational drawer with SSE
│   │   │   ├── Header.tsx               Boutique header with persona dropdown
│   │   │   ├── ProductCard.tsx          Product card with scroll-reveal parallax
│   │   │   └── CartPanel.tsx            Shopping cart drawer
│   │   ├── atelier/
│   │   │   ├── shell/                   AtelierFrame, Sidebar, TopBar
│   │   │   ├── surfaces/observe/        Sessions, Chat, Telemetry, Brief, Observatory
│   │   │   ├── surfaces/understand/     Architecture, Agents, Tools, Memory, Routing
│   │   │   └── surfaces/measure/        Performance, Evaluations
│   │   ├── data/
│   │   │   ├── personaCurations.ts      Per-persona: pills, featured, weekend edit, editorial
│   │   │   ├── personaPhotos.ts         Unsplash headshot URLs per persona
│   │   │   └── showcaseProducts.ts      9 editorial products
│   │   ├── contexts/                    Auth, Cart, Persona, UI, Layout
│   │   ├── design/                      Tokens, typography, primitives (Avatar, Card, etc.)
│   │   └── hooks/useAgentChat.ts        SSE event loop + localStorage bridge
│   └── tailwind.config.js              Design tokens (cream, sand, espresso, accent)
└── solutions/                           Drop-in solution files per challenge
```

---

## Short on Time?

Every challenge has a solution file. Copy it over and the backend auto-restarts:

```bash
# Example: Skip Challenge 1
cp solutions/module1/services/hybrid_search.py blaize-bazaar/backend/services/hybrid_search.py
```

---

## Design System

Three typefaces, shared across Boutique and Atelier via CSS variables:

| Token | Family | Usage |
|-------|--------|-------|
| `--serif` / `font-display` | Fraunces Variable | Editorial headlines, product names |
| `--sans` / `font-sans` | Inter | Body text, UI, navigation |
| `--mono` / `font-mono` | JetBrains Mono | Code, timestamps, metadata |

Typography CSS classes: `.text-display`, `.text-headline`, `.text-body`, `.text-body-sm`, `.text-mono`, `.text-eyebrow`, `.text-microcopy`

Color palette: cream (`#F7F3EE`), sand (`#E8DFD4`), espresso (`#3B2F2F`), accent/burgundy (`#C44536`), ink variants (1–5)

Preview: [http://localhost:5173/dev/design-system](http://localhost:5173/dev/design-system) (dev only)

---

## Resources

- [Aurora PostgreSQL with pgvector](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Strands Agents SDK](https://strandsagents.com/latest/)
- [pgvector 0.8.0 Performance](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/)
- [AWS Labs MCP Servers](https://awslabs.github.io/mcp/)

---

## License

MIT-0 License. See [LICENSE](./LICENSE).
