# Kiro Session Prompt: Code Repo Migration for DAT4XX Workshop

## Context

You are working in the code repository for an AWS re:Invent workshop: [aws-samples/sample-dat406-build-agentic-ai-powered-search-apg](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg).

This was a 2025 re:Invent workshop (DAT406) that is being restructured for re:Invent 2026 (DAT4XX). A separate content repo contains the updated workshop guide pages. The content restructuring is complete. Your job is to align the code repo with the new content.

**Read `MIGRATION_GUIDE.md` in this repo root first.** It is the single source of truth for what needs to change, in what order, and what must NOT be touched. Everything below is a summary — the migration guide has the full details.

---

## What This Workshop Is

Blaize Bazaar — a fictitious e-commerce platform demonstrating agentic AI-powered search. Attendees build semantic search with Aurora PostgreSQL + pgvector, custom agent tools with Strands SDK, and multi-agent orchestration. The 2026 version adds Amazon Bedrock AgentCore (Gateway, Memory, Observability) as the production infrastructure layer.

## What Already Works (DO NOT BREAK)

- `blaize-bazaar/` — Full-stack React + FastAPI demo app. Do not modify any files in this directory.
- `notebooks/` — 8 Jupyter notebooks (exercises + solutions for Parts 1-4). Do not delete or rename. They become post-workshop reference material.
- `data/` — Product catalog CSV. Do not touch.
- `sample-images/` — Visual search samples. Do not touch.
- `scripts/load-database-fast.sh` — Database loader. Do not touch.
- `blaize-bazaar/config/` — MCP configuration for the demo app. Do not remove.
- Aurora PostgreSQL schema (tables: `product_catalog`, `conversations`, `messages`, `tool_uses`). Do not drop or alter existing tables.

## What You Need To Do

### Phase 1: Create `labs/` Directory

This is the primary deliverable. Create a new `labs/` directory with modular Python files that replace notebooks as the hands-on lab format. The notebooks stay for reference.

**Structure:**

```
labs/
├── part1_semantic_search.py
├── part2_custom_tools.py
├── part3_multi_agent.py
├── shared/
│   ├── __init__.py
│   ├── db.py              # Aurora connection pool (extract from backend/services/database.py + notebook cells)
│   ├── embeddings.py       # Titan v2 embeddings (extract from backend/services/embeddings.py + notebook cells)
│   └── config.py           # Env vars: DB_CLUSTER_ENDPOINT, DB_NAME, AWS_REGION
└── solutions/
    ├── part1_solution.py
    ├── part2_solution.py
    └── part3_solution.py
```

**Key requirements for each lab file:**

1. Self-contained and runnable: `python labs/part1_semantic_search.py`
2. Must run from the repo root directory (imports use `from shared.db import ...`)
3. Pre-built sections execute and print results automatically
4. TODO sections print a helpful message when not yet implemented (never crash)
5. Each TODO is 5-10 lines of code maximum
6. Solution files have the complete working implementation

**Extract source material from:**

- The existing notebooks in `notebooks/` (exercises + solutions)
- The existing backend services in `blaize-bazaar/backend/services/` and `blaize-bazaar/backend/agents/`
- Do NOT import from `blaize-bazaar/` at runtime — copy/adapt the relevant code into `labs/shared/`

**What goes in each lab file — see MIGRATION_GUIDE.md for full details.** Summary:

- `part1_semantic_search.py`: Keyword vs semantic comparison (pre-built), DB exploration (pre-built), embedding generation (pre-built), filtered semantic search (TODO)
- `part2_custom_tools.py`: Token efficiency demo (pre-built), `get_category_price_analysis` example (pre-built), `get_trending_products` (TODO), AgentCore Gateway registration (TODO — placeholder for Phase 2)
- `part3_multi_agent.py`: Inventory Agent (pre-built), Pricing Agent (pre-built), Recommendation Agent (TODO), AgentCore Memory config (pre-built — placeholder for Phase 2), Orchestrator wiring (TODO)

### Phase 2: AgentCore Integrations

**Important:** The AgentCore SDK (`amazon-bedrock-agentcore-sdk`) may not be available in the workshop environment yet. For Phase 2, create the integration code with clear structure but wrap AgentCore-specific imports in try/except blocks so the labs still run without the SDK installed. Use a feature flag pattern:

```python
try:
    from agentcore import GatewayClient
    AGENTCORE_AVAILABLE = True
except ImportError:
    AGENTCORE_AVAILABLE = False
    print("⚠️  AgentCore SDK not installed. Gateway features disabled.")
```

- **Part 2, Section 4:** AgentCore Gateway tool registration
- **Part 3, Section 4:** AgentCore Memory configuration
- **Part 4 notebook:** Add new sections for Observability and Runtime (read-only reference)

### Phase 3: Bootstrap Scripts

Update `scripts/bootstrap-environment.sh` to:

- Install AgentCore SDK (when available)
- Copy labs to workshop directory
- Verify shared utilities can connect to Aurora and Bedrock

Create `scripts/bootstrap-labs.sh` for lab-specific setup.

### Phase 4: CloudFormation

Update `static/genai-dat-406-labs.yml` and `static/iam_policy.json` to provision AgentCore resources (Gateway tool server, Memory namespace) and add IAM permissions.

### Phase 5: README

Update `README.md` to reflect the new structure, AgentCore additions, and `labs/` directory.

---

## Execution Order

```
Phase 1 (labs/ directory)     ← START HERE. No dependencies. Zero risk.
    ↓
Phase 2 (AgentCore)           ← Needs SDK. Use try/except pattern if not available yet.
    ↓
Phase 3 (bootstrap scripts)   ← After Phase 1 + 2 are working
    ↓
Phase 4 (CloudFormation)      ← After Phase 2 to know what resources to provision
    ↓
Phase 5 (README)              ← Last. Cleanup pass.
```

**Focus on Phase 1 first.** It's the highest-value, lowest-risk work. Get the three lab files and shared utilities working before touching anything else.

---

## Testing

After each phase, verify:

```bash
# Phase 1: Labs run without crashing (TODOs print messages, don't error)
python labs/part1_semantic_search.py
python labs/part2_custom_tools.py
python labs/part3_multi_agent.py

# Phase 1: Solutions run successfully with full output
python labs/solutions/part1_solution.py
python labs/solutions/part2_solution.py
python labs/solutions/part3_solution.py

# All phases: Demo app still works
cd blaize-bazaar && ./start-backend.sh  # Should start on port 8000
cd blaize-bazaar && ./start-frontend.sh # Should start on port 5173

# All phases: Existing notebooks still run
# (Open any notebook, select Python 3.13 kernel, Run All)
```

---

## Style Guidelines

- Python 3.13 compatible
- Type hints on all function signatures
- Docstrings on all public functions
- `json.dumps()` for structured output from tools
- Parameterized SQL queries only (never string concatenation)
- Print statements for lab output (not logging — attendees need to see results in terminal)
- Clear section separators in lab files (use comment blocks with `=` lines)
- Each TODO block includes: description, numbered steps, hints, expected output format
