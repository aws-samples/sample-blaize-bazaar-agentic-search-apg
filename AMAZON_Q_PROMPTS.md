# Amazon Q Developer Prompts for DAT406 Workshop
## Blaize Bazaar - Agentic AI-Powered Search with Aurora PostgreSQL

> **Workshop**: DAT406 - Build Agentic AI-Powered Search with Amazon Aurora and RDS  
> **Level**: 400 (Expert)  
> **AWS re:Invent 2025**

This guide provides curated Amazon Q Developer prompts to help you explore and understand the Blaize Bazaar architecture. Use these prompts in your IDE with Amazon Q Developer to get contextual, code-aware explanations.

---

## 🎯 Architecture Deep-Dive Prompts

### 1. Complete Architecture Overview

```
@workspace Explain the complete Blaize Bazaar architecture from frontend to database. 
Show me:
- How the React frontend communicates with FastAPI backend
- The multi-agent system with Orchestrator, Inventory, Pricing, and Recommendation agents
- How agents use custom business logic tools via @tool decorators
- The database access pattern (asyncpg → business_logic.py → Aurora PostgreSQL)
- MCP Context Manager's role in token tracking
- OpenTelemetry integration for trace capture

Include the data flow for a typical user query like "Show me wireless headphones under $100"
```

**What you'll learn**: End-to-end architecture, data flow patterns, and how all components work together.

---

### 2. Vector Search Deep-Dive

```
@workspace How does semantic search work in Blaize Bazaar? Explain:
- Amazon Titan Text Embeddings v2 (1024 dimensions)
- pgvector extension with HNSW index
- The vector similarity search query in app.py /api/search endpoint
- How embeddings are generated in embeddings.py
- The difference between vector search and hybrid search (RRF algorithm)
- Index performance optimization (ef_search parameter, enable_seqscan=off)

Show me the SQL query used for vector similarity search.
```

**What you'll learn**: RAG fundamentals, vector embeddings, pgvector HNSW index, and performance optimization.

---

### 3. Multi-Agent System Architecture

```
@workspace Explain the multi-agent system architecture in detail:
- How does the Orchestrator agent route queries to specialist agents?
- What tools does each specialist agent have access to?
  * Inventory Agent: get_inventory_health, restock_product
  * Pricing Agent: get_price_statistics, get_product_by_category
  * Recommendation Agent: semantic_product_search, get_trending_products
- How do @tool decorated functions in agent_tools.py work?
- How does business_logic.py execute database queries?
- Show me the code flow from chat.py → orchestrator.py → specialist agents → tools → database
```

**What you'll learn**: Agentic AI patterns, tool use, agent orchestration, and reasoning workflows.

---

### 4. MCP Context Protocol Implementation

```
@workspace Explain the Model Context Protocol (MCP) implementation:
- What is MCPContextManager and what does it do?
- How does it track tokens using tiktoken (cl100k_base encoding)?
- What is the 200K context window management strategy?
- How does intelligent pruning work at 85% capacity?
- How is cost calculated ($3.00 per 1M tokens for Claude Sonnet 4)?
- What is the efficiency score formula (40% utilization + 30% pruning + 30% recency)?
- Show me where MCP manager is used in chat.py
```

**What you'll learn**: Context window management, token optimization, cost control, and production patterns.

---

### 5. OpenTelemetry Tracing

```
@workspace How does OpenTelemetry tracing work in Blaize Bazaar?
- Where is Strands OpenTelemetry initialized? (app.py)
- What does the custom trace formatter capture?
  * Agent invocations with duration
  * LLM calls with token metrics (prompt, completion, total)
  * Event loop cycles
- How does otel_trace_extractor.py extract trace data?
- What trace attributes are added to the orchestrator?
- How can I export traces to Jaeger or CloudWatch X-Ray?
```

**What you'll learn**: Observability, distributed tracing, performance monitoring, and production debugging.

---

## 🚀 Hands-On Exploration Prompts

### 6. Add a New Custom Tool

```
@workspace I want to add a new custom business logic tool called "get_best_sellers" 
that returns top 10 best-selling products. Guide me through:
1. Adding the SQL query in business_logic.py
2. Creating the @tool decorated function in agent_tools.py
3. Adding it to the Recommendation Agent's tools list
4. Testing it with a sample query

Show me the exact code I need to add to each file.
```

**What you'll learn**: How to extend the system with custom business logic and tools.

---

### 7. Create a New Specialist Agent

```
@workspace I want to create a new "Customer Service Agent" that handles 
returns and refunds. Show me:
1. How to create customer_service_agent.py following the pattern of other agents
2. What tools it should have (e.g., process_return, check_refund_status)
3. How to add it to the orchestrator's tools list
4. How to update the orchestrator prompt to route customer service queries

Provide complete code examples.
```

**What you'll learn**: Agent design patterns, prompt engineering, and system extensibility.

---

### 8. Implement Hybrid Search

```
@workspace Explain how hybrid search works in hybrid_search.py:
- What is Reciprocal Rank Fusion (RRF)?
- How does it combine vector search and full-text search?
- What is the formula: score = Σ(weight / (k + rank)) where k=60?
- How are default weights set (60% vector, 40% full-text)?
- Show me how to trigger hybrid search with "hybrid:" prefix
- How are RRF scores displayed in the frontend?
```

**What you'll learn**: Advanced search techniques, ranking algorithms, and multi-modal retrieval.

---

### 9. Understand Database Schema

```
@workspace Show me the Aurora PostgreSQL database schema:
- What table stores products? (bedrock_integration.product_catalog)
- What are the key columns and their data types?
- Why does it use camelCase with quotes ("productId", "imgUrl")?
- How is the embedding column defined for pgvector?
- What indexes exist on the table?
- How many products are in the catalog? (21,704)

Show me a sample product row.
```

**What you'll learn**: Database design, pgvector schema, and Aurora PostgreSQL features.

---

### 10. Frontend-Backend Integration

```
@workspace How does the React frontend integrate with the FastAPI backend?
- What API endpoints are available? (/api/search, /api/chat, /api/mcp/stats, etc.)
- How does AIAssistant.tsx send chat messages?
- How does it receive agent execution data for the reasoning traces?
- What is the agent-execution-complete event?
- How are product cards rendered from the API response?
- Show me the data flow from user input to product display.
```

**What you'll learn**: Full-stack integration, API design, and real-time UI updates.

---

## 🎓 Learning & Extension Prompts

### 11. Token Optimization Strategies

```
@workspace What are the token optimization strategies in Blaize Bazaar?
- How does MCP Context Manager reduce token usage?
- What is the pruning strategy (importance scoring)?
- How does conversation summarization work?
- What is the cost impact of different context window sizes?
- Show me the _calculate_importance_score() logic
- How can I extend the pruning algorithm?
```

**What you'll learn**: Cost optimization, context management, and production efficiency patterns.

---

### 12. Performance Monitoring

```
@workspace Explain all the performance monitoring features:
- SQL Query Inspector: How does sql_query_logger.py capture queries?
- Index Performance Dashboard: How does it compare HNSW vs sequential scan?
- MCP Context Dashboard: What metrics does it show?
- Agent Reasoning Traces: How does it visualize agent workflow?
- OpenTelemetry traces: What data is captured?

Show me how to access each monitoring feature in the UI.
```

**What you'll learn**: Observability tools, performance analysis, and debugging techniques.

---

### 13. Production Deployment Considerations

```
@workspace What would I need to change to deploy Blaize Bazaar to production?
- CORS configuration (currently allows all origins)
- Database connection pooling settings
- OpenTelemetry exporter (switch from console to OTLP/X-Ray)
- Error handling and logging levels
- Security considerations (API authentication, rate limiting)
- Environment variable management
- Docker containerization strategy

Provide a production-ready checklist.
```

**What you'll learn**: Production best practices, security, scalability, and deployment patterns.

---

### 14. Extend Prompt Engineering

```
@workspace Show me how to extend the prompt templates in PromptRegistry:
- Where are prompt templates defined? (mcp_context_manager.py)
- How are they versioned? (v2.1, v1.8, v2.0, v1.9)
- How do I add a new prompt template for my custom agent?
- How are performance metrics tracked per prompt?
- How can I implement A/B testing with different prompt versions?

Give me an example of adding a new prompt template.
```

**What you'll learn**: Prompt engineering, versioning, A/B testing, and performance tracking.

---

### 15. Workshop Learning Path

```
@workspace I'm a workshop participant. Give me a step-by-step learning path:
1. Start: Understand the overall architecture
2. Lab 1: Explore semantic search with pgvector
3. Lab 2: Understand the multi-agent system
4. Lab 3: Add a custom business logic tool
5. Lab 4: Create a new specialist agent
6. Lab 5: Implement advanced features (hybrid search, MCP optimization)

For each step, tell me:
- What files to examine
- What concepts to understand
- What hands-on exercises to try
- What Amazon Q prompts to use for deeper learning
```

**What you'll learn**: Structured learning path from basics to advanced topics.

---

## 💡 Quick Reference Prompts

### 16. File Structure Overview

```
@workspace Show me the complete file structure and explain what each key file does:
- Backend: app.py, chat.py, orchestrator.py, agent_tools.py, business_logic.py
- Frontend: App.tsx, AIAssistant.tsx, AgentReasoningTraces.tsx, MCPContextDashboard.tsx
- Services: embeddings.py, database.py, mcp_context_manager.py, otel_trace_extractor.py
- Agents: inventory_agent.py, pricing_agent.py, recommendation_agent.py
```

**What you'll learn**: Project organization, file responsibilities, and code navigation.

---

### 17. Key Technologies Used

```
@workspace List all the key technologies and AWS services used in Blaize Bazaar:
- AWS Services: Amazon Bedrock, Aurora PostgreSQL, Titan Embeddings, Claude Sonnet 4
- Backend: FastAPI, Strands SDK, asyncpg, psycopg3, pgvector
- Frontend: React, TypeScript, Tailwind CSS, Vite
- Observability: OpenTelemetry, tiktoken
- Database: PostgreSQL 16+, pgvector extension, HNSW index

Explain why each technology was chosen.
```

**What you'll learn**: Technology stack, AWS services, and architectural decisions.

---

### 18. Common Troubleshooting

```
@workspace What are common issues participants might face and how to fix them?
- "Strands SDK not available" error
- Database connection failures
- pgvector extension not found
- HNSW index not being used (sequential scan instead)
- MCP context window overflow
- OpenTelemetry traces not appearing
- Agent routing to wrong specialist

Provide diagnostic steps and solutions for each.
```

**What you'll learn**: Debugging techniques, common pitfalls, and troubleshooting strategies.

---

## 🔍 Advanced Deep-Dive Prompts

### 19. HNSW Index Optimization

```
@workspace Explain HNSW index optimization in detail:
- What is the HNSW (Hierarchical Navigable Small World) algorithm?
- How does the ef_search parameter affect performance vs accuracy?
- Why do we set enable_seqscan=off in the search query?
- What is the trade-off between index build time and query performance?
- How does the index size scale with the number of products?
- Show me the index creation SQL and performance comparison results
```

**What you'll learn**: Vector index internals, performance tuning, and scalability considerations.

---

### 20. Strands SDK Integration

```
@workspace How is the Strands SDK integrated into Blaize Bazaar?
- What is the Strands Agent class and how is it used?
- How do @tool decorators work with Strands?
- What is the event loop cycle in Strands?
- How does Strands handle tool execution and error handling?
- What is the difference between agents-as-tools pattern vs class-based agents?
- Show me examples from orchestrator.py and specialist agents
```

**What you'll learn**: Strands SDK patterns, agent frameworks, and tool orchestration.

---

## 📚 Conceptual Understanding Prompts

### 21. RAG Architecture Patterns

```
@workspace Explain the RAG (Retrieval-Augmented Generation) patterns in Blaize Bazaar:
- How does semantic search enhance LLM responses?
- What is the difference between naive RAG and agentic RAG?
- How do agents decide when to retrieve vs when to reason?
- What is the role of embeddings in the RAG pipeline?
- How does context window management affect RAG quality?
- Show me the complete RAG flow from query to response
```

**What you'll learn**: RAG fundamentals, agentic patterns, and information retrieval strategies.

---

### 22. Cost Optimization Strategies

```
@workspace What are all the cost optimization strategies in the system?
- Token usage optimization with MCP Context Manager
- Embedding caching strategies (if any)
- Database query optimization (HNSW index, connection pooling)
- LLM call minimization (agent routing, tool selection)
- Context pruning and summarization
- Calculate the cost per user query with current architecture
```

**What you'll learn**: Cost analysis, optimization techniques, and production economics.

---

### 23. Security Best Practices

```
@workspace What security considerations are implemented or should be added?
- API authentication and authorization
- Database connection security (SSL, IAM authentication)
- Input validation and SQL injection prevention
- Rate limiting and DDoS protection
- Secrets management (AWS Secrets Manager)
- CORS configuration for production
- Show me where security improvements are needed
```

**What you'll learn**: Security patterns, AWS security services, and production hardening.

---

## 🎯 Workshop-Specific Prompts

### 24. Lab 1: Semantic Search Implementation

```
@workspace Guide me through Lab 1 - Semantic Search:
1. How is the /api/search endpoint implemented in app.py?
2. How does embeddings.py generate Titan embeddings?
3. What is the pgvector similarity query syntax?
4. How does the HNSW index improve performance?
5. Show me how to test semantic search with sample queries
6. What metrics should I monitor for search quality?
```

**What you'll learn**: Hands-on semantic search implementation and testing.

---

### 25. Lab 2: Multi-Agent System

```
@workspace Guide me through Lab 2 - Multi-Agent System:
1. How does the orchestrator route queries in orchestrator.py?
2. How are specialist agents defined (inventory, pricing, recommendation)?
3. How do agents call custom tools via agent_tools.py?
4. How does business_logic.py execute database operations?
5. Show me how to trace agent execution with OpenTelemetry
6. How can I add a new agent to the system?
```

**What you'll learn**: Hands-on multi-agent implementation and extension.

---

### 26. Understanding the Data Flow

```
@workspace Trace the complete data flow for this user query: "Show me budget laptops under $500"
1. Frontend: User types in AIAssistant.tsx
2. API call to /api/chat endpoint
3. chat.py processes with MCP context tracking
4. Orchestrator routes to Pricing Agent (budget keyword)
5. Pricing Agent calls get_price_statistics tool
6. business_logic.py executes SQL query
7. Results flow back through agents
8. Frontend displays products with reasoning traces

Show me the exact code path and data transformations at each step.
```

**What you'll learn**: End-to-end system understanding and debugging skills.

---

## 🛠️ Customization Prompts

### 27. Add Multi-Modal Search

```
@workspace I want to add image search capability. Show me:
1. How is image_search.py currently implemented?
2. How does Claude Sonnet 4 vision analyze images?
3. How are image descriptions converted to embeddings?
4. How would I add voice search using Amazon Transcribe?
5. What changes are needed in the frontend to support image upload?
6. Provide a complete implementation guide
```

**What you'll learn**: Multi-modal AI, vision models, and feature extension.

---

### 28. Implement Caching Layer

```
@workspace How would I add a caching layer to improve performance?
- Where should I cache embeddings? (Redis, ElastiCache)
- How to cache frequent search queries?
- Should I cache agent responses? Trade-offs?
- How to invalidate cache when products change?
- Show me code examples for Redis integration
- What performance improvements can I expect?
```

**What you'll learn**: Caching strategies, Redis integration, and performance optimization.

---

### 29. Add User Personalization

```
@workspace How would I add user personalization features?
- Store user preferences and search history
- Implement collaborative filtering
- Personalize agent responses based on user profile
- Add user-specific context to MCP manager
- Track user behavior for recommendations
- Show me the database schema changes needed
```

**What you'll learn**: Personalization patterns, user modeling, and recommendation systems.

---

### 30. Implement A/B Testing

```
@workspace How would I implement A/B testing for prompts and agents?
- Use PromptRegistry versioning for A/B tests
- Track performance metrics per prompt version
- Implement feature flags for agent routing
- Collect user feedback and conversion metrics
- Analyze results with statistical significance
- Show me a complete A/B testing framework
```

**What you'll learn**: Experimentation, metrics, and data-driven optimization.

---

## 📖 Documentation Prompts

### 31. Generate API Documentation

```
@workspace Generate comprehensive API documentation:
- List all endpoints in app.py with request/response schemas
- Document authentication requirements
- Provide curl examples for each endpoint
- Explain rate limits and error codes
- Show example responses for success and error cases
- Generate OpenAPI/Swagger specification
```

**What you'll learn**: API design, documentation standards, and developer experience.

---

### 32. Architecture Decision Records

```
@workspace Create Architecture Decision Records (ADRs) for key decisions:
- Why Strands SDK over LangChain or custom implementation?
- Why asyncpg instead of SQLAlchemy ORM?
- Why HNSW index over IVFFlat for pgvector?
- Why MCP for context management vs custom solution?
- Why FastAPI over Flask or Django?
- Document trade-offs and alternatives considered
```

**What you'll learn**: Architectural thinking, trade-off analysis, and decision documentation.

---

## 🎓 Learning Resources

### How to Use These Prompts

1. **Copy the prompt** you want to explore
2. **Open Amazon Q Developer** in your IDE (VS Code, JetBrains, etc.)
3. **Paste the prompt** in the Q chat
4. **Review the response** and ask follow-up questions
5. **Try the code examples** provided by Q
6. **Experiment** with modifications

### Tips for Best Results

- Use `@workspace` to give Q context about the entire codebase
- Use `@file` to focus on specific files (e.g., `@chat.py`)
- Ask follow-up questions to dive deeper
- Request code examples when learning new concepts
- Use Q to debug errors and understand stack traces

### Progressive Learning Path

**Beginner** → Start with prompts 1-5 (Architecture Overview)  
**Intermediate** → Try prompts 6-15 (Hands-On Exploration)  
**Advanced** → Explore prompts 19-23 (Deep Dives)  
**Expert** → Customize with prompts 27-30 (Extensions)

---

## 🚀 Next Steps

After exploring with these prompts:

1. **Build your own agent** using the patterns you learned
2. **Add custom business logic** specific to your use case
3. **Optimize for production** with monitoring and security
4. **Share your learnings** with the workshop community
5. **Deploy to AWS** using the production checklist

---

## 📞 Support

- **Workshop Instructors**: Available during lab sessions
- **Amazon Q Developer**: Your AI pair programmer in the IDE
- **AWS Documentation**: [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/), [Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/)
- **GitHub Issues**: Report bugs or request features

---

**Happy Learning! 🎉**

*DAT406 - AWS re:Invent 2025*
