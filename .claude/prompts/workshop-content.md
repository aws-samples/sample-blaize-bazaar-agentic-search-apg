# Blaize Bazaar — Workshop Content Prompt (2-hour format)

**For:** AWS re:Invent 2026 workshop **Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL**, **2-hour Workshop format**.

**What this produces:**

- `lab-content/workshop/` — 9 build challenges, delete-and-reimplement style
- `solutions/` directory — full reference implementations (module1/2/3)
- Workshop Studio metadata for the 2-hour format

**Run this AFTER:**

1. `.kiro/specs/blaize-bazaar-storefront/prompt.md` (Kiro generates the app scaffolding)
2. `.claude/prompts/infrastructure.md` (stands up Cognito + CloudFormation + bootstrap)

**Prerequisites:** Repo-wide conventions live in `.kiro/steering/`. Read them first:

- `project.md` — 3-module structure, challenge numbering
- `tech.md` — Python 3.13, model IDs (Opus 4.6 + Haiku 4.5 + Cohere Embed v4 + Rerank v3.5)
- `coding-standards.md` — `@tool` patterns, error handling, temperature values, agent names
- `database.md` — pgvector query patterns, CTE embedding, HNSW tuning
- `workshop-content.md` — lab content writing guidelines, exact tool and agent names
- `storefront.md` — design tokens, intents, product tags, auth UX

Do not restate what's already in steering.

---

## How to use

1. `cd` into repo root: `aws-samples/sample-blaize-bazaar-agentic-search-apg`
2. Run `claude` to start Claude Code
3. Paste the section below as opening message

---

# Claude Code Task: Blaize Bazaar Workshop Content (2-hour format)

You are producing the **2-hour Workshop content** for Blaize Bazaar. This is the long-form hands-on format where participants delete reference code and reimplement it using hints.

The core app and infrastructure have already been scaffolded. Your job is format-specific content only: the lab guide in `lab-content/workshop/`, the solutions directory, and Workshop Studio metadata.

## Critical context

- **Format:** 2-hour Workshop, 9 build challenges
- **Audience:** senior engineers and solutions architects building the system themselves
- **Style:** "locate the `# === CHALLENGE N: START ===` block, delete the solution inside, reimplement using hints"
- **Level:** 400. No hand-holding. Architecture before code.

## Pre-flight: verify state

Before writing, confirm:

- `blaize-bazaar/backend/services/hybrid_search.py` has `_vector_search()` in a challenge block
- `blaize-bazaar/backend/services/agent_tools.py` has `get_trending_products()` in a challenge block (plus the other 8 tools listed in `workshop-content.md`: `search_products`, `get_price_analysis`, `get_product_by_category`, `get_inventory_health`, `get_low_stock_products`, `restock_product`, `compare_products`, `get_return_policy`)
- `blaize-bazaar/backend/agents/recommendation_agent.py` has `product_recommendation_agent` in a challenge block
- `blaize-bazaar/backend/agents/orchestrator.py` exists with challenge block (routes 5 specialists: `search_agent`, `product_recommendation_agent`, `price_optimization_agent`, `inventory_restock_agent`, `customer_support_agent`)
- `blaize-bazaar/backend/services/agentcore_runtime.py` exists with challenge block
- `blaize-bazaar/backend/services/agentcore_memory.py` exists with challenge block
- `blaize-bazaar/backend/services/agentcore_gateway.py` exists with challenge block
- `blaize-bazaar/backend/services/otel_trace_extractor.py` exists with challenge block
- `blaize-bazaar/backend/services/cognito_auth.py` exists with challenge block
- `blaize-bazaar/backend/services/agentcore_identity.py` exists with challenge block
- `blaize-bazaar/frontend/src/utils/auth.ts` exists with challenge block
- `blaize-bazaar/frontend/src/components/AuthModal.tsx` and `PreferencesModal.tsx` exist with challenge blocks
- Every challenge file has `# === CHALLENGE N: START ===` and `# === CHALLENGE N: END ===` markers
- `/home/workshop/test-credentials.txt` exists (from bootstrap-labs.sh)

If any challenge block is missing, stop and surface the gap.

---

## What to build

### 1. `lab-content/workshop/` directory structure

Per `workshop-content.md` steering, content lives here. Structure it as:

```
lab-content/workshop/
├── index.en.md                   # Landing page for the 2-hour Workshop
├── 00-setup.en.md                # Environment verification
├── 10-module1-smart-search.en.md # Module 1: C1
├── 20-module2-agentic-ai.en.md   # Module 2: C2, C3, C4
├── 30-module3-production.en.md   # Module 3: C5, C6, C7, C8, C9
├── 99-wrap-up.en.md              # Next steps + closing
└── static/                        # Images, diagrams
```

Use Workshop Studio markdown syntax per `workshop-content.md` steering: `:::alert`, `::::expand`, `:::::tabs`, fenced code blocks. Include "Short on time?" copy-paste solutions at the top of each module. Verification steps after every challenge. Mermaid for architecture.

### 2. Content — module by module

#### `00-setup.en.md` (5 min)

- Verify Workshop Studio environment is green
- Open the workshop IDE URL from your session
- Confirm VS Code + Amazon Q are loaded
- Confirm Blaize Bazaar storefront loads at the workshop domain
- Open `/home/workshop/test-credentials.txt` and note your assigned test user (username format: `workshop-user-{N}-{workshop-id}`)
- Sign in with that test user via the "Sign in for personalized visions" CTA to confirm auth works end-to-end

#### `10-module1-smart-search.en.md` (30 min, 1 challenge)

##### Challenge 1: Vector Search

> **Concept:** Shoppers don't search in keywords anymore. "Something for long summer walks" doesn't match any single product attribute, but the _meaning_ is closer to breathable linen than to wool coats. You'll build the pgvector cosine similarity search that makes the storefront understand intent.

- **File:** `blaize-bazaar/backend/services/hybrid_search.py`
- **Goal:** Implement `_vector_search(self, embedding, limit, ef_search, iterative_scan=True)` so that `POST /api/search` returns ranked products for any natural-language query.

**Steps:**

1. Open the file, locate the `# === CHALLENGE 1: START ===` block
2. Read the signature and surrounding context (the method receives a pre-computed 1024-dim Cohere Embed v4 embedding, not raw text)
3. Delete the code between the markers
4. Implement using the hints below
5. Save — `uvicorn --reload` picks up the change

**Hints** (per `database.md` steering patterns):

- Use the CTE pattern: `WITH query_embedding AS (SELECT %s::vector as emb)`
- pgvector cosine distance: `<=>` in `ORDER BY`
- Use parameterized queries — `%s` placeholders only, never f-strings for values
- Set HNSW `ef_search` per-query: `SET LOCAL hnsw.ef_search = %s`
- When `iterative_scan=True`: `SET LOCAL hnsw.iterative_scan = 'relaxed_order'` (Aurora pgvector 0.8.0)
- Filter on `quantity > 0` for in-stock
- Similarity score: `1 - (embedding <=> query_embedding)`

**Verification:**

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"something for long summer walks"}' | jq '.results[:3]'
```

Expected: top 3 results are linen pieces (Italian Linen Camp Shirt, Wide-Leg Linen Trousers, Relaxed Oxford Shirt) with similarity scores 0.35–0.55.

**Take It Further (optional):** Wire Cohere Rerank v3.5 on top of your vector search for improved precision on ambiguous queries. Reference: `solutions/module1/hybrid_search_with_rerank.py`.

#### `20-module2-agentic-ai.en.md` (40 min, 3 challenges)

##### Challenge 2: A Tool That Agents Can Call

> **Concept:** Raw vector search is useful, but agents need _tools_ — functions they can call to gather information. The `@tool` decorator from Strands Agents SDK turns any Python function into something Claude Opus 4.6 can invoke during reasoning.

- **File:** `blaize-bazaar/backend/services/agent_tools.py`
- **Goal:** Implement `get_trending_products()` as a `@tool`-decorated function that returns top-N products by recent review count.

**Hints** (per `coding-standards.md`):

- Import `@tool` from `strands`
- Function returns a JSON-serialized string via `json.dumps(...)` (not a dict)
- Follow `verb_noun` naming — already enforced by the function name
- Check `_db_service` availability before DB operations
- Use `_run_async()` helper for the sync-to-async bridge
- Error handling pattern: `return json.dumps({"error": str(e)})`
- Signature accepts optional `limit: int = 5`
- Query pattern: `SELECT ... FROM blaize_bazaar.product_catalog WHERE quantity > 0 ORDER BY review_count DESC LIMIT %s`

**Verification:**

```bash
cd blaize-bazaar/backend && pytest tests/test_agent_tools.py::test_get_trending_products -v
```

##### Challenge 3: A Specialist Agent

> **Concept:** Tools are building blocks. Agents are what use them. The `product_recommendation_agent` wraps Claude Opus 4.6 with tools and a system prompt that shapes its voice. This is the "picked because you mentioned warm evenings" agent.

- **File:** `blaize-bazaar/backend/agents/recommendation_agent.py`
- **Goal:** Build a Strands agent that takes a user query and returns a recommendation with reasoning.

**Hints** (per `coding-standards.md`):

- Import `Agent` and `BedrockModel` from `strands`
- Model: `BedrockModel(model_id=settings.BEDROCK_CHAT_MODEL)` — resolves to `global.anthropic.claude-opus-4-6-v1`
- **Temperature: 0.2** (specialist default per coding-standards)
- Tools: `[search_products, get_trending_products, compare_products, get_product_by_category]`
- System prompt: warm, editorial, catalog-style reasoning — never tech jargon. Ground every recommendation in at least one specific attribute.
- Return an `Agent` instance, not a response — the orchestrator handles invocation

**Verification:**

```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I need something for a dinner party on a warm Saturday night"}'
```

Reasoning should mention warmth or evening context.

##### Challenge 4: The Orchestrator

> **Concept:** One agent with every tool gets confused. Five specialists routed by intent stay sharp. The orchestrator inspects each incoming message and dispatches to the right specialist.

- **File:** `blaize-bazaar/backend/agents/orchestrator.py`
- **Goal:** Build the orchestrator that takes a user message and routes to the right specialist.

**Hints** (per `coding-standards.md`):

- Uses Claude Haiku 4.5: `BedrockModel(model_id='global.anthropic.claude-haiku-4-5-20251001-v1:0')` — orchestrator-specific model for latency/cost
- **Temperature: 0.0** (deterministic routing)
- Strands "Agents as Tools" pattern
- Routes to five specialists: `search_agent`, `product_recommendation_agent`, `price_optimization_agent`, `inventory_restock_agent`, `customer_support_agent`
- Intent classification priority: **pricing > inventory > support > search > recommendation** (default)
- Returns response with `specialist` field indicating which agent handled it

**Verification:** try each intent pattern:

```bash
# Should route to inventory_restock_agent
curl ... -d '{"message":"Is the cashmere cardigan in stock?"}'
# Should route to price_optimization_agent
curl ... -d '{"message":"Is $158 a fair price for this cardigan?"}'
# Should route to customer_support_agent
curl ... -d '{"message":"Can I return this?"}'
```

#### `30-module3-production.en.md` (40 min, 5 challenges, infrastructure-out)

##### Challenge 5: AgentCore Runtime (5 min)

> Local Strands doesn't scale. AgentCore Runtime is AWS's managed agent deployment.

- **File:** `blaize-bazaar/backend/services/agentcore_runtime.py`
- **Goal:** Migrate the local orchestrator to AgentCore Runtime. Use `bedrock_agentcore` SDK. Deploy as runtime, expose `invoke_orchestrator(message, session_id)` that calls the remote runtime.

**Verification:** same curl as C4, but traffic hits AgentCore Runtime. Check CloudWatch log group `/aws/blaize-bazaar/agentcore-runtime/`.

##### Challenge 6: AgentCore STM Memory (8 min)

> Multi-turn conversations need session memory. AgentCore STM is the managed pattern.

- **File:** `blaize-bazaar/backend/services/agentcore_memory.py`
- **Goal:** Wrap AgentCore STM. Session key: `session:{session_id}:messages`. User key: `user:{user_id}:preferences` (user_id from C9). TTL: 24h for workshop demos.

**Verification:** send two messages to `/api/agent/chat` with the same `session_id`. Second response should reference the first.

##### Challenge 7: AgentCore MCP Gateway (8 min)

> MCP is the standardized way agents discover tools. AgentCore Gateway exposes yours.

- **File:** `blaize-bazaar/backend/services/agentcore_gateway.py`
- **Goal:** Register existing tools through the Gateway. Tool schemas auto-generated from `@tool` decorated functions.

**Verification:**

```bash
curl -X POST http://localhost:8000/api/agent/tools/list
```

Returns MCP-format tool list with the 9 tools listed in `workshop-content.md` steering.

##### Challenge 8: OpenTelemetry Observability (4 min)

> When an agent takes 4 seconds, you need to know why.

- **File:** `blaize-bazaar/backend/services/otel_trace_extractor.py`
- **Goal:** Extract OTEL traces from AgentCore Runtime. Fetch spans from CloudWatch Insights by trace_id. Return hierarchical structure for the `/inspector` view.

**Verification:** open `/inspector?session={session_id}` after a chat. Waterfall of spans with per-step latency.

##### Challenge 9 (THE CAPSTONE): Agent Identity with Cognito + AgentCore Identity (25 min)

> **Concept:** You've built search, reasoning, orchestration, deployment, memory, gateway, and observability. Now wire them to a real user. This is what turns the simulated sign-in into production authentication: Cognito Hosted UI → JWT → AgentCore Identity → scoped AgentCore Memory.
>
> This is four files broken into four sub-challenges. Budget 20–25 minutes.

###### C9.1: JWT Validation Middleware (backend)

- **File:** `blaize-bazaar/backend/services/cognito_auth.py`
- **Goal:** FastAPI middleware that validates Cognito JWTs using JWKS.

**Hints:**

- Fetch JWKS from `{cognito-domain}/.well-known/jwks.json` once, cache for 1 hour
- Use `python-jose` or `authlib` for JWT verification
- Verify `iss` matches your User Pool, `aud` matches your App Client
- Handle key rotation: if `kid` missing from cache, refetch JWKS
- Extract `sub` (user_id), `email`, `given_name` into `request.state.user`

**Verification:**

```bash
# Without auth:
curl http://localhost:8000/api/user/preferences  # → 401

# With auth (sign in via hosted UI, capture cookie):
curl -b "access_token=<jwt>" http://localhost:8000/api/user/preferences  # → 200
```

###### C9.2: AgentCore Identity User Context (backend)

- **File:** `blaize-bazaar/backend/services/agentcore_identity.py`
- **Goal:** Tie verified Cognito user_id into AgentCore Memory calls via `agentcore_memory.py`.

**Hints:**

- Expose `get_verified_user_context(request)` returning `{user_id, email, session_id}`
- Namespace all AgentCore Memory keys by user_id
- This is what prevents User A from seeing User B's preferences — tenant isolation

**Verification:**

- Sign in as `workshop-user-1`, save preferences `[minimal, linen]`
- Sign in as `workshop-user-2`, save preferences `[bold, dresses]`
- Confirm each user sees their own via `/api/user/preferences`

###### C9.3: Frontend Auth Flow

- **File:** `blaize-bazaar/frontend/src/utils/auth.ts`
- **Goal:** Cognito Hosted UI redirect helpers, `useAuth()` React context, silent token refresh.

**Hints:**

- `signIn(provider)` → redirect to `{hosted-ui}/oauth2/authorize?identity_provider={provider}&response_type=code&...`
- Callback handled by FastAPI; frontend redirects to `/` on completion
- `useAuth()` returns `{user, preferences, signIn, signOut}` — fetched via `/api/auth/me`
- Never store tokens in localStorage — cookies only

**Verification:** click "Continue with Google" → redirected to Cognito → redirected to Google → approve → redirected back → header shows "Hi, [Name]"

###### C9.4: Auth + Preferences UI

- **Files:** `blaize-bazaar/frontend/src/components/AuthModal.tsx` + `blaize-bazaar/frontend/src/components/PreferencesModal.tsx`
- **Goal:** The sign-in modal (3 OAuth options) and preferences onboarding (4 chip groups).

**Hints** (per `storefront.md` steering — all design specs there):

- `AuthModal`: three buttons calling `signIn('google')`, `signIn('apple')`, `signIn('email')`
- `PreferencesModal`: four groups (vibe, color, occasion, category) with exact chips listed in storefront.md
- Selected chip: `background: #2d1810; color: #fbf4e8; border-color: #2d1810`
- On save: close modal, flash curated banner, re-fetch products with `personalized=true`

**Verification (the full end-to-end flow):**

1. Click sign-in CTA
2. Cognito Hosted UI
3. Continue with Google (or use email/password from test credentials)
4. Back to storefront
5. Preferences modal auto-opens
6. Pick minimal + serene + linen
7. Save
8. Grid re-sorts (Italian Linen Camp Shirt to position 1)
9. Header shows "Hi, [Name]"
10. Banner: "Tailored to your preferences, [Name]. minimal · serene · linen"

#### `99-wrap-up.en.md` (5 min)

- You built search, reasoning, orchestration, deployment, memory, gateway, observability, and real identity
- LTM (Long-Term Memory) was deferred — 2-5 min async extraction, unsuitable for live workshops. See `docs/ltm-reference.md` for the pattern
- This is the architecture you'd take to production. Everything you wrote uses real services, real identity, real scoping
- Closing question: _What does agentic AI actually mean for the products you ship?_

### 3. `solutions/` directory

Create and populate:

```
solutions/
├── module1/
│   ├── hybrid_search.py                  # full _vector_search
│   └── hybrid_search_with_rerank.py      # Take It Further (Cohere Rerank v3.5)
├── module2/
│   ├── agent_tools.py                    # full get_trending_products
│   ├── recommendation_agent.py
│   └── orchestrator.py
└── module3/
    ├── agentcore_runtime.py
    ├── agentcore_memory.py
    ├── agentcore_gateway.py
    ├── otel_trace_extractor.py
    ├── cognito_auth.py                   # C9.1
    ├── agentcore_identity.py             # C9.2
    ├── auth.ts                           # C9.3
    ├── AuthModal.tsx                     # C9.4
    └── PreferencesModal.tsx              # C9.4
```

Each file: complete, tested, production-ready. Inline comments explain non-obvious decisions (why `ef_search=100` over default 40, why `iterative_scan=True` matters, why JWKS cache is 1h, why httpOnly cookies, why AgentCore Memory keys are user-scoped).

### 4. Workshop Studio metadata

`lab-content/workshop/contentspec.yaml`:

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
      label: Blaize Bazaar Labs (2-hour Workshop)
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
  duration: 120
  checkpoints:
    - "00:00 — Setup & environment check"
    - "00:05 — Module 1: Smart Search"
    - "00:35 — Module 2: Agentic AI"
    - "01:15 — Module 3: Production Patterns"
    - "01:55 — Wrap-up & next steps"
prerequisites:
  knowledge:
    - "Python 3.13 fluency"
    - "Familiarity with PostgreSQL and vector databases"
    - "Basic understanding of LLMs and embeddings"
    - "React/TypeScript experience (for C9 frontend)"
  technical:
    - "Bedrock model access: Claude Opus 4.6, Claude Haiku 4.5, Cohere Embed v4, Cohere Rerank v3.5"
    - "Cognito-supported AWS region"
```

Instructor notes (in file comments):

- **JWT clock skew** — NTP drift >5 min makes validation fail mysteriously. Pre-check in bootstrap.
- **Redirect URI mismatches** — Cognito is strict. App Client callback URL must match what frontend sends.
- **JWKS cache staleness** during key rotation. Sporadic 401s after 1h → suggest `curl POST /api/_internal/refresh-jwks`.
- **C9 budget** — 25 min, not 20. If room is slow, drop C8 (OTEL) to read-only.

---

## Implementation order

1. Verify state
2. Create `solutions/` directory — copy from existing challenge files
3. Write `lab-content/workshop/` markdown files — C9 is the most careful (25 min, 4 sub-challenges)
4. Write `lab-content/workshop/contentspec.yaml`
5. **Dry-run**: walk through end-to-end as a participant. Every curl, file path, verification step must work.

---

## Validation checklist

- [ ] 9 challenges total (1 in M1, 3 in M2, 5 in M3); C9 split into 9.1/9.2/9.3/9.4
- [ ] Every challenge file path resolves to a real file
- [ ] Every `# === CHALLENGE N: START/END ===` block in place
- [ ] Every challenge has: concept, file path, goal, hints (3-5 bullets), verification
- [ ] Every challenge instruction under 200 words
- [ ] Solutions directory has `module1/`, `module2/`, `module3/` (no old structure)
- [ ] Tool names match `workshop-content.md` exactly: `search_products`, `get_trending_products`, `get_price_analysis`, `get_product_by_category`, `get_inventory_health`, `get_low_stock_products`, `restock_product`, `compare_products`, `get_return_policy`
- [ ] Agent names match: `search_agent`, `product_recommendation_agent`, `price_optimization_agent`, `inventory_restock_agent`, `customer_support_agent`
- [ ] Model IDs correct: Opus 4.6 for specialists (temp 0.2), Haiku 4.5 for orchestrator (temp 0.0)
- [ ] Python version: 3.13
- [ ] No emojis, no em dashes, no customer-facing tech jargon in lab guides (steering rule)
- [ ] Workshop Studio markdown syntax used (`:::alert`, `::::expand`, `:::::tabs`)
- [ ] Aurora version parameter-driven (`AuroraEngineVersion: 17.7` default)
- [ ] "Short on time?" copy-paste solutions at top of each module
- [ ] `contentspec.yaml` validates against Workshop Studio schema
- [ ] Timeline checkpoints add up to 120 min

---

## Output

One-page summary:

- Lab guide word count per challenge
- Solutions directory file count
- Workshop Studio metadata validation
- Dry-run timing — does 120 min actually work?
- Human review needed before re:Invent submission

Start by verifying state, propose a plan, then build.
