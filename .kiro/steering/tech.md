---
inclusion: always
---

# Blaize Bazaar — Tech Stack

## Backend

- Python 3.13, FastAPI, uvicorn
- Strands Agents SDK — `@tool` decorator, `Agent` class, `BedrockModel`
- psycopg 3 (async) with connection pooling
- Amazon Bedrock: Claude Sonnet 4.6 (agents), Claude Haiku 4.5 (orchestrator), Cohere Embed v4 (embeddings), Cohere Rerank v3.5
- Amazon Aurora PostgreSQL 17.5 Serverless v2 with pgvector 0.8.0
- bedrock-agentcore SDK for Memory, Gateway, Policy, Runtime

## Frontend

- React 18, TypeScript, Vite
- Tailwind CSS
- SSE streaming for real-time agent responses

## Infrastructure

- CloudFormation nested stacks (VPC, Database, Code Editor)
- Aurora Serverless v2 (0-16 ACU, scale-to-zero)
- EC2 (c6g.2xlarge Graviton) with CloudFront for Code Editor
- Workshop Studio for provisioning

## Key Dependencies

- `strands-agents` — Agent framework
- `strands-agents-tools` — AgentCore Code Interpreter
- `bedrock-agentcore` — Memory, Gateway, Policy SDKs
- `mcp` — Model Context Protocol client (streamable HTTP)
- `psycopg[binary,pool]` — PostgreSQL async driver
- `pydantic-settings` — Configuration management

## Build & Run

- Backend: `cd blaize-bazaar/backend && uvicorn app:app --reload --host 0.0.0.0 --port 8000`
- Frontend: `cd blaize-bazaar/frontend && npm run dev`
- Solutions: `cp solutions/moduleN/path/file.py blaize-bazaar/backend/path/file.py`
- Database seed: `bash scripts/seed-database.sh`
