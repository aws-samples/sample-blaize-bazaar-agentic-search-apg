---
inclusion: always
---

# Blaize Bazaar — Project Context

## What This Is

Blaize Bazaar is a hands-on workshop application that teaches developers how to build agentic AI-powered search using Amazon Aurora PostgreSQL, pgvector, Amazon Bedrock, Strands SDK, and Amazon Bedrock AgentCore. It's a real e-commerce storefront (React + FastAPI) where participants progressively build features by editing the actual application code.

## Workshop Structure

- Module 1: Getting Started — Environment setup, explore the storefront
- Module 2: Semantic Search — pgvector, HNSW indexes, hybrid search with Cohere Embed v4 + Rerank v3.5
- Module 3: Agent Tools — Build `@tool` functions with Strands SDK, wire up the multi-agent orchestrator
- Module 4: AgentCore Services — AgentCore Memory, Gateway (MCP), Cedar policies
- Module 5: Production Deployment — Lambda MCP servers, AgentCore Runtime, Code Interpreter

## Key Directories

- `blaize-bazaar/backend/` — FastAPI Python backend with Strands SDK agents
- `blaize-bazaar/frontend/` — React + Vite + Tailwind storefront
- `solutions/` — Drop-in solution files for each module (cp and restart)
- `scripts/` — Bootstrap and seed scripts for the workshop environment
- `lab-content/` — Workshop Studio content pages (markdown + CFN templates)
- `data/` — Product catalog CSV with pre-generated Cohere v4 embeddings
- `.kiro/specs/` — Feature specs (requirements, design, tasks)

## Database

- Aurora PostgreSQL 17.5 Serverless v2 (0-16 ACU)
- Schema: `blaize_bazaar` (product_catalog, return_policies)
- pgvector extension with HNSW indexes for 1024-dim Cohere Embed v4 vectors
- ~444 products with pre-generated embeddings
- Session management: AgentCore Memory (STM) via `agentcore_memory.py`
