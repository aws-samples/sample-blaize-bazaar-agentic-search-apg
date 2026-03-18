# Build Agentic AI-Powered Search with Amazon Aurora and Amazon Bedrock AgentCore

<div align="center">

[![AWS Workshop](https://img.shields.io/badge/AWS-Workshop-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)
[![Level 400](https://img.shields.io/badge/Level-400%20Expert-red?style=for-the-badge)](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)
[![Duration](https://img.shields.io/badge/Duration-2_Hours-blue?style=for-the-badge)](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)
[![License](https://img.shields.io/badge/License-MIT-00b300?style=for-the-badge)](LICENSE)

</div>

> 🚧 **UNDER CONSTRUCTION** — This workshop is being actively developed. Code, content, and infrastructure may change without notice.
>
> ⚠️ **Educational Workshop**: Demonstration code. Not intended for production deployment without proper security hardening.

---

## What You'll Build

Blaize Bazaar — an e-commerce platform that starts with broken keyword search and no AI. You'll progressively add semantic search, agent tools, multi-agent orchestration, and production infrastructure by editing the real application code.

| Module                              | What Happens                                      | Files You Edit                                                                        |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Teaching Your Database to Think** | Semantic search lights up in the storefront       | `services/hybrid_search.py`, `services/business_logic.py`                             |
| **Giving Your Agent Superpowers**   | AI chat answers "what's trending?" with real data | `services/agent_tools.py`                                                             |
| **Building the Agent Team**         | Multi-agent routing + AgentCore Memory & Gateway  | `agents/recommendation_agent.py`, `agents/orchestrator.py`, `services/agentcore_*.py` |
| **Going to Production**             | Cedar policies + AgentCore Runtime deployment     | `services/agentcore_policy.py`, `modules/05/`                                         |

---

## Quick Start

```bash
# Terminal 1: Backend
blaize-bazaar && start-backend

# Terminal 2: Frontend
blaize-bazaar && start-frontend
```

- Frontend: `<CloudFront-URL>/ports/5173/`
- API Docs: `<CloudFront-URL>/ports/8000/docs`

---

## Repository Structure

```
blaize-bazaar/                      # The App
├── backend/
│   ├── services/                   # TODO files live here
│   │   ├── hybrid_search.py        ← Challenge: vector search
│   │   ├── business_logic.py       ← Challenge: filtered search
│   │   ├── agent_tools.py          ← Challenge: @tool function
│   │   ├── agentcore_memory.py     ← Challenge: managed memory
│   │   ├── agentcore_gateway.py    ← Challenge: MCP gateway
│   │   └── agentcore_policy.py     ← Challenge: Cedar policies
│   ├── agents/
│   │   ├── recommendation_agent.py ← Challenge: specialist agent
│   │   ├── orchestrator.py         ← Challenge: routing prompt
│   │   ├── inventory_agent.py      Pre-built (study as pattern)
│   │   └── pricing_agent.py        Pre-built (study as pattern)
│   └── app.py                      Pre-built FastAPI server
├── frontend/                       Pre-built React storefront
│
solutions/                          # Drop-in replacements (cp and restart)
├── module2/services/               hybrid_search.py, business_logic.py
├── module3a/services/              agent_tools.py
├── module3b/agents/                recommendation_agent.py, orchestrator.py
└── module4/services/               agentcore_memory.py, agentcore_gateway.py, agentcore_policy.py

modules/05/                         # AgentCore deployment scripts
scripts/                            # Bootstrap & setup
data/                               # Product catalog (~1,000 products with embeddings)
sample-images/                      # Visual search test images
```

---

## Technology Stack

| Layer           | Technologies                                                       |
| --------------- | ------------------------------------------------------------------ |
| Database        | Aurora PostgreSQL 17.5, pgvector 0.8.0 (HNSW)                      |
| AI/ML           | Amazon Bedrock — Claude Sonnet 4, Cohere Embed v4                  |
| Agent Infra     | Amazon Bedrock AgentCore — Gateway, Memory, Observability, Runtime |
| Agent Framework | Strands Agents SDK                                                 |
| Backend         | FastAPI, Python 3.13, psycopg3, boto3                              |
| Frontend        | React 18, TypeScript 5, Tailwind CSS, Vite                         |

---

## Short on Time?

Every challenge has a solution file. Copy it over and restart:

```bash
cp solutions/module2/services/hybrid_search.py blaize-bazaar/backend/services/hybrid_search.py
source blaize-bazaar/START_BACKEND.sh
```

See `solutions/README.md` for all copy commands.

---

## Database Schema

**Table**: `bedrock_integration.product_catalog` (~1,000 products)

```sql
CREATE TABLE bedrock_integration.product_catalog (
    "productId"         VARCHAR(10) PRIMARY KEY,
    product_description TEXT NOT NULL,
    price               NUMERIC(10,2),
    stars               NUMERIC(2,1),
    reviews             INTEGER,
    category_name       VARCHAR(100),
    quantity            INTEGER DEFAULT 0,
    embedding           vector(1024)    -- Cohere Embed v4
);

CREATE INDEX idx_product_embedding_hnsw ON product_catalog
USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=128);
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
