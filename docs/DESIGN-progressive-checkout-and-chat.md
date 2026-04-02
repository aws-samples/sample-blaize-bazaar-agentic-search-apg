# Blaize Bazaar — Progressive Experience Specification

## Product Vision

Blaize Bazaar is a teaching application that doubles as a credible e-commerce platform. Every architectural decision should be one a real engineering team would make. The workshop teaches by having participants build production patterns — not toy demos — on Aurora PostgreSQL with pgvector, Amazon Bedrock, Strands SDK, and AgentCore.

The progressive experience is the narrative backbone: a single metric (steps to checkout) drops from 11 to 1 across five workshop modules, making each technical improvement viscerally tangible. The chat interface is the "grand reveal" at Module 3 and becomes progressively more capable through Modules 4 and 5.

---

## Architecture Principles

1. **Cart state via React Context** — Introduce `CartContext` to replace prop threading and `window.addToCart` globals. All cart operations (add, remove, add-all, metrics tracking) flow through context. This unblocks chat-based cart integration cleanly.

2. **UI actions via UIContext, not CartContext** — Introduce a lightweight `UIContext` for non-cart UI coordination: `openChat()`, mode transitions, announcement banner state. `CartContext` stays focused on cart operations. Replace the current `document.querySelector('[data-tour="chat-bubble"]').click()` with `openChat()` via UIContext. This separation prevents CartContext from becoming a catch-all and keeps concerns clean if the dashboard features in Workstream 6 need their own context later.

3. **Cart addition origin tracking** — Every cart addition carries an `origin` field (`'manual' | 'search-quick-add' | 'chat' | 'bundle' | 'memory'`) rather than separate counters. This enables accurate attribution for step counter messaging.

4. **Mode-aware component rendering** — Components read the current workshop mode from existing app state and adapt behavior (show/hide Quick Add, enable/disable chat cart buttons, change hero CTA target). No new prop chains needed once CartContext exists.

5. **No new backend endpoints** — All progressive UX changes are frontend-only. Agent tools, database schema, and API surface remain unchanged.

---

## Workstream 1: Cart Context and Metrics

### 1.1 CartContext Provider

Create `CartContext.tsx` with the following interface:

```typescript
interface CartItem {
  product: Product;
  quantity: number;
  origin: "manual" | "search-quick-add" | "chat" | "bundle" | "memory";
  addedAt: number;
}

interface CartAdditionEvent {
  origin: CartItem["origin"];
  timestamp: number;
}

interface CheckoutMetrics {
  searchCount: number;
  productViews: number;
  additions: CartAdditionEvent[]; // lightweight — only origin + timestamp, not full product data
  totalSteps: number; // computed: searchCount + productViews + unique add actions
}

interface CartContextValue {
  items: CartItem[];
  metrics: CheckoutMetrics;
  addToCart: (product: Product, origin: CartItem["origin"]) => void;
  addAllToCart: (products: Product[], origin: CartItem["origin"]) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  incrementSearch: () => void;
  incrementProductView: () => void;
}
```

**Duplicate handling:** `addToCart` checks for an existing item by `productId`. If found, it increments `quantity` and updates `origin` to the latest source (a product manually added then re-added from chat becomes `'chat'`). `addAllToCart` applies the same merge logic per item but logs a single `CartAdditionEvent` for the bundle (not N events), keeping the step counter accurate.

**UIContext** (separate provider, wraps alongside CartProvider):

```typescript
interface UIContextValue {
  openChat: () => void; // ref-based, replaces DOM query
  currentMode: WorkshopMode;
  announcementDismissed: Record<WorkshopMode, boolean>;
  dismissAnnouncement: (mode: WorkshopMode) => void;
}
```

Wrap `App.tsx` children in `<CartProvider>` and `<UIProvider>`. Metrics reset when workshop mode changes.

### 1.2 Step Counter Display

Add to `CartModal.tsx` footer. Message and color vary by mode:

| Mode            | Message template                                          | Color accent   |
| --------------- | --------------------------------------------------------- | -------------- |
| Keyword Search  | "Cart built in {n} steps"                                 | Neutral gray   |
| Semantic Search | "Cart built in {n} steps — semantic search helped"        | Blue           |
| Agent + Tools   | "Cart built in {n} steps — your agent handled discovery"  | Purple         |
| Multi-Agent     | "Cart built in {n} steps — specialists collaborated"      | Purple/magenta |
| AgentCore       | "Cart built in {n} steps — your preferences did the work" | Teal/green     |

Include a ghost comparison when previous mode data exists: "3 steps (was 11 in Keyword Search)" — the contrast within the same session is the teaching moment.

### 1.3 Step Counting Logic

```
totalSteps = searchCount + productViews + uniqueAddActions
```

Where:

- `searchCount` increments on each search submission
- `productViews` increments on each product detail modal open
- `uniqueAddActions` counts distinct add events (a bundle "Add All" is 1 action, not N)

Attribution matters for messaging: if `additions.filter(a => a.origin === 'bundle').length > 0`, the message can say "agents handled the rest."

**Scripted comparison prompt:** The step counter narrative only works if participants follow a comparable shopping flow across modes. Each module's "Verify Your Work" section includes a prominent callout:

```markdown
:::alert{type="info" header="Step counter challenge"}
Build a 3-item cart using only this module's capabilities. Note the step count shown in the cart footer — it should be {N} or lower.
:::
```

This ensures the progression (11 → 6 → 3 → 2 → 1) reads correctly across modules rather than depending on organic participant behavior.

### Files to modify

- Create: `contexts/CartContext.tsx`
- Create: `contexts/UIContext.tsx`
- Modify: `App.tsx` (wrap in CartProvider + UIProvider, remove local cart state)
- Modify: `CartModal.tsx` (consume CartContext, add step counter footer)
- Modify: `CheckoutModal.tsx` (consume CartContext)
- Modify: `ProductCard.tsx` (consume CartContext for Quick Add)
- Modify: `AIAssistant.tsx` (consume CartContext for chat Add to Cart, UIContext for openChat)

---

## Workstream 2: Chat Grand Reveal

The chat is hidden in Keyword Search and Semantic Search modes — the floating bubble either does not appear or shows a "Coming soon" state. When the participant completes Agent + Tools and restarts the backend, the chat appears for the first time as a deliberate reveal.

### 2.1 Chat Visibility by Mode

| Mode            | Chat bubble                     | Chat functional        | Announcement banner                                                       |
| --------------- | ------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| Keyword Search  | Hidden                          | No                     | —                                                                         |
| Semantic Search | Hidden                          | No                     | —                                                                         |
| Agent + Tools   | Appears with entrance animation | Yes (single agent)     | "AI Assistant is now active"                                              |
| Multi-Agent     | Visible                         | Yes (3 specialists)    | "Three specialist agents are ready"                                       |
| AgentCore       | Visible                         | Yes (production stack) | "Production stack deployed — memory-aware agents with policy enforcement" |

### 2.2 Entrance Animation (Agent + Tools)

When the mode transitions to Agent + Tools, the chat bubble enters from the bottom-right with a spring animation (CSS or framer-motion). First appearance only — subsequent page loads show the bubble statically.

Sequence:

1. Bubble slides up from below viewport (300ms, ease-out)
2. Gentle pulse animation plays twice
3. Announcement banner slides down from top simultaneously
4. Banner persists until dismissed (no auto-dismiss — participants may be looking at terminal)

### 2.3 Announcement Banner

Renders as a fixed-position banner at the top of the viewport. Content varies by mode:

**Agent + Tools:**

```
AI Assistant is now active
Your agent can search products, check inventory, and analyze pricing — all through conversation.
[Open Chat]                                                              [Dismiss]
```

**Multi-Agent:**

```
Three specialist agents are ready
Product recommendations, pricing analysis, and inventory monitoring — working together.
[Open Chat]                                                              [Dismiss]
```

**AgentCore:**

```
Production stack deployed
Memory-aware agents with Cedar policy enforcement and full observability.
[Open Chat]                                                              [Dismiss]
```

Dismissal state tracked in React state keyed to mode (not localStorage — unreliable in Workshop Studio environments).

### 2.4 Mode-Aware Bubble Labels

Replace static "Ask me anything" pill:

| Mode          | Label               | Accent color    | Behavior                  |
| ------------- | ------------------- | --------------- | ------------------------- |
| Agent + Tools | "Agent Ready"       | Blue (#0A84FF)  | Pulse on first appearance |
| Multi-Agent   | "Multi-Agent Ready" | Amber (#FF9F0A) | Pulse on mode transition  |
| AgentCore     | "AgentCore Active"  | Green (#30D158) | Pulse on mode transition  |

Notification dot appears on first mode transition, clears on chat open.

### 2.5 Hero CTA Wiring

Hero section CTA button text already changes per mode. Wire behavior:

| Mode            | CTA text             | Click action               |
| --------------- | -------------------- | -------------------------- |
| Keyword Search  | "Search Products"    | Scroll to search results   |
| Semantic Search | "Search Products"    | Scroll to search results   |
| Agent + Tools   | "Talk to the Agent"  | `openChat()` via UIContext |
| Multi-Agent     | "Talk to the Team"   | `openChat()` via UIContext |
| AgentCore       | "Try the Full Stack" | `openChat()` via UIContext |

Add a single pulse animation on the CTA button when mode transitions to an agent mode.

### Files to modify

- Modify: `AIAssistant.tsx` (visibility gating, entrance animation, bubble labels, consume UIContext for openChat)
- Modify: `App.tsx` (hero CTA wiring via UIContext)
- Create: `components/AnnouncementBanner.tsx` (consumes UIContext for mode and dismissal state)

---

## Workstream 3: Progressive Search and Cart UX

### 3.1 Quick Add on Search Result Cards

From Semantic Search mode onwards, product cards in search results show an "Add to Cart" button directly — no need to open the product detail modal.

- `ProductCard.tsx` renders an "Add to Cart" icon button (cart icon, not full text button — keeps card clean)
- Click calls `addToCart(product, 'search-quick-add')` via CartContext
- Brief success animation (checkmark replaces cart icon for 1s)
- Not available in Keyword Search mode (participants must feel the friction first)

### 3.2 Add to Cart from Chat Product Cards

When `AIAssistant.tsx` renders product cards in chat responses, each card includes an "Add to Cart" button.

- Uses `addToCart(product, 'chat')` via CartContext
- Same success animation as Quick Add
- Available from Agent + Tools mode onwards

**Error handling for incomplete product data:** Chat product cards may arrive from the backend with missing fields (no image, no price, null category). The `ProductCardCompact` component must handle these gracefully:

- Missing `imgUrl`: render a placeholder image with the category name
- Missing `price`: show "Price unavailable" and disable the Add to Cart button
- Missing `productId`: do not render the Add to Cart button (cannot add to cart without an ID)
- Log incomplete products to the console for debugging, but never crash the chat panel

### 3.3 Bundle Response with "Add All to Cart"

When the orchestrator (Multi-Agent mode) returns a curated set of products (e.g., "build me a gift basket for a runner"), the chat renders a bundle card:

- List of individual product cards (name, price, rating, image) — read-only, no checkboxes
- Bundle total price displayed prominently at the bottom: "Bundle total: $187.50"
- "Add All to Cart" button: calls `addAllToCart(products, 'bundle')`
- Individual "Add" button per item as fallback for selective adding
- No checkboxes — the interaction should be fast for a timed workshop. Post-workshop enhancement: add checkboxes for selective bundle building

### 3.4 Memory-Aware Personalized Cart (AgentCore)

When AgentCore Memory is active and the user says "get me my usual running gear":

- Chat shows a preferences summary before results: "Based on your history: Nike brand, running category, budget under $100"
- Returns a personalized bundle using `addAllToCart(products, 'memory')`
- Step counter shows 1

Pre-seed a demo session with conversation history for reliability:

- 3 prior conversation turns establishing: runner, Nike preference, budget-conscious
- Facilitator can demonstrate this reliably without depending on organic conversation state

**Pre-seeding implementation:** Create a `scripts/seed-demo-session.py` script that runs during the AgentCore module setup:

1. Authenticate with Cognito to get a demo user JWT
2. Call the AgentCore Memory API to create a session with `actor_id: "demo-user"`
3. Insert 3 conversation turns via the Memory API: "I'm looking for running gear" → agent response → "I prefer Nike, budget under $100" → agent response → "What are the best running shoes?" → agent response
4. Export the `session_id` as an environment variable for the test script
5. Document in the module page: "A demo session has been pre-seeded. Run the following to see memory-aware recommendations..."

Fallback if AgentCore Memory API is unavailable: the facilitator manually runs 3 queries in the chat to build organic session history before demonstrating "get me my usual."

### Files to modify

- Modify: `ProductCard.tsx` (Quick Add button, mode-gated)
- Modify: `AIAssistant.tsx` (chat Add to Cart, bundle rendering, error handling for incomplete products)
- Create: `components/BundleCard.tsx` (item list, total price, Add All)
- Create: `scripts/seed-demo-session.py` (AgentCore Memory pre-seeding)

---

## Workstream 4: Dynamic Frontend State

### 4.1 Tab Bar Rename

| Current         | New             |
| --------------- | --------------- |
| Legacy App      | Keyword Search  |
| Semantic Search | Semantic Search |
| Agent Tools     | Agent + Tools   |
| Multi-Agent     | Multi-Agent     |
| Production      | AgentCore       |

### 4.2 Status Badge (Hero Section)

Drop "DAT406" prefix. Dynamic per mode:

| Mode            | Badge text                |
| --------------- | ------------------------- |
| Keyword Search  | KEYWORD SEARCH            |
| Semantic Search | SEMANTIC SEARCH ENABLED   |
| Agent + Tools   | AGENT ACTIVE              |
| Multi-Agent     | MULTI-AGENT ORCHESTRATION |
| AgentCore       | AGENTCORE PRODUCTION      |

### 4.3 Dynamic Hero Subtitle

| Mode            | Subtitle                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Keyword Search  | Classic keyword matching — try searching for "something to keep my drinks cold" to see the gap.  |
| Semantic Search | Semantic search powered by Aurora PostgreSQL and pgvector — search by intent, not just keywords. |
| Agent + Tools   | AI-powered product discovery — open the chat and ask for what you need.                          |
| Multi-Agent     | Specialist agents collaborate to find, price, and curate products for you.                       |
| AgentCore       | Production-grade agentic search with memory, policies, and observability.                        |

### 4.4 Dynamic Search Placeholder

| Mode            | Placeholder text                                        |
| --------------- | ------------------------------------------------------- |
| Keyword Search  | Try: "stainless steel tumbler"                          |
| Semantic Search | Try: "something to keep my skin glowing"                |
| Agent + Tools   | Try: "gift for someone who loves photography"           |
| Multi-Agent     | Search or open chat for curated recommendations         |
| AgentCore       | Search or ask the agent — it remembers your preferences |

### 4.5 UI Simplification

- **"Explore Collections" CTA**: Downgrade from button to text link. Search bar and chat are the heroes.
- **Playground badge**: Hidden until Agent + Tools mode. Before that, it adds cognitive load without value.
- **Dark mode toggle**: Default to dark theme (better with the hero image). Hide the toggle behind a keyboard shortcut (`Cmd+Shift+D` / `Ctrl+Shift+D`) — accessible for participants who need light mode in bright conference rooms, but not visible in the UI where it causes accidental toggles during timed sessions.

### Files to modify

- Modify: `App.tsx` (tab names, status badge, subtitle, placeholder, CTA hierarchy)
- Modify: `Header.tsx` (playground badge visibility, remove dark mode toggle)

---

## Workstream 5: Index Exercise

### 5.1 Bootstrap Without Search Indexes

Modify the database seed script to create the `product_catalog` table without search-related indexes:

- Keep: Primary key, foreign key constraints (app depends on these)
- Remove: B-tree on `category_name`, GIN on `to_tsvector(...)`, HNSW on `embedding`

The application still functions — queries use sequential scans, which are slower but correct.

### 5.1a Inflate Catalog to 50K Rows

At ~1,000 rows, the latency difference between sequential scan and index scan is underwhelming (12ms vs 2ms). Participants may not feel the pain.

**Implementation:** The bootstrap script duplicates products with slight variations (appended suffixes on `productId`, minor price jitter, rotated category assignments) to reach ~50,000 rows. The original ~1,000 products retain their real embeddings; duplicates reuse embeddings from the same category. This makes the index exercise visceral:

- Sequential scan on 50K rows: ~200–500ms
- Index scan on 50K rows: ~2–5ms
- The difference is immediately noticeable in the storefront

The row count should be configurable via a `CATALOG_SIZE` environment variable (default: `50000`, set to `1000` for local development or CI).

### 5.2 Row Scan Counter in SQL Inspector

**Dependency note:** This feature requires the SQL Inspector panel (`SQLInspector.tsx`) to already exist and be rendering query metadata. The SQL Inspector is pre-built in the Blaize Bazaar frontend — this workstream adds a new metric row, not a new component.

Add a visible metric to the SQL Inspector panel that shows rows scanned vs. rows returned:

```
Query: SELECT ... WHERE category_name = 'Electronics'
Plan:  Seq Scan on product_catalog
Rows scanned: 1,000 | Rows returned: 47 | Time: 12ms
```

After index creation:

```
Query: SELECT ... WHERE category_name = 'Electronics'
Plan:  Index Scan using idx_product_category
Rows scanned: 47 | Rows returned: 47 | Time: 2ms
```

At ~1,000 rows, raw latency difference is small. The rows-scanned metric is what makes the impact tangible at workshop scale.

### 5.3 Getting Started Module: Index Exercise

After launching the app and observing keyword search, participants create indexes:

```sql
CREATE INDEX idx_product_category
  ON blaize_bazaar.product_catalog (category_name);

CREATE INDEX idx_product_tsvector
  ON blaize_bazaar.product_catalog
  USING gin (to_tsvector('english', product_description));
```

Safety net for participants who skip or get it wrong:

```bash
cp solutions/module1/create_indexes.sql /tmp/ && psql -f /tmp/create_indexes.sql
```

### 5.4 Semantic Search Module: HNSW Index

Already exists in the workshop. After implementing `vector_search()`, participants create:

```sql
CREATE INDEX idx_product_embedding_hnsw
  ON blaize_bazaar.product_catalog
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
```

SQL Inspector shows `<=>` operator switching from sequential scan to HNSW index scan.

### Files to modify

- Modify: `scripts/load-database-fast.sh` or equivalent seed script (remove index creation, add catalog inflation)
- Create: `scripts/inflate-catalog.sql` (product duplication with jitter, configurable via CATALOG_SIZE)
- Modify: `SQLInspector.tsx` (add rows-scanned display)
- Modify: Getting Started content page (add index exercise)
- Create: `solutions/module1/create_indexes.sql`

---

## Workstream 6: Production-Grade Patterns

These features make Blaize Bazaar credible as a production system — not just a demo. Each one maps to a real cost, performance, or operational concern that participants will face in their own deployments.

**Priority tiers:** Items 6.1 and 6.2 are core — they ship with the workshop. Items 6.3–6.6 are stretch goals that add L400 depth. The core experience (Workstreams 1–5) is not blocked by any stretch item. Build 6.1–6.2 first, then layer on 6.3–6.6 as time permits.

### 6.1 Embedding Cache (core)

**Problem:** Every search query calls Bedrock to generate a 1024-dim embedding. Identical or similar queries hit the API repeatedly.

**Implementation:**

- Server-side LRU cache on `EmbeddingService.embed_query()` keyed by normalized query text
- Cache size: 500 entries (covers a workshop session comfortably)
- Cache hit/miss counter exposed to the SQL Inspector panel
- Display in UI: "Embedding: cached (0ms)" vs "Embedding: Bedrock API (180ms)"

**Teaching moment:** Caching is the lowest-effort, highest-impact optimization for any RAG system. Show participants the cost difference: $0.0001/cached query vs $0.01/API query.

### 6.2 Token Economics Dashboard (core)

**Problem:** Participants hear "tools reduce token usage by 96%" but never see the actual numbers.

**Implementation:**

- Track input/output tokens per agent call (already available from Strands SDK response metadata)
- Display in the Agent Reasoning Traces panel:
  - Tokens used: input / output
  - Estimated cost per query
  - Cumulative session cost
- Compare: "Without tools: ~60K tokens ($0.18)" vs "With tools: ~4K tokens ($0.01)"

**Teaching moment:** Token economics is the difference between a prototype and a production system. Make the cost visible.

### 6.3 Connection Pooling Visibility (stretch)

**Problem:** Each agent query opens a database connection. Without pooling, concurrent multi-agent queries exhaust connections.

**Implementation:**

- Expose pool statistics from psycopg's `AsyncConnectionPool`:
  - Pool size (min/max)
  - Active connections
  - Idle connections
  - Waiting requests
- Display in SQL Inspector when in Multi-Agent or AgentCore mode
- Show how parallel specialist agents each draw from the pool

**Teaching moment:** Connection pooling is critical for multi-agent architectures. Each specialist gets its own connection from the pool — sharing connections across agents causes deadlocks.

### 6.4 HNSW Index Tuning Panel (stretch)

**Problem:** Participants set `ef_search=40` but don't understand the tradeoff.

**Implementation:**

- Interactive panel in the Index Performance Dashboard:
  - Slider for `ef_search` (10 → 200)
  - Run the same query at each setting
  - Display: latency, recall estimate, rows visited
  - Chart: ef_search vs. latency curve

**Teaching moment:** There is no "best" ef_search — it depends on your latency budget and recall requirements. Production systems tune this per-query based on criticality.

### 6.5 Quantization Comparison (stretch / future module)

**Problem:** 1024-dim float32 vectors consume significant storage and memory. pgvector 0.8.0 supports halfvec and binary quantization.

**Implementation (demonstration, not exercise):**

- Pre-create a quantized index alongside the full-precision one
- Comparison panel showing:
  - Storage: float32 (4KB/vector) vs halfvec (2KB/vector) vs binary (128 bytes/vector)
  - Query latency at each precision
  - Recall at each precision
  - Cost projection at scale (1M, 10M, 100M vectors)

**Teaching moment:** Quantization is how you go from "works on 1K products" to "works on 100M products." The storage and latency savings are dramatic, and the recall loss is often negligible.

### 6.6 Iterative Scan Demonstration (stretch)

**Problem:** The "overfiltering problem" — when a highly selective WHERE clause eliminates most HNSW candidates, the index returns too few results or the wrong results.

**Implementation:**

- Demonstration query in the SQL Inspector:
  - Query: "wireless headphones" WHERE price < 15 AND category = 'Rare Electronics'
  - Without iterative scan: 0 results (HNSW candidates all filtered out)
  - With iterative scan (`SET hnsw.iterative_scan = relaxed_order`): correct results found by expanding the search
- Toggle in the Index Performance Dashboard to enable/disable iterative scan
- Show the difference in result count and relevance

**Teaching moment:** pgvector iterative scan is a key differentiator over standalone vector databases. It solves the overfiltering problem that every filtered vector search system faces at scale.

### Files to modify

- Modify: `embeddings.py` (add LRU cache, cache hit/miss counter)
- Modify: `SQLInspector.tsx` (rows scanned, pool stats, cache stats)
- Modify: `AgentReasoningTraces.tsx` (token count, cost display)
- Modify: `IndexPerformanceDashboard.tsx` (ef_search tuning, quantization comparison, iterative scan)
- Modify: `database.py` (expose pool statistics)

---

## Workstream 7: Content Quality

### 7.1 Before/After Section Per Module

At the bottom of each module page, after "Verify Your Work," add a summary:

```markdown
:::alert{type="success" header="What changed"}
**Before:** "Something to keep my drinks cold" returned 0 results. Step counter: 11.
**After:** Natural language queries return semantically relevant products. Step counter: 6.
**Why it matters:** pgvector unifies vector search and business data in a single database — no separate vector store, no data sync pipeline, no additional infrastructure.
:::
```

### 7.2 Step Counter Verification in Every Module

Each module's "Verify Your Work" section includes the scripted cart-building callout defined in 1.3:

```markdown
:::alert{type="info" header="Step counter challenge"}
Build a 3-item cart using only this module's capabilities. Note the step count shown in the cart footer — it should be {N} or lower.
:::
```

Expected targets per module:

| Module                           | Target step count | Notes                                                   |
| -------------------------------- | ----------------- | ------------------------------------------------------- |
| Getting Started (Keyword Search) | 11 or higher      | Must know exact product names, click into detail to add |
| Semantic Search                  | 6 or lower        | Natural language works, Quick Add available             |
| Agent + Tools                    | 3 or lower        | Chat finds products, Add to Cart in chat                |
| Multi-Agent                      | 2 or lower        | Bundle "Add All" from orchestrated response             |
| AgentCore                        | 1–2               | Memory recalls preferences, personalized bundle         |

### 7.3 Crystal-Clear Module Takeaways

Each module ends with a "Key Takeaway" section. These should be specific, actionable, and memorable:

| Module          | Takeaway                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Getting Started | Indexes are the first thing you check in any database performance investigation. Sequential scans on 1K rows are tolerable; on 10M rows, they are minutes.                                                                                      |
| Semantic Search | Aurora PostgreSQL with pgvector eliminates the need for a separate vector database. One engine handles vectors, transactions, joins, and business logic. The CTE pattern avoids transmitting the embedding twice.                               |
| Agent + Tools   | The @tool docstring is the interface contract that the model reads for tool selection. Structured JSON returns are about token economics — 15x cost reduction per query compounds to real money at scale.                                       |
| Multi-Agent     | "Agents as Tools" decouples domain expertise from orchestration logic. Adding a new specialist requires zero changes to the orchestrator. Clear domain boundaries prevent routing ambiguity.                                                    |
| AgentCore       | The architecture stays identical from local to production. AgentCore Gateway, Memory, and Runtime are infrastructure swaps, not architectural changes. Cedar policies enforce guardrails regardless of which agent or user initiates an action. |

---

## Summary: Build Order

| Phase | Workstream                    | Items                                                                                        | Rationale                                                 |
| ----- | ----------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1     | Cart Context                  | CartContext, UIContext, step counter, origin tracking, duplicate merge                       | Foundation — everything else depends on this              |
| 2     | Chat Grand Reveal             | Chat visibility gating, entrance animation, announcement banner, bubble labels               | Highest participant-facing impact                         |
| 3     | Search + Cart UX              | Quick Add, chat Add to Cart, hero CTA wiring, chat product error handling                    | The interactions that make the step counter drop          |
| 4     | Dynamic Frontend              | Tab rename, status badge, subtitle, placeholder, UI simplification                           | Visual identity and mode-aware polish                     |
| 5     | Bundle + Memory               | Bundle card (no checkboxes), Add All, memory pre-seed script, personalized cart              | Multi-Agent and AgentCore payoff                          |
| 6     | Index Exercise                | Catalog inflation to 50K, bootstrap index removal, row scan counter, Getting Started content | Standalone — depends only on SQL Inspector existing       |
| 7a    | Production Patterns (core)    | Embedding cache, token economics dashboard                                                   | Ship with workshop — high teaching value, moderate effort |
| 7b    | Production Patterns (stretch) | Connection pool visibility, HNSW tuning panel, quantization comparison, iterative scan demo  | Layer on after core is stable — each is independent       |
| 8     | Content Polish                | Before/After sections, step counter verification callout, module takeaways                   | Final pass — needs all features stable                    |

---

## What This Workshop Teaches That No Other Workshop Does

Most workshops demonstrate features. This one builds a system.

A participant who completes Blaize Bazaar can explain:

- Why vector search belongs in the database, not a separate service
- How to structure agent tools for token efficiency and reliable routing
- Why multi-agent orchestration uses the "Agents as Tools" pattern, not a message bus
- What changes (and what doesn't) between local development and production deployment
- How to measure and optimize: embedding cache hit rates, connection pool utilization, HNSW recall/latency tradeoffs, token economics per query

The step counter is the proof. It starts at 11 and ends at 1 — and the participant built every layer that made it drop.

---

## Revision Notes (v2)

Feedback incorporated from Claude Code and Kiro assessments:

| #   | Source      | Feedback                                                         | Resolution                                                                                                    |
| --- | ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Claude Code | `openChat` on CartContext is a semantic misfit                   | Moved to separate `UIContext` (Architecture Principle #2, Workstream 1.1)                                     |
| 2   | Claude Code | `CheckoutMetrics.cartAdditions: CartItem[]` duplicates cart data | Replaced with lightweight `CartAdditionEvent[]` storing only origin + timestamp (1.1)                         |
| 3   | Claude Code | No duplicate merge behavior specified for `addAllToCart`         | Added explicit merge logic: increment quantity on duplicate `productId`, single event logged per bundle (1.1) |
| 4   | Claude Code | `totalSteps` progression depends on comparable shopping flows    | Added scripted "build a 3-item cart" callout as a prominent alert in each module (1.3, 7.2)                   |
| 5   | Claude Code | Missing error states for chat product cards with incomplete data | Added error handling spec: placeholder image, disabled Add to Cart, console logging (3.2)                     |
| 6   | Kiro        | At 1K rows, index exercise latency difference is imperceptible   | Added catalog inflation to 50K rows via bootstrap script with configurable `CATALOG_SIZE` (5.1a)              |
| 7   | Kiro        | Dark mode removal too aggressive for bright conference rooms     | Changed to hidden keyboard shortcut (`Cmd+Shift+D`) instead of full removal (4.5)                             |
| 8   | Kiro        | Bundle checkboxes add complexity for timed workshop              | Simplified to item list + "Add All" button, no checkboxes. Checkbox variant deferred to post-workshop (3.3)   |
| 9   | Kiro        | Memory pre-seeding has no concrete implementation path           | Added `scripts/seed-demo-session.py` spec with Cognito auth, Memory API calls, and fallback strategy (3.4)    |
| 10  | Kiro        | Workstream 6 items 6.3–6.6 could block core experience           | Added explicit priority tiers: 6.1–6.2 core, 6.3–6.6 stretch. Build order split into Phase 7a/7b.             |
| 11  | Kiro        | SQL Inspector dependency not called out for row scan counter     | Added dependency note in 5.2 clarifying it extends existing component, not a new build                        |
| 12  | Both        | Bundle should show total price                                   | Added "Bundle total: $X" line to BundleCard spec (3.3)                                                        |
