# Amazon Q Developer Prompts for DAT406 Workshop
## Blaize Bazaar - Agentic AI-Powered Search with Aurora PostgreSQL

> **Workshop**: DAT406 - Build Agentic AI-Powered Search with Amazon Aurora and RDS  
> **Level**: 400 (Expert)  
> **AWS re:Invent 2025**

Use these 10 essential prompts with Amazon Q Developer in your IDE to explore the Blaize Bazaar architecture.

---

## 📚 Workshop Structure

**Part 1**: Agent Memory Foundation - Semantic Search as Agent Context  
**Part 2**: Agent Tool Development - Custom Tools with Strands SDK  
**Part 3**: Agent Orchestration Systems - Agents as Tools Pattern  
**Demo**: Blaize Bazaar App - Full-stack Production Application

---

## 🎯 Essential Prompts

### 1. Complete Architecture Overview

```
@workspace Explain the Blaize Bazaar architecture end-to-end:
- React frontend → FastAPI backend → Aurora PostgreSQL
- Multi-agent system (Orchestrator + 3 specialist agents)
- Data flow: chat.py → orchestrator → agents → tools → database
- MCP Context Manager for token tracking
- OpenTelemetry for trace capture

Show me the complete flow for: "Show me wireless headphones under $100"
```

**Use for**: Understanding the big picture and how all components connect.

---

### 2. Part 1: Semantic Search & RAG

```
@workspace Guide me through Part 1 - Agent Memory Foundation:
- How to generate 1024-dim embeddings with Amazon Titan (embeddings.py)
- How to store vectors in Aurora PostgreSQL with pgvector extension
- How to create HNSW index for fast similarity search
- How to query with <=> operator and optimize with enable_seqscan=off
- How semantic search provides context for agents (RAG pattern)

Show me the complete vector search SQL query in app.py /api/search endpoint.
```

**Use for**: Lab Part 1 - Building the knowledge base for agents.

---

### 3. Part 2: Custom Tools with Strands SDK

```
@workspace Guide me through Part 2 - Agent Tool Development:
- How @tool decorator works in Strands SDK (agent_tools.py)
- How to implement custom business logic (business_logic.py)
  * get_inventory_health() - stock levels
  * get_price_statistics() - pricing analytics
  * semantic_product_search() - vector search
- How to integrate with database using asyncpg (database.py)
- How to register tools with set_db_service()

Show me how to create a new tool called "get_best_sellers" step-by-step.
```

**Use for**: Lab Part 2 - Building tools that agents can use.

---

### 4. Part 3: Multi-Agent Orchestration

```
@workspace Guide me through Part 3 - Agent Orchestration Systems:
- How orchestrator routes queries to specialists (orchestrator.py)
- How specialist agents are defined as @tool functions:
  * inventory_restock_agent - stock management
  * price_optimization_agent - pricing analysis
  * product_recommendation_agent - product search
- How agents-as-tools pattern works in Strands SDK
- How OpenTelemetry captures agent execution traces

Show me the complete agent chain for: "What products need restocking?"
```

**Use for**: Lab Part 3 - Building multi-agent coordination.

---

### 5. Demo: Blaize Bazaar Full-Stack App

```
@workspace Explain the Blaize Bazaar demo application:
- Frontend: React components (AIAssistant.tsx, AgentReasoningTraces.tsx)
- Backend: FastAPI endpoints (/api/chat, /api/search, /api/mcp/stats)
- Real-time features: agent-execution-complete events, token tracking
- Monitoring: SQL Inspector, Index Performance, MCP Dashboard, Agent Traces
- Production patterns: MCP Context Manager, OpenTelemetry, connection pooling

Show me how to access each monitoring dashboard in the UI.
```

**Use for**: Understanding the complete production application.

---

### 6. MCP Context Protocol Deep-Dive

```
@workspace Explain MCP (Model Context Protocol) implementation:
- What is MCPContextManager in mcp_context_manager.py?
- How does it track tokens with tiktoken (cl100k_base encoding)?
- How does intelligent pruning work at 85% capacity (153K tokens)?
- How is cost calculated: (tokens / 1M) × $3.00 for Claude Sonnet 4?
- How is efficiency score computed: 40% utilization + 30% pruning + 30% recency?

Show me where MCP manager is used in chat.py for token tracking.
```

**Use for**: Understanding production context window management.

---

### 7. OpenTelemetry Tracing

```
@workspace How does OpenTelemetry work in Blaize Bazaar?
- Where is Strands OpenTelemetry initialized? (app.py lifespan)
- What does the custom trace formatter capture?
  * ✨ Agent invocations with duration and tokens
  * 🤖 LLM calls with prompt/completion tokens
  * 🔄 Event loop cycles
- How does otel_trace_extractor.py extract trace data?
- How to export traces to Jaeger or CloudWatch X-Ray?

Show me the custom format_trace() function in app.py.
```

**Use for**: Understanding observability and production debugging.

---

### 8. Database Schema & pgvector

```
@workspace Explain the Aurora PostgreSQL setup:
- Table: bedrock_integration.product_catalog (21,704 products)
- Key columns: "productId", embedding (vector(1024)), price, stars, reviews
- Why camelCase with quotes? ("imgUrl", "isBestSeller")
- HNSW index on embedding column for fast similarity search
- Connection pooling with asyncpg (5-20 connections)

Show me the table schema and HNSW index creation SQL.
```

**Use for**: Understanding the database foundation.

---

### 9. Add a New Agent

```
@workspace I want to create a "Customer Service Agent" for returns/refunds:
1. Create customer_service_agent.py following the pattern
2. Define tools: process_return(), check_refund_status()
3. Add to orchestrator's tools list in orchestrator.py
4. Update orchestrator prompt to route customer service queries

Provide complete code for all 4 steps.
```

**Use for**: Extending the system with new agents.

---

### 10. Production Deployment Checklist

```
@workspace What changes are needed for production deployment?
- CORS: Change from allow_origins=["*"] to specific domains
- Database: Tune connection pool (min_size, max_size, timeout)
- OpenTelemetry: Switch from console to OTLP exporter for X-Ray
- Security: Add API authentication, rate limiting, input validation
- Monitoring: Enable CloudWatch metrics, set up alarms
- Environment: Use AWS Secrets Manager for credentials

Show me the specific code changes in app.py and config.py.
```

**Use for**: Preparing for production deployment.

---

## 💡 How to Use These Prompts

1. **Copy the prompt** you need
2. **Open Amazon Q Developer** in your IDE
3. **Paste and run** - Q will analyze your codebase
4. **Ask follow-ups** to dive deeper
5. **Try the code** Q suggests

## 🎓 Learning Path

**Workshop Flow**:
1. Prompt 2 → Part 1: Semantic Search
2. Prompt 3 → Part 2: Custom Tools
3. Prompt 4 → Part 3: Agent Orchestration
4. Prompt 5 → Demo: Full Application

**Deep Dives**:
- Prompt 1 → Architecture overview
- Prompt 6 → MCP context management
- Prompt 7 → OpenTelemetry tracing
- Prompt 8 → Database & pgvector

**Extensions**:
- Prompt 9 → Add new agents
- Prompt 10 → Production deployment

## 🚀 Next Steps

1. Complete all 3 lab parts (Jupyter notebooks)
2. Explore the Blaize Bazaar demo app
3. Use prompts 9-10 to extend and deploy
4. Share your learnings with the community

---

**Happy Learning! 🎉**

*DAT406 - AWS re:Invent 2025*
