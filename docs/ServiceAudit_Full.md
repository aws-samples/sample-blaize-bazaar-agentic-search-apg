# Service File Audit — Usage Tracing and Recommendations

## Methodology

Every file in `services/` and `agents/` traced through three paths:
1. **Top-level imports** in `app.py` (lines 31–42)
2. **Lazy imports** inside `app.py` endpoint functions
3. **Cross-imports** from `chat.py`, `agent_tools.py`, and specialist agents

A file is "active" if any code path can reach it during normal operation.
A file is "dead" if no import path reaches it from `app.py` or its transitive dependencies.

---

## Services — Active (keep)

| File | Imported by | Used for | Notes |
|------|-----------|----------|-------|
| `database.py` | `app.py` top-level | Connection pool, all DB queries | Core — everything depends on this |
| `embeddings.py` | `app.py` top-level + `agent_tools.py` | Cohere Embed v4 via Bedrock | Core — clean, has cache + retry logic |
| `hybrid_search.py` | `app.py` top-level + `agent_tools.py` | Vector + full-text + RRF + rerank | Core — workshop exercise file |
| `chat.py` | `app.py` top-level | All chat endpoints (stream + non-stream) | Core — largest file, orchestrates everything |
| `agent_tools.py` | `app.py` lifespan + specialist agents | All @tool functions | Core — workshop exercise file |
| `business_logic.py` | `agent_tools.py` + `app.py` endpoints | Trending, inventory, pricing, restock, search | Core — called by 5+ endpoints directly |
| `cache.py` | `app.py` top-level + `embeddings.py` + `hybrid_search.py` | Valkey/in-memory cache | Core — embedding cache + search cache |
| `rerank.py` | `app.py` top-level + `agent_tools.py` | Cohere Rerank v3.5 | Active — clean, well-structured |
| `auth.py` | `app.py` top-level | `get_current_user` dependency | Active — used by chat and agentcore endpoints |
| `context_manager.py` | `chat.py` (lazy) + `app.py` endpoints | Token tracking, prompt registry | Active — used by both chat paths + 3 API endpoints |
| `sql_query_logger.py` | `app.py` top-level | SQL Inspector panel data | Active — feeds `/api/queries/recent` |
| `index_performance.py` | `app.py` top-level | HNSW vs seq scan comparison | Active — feeds 5 `/api/performance/*` endpoints |
| `image_search.py` | `app.py` top-level | Claude Vision image search | Active — feeds `/api/search/image` |
| `otel_trace_extractor.py` | `app.py` lifespan + `chat.py` | OpenTelemetry span capture | Active — feeds `/api/traces/waterfall` |
| `aurora_session_manager.py` | _none_ | Local PostgreSQL session persistence | Removed — deleted during STM migration to AgentCore Memory (see `seed-database.sh:266` comment). Session state now managed by AgentCore. |

## Services — Active but workshop-gated (keep)

These are only reached when specific workshop modules are complete or AgentCore is configured:

| File | Imported by | Gate | Notes |
|------|-----------|------|-------|
| `agentcore_gateway.py` | `chat.py` (lazy) + `app.py` workshop status | `settings.AGENTCORE_GATEWAY_URL` set | Workshop Module 4 — keep |
| `agentcore_memory.py` | `chat.py` (lazy) + `app.py` workshop status + `/api/agentcore/memories` | `settings.AGENTCORE_MEMORY_ID` set | Workshop Module 4 — keep |
| `agentcore_policy.py` | `app.py` `/api/agentcore/policy/*` endpoints | Always reachable via API | Workshop Module 4 — keep |

## Services — Questionable (audit needed)

| File | Imported by | Concern | Recommendation |
|------|-----------|---------|----------------|
| `bedrock.py` | `app.py` top-level | Initialized in lifespan as `bedrock_service = BedrockService()`, dependency `get_bedrock_service()` defined, but **no endpoint uses `Depends(get_bedrock_service)`**. The health check uses `embedding_service.generate_embedding("test")` directly. `chat.py` creates its own `boto3.client('bedrock-runtime')`. `embeddings.py` creates its own client. `rag_demo.py` creates its own client. Nobody calls `bedrock_service`. | **Candidate for removal.** Every consumer creates its own Bedrock client. This file is initialized at startup but never used. Either consolidate all Bedrock access through it (make it the single client), or delete it and remove the import + initialization from `app.py`. |
| `guardrails.py` | `app.py` `/api/guardrails/check` endpoint only | Only one endpoint uses it. It's a "Wire It Live" demo feature, not part of the core workshop flow. | **Keep but flag as optional.** Not blocking anything. |
| `code_interpreter.py` | `app.py` `/api/agentcore/analytics` endpoint only | Single endpoint, "Going Further" section. Depends on `AGENTCORE_RUNTIME_ENDPOINT`. | **Keep but flag as optional.** Advanced feature. |
| `search_eval.py` | `app.py` `/api/search/eval` and `/api/search/eval/tune` | Search quality evaluation with NDCG/Precision. Used by the leaderboard feature. | **Keep.** It's a legitimate feature for the workshop, even if not part of the core modules. |
| `nova_embeddings.py` | `app.py` `/api/search/image/nova-status` endpoint only | Single status-check endpoint. The actual image search uses `image_search.py` + `embeddings.py`, not Nova. | **Candidate for removal** unless you plan to add a Nova multimodal embedding comparison feature. Currently it's a dead-end status check that returns `{"available": false}` if the service isn't configured. |

## Services — Dead code (recommend deletion)

| File | Evidence | Recommendation |
|------|----------|----------------|
| `rag_demo.py` | Imported by `app.py` at `/api/rag/compare` endpoint (line 1347). Creates its own `boto3.client`. However: the endpoint works, but it's not part of any workshop module, not referenced in any content page, not called by the frontend, and duplicates what the chat service already demonstrates (RAG via tool-based retrieval). | **Delete.** The entire workshop IS a RAG demo — having a separate `/api/rag/compare` endpoint that does a simpler version is redundant. If you want to keep the concept, fold it into the "Wire It Live" section as a teaching comparison, but don't maintain a separate service file for it. |

## Agents — Active (keep)

| File | Status | Notes |
|------|--------|-------|
| `orchestrator.py` | Active | Core — created by both chat paths |
| `recommendation_agent.py` | Active | Core specialist |
| `pricing_agent.py` | Active | Core specialist |
| `inventory_agent.py` | Active | Core specialist |

## Agents — Questionable

| File | Imported by | Concern | Recommendation |
|------|-----------|---------|----------------|
| `graph_orchestrator.py` | `app.py` `/api/agents/graph` endpoint (line 1711) | Returns a static DAG structure for the frontend `GraphVisualization` component. **But the DAG is wrong** — it shows parallel fan-out with an Aggregator node that doesn't exist in the actual architecture. The model labels are also incorrect (says Haiku for specialists that use Sonnet). | **Fix or delete.** If the frontend graph visualization is a feature you're shipping, fix the node structure and labels to match reality (sequential: Router → one specialist → response, no Aggregator). If the frontend doesn't render it, delete both the file and the endpoint. |

---

## Newly Audited Files — Detailed Notes

### `embeddings.py` — Clean

- Correctly uses Cohere Embed v4 with asymmetric `input_type` ("search_query" vs "search_document")
- Cache integration is solid — keyed on `input_type:text`, 1-hour TTL
- Retry logic with exponential backoff (0.5s, 1s, 2.5s) for throttling
- Cost tracking via `_TOTAL_EMBEDDING_COST` global — feeds the Context & Cost dashboard
- No issues found

### `hybrid_search.py` — Clean

- `_vector_search()` has the complete solution with iterative scan — this is the workshop exercise file
- The TODO docstring is comprehensive with step-by-step hints
- `search_with_rerank()` cleanly integrates Cohere Rerank as a post-processing step
- Cache integration (5-min TTL) on the `search()` path
- Concurrent execution via `asyncio.gather()` for vector + fulltext
- No issues found

### `database.py` — Clean

- psycopg3 `AsyncConnectionPool` with proper pool management
- `pgvector.psycopg.register_vector_async` called per-connection — correct for psycopg3
- All methods use `%s` placeholder style (psycopg3 format) — consistent
- **Note:** `app.py` line 609 uses `$1` placeholder (asyncpg format) for `get_product()`. This is an `app.py` bug, not a `database.py` bug. The `fetch_one()` method passes params via psycopg3 which expects `%s`. The `$1` at line 609 will likely work because psycopg3 can handle numbered params, but it's inconsistent with every other query in the codebase.
- Pool stats exposed via `health_check()` — could be extended for the connection pooling visibility feature in the Progressive Experience Spec

### `rerank.py` — Clean

- Simple, well-structured Cohere Rerank v3.5 wrapper
- Proper error handling and timing
- No issues found

### `rag_demo.py` — Recommend deletion

- Creates its own `boto3.client` (doesn't reuse the shared one)
- The `rag_compare()` method does a naive LLM call vs a RAG-augmented call — a useful teaching concept but:
  - The entire workshop already demonstrates RAG (every agent tool is RAG)
  - The endpoint isn't referenced in any workshop content page
  - The frontend doesn't appear to call `/api/rag/compare`
- If you want to keep the comparison concept, it belongs in a notebook exercise, not a running service

---

## Summary — Action Items

### Delete (3 files)

| File | Why |
|------|-----|
| `rag_demo.py` | Redundant — the workshop IS the RAG demo. Remove `/api/rag/compare` endpoint from `app.py` too. |
| `bedrock.py` | Initialized but never consumed. Every file creates its own Bedrock client. Remove import + init from `app.py` lifespan. |
| `nova_embeddings.py` | Single status endpoint returning `{"available": false}`. Remove `/api/search/image/nova-status` from `app.py` too. Unless you're building the Nova comparison feature. |

### Fix (2 files)

| File | What |
|------|------|
| `graph_orchestrator.py` | Fix model labels (specialists = Sonnet 4, not Haiku), remove fictional Aggregator node, or delete if frontend doesn't render it |
| `app.py` line 609 | Change `$1` to `%s` in `get_product()` for consistency with psycopg3 |

### Keep as-is (21 files)

Everything else is actively used and correctly wired. The services directory is large (25 files) but most of them serve a specific endpoint or feature. After removing the 3 dead files, you're at 22 — each with a clear purpose.

### Optional cleanup

| File | Action |
|------|--------|
| `app.py` `/api/tools` endpoint | Update hardcoded tool list (wrong names, missing `get_low_stock_products`) |
| `app.py` `/api/workshop/status` | Update sentinel strings to match actual TODO format in exercise files |
