# DAT406 - Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL

<div align="center">

[![AWS re:Invent 2025](https://img.shields.io/badge/AWS_re%3AInvent-2025-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://reinvent.awsevents.com/)
[![Workshop Level](https://img.shields.io/badge/Level-400%20Expert-red?style=for-the-badge)](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)
[![Duration](https://img.shields.io/badge/Duration-2_Hours-blue?style=for-the-badge)](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg)

### Platform & Infrastructure

[![AWS Aurora](https://img.shields.io/badge/Aurora_PostgreSQL-17.5-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/rds/aurora/)
[![pgvector](https://img.shields.io/badge/pgvector-0.8.0_HNSW-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Bedrock](https://img.shields.io/badge/Amazon_Bedrock-Cohere_Embed_v4_|_Claude_Sonnet_4-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/)

### Languages & Frameworks

[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

### Architecture & Capabilities

[![Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-7b1fa2?style=flat-square&labelColor=4a148c)](README.md)
[![Search](https://img.shields.io/badge/Search-Vector_Semantic-ab47bc?style=flat-square&labelColor=6a1b9a)](README.md)
[![AI](https://img.shields.io/badge/AI-Agentic_Orchestration-9c27b0?style=flat-square&labelColor=4a148c)](README.md)
[![MCP](https://img.shields.io/badge/MCP-Context_Protocol-8e24aa?style=flat-square&labelColor=6a1b9a)](README.md)

[![License](https://img.shields.io/badge/License-MIT-00b300?style=for-the-badge)](LICENSE)
[![Strands SDK](https://img.shields.io/badge/Strands_SDK-Agent_Framework-00ADD8?style=for-the-badge)](https://strandsagents.com/)

</div>

---

> ⚠️ **Educational Workshop**: This repository contains demonstration code for AWS re:Invent 2025. Not intended for production deployment without proper security hardening and testing.

---

## 🚀 Quick Start

**Workshop Duration**: 2 hours | **Hands-on**: Parts 1, 2 & 3 (80 min) | **Optional**: Part 4 (Self-paced)

Build enterprise-grade agentic AI applications with semantic search, multi-agent orchestration, and Model Context Protocol integration. Leverage Amazon Aurora PostgreSQL 17.5 with pgvector 0.8.0, Amazon Bedrock (Claude Sonnet 4 + Cohere Embed v4), and modern full-stack technologies.

### Pre-configured Workshop Environment

```bash
start-backend   # Terminal 1: FastAPI backend (port 8000)
start-frontend  # Terminal 2: React frontend (port 5173)
```

**Access Points:**

- 🌐 Frontend: `<CloudFront-URL>/ports/5173/`
- 🔌 API Docs: `<CloudFront-URL>/ports/8000/docs`
- 📊 Health: `<CloudFront-URL>/ports/8000/api/health`

---

## 📹 Quick Video Walkthrough

Want to see what you're about to build? Watch this video walkthrough of the Blaize Bazaar application (no sound, set quality to 1080p or higher for best viewing):

[![Blaize Bazaar Demo](https://img.youtube.com/vi/GRjSURMwK7c/maxresdefault.jpg)](https://youtu.be/GRjSURMwK7c?si=iQkHO6auIECfWmT7)

**💡 Viewing Tip:** Watch at 1.5x speed to save time - click the settings gear icon in the video player.

---

## 📁 Repository Structure

```
├── notebooks/                      # Workshop Notebooks (Parts 1-4)
│   ├── Part_1_Semantic_Search_Foundations_Exercises.ipynb
│   ├── Part_1_Semantic_Search_Foundations_Solutions.ipynb
│   ├── Part_2_Context_Management_Custom_Tools_Exercises.ipynb
│   ├── Part_2_Context_Management_Custom_Tools_Solutions.ipynb
│   ├── Part_3_Multi_Agent_Orchestration_Exercises.ipynb
│   ├── Part_3_Multi_Agent_Orchestration_Solutions.ipynb
│   ├── Part_4_Advanced_Topics_Production_Patterns.ipynb
│   └── requirements.txt
├── blaize-bazaar/                  # Full-Stack Demo Application
│   ├── backend/                    # FastAPI + Multi-Agent System
│   │   ├── agents/                # Orchestrator, Inventory, Pricing, Recommendation
│   │   ├── services/              # Search, MCP, Bedrock integration
│   │   ├── models/                # Pydantic data models
│   │   └── app.py                 # FastAPI application
│   ├── frontend/                   # React + TypeScript UI
│   │   └── src/                   # Components, hooks, services
│   ├── config/                     # MCP server configuration
│   ├── start-backend.sh
│   └── start-frontend.sh
├── data/                           # Product catalog datasets
│   └── premium-products-with-embeddings.csv
└── scripts/                        # Setup & bootstrap scripts
    ├── bootstrap-environment.sh
    ├── bootstrap-labs.sh
    └── load-database-fast.sh
```

---

## 🎯 Workshop Structure

### Part 1: Semantic Search Foundations (30 min) - Hands-on Exercises

**Building semantic search with pgvector 0.8.0 and Aurora PostgreSQL**

- Generate embeddings with Cohere Embed v4 via Amazon Bedrock (1024 dimensions)
- HNSW indexing for production-scale similarity search (M=16, ef_construction=128)
- Compare keyword-only vs. vector vs. hybrid retrieval side-by-side
- Tune HNSW indexes (ef_search, quantization: halfvec/binary) and benchmark recall vs. latency
- Automatic iterative scanning for guaranteed recall (pgvector 0.8.0)
- RAG: ground LLM answers in real product data instead of hallucinating

### Part 2: Context Management & Custom Agent Tools (25 min) - Hands-on Exercises

**Building a Strands Agents SDK agent with structured tool calls**

- Custom tool creation with `@tool` decorator patterns (search, inventory, pricing)
- Step-by-step agent reasoning traces: query analysis, tool selection, response synthesis
- Token usage and estimated API cost tracking per request
- Preference-based result re-ranking and personalization
- Streaming chat with SSE (Server-Sent Events) for real-time token delivery

### Part 3: Multi-Agent Orchestration (25 min) - Hands-on Exercises

**Agents as Tools pattern with Graph Orchestrator**

- Orchestrator + specialist agents (Search, Pricing, Recommendation)
- Claude Sonnet 4 for intelligent query routing and agent coordination
- Bedrock Guardrails: content safety filters, PII detection/redaction, profanity blocking
- Chaos engineering: inject random agent failures to test resilience and graceful degradation
- Interactive DAG visualization of agent routing and result merging

### Part 4: Advanced Topics & Enterprise Patterns (Optional) - Self-paced

**Production-grade agent infrastructure on AWS**

- Amazon Cognito authentication and user sign-in
- Persistent cross-session memory (AgentCore)
- MCP gateway for dynamic tool discovery and registration
- CloudWatch + X-Ray distributed tracing across Lambda, Aurora, and Bedrock
- Cedar policy authorization for fine-grained access control
- Vector quantization strategies and cost optimization

---

## 💡 Key Technical Insights

### Why pgvector 0.8.0?

**Automatic Iterative Scanning** eliminates manual tuning and guarantees complete results:

**Before (pgvector 0.7.x):**

```sql
SET hnsw.ef_search = 40;  -- Manual tuning required for each query
-- Risk: May miss relevant results with strict filters
-- Challenge: Different ef_search values needed per use case
```

**After (pgvector 0.8.0):**

```sql
SET hnsw.iterative_scan = 'relaxed_order';
-- Automatically finds all matching results with minimal latency
-- Guarantees 100% recall across all queries regardless of filters
-- No manual tuning needed for production deployment
```

### Why Agents as Tools Pattern?

| Traditional Monolithic Approach  | Agents as Tools Pattern            |
| -------------------------------- | ---------------------------------- |
| Single agent handles all tasks   | Orchestrator + specialized agents  |
| All capabilities in one codebase | Focused expertise per agent domain |
| Hard to maintain and debug       | Independent testing and updates    |
| Sequential execution only        | Parallel execution possible        |
| Difficult to scale               | Horizontal scaling per agent type  |

**Benefits:**

- 🎯 **Domain expertise** - Each agent masters specific capabilities
- 🔄 **Easy maintenance** - Update agents independently
- ⚡ **Better performance** - Optimized per agent type
- 📈 **Scalable architecture** - Add new agents without refactoring
- 🧪 **Testability** - Unit test agents in isolation

---

## 🛍️ Blaize Bazaar Demo Application

**Full-stack e-commerce platform demonstrating enterprise-grade agentic AI**

### Quick Start Guide

**Step 1: Split terminal into two panes (side-by-side)**

**Step 2: Navigate to blaize-bazaar directory in both panes**

```bash
blaize-bazaar
```

**Step 3: Start backend (Left Pane)**

```bash
start-backend
# FastAPI server starts on port 8000
# Wait for "Application startup complete" message
```

**Step 4: Start frontend (Right Pane)**

```bash
start-frontend
# React dev server starts on port 5173
# Opens automatically in browser
```

### Architecture Flow

```
React Frontend (TypeScript + Tailwind CSS)
              ↓
    FastAPI Backend (Python 3.13)
         ↓           ↓
   Orchestrator → Specialist Agents
         ↓           ↓           ↓
   Inventory     Pricing    Recommendation
         └────────────┴────────────┘
                    ↓
      Aurora PostgreSQL + pgvector
```

### Platform Features

### Features

- ✨ **Semantic Search**: Vector similarity with pgvector 0.8.0 HNSW indexes for natural language queries
- 💬 **Streaming Conversational AI**: Claude Sonnet 4 with token-by-token SSE streaming and real-time typing indicators
- 🔧 **MCP Context Manager**: Custom tools for Aurora PostgreSQL data access
- 🤖 **Multi-Agent System**: Orchestrator + 3 specialist agents (Agents as Tools) with inline agent badges
- 🛡️ **Bedrock Guardrails**: Content safety filters, PII detection/redaction, and profanity blocking
- 🔍 **Smart Filters**: Category, price, rating with server-side price limit enforcement
- ⚡ **Real-time**: Autocomplete, quick search, and sale price detection with strikethrough display
- 📊 **Agent Traces**: OpenTelemetry observability for multi-agent workflows
- 🎮 **Interactive Playground**: Full-screen overlay with lab progression, tool demos, and architecture diagrams
- 🎯 **Enterprise-Ready**: Cost analysis, security patterns, chaos engineering, and monitoring

---

## 🗄️ Database Schema

**Table**: `bedrock_integration.product_catalog`

| Column                | Type         | Index       | Description                               |
| --------------------- | ------------ | ----------- | ----------------------------------------- |
| `productId`           | CHAR(10)     | PRIMARY KEY | Unique product identifier                 |
| `product_description` | VARCHAR(500) | GIN         | Full product details for text search      |
| `imgUrl`              | VARCHAR(70)  | —           | Product image URL                         |
| `productURL`          | VARCHAR(40)  | —           | Product page URL                          |
| `stars`               | NUMERIC(2,1) | Partial     | Rating (1.0-5.0)                          |
| `reviews`             | INTEGER      | —           | Customer review count                     |
| `price`               | NUMERIC(8,2) | Partial     | Price in USD                              |
| `category_id`         | SMALLINT     | —           | Category identifier                       |
| `isBestSeller`        | BOOLEAN      | Partial     | Bestseller flag                           |
| `boughtInLastMonth`   | INTEGER      | —           | Recent purchase count                     |
| `category_name`       | VARCHAR(50)  | B-tree      | Product category                          |
| `quantity`            | SMALLINT     | —           | Available stock (0-1000)                  |
| `embedding`           | VECTOR(1024) | HNSW        | Cohere Embed v4 semantic vector embedding |

### Performance-Optimized Indexes

```sql
-- Vector similarity search (HNSW optimized for ~1,000 products)
CREATE INDEX idx_product_embedding_hnsw
ON product_catalog USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128);

-- Full-text search (GIN for keyword matching)
CREATE INDEX idx_product_fts
ON product_catalog USING GIN (to_tsvector('english', product_description));

-- Category and price filters
CREATE INDEX idx_product_category_name ON product_catalog(category_name);
CREATE INDEX idx_product_price ON product_catalog(price) WHERE price > 0;

-- Partial indexes for common filters
CREATE INDEX idx_product_stars ON product_catalog(stars) WHERE stars >= 4.0;
CREATE INDEX idx_product_bestseller ON product_catalog("isBestSeller") WHERE "isBestSeller" = TRUE;

-- Composite index for category + price queries
CREATE INDEX idx_product_category_price
ON product_catalog(category_name, price) WHERE price > 0 AND quantity > 0;
```

---

## 🔌 API Reference

### Search Endpoint

```bash
POST /api/search
Content-Type: application/json

{
  "query": "wireless gaming headphones noise cancellation",
  "limit": 10,
  "min_similarity": 0.3,
  "filters": {
    "category": "Electronics",
    "min_price": 50,
    "max_price": 200,
    "min_stars": 4.0
  }
}
```

**Response:**

```json
{
  "results": [
    {
      "productId": "B08XYZ",
      "product_description": "Premium wireless gaming headset...",
      "price": 149.99,
      "stars": 4.5,
      "reviews": 1243,
      "similarity": 0.87
    }
  ],
  "total": 10,
  "query_time_ms": 45
}
```

---

## 🔧 Model Context Protocol (MCP)

Custom tools built with Strands SDK for Aurora PostgreSQL agent integration, enabling intelligent database access and business logic execution.

**Custom Tools Implemented:**

- `get_trending_products` - Top products by popularity metrics
- `check_inventory` - Real-time stock availability queries
- `analyze_pricing` - Price trend analysis and insights
- `get_recommendations` - Semantic similarity-based suggestions

**Architecture Benefits:**

- 🔌 Standardized tool interface via MCP specification
- 🔄 Reusable across multiple agents
- 📊 Built-in token counting and context management
- ⚡ Direct database access with connection pooling

---

## 🤖 Multi-Agent Architecture

> **🔧 Framework Agnostic Concepts:** While this workshop uses **Strands SDK** for hands-on implementation, the multi-agent patterns and architectural concepts (Agents as Tools, orchestration, specialist agents) apply equally to other frameworks like **[LangGraph](https://langchain-ai.github.io/langgraph/), [LangChain](https://www.langchain.com/), [CrewAI](https://www.crewai.com/), [AutoGen](https://microsoft.github.io/autogen/)**, and more. Focus on understanding the patterns - the implementation details are transferable.

### Orchestrator Agent (Claude Sonnet 4)

**Capabilities:**

- 🧠 Intelligent query routing and agent coordination (supports [extended thinking with interleaved mode](https://github.com/strands-agents/samples/blob/main/01-tutorials/02-multi-agent-systems/01-agent-as-tool/agents-as-tools-interleaved.ipynb) for complex multi-step analysis)
- 🔄 Adaptive task routing based on tool responses and context
- 📊 Context-aware agent selection and coordination
- 🎯 Dynamic workflow orchestration

### Specialized Agents (Agents as Tools Pattern)

**1. Inventory Agent**

```python
✓ Real-time stock monitoring across catalog
✓ Low inventory alerts (threshold: <10 units)
✓ Restocking recommendations with priority levels
✓ Stock availability forecasting
```

**2. Recommendation Agent**

```python
✓ Personalized product suggestions via semantic search
✓ Feature-based matching and similarity analysis
✓ Budget-conscious alternatives with price awareness
✓ Cross-category recommendations
```

**3. Pricing Agent**

```python
✓ Price trend analysis and historical patterns
✓ Deal identification (discount threshold: >20% off)
✓ Value-for-money rankings and comparisons
✓ Competitive pricing insights
```

---

## 💰 Cost Analysis

### Workshop Environment Costs

| Service               | Usage                       | Estimated Cost |
| --------------------- | --------------------------- | -------------- |
| **Amazon Bedrock**    |                             |                |
| Cohere Embed v4       | ~10K tokens (initial load)  | $0.10          |
| Claude Sonnet 4       | ~50K tokens (agent queries) | $1.50          |
| **Aurora PostgreSQL** |                             |                |
| Storage (10K vectors) | 100 MB                      | $0.00\*        |
| I/O Operations        | ~1K reads                   | $0.00\*        |

\*Included in pre-provisioned workshop environment

### Production Estimates (1M queries/month)

| Component                            | Monthly Cost Range | Notes                                                   |
| ------------------------------------ | ------------------ | ------------------------------------------------------- |
| Aurora PostgreSQL                    | $150-600           | Depends on instance family, size, and I/O configuration |
| Bedrock Embeddings (Cohere Embed v4) | $100               | 100M tokens @ $0.001/1K tokens                          |
| Bedrock Claude Sonnet 4              | $300               | 100M tokens @ $0.003/1K tokens                          |
| Data Transfer                        | $50                | 500 GB outbound from AWS                                |
| **Total**                            | **$600-1,050**     | Varies based on Aurora configuration                    |

### Aurora Configuration Best Practices

**For Read-Heavy Workloads (Recommended):**

- **Aurora I/O-Optimized** - Zero I/O charges, predictable monthly costs
- **Optimized Reads (NVMe-SSD)** - Faster query performance with local caching
- **Read Replicas** - Distribute read load across multiple instances (up to 15)

**Cost Optimization Benefits:**

- I/O-Optimized eliminates per-request I/O charges (typical savings: 20-40%)
- Optimized Reads reduce network I/O by caching frequently accessed data locally
- Combined approach ideal for vector search workloads with high read volume

**Scaling Guidance:**

- Start with smaller instances and scale based on actual metrics
- Monitor `ReadLatency`, `CPUUtilization`, and `DatabaseConnections`
- Use Aurora Serverless v2 for variable or unpredictable workloads
- Consider Aurora Global Database for multi-region deployments

### Cost Optimization Strategies

- **Cache embeddings** - Reduce Bedrock calls by 80% with semantic caching
- **Aurora Serverless v2** - Auto-scaling for variable workloads (0.5-16 ACU)
- **Query result caching** - Redis/ElastiCache for frequently accessed data
- **Batch processing** - Generate embeddings during off-peak hours
- **Read replicas** - Distribute query load across multiple Aurora instances

---

## 🔒 Security Best Practices

### Database Security

```bash
✓ Enable encryption at rest (AES-256 for all data)
✓ Use IAM database authentication (no password rotation needed)
✓ Restrict security groups to application subnets only
✓ Enable automated backups (7-35 day retention period)
✓ Use AWS Secrets Manager for credential management
✓ Enable VPC endpoints for private connectivity
```

### Application Security

```bash
✓ Input validation on all user queries and API endpoints
✓ SQL injection prevention (parameterized queries only)
✓ Rate limiting per user/IP (default: 100 requests/minute)
✓ API authentication (JWT tokens with expiration)
✓ CORS configuration for production domains
✓ Content Security Policy (CSP) headers
```

### AI/ML Security

```bash
✓ Bedrock Guardrails for content filtering and safety
✓ PII detection and redaction in user queries
✓ Audit logging for all AI interactions (CloudTrail)
✓ Model access controls via IAM policies
✓ Prompt injection prevention and validation
✓ Token usage monitoring and anomaly detection
```

---

## 📊 Observability & Monitoring

### OpenTelemetry Integration

**Built-in distributed tracing for multi-agent workflows:**

```python
# Automatic trace capture with context propagation
✨ Agent: Orchestrator
   Duration: 245ms
   Tokens: 215 (input: 150, output: 65)
   Status: Success

🤖 LLM Call: claude-sonnet-4
   Duration: 180ms
   Model: anthropic.claude-sonnet-4-20250514-v1:0
   Temperature: 0.7

🔧 Tool: get_trending_products
   Duration: 45ms
   Result: 10 products
   Query: SELECT * FROM product_catalog...
```

### CloudWatch Metrics

**Database Metrics:**

- `DatabaseConnections` - Active connection count
- `ReadLatency` / `WriteLatency` - Query performance (milliseconds)
- `CPUUtilization` - Compute resource usage (%)
- `FreeableMemory` - Available RAM for caching (GB)
- `VolumeReadIOPs` / `VolumeWriteIOPs` - Disk operations

**Application Metrics:**

- `SearchLatency` - End-to-end query processing time
- `AgentInvocations` - Agent usage patterns and frequency
- `BedrockTokens` - Token consumption and costs
- `ErrorRate` - Failed requests and exceptions
- `CacheHitRate` - Embedding cache effectiveness

**Custom Dashboards:**

```bash
# Key Performance Indicators (KPIs)
- P50/P95/P99 search latency percentiles
- Agent routing accuracy and success rate
- Cache hit rate and memory efficiency
- Cost per query and daily spend tracking
```

### Alerting Strategy

| Alert          | Threshold           | Action                              |
| -------------- | ------------------- | ----------------------------------- |
| High Latency   | P95 > 2s            | Scale Aurora read replicas          |
| Error Rate     | > 5%                | Page on-call engineer immediately   |
| Token Spike    | > 2x baseline       | Investigate potential abuse or bugs |
| DB Connections | > 80% max           | Check for connection leaks          |
| Cost Anomaly   | > 150% daily budget | Review usage patterns               |

### Structured Logging

```python
# Context-rich structured logging for debugging
logger.info(
    "search_query_executed",
    query=query,
    user_id=user_id,
    latency_ms=latency,
    results_count=len(results),
    trace_id=trace_id,
    similarity_threshold=min_similarity,
    filters=filters
)
```

---

## 🛠️ Technology Stack

| Layer               | Technologies                                                   |
| ------------------- | -------------------------------------------------------------- |
| **Database**        | Aurora PostgreSQL 17.5 • pgvector 0.8.0 (HNSW)                 |
| **AI/ML**           | Amazon Bedrock (Cohere Embed v4, Claude Sonnet 4)              |
| **Backend**         | FastAPI • Python 3.13 • psycopg3 • boto3 • Pydantic v2         |
| **Frontend**        | React 18 • TypeScript 5 • Tailwind CSS • Vite • Lucide Icons   |
| **Search**          | HNSW vector indexes • Trigram text indexes • Cosine similarity |
| **Agent Framework** | Strands SDK • Agents as Tools pattern • MCP integration        |
| **Observability**   | OpenTelemetry • CloudWatch • Structured logging                |

---

## 🚀 Production Deployment Guide

### Horizontal Scaling Strategy

**Database Layer:**

- Aurora read replicas for search queries (up to 15 replicas)
- Multi-AZ deployment for high availability
- Cross-region read replicas for global applications

**Application Layer:**

- Application Load Balancer (ALB) for FastAPI instances
- Auto Scaling Groups (ASG) based on CPU/memory metrics
- CloudFront CDN for React frontend static assets

### Vertical Scaling Approach

**General Guidance:**

- Start with smaller instance sizes and scale based on actual performance metrics
- Monitor key metrics: `ReadLatency`, `CPUUtilization`, `DatabaseConnections`, `FreeableMemory`
- Scale vertically when consistently hitting >70% CPU or memory utilization
- Consider Aurora Serverless v2 for workloads with variable or unpredictable patterns

**Performance Indicators:**

- **ReadLatency** consistently >50ms → Consider larger instance or read replicas
- **CPUUtilization** sustained >70% → Scale to larger instance size
- **DatabaseConnections** approaching max → Review connection pooling or scale up
- **FreeableMemory** <20% of total → Increase instance size for better caching

### Aurora Serverless v2 Configuration

```yaml
# Auto-scaling configuration for variable workloads
MinCapacity: 0.5 ACU (1 GB RAM)
MaxCapacity: 16 ACU (32 GB RAM)
AutoPause: true (after 5 minutes of inactivity)
ScaleIncrement: 0.5 ACU per scaling step
```

**Benefits:**

- Pay only for resources used (per-second billing)
- Automatic scaling based on workload
- Zero infrastructure management overhead

---

## 📚 Resources & References

### AWS Documentation

- [Aurora PostgreSQL User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/) - Complete reference for Aurora configuration
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/) - Foundation models and API reference
- [pgvector 0.8.0 Performance Blog](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/) - Deep dive into 0.8.0 features

### Open Source & Standards

- [pgvector GitHub](https://github.com/pgvector/pgvector) - Open-source vector similarity search extension
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - Protocol specification and documentation
- [AWS Labs MCP Servers](https://awslabs.github.io/mcp/) - AWS-maintained MCP server implementations
- [Strands SDK Documentation](https://strandsagents.com/) - Agent framework and patterns

### Related AWS re:Invent 2025 Workshops

- **DAT409**: Implement hybrid search with Aurora PostgreSQL for MCP retrieval [REPEAT]
- **DAT428**: Build a cost-effective RAG-based gen AI application with Amazon Aurora [REPEAT]
- **DAT403**: Build a multi-agent AI solution with Amazon Aurora & Bedrock AgentCore

### Research Papers & Technical References

- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320) - Efficient and robust approximate nearest neighbor search
- [Agents as Tools Pattern](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agents-as-tools/) - Multi-agent architecture best practices

---

## ⭐ Community & Support

### Like This Workshop?

If you find this helpful:

- ⭐ **Star this repository** to show support and help others discover it
- 🔱 **Fork it** to customize for your specific use cases
- 🐛 **Report issues** to help improve the workshop
- 📢 **Share it** with your community and colleagues
- 💬 **Contribute** - Pull requests welcome for improvements

### Getting Help

- **Workshop Issues**: [GitHub Issues](https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg/issues)
- **AWS Support**: [AWS Support Center](https://console.aws.amazon.com/support/)
- **Community**: [AWS Database Blog](https://aws.amazon.com/blogs/database/)

---

## 📄 License

This library is licensed under the MIT-0 License. See the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

**Workshop Developed and Tested By:**

- **Shayon Sanyal** - Principal Solutions Architect, AWS | Email: shayons@amazon.com
- **AWS Database Specialists** - Workshop support team

**Special Thanks:**

- pgvector community for the amazing open-source extension
- Anthropic for Claude Sonnet 4 capabilities
- AWS Workshop Studio team for platform support

---

<div align="center">

**© 2025 Amazon Web Services | AWS re:Invent 2025 | DAT406 Workshop**

[![GitHub](https://img.shields.io/badge/GitHub-aws--samples-181717?style=flat-square&logo=github)](https://github.com/aws-samples)
[![AWS](https://img.shields.io/badge/AWS-Workshop-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)](https://aws.amazon.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Shayon_Sanyal-0077B5?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/shayonsanyal/)

### ⭐ If you found this workshop helpful, please star this repository! ⭐

**Built with ❤️ for the AWS community**

</div>
