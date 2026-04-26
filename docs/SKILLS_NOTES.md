# Skills — Implementation Notes

The third architectural layer alongside agents and tools. Skills are
folders of domain expertise loaded conditionally into an agent's
system prompt based on what the conversation needs.

The triangle the workshop teaches: **agents** are _who_, **tools** are
_what_, **skills** are _how_. Skills don't pick products and they
don't fetch data — they shape voice and decisions.

## Directory Structure

```
/ (project root)
├── skills/
│   ├── gift-concierge/
│   │   └── SKILL.md            ← frontmatter + markdown body
│   └── style-advisor/
│       └── SKILL.md
│
└── blaize-bazaar/backend/skills/   ← the Python module
    ├── __init__.py                 ← public API re-exports
    ├── models.py                   ← Skill + RouterDecision Pydantic
    ├── registry.py                 ← SkillRegistry + frontmatter parser
    ├── loader.py                   ← load_registry / get_registry
    ├── context.py                  ← ContextVar + inject_skills()
    ├── router.py                   ← SkillRouter (one-call LLM)
    └── router_test.py              ← CLI test harness
```

## How to Add a Skill

1. Create `skills/<your-skill-name>/SKILL.md` with YAML frontmatter:

   ```yaml
   ---
   name: your-skill-name
   display_name: Your skill name
   description: One or two sentences that describe when to activate this
     skill, including explicit "Do NOT load" negative clauses for edge
     cases. This field is the router's entire input — be precise.
   version: 1.0
   ---
   # Your skill name

   (markdown body — this is what gets injected into specialist system
   prompts when the router decides to load the skill)
   ```

2. Restart the backend. The registry loads at boot; hot reload via
   `uvicorn --reload` picks up changes in dev.

3. Look for the summary line in the boot log:

   ```
   ✅ Loaded N skills from /skills/: name1 (Nt), name2 (Nt), ...
   ```

4. The new skill appears automatically on the Atelier Architecture
   tab's Skills card (Dormant until a query triggers it).

## Router System Prompt

Verbatim for transparency — the router sees this plus the skill
library as name/description pairs:

```
You are a skill router for an editorial boutique's AI agent.

Given a user message and a library of available skills (each with a
name and an activation description), decide which skills should be
loaded for this turn.

Load a skill only if its activation description clearly matches the
message. Be conservative — extra skills cost tokens. If no skill
matches, return an empty load array.

Respond with a single JSON object, nothing else:

{
  "load": ["skill-name", ...],
  "considered": [
    {"name": "skill-name", "reason": "brief explanation of why rejected or evaluated"}
  ]
}

The "load" array is the only field that drives behavior. The
"considered" array is for auditing — include every skill you
evaluated, whether loaded or not, with a short reason.

Available skills:

- gift-concierge: Gift-occasion logic for recommendations — milestone
  vs casual, price-band etiquette, gift-message tone, packaging and
  timing. Activates when the customer signals the purchase is for
  someone else. Do not load for self-purchases.
- style-advisor: Boutique editorial voice for describing products,
  fit, fabric, and styling. Activates when the agent is recommending
  or describing pieces to a customer — including gift recommendations,
  which always require the agent to describe the pieces it surfaces.
  Do NOT load for inventory, pricing, or transactional queries.
  Do NOT load for factual queries about materials, dimensions, care,
  or other spec-sheet details — those are answered from the product
  page, not by an advisor.
```

## Router Model

- **Model:** `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- **Temperature:** 0.0 (deterministic for a given library + message)
- **Max tokens:** 512
- **Why Haiku:** The router is a classification call — tiny prompt,
  tiny output, no tool use. Haiku's cost per call is ~1/15 of Opus
  and its speed is ~3x faster. Running the router on the same model
  the orchestrator uses (also Haiku 4.5 today) keeps the stack simple.

## Router Latency

Observed latency against the canonical 10-case suite on `us-west-2`:

|                              | p50  | p95  | Budget    | Notes                        |
| ---------------------------- | ---- | ---- | --------- | ---------------------------- |
| Warm                         | 1.4s | 2.4s | 280–400ms | Above documented budget      |
| Cold (first call after boot) | 2.7s | 9.4s | —         | Bedrock on-demand cold start |

**Root cause of latency gap:** the Strands `Agent` wrapper adds
overhead that's unnecessary for a single-shot classification call.
Strands' event loop instruments every call with OTEL spans, cycle
tracking, and token accounting — fine for the reasoning agents, wasteful
for the router.

**Future optimization (deferred from v1):** replace the router's
`Agent` + `BedrockModel` construct with a direct
`boto3.client('bedrock-runtime').converse()` call. The rest of the
system continues to use Strands; only the router swaps.

**Workshop note:** the lab guide should warn participants the first
router call after server boot is slow; subsequent calls are normal.
The streaming reply that follows the router masks the latency in the
demo, so it's tolerable for v1. Revisit if real-world workshop
testing shows demo friction.

## Integration Point

The router runs in `services/chat.py::chat_stream()` between the
deterministic intent classification and the orchestrator invocation:

```
user_message
  → triage fast-path (greetings, thanks — short-circuits here)
  → classify_intent() picks specialist hint
  → SkillRouter.route(message) ← THE ROUTER RUNS HERE
  → emit "skill_routing" SSE event (BEFORE any text tokens)
  → set_loaded_skills(objs)      ← ContextVar set
  → orchestrator(message) via asyncio.to_thread
      ↳ specialist agents call inject_skills(base_prompt) to read
        the ContextVar and compose skill-augmented system prompts
  → await orchestrator (try/finally → loaded_skills_var.reset(token))
  → stream content_delta, tool_call, agent_step events
  → emit "complete" event with full response
```

**Event ordering contract:** the `skill_routing` SSE event MUST fire
before any text tokens. The storefront renders an italic burgundy
attribution line above the reply body; the Atelier shows a live
activation log with verdicts. Both require the event to arrive first.

**ContextVar safety:** `set_loaded_skills()` returns a `Token` that's
reset in a `finally` block immediately after `await task`. The
orchestrator runs in `asyncio.to_thread`, which propagates the
ContextVar into the worker thread via `copy_context()` (Python 3.9+).
A mid-stream error cannot leak loaded skills to the next request.

## Which Specialists Inject Skills

| Specialist               | `inject_skills()`? | Rationale                                                  |
| ------------------------ | ------------------ | ---------------------------------------------------------- |
| `recommendation_agent`   | ✓                  | Composes editorial replies — primary consumer              |
| `search_agent`           | ✓                  | Composes product-description replies                       |
| `customer_support_agent` | ✓                  | May encounter gift-return / policy-around-gifts edge cases |
| `pricing_agent`          | ✗                  | Transactional; skill descriptions explicitly exclude       |
| `inventory_agent`        | ✗                  | Transactional; same reasoning                              |
| `orchestrator`           | ✗                  | Haiku dispatcher, not a reasoning specialist               |

Any new reasoning specialist should call `inject_skills(base_prompt)`
in its Agent factory. Skills are agent-agnostic — no imports between
skills and specific agents are required beyond the one-line helper.

## Known Limitations (v1)

1. **No stickiness across turns.** Each turn re-evaluates from scratch.
   If a conversation is continuous ("what about in linen?") the router
   must re-derive skill loads from the new message alone. Stickiness
   is a reasonable v2 idea.

2. **No learning from past activations.** The router does not see
   which skills past turns loaded or how those turns landed. It does
   not adjust over time.

3. **Before/after impact panel is static in v1.** The Atelier Skills
   panel shows a canned example (Italian Linen Camp Shirt, Linen Wrap
   Dress, Sundress in Washed Linen). Wiring live comparison requires
   running the current query with-and-without skills side by side —
   flagged for follow-up.

4. **Storefront attribution line renders only on `/api/chat/stream`**.
   The Atelier's own `/api/atelier/query` path runs a separate
   orchestrator flow through `routes/workshop.py`; the SSE-level
   `skill_routing` event is emitted only by `chat_stream()`. The
   Atelier Skills panel reads the latest routing from `localStorage`
   (written by the storefront chat's `useAgentChat`). Works in practice
   because the workshop flow has participants fire queries in the
   storefront for the demo and switch to the Atelier to inspect.

5. **Display name map is duplicated.** The backend emits canonical
   names in SSE events; the storefront `StorefrontChat.tsx` has a
   small `SKILL_DISPLAY_NAMES` lookup. Long-term, the storefront
   should fetch the registry once and cache display names — noted.

6. **Router depends on Strands Agent wrapper.** Adds ~1–2 seconds
   overhead on a call that would otherwise land in 280–400ms. See
   "Router Latency" above.

## What This Layer Is Not

- Skills don't **pick products** — that's the recommendation agent's
  job, via its tools
- Skills don't **fetch data** — tools do that
- Skills aren't **system prompts** — base system prompts live with the
  agents; skills are small, scoped, conditional appendices
- Skills aren't **agents** — they don't reason, don't route, don't
  hand off
- Skills aren't **tools** — no typed I/O, no deterministic function
  signature, no result to pass back

If you can't tell which of the three a change belongs to, you've
muddled them. The Atelier cheat sheet at the bottom of the Skills
panel is the reference card.

## Canonical Test Cases

Ten queries live in `backend/skills/router_test.py` — grounded in the
actual 92-product catalog. Run:

```bash
cd blaize-bazaar/backend
.venv/bin/python -m skills.router_test            # all ten
.venv/bin/python -m skills.router_test "<query>"  # one ad-hoc
```

The catalog-grounded suite is also tracked in `docs/backlog.md` under
"Skills · catalog-grounded demo queries". When either the catalog or
the skill descriptions change, update both.
