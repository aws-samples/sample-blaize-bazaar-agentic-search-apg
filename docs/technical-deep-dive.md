# Technical Deep Dive: Behind the Scenes

This document provides detailed technical explanations of the search and AI agent implementations in Blaize Bazaar. Perfect for 400-level workshop participants who want to understand the architecture.

---

## 1. Semantic Search Demo

### What's Happening Behind the Scenes

When you type a natural language query like _"wireless headphones for running"_, here's the complete flow:

```
User Query → Titan Embeddings v2 → 1024-dim Vector → pgvector HNSW Index → Cosine Similarity → Ranked Results
```

### Embedding Generation

The `EmbeddingService` class converts text to vectors using Amazon Titan Text Embeddings v2:

```python
# services/embeddings.py

class EmbeddingService:
    def __init__(self):
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION
        )
        self.model_id = settings.BEDROCK_EMBEDDING_MODEL  # amazon.titan-embed-text-v2:0
        self.embedding_dimension = 1024

    def generate_embedding(self, text: str, normalize: bool = True) -> List[float]:
        """Generate 1024-dimensional embedding vector for text."""
        # Truncate if too long (Titan v2 limit: 8192 characters)
        text = text[:8192].strip()

        request_body = {"inputText": text}

        response = self.bedrock_runtime.invoke_model(
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        embedding = response_body.get('embedding', [])  # Returns 1024-dim vector

        return embedding
```

### Vector Search with pgvector

The semantic search uses PostgreSQL's pgvector extension with HNSW indexing:

```python
# services/business_logic.py

async def semantic_product_search(
    self,
    query: str,
    max_price: float = None,
    min_rating: float = 4.0,
    category: str = None,
    limit: int = 5
) -> Dict[str, Any]:
    """Search products using semantic embeddings and pgvector similarity."""

    # Step 1: Generate query embedding
    embedding_service = EmbeddingService()
    query_embedding = embedding_service.embed_query(query)

    # Step 2: Vector similarity search using cosine distance (<=>)
    search_query = """
        WITH query_embedding AS (SELECT %s::vector as emb)
        SELECT
            "productId",
            product_description,
            price,
            stars,
            reviews,
            category_name,
            1 - (embedding <=> (SELECT emb FROM query_embedding)) as similarity
        FROM bedrock_integration.product_catalog
        WHERE quantity > 0 AND stars >= %s
        ORDER BY embedding <=> (SELECT emb FROM query_embedding)
        LIMIT %s
    """

    results = await self.db.fetch_all(search_query, str(query_embedding), min_rating, limit)
    return {"products": results}
```

### Key Technical Details

| Component             | Implementation                            |
| --------------------- | ----------------------------------------- |
| **Embedding Model**   | Amazon Titan Text Embeddings v2           |
| **Vector Dimensions** | 1024                                      |
| **Index Type**        | HNSW (Hierarchical Navigable Small World) |
| **Distance Metric**   | Cosine similarity via `<=>` operator      |
| **Performance**       | ~10-50ms for 21K+ products                |

---

## 2. Visual Search Demo

### What's Happening Behind the Scenes

Visual search uses a two-stage pipeline:

```
Image Upload → Claude Sonnet 4 Vision → Product Analysis → Natural Language Query → Semantic Search
```

### Image Analysis with Claude Vision

```python
# services/image_search.py

class ImageSearchService:
    def __init__(self):
        self.bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION
        )
        self.vision_model = "global.anthropic.claude-sonnet-4-20250514-v1:0"

    async def analyze_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> Optional[Dict[str, Any]]:
        """Analyze product image using Claude Sonnet 4 vision."""

        # Convert image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # Multi-modal request with image + text prompt
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "temperature": 0.3,  # Lower for consistent analysis
            "system": "You are a product analysis expert for an e-commerce platform.",
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": """Analyze this product image and provide:
                        1. A detailed description (2-3 sentences)
                        2. The most likely product category
                        3. Key features, materials, style
                        4. 5-7 search keywords for finding similar products

                        Format as JSON: {description, category, key_features, search_keywords}"""
                    }
                ]
            }]
        }

        response = self.bedrock_client.invoke_model(
            modelId=self.vision_model,
            body=json.dumps(body),
            contentType="application/json"
        )

        # Parse Claude's structured JSON response
        return json.loads(response_body["content"][0]["text"])
```

### Query Generation from Image Analysis

```python
def create_search_query(self, analysis: Dict[str, Any]) -> str:
    """Convert image analysis into semantic search query."""
    query_parts = []

    if analysis.get("description"):
        query_parts.append(analysis["description"])

    if analysis.get("category"):
        query_parts.append(analysis["category"])

    if analysis.get("key_features"):
        query_parts.extend(analysis["key_features"][:3])  # Top 3 features

    # Natural language query for embedding
    return " ".join(query_parts)
```

### Visual Search Pipeline

1. **Image Upload** → Base64 encoding
2. **Claude Vision Analysis** → Extracts description, category, features, keywords
3. **Query Construction** → Combines analysis into natural language
4. **Embedding Generation** → Titan converts query to 1024-dim vector
5. **Vector Search** → pgvector finds similar products

---

## 3. AI Assistant Demo

### What's Happening Behind the Scenes

The AI Assistant uses a **multi-agent orchestration pattern** with the Strands SDK:

```
User Query → Orchestrator Agent → Routes to Specialist → Specialist Executes Tools → Response
```

### Orchestrator Pattern

```python
# agents/orchestrator.py

from strands import Agent
from strands.models import BedrockModel

ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Route to the right agent.

AGENTS:
- price_optimization_agent: Best deals, pricing queries
- inventory_restock_agent: Stock levels, restocking
- product_recommendation_agent: General product search

CRITICAL: After calling an agent, return its EXACT output unchanged."""


def create_orchestrator():
    """Create orchestrator with specialized agents as tools."""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=16384,
            temperature=0.0  # Deterministic routing
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[
            product_recommendation_agent,
            price_optimization_agent,
            inventory_restock_agent
        ]
    )
```

### Specialized Agents with Tools

Each agent is decorated with `@tool` and has access to database tools:

```python
# agents/recommendation_agent.py

from strands import Agent, tool
from services.agent_tools import semantic_product_search

@tool
def product_recommendation_agent(query: str) -> str:
    """Provide personalized product recommendations."""

    # Extract user preferences from conversation context
    preferences = _extract_user_preferences(query)

    # Build personalized query
    enhanced_query = query
    if preferences['categories']:
        for cat in preferences['categories'][:2]:
            enhanced_query += f" {cat}"
        if preferences['price_range']:
            enhanced_query += f" under ${preferences['price_range']}"

    # Execute semantic search with filters
    result = semantic_product_search(
        query=enhanced_query,
        max_price=preferences['price_range'],
        limit=5
    )

    return json.dumps(result)
```

### Agent Tools - Database Access Layer

```python
# services/agent_tools.py

from strands import tool

@tool
def semantic_product_search(
    query: str,
    max_price: float = None,
    min_rating: float = 4.0,
    category: str = None,
    limit: int = 5
) -> str:
    """Search products using AI-powered semantic understanding with filters.

    Args:
        query: Natural language search query
        max_price: Maximum price filter (optional)
        min_rating: Minimum star rating (default: 4.0)
        category: Category filter (optional)
        limit: Number of results (default: 5)
    """
    from services.business_logic import BusinessLogic
    logic = BusinessLogic(_db_service)
    result = _run_async(logic.semantic_product_search(
        query, max_price, min_rating, category, limit
    ))
    return json.dumps(result, indent=2)


@tool
def get_low_stock_products(limit: int = 3) -> str:
    """Get products with low stock (quantity < 10) prioritized by demand."""
    from services.business_logic import BusinessLogic
    logic = BusinessLogic(_db_service)
    result = _run_async(logic.get_low_stock_products(limit))
    return json.dumps(result, indent=2)


@tool
def restock_product(product_id: str, quantity: int) -> str:
    """Restock a product in database with live execution."""
    # ... executes actual UPDATE query in PostgreSQL
```

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR AGENT                         │
│         (Claude Sonnet 4 - Routes queries to specialists)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Recommendation │ │     Pricing     │ │    Inventory    │
│      Agent      │ │      Agent      │ │      Agent      │
│                 │ │                 │ │                 │
│ • semantic_     │ │ • semantic_     │ │ • get_low_     │
│   product_search│ │   product_search│ │   stock        │
│ • get_trending  │ │ • get_category_ │ │ • get_inventory│
│                 │ │   price_analysis│ │   _health      │
│                 │ │                 │ │ • restock_     │
│                 │ │                 │ │   product      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 4. Hybrid Search Implementation

### What's Happening Behind the Scenes

Hybrid search combines **vector similarity** with **keyword matching** using Reciprocal Rank Fusion (RRF):

```
Query → [Vector Search] + [Full-Text Search] → RRF Fusion → Combined Rankings
```

### Hybrid Search Service

```python
# services/hybrid_search.py

class HybridSearchService:
    """
    Hybrid search combining vector similarity and full-text search.

    Strategies:
    - Vector search: Semantic similarity using pgvector
    - Full-text search: Keyword matching using PostgreSQL tsvector
    - RRF: Combines rankings from both methods
    """

    async def search(
        self,
        query: str,
        embedding: List[float],
        limit: int = 10,
        vector_weight: float = 0.6,
        fulltext_weight: float = 0.4,
        ef_search: int = 40
    ) -> Dict[str, Any]:
        """Hybrid search with RRF ranking."""

        # Normalize weights
        total = vector_weight + fulltext_weight
        vector_weight /= total
        fulltext_weight /= total

        # Run both searches (can be parallelized)
        vector_results = await self._vector_search(embedding, limit * 2, ef_search)
        fulltext_results = await self._fulltext_search(query, limit * 2)

        # Apply Reciprocal Rank Fusion
        fused_results = self._reciprocal_rank_fusion(
            vector_results,
            fulltext_results,
            vector_weight,
            fulltext_weight,
            limit
        )

        return {
            "results": fused_results,
            "method": "hybrid_rrf",
            "weights": {"vector": vector_weight, "fulltext": fulltext_weight}
        }
```

### Vector Search Component

```python
async def _vector_search(
    self,
    embedding: List[float],
    limit: int,
    ef_search: int
) -> List[Dict[str, Any]]:
    """Vector similarity search using pgvector HNSW index."""

    async with self.db.get_connection() as conn:
        async with conn.cursor() as cur:
            # Set HNSW search parameter for quality/speed tradeoff
            await cur.execute(f"SET LOCAL hnsw.ef_search = {ef_search}")

            await cur.execute("""
                SELECT
                    "productId" as product_id,
                    product_description,
                    category_name,
                    price,
                    stars as rating,
                    1 - (embedding <=> %s::vector) as similarity
                FROM bedrock_integration.product_catalog
                WHERE stars >= 3.5
                  AND reviews >= 10
                  AND "imgUrl" IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (embedding, embedding, limit))

            return [dict(r) for r in await cur.fetchall()]
```

### Full-Text Search Component

```python
async def _fulltext_search(
    self,
    query: str,
    limit: int
) -> List[Dict[str, Any]]:
    """Full-text search using PostgreSQL tsvector."""

    search_query = """
        SELECT
            "productId" as product_id,
            product_description,
            category_name,
            price,
            stars as rating,
            ts_rank(
                to_tsvector('english', product_description || ' ' || category_name),
                plainto_tsquery('english', %s)
            ) as rank
        FROM bedrock_integration.product_catalog
        WHERE to_tsvector('english', product_description || ' ' || category_name)
              @@ plainto_tsquery('english', %s)
          AND stars >= 3.5
          AND reviews >= 10
        ORDER BY rank DESC
        LIMIT %s
    """

    return await self.db.fetch_all(search_query, query, query, limit)
```

### Reciprocal Rank Fusion (RRF) Algorithm

RRF combines rankings from multiple search methods without requiring score normalization:

```python
def _reciprocal_rank_fusion(
    self,
    vector_results: List[Dict[str, Any]],
    fulltext_results: List[Dict[str, Any]],
    vector_weight: float,
    fulltext_weight: float,
    limit: int,
    k: int = 60  # RRF constant - reduces impact of high ranks
) -> List[Dict[str, Any]]:
    """
    Reciprocal Rank Fusion algorithm.

    RRF Score = Σ(weight / (k + rank))

    The k constant (typically 60) prevents high-ranked items from
    dominating the final score.
    """
    scores = {}

    # Score vector search results
    for rank, result in enumerate(vector_results, 1):
        pid = result['product_id']
        score = vector_weight / (k + rank)
        scores[pid] = {
            'score': score,
            'data': result,
            'vector_rank': rank,
            'fulltext_rank': None
        }

    # Add full-text search results
    for rank, result in enumerate(fulltext_results, 1):
        pid = result['product_id']
        score = fulltext_weight / (k + rank)

        if pid in scores:
            # Product found in both - add scores together
            scores[pid]['score'] += score
            scores[pid]['fulltext_rank'] = rank
        else:
            # New product from full-text only
            scores[pid] = {
                'score': score,
                'data': result,
                'vector_rank': None,
                'fulltext_rank': rank
            }

    # Sort by combined RRF score
    sorted_items = sorted(scores.items(), key=lambda x: x[1]['score'], reverse=True)

    # Format results with ranking metadata
    results = []
    for pid, item in sorted_items[:limit]:
        result = item['data'].copy()
        result['rrf_score'] = item['score']
        result['vector_rank'] = item['vector_rank']
        result['fulltext_rank'] = item['fulltext_rank']
        results.append(result)

    return results
```

### Why Hybrid Search?

| Method                  | Strengths                                  | Weaknesses                     |
| ----------------------- | ------------------------------------------ | ------------------------------ |
| **Vector (Semantic)**   | Understands meaning, handles synonyms      | May miss exact keyword matches |
| **Full-Text (Keyword)** | Fast exact matches, good for product names | Misses conceptual similarity   |
| **Hybrid + RRF**        | Best of both worlds, robust ranking        | Slightly more complex          |

### RRF Score Example

For a query "wireless gaming headset":

| Product   | Vector Rank | Full-Text Rank | RRF Score Calculation                                         |
| --------- | ----------- | -------------- | ------------------------------------------------------------- |
| Product A | 1           | 3              | `0.6/(60+1) + 0.4/(60+3) = 0.0098 + 0.0063 = 0.0161`          |
| Product B | 2           | 1              | `0.6/(60+2) + 0.4/(60+1) = 0.0097 + 0.0066 = 0.0163` ← Winner |
| Product C | 5           | None           | `0.6/(60+5) = 0.0092`                                         |

**Result**: Product B wins because it ranks highly in both methods.

---

## Summary

| Component            | Technology Stack                           |
| -------------------- | ------------------------------------------ |
| **Embeddings**       | Amazon Titan Text Embeddings v2 (1024-dim) |
| **Vector Store**     | PostgreSQL + pgvector + HNSW index         |
| **Vision AI**        | Claude Sonnet 4 multi-modal                |
| **Agent Framework**  | Strands SDK + Claude Sonnet 4              |
| **Full-Text Search** | PostgreSQL tsvector/tsquery                |
| **Ranking**          | Reciprocal Rank Fusion (RRF)               |
