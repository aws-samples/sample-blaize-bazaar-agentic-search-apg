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

## Schema realignment follow-ups (Apr 2026)

These items were left untouched during the boutique catalog schema
realignment and still reference the legacy shape (`product_description`,
`category_name`, `stars`, `productURL`, `quantity`, `category_id`,
`isBestSeller`, `boughtInLastMonth`).

- [ ] `services/index_performance.py` — HNSW tuning demo, every SQL
      block selects legacy columns. Mirror the shape in
      [`hybrid_search.py`](../blaize-bazaar/backend/services/hybrid_search.py)
      (`name, brand, color, description, category, rating, reviews,
    badge, tags, "imgUrl"`; filter `"imgUrl" IS NOT NULL`). Reachable
      only via `/api/performance/*`; pick up before the HNSW demo is
      used in a session.
- [ ] `models/product.py` — legacy `Product` Pydantic class declares
      `product_description`, `stars`, `producturl`, `category_name`.
      Nothing imports `Product` anymore (shadowed handlers deleted in
      `59d0f39`); `ProductWithScore` survives but only populates
      `similarity_score`. Rewrite to match `StorefrontProduct` shape
      when `ProductWithScore` next needs real product data.
- [ ] Legacy normalizer fallbacks — `services/chat.py` and
      `routes/search.py` still do `p.get("name") or
    p.get("product_description", "")` style guards for old fixtures
      and cached agent output. Defensive and harmless today; rip out
      after a workshop cycle rotates fully through the new schema.

## Synthesis prompt — inline citation markers

- [ ] Update `services/chat.py` synthesizer system prompt (and the
      Runtime-side synthesizer if they diverge in
      `services/agentcore_runtime.py`) so the model emits each grounded
      claim with `<cite trace="N">...</cite>` where `N` is the panel's
      `trace_index`.
- [ ] Response emitter parses these markers into the existing
      `WorkshopCitation` shape `{ k: "<source key>", ref: "trace N" }`.
- Frontend is already wired — `AssistantText` renders `ref` as the
  pill label and fires `onCitationClick(ref)` → `scrollToTrace`
  resolves `"trace N"` to the Nth `panel-card-*` in the telemetry
  tab. Additive — pills show up when the LLM starts emitting, nothing
  breaks if it doesn't.
- Discovered during Atelier redesign commit 4, 2026-04-26.

## AuthModal solutions/module3 parity drift

- [ ] `solutions/module3/frontend/components/AuthModal.tsx` is missing
      `const DUSK = '#3d2518'` that exists in the live
      `blaize-bazaar/frontend/src/components/AuthModal.tsx`.
- Surface: `test_solutions_parity[9.4-AuthModal]` fails on baseline.
- Low risk — attendees only encounter the drift if they inspect both
  files. Fix by copying the DUSK constant (or determining the
  module3-intended value) and syncing.
- Discovered during Bug 1-4 pre-telemetry fixes.

## Skills · catalog-grounded demo queries (Apr 2026)

Ten canonical test queries that exercise the skill router against the
live 92-product catalog. Used by `skills/router_test.py` and pulled
from the catalog inspector run on 2026-04-26. Keep in sync with
`skills/router_test.py::TEST_CASES` when either the catalog or the
skill descriptions change.

- [ ] Turn these into a lab exercise — participants see the query,
      predict which skills load, then run the router and compare
- [ ] Add an 11th "mixed" case when a third skill ships (e.g.
      fit-sizing against a "wide-leg trousers, I'm between sizes" query)
- [ ] Record router latency per case across 10 runs for the
      `SKILLS_NOTES.md` performance section

**Style-advisor (single-skill):**

- `a linen piece for slow Sundays` → Linen Camp Shirt ($118 Sage)
- `something to wear for warm evenings out` → Sundress in Washed Linen ($148), Silk Slip Midi ($228)
- `what goes with the Cashmere-Blend Cardigan?` → Cashmere-Blend Cardigan ($158 Forest)

**Style-advisor + Gift-concierge (two-skill):**

- `gift for my mom's 60th, around $200` → Silk Slip Midi ($228), Knit Column Dress ($198), Bucket Bag ($168)
- `something my partner would love for our anniversary` → Silk Scarf ($148), Brass Cuff ($88), evening dresses
- `housewarming gift under $80` → Soy Candle ($58), Linen Napkin Set ($68), Ceramic Vase ($78)

**Negatives (no skills load):**

- `is the Italian Linen Camp Shirt in stock?` → inventory query
- `how do I return an order?` → policy query
- `what's the Linen Duvet Cover made of?` → spec-sheet factual query (tests the negative bullet)
- `what's the cheapest bag you have?` → pricing / filter query
