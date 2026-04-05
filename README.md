# Build Agentic AI-Powered Search with Amazon Aurora and Amazon Bedrock AgentCore

<div align="center">

[![AWS Workshop](https://img.shields.io/badge/AWS-Workshop-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg)
[![Level 400](https://img.shields.io/badge/Level-400%20Expert-red?style=for-the-badge)](https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg)
[![License](https://img.shields.io/badge/License-MIT-00b300?style=for-the-badge)](LICENSE)

</div>

> 🚧 **UNDER CONSTRUCTION** — This workshop is being actively developed. Code, content, and infrastructure may change without notice.
>
> ⚠️ **Educational Workshop**: Demonstration code. Not intended for production deployment without proper security hardening.

---

## What You'll Build

Blaize Bazaar — an e-commerce platform that starts with broken keyword search and no AI. You'll progressively add semantic search, agent tools, multi-agent orchestration, and production infrastructure by editing the real application code.

### Two Formats, One Codebase

| Format                | Duration | Challenges              | What Participants Build                     |
| --------------------- | -------- | ----------------------- | ------------------------------------------- |
| **Workshop**          | 2 hours  | 9 challenges (all edit) | Full stack: search → agents → production    |
| **Builder's Session** | 1 hour   | 2 edit + 7 test/read    | Search + tools hands-on, rest pre-completed |

### Three Modules

| Module | Name                | Challenges                                                            | Outcome                                             |
| ------ | ------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| 1      | Smart Search        | C1: `_vector_search()`                                                | "Your database understands what customers mean."    |
| 2      | Agentic AI          | C2: `@tool`, C3: agent, C4: orchestrator                              | "A multi-agent team handles customer queries."      |
| 3      | Production Patterns | C5: runtime, C6: memory, C7: gateway, C8: observability, C9: identity | "Your agent system runs on managed infrastructure." |

---

## Quick Start

Services auto-start on the workshop instance. If running locally:

```bash
# Terminal 1: Backend (auto-reloads on .py changes)
cd blaize-bazaar/backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend (HMR on .ts/.tsx changes)
cd blaize-bazaar/frontend
npm install && npm run dev
```

---

## Repository Structure

```
blaize-bazaar/                          # The application
├── backend/
│   ├── services/
│   │   ├── hybrid_search.py            ← Challenge 1: _vector_search()
│   │   ├── agent_tools.py              ← Challenge 2: get_trending_products()
│   │   ├── agentcore_memory.py         ← Challenge 6: AgentCore STM
│   │   ├── agentcore_gateway.py        ← Challenge 7: MCP Gateway
│   │   ├── otel_trace_extractor.py     ← Challenge 8: Observability
│   │   └── (12 more pre-built services)
│   ├── agents/
│   │   ├── recommendation_agent.py     ← Challenge 3: specialist agent
│   │   ├── orchestrator.py             ← Challenge 4: multi-agent orchestrator
│   │   ├── search_agent.py             (pre-built)
│   │   ├── inventory_agent.py          (pre-built)
│   │   ├── pricing_agent.py            (pre-built)
│   │   └── customer_support_agent.py   (pre-built)
│   ├── agentcore_runtime.py            ← Challenge 5: AgentCore Runtime
│   └── app.py                          (pre-built FastAPI server)
├── frontend/
│   └── src/utils/agentIdentity.ts      ← Challenge 9: agent identity UI
│
solutions/                              # Drop-in replacements (cp and restart)
├── module1/services/                   hybrid_search.py, business_logic.py
├── module2/services/ + agents/         agent_tools.py, recommendation_agent.py, orchestrator.py
└── module3/services/ + frontend/       agentcore_*.py, otel_trace_extractor.py, agentIdentity.ts
```

scripts/ # Bootstrap & provisioning
├── bootstrap-environment.sh Stage 1: Code Editor + Python setup
├── bootstrap-labs.sh Stage 2: DB seed + deps (workshop)
├── bootstrap-labs-builders.sh Stage 2: Same + pre-complete C3-C9 (builders)
└── seed-database.sh Product catalog + return_policies + indexes

data/ # Product catalog (~444 products with embeddings)
lab-content/ # Workshop Studio content (2 formats)
├── workshop/ 2-hour workshop lab guide
└── builders/ 1-hour builder's session lab guide

````

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Database | Aurora PostgreSQL Serverless v2 (0-16 ACU), pgvector 0.8.0 (HNSW) |
| AI/ML | Amazon Bedrock — Claude Sonnet 4.6, Cohere Embed v4, Cohere Rerank v3.5 |
| Agent Infra | Amazon Bedrock AgentCore — Gateway, Memory, Observability, Runtime |
| Agent Framework | Strands Agents SDK |
| Backend | FastAPI, Python 3.13, psycopg3, boto3 |
| Frontend | React 18, TypeScript 5, Tailwind CSS, Vite |

---

## Multi-Agent Architecture

5 specialist agents + 1 orchestrator, using the "Agents as Tools" pattern:

| Agent | Domain | Tools |
|-------|--------|-------|
| Search | Product search | `search_products`, `get_product_by_category`, `compare_products` |
| Recommendation | Trending/popular | `get_trending_products`, `get_product_by_category` |
| Pricing | Price analysis | `get_price_analysis`, `search_products`, `get_product_by_category` |
| Inventory | Stock management | `get_inventory_health`, `get_low_stock_products`, `restock_product` |
| Support | Returns/support | `get_return_policy`, `search_products` |
| Orchestrator | Query routing | The 5 specialist agents (registered as tools) |

---

## Short on Time?

Every challenge has a solution file. Copy it over and the backend auto-restarts:

```bash
# Example: Skip Challenge 1
cp solutions/module1/services/hybrid_search.py blaize-bazaar/backend/services/hybrid_search.py
````

See `solutions/README.md` for all copy commands.

---

## Database Schema

**Table**: `blaize_bazaar.product_catalog` (~444 products)

```sql
CREATE TABLE blaize_bazaar.product_catalog (
    "productId"         CHAR(10) PRIMARY KEY,
    product_description VARCHAR(500) NOT NULL,
    "imgUrl"            VARCHAR(200),
    "productURL"        VARCHAR(40),
    stars               NUMERIC(2,1),
    reviews             INTEGER,
    price               NUMERIC(8,2),
    category_id         SMALLINT,
    "isBestSeller"      BOOLEAN DEFAULT FALSE,
    "boughtInLastMonth" INTEGER,
    category_name       VARCHAR(50) NOT NULL,
    quantity            SMALLINT,
    embedding           vector(1024)    -- Cohere Embed v4
);
```

**Table**: `blaize_bazaar.return_policies` (21 rows)

```sql
CREATE TABLE blaize_bazaar.return_policies (
    category_name       VARCHAR(50) PRIMARY KEY,
    return_window_days  INTEGER,
    conditions          TEXT,
    refund_method       TEXT
);
```

---

## Resources

- [Aurora PostgreSQL with pgvector](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Strands Agents SDK](https://strandsagents.com/latest/)
- [pgvector 0.8.0 Performance](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/)
- [AWS Labs MCP Servers](https://awslabs.github.io/mcp/)

---

## License

MIT-0 License. See [LICENSE](./LICENSE).

---

**Workshop by Shayon Sanyal** — Principal Database Specialist SA, AWS
