# Prompt Architecture: Diagnosis and Deterministic Response Spec

## The Problem

Six prompts across four files are each independently trying to do three jobs:

1. **Route** the query to the right tool or agent
2. **Instruct** the LLM to call tools correctly
3. **Format** the response with JSON product blocks

The LLM is unreliable at job #3. The evidence is in the codebase:

- `_ensure_products_in_output()` — duplicated in all 5 specialist agents — is a band-aid that extracts product data from tool results and appends it when the LLM forgets to include a JSON block
- `_repair_json()` in `chat.py` — fixes trailing commas, single quotes, missing commas between objects — all symptoms of LLM-generated JSON
- The `CRITICAL RULES` and `IMPORTANT` blocks in every prompt that say "you MUST include the raw product list as a ```json code block" — the word "MUST" in a prompt is a signal that the LLM frequently doesn't

The fix isn't better prompts. It's **removing jobs from the prompts that code should handle**.

---

## Root Cause: Prompts Are Doing Three Jobs

### Current architecture (unreliable)

```
User query
  → Prompt says "route to the right agent"           ← LLM job (fuzzy)
    → Prompt says "call the right tool"               ← LLM job (good at this)
      → Tool returns structured JSON                  ← Code (reliable)
    → Prompt says "include the JSON in your response" ← LLM job (unreliable)
  → Response with maybe-JSON, maybe-not
    → _ensure_products_in_output() patches it         ← Band-aid
    → _repair_json() fixes malformed output           ← Band-aid
```

### Target architecture (deterministic)

```
User query
  → Code routes to the right agent (keyword match)    ← Code (deterministic)
    → Prompt says "call the right tool"                ← LLM job (good at this)
      → Tool returns structured JSON                   ← Code (reliable)
    → Hook captures tool result programmatically       ← Code (reliable)
    → Prompt says "write 1-2 sentences about results"  ← LLM job (good at this)
  → Response = { text: LLM prose, products: extracted from tool results }
    → No _ensure_products_in_output() needed
    → No _repair_json() needed
```

The key insight: **the LLM should never be responsible for serializing product data**. It already comes back as structured JSON from the tools. The `AfterToolCallEvent` hook already captures it (you have this code in all three agents). The problem is that you then _also_ ask the prompt to include it, creating two competing paths for the same data.

---

## Separation of Concerns

### Job 1: Routing — move to code

The orchestrator prompt currently does keyword-based routing via natural language:

```
"If query contains 'deal', 'deals', 'cheap'... → MUST call price_optimization_agent"
```

This works ~90% of the time but fails on edge cases ("what's a good deal on headphones" sometimes routes to recommendation). Move this to a Python function:

```python
PRICING_KEYWORDS = {"deal", "deals", "cheap", "cheapest", "price", "pricing",
                    "discount", "affordable", "budget", "value", "cost", "save",
                    "best price", "on sale", "bargain"}
INVENTORY_KEYWORDS = {"restock", "inventory", "stock", "out of stock",
                      "low stock", "available", "availability"}

def classify_intent(query: str) -> str:
    """Deterministic intent classification via keyword matching."""
    query_lower = query.lower()
    words = set(re.findall(r'\w+', query_lower))

    # Check multi-word phrases first
    for phrase in PRICING_KEYWORDS:
        if ' ' in phrase and phrase in query_lower:
            return "pricing"
    for phrase in INVENTORY_KEYWORDS:
        if ' ' in phrase and phrase in query_lower:
            return "inventory"

    # Then single-word matches
    if words & PRICING_KEYWORDS:
        return "pricing"
    if words & INVENTORY_KEYWORDS:
        return "inventory"

    return "recommendation"
```

The orchestrator prompt then becomes trivially simple — it doesn't need routing rules at all, because the code already picked the right agent. The orchestrator just needs to pass the query through and format the response.

**Fallback:** For ambiguous queries where code-based classification returns "recommendation" but the LLM might disagree, this is fine — recommendation is the safe default. The search agent has `search_products` which handles almost any product query.

### Job 2: Tool selection — keep in prompts (LLMs are good at this)

Within each specialist agent, the LLM decides which tool to call based on the query and the tool docstrings. This is what agents are designed to do and it works reliably. No change needed here.

### Job 3: Response formatting — move to code

**Remove all "MUST include JSON" instructions from every prompt.** Instead:

1. The `AfterToolCallEvent` hook (already implemented) captures the raw tool result
2. `chat.py` extracts products from the tool result programmatically
3. The SSE stream sends products as structured `{type: "product"}` events (already implemented)
4. The LLM only generates the natural language intro ("Here are some great running shoes:")

The prompts become drastically simpler because they only do one thing: guide the LLM's conversational tone and tool selection.

---

## Rewritten Prompts

### Prompt 1: Single Agent (Agent + Tools mode)

**File:** `chat.py` line 41

```python
SINGLE_AGENT_PROMPT = """You are Blaize AI, the shopping assistant for Blaize Bazaar.

TOOL SELECTION:
- get_trending_products → Only when user asks "what's trending" with no filters
- search_products → All product queries (natural language, filtered, category-specific)
- get_price_analysis → Pricing statistics and category comparisons

Call exactly one tool per query. Extract price limits from the query and pass as max_price.

RESPONSE STYLE:
Write 1-2 short sentences as a conversational intro. Products render as visual cards automatically — do not list them in text. Do not use markdown tables, numbered lists, or headers. Do not apologize or say "unfortunately"."""
```

**What changed:** Removed all JSON formatting instructions, removed "CRITICAL RULES" shouting, removed response format examples. The prompt is 8 lines instead of 20.

### Prompt 2: Orchestrator (Multi-Agent mode)

**File:** `orchestrator.py` line 11

With code-based routing, the orchestrator prompt simplifies dramatically:

```python
ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar shopping assistant.

You have specialist agents. Call the one selected for you, passing the full user query.
Write 1 short sentence before the results. Do not mention agent names or explain routing.
If the user mentions a price limit, include it in the query you pass to the agent."""
```

**What changed:** All routing rules removed (handled by `classify_intent()`). The prompt is 4 lines. The orchestrator's only job is to invoke the pre-selected agent and write a brief intro.

**Implementation note:** `classify_intent()` runs in `chat.py` before creating the orchestrator. Based on the result, `chat.py` either calls the specialist agent directly (bypassing the orchestrator entirely) or passes a hint:

```python
intent = classify_intent(message)
if intent == "pricing":
    result = price_optimization_agent(message)
elif intent == "inventory":
    result = inventory_restock_agent(message)
else:
    result = product_recommendation_agent(message)
```

This eliminates the orchestrator as a routing layer entirely for Multi-Agent mode — the orchestrator becomes a thin wrapper that the code routes through. Alternatively, keep the orchestrator but inject the intent as a system message:

```python
orchestrator(f"[ROUTE: {intent}] {message}")
```

### Prompt 3: Recommendation Agent

**File:** `recommendation_agent.py` line 52

```python
RECOMMENDATION_PROMPT = """You are Blaize Bazaar's Product Recommendation Specialist.

Use search_products for specific queries and get_trending_products for general discovery.
Consider price, ratings, and availability. Write 1-2 sentences of context before results."""
```

**What changed:** Removed the entire "IMPORTANT: you MUST include the raw product list" block. Removed the JSON format specification. Products are extracted from tool results by the hook, not by the prompt.

### Prompt 4: Pricing Agent

**File:** `pricing_agent.py` line 53

```python
PRICING_PROMPT = """You are Blaize Bazaar's Pricing Specialist.

Use get_price_analysis for category-level statistics and get_product_by_category for product listings.
Use search_products when the user describes products in natural language with price constraints.
Write 1-2 sentences of context before results."""
```

### Prompt 5: Inventory Agent

**File:** `inventory_agent.py` line 52

```python
INVENTORY_PROMPT = """You are Blaize Bazaar's Inventory Specialist.

Use get_inventory_health for overall stock statistics.
Use get_low_stock_products for items needing restocking.
Use restock_product when the user specifies a product ID and quantity.
Write 1-2 sentences summarizing stock status before results."""
```

### Prompt 6: AgentCore Gateway

**File:** `agentcore_gateway.py` line 78

```python
GATEWAY_PROMPT = """You are the Blaize Bazaar shopping assistant.

Use the available tools to find products, check prices, and manage inventory.
Write 1-2 sentences of context before results. Do not mention tool names or routing."""
```

---

## Product Extraction Pipeline

### Remove `_ensure_products_in_output()` from all agents

This function exists because the prompts are unreliable at including JSON. Once products are extracted programmatically, it's unnecessary.

### Centralize product extraction in `chat.py`

The `AfterToolCallEvent` hook already captures tool results. Formalize this as the single source of truth for product data:

```python
class ProductExtractor:
    """Extract products from tool results. Single source of truth —
    the LLM never generates product JSON."""

    @staticmethod
    def extract(tool_result_str: str) -> list[dict]:
        """Parse tool result JSON and return normalized product dicts."""
        try:
            data = json.loads(tool_result_str)
        except json.JSONDecodeError:
            return []

        products = []
        if isinstance(data, dict) and "products" in data:
            products = data["products"]
        elif isinstance(data, list):
            products = data

        return [ProductExtractor._normalize(p) for p in products if isinstance(p, dict)]

    @staticmethod
    def _normalize(p: dict) -> dict:
        """Normalize field names from various tool output formats."""
        return {
            "productId": p.get("productId") or p.get("product_id", ""),
            "name": p.get("product_description") or p.get("name", ""),
            "price": _safe_float(p.get("price", 0)),
            "stars": _safe_float(p.get("stars") or p.get("rating", 0)),
            "reviews": _safe_int(p.get("reviews", 0)),
            "category": p.get("category_name") or p.get("category", ""),
            "quantity": _safe_int(p.get("quantity", 0)),
            "imgUrl": p.get("imgUrl") or p.get("img_url", ""),
            "productURL": p.get("productURL") or p.get("product_url", ""),
        }
```

### SSE stream uses extracted products, ignores LLM JSON

In the streaming handler, products come from the hook capture, not from parsing the LLM's text output:

```python
# AfterToolCallEvent fires → extract products → send as SSE events
# LLM text output is used ONLY for the conversational intro
# _repair_json() and _parse_agent_response() JSON extraction become unnecessary
```

---

## Temperature and Model Settings

### Current inconsistency

| Layer                | Model            | Temperature   |
| -------------------- | ---------------- | ------------- |
| Orchestrator         | Claude Haiku 4.5 | 0.0           |
| Recommendation agent | Claude Sonnet 4  | default (1.0) |
| Pricing agent        | Claude Sonnet 4  | default (1.0) |
| Inventory agent      | Claude Sonnet 4  | default (1.0) |
| Single agent         | Claude Sonnet 4  | default (1.0) |

### Recommended settings

| Layer                | Model            | Temperature | Rationale                                                     |
| -------------------- | ---------------- | ----------- | ------------------------------------------------------------- |
| Orchestrator         | Claude Haiku 4.5 | 0.0         | Routing must be deterministic                                 |
| Recommendation agent | Claude Sonnet 4  | 0.2         | Low creativity for tool selection, slight variation for prose |
| Pricing agent        | Claude Sonnet 4  | 0.2         | Same                                                          |
| Inventory agent      | Claude Sonnet 4  | 0.2         | Same                                                          |
| Single agent         | Claude Sonnet 4  | 0.2         | Same                                                          |
| Gateway orchestrator | Claude Haiku 4.5 | 0.0         | Same as local orchestrator                                    |

Setting specialists to 0.2 (not 0.0) allows slight natural language variation in the intro sentences while keeping tool selection deterministic. At 0.0, the prose reads robotic with identical responses every time. At 1.0 (current default), tool selection occasionally hallucinates.

---

## What Gets Deleted

| Item                                  | Location                | Why it's safe to remove             |
| ------------------------------------- | ----------------------- | ----------------------------------- |
| `_ensure_products_in_output()`        | All 5 specialist agents | Products extracted by hook, not LLM |
| `_repair_json()`                      | `chat.py` line 64       | LLM no longer generates JSON        |
| JSON format instructions in prompts   | All 6 prompts           | LLM no longer responsible for JSON  |
| `MANDATORY QUERY FORMAT` SQL template | `chat.py` line 175      | Agents use tools, not raw SQL       |
| `RESPONSE FORMAT` JSON template       | `chat.py` line 186+     | Products come from tools            |
| `CRITICAL RULES` blocks               | Multiple prompts        | Simplified to 1-2 line instructions |

---

## Reliability Guarantees

After this refactor, the response pipeline has these determinism properties:

| Component             | Determinism                                    | Mechanism                                 |
| --------------------- | ---------------------------------------------- | ----------------------------------------- |
| Intent routing        | 100% deterministic                             | `classify_intent()` — pure keyword match  |
| Tool selection        | ~98% deterministic                             | LLM reads tool docstrings, temp=0.2       |
| Tool execution        | 100% deterministic                             | SQL queries on Aurora PostgreSQL          |
| Product extraction    | 100% deterministic                             | `ProductExtractor.extract()` — JSON parse |
| Product normalization | 100% deterministic                             | `ProductExtractor._normalize()`           |
| Conversational intro  | ~95% consistent                                | LLM generates 1-2 sentences, temp=0.2     |
| Overall response      | Products always correct, prose slightly varies | By design                                 |

The only non-deterministic element is the LLM's 1-2 sentence intro — and that's the one place where variation is _desirable_. "Here are some great running shoes!" vs "Check out these running shoes:" — both are fine.

---

## Migration Path

This refactor can be done incrementally. Each step is independently deployable:

### Step 1: Add `classify_intent()` to `chat.py`

Pure addition — no existing code changes. Add the function, add a log line that shows the classification result alongside the current orchestrator routing. Compare for a few dozen queries to validate accuracy.

### Step 2: Add `ProductExtractor` to `chat.py`

Pure addition. Use it alongside the existing `_parse_agent_response()` extraction. Log when they disagree. This validates that hook-based extraction matches (or beats) LLM-generated JSON extraction.

### Step 3: Strip JSON instructions from prompts

Once Step 2 confirms hook extraction is reliable, remove all "MUST include JSON" instructions from the 6 prompts. The prompts shrink dramatically. `_ensure_products_in_output()` becomes a no-op (products still arrive via hook). Keep it as a fallback for one release cycle, then remove.

### Step 4: Wire `classify_intent()` into routing

Replace the orchestrator's prompt-based routing with code-based routing. The orchestrator prompt drops to 4 lines. Test with the scripted queries from the Chat Simulation Spec.

### Step 5: Set temperature=0.2 on all specialists

Small change, big impact on consistency. Deploy and monitor.

### Step 6: Delete dead code

Remove `_ensure_products_in_output()`, `_repair_json()`, the SQL template in `_get_system_prompt()`, and the JSON format blocks from prompts. Clean cut.

---

## Prompt Hierarchy Summary

After refactoring, the prompt hierarchy is clean:

```
chat.py: classify_intent()                    ← Code, deterministic
  │
  ├── "recommendation" → recommendation_agent
  │     Prompt: who you are + which tools + tone     (4 lines)
  │     Tools: search_products, get_trending_products, get_product_by_category
  │
  ├── "pricing" → pricing_agent
  │     Prompt: who you are + which tools + tone     (4 lines)
  │     Tools: get_price_analysis, get_product_by_category, search_products
  │
  └── "inventory" → inventory_agent
        Prompt: who you are + which tools + tone     (4 lines)
        Tools: get_inventory_health, get_low_stock_products, restock_product

Product data: extracted from tool results by ProductExtractor (code, 100% reliable)
LLM output: 1-2 sentence conversational intro only (no JSON, no formatting responsibility)
```

Each prompt does exactly one thing: tell the agent its role and guide tool selection. Everything else is handled by code.
