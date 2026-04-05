---
inclusion: always
---

# Blaize Bazaar Coding Standards

## Python Backend (blaize-bazaar/backend/)

- All agent tools use the `@tool` decorator from `strands` and return `str` (JSON serialized)
- Tool functions follow `verb_noun` naming: `search_products`, `get_trending_products`, `restock_product`
- Agent functions follow `domain_agent` naming: `search_agent`, `customer_support_agent`
- All tools check `_db_service` availability before DB operations
- Async DB calls use `_run_async()` helper for sync-to-async bridging
- Error handling returns `json.dumps({"error": str(e)})` consistently
- Model references use `settings.BEDROCK_CHAT_MODEL` (currently `global.anthropic.claude-sonnet-4-6`)
- Orchestrator uses `global.anthropic.claude-haiku-4-5-20251001-v1:0` with `temperature=0.0`
- Specialist agents use `temperature=0.2`

## TypeScript Frontend (blaize-bazaar/frontend/)

- Agent types defined in `src/utils/agentIdentity.ts` — single source of truth
- `resolveAgentType()` priority: support > search > inventory > pricing > recommendation > orchestrator
- Six agent types: orchestrator, search, recommendation, pricing, inventory, support

## Architecture

- 5 specialist agents: Search, Recommendation, Pricing, Inventory, Customer Support
- Orchestrator routes to specialists via Strands SDK "Agents as Tools" pattern
- Intent classification priority: pricing > inventory > support > search > recommendation (default)
- AgentCore Gateway provides alternative MCP-based tool discovery path
