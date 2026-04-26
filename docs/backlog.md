# Blaize Bazaar — Engineering Backlog

Last updated: 2026-04-26

---

## Phase 1: LLM at the edges, SQL in between (deterministic core)

- [ ] Rename `_vector_search` → `vector_search`, make it a standalone function
- [ ] Delete `HybridSearchService` class wrapper
- [ ] Deterministic param extraction: intent parse extracts `{query, max_price, min_rating, category}` before any tool call — no LLM decides which params to pass
- [ ] Orchestrator becomes a thin deterministic router (Python `match` on intent), not an LLM agent
- [ ] 2 LLM calls per turn: parse intent (edge 1) + synthesize response (edge 2)

## Phase 2: Agent and tool rename

5 specialists:

- [ ] `search_agent` → `search`
- [ ] `product_recommendation_agent` → `recommend`
- [ ] `price_optimization_agent` → `pricing`
- [ ] `inventory_restock_agent` → `inventory`
- [ ] `customer_support_agent` → `support`

9 tools:

- [ ] `search_products` (keep)
- [ ] `get_trending_products` → `get_trending`
- [ ] `get_price_analysis` → `get_pricing`
- [ ] `get_product_by_category` → `browse_category`
- [ ] `get_inventory_health` → `check_inventory`
- [ ] `get_low_stock_products` → `check_low_stock`
- [ ] `restock_product` → `restock`
- [ ] `compare_products` → `compare`
- [ ] `get_return_policy` (keep)

Files to update:

- [ ] `services/agent_tools.py`
- [ ] `services/hybrid_search.py` → `services/search.py`
- [ ] `agents/*.py` (all 5 + orchestrator)
- [ ] `services/chat.py`
- [ ] `routes/workshop.py`
- [ ] `services/workshop_panels.py`
- [ ] `services/agentcore_gateway.py` (GATEWAY_TOOL_NAMES)
- [ ] `scripts/seed_tool_registry.py`
- [ ] `frontend/src/utils/agentIdentity.ts`
- [ ] All tests referencing old names
- [ ] Re-seed tools table in Aurora

## Phase 3: Agentic UX shopping tool

- [ ] New tool: `add_to_cart` — agent can add a product to the user's cart during conversation
- [ ] New tool: `checkout` — agent can initiate checkout flow
- [ ] Cart state syncs between agent tool calls and the frontend CartContext
- [ ] SSE events for cart mutations so the bag badge updates live during the conversation
- [ ] Approval gate on checkout (AgentCore Policy / Cedar rule)

## Phase 4: Telemetry threading through orchestrator

- [ ] Thread `AgentContext` through the orchestrator call so panels emit during execution
- [ ] Intent classification panel: `LLM · HAIKU · INTENT`
- [ ] Specialist routing panel: `ORCHESTRATOR · ROUTE`
- [ ] Per-tool-call panels inside specialists
- [ ] Confidence scoring panel: `MEMORY · CONFIDENCE` (deterministic from panel row coverage)
- [ ] Guardrail panels when guardrails are enabled
- [ ] Fills the SSE silence gap — panels stream while the orchestrator thinks

## Phase 5: Synthesis prompt citations

- [ ] Update the synthesis system prompt to emit `[trace N]` markers inline
- [ ] Frontend already handles inline citation rendering (AssistantText splits on markers)
- [ ] Each claim in the response references the panel that sourced it

## Deferred / nice-to-have

- [ ] SSE reconnect logic (currently page reload = fresh session)
- [ ] Per-panel p50 from live `agent_trace_spans` aggregate (Performance tab currently uses hardcoded baselines)
- [ ] Cold-start bench data from `docs/perf-baselines/*.json` (Performance tab currently uses hardcoded values)
- [ ] Row-by-row reveal animation within telemetry panels (~80ms per row)
- [ ] Coffee Roastery animated transition from empty-state preview rows to live panels
