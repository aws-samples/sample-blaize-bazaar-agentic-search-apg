# Workshop Code Migration Guide: DAT406 (2025) → DAT4XX (2026)

## Purpose

This document is the handoff between the **content repo** (workshop guide pages) and the **code repo** ([aws-samples/sample-dat406-build-agentic-ai-powered-search-apg](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)). The content has been restructured for re:Invent 2026. This guide tells you exactly what needs to change in the code repo to align, in what order, and what NOT to break.

---

## Golden Rule: Don't Break What Works

The Blaize Bazaar app (backend + frontend), the database schema, the dataset, the CloudFormation templates, and the bootstrap scripts are all proven from 2025. **Do not rewrite them.** The changes are additive — new lab files, new integrations layered on top, and the notebooks preserved as reference material.

---

## Phase 1: Create the `labs/` Directory (No Breaking Changes)

This is purely additive. The existing `notebooks/` folder stays untouched.

### New directory structure to create:

```
labs/
├── part1_semantic_search.py
├── part2_custom_tools.py
├── part3_multi_agent.py
├── shared/
│   ├── __init__.py
│   ├── db.py              # Extract from notebooks — Aurora connection pool via psycopg3
│   ├── embeddings.py       # Extract from notebooks — Titan v2 embedding generation
│   └── config.py           # Extract from notebooks — env vars (DB_CLUSTER_ENDPOINT, etc.)
└── solutions/
    ├── part1_solution.py
    ├── part2_solution.py
    └── part3_solution.py
```

### Where to extract shared code from:

| File                   | Source                                                                    | What it does                                                                            |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `shared/db.py`         | `blaize-bazaar/backend/services/database.py` + notebook connection cells  | `get_db_connection()` using psycopg3, connection pool setup, parameterized query helper |
| `shared/embeddings.py` | `blaize-bazaar/backend/services/embeddings.py` + notebook embedding cells | `generate_embedding(text)` calling Titan Text Embeddings v2 via Bedrock                 |
| `shared/config.py`     | Notebook env setup cells                                                  | Read `DB_CLUSTER_ENDPOINT`, `DB_NAME`, `AWS_REGION` from environment                    |

### Lab file structure (each file follows this pattern):

```python
#!/usr/bin/env python3
"""Part N: [Title] — Blaize Bazaar Workshop"""

import json
from shared.db import get_db_connection
from shared.embeddings import generate_embedding
from shared.config import DB_CONFIG

# ============================================================
# Section 1: [Pre-built demo section — runs and prints output]
# ============================================================

def section_1_demo():
    """Pre-built: demonstrates the concept with output."""
    # Complete implementation that runs and shows results
    print("=== Section 1: [Title] ===")
    # ... working code ...
    print(f"Results: {results}")

# ============================================================
# Section 2: [Another pre-built section]
# ============================================================

def section_2_demo():
    """Pre-built: another demonstration."""
    # ...

# ============================================================
# Section 3: TODO — Your Implementation
# ============================================================

def section_3_todo():
    """
    TODO: [Clear description of what to build]

    Steps:
    1. ...
    2. ...
    3. ...

    Hints:
    - [Specific SQL or code hint]
    - [Expected output format]
    """
    # TODO: Your implementation here (N lines)
    pass

# ============================================================
# Main — runs all sections sequentially
# ============================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Part N: [Title]")
    print("="*60 + "\n")

    section_1_demo()
    print()
    section_2_demo()
    print()

    print("--- YOUR TURN ---")
    result = section_3_todo()
    if result:
        print(f"✅ Success! {result}")
    else:
        print("⏳ TODO: Implement section_3_todo() and re-run")
```

### What goes in each lab file:

**part1_semantic_search.py:**

- Section 1 (pre-built): Keyword vs semantic search comparison — run both, print side-by-side
- Section 2 (pre-built): Database exploration — show pgvector version, product count, HNSW params
- Section 3 (pre-built): Embedding generation demo — generate one embedding, run basic similarity search
- Section 4 (TODO): `semantic_search_with_filters()` — combine vector search with price/rating/category/stock filters
- Source: Extract from `Part_1_Semantic_Search_Foundations_Exercises.ipynb` + `_Solutions.ipynb`

**part2_custom_tools.py:**

- Section 1 (pre-built): Token efficiency demo — show raw dump vs structured tool response token counts
- Section 2 (pre-built): Complete `get_category_price_analysis()` tool example with `@tool` decorator
- Section 3 (TODO): Build `get_trending_products()` — same exercise as 2025 but in .py format
- Section 4 (TODO): Register tools in AgentCore Gateway — **NEW for 2026** (see Phase 2)
- Source: Extract from `Part_2_Context_Management_Custom_Tools_Exercises.ipynb` + `_Solutions.ipynb`

**part3_multi_agent.py:**

- Section 1 (pre-built): Inventory Agent — complete example with `@tool` decorator wrapping an Agent
- Section 2 (pre-built): Pricing Agent — second complete example
- Section 3 (TODO): Build Recommendation Agent — follow the pattern
- Section 4 (pre-built): AgentCore Memory configuration — **NEW for 2026** (see Phase 2)
- Section 5 (TODO): Wire up Orchestrator system prompt + agent registration
- Source: Extract from `Part_3_Multi_Agent_Orchestration_Exercises.ipynb` + `_Solutions.ipynb`

### Validation:

```bash
# Each lab file must run without errors when TODOs are filled in
python labs/part1_semantic_search.py
python labs/part2_custom_tools.py
python labs/part3_multi_agent.py

# Each lab file must run without CRASHING when TODOs are NOT filled in
# (should print "TODO: implement..." messages, not tracebacks)
```

---

## Phase 2: Add AgentCore Integrations (New Code)

These are the new 2026 additions. They layer on top of existing code.

### 2A: AgentCore Gateway Integration (Part 2, Section 4)

**What:** Register the existing `@tool` functions in AgentCore Gateway for secure discovery.

**Where:** `labs/part2_custom_tools.py` Section 4 + `labs/solutions/part2_solution.py`

**Dependencies:** `amazon-bedrock-agentcore-sdk` (add to `requirements.txt`)

**Implementation pattern:**

```python
from agentcore import GatewayClient

gateway = GatewayClient(tool_server_name="blaize-bazaar-tools")
gateway.register_tool(get_trending_products)
gateway.register_tool(get_category_price_analysis)
gateway.register_tool(semantic_product_search)
# ... etc

# Verify semantic discovery
results = gateway.discover_tools("What products are popular?")
```

**Pre-provisioning needed:** The CloudFormation template must create the AgentCore Gateway tool server. Add to `static/genai-dat-406-labs.yml`.

### 2B: AgentCore Memory Integration (Part 3, Section 4)

**What:** Replace hand-rolled Aurora session tables with managed memory.

**Where:** `labs/part3_multi_agent.py` Section 4 + `labs/solutions/part3_solution.py`

**Implementation pattern:**

```python
from agentcore import MemoryClient

memory = MemoryClient(
    namespace="blaize-bazaar",
    short_term_strategy="conversation",
    long_term_strategy="preferences"
)

# Pass to orchestrator
orchestrator = Agent(
    model=BedrockModel(...),
    system_prompt=ORCHESTRATOR_PROMPT,
    tools=[inventory_agent, pricing_agent, recommendation_agent],
    memory=memory
)
```

**Pre-provisioning needed:** AgentCore Memory namespace in CloudFormation.

**Important:** The existing Aurora session tables (`conversations`, `messages`, `tool_uses`) stay in the schema. They're still used by the Blaize Bazaar demo app. The labs show AgentCore Memory as the modern alternative. Don't delete the tables.

### 2C: AgentCore Observability (Part 4 notebook, reference only)

**What:** Add OTel tracing examples to the Part 4 notebook.

**Where:** Update `notebooks/Part_4_Advanced_Topics_Production_Patterns.ipynb` — add a new Section 1 for AgentCore Observability before the existing sections.

**This is read-only reference material, not hands-on.** Show the configuration and example trace output.

### 2D: AgentCore Runtime (Part 4 notebook, reference only)

**What:** Show how to deploy the Strands agents to AgentCore Runtime.

**Where:** Same Part 4 notebook, new Section 2.

**Read-only.** Show the deployment config and architecture diagram. Don't make attendees deploy live.

---

## Phase 3: Update Bootstrap & Environment Scripts

### `scripts/bootstrap-labs.sh` (NEW)

Create a new bootstrap script that:

1. Copies `labs/` to the workshop directory
2. Installs any new Python dependencies (`amazon-bedrock-agentcore-sdk`)
3. Verifies `shared/db.py` can connect to Aurora
4. Verifies `shared/embeddings.py` can call Bedrock

### `scripts/bootstrap-environment.sh` (UPDATE)

Add:

- AgentCore SDK installation
- AgentCore Gateway tool server verification
- AgentCore Memory namespace verification
- Shell alias: keep existing `blaize-bazaar`, `start-backend`, `start-frontend`

### `requirements.txt` updates:

Add to the existing `notebooks/requirements.txt` (or create `labs/requirements.txt`):

```
amazon-bedrock-agentcore-sdk>=1.0.0
```

---

## Phase 4: Update CloudFormation Template

### `static/genai-dat-406-labs.yml` (UPDATE)

Add resources for:

1. **AgentCore Gateway tool server** — `blaize-bazaar-tools` with IAM auth
2. **AgentCore Memory namespace** — `blaize-bazaar`
3. **IAM permissions** — Add AgentCore permissions to the participant role

### `static/iam_policy.json` (UPDATE)

Add:

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeAgent*",
    "bedrock:CreateAgentCore*",
    "bedrock:GetAgentCore*",
    "bedrock:ListAgentCore*",
    "bedrock:UpdateAgentCore*"
  ],
  "Resource": "*"
}
```

**Note:** Verify exact IAM action names against the AgentCore API when implementing. The above are placeholders — the actual actions may differ.

---

## Phase 5: Update Existing Files (Minimal Changes)

### `notebooks/` — Keep ALL existing notebooks

Do NOT delete or rename any notebook. They become post-workshop reference material. The content guide now says:

> "Reference notebooks with detailed explanations are available in the `notebooks/` folder for post-workshop review."

### `blaize-bazaar/` — No changes to the app

The demo app stays exactly as-is. It still uses its own session management, direct database connections, and MCP config. The labs teach the patterns; the app demonstrates the production implementation.

### `README.md` — Update

- Change title to reference AgentCore
- Update repo structure to show `labs/` directory
- Update workshop structure table (25 min per part, not 30/25/25)
- Add AgentCore to technology stack table
- Keep everything else (API reference, schema, cost analysis, etc.)

---

## Dependency Map (What Blocks What)

```
Phase 1 (labs/ directory)          ← Can start immediately, no dependencies
    ↓
Phase 2A (Gateway integration)     ← Needs AgentCore SDK available
Phase 2B (Memory integration)      ← Needs AgentCore SDK available
Phase 2C-D (Part 4 notebook)       ← Can happen in parallel with 2A/2B
    ↓
Phase 3 (bootstrap scripts)        ← Needs Phase 1 + 2 complete
    ↓
Phase 4 (CloudFormation)           ← Needs Phase 2 to know what resources to provision
    ↓
Phase 5 (README + cleanup)         ← Last, after everything works
```

**Critical path:** Phase 1 → Phase 2A/2B → Phase 3 → Phase 4

**Parallel work:** Phase 2C/2D can happen anytime. Phase 5 is cleanup.

---

## Testing Checklist

Before considering the migration complete:

- [ ] `python labs/part1_semantic_search.py` runs with TODOs empty (prints TODO messages, no crashes)
- [ ] `python labs/solutions/part1_solution.py` runs successfully with full output
- [ ] `python labs/part2_custom_tools.py` runs with TODOs empty (no crashes)
- [ ] `python labs/solutions/part2_solution.py` runs successfully, tools registered in Gateway
- [ ] `python labs/part3_multi_agent.py` runs with TODOs empty (no crashes)
- [ ] `python labs/solutions/part3_solution.py` runs successfully, multi-agent conversation works
- [ ] AgentCore Gateway shows all 7 tools registered and discoverable
- [ ] AgentCore Memory maintains context across multi-turn conversation in Part 3
- [ ] Blaize Bazaar demo app still works (start-backend, start-frontend, all features)
- [ ] All existing notebooks still run without errors
- [ ] Bootstrap scripts complete without errors on a fresh environment
- [ ] CloudFormation deploys successfully with AgentCore resources

---

## What NOT to Change

| Component                             | Why                                             |
| ------------------------------------- | ----------------------------------------------- |
| `blaize-bazaar/backend/`              | Working production demo — don't touch           |
| `blaize-bazaar/frontend/`             | Working production demo — don't touch           |
| `notebooks/*.ipynb`                   | Preserved as reference material — don't delete  |
| `data/`                               | Dataset unchanged — don't touch                 |
| `sample-images/`                      | Visual search samples — don't touch             |
| Aurora schema                         | Tables stay as-is, AgentCore Memory is additive |
| `scripts/load-database-fast.sh`       | Data loading unchanged — don't touch            |
| MCP config in `blaize-bazaar/config/` | Demo app still uses MCP — don't remove          |

---

## Content ↔ Code Alignment Reference

| Content Page              | Code Artifact                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| Part 1 lab instructions   | `labs/part1_semantic_search.py`                                        |
| Part 1 solution reference | `labs/solutions/part1_solution.py`                                     |
| Part 2 lab instructions   | `labs/part2_custom_tools.py`                                           |
| Part 2 solution reference | `labs/solutions/part2_solution.py`                                     |
| Part 3 lab instructions   | `labs/part3_multi_agent.py`                                            |
| Part 3 solution reference | `labs/solutions/part3_solution.py`                                     |
| Part 4 reference          | `notebooks/Part_4_Advanced_Topics_Production_Patterns.ipynb` (updated) |
| Demo page                 | `blaize-bazaar/` (unchanged)                                           |
| Troubleshooting           | `scripts/bootstrap-*.sh` (updated)                                     |
