# Blaize Bazaar Workshop Structure — Kiro Implementation Spec

> **IMPORTANT — File Path Disclaimer:** This spec references file paths, function names, and directory structures based on the project state at time of writing. Before implementing any challenge, **always check the actual files in the repo** (`blaize-bazaar/backend/services/`, `blaize-bazaar/backend/agents/`, `blaize-bazaar/frontend/src/`) for the current file names, function signatures, imports, and directory layout. If a file referenced in this spec does not exist or has been renamed, use the actual file in the repo as the source of truth. The repo at `https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg` is always authoritative over this document.

## Overview

**Title:** Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL
**Level:** 400 — Expert
**Formats:** 2-hour Workshop (120 min) + 1-hour Builders Session (60 min)
**Repo:** `aws-samples/sample-blaize-bazaar-agentic-search-apg`
**App:** Blaize Bazaar — a live e-commerce storefront with a multi-agent AI shopping assistant

### Format Philosophy

Both formats share **one repo, one codebase, two separate lab guides**. The workshop guide has full TODO instructions for all 9 challenges. The builders session guide covers challenges 1–3 as TODOs and directs participants to test and read the pre-wired solutions for challenges 4–9.

- **Workshop (120 min):** Participants edit 9 files across 9 challenges. Full build experience.
- **Builders Session (60 min):** Participants edit 3 files (challenges 1–3). Remaining challenges are pre-wired — participants test and read the completed code.

### Delivery Model: "Wire It Live"

There are no Jupyter notebooks. Participants edit real application files (`services/*.py`, `agents/*.py`, `frontend/src/utils/*.ts`) in VS Code and see results immediately in the running Blaize Bazaar storefront.

- **Backend:** `uvicorn --reload` watches Python file changes and auto-restarts in ~1 second.
- **Frontend:** Vite dev server with HMR hot-swaps TypeScript/CSS changes in <100ms.
- **Both services auto-start** on instance boot via a systemd service — participants never run `start-backend.sh` or `start-frontend.sh`.

### Narrative Arc

Three modules tell one story: **find the data → reason over it → ship it.**

| Module | Name | What participants learn | Outcome |
|--------|------|------------------------|---------|
| 1 | Smart Search | Semantic vector search with pgvector on Aurora PostgreSQL | "Your database understands what customers mean, not just what they type." |
| 2 | Agentic AI | @tool functions, specialist agents, multi-agent orchestration with Strands SDK | "A multi-agent team handles customer queries live in the storefront." |
| 3 | Production Patterns | Runtime, memory, gateway, observability, identity with AgentCore | "Your agent system runs on managed infrastructure with enterprise controls." |

---

## Getting Started

**Time:** Workshop 8 min / Builders 5 min

### What Participants Do

1. Open VS Code (pre-configured, services already running)
2. Open the Blaize Bazaar storefront in their browser tab
3. Try searching "comfortable shoes for standing all day" — see bad keyword results
4. Browse the project structure: `backend/services/`, `backend/agents/`, `frontend/src/`

### DevEx Integration

DevEx is NOT a separate module. It is the first 3 minutes of Getting Started. The broken keyword search IS the hook, the IDE orientation, and the Module 1 setup — all in one moment.

- **Aurora MCP Server** is pre-configured in VS Code. During Module 1, participants can explore the product catalog schema directly from the MCP sidebar (e.g., "notice how the Aurora MCP server shows our `blaize_bazaar.product_catalog` columns and the pgvector embedding column"). This is a "by the way" moment, not a challenge.
- **Amazon Q** is pre-installed in VS Code. Participants can optionally use Amazon Q for code completion while implementing challenges. The lab guide does NOT depend on Amazon Q — it's a productivity accelerator, not a requirement. Mention it during Getting Started: "Amazon Q is available in your sidebar if you'd like AI-assisted code completion while you work."
- The welcome terminal shows file paths for each challenge, not instructions to run start scripts

### Welcome Terminal Output

```
╔═══════════════════════════════════════════════════════════════════╗
║                    Blaize Bazaar Workshop                                ║
║     🚀 Build Agentic AI-Powered Search with Aurora PostgreSQL     ║
╚═══════════════════════════════════════════════════════════════════╝

✅ Your environment is ready — services are already running!

🌐 Storefront:  Already open in your browser tab
📁 Edit code:   backend/services/ and backend/agents/
🔄 Auto-reload: Backend restarts on Python saves (~1s)
                 Frontend hot-reloads on TypeScript saves (<100ms)

📂 Challenge Files:
   services/hybrid_search.py          → Challenge 1: _vector_search()
   services/agent_tools.py            → Challenge 2: get_trending_products()
   agents/recommendation_agent.py     → Challenge 3: specialist agent
   agents/orchestrator.py             → Challenge 4: multi-agent orchestrator
   services/agentcore_runtime.py      → Challenge 5: AgentCore Runtime
   services/agentcore_memory.py       → Challenge 6: AgentCore STM
   services/agentcore_gateway.py      → Challenge 7: MCP Gateway
   services/otel_trace_extractor.py   → Challenge 8: OTEL traces
   frontend/src/utils/agentIdentity.ts → Challenge 9: agent identity UI
```

### Outcome Statement

> "This search is broken. You're going to fix it by editing real backend files and watching the storefront update."

---

## Module 1 — Smart Search

**Time:** Workshop 20 min / Builders 15 min
**Module color:** Purple (consistent with existing Part 1 styling)

### Pedagogical Approach

Keyword search is the foil, not the lesson. Participants see the broken state in Getting Started, implement semantic search in one challenge, and move on. Module 1 is deliberately short to give Modules 2 and 3 the time they deserve.

There is NO hybrid search module. Without industry-standard BM25 in Aurora, "hybrid search" is a misleading term. The workshop teaches keyword vs semantic as a comparison moment, not a build target.

### Challenge 1: Semantic Vector Search

**File:** `services/hybrid_search.py`
**Class:** `HybridSearchService`
**Method:** `_vector_search()`
**Time:** Workshop 20 min / Builders 15 min
**Mode:** Workshop = edit / Builders = edit (with more explicit hints)

#### What Participants Implement

The `_vector_search()` method is a private method on the `HybridSearchService` class. Participants implement it within the existing class structure. The method receives the pre-computed embedding as a parameter (the caller handles embedding generation).

```python
async def _vector_search(
    self,
    embedding: list,
    limit: int = 10,
    ef_search: int = 40,
    iterative_scan: bool = True
) -> dict:
    """
    Search products using semantic vector similarity with pgvector.

    Steps:
    1. Set ef_search on the connection for HNSW index tuning
    2. Build SQL with cosine distance operator (<=>)
    3. Query blaize_bazaar.product_catalog with the provided embedding
    4. Return ranked results with similarity scores

    Args:
        embedding: Pre-computed query embedding vector (1024 dimensions, Cohere Embed v4)
        limit: Number of results (default: 10)
        ef_search: HNSW search depth parameter (default: 40)
        iterative_scan: Enable pgvector 0.8.0 iterative scan (default: True)

    Returns:
        dict with status, products list, performance metrics
    """
```

> **Note:** The embedding is generated by the caller (the `search()` method on the same class) using Cohere Embed v4 via `self.embedding_service`. Participants focus on the pgvector SQL query, not the embedding generation. Check the actual `_vector_search` signature in the repo — if it has additional parameters (e.g., filters), match those.

#### Key Concepts Taught

- pgvector cosine distance operator (`<=>`) for similarity search
- HNSW index tuning via `ef_search` parameter (set per-connection with `SET hnsw.ef_search`)
- pgvector 0.8.0 iterative scan for improved recall under filtered conditions
- CTE pattern for embedding reuse in SQL
- HNSW index usage (pre-built, participants observe but don't create)
- Similarity score calculation: `1 - (embedding <=> query_vector)`

#### Verification

Participant searches "comfortable shoes for standing all day" in the storefront and sees relevant products (insulated bottles appear for "keep my drinks cold"). This is the before/after moment.

#### Workshop vs Builders Difference

- **Workshop:** TODO has method signature and docstring. Participant writes the embedding call, SQL query, and filter logic.
- **Builders:** TODO has partial code stubs — the SQL template is provided, participant fills in the vector clause (`embedding <=> %s::vector`) and the filter conditions.

#### HNSW Exploration (Workshop Only, Optional)

The storefront includes an Index Performance Dashboard where participants can adjust `ef_search` and observe recall vs latency tradeoffs. This is exploration time, not a challenge. Builders session skips this entirely — linked as optional reading.

#### Take It Further: RRF Fusion (Optional)

The `HybridSearchService` class also has a `search()` method that combines `_vector_search()` with `_keyword_search()` using Reciprocal Rank Fusion (RRF). This is already implemented in the codebase — participants do NOT build it. For participants who finish Challenge 1 early, the lab guide points them to the existing RRF implementation and explains how the fusion formula `1 / (k + rank)` combines two ranked lists. This is a read-and-understand section, not a build challenge.

### Module 1 Outcome

> "Your database understands what customers mean, not just what they type."

---

## Module 2 — Agentic AI

**Time:** Workshop 36 min / Builders 20 min
**Module color:** Green (consistent with existing Part 2/3 styling)

### Pedagogical Approach

Three challenges build the agentic stack bottom-up: tool → agent → orchestrator. Each challenge edits one file and has one verification step. The "Agents as Tools" pattern is the architectural concept participants take home.

### Challenge 2: @tool Function

**File:** `services/agent_tools.py`
**Function:** `get_trending_products()`
**Time:** Workshop 12 min / Builders 10 min
**Mode:** Workshop = edit / Builders = edit

#### What Participants Implement

```python
@tool
def get_trending_products(limit: int = 10) -> str:
    """Get trending products with high ratings and many reviews.

    Trending score = reviews × stars, filtered to products with:
    - At least 4.0 stars
    - At least 50 reviews
    - In stock (quantity > 0)

    Args:
        limit: Number of trending products to return (default: 10)

    Returns:
        JSON string with trending products and metadata
    """
```

#### Key Concepts Taught

- Strands SDK `@tool` decorator pattern
- Tool docstrings as LLM-readable contracts (agents decide when to call based on these)
- `_run_async()` wrapper for sync-to-async bridging
- Structured JSON return format for agent consumption
- Error handling pattern (try/except → `json.dumps({"error": ...})`)

#### Verification

Restart backend, call `/api/agents/query?query=trending&agent_type=recommendation` — see real product data returned by the agent.

#### Naming Convention Note

All data tools follow `verb_noun` or `get_*` pattern: `get_trending_products`, `get_inventory_health`, `get_price_statistics`, `get_product_by_category`, `search_products`, `restock_product`. This convention is already consistent across the codebase.

### Challenge 3: Specialist Agent

**File:** `agents/recommendation_agent.py`
**Function:** `product_recommendation_agent()`
**Time:** Workshop 12 min / Builders 5 min (read + test only)
**Mode:** Workshop = edit / Builders = read + test

#### What Participants Implement

```python
@tool
def product_recommendation_agent(query: str) -> str:
    """Provide personalized product recommendations based on user preferences.

    Args:
        query: User's product inquiry with preferences

    Returns:
        Personalized product recommendations with reasoning
    """
    try:
        agent = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-opus-4-6-v1",
                max_tokens=4096,
                temperature=0.2
            ),
            system_prompt="""...""",  # Participant writes this
            tools=[search_products, get_trending_products, get_product_by_category]
        )
        response = agent(query)
        return str(response)
    except Exception as e:
        return f"Error in recommendation agent: {str(e)}"
```

#### Key Concepts Taught

- "Agents as Tools" pattern — a `@tool`-decorated function that internally creates and invokes a Strands Agent
- System prompt design for specialist agents (clear identity, tool usage instructions, output format)
- Tool registration — passing `@tool` functions to the Agent constructor
- The agent-as-callable pattern: `response = agent(query)`

#### Verification

Call `/api/agents/query?query=running+shoes&agent_type=recommendation` — agent reasons over tools and returns product cards.

#### Builders Session Difference

File is pre-wired with the complete implementation. Participants open the file, read the agent-as-tool pattern, and run the test query. The lab guide highlights the key lines: system prompt, tools list, and error handling.

### Challenge 4: Multi-Agent Orchestrator

**File:** `agents/orchestrator.py`
**Function:** `create_orchestrator()` + `ORCHESTRATOR_PROMPT`
**Time:** Workshop 12 min / Builders 5 min (test only)
**Mode:** Workshop = edit / Builders = test

#### What Participants Implement

```python
ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator.
Your ONLY job is to route queries to the correct specialist agent.

ROUTING RULES:
1. Pricing keywords (deal, cheap, price, discount, budget, cost) → price_optimization_agent
2. Inventory keywords (restock, inventory, stock) → inventory_restock_agent
3. Support keywords (return, refund, policy, warranty, broken) → customer_support_agent
4. Search keywords (find, search, compare, looking for, browse) → search_agent
5. All other queries (recommend, suggest, trending, best) → product_recommendation_agent

EXAMPLES:
- "Show me the best deals" → price_optimization_agent
- "What's the return policy?" → customer_support_agent
- "Find running shoes under $80" → search_agent
- "Recommend headphones" → product_recommendation_agent
- "What needs restocking" → inventory_restock_agent

Call exactly ONE agent. Pass the full user query as the parameter."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-opus-4-6-v1",
            max_tokens=4096,
            temperature=0.3
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[
            product_recommendation_agent,
            search_agent,
            price_optimization_agent,
            inventory_restock_agent,
            customer_support_agent
        ]
    )
```

#### Key Concepts Taught

- Orchestrator as a routing layer — it does NOT answer questions, it delegates
- System prompt as a routing table with keyword rules and examples
- All specialist agents registered as tools on the orchestrator
- `BedrockModel` wrapper for explicit model config (max_tokens, temperature)
- The full multi-agent topology: Orchestrator → 5 specialists → data tools → Aurora PostgreSQL

#### Verification

Open the storefront chat. Test 5 query types:
1. "recommend headphones" → Recommendation Agent responds
2. "find running shoes under $80" → Search Agent responds
3. "best deals on laptops" → Pricing Agent responds
4. "what needs restocking" → Inventory Agent responds
5. "what's the return policy for electronics" → Customer Support Agent responds

Watch the agent reasoning traces panel show correct routing.

#### Builders Session Difference

Orchestrator is pre-wired. Participants open the storefront chat, test all 5 query types, and observe the agent traces panel. This is the Module 2 capstone demo moment.

### Module 2 Outcome

> "A multi-agent team handles customer queries live in the storefront."

---

## Module 3 — Production Patterns

**Time:** Workshop 46 min / Builders 15 min
**Module color:** Purple/Magenta (consistent with existing advanced styling)

### Pedagogical Approach

Five production concerns, ordered by dependency: infrastructure first, visibility last. Each challenge layers one production capability onto the agent system built in Module 2.

| Order | Challenge | What it adds | Why this order |
|-------|-----------|-------------|----------------|
| 1 | Runtime | Managed execution | Foundation — everything else runs ON the runtime |
| 2 | Agent Memory | Conversational state | Requires runtime for session lifecycle integration |
| 3 | MCP Gateway | Tool access control | Controls HOW tools are accessed on the running system |
| 4 | Observability | Execution visibility | Shows WHAT happened across runtime, memory, gateway |
| 5 | Agent Identity | UI presentation | Visual capstone — connects backend architecture to the UI |

### Important: AgentCore Memory Guidance

**Use AgentCore STM (Short-Term Memory), NOT custom Aurora session tables.**

The existing `aurora_session_manager.py` stores conversation JSON directly in a PostgreSQL table. This is a hand-rolled solution that predates AgentCore Memory. For a workshop teaching production patterns, participants should use the managed service.

#### STM vs LTM Decision

| | AgentCore STM | AgentCore LTM |
|---|---|---|
| **What it stores** | Raw conversation events within a session | Extracted insights: preferences, facts, summaries |
| **Latency** | Immediate | Async extraction takes 2–5 minutes |
| **Scope** | Within a session ID | Across session IDs for the same actor |
| **Workshop fit** | ✅ Perfect — instant recall, demo-friendly | ❌ Too slow for live demo |
| **Use case** | "What about the cheapest one?" (recalls previous turn) | "You always prefer running shoes over hiking boots" (recalls across visits) |

**Decision:** Use AgentCore STM for Challenge 6. Mention LTM with its three strategies (summaryMemoryStrategy, userPreferenceMemoryStrategy, semanticMemoryStrategy) in the wrap-up as a "what's next" topic.

**Pre-provision the memory resource** in the bootstrap script. Memory resource creation is a one-time operation that can take several seconds. Participants should NOT wait for provisioning during the workshop — they should wire the config using a pre-existing memory ID from an environment variable.

### Challenge 5: AgentCore Runtime

**File:** `services/agentcore_runtime.py`
**Time:** Workshop 10 min / Builders 3 min (test only)
**Mode:** Workshop = edit / Builders = test

#### What Participants Implement

Replace local agent invocation with AgentCore Runtime managed execution. Configure concurrency limits and timeout policies.

#### Key Concepts Taught

- Local execution vs managed runtime — same agent code, different execution model
- AgentCore Runtime deploys to Graviton (ARM64) containers
- Concurrency limits prevent runaway agent invocations
- Timeout policies for long-running agent chains

#### Verification

Same chat queries work, but now agents execute on managed infrastructure. Participants observe runtime invocation metrics.

### Challenge 6: Agent Memory (AgentCore STM)

**File:** `services/agentcore_memory.py`
**Time:** Workshop 10 min / Builders 5 min (test only)
**Mode:** Workshop = edit / Builders = test

#### What Participants Implement

```python
from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager

# Memory ID is pre-provisioned in bootstrap — stored in environment variable
MEMORY_ID = os.environ.get("AGENTCORE_MEMORY_ID")

config = AgentCoreMemoryConfig(
    memory_id=MEMORY_ID,
    session_id=session_id,      # Unique per browser session
    actor_id=actor_id           # Unique per user
)

session_manager = AgentCoreMemorySessionManager(
    agentcore_memory_config=config,
    region_name="us-west-2"
)

# Pass to agent — memory is now automatic
agent = Agent(
    system_prompt="...",
    tools=[...],
    session_manager=session_manager
)
```

#### Key Concepts Taught

- AgentCore Memory as a managed service (no custom Aurora tables needed)
- STM stores raw conversation events, maintains turn-by-turn context
- `AgentCoreMemorySessionManager` integrates with Strands Agent lifecycle
- Session ID and actor ID scoping for multi-user, multi-session isolation
- STM feeds into LTM extraction (mentioned but not implemented)

#### Verification

In storefront chat:
1. Ask "recommend headphones"
2. Then ask "what about the cheapest one?"
3. Agent recalls the product category from the previous turn and returns filtered results

#### Why NOT Custom Aurora Tables

The existing `aurora_session_manager.py` stores conversation JSON in a PostgreSQL table. This teaches the wrong pattern:
- Participants learn to hand-roll session storage instead of using a managed service
- No automatic event lifecycle management
- No path to LTM extraction
- No built-in encryption, retention policies, or namespace scoping

AgentCore STM provides all of this out of the box.

### Challenge 7: MCP Gateway

**File:** `services/agentcore_gateway.py`
**Time:** Workshop 10 min / Builders 3 min (test only)
**Mode:** Workshop = edit / Builders = test

#### What Participants Implement

Wire AgentCore Gateway for tool access control. Configure which agents can invoke which tools, set rate limits per tool, enable audit logging.

#### Key Concepts Taught

- MCP Gateway converts backend tools into MCP-compatible endpoints with access control
- Rate limiting per tool prevents runaway agent tool calls
- Audit logging creates a trail of every tool invocation for compliance
- Gateway as the control plane between agents and tools

#### Verification

Trigger a rate-limited tool call, observe the throttle response. Inspect the audit log for the tool invocation chain.

### Challenge 8: Observability

**File:** `services/otel_trace_extractor.py`
**Time:** Workshop 8 min / Builders 2 min (read only)
**Mode:** Workshop = edit / Builders = read

#### What Participants Implement

Wire OTEL (OpenTelemetry) trace export for agent execution. Configure span attributes for orchestrator routing, specialist agent execution, and tool calls.

#### Key Concepts Taught

- OTEL traces as the standard for agent observability
- Span hierarchy: Orchestrator → Specialist Agent → Tool Call → Database Query
- Trace attributes for debugging: `session.id`, `agent.name`, `tool.name`, `query.tokens`
- Cost-per-query estimation from token usage spans
- Integration with CloudWatch X-Ray for production monitoring

#### Verification

In the storefront, open the Agent Reasoning Traces panel. Send a chat query and observe the full execution trace: orchestrator routing decision → specialist agent invocation → tool calls with timing → database query with plan.

### Challenge 9: Agent Identity

**File:** `frontend/src/utils/agentIdentity.ts`
**Time:** Workshop 8 min / Builders 2 min (read only)
**Mode:** Workshop = edit / Builders = read

> **Note:** This file may already be fully implemented in the codebase with all 6 agent types and the `resolveAgentType` priority order. If so, this challenge becomes a read-and-understand exercise for both formats — the lab guide walks participants through the existing implementation rather than having them write it. Check the actual file before generating TODO stubs.

#### What Participants Implement

```typescript
export type AgentType = 'orchestrator' | 'search' | 'inventory' | 'pricing' | 'recommendation' | 'support';

export const AGENT_IDENTITIES: Record<AgentType, AgentIdentity> = {
  orchestrator: {
    name: 'Orchestrator',
    icon: '🎯',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    // ... colors
  },
  support: {
    name: 'Support Agent',
    icon: '🛟',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    // ... colors
  },
  // ... other agents
};

export function resolveAgentType(agentName: string): AgentType {
  const name = agentName.toLowerCase();
  if (name.includes('support') || name.includes('customer_support')) return 'support';
  if (name.includes('inventory') || name.includes('stock')) return 'inventory';
  if (name.includes('pricing') || name.includes('price')) return 'pricing';
  if (name.includes('recommend')) return 'recommendation';
  if (name.includes('search')) return 'search';
  return 'orchestrator';
}
```

#### Key Concepts Taught

- Agent identity as a UX concern — distinct visual treatment per specialist
- Name resolution from backend agent strings to frontend display types
- Color and icon mapping for the glassmorphism chat UI
- The `'search'` type exists in frontend only (Lab 2 single-agent mode) — no backend agent equivalent

#### Verification

Save the file. Vite HMR hot-swaps the component. Each agent response in the storefront chat now shows its identity badge with the correct color, icon, and name.

### Module 3 Outcome

> "Your agent system runs on managed infrastructure with session memory, gateway policies, and per-query observability."

---

## Time Budget Summary

### Workshop (120 min)

| Phase | Time | Challenges | Mode |
|-------|------|-----------|------|
| Getting Started | 8 min | — | Run + observe |
| Module 1: Smart Search | 20 min | C1: _vector_search() | Edit |
| Module 2: Agentic AI | 36 min | C2: @tool, C3: agent, C4: orchestrator | Edit |
| Module 3: Production Patterns | 46 min | C5: runtime, C6: memory, C7: gateway, C8: observability, C9: identity | Edit |
| Wrap-up | 10 min | — | Explore |
| **Total** | **120 min** | **9 challenges** | |

### Builders Session (60 min)

| Phase | Time | Challenges | Mode |
|-------|------|-----------|------|
| Getting Started | 5 min | — | Run + observe |
| Module 1: Smart Search | 15 min | C1: _vector_search() | Edit |
| Module 2: Agentic AI | 20 min | C2: @tool (edit), C3: agent (read+test), C4: orchestrator (test) | Mixed |
| Module 3: Production Patterns | 15 min | C5–C9: all pre-wired | Test + read |
| Wrap-up | 5 min | — | Read |
| **Total** | **60 min** | **2 edit + 7 test/read** | |

### Builders Session Key Constraint

There is NO instructor-led demo time. After a 10-minute presentation, participants have 50 minutes of hands-on. Everything they see, they run themselves. Pre-wired challenges use completed code that participants execute and inspect — not facilitator screenshares.

---

## Infrastructure Requirements

### Pre-Provisioned by Bootstrap

These resources MUST be ready before participants open VS Code:

- Aurora PostgreSQL 17.5 cluster with pgvector 0.8.0 extension
- Product catalog loaded (~444 products with Cohere Embed v4 embeddings and HNSW index)
- AgentCore Memory resource (STM only, no strategies) — memory ID stored in `AGENTCORE_MEMORY_ID` env var
- AgentCore Runtime configuration
- MCP Gateway endpoint
- Backend (uvicorn --reload) and frontend (Vite dev HMR) running as a systemd service
- VS Code with Python, Jupyter, Tailwind CSS extensions
- Amazon Bedrock model access: Claude Opus 4 (`global.anthropic.claude-opus-4-6-v1`), Cohere Embed v4

### Environment Variables (in .env)

```bash
# Database
DB_HOST=<aurora-cluster-endpoint>
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<from-secrets-manager>

# Bedrock
AWS_REGION=us-west-2
BEDROCK_CHAT_MODEL=global.anthropic.claude-opus-4-6-v1
BEDROCK_EMBEDDING_MODEL=us.cohere.embed-v4:0

# AgentCore (pre-provisioned)
AGENTCORE_MEMORY_ID=<pre-provisioned-memory-id>
AGENTCORE_RUNTIME_ARN=<pre-provisioned-runtime-arn>
AGENTCORE_GATEWAY_ENDPOINT=<pre-provisioned-gateway-url>

# Frontend
CLOUDFRONT_URL=<workshop-studio-cloudfront-url>
```

---

## File Map

All challenge files live in the Blaize Bazaar application:

```
blaize-bazaar/
├── backend/
│   ├── services/
│   │   ├── hybrid_search.py           ← Challenge 1: _vector_search()
│   │   ├── agent_tools.py             ← Challenge 2: get_trending_products()
│   │   ├── agentcore_runtime.py       ← Challenge 5: AgentCore Runtime
│   │   ├── agentcore_memory.py        ← Challenge 6: AgentCore STM
│   │   ├── agentcore_gateway.py       ← Challenge 7: MCP Gateway
│   │   ├── otel_trace_extractor.py    ← Challenge 8: OTEL traces
│   │   ├── business_logic.py          (pre-built, not a challenge)
│   │   ├── database.py                (pre-built, not a challenge)
│   │   ├── embeddings.py              (pre-built, Cohere Embed v4 via Bedrock)
│   │   ├── rerank.py                  (pre-built, Cohere Rerank v3.5)
│   │   ├── chat.py                    (pre-built, intent classification + SSE streaming)
│   │   ├── context_manager.py         (pre-built, AgentType enum + PromptRegistry)
│   │   ├── guardrails.py              (pre-built, Bedrock Guardrails)
│   │   ├── agentcore_policy.py        (pre-built, Cedar policy evaluation)
│   │   ├── auth.py                    (pre-built, Cognito JWT verification)
│   │   ├── aurora_session_manager.py  (legacy fallback — replaced by agentcore_memory.py)
│   │   └── sql_query_logger.py        (pre-built, SQL logging)
│   ├── agents/
│   │   ├── recommendation_agent.py    ← Challenge 3: specialist agent
│   │   ├── orchestrator.py            ← Challenge 4: multi-agent orchestrator
│   │   ├── search_agent.py            (pre-built, not a challenge)
│   │   ├── inventory_agent.py         (pre-built, not a challenge)
│   │   ├── pricing_agent.py           (pre-built, not a challenge)
│   │   ├── customer_support_agent.py  (pre-built, not a challenge)
│   │   └── graph_orchestrator.py      (pre-built, graph visualization structure)
│   ├── app.py                         (FastAPI entry point, pre-built)
│   └── config.py                      (Pydantic settings, pre-built)
├── frontend/
│   └── src/
│       ├── utils/
│       │   └── agentIdentity.ts       ← Challenge 9: agent identity UI
│       └── components/
│           ├── ConciergeModal.tsx      (pre-built, chat UI)
│           ├── AgentReasoningTraces.tsx (pre-built, trace visualization)
│           ├── MemoryDashboard.tsx     (pre-built, memory viewer)
│           ├── ObservabilityPanel.tsx  (pre-built, OTEL waterfall)
│           ├── RuntimeStatusPanel.tsx  (pre-built, runtime status)
│           └── GatewayToolsPanel.tsx   (pre-built, MCP gateway tools)
└── scripts/
    └── workshop-autostart.sh          (systemd auto-start for backend + frontend)
```

### Solution Files

Solutions live in the `solutions/` directory at the repo root, organized by module. Participants can copy a solution file over the challenge file and restart the backend to see the completed implementation.

```
solutions/
├── module1/services/
│   └── hybrid_search.py               → cp to blaize-bazaar/backend/services/hybrid_search.py
├── module2/services/
│   └── agent_tools.py                 → cp to blaize-bazaar/backend/services/agent_tools.py
├── module2/agents/
│   ├── recommendation_agent.py        → cp to blaize-bazaar/backend/agents/recommendation_agent.py
│   └── orchestrator.py                → cp to blaize-bazaar/backend/agents/orchestrator.py
├── module3/services/
│   ├── agentcore_runtime.py           → cp to blaize-bazaar/backend/services/agentcore_runtime.py
│   ├── agentcore_memory.py            → cp to blaize-bazaar/backend/services/agentcore_memory.py
│   ├── agentcore_gateway.py           → cp to blaize-bazaar/backend/services/agentcore_gateway.py
│   └── otel_trace_extractor.py        → cp to blaize-bazaar/backend/services/otel_trace_extractor.py
├── module3/frontend/
│   └── agentIdentity.ts               → cp to blaize-bazaar/frontend/src/utils/agentIdentity.ts
└── README.md                          # Copy commands for each module
```

For the **Builders Session**, challenges 3–9 start with the solution code already in place. Both formats use the **same bootstrap scripts** (`bootstrap-environment.sh` + `bootstrap-labs.sh`) and the **same codebase**. The challenge files ship with the complete solution code. Each challenge has a clearly marked `# === CHALLENGE N: START ===` / `# === CHALLENGE N: END ===` block. The **workshop lab guide** instructs participants to delete the code inside these blocks and implement from scratch. The **builders lab guide** instructs participants to read and test the existing implementation for challenges 3–9, and only delete + reimplement challenges 1–2. No separate setup script or bootstrap flag is needed — the difference is entirely in which lab guide participants follow.

---

## Wrap-Up Content

**Time:** Workshop 10 min / Builders 5 min

### Topics to Cover

1. **GitHub repo link** — `aws-samples/sample-blaize-bazaar-agentic-search-apg`
2. **AgentCore LTM** — "What's next" topic: three built-in strategies (summaryMemoryStrategy, userPreferenceMemoryStrategy, semanticMemoryStrategy). Async extraction takes 2–5 min, so it's not demo-friendly, but it's the path to cross-session personalization.
3. **Graph orchestrator pattern** — visual representation of the multi-agent topology
4. **Visual search** — image-based product search using Bedrock multimodal models (stretch goal)
5. **Builders → Workshop upsell** — "Want to build the orchestrator and production stack yourself? The 2-hour version has 9 challenges."
6. **Resource cleanup** — instructions to tear down CloudFormation stacks
