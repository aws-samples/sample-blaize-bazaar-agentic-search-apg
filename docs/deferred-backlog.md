# Deferred Backlog — Boutique Catalog Schema Realignment

These items were deliberately left untouched during the Apr 2026 schema
realignment (commits `d6412c3`, `a320547`, `d8d5ea9`, `59d0f39`). Each one
still references the legacy catalog shape (`product_description`,
`category_name`, `stars`, `productURL`, `quantity`, `category_id`,
`isBestSeller`, `boughtInLastMonth`) and will need follow-up work before
the feature it belongs to is exercised end-to-end.

## 1. `services/index_performance.py` — HNSW tuning demo

**Symptom:** Every SQL block selects `product_description`, `stars`,
`category_name`, `category_id` and filters on `category_name = %s`
(lines 142, 240, 526–533, 567, 571, 661, 686, 716). None of those
columns exist on `blaize_bazaar.product_catalog` anymore.

**Why deferred:** The file is only reachable via the `/api/performance/*`
endpoints, which back the HNSW tuning demo in the workshop. The core
storefront and chat flows do not import it on the hot path, and the demo
is opt-in from the admin panel. Realigning it is a standalone chunk of
work that deserves its own commit + test coverage.

**When to pick up:** Before the HNSW tuning demo is used in a workshop
session. At that point, mirror the SQL shape in
[hybrid_search.py](../blaize-bazaar/backend/services/hybrid_search.py)
(columns: `name, brand, color, description, category, rating, reviews,
badge, tags, "imgUrl"`; filter: `"imgUrl" IS NOT NULL`).

## 2. `models/product.py` — legacy `Product` Pydantic class

**Symptom:** [`Product`](../blaize-bazaar/backend/models/product.py)
declares `product_description`, `stars`, `producturl`, `category_name`
fields that no longer exist in the catalog. `ProductFilters.min_stars`
and `InventoryStats.low_stock_count` / `.out_of_stock_count` are also
frozen around the old schema.

**Why deferred:** Nothing in `app.py` imports `Product` anymore — the
two shadowed handlers that used it were deleted in commit `59d0f39`, and
`ProductWithScore` is still used by the image-search handler only for
its `similarity_score` field (the product fields are never populated).
The storefront wire shape lives in
[`models/search.py`](../blaize-bazaar/backend/models/search.py)
(`StorefrontProduct`) and is already aligned.

**When to pick up:** When `ProductWithScore` next needs to carry real
product data, or when someone re-audits `models/`. Rewrite `Product` to
match `StorefrontProduct` (camelCase via `alias_generator=to_camel`,
fields: `id, name, brand, color, price, rating, reviews, category,
image_url, badge, tags, tier`), and either drop `Product` outright or
make `ProductWithScore` subclass the new shape.

## 3. `AuthModal` DUSK color-token drift (solutions parity)

**Symptom:** `tests/test_solutions_parity.py::test_task_9_4_auth_modal`
fails because the `# === LAB 9.4: START / END ===` block in
`blaize-bazaar/frontend/src/components/AuthModal.tsx` diverges from
`solutions/module3/frontend/components/AuthModal.tsx` — the live file
uses an updated DUSK token name that never landed in the solution copy.

**Why deferred:** The divergence pre-dates the schema realignment and is
unrelated to the catalog migration. It was deselected with `--deselect`
during the realignment test run so the suite stayed green on the 231
tests that *are* relevant.

**When to pick up:** Next time `solutions/module3/` is refreshed, or
before the Module 3 workshop session runs. The fix is to copy the
current `AuthModal.tsx` LAB 9.4 block into the solutions drop-in
verbatim (the parity test is a byte-level match).

## 4. Legacy normalizer fallbacks

**Symptom:** Several normalizer layers still try the legacy keys as
fallbacks — e.g. `p.get("name") or p.get("product_description", "")`,
`p.get("category") or p.get("category_name", "")`,
`p.get("rating") or p.get("stars", 0)` in
[`services/chat.py`](../blaize-bazaar/backend/services/chat.py) and
[`routes/search.py`](../blaize-bazaar/backend/routes/search.py).

**Why deferred:** These fallbacks are defensive and harmless today. They
exist to cover (a) older test fixtures in `tests/` that haven't been
regenerated and (b) any agent output cached in AgentCore Memory from
before the migration. Ripping them out would be a breaking change for a
small latent surface area.

**When to pick up:** After a workshop cycle has rotated through the new
schema end-to-end and cached agent output has aged out. At that point,
search-and-destroy on the legacy fallbacks and delete the corresponding
backfill branches in `_normalize()`.

## Synthesis system prompt — emit inline citation markers

- **Issue:** The frontend ships the full citation infrastructure —
  `AgentContext.emit_panel` stamps `trace_index` on every panel, the
  Turn primitive carries `citations` through to `AssistantText`, and
  `useScrollAndFlash` resolves a citation ref to the right-rail
  panel with an 800ms terracotta pulse. But the LLM synthesis prompt
  in `services/chat.py` (and the Runtime-side equivalent in
  `backend/agentcore_runtime.py`) does not yet instruct the model to
  emit inline citation markers. Citation pills render only when the
  `response` event carries `citations`, which today happens on no
  query.
- **Concrete spec:**
  - Update the synthesis prompt so the model emits each grounded
    claim with an inline citation, e.g.
    `<cite trace="7">Italian Linen Camp Shirt</cite>` where ``7``
    is the panel's `trace_index` (1-based emission order).
  - The response emitter parses these markers into the existing
    `WorkshopCitation` shape: `{ k: "<source key>", ref: "trace 7" }`.
  - On the frontend, `AssistantText` already renders `ref` as the
    pill label and fires `onCitationClick(ref)` → `scrollToTrace`
    resolves ``"trace 7"`` to the 7th `panel-card-*` in the
    telemetry tab.
- **Surface:** `services/chat.py` synthesizer system prompt, plus
  the Runtime-side synthesizer if the prompts diverge.
- **Risk:** Low. The frontend is additive — pills show up when the
  LLM starts emitting them; nothing breaks if it doesn't.
- **Test:** End-to-end manual — ask "what should I buy?", confirm
  citation pills render on claims, click them, verify the panel
  flashes in the trace.
- **Discovered:** during Atelier redesign commit 4, 2026-04-26.

## AuthModal solutions/module3 parity drift

- **Issue:** `solutions/module3/frontend/components/AuthModal.tsx` missing `const DUSK = '#3d2518'` that exists in `blaize-bazaar/frontend/src/components/AuthModal.tsx`
- **Surface:** `test_solutions_parity[9.4-AuthModal]` fails on baseline
- **Risk:** Low — pre-existing, attendees replacing solutions files won't encounter the drift unless they inspect
- **Fix:** Copy `DUSK` constant from live file to solutions file (or determine intended value for the module3 variant and sync)
- **Discovered:** during Bug 1-4 pre-telemetry fixes
