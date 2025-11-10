# Amazon Q Developer Prompts for DAT406 Workshop
## Blaize Bazaar - Agentic AI-Powered Search with Aurora PostgreSQL

> **Workshop**: DAT406 - Build Agentic AI-Powered Search with Amazon Aurora and RDS  
> **Level**: 400 (Expert)  
> **AWS re:Invent 2025**

Use these prompts with Amazon Q Developer in your IDE to progressively understand the Blaize Bazaar architecture.

---

## 📚 Workshop Structure

**Part 1**: Agent Memory (Semantic Search + Sessions) - 25 min  
**Part 2**: MCP Context Management & Custom Tools - 20 min  
**Part 3**: Multi-Agent Orchestration - 25 min  
**Part 4**: Advanced Topics (Optional) - Session management, production patterns

---

## 🎯 Progressive Learning Prompts

### 1. High-Level: What is Blaize Bazaar?

```
What is Blaize Bazaar and what problem does it solve?
- What is the business use case (e-commerce product search)?
- Why use AI agents instead of traditional search?
- What are the key technologies: Aurora PostgreSQL, pgvector, Strands SDK, Claude Sonnet 4?
- How does it demonstrate production-ready agentic AI patterns?

Give me a 2-minute executive summary.
```

**Use for**: Understanding the business context and value proposition.

---

### 2. High-Level: System Architecture Overview

```
Explain the Blaize Bazaar architecture at a high level:
- Frontend: React app with chat interface and monitoring dashboards
- Backend: FastAPI with multi-agent orchestration
- Database: Aurora PostgreSQL with pgvector for semantic search
- Agents: Orchestrator + Recommendation + Inventory + Pricing specialists
- Key patterns: "Agents as Tools", MCP context management, OpenTelemetry tracing

Show me a simple diagram of how a user query flows through the system.
```

**Use for**: Understanding the overall architecture before diving into details.

---

### 3. Part 1: Agent Memory - Semantic Search & Sessions

```
Guide me through Part 1 - Agent Memory (Semantic Search + Sessions):
- How does Amazon Bedrock Titan generate 1024-dim embeddings?
- How is pgvector extension used in Aurora PostgreSQL?
- What is the product_catalog table schema (productId, embedding, price, stars)?
- How does HNSW index work for fast similarity search?
- What is the <=> operator and why use SET enable_seqscan=off?
- How does semantic search provide context for agents (RAG pattern)?

Show me the complete embedding generation and vector search code.
```

**Use for**: Part 1 notebook - Building semantic search foundation.

---

### 4. Part 2: Custom Tools & MCP Context Management

```
Guide me through Part 2 - MCP Context Management & Custom Tools:
- What is MCP (Model Context Protocol) and why is it important?
- How does MCPContextManager track tokens with tiktoken?
- What are the three custom tools built in Part 2?
  * get_trending_products(limit) - engagement scoring
  * semantic_product_search(query, limit) - vector search
  * get_category_price_analysis(category) - pricing stats
- How does @tool decorator work in Strands SDK?
- How do these tools reduce context from 50K+ tokens to ~2K tokens?

Show me the complete implementation of get_trending_products().
```

**Use for**: Part 2 notebook - Building custom tools and understanding token optimization.

---

### 5. Part 3: Multi-Agent Orchestration (Agents as Tools)

```
Guide me through Part 3 - Multi-Agent Orchestration:
- What is the "Agents as Tools" pattern?
- How does the Orchestrator Agent coordinate specialist agents?
- What tools does each specialist agent have?
  * Recommendation Agent: semantic_product_search(), get_trending_products()
  * Pricing Agent: get_category_price_analysis(), semantic_product_search()
  * Inventory Agent: check_inventory_levels()
- How are agents wrapped as @tool functions for the Orchestrator?
- How does MCP manage context across multiple agent calls?

Show me how the Orchestrator routes "Find laptops under $800" to the right agent.
```

**Use for**: Part 3 notebook - Building multi-agent systems.

---

### 6. Blaize Bazaar Full-Stack Application

```
Explain the Blaize Bazaar production application:
- Frontend: React (Header.tsx, AIAssistant.tsx, SearchOverlay.tsx)
- Backend: FastAPI (app.py, chat.py, services/)
- Key endpoints: /api/chat, /api/search, /api/mcp/stats
- Real-time features: Server-Sent Events for agent execution updates
- Monitoring dashboards:
  * Agent Reasoning Traces - see agent decision flow
  * MCP Context Dashboard - token usage and costs
  * SQL Inspector - query performance
  * Index Performance - HNSW index stats

Show me how the chat flow works from user input to agent response.
```

**Use for**: Understanding the complete production application.

---

### 7. MCP Context Management Deep-Dive

```
Explain MCP (Model Context Protocol) implementation:
- What is MCPContextManager in services/mcp_context_manager.py?
- How does tiktoken count tokens accurately (cl100k_base encoding)?
- What is the Context Pyramid (Raw Data → Structured Tools → MCP → Agent)?
- How does intelligent pruning work at 85% capacity (153K/180K tokens)?
- How is cost calculated: (tokens / 1M) × $3.00 for Claude Sonnet 4?
- What is the importance scoring algorithm for message pruning?

Show me the token budgeting strategy and pruning logic.
```

**Use for**: Understanding production context window management (Part 2 & 4).

---

### 8. OpenTelemetry & Observability

```
How does OpenTelemetry work in Blaize Bazaar?
- Where is Strands OpenTelemetry initialized? (app.py startup)
- What traces are captured?
  * Agent invocations (which agent, duration, tokens)
  * Tool calls (which tool, parameters, results)
  * LLM calls (prompt tokens, completion tokens, latency)
- How does the Agent Reasoning Traces UI display this data?
- How to export traces to AWS X-Ray or Jaeger?
- What metrics are tracked: token usage, costs, latency, success rates?

Show me the trace capture and visualization flow.
```

**Use for**: Understanding observability and production debugging (Part 4).

---

### 9. Database Schema & Session Management

```
Explain the Aurora PostgreSQL database schema:
- Product catalog: bedrock_integration.product_catalog (21,704 products)
  * Key columns: "productId", embedding vector(1024), price, stars, reviews
  * HNSW index on embedding for fast similarity search
- Session tables (Part 4):
  * conversations - session tracking with agent_name and context
  * messages - conversation history
  * session_metadata - user preferences
  * tool_uses - tool invocation tracking
- Why camelCase with quotes? ("imgUrl", "isBestSeller")

Show me the complete schema and how sessions are persisted.
```

**Use for**: Understanding the database foundation (Part 1 & 4).

---

### 10. Add a New Custom Tool

```
I want to create a new tool "get_low_stock_products" that:
- Finds products with quantity < 50
- Returns product details with stock levels
- Uses the @tool decorator from Strands SDK
- Integrates with the existing database connection

Show me:
1. Complete tool implementation with @tool decorator
2. SQL query to fetch low stock products
3. How to add it to an agent's tools list
4. Example of how the agent would use it
```

**Use for**: Extending the system with new tools (Part 2 exercise).

---

### 11. Production Deployment Best Practices

```
What are the production deployment best practices for Blaize Bazaar?
- Security: CORS configuration, API authentication, rate limiting
- Database: Connection pooling, query optimization, index maintenance
- Observability: OpenTelemetry export to X-Ray, CloudWatch metrics, alarms
- Cost optimization: Token budgeting, MCP pruning, caching strategies
- Resilience: Error handling, retry logic, circuit breakers
- Secrets: AWS Secrets Manager for credentials
- Deployment: ECS/EKS for backend, CloudFront for frontend, RDS Proxy

Show me the key configuration changes needed for production.
```

**Use for**: Preparing for production deployment (Part 4).

---

## 💡 How to Use These Prompts

1. **Copy the prompt** you need
2. **Open Amazon Q Developer** in your IDE (Chat panel)
3. **Paste and run** - Q will analyze your codebase and provide answers
4. **Ask follow-ups** to dive deeper into specific areas
5. **Try the code** Q suggests in your notebooks or application

---

**Happy Learning! 🎉**

*DAT406 - Build Agentic AI-Powered Search with Amazon Aurora and Amazon RDS*  
*AWS re:Invent 2025*
