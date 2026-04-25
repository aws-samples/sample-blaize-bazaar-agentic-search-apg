# Blaize Bazaar — Builders Content Prompt (1-hour format)

**For:** AWS re:Invent 2026 workshop **Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL**, **1-hour Builders Session format**.

**What this produces:**

- `lab-content/builders/` — 1 build challenge (C1) + 8 read-and-test challenges
- Workshop Studio metadata for the 1-hour format

**Run this AFTER:**

1. `.kiro/specs/blaize-bazaar-storefront/prompt.md` (Kiro generates app)
2. `.claude/prompts/infrastructure.md` (stands up infrastructure)
3. `.claude/prompts/workshop-content.md` (produces 2-hour guide + solutions directory)

The solutions directory is **shared** with the Workshop format. The Builders guide references those same solution files; participants read rather than reimplement.

**Prerequisites:** Same steering files as the Workshop prompt. In particular:

- `project.md` — 3-module structure with time budgets per format
- `workshop-content.md` — writing guidelines, tool/agent names
- `storefront.md` — design tokens, auth UX

---

## How to use

1. `cd` into repo root: `aws-samples/sample-blaize-bazaar-agentic-search-apg`
2. Run `claude` to start Claude Code
3. Paste the section below as opening message

---

# Claude Code Task: Blaize Bazaar Builders Content (1-hour format)

You are producing the **1-hour Builders Session content**. This is the compressed demo-heavy format where participants build only the foundation (C1) and read-and-test the rest.

**The codebase, infrastructure, and solutions directory have already been built.** Your job is the Builders-format lab guide + Workshop Studio metadata only.

## Critical context

- **Format:** 1-hour Builders Session
- **Time budget:** 5 min setup + 10 min instructor presentation + 15 min M1 + 20 min M2 + 15 min M3 + 5 min wrap-up = 70 min. Trim 5 min from slowest section to land at 60.
- **Audience:** same seniority as Workshop, less time
- **Philosophy:** Only **C1** is build. C2–C9 are read-and-test — open the solution, read it, run a test, observe, move on.
- **Level:** 400.

## Why this format matters

A 1-hour session can't cover 9 build challenges. Trying teaches nothing. Instead, C1 gives a real build win (participants write pgvector similarity search from scratch), and the remaining 8 challenges become a guided tour of the production patterns.

## Pre-flight: verify state

Before writing, confirm:

- `lab-content/workshop/` exists (from Workshop prompt)
- `solutions/` populated with module1/2/3 files
- `lab-content/workshop/contentspec.yaml` exists
- All challenge files have `# === CHALLENGE N: START/END ===` markers
- `/home/workshop/test-credentials.txt` exists
- **Preferences pre-seeded for users 1, 2, 3** via `seed-sample-preferences.sh` (from infrastructure prompt) — this is critical for the C9 demo

If anything missing, stop — Builders guide depends on Workshop artifacts.

---

## What to build

### 1. `lab-content/builders/` directory

```
lab-content/builders/
├── index.en.md                   # Landing page
├── 00-setup.en.md                # Setup + test credentials
├── 05-presentation.en.md         # Instructor presentation block (non-interactive)
├── 10-module1-smart-search.en.md # C1 BUILD
├── 20-module2-agentic-ai.en.md   # C2-C4 read-and-test
├── 30-module3-production.en.md   # C5-C9 read-and-test
├── 99-wrap-up.en.md
└── static/
```

### 2. Content — section by section

#### `00-setup.en.md` (5 min)

- Workshop Studio environment green check
- Open IDE URL from session details. VS Code + Amazon Q loaded.
- Confirm Blaize Bazaar loads at workshop domain.
- Open `/home/workshop/test-credentials.txt` — you've been assigned a test user.
- **Sign in with `workshop-user-1` to see a pre-personalized storefront.** (Users 1-3 have sample preferences already loaded. The rest start fresh.)
- You now have a working, production-grade agentic AI storefront. In the next hour you'll look under the hood.

#### `05-presentation.en.md` (10 min, non-interactive)

_Covered live by the instructor. Participants follow along, no code yet._

Outline (for instructor reference):

1. Why keyword search fails on "something for long summer walks" (2 min)
2. Hero stage demo — show intent rotation (2 min)
3. Architecture diagram: Cognito → FastAPI → AgentCore (Identity + Runtime + Memory + Gateway) → Aurora pgvector → Bedrock (Opus 4.6 + Haiku 4.5 + Cohere Embed v4 + Rerank v3.5) (4 min)
4. What you'll build vs read today (2 min)

#### `10-module1-smart-search.en.md` (15 min, 1 BUILD challenge)

##### Challenge 1: Vector Search (BUILD)

> **Concept:** Foundation of everything else. Shoppers search in sentences, not keywords. Wire pgvector cosine similarity to make that work.

- **File:** `blaize-bazaar/backend/services/hybrid_search.py`
- **Goal:** Implement `_vector_search(self, embedding, limit, ef_search, iterative_scan=True)`

**Steps:**

1. Locate `# === CHALLENGE 1: START ===`
2. Delete the solution between markers
3. Implement using hints
4. Save — `uvicorn --reload` picks up

**Hints** (per `database.md` steering):

- CTE pattern: `WITH query_embedding AS (SELECT %s::vector as emb)`
- pgvector cosine: `<=>` in `ORDER BY`
- Parameterized queries only (`%s`)
- HNSW tuning: `SET LOCAL hnsw.ef_search = %s`
- `iterative_scan=True` → `SET LOCAL hnsw.iterative_scan = 'relaxed_order'`
- Filter `quantity > 0`
- Score: `1 - (embedding <=> query_embedding)`

**Verification:**

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"something for long summer walks"}' | jq '.results[:3]'
```

Top 3: linen pieces. Scores 0.35–0.55.

**If stuck (or finished fast):** solution at `solutions/module1/hybrid_search.py`. Read it, understand the differences, move on.

#### `20-module2-agentic-ai.en.md` (20 min, 3 READ-AND-TEST)

##### Challenge 2: Tools for Agents (READ, 6 min)

> **Concept:** `@tool` decorator from Strands turns a Python function into something Claude can invoke.

- **Open:** `blaize-bazaar/backend/services/agent_tools.py` and `solutions/module2/agent_tools.py` side by side
- **Focus on:** the `@tool` decorator, parameter type hints (Strands uses these to build the tool schema), the JSON-serialized string return pattern, the `_db_service` safety check, the `_run_async()` bridge

**Test:**

```bash
cd blaize-bazaar/backend && pytest tests/test_agent_tools.py -v
```

All tests pass for the 9 tools listed in `workshop-content.md` steering.

**Observe:** each tool is just a function. The decorator does the work of making it callable by an agent. This is how you'd wrap ANY of your company's APIs for agent use.

##### Challenge 3: A Specialist Agent (READ, 7 min)

> **Concept:** Agents are LLMs + tools + system prompts. The `product_recommendation_agent`'s voice is 90% system prompt.

- **Open:** `solutions/module2/recommendation_agent.py`
- **Focus on:** the system prompt (what makes reasoning sound like "picked because you mentioned warm evenings" instead of "based on query similarity"). The `BedrockModel(model_id=settings.BEDROCK_CHAT_MODEL)` wrapper. Temperature 0.2.

**Test:**

```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I need something for a dinner party on a warm Saturday night"}'
```

**Observe:** reasoning mentions warmth/evening context. Read `response.trace` — the agent called `search_products` with the embedded query.

##### Challenge 4: Multi-Agent Orchestration (READ, 7 min)

> **Concept:** One agent with every tool gets confused. Five specialists routed by intent stay sharp. Haiku 4.5 handles routing for latency.

- **Open:** `solutions/module2/orchestrator.py`
- **Focus on:** the routing logic. Claude Haiku 4.5 at temperature 0.0 for deterministic routing. Intent priority: pricing > inventory > support > search > recommendation. Strands "Agents as Tools" pattern.

**Test** (each intent activates a different specialist):

```bash
# Recommendation (default)
curl ... -d '{"message":"find me something for warm evenings"}'
# Inventory
curl ... -d '{"message":"is the cashmere cardigan in stock?"}'
# Pricing
curl ... -d '{"message":"is $158 a fair price for this cardigan?"}'
# Support
curl ... -d '{"message":"can I return this?"}'
```

**Observe:** each response's `specialist` field shows the chosen agent. Routing is deterministic for clear intents.

#### `30-module3-production.en.md` (15 min, 5 READ-AND-TEST, compressed)

##### Challenge 5: AgentCore Runtime (READ, 3 min)

> Local Strands doesn't scale. AgentCore Runtime is AWS's managed agent deployment.

- **Open:** `solutions/module3/agentcore_runtime.py`
- **Test:** `curl -X POST /api/agent/chat ...` — traffic now hits the managed runtime. Check CloudWatch `/aws/blaize-bazaar/agentcore-runtime/`.
- **Observe:** your orchestrator is now a managed service. Cold start ~1-2s, warm <500ms.

##### Challenge 6: AgentCore STM Memory (READ, 3 min)

> Multi-turn needs session memory. AgentCore STM is the managed pattern.

- **Open:** `solutions/module3/agentcore_memory.py`
- **Focus on:** key namespacing. `session:{session_id}:messages` vs `user:{user_id}:preferences`. user_id comes from AgentCore Identity (C9).
- **Test:** send two `/api/agent/chat` messages with same `session_id`. Second references the first.
- **Observe:** no custom session table. Pattern is "use the managed service."

##### Challenge 7: AgentCore MCP Gateway (READ, 3 min)

> MCP is the standard way agents discover tools across services.

- **Open:** `solutions/module3/agentcore_gateway.py`
- **Test:** `curl -X POST /api/agent/tools/list` — MCP-format tool list
- **Observe:** any agent framework that speaks MCP can use your tools. Portable.

##### Challenge 8: OpenTelemetry Observability (READ, 3 min)

> Know why an agent takes 4 seconds.

- **Open:** `solutions/module3/otel_trace_extractor.py`
- **Test:** open `/inspector?session={session_id}` after a chat. Waterfall of spans.
- **Observe:** structured traces emitted automatically. You wrote no instrumentation.

##### Challenge 9 (THE CAPSTONE): Cognito + AgentCore Identity (READ + LIVE DEMO, 3 min)

> **Concept:** You've been signed in as `workshop-user-1` the entire session. This is how.

- **Open:** `solutions/module3/cognito_auth.py` (C9.1) and `solutions/module3/agentcore_identity.py` (C9.2)
- **Focus on:** how Cognito user_id becomes the key that scopes AgentCore Memory. User A's preferences literally can't leak to User B because the key prefix is `user:{verified_user_id}:...`.

**Single demo test** (this is the payoff — do it LIVE, don't skip):

1. Currently signed in as `workshop-user-1`. Note the personalized grid (minimal/serene/linen products first).
2. Click Account → Sign Out.
3. Click "Continue with Google" → Cognito hosted UI (for workshop, use email/password with `workshop-user-2` credentials from your creds file).
4. Sign in. Preferences modal auto-opens (user-2 has different seeded preferences: bold/creative/warm).
5. Save. Grid re-sorts (bold products first — Sundress, Utility Jacket).
6. **Observe:** the entire personalization flow is scoped to your verified Cognito identity, all the way from hosted UI through JWT validation through AgentCore Memory. **This is production pattern. Take it home.**

#### `99-wrap-up.en.md` (5 min)

You built vector search yourself and saw the full agentic stack: tools, specialist agents, orchestration, managed runtime, session memory, tool gateway, observability, real identity.

- LTM (Long-Term Memory) was deferred — async extraction too slow for live sessions. See `docs/ltm-reference.md`.
- Every file in `solutions/` is production-quality. Clone the repo, strip workshop scaffolding, ship the patterns.
- The reference implementation works today. Take it back to your team tomorrow.

Closing question: _What does agentic AI actually mean for the products you ship?_

### 3. Workshop Studio metadata

`lab-content/builders/contentspec.yaml`:

```yaml
defaultLocaleCode: en-US
localeCodes:
  - en-US
version: 2.0
awsAccountConfig:
  accountSources: [WorkshopStudio]
  serviceLinkedRoles: [rds.amazonaws.com, bedrock.amazonaws.com]
  regionConfiguration:
    minAccessibleRegions: 1
    maxAccessibleRegions: 2
    accessibleRegions:
      recommended: [us-west-2]
      required: [us-west-2]
infrastructure:
  cloudformationTemplates:
    - templateLocation: static/blaize-bazaar-labs.yml
      label: Blaize Bazaar Labs (1-hour Builders Session)
      parameters:
        - templateParameter: WorkshopId
          defaultValue: "{{.ParticipantId}}"
        - templateParameter: NumberOfTestUsers
          defaultValue: "10"
        - templateParameter: AuroraEngineVersion
          defaultValue: "17.7"
participantRole:
  managedPolicies: []
  iamPolicies:
    - static/iam_policy.json
workshopTimeline:
  duration: 60
  checkpoints:
    - "00:00 — Setup & environment check"
    - "00:05 — Instructor presentation"
    - "00:15 — Module 1: Smart Search (build)"
    - "00:30 — Module 2: Agentic AI (read-and-test)"
    - "00:50 — Module 3: Production Patterns (read-and-test)"
    - "00:55 — Wrap-up & closing question"
prerequisites:
  knowledge:
    - "Python 3.13 fluency"
    - "Familiarity with PostgreSQL and vector databases"
    - "Basic understanding of LLMs and embeddings"
  technical:
    - "Bedrock model access: Claude Opus 4.6, Claude Haiku 4.5, Cohere Embed v4, Cohere Rerank v3.5"
    - "Cognito-supported AWS region"
```

Instructor notes:

- **Time is the enemy.** If M1 runs over, cut from C5-C8 (quick reads). Never cut C9 — it's the capstone demo.
- **Pre-loaded preferences for users 1-3 are critical.** If bootstrap failed to seed them, C9 demo is much weaker. Verify before session.
- **C1 is the only build challenge** — make sure participants know this upfront so they don't panic looking for other CHALLENGE markers.
- 10-minute presentation is non-negotiable. Format doesn't work without front-loaded context.
- Some participants will want more depth on C5-C9. Point them to `lab-content/workshop/` as homework — same code, deeper framing.
- Common pitfalls same as Workshop: JWT clock skew, redirect URI mismatches, JWKS cache.

---

## Key differences from Workshop format

Same codebase, same solutions. Different guide framing, different contentspec, different timing.

| Aspect                 | Workshop (2hr)    | Builders (1hr)                 |
| ---------------------- | ----------------- | ------------------------------ |
| Challenges             | 9 build           | 1 build (C1) + 8 read-and-test |
| Instructor block       | none              | 10 min upfront                 |
| Per-challenge length   | under 200 words   | under 120 words                |
| Take-It-Further        | yes (Rerank v3.5) | no                             |
| Dry-run verification   | every curl runs   | every read step has a test     |
| contentspec duration   | 120               | 60                             |
| Pre-seeded preferences | nice-to-have      | **essential** (drives C9 demo) |

Builders is not a degraded Workshop — it's a different product.

---

## Implementation order

1. Verify state — Workshop artifacts exist
2. Write `lab-content/builders/` markdown — derived from Workshop but reframed for read-and-test
3. Write `lab-content/builders/contentspec.yaml`
4. **Dry-run**: walk through with stopwatch. Does 60 min actually work?

---

## Validation checklist

- [ ] 1 build challenge (C1) + 8 read-and-test challenges
- [ ] C9 is a single capstone demo (not 4 sub-challenges — no time for subdivision)
- [ ] Every read-and-test has: concept (1 sentence), file to open, focus on, test command, observe
- [ ] Every challenge instruction under 120 words
- [ ] Instructor presentation block marked as non-interactive
- [ ] Tool names match `workshop-content.md` exactly
- [ ] Agent names match: `search_agent`, `product_recommendation_agent`, `price_optimization_agent`, `inventory_restock_agent`, `customer_support_agent`
- [ ] Model IDs: Opus 4.6 (specialists, temp 0.2), Haiku 4.5 (orchestrator, temp 0.0)
- [ ] Python 3.13
- [ ] `contentspec.yaml` validates
- [ ] Timeline checkpoints add up to 60 min
- [ ] Instructor notes emphasize preference pre-seeding
- [ ] Test credentials file referenced in Setup
- [ ] No Jupyter, no em dashes, no emojis
- [ ] Solution file paths resolve (shared with Workshop)

---

## Output

One-page summary:

- Lab guide word count per challenge
- contentspec-builders.yaml validation
- Dry-run timing — does 60 min actually work?
- Human review needed before re:Invent
- Delta from Workshop format (what's changed in framing)

Start by verifying state, propose a plan, then build.
