# Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL

## Refined Abstract

Shoppers don't search in keywords anymore — they search in sentences. "Something for long summer walks." "A thoughtful gift for someone who runs." Traditional product search breaks on queries like these. In this hands-on workshop, you'll build an agentic AI storefront that understands intent, reasons about it, and recommends with taste — all grounded in your own product catalog in Amazon Aurora PostgreSQL.

You'll start with a working e-commerce application (Blaize Bazaar) and progressively layer in agentic capabilities: vector search with pgvector and Cohere Embed v4, a multi-agent system built with the Strands Agents SDK and Claude Sonnet 4.6, and production-grade deployment with Amazon Bedrock AgentCore — including managed runtime, short-term memory for multi-turn conversations, a tool gateway over MCP, and OpenTelemetry-based observability.

By the end, you'll have built a system that doesn't just return products — it explains *why* it chose them, remembers what you've said, and runs in production. Leave with a reference implementation, architectural patterns you can apply to your own catalogs, and a concrete answer to the question: *what does agentic AI actually mean for the products you ship?*

---

## Module Structure — Two Formats

### Option A: 3 Modules (works for both Builders 1hr and Workshop 2hr)

| Module | Workshop (2hr) | Builders (1hr) | Challenges |
|---|---|---|---|
| **Setup** | 5 min | 5 min | environment check |
| **Module 1 — Smart Search** | 30 min | 15 min | C1: `_vector_search()` |
| **Module 2 — Agentic AI** | 40 min | 20 min | C2: `get_trending_products()` tool<br>C3: `recommendation_agent` specialist<br>C4: 5-agent orchestrator |
| **Module 3 — Production Patterns** | 40 min | 15 min | C5: AgentCore Runtime<br>C6: AgentCore STM Memory<br>C7: MCP Gateway<br>C8: OTEL Observability<br>C9: Agent Identity |
| **Wrap-up** | 5 min | 5 min | LTM mention, next steps |

Builders session reframes C2–C9 as **read-and-test** rather than reimplement. Only C1 stays a true build challenge given the time pressure.

---

### Option B: 4 Modules (Workshop only, 2hr)

| Module | Duration | Challenges |
|---|---|---|
| **Setup** | 5 min | environment check |
| **Module 1 — Smart Search** | 25 min | C1: `_vector_search()` |
| **Module 2 — Agentic AI** | 30 min | C2: `get_trending_products()` tool<br>C3: `recommendation_agent` specialist<br>C4: 5-agent orchestrator |
| **Module 3 — Agentic Infrastructure** | 30 min | C5: AgentCore Runtime<br>C6: AgentCore STM Memory<br>C7: MCP Gateway |
| **Module 4 — Production Readiness** | 25 min | C8: OTEL Observability<br>C9: Agent Identity |
| **Wrap-up** | 5 min | LTM mention, next steps |

This option only works for the 2-hour format. Splitting lets each module have a clearer single-subject focus.

---

## Progressive Build Narrative

The workshop story arc:

1. **Find the data.** Keywords fail on "something for long summer walks" because meaning isn't in the words. Embeddings convert meaning to vectors. Aurora + pgvector stores them. pgvector + HNSW finds the nearest ones. By end of Module 1, a shopper typing a sentence gets a ranked match.

2. **Reason over it.** Raw vector matches are useful but not helpful. A `@tool` wrapper makes the search callable by an agent. A specialist agent uses it plus other tools to reason. An orchestrator routes queries to the right specialist. By end of Module 2, the concierge says *"picked because you mentioned warm evenings"* rather than dumping a list.

3. **Ship it.** Local agents don't scale. AgentCore Runtime deploys them. STM Memory makes conversations multi-turn. MCP Gateway centralizes tool access. OTEL makes agent behavior observable. Agent Identity makes permissions auditable. By end of Module 3, the system could actually run at re:Invent scale.

This three-act structure is what sells the abstract. Each act earns its existence: act 1 solves a problem, act 2 makes the solution actually useful, act 3 makes the useful thing production-ready.

---

## Abstract Validation Against Workshop Design

The submitted abstract mentions these concepts. Here's where each one appears in the actual build:

| Concept | Where it appears |
|---|---|
| LLM-generated embeddings | Module 1 — Cohere Embed v4 via Bedrock generates 1024-dim vectors for the full catalog |
| Aurora PostgreSQL as vector database | Module 1 — pgvector 0.8.0 extension, HNSW index on embedding column |
| Similarity search | Module 1 — `_vector_search()` with cosine distance (`<=>`) operator |
| RAG (Retrieval-Augmented Generation) | Module 2 — retrieval via vector search, generation via Claude grounded on retrieved products |
| Agentic AI (reasoning, tool use) | Module 2 — Strands `@tool` decorator, specialist agent with multiple tools, orchestrator routing between 5 specialists |
| Model Context Protocol (MCP) | Module 3 — AgentCore MCP Gateway exposes tools to agents via standardized protocol |
| Personalized, intelligent user experience | Throughout — intent-based rotation, "Curated for you" UX, multi-turn refinement panel |

Every concept in the abstract has a module where it's taught hands-on. Nothing in the abstract is hand-waved.
