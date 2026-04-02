"""
DAT406 Workshop - Main FastAPI Application
FastAPI app with semantic search (Lab 1) and multi-agent system (Lab 2)
"""

import asyncio
import time
import logging
import json
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi import File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    HealthResponse,
    ChatRequest,
    ChatResponse,
)
from models.image_search_models import ImageSearchResponse
from models.product import Product, ProductWithScore
from services.database import DatabaseService
from services.auth import get_current_user
from services.embeddings import EmbeddingService
from services.chat import ChatService
from services.image_search import ImageSearchService
from datetime import datetime
from services.sql_query_logger import init_query_logger, get_query_logger, QueryLog
from services.index_performance import get_index_performance_service
from services.hybrid_search import HybridSearchService
from services.rerank import RerankService
from services.cache import init_cache, get_cache

# Lab 2 agents use Strands SDK function pattern (not class-based)
# Agents are available via /api/agents/query endpoint
LAB2_AVAILABLE = True

# Configure logging for Strands SDK
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler()]
)

# Filter out malicious bot requests from logs
class SecurityScanFilter(logging.Filter):
    """Filter out automated security scanner requests"""
    MALICIOUS_PATTERNS = [
        'phpunit', '.env', 'eval-stdin', 'wp-admin', 'wp-login',
        '.git', 'config.php', 'shell', 'cmd', 'exec'
    ]
    
    def filter(self, record):
        message = record.getMessage().lower()
        return not any(pattern in message for pattern in self.MALICIOUS_PATTERNS)

# Apply filter to uvicorn access logger
logging.getLogger("uvicorn.access").addFilter(SecurityScanFilter())

# Configure the root strands logger
logging.getLogger("strands").setLevel(logging.INFO)

# Configure app logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# Global service instances
db_service: DatabaseService = None
embedding_service: EmbeddingService = None
chat_service: ChatService = None
image_search_service: ImageSearchService = None
query_logger = None
index_performance_service = None
rerank_service: RerankService = None

# Lab 2 agents use function pattern - no global instances needed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting DAT406 Workshop API...")
    
    global db_service, embedding_service, chat_service, image_search_service, query_logger, index_performance_service, rerank_service
    
    try:
        # Initialize Strands OpenTelemetry tracing
        try:
            from strands.telemetry import StrandsTelemetry
            import sys
            
            strands_telemetry = StrandsTelemetry()
            
            # Custom formatter for cleaner trace output
            def format_trace(span):
                attrs = span.attributes or {}
                name = span.name
                duration_ms = (span.end_time - span.start_time) / 1_000_000  # ns to ms
                
                # Extract key metrics
                agent_name = attrs.get('gen_ai.agent.name', '')
                total_tokens = attrs.get('gen_ai.usage.total_tokens', 0)
                prompt_tokens = attrs.get('gen_ai.usage.prompt_tokens', 0)
                completion_tokens = attrs.get('gen_ai.usage.completion_tokens', 0)
                
                # Format based on span type
                if 'invoke_agent' in name:
                    return f"✨ Agent: {agent_name} | {duration_ms:.0f}ms | Tokens: {total_tokens} ({prompt_tokens} in + {completion_tokens} out)\n"
                elif 'chat' in name and total_tokens > 0:
                    return f"  🤖 LLM Call | {duration_ms:.0f}ms | Tokens: {total_tokens}\n"
                elif 'execute_event_loop_cycle' in name:
                    cycle_id = attrs.get('event_loop.cycle_id', '')[:8]
                    return f"  🔄 Cycle {cycle_id} | {duration_ms:.0f}ms\n"
                else:
                    return f"  • {name} | {duration_ms:.0f}ms\n"
            
            strands_telemetry.setup_console_exporter(
                out=sys.stdout,
                formatter=format_trace
            )

            logger.info("✅ Strands OpenTelemetry tracing enabled (compact format)")

            # === WIRE IT LIVE (Lab 4d) ===
            # Export traces to CloudWatch X-Ray via OTLP (requires OTEL_EXPORTER_OTLP_ENDPOINT)
            try:
                import os
                if settings.OTEL_EXPORTER_OTLP_ENDPOINT:
                    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", settings.OTEL_EXPORTER_OTLP_ENDPOINT)
                    os.environ.setdefault("OTEL_SERVICE_NAME", "blaize-bazaar")
                    os.environ.setdefault("OTEL_RESOURCE_ATTRIBUTES", "service.namespace=dat406,deployment.environment=workshop")
                    strands_telemetry.setup_otlp_exporter()
                    logger.info("✅ OTLP exporter enabled — traces → CloudWatch X-Ray")
                else:
                    logger.info("ℹ️  OTLP exporter skipped (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)")
            except Exception as e:
                logger.warning(f"⚠️ OTLP exporter not available: {e}")
            # === END WIRE IT LIVE ===

            # Attach in-memory span capture for trace extraction
            try:
                from services.otel_trace_extractor import init_span_capture
                init_span_capture()
            except Exception as e:
                logger.warning(f"⚠️ Failed to init span capture: {e}")

        except ImportError:
            logger.warning("⚠️ Strands OpenTelemetry not available - install with: pip install 'strands-agents[otel]'")
        except Exception as e:
            logger.warning(f"⚠️ Failed to setup OpenTelemetry: {e}")
        
        # Initialize core services
        db_service = DatabaseService()
        await db_service.connect()
        logger.info("✅ Database service initialized")
        
        embedding_service = EmbeddingService()
        logger.info("✅ Embedding service initialized (Cohere Embed v4)")

        rerank_service = RerankService()
        logger.info("✅ Rerank service initialized (Cohere Rerank v3.5)")

        # Initialize Valkey cache (graceful fallback to in-memory)
        cache_svc = init_cache(
            valkey_url=settings.VALKEY_URL,
            default_ttl=settings.CACHE_TTL,
        )
        logger.info(f"✅ Cache service initialized (mode={cache_svc.mode})")
        
        chat_service = ChatService(db_service=db_service)
        logger.info("✅ Chat service initialized")

        # Initialize SQL query logger
        query_logger = init_query_logger(max_logs=100)
        logger.info("✅ SQL query logger initialized")

        # Initialize index performance service
        conn_string = f"host={settings.DB_HOST} port={settings.DB_PORT} dbname={settings.DB_NAME} user={settings.DB_USER} password={settings.DB_PASSWORD}"
        index_performance_service = get_index_performance_service(conn_string)
        logger.info("✅ Index performance service initialized")

        # Initialize image search service
        image_search_service = ImageSearchService()
        logger.info("✅ Image search service initialized")
        
        # Set chat service logger to INFO
        logging.getLogger('services.chat').setLevel(logging.INFO)
        
        # Initialize agent tools with database + rerank services (hybrid search)
        from services.agent_tools import set_db_service, set_rerank_service, set_main_loop
        set_db_service(db_service)
        set_rerank_service(rerank_service)
        set_main_loop(asyncio.get_event_loop())
        logger.info("✅ Agent tools initialized with hybrid search (vector + keyword + rerank)")
        
        # Lab 2 agents use Strands SDK function pattern
        logger.info("✅ Lab 2 agents available via /api/agents/query")
        
        logger.info("🚀 DAT406 Workshop API is ready!")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down DAT406 Workshop API...")
    
    if db_service:
        await db_service.disconnect()
    
    logger.info("👋 Goodbye!")


# Create FastAPI app
app = FastAPI(
    title="DAT406 Workshop API",
    description="Agentic AI-Powered Search with Amazon Aurora PostgreSQL and pgvector",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In enterprise deployments, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency injection
async def get_db_service() -> DatabaseService:
    """Get database service instance"""
    if not db_service:
        raise HTTPException(
            status_code=503, 
            detail="Database unavailable - check network connectivity to Aurora cluster"
        )
    return db_service


async def get_embedding_service() -> EmbeddingService:
    """Get embedding service instance"""
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")
    return embedding_service


def get_image_search_service_dep():
    """Dependency for image search service"""
    global image_search_service
    if not image_search_service:
        raise HTTPException(status_code=503, detail="Image search service not initialized")
    return image_search_service


async def get_rerank_service() -> RerankService:
    """Get rerank service instance"""
    if not rerank_service:
        raise HTTPException(status_code=503, detail="Rerank service not initialized")
    return rerank_service


# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "message": "DAT406 Workshop API",
        "version": "1.0.0",
        "lab1": "Semantic Search with pgvector",
        "lab2": "Multi-Agent System with Custom Tools" if LAB2_AVAILABLE else "Not Available"
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check(
    db: DatabaseService = Depends(get_db_service),
):
    """
    Health check endpoint
    Returns status of all services
    """
    health_status = {
        "status": "healthy",
        "database": "unknown",
        "bedrock": "unknown",
        "custom_tools": "unknown" if LAB2_AVAILABLE else "not_available",
        "version": "1.0.0"
    }
    
    # Check database connection
    try:
        await db.execute_query("SELECT 1")
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["database"] = "disconnected"
        health_status["status"] = "degraded"
    
    # Check Bedrock access
    try:
        embedding_service.generate_embedding("test")
        health_status["bedrock"] = "accessible"
    except Exception as e:
        logger.error(f"Bedrock health check failed: {e}")
        health_status["bedrock"] = "inaccessible"
        health_status["status"] = "degraded"
    
    # Check Custom Tools if Lab 2 is available
    if LAB2_AVAILABLE:
        health_status["custom_tools"] = "available"
    
    return HealthResponse(**health_status)


# ============================================================================
# LAB 1: SEMANTIC SEARCH ENDPOINTS
# ============================================================================

@app.post("/api/search", response_model=SearchResponse)
async def semantic_search(
    request: SearchRequest,
    db: DatabaseService = Depends(get_db_service),
    embeddings: EmbeddingService = Depends(get_embedding_service),
    use_hybrid: bool = False
):
    """
    LAB 1: Semantic search endpoint using vector similarity
    
    Performs pure vector similarity search using pgvector HNSW index
    and Cohere Embed v4 embeddings. Optionally uses hybrid search (vector + full-text).
    """
    start_time = time.time()
    use_hybrid = request.query.startswith("hybrid:") or use_hybrid
    if use_hybrid and request.query.startswith("hybrid:"):
        request.query = request.query.replace("hybrid:", "").strip()
    
    try:
        # Determine search type based on request parameters
        if request.search_mode == "keyword":
            search_type = "keyword"
        elif use_hybrid:
            search_type = "hybrid"
        else:
            search_type = "vector"
        logger.info(f"🔍 {search_type.upper()} search: '{request.query}' (limit={request.limit})")

        if search_type == "keyword":
            # Keyword-only search — no embeddings, PostgreSQL full-text matching only
            keyword_sql = """
                SELECT
                    "productId",
                    product_description,
                    "imgUrl" as imgurl,
                    "productURL" as producturl,
                    stars,
                    reviews,
                    price,
                    category_id,
                    "isBestSeller" as isbestseller,
                    "boughtInLastMonth" as boughtinlastmonth,
                    category_name,
                    quantity,
                    ts_rank(to_tsvector('english', product_description || ' ' || category_name), plainto_tsquery('english', %s)) as similarity_score
                FROM blaize_bazaar.product_catalog
                WHERE to_tsvector('english', product_description || ' ' || category_name) @@ plainto_tsquery('english', %s)
                  AND stars >= 3.0
                  AND "imgUrl" IS NOT NULL
                ORDER BY similarity_score DESC
                LIMIT %s
            """
            results = await db.fetch_all(keyword_sql, request.query, request.query, request.limit)
            logger.info(f"📦 Keyword search found {len(results)} products")

        elif search_type == "hybrid":
            # Generate query embedding for hybrid/vector paths
            query_embedding = embeddings.generate_embedding(request.query)
            logger.info(f"✅ Generated embedding vector (1024 dimensions)")

            # Hybrid search with RRF
            hybrid_service = HybridSearchService(db)
            hybrid_result = await hybrid_service.search(
                query=request.query,
                embedding=query_embedding,
                limit=request.limit
            )
            results = hybrid_result["results"]
            logger.info(f"🔀 Hybrid search returned {len(results)} results with RRF scores")
            
            # Convert to expected format - preserve RRF fields at top level
            for r in results:
                if 'similarity' in r:
                    r['similarity_score'] = r['similarity']
                r['productId'] = r.get('product_id')
                r['imgurl'] = r.get('img_url', '')
                r['producturl'] = r.get('product_url', '')
                r['isbestseller'] = r.get('isbestseller', False)
                r['boughtinlastmonth'] = r.get('boughtinlastmonth', 0)
                r['stars'] = r.get('rating', 0)
                # RRF fields are already at top level from hybrid_search.py
        else:
            # Generate query embedding for vector search
            query_embedding = embeddings.generate_embedding(request.query)
            logger.info(f"✅ Generated embedding vector (1024 dimensions)")

            # Prepare SQL with relaxed quality filters for better semantic coverage
            query_sql = """
                SELECT 
                    "productId",
                    product_description,
                    "imgUrl" as imgurl,
                    "productURL" as producturl,
                    stars,
                    reviews,
                    price,
                    category_id,
                    "isBestSeller" as isbestseller,
                    "boughtInLastMonth" as boughtinlastmonth,
                    category_name,
                    quantity,
                    1 - (embedding <=> %s::vector) as similarity_score
                FROM blaize_bazaar.product_catalog
                WHERE stars >= 3.0
                  AND "imgUrl" IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            
            # Use a single connection for SET LOCAL + query (SET LOCAL is transaction-scoped)
            async with db.get_connection() as conn:
                async with conn.cursor() as cur:
                    # Force index usage with planner hints
                    await cur.execute("SET LOCAL enable_seqscan = off")
                    await cur.execute("SET LOCAL random_page_cost = 1")
                    await cur.execute("SET LOCAL cpu_tuple_cost = 0.01")

                    # Execute query with index forced
                    await cur.execute(
                        query_sql,
                        (query_embedding, query_embedding, request.limit)
                    )
                    results = await cur.fetchall()

            # Log the query for SQLInspector (non-blocking, no EXPLAIN)
            query_logger_instance = get_query_logger()
            query_logger_instance.queries.append(
                QueryLog(
                    query_type="semantic_search",
                    sql=query_sql,
                    params=[query_embedding, query_embedding, request.limit],
                    execution_time_ms=0,
                    timestamp=datetime.now(),
                    rows_returned=len(results),
                    search_query=request.query,
                )
            )
        
        # Filter by similarity threshold in application (after HNSW index optimization)
        if request.min_similarity > 0:
            results = [r for r in results if r.get("similarity_score", 0) >= request.min_similarity]
        
        logger.info(f"📦 Found {len(results)} products")
        
        # Convert to response model
        search_results = []
        for row in results:
            row_dict = dict(row)
            # Extract RRF fields before creating ProductWithScore
            rrf_score = row_dict.pop('rrf_score', None)
            vector_rank = row_dict.pop('vector_rank', None)
            fulltext_rank = row_dict.pop('fulltext_rank', None)
            
            product = ProductWithScore(**row_dict)
            search_result = SearchResult(product=product)
            
            # Add RRF fields back to search_result dict for hybrid searches
            if rrf_score is not None:
                search_result.rrf_score = rrf_score
                search_result.vector_rank = vector_rank
                search_result.fulltext_rank = fulltext_rank
            
            search_results.append(search_result)
        
        search_time_ms = (time.time() - start_time) * 1000
        logger.info(f"⚡ Search completed in {search_time_ms:.2f}ms (method: {search_type})")
        
        return SearchResponse(
            query=request.query,
            results=search_results,
            total_results=len(search_results),
            search_time_ms=search_time_ms,
            search_type=search_type
        )
        
    except Exception as e:
        logger.error(f"❌ Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/api/search/hybrid-rerank")
async def hybrid_rerank_search(
    request: SearchRequest,
    db: DatabaseService = Depends(get_db_service),
    embeddings: EmbeddingService = Depends(get_embedding_service),
    reranker: RerankService = Depends(get_rerank_service),
):
    """
    LAB 1: Hybrid search with Cohere Rerank

    Pipeline:
      1. Generate query embedding (Cohere Embed v4)
      2. Run keyword + vector search in parallel
      3. Merge unique candidates
      4. Re-rank with Cohere Rerank v3.5
      5. Return top results with relevance scores
    """
    start_time = time.time()

    try:
        # Generate query embedding
        embed_start = time.time()
        query_embedding = embeddings.embed_query(request.query)
        embed_time_ms = (time.time() - embed_start) * 1000

        # Hybrid search + rerank
        hybrid_service = HybridSearchService(db)
        result = await hybrid_service.search_with_rerank(
            query=request.query,
            embedding=query_embedding,
            rerank_service=reranker,
            limit=request.limit,
            candidate_pool_size=20,
        )

        total_time_ms = (time.time() - start_time) * 1000

        # Add embed time to timing
        result["timing"]["embed_time_ms"] = round(embed_time_ms, 2)
        result["timing"]["total_time_ms"] = round(total_time_ms, 2)

        logger.info(
            f"🏆 Hybrid+Rerank: '{request.query}' → {result['total']} results "
            f"({total_time_ms:.0f}ms total)"
        )

        return result

    except Exception as e:
        logger.error(f"❌ Hybrid rerank search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(
    product_id: str,
    db: DatabaseService = Depends(get_db_service),
):
    """
    Get a single product by ID
    """
    try:
        query = """
            SELECT 
                "productId",
                product_description,
                "imgUrl" as imgurl,
                "productURL" as producturl,
                stars,
                reviews,
                price,
                category_id,
                "isBestSeller" as isbestseller,
                "boughtInLastMonth" as boughtinlastmonth,
                category_name,
                quantity
            FROM blaize_bazaar.product_catalog
            WHERE "productId" = %s
        """
        
        result = await db.fetch_one(query, product_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return Product(**dict(result))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch product: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch product: {str(e)}")

@app.post("/api/search/image", response_model=ImageSearchResponse)
async def image_search(
    file: UploadFile = File(...),
    limit: int = Query(default=12, ge=1, le=50),
    min_similarity: float = Query(default=0.0, ge=0, le=1),
    db: DatabaseService = Depends(get_db_service),
    embeddings: EmbeddingService = Depends(get_embedding_service),
    image_search: ImageSearchService = Depends(get_image_search_service_dep),
):
    """
    Multi-Modal Image Search Endpoint
    
    Upload a product image to find similar products using Claude Sonnet 4 vision
    and pgvector semantic search.
    """
    import time
    import base64
    
    start_time = time.time()
    
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Must be an image (JPEG, PNG, WebP)"
            )
        
        logger.info(f"📸 Image search: {file.filename}")
        
        # Read image
        image_data = await file.read()
        image_size_mb = len(image_data) / (1024 * 1024)
        
        if image_size_mb > 5:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large: {image_size_mb:.2f}MB. Maximum is 5MB"
            )
        
        # Analyze with Claude Sonnet 4
        logger.info("🤖 Analyzing image with Claude Sonnet 4 vision...")
        analysis = await image_search.analyze_image(
            image_data=image_data,
            mime_type=file.content_type
        )
        
        if not analysis:
            raise HTTPException(
                status_code=500,
                detail="Failed to analyze image"
            )
        
        # Generate search query
        search_query = image_search.create_search_query(analysis)
        logger.info(f"🔍 Generated search query: {search_query[:100]}...")
        
        # Get embedding
        query_embedding = embeddings.generate_embedding(search_query)
        
        # Search database with relaxed quality filters
        query = """
            SELECT 
                "productId",
                product_description,
                "imgUrl" as imgurl,
                "productURL" as producturl,
                stars,
                reviews,
                price,
                category_id,
                "isBestSeller" as isbestseller,
                "boughtInLastMonth" as boughtinlastmonth,
                category_name,
                quantity,
                1 - (embedding <=> %s::vector) as similarity_score
            FROM blaize_bazaar.product_catalog
            WHERE stars >= 3.0
              AND "imgUrl" IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        
        results = await db.fetch_all(
            query,
            query_embedding,
            query_embedding,
            limit
        )
        
        # Filter by similarity in application if needed
        if min_similarity > 0:
            results = [r for r in results if r.get("similarity_score", 0) >= min_similarity]
        
        # Format results
        from models.product import ProductWithScore
        from models.search import SearchResult
        
        search_results = []
        for row in results:
            product = ProductWithScore(**dict(row))
            search_result = SearchResult(product=product)
            search_results.append(search_result)
        
        search_time_ms = (time.time() - start_time) * 1000
        logger.info(f"✅ Image search complete: {len(results)} products in {search_time_ms:.2f}ms")
        
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        return ImageSearchResponse(
            query_type="image",
            analysis=analysis,
            search_query=search_query,
            results=[r.dict() for r in search_results],
            total_results=len(search_results),
            search_time_ms=search_time_ms,
            image_preview=f"data:{file.content_type};base64,{image_base64[:200]}..."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Image search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()

@app.get("/api/products/category/{category_query}")
async def browse_category(
    category_query: str,
    limit: int = Query(default=5, ge=1, le=50),
    db: DatabaseService = Depends(get_db_service),
):
    """Fast category browsing without embeddings"""
    try:
        logger.info(f"📂 Category browse: '{category_query}' (limit={limit})")
        
        query = """
            SELECT 
                "productId",
                product_description,
                "imgUrl" as imgurl,
                "productURL" as producturl,
                stars,
                reviews,
                price,
                category_name,
                quantity,
                1.0 as similarity_score
            FROM blaize_bazaar.product_catalog
            WHERE (category_name ILIKE %s OR product_description ILIKE %s)
              AND quantity > 0
            ORDER BY stars DESC, reviews DESC
            LIMIT %s
        """
        
        results = await db.fetch_all(query, f"%{category_query}%", f"%{category_query}%", limit)
        logger.info(f"📦 Found {len(results)} products in category")
        
        return {
            "results": [
                {
                    "product": dict(row),
                    "similarity_score": 1.0
                }
                for row in results
            ],
            "total_results": len(results),
            "search_type": "category"
        }
    except Exception as e:
        logger.error(f"❌ Category browse failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products", response_model=List[Product])
async def list_products(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: str = Query(default=None),
    min_stars: float = Query(default=None, ge=0, le=5),
    max_price: float = Query(default=None, ge=0),
    db: DatabaseService = Depends(get_db_service),
):
    """
    List products with optional filters
    """
    try:
        # Build dynamic query with psycopg3 %s placeholders
        conditions = []
        params = []

        if category:
            conditions.append("category_name = %s")
            params.append(category)

        if min_stars is not None:
            conditions.append("stars >= %s")
            params.append(min_stars)

        if max_price is not None:
            conditions.append("price <= %s")
            params.append(max_price)

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        query = f"""
            SELECT
                "productId",
                product_description,
                "imgUrl" as imgurl,
                "productURL" as producturl,
                stars,
                reviews,
                price,
                category_id,
                "isBestSeller" as isbestseller,
                "boughtInLastMonth" as boughtinlastmonth,
                category_name,
                quantity
            FROM blaize_bazaar.product_catalog
            {where_clause}
            ORDER BY reviews DESC
            LIMIT %s OFFSET %s
        """

        params.extend([limit, offset])
        results = await db.fetch_all(query, *params)
        
        return [Product(**dict(row)) for row in results]
        
    except Exception as e:
        logger.error(f"Failed to list products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list products: {str(e)}")


# ============================================================================
# LAB 2: MULTI-AGENT ENDPOINTS (Optional)
# ============================================================================

# Lab 2 agents use Strands SDK function pattern - available via /api/agents/query
# No class-based agent endpoints needed


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/api/tools")
async def list_custom_tools():
    """List all custom business logic tools available"""
    return [
        {"name": "search_products", "description": "Search for products by natural language query with optional filters"},
        {"name": "get_trending_products", "description": "Get trending products by reviews and ratings"},
        {"name": "get_product_by_category", "description": "Browse products filtered by category, rating, and price"},
        {"name": "get_inventory_health", "description": "Check stock levels and inventory alerts"},
        {"name": "get_price_analysis", "description": "Price analytics by category"},
        {"name": "restock_product", "description": "Update product stock quantities"},
        {"name": "compare_products", "description": "Side-by-side product comparison"},
        {"name": "get_low_stock_products", "description": "Find products running low on inventory"},
    ]


@app.get("/api/tools/trending")
async def get_trending(
    limit: int = Query(default=5, ge=1, le=50),
    category: str = Query(default=None),
    db: DatabaseService = Depends(get_db_service)
):
    """Get trending products using business logic"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.get_trending_products(limit, category)
    except Exception as e:
        logger.error(f"Failed to get trending products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tools/inventory-health")
async def get_inventory_health_endpoint(
    db: DatabaseService = Depends(get_db_service)
):
    """Get inventory health using business logic"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.get_inventory_health()
    except Exception as e:
        logger.error(f"Failed to get inventory health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tools/price-stats")
async def get_price_stats(
    category: str = Query(default=None),
    db: DatabaseService = Depends(get_db_service)
):
    """Get price statistics using business logic"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.get_price_analysis(category)
    except Exception as e:
        logger.error(f"Failed to get price statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tools/restock")
async def restock_product_endpoint(
    request: dict,
    db: DatabaseService = Depends(get_db_service)
):
    """Restock a product using business logic"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.restock_product(
            product_id=request["product_id"],
            quantity=request["quantity"]
        )
    except Exception as e:
        logger.error(f"Failed to restock product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user=Depends(get_current_user)):
    """
    Chat endpoint with Aurora AI using Strands SDK and Custom Tools
    """
    if not chat_service:
        raise HTTPException(status_code=503, detail="Chat service not initialized")

    try:
        # Convert conversation history to dict format
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]

        # Get chat response with session persistence
        response = await chat_service.chat(
            message=request.message,
            conversation_history=history,
            session_id=request.session_id,
            workshop_mode=request.workshop_mode,
            guardrails_enabled=request.guardrails_enabled,
            user=user
        )
        
        return ChatResponse(**response)
        
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, user=Depends(get_current_user)):
    """
    Streaming chat endpoint with real-time agent events via SSE.

    Uses chat_service.chat_stream() which runs the orchestrator in a background
    thread and yields events (tool calls, products, text) the moment they happen
    via an asyncio.Queue bridge, instead of waiting for the full chain to finish.
    """
    from fastapi.responses import StreamingResponse

    if not chat_service:
        raise HTTPException(status_code=503, detail="Chat service not initialized")

    async def event_generator():
        try:
            history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
            async for event in chat_service.chat_stream(
                message=request.message,
                conversation_history=history,
                session_id=request.session_id,
                workshop_mode=request.workshop_mode,
                guardrails_enabled=request.guardrails_enabled,
                user=user
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False, default=str)}\n\n"
        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=5, ge=1, le=10),
    db: DatabaseService = Depends(get_db_service)
):
    """Product search autocomplete"""
    try:
        query = """
            SELECT product_description, category_name
            FROM blaize_bazaar.product_catalog
            WHERE product_description ILIKE %s
            ORDER BY reviews DESC
            LIMIT %s
        """
        results = await db.fetch_all(query, f"%{q}%", limit)
        return {"suggestions": [{
            "text": r["product_description"][:60],
            "category": r["category_name"]
        } for r in results]}
    except Exception as e:
        logger.error(f"❌ Autocomplete failed: {e}")
        return {"suggestions": []}


@app.post("/api/agents/query")
async def agent_query(
    query: str,
    agent_type: str = "orchestrator",
    enable_thinking: bool = False,
    db: DatabaseService = Depends(get_db_service)
):
    """
    Query specialized agents (inventory, recommendation, pricing)
    Uses custom business logic tools to provide data to agents
    
    Args:
        query: User query
        agent_type: Type of agent (orchestrator, inventory, recommendation, pricing)
        enable_thinking: Enable Claude Sonnet 4's extended thinking (default: False)
    """
    try:
        from agents.orchestrator import create_orchestrator
        from agents.inventory_agent import inventory_restock_agent
        from agents.recommendation_agent import product_recommendation_agent
        from agents.pricing_agent import price_optimization_agent
        
        # Agents now handle their own tool calls - no need to pre-fetch context
        if agent_type == "orchestrator":
            orchestrator = create_orchestrator()
            if orchestrator is None:
                return {
                    "response": "🔧 The orchestrator isn't wired up yet. Complete Module 3b to enable it.",
                    "agent_type": agent_type,
                    "status": "not_implemented"
                }
            response = orchestrator(query)
        elif agent_type == "inventory":
            response = inventory_restock_agent(query)
        elif agent_type == "recommendation":
            response = product_recommendation_agent(query)
        elif agent_type == "pricing":
            response = price_optimization_agent(query)
        elif agent_type == "customer_support":
            from agents.customer_support_agent import customer_support_agent
            response = customer_support_agent(query)
        elif agent_type == "search":
            from agents.search_agent import search_agent
            response = search_agent(query)
        else:
            raise HTTPException(status_code=400, detail="Invalid agent type")
        
        return {
            "response": str(response),
            "agent_type": agent_type,
            "success": True,
            "note": "Agents use live database tools for fresh data"
        }
        
    except Exception as e:
        logger.error(f"Agent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent query failed: {str(e)}")

# ============================================================================
# SQL QUERY INSPECTOR ENDPOINTS
# ============================================================================

@app.get("/api/queries/recent")
async def get_recent_queries(limit: int = Query(default=10, ge=1, le=50)):
    """
    Get recent SQL queries with performance metrics
    
    Returns query logs for the SQL Inspector UI
    """
    try:
        query_logger_instance = get_query_logger()
        queries = query_logger_instance.get_recent_queries(limit=limit)
        stats = query_logger_instance.get_summary_stats()
        
        return {
            "queries": queries,
            "stats": stats,
            "total": len(queries)
        }
    except Exception as e:
        logger.error(f"Failed to get recent queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/queries/clear")
async def clear_query_logs():
    """Clear all query logs"""
    try:
        query_logger_instance = get_query_logger()
        query_logger_instance.clear_logs()
        return {"status": "success", "message": "Query logs cleared"}
    except Exception as e:
        logger.error(f"Failed to clear logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INDEX PERFORMANCE ENDPOINTS
# ============================================================================

@app.post("/api/performance/compare")
async def compare_index_performance(
    request: dict,
    embeddings: EmbeddingService = Depends(get_embedding_service)
):
    """
    Compare HNSW index performance vs sequential scan
    
    Request body:
        query: Search query text
        ef_search: HNSW ef_search parameter (default: 40)
        limit: Number of results (default: 10)
    """
    try:
        query = request.get("query")
        ef_search = request.get("ef_search", 40)
        limit = request.get("limit", 10)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        logger.info(f"🔬 Index performance comparison: '{query}' (ef_search={ef_search})")
        
        # Generate embedding
        embedding = embeddings.generate_embedding(query)
        
        # Run comparison
        results = await index_performance_service.compare_index_performance(
            query=query,
            embedding=embedding,
            ef_search=ef_search,
            limit=limit
        )
        
        logger.info(f"✅ Comparison complete: HNSW={results['hnsw']['execution_time_ms']}ms, Sequential={results['sequential']['execution_time_ms']}ms")
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Performance comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/performance/stats")
async def get_index_stats():
    """Get pgvector index statistics"""
    try:
        stats = await index_performance_service.get_index_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get index stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONTEXT MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/context/stats")
async def get_context_stats(session_id: Optional[str] = Query(default=None)):
    """
    Get context statistics for monitoring
    
    Returns comprehensive metrics for token usage, efficiency, and costs.
    Demonstrates enterprise-grade context window management for Claude Sonnet 4.
    
    Args:
        session_id: Optional session ID for session-specific stats
    """
    try:
        from services.context_manager import get_context_manager
        
        context_manager = get_context_manager()
        stats = context_manager.get_context_stats()
        
        logger.info(f"📊 Context stats requested: {stats['current_tokens']:,} tokens, {stats['efficiency_score']:.1f}% efficiency")
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get context stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/context/clear")
async def clear_context(session_id: str = Query(...)):
    """
    Clear context for a session
    
    Useful for starting fresh conversations or freeing memory.
    System prompts are preserved.
    
    Args:
        session_id: Session ID to clear context for
    """
    try:
        from services.context_manager import get_context_manager
        
        context_manager = get_context_manager()
        context_manager.clear_context()
        
        logger.info(f"🗑️ Context cleared for session: {session_id}")
        
        return {
            "status": "success",
            "message": f"Context cleared for session {session_id}",
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Failed to clear context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/context/prompts")
async def list_prompts():
    """
    List all available prompt templates with versions and performance metrics
    
    Demonstrates enterprise-grade prompt engineering patterns:
    - Versioned prompts for A/B testing
    - Performance tracking per prompt
    - Agent-specific prompt templates
    """
    try:
        from services.context_manager import PromptRegistry
        
        prompts = PromptRegistry.list_available_prompts()
        
        logger.info(f"📋 Listed {len(prompts)} prompt templates")
        
        return {
            "prompts": prompts,
            "total": len(prompts)
        }
        
    except Exception as e:
        logger.error(f"Failed to list prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# QUANTIZATION COMPARISON ENDPOINT
# ============================================================================

@app.get("/api/performance/quantization")
async def get_quantization_comparison():
    """Compare full-precision vs quantized (SQ/BQ) index sizes"""
    if not index_performance_service:
        raise HTTPException(status_code=503, detail="Index performance service not initialized")
    return await index_performance_service.get_quantization_comparison()


@app.get("/api/performance/categories")
async def get_filter_categories():
    """Get distinct categories for iterative scan demo dropdown"""
    if not index_performance_service:
        raise HTTPException(status_code=503, detail="Index performance service not initialized")
    categories = await index_performance_service.get_distinct_categories()
    return {"categories": categories}


@app.post("/api/performance/iterative-scan")
async def compare_iterative_scan(request: Request):
    """Compare filtered HNSW with and without iterative scan (pgvector 0.8.0)"""
    if not index_performance_service:
        raise HTTPException(status_code=503, detail="Index performance service not initialized")
    body = await request.json()
    query = body.get("query", "")
    category = body.get("category", "")
    ef_search = body.get("ef_search", 40)
    limit = body.get("limit", 10)
    if not query or not category:
        raise HTTPException(status_code=400, detail="query and category required")
    embedding = embedding_service.generate_embedding(query)
    return await index_performance_service.compare_filtered_search(
        query=query, embedding=embedding,
        category_filter=category, ef_search=ef_search, limit=limit,
    )


@app.post("/api/performance/quantization-benchmark")
async def quantization_benchmark(request: Request):
    """Benchmark float32 vs halfvec vs binary quantization with live queries"""
    if not index_performance_service:
        raise HTTPException(status_code=503, detail="Index performance service not initialized")
    body = await request.json()
    query = body.get("query", "")
    limit = body.get("limit", 10)
    if not query:
        raise HTTPException(status_code=400, detail="query required")
    embedding = embedding_service.generate_embedding(query)
    return await index_performance_service.compare_quantization_benchmark(
        query=query, embedding=embedding, limit=limit,
    )


# ============================================================================
# PERSONALIZED SEARCH ENDPOINT
# ============================================================================

@app.post("/api/personalization/search")
async def personalized_search(
    request: Request,
    db: DatabaseService = Depends(get_db_service),
):
    """Search with preference-based re-ranking"""
    from services.business_logic import BusinessLogic
    logic = BusinessLogic(db)
    body = await request.json()
    query = body.get("query", "")
    preferences = body.get("preferences", {})
    limit = body.get("limit", 5)
    return await logic.personalized_search(query, preferences, limit)


# ============================================================================
# SEARCH EVALUATION ENDPOINT
# ============================================================================

@app.get("/api/search/eval")
async def evaluate_search(method: str = Query("vector"), k: int = Query(5)):
    """Evaluate search quality using Precision@k and NDCG@k against golden dataset"""
    from services.search_eval import SearchEvalService
    eval_service = SearchEvalService(db_service=db_service, embedding_service=embedding_service)
    return await eval_service.evaluate_search(method=method, k=k)


# In-memory leaderboard for search eval tuning competition — resets on restart
_leaderboard: list[dict] = []


@app.post("/api/search/eval/tune")
async def tune_search_weights(request: Request):
    """Run NDCG/Precision evaluation with custom RRF weights and record score."""
    body = await request.json()
    vector_weight = max(0.0, min(1.0, float(body.get("vector_weight", 0.6))))
    fulltext_weight = max(0.0, min(1.0, float(body.get("fulltext_weight", 0.4))))
    k = int(body.get("k", 10))
    name = str(body.get("participant_name", "Anonymous"))[:20].strip() or "Anonymous"

    # Normalize so they sum to 1.0
    total = vector_weight + fulltext_weight
    if total == 0:
        vector_weight, fulltext_weight = 0.5, 0.5
    else:
        vector_weight = round(vector_weight / total, 4)
        fulltext_weight = round(fulltext_weight / total, 4)

    from services.search_eval import SearchEvalService, EVAL_QUERIES
    from services.hybrid_search import HybridSearchService

    eval_svc = SearchEvalService(db_service=db_service, embedding_service=embedding_service)
    golden = await eval_svc._build_golden_dataset(k)
    hybrid_svc = HybridSearchService(db_service)

    total_ndcg = 0.0
    total_precision = 0.0
    evaluated = 0

    for item in EVAL_QUERIES:
        query_text = item["query"]
        expected_ids = golden.get(query_text, [])
        if not expected_ids:
            continue
        try:
            embedding = embedding_service.generate_embedding(query_text)
            response = await hybrid_svc.search(
                query_text, embedding, limit=k,
                vector_weight=vector_weight,
                fulltext_weight=fulltext_weight,
            )
            results = response.get("results", [])
            retrieved_ids = [r.get("product_id", r.get("productId", "")) for r in results]
            total_ndcg += eval_svc.ndcg_at_k(retrieved_ids, expected_ids, k)
            total_precision += eval_svc.precision_at_k(retrieved_ids, expected_ids, k)
            evaluated += 1
        except Exception as e:
            logger.warning(f"Tune eval failed for '{query_text}': {e}")

    avg_ndcg = round(total_ndcg / evaluated, 4) if evaluated else 0.0
    avg_precision = round(total_precision / evaluated, 4) if evaluated else 0.0

    entry = {
        "name": name, "ndcg": avg_ndcg, "precision": avg_precision,
        "vector_w": vector_weight, "fulltext_w": fulltext_weight,
        "k": k, "ts": time.strftime("%H:%M:%S"), "evaluated": evaluated,
    }
    _leaderboard.append(entry)
    _leaderboard.sort(key=lambda x: x["ndcg"], reverse=True)
    while len(_leaderboard) > 50:
        _leaderboard.pop()

    rank = next(
        (i + 1 for i, e in enumerate(_leaderboard) if e["ts"] == entry["ts"] and e["ndcg"] == avg_ndcg),
        len(_leaderboard),
    )

    return {
        "ndcg_at_k": avg_ndcg, "precision_at_k": avg_precision, "k": k,
        "vector_weight": vector_weight, "fulltext_weight": fulltext_weight,
        "evaluated_queries": evaluated, "rank": rank,
        "leaderboard": _leaderboard[:10],
    }


@app.get("/api/search/eval/leaderboard")
async def get_leaderboard():
    """Get current search-tuning leaderboard (top 10 by NDCG)."""
    return {"leaderboard": _leaderboard[:10], "total_submissions": len(_leaderboard)}


# ============================================================================
# WORKSHOP MODULE STATUS ENDPOINT
# ============================================================================

@app.get("/api/workshop/status")
async def get_workshop_status():
    """Detect which workshop modules have been completed by inspecting stub source code."""
    import inspect

    def is_stub(func, sentinel: str) -> bool:
        try:
            return sentinel.lower() in inspect.getsource(func).lower()
        except Exception:
            return True

    # Module 2
    from services.hybrid_search import HybridSearchService
    from services.business_logic import BusinessLogic
    m2a = is_stub(HybridSearchService._vector_search, "# TODO: Your implementation here")
    m2b = is_stub(BusinessLogic.search_products, "# TODO: Your implementation here")

    # Module 3a
    from services.agent_tools import get_trending_products
    m3a = is_stub(get_trending_products, "# TODO: Your implementation here")

    # Module 3b
    from agents.recommendation_agent import product_recommendation_agent
    from agents.orchestrator import create_orchestrator
    m3b_rec = is_stub(product_recommendation_agent, "# TODO: Your implementation here")
    m3b_orch = is_stub(create_orchestrator, "# TODO: Your implementation here")

    # Module 4
    from services.agentcore_memory import create_agentcore_session_manager
    from services.agentcore_gateway import create_gateway_orchestrator
    from services.agentcore_policy import PolicyService
    m4_mem = is_stub(create_agentcore_session_manager, "# TODO: Your implementation here")
    m4_gw = is_stub(create_gateway_orchestrator, "# TODO: Your implementation here")
    m4_pol = is_stub(PolicyService._check_policy, "# TODO: Your implementation here")

    return {
        "modules": {
            "module2": {"complete": not m2a and not m2b, "label": "Semantic Search",
                        "stubs": {"vector_search": not m2a, "search_products": not m2b}},
            "module3a": {"complete": not m3a, "label": "Agent Tools",
                         "stubs": {"get_trending_products": not m3a}},
            "module3b": {"complete": not m3b_rec and not m3b_orch, "label": "Multi-Agent",
                         "stubs": {"recommendation_agent": not m3b_rec, "orchestrator": not m3b_orch}},
            "module4": {"complete": not m4_mem and not m4_gw and not m4_pol, "label": "AgentCore",
                        "stubs": {"memory": not m4_mem, "gateway": not m4_gw, "policy": not m4_pol}},
        }
    }


# ============================================================================
# AGENT STATS ENDPOINT
# ============================================================================

@app.get("/api/agent/stats")
async def get_agent_stats():
    """Get session-level agent activity stats"""
    if not chat_service:
        raise HTTPException(status_code=503, detail="Chat service not initialized")
    return chat_service.get_agent_stats()


# ============================================================================
# CACHE & COST ENDPOINTS
# ============================================================================

@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get cache statistics — Valkey/in-memory + embedding cost data."""
    from services.embeddings import get_cache_stats as get_embedding_stats
    cache = get_cache()
    result = cache.stats() if cache else {"mode": "unavailable"}
    result["embedding"] = get_embedding_stats()
    return result


# ============================================================================
# OPENTELEMETRY TRACING ENDPOINTS
# ============================================================================

@app.get("/api/traces/status")
async def get_tracing_status():
    """
    Get OpenTelemetry tracing status and configuration
    """
    try:
        from opentelemetry import trace
        tracer_provider = trace.get_tracer_provider()
        
        return {
            "enabled": tracer_provider is not None,
            "provider_type": type(tracer_provider).__name__,
            "exporters": ["console"],
            "note": "Traces automatically captured by Strands SDK"
        }
    except Exception as e:
        return {"enabled": False, "error": str(e)}


@app.get("/api/traces/waterfall")
async def get_trace_waterfall():
    """Get waterfall timing data from captured OTEL spans"""
    try:
        from services.otel_trace_extractor import get_waterfall_data
        return get_waterfall_data()
    except Exception as e:
        return {"waterfall": [], "span_count": 0, "error": str(e)}


@app.get("/api/traces/info")
async def get_tracing_info():
    """
    Get OpenTelemetry tracing documentation and setup info
    """
    return {
        "tracing_enabled": True,
        "sdk": "Strands OpenTelemetry",
        "exporters": {
            "console": {"enabled": True, "description": "Development traces to console"},
            "otlp": {"enabled": False, "description": "Export to CloudWatch X-Ray/Jaeger"}
        },
        "captured_data": [
            "Agent invocations and routing",
            "LLM calls with token usage",
            "Tool executions with results",
            "End-to-end latency"
        ],
        "visualization": "docker run -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest"
    }


# ============================================================================
# GUARDRAILS ENDPOINT
# ============================================================================

@app.post("/api/guardrails/check")
async def check_guardrails(request: Request):
    """Demo endpoint to test Bedrock Guardrails on input/output text"""
    from services.guardrails import GuardrailsService
    body = await request.json()
    text = body.get("text", "")
    source = body.get("source", "INPUT")

    svc = GuardrailsService()
    if source == "OUTPUT":
        result = svc.check_output(text)
    else:
        result = svc.check_input(text)

    pii = svc.detect_pii(text)
    return {**result, "pii_detection": pii, "source": source, "configured": svc.is_configured}


# ============================================================================
# CHAOS MODE (Error Handling & Resilience Demo)
# ============================================================================

_chaos_mode = False
_chaos_fail_rate = 0.3  # 30% failure rate when chaos mode active

@app.post("/api/dev/chaos")
async def toggle_chaos_mode(request: Request):
    """Toggle chaos mode for resilience testing"""
    global _chaos_mode
    body = await request.json()
    _chaos_mode = body.get("enabled", not _chaos_mode)
    return {"chaos_mode": _chaos_mode, "fail_rate": _chaos_fail_rate}

@app.get("/api/dev/chaos")
async def get_chaos_status():
    """Get current chaos mode status"""
    return {"chaos_mode": _chaos_mode, "fail_rate": _chaos_fail_rate}


# ============================================================================
# GRAPH ORCHESTRATOR ENDPOINT
# ============================================================================

@app.get("/api/agents/graph")
async def get_agent_graph():
    """Get the multi-agent orchestrator graph structure for visualization"""
    try:
        from agents.graph_orchestrator import get_graph_structure
        return get_graph_structure()
    except Exception as e:
        logger.warning(f"Failed to get graph structure: {e}")
        return {"available": False, "graph_builder_available": False, "nodes": [], "edges": [], "description": str(e)}


# ============================================================================
# AGENTCORE POLICY ENDPOINTS (Cedar)
# ============================================================================

@app.get("/api/agentcore/policy/list")
async def list_policies():
    """List all Cedar policies"""
    try:
        from services.agentcore_policy import get_policy_service
        svc = get_policy_service()
        return {"policies": svc.list_policies()}
    except Exception as e:
        logger.warning(f"Failed to list policies: {e}")
        return {"policies": [], "error": str(e)}


@app.post("/api/agentcore/policy/check")
async def check_policy(request: Request):
    """Evaluate an action against Cedar policies"""
    try:
        from services.agentcore_policy import get_policy_service
        body = await request.json()
        action = body.get("action", "")
        parameters = body.get("parameters", {})
        svc = get_policy_service()
        result = svc.evaluate(action, parameters)
        return result
    except Exception as e:
        logger.error(f"Policy check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AGENTCORE ENDPOINTS (Lab 4)
# ============================================================================

@app.get("/api/agentcore/memories")
async def agentcore_memories(user=Depends(get_current_user)):
    """Get stored memories for authenticated user (Lab 4b)"""
    if not user:
        return {"memories": [], "message": "Sign in to view memories"}
    try:
        from services.agentcore_memory import get_user_memories
        memories = get_user_memories(user["sub"])
        return {"memories": memories, "user": user["email"]}
    except Exception as e:
        logger.warning(f"Failed to fetch memories: {e}")
        return {"memories": [], "error": str(e)}


@app.get("/api/agentcore/gateway/tools")
async def agentcore_gateway_tools():
    """List tools registered in AgentCore Gateway MCP server (Lab 4c)"""
    try:
        from services.agentcore_gateway import list_gateway_tools
        tools = list_gateway_tools()
        return {"tools": tools, "gateway_url": settings.AGENTCORE_GATEWAY_URL or "not configured"}
    except Exception as e:
        logger.warning(f"Failed to list gateway tools: {e}")
        return {"tools": [], "error": str(e)}


@app.get("/api/agentcore/observability/status")
async def agentcore_observability_status():
    """Get OTEL/X-Ray observability status (Lab 4d)"""
    import os
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    service_name = os.environ.get("OTEL_SERVICE_NAME", "blaize-bazaar")
    return {
        "enabled": bool(endpoint),
        "service_name": service_name,
        "endpoint": endpoint or "not configured",
        "recent_traces": []  # Populated by trace collector in production
    }


@app.get("/api/agentcore/runtime/status")
async def agentcore_runtime_status():
    """Get AgentCore Runtime execution status (Lab 4e)"""
    runtime_endpoint = settings.AGENTCORE_RUNTIME_ENDPOINT
    if runtime_endpoint:
        # Check health of remote runtime
        try:
            import requests as req
            resp = await asyncio.to_thread(req.get, f"{runtime_endpoint}/health", timeout=3)
            return {
                "mode": "agentcore",
                "endpoint": runtime_endpoint,
                "healthy": resp.status_code == 200,
                "latency_ms": int(resp.elapsed.total_seconds() * 1000),
            }
        except Exception:
            return {
                "mode": "agentcore",
                "endpoint": runtime_endpoint,
                "healthy": False,
            }
    return {
        "mode": "local",
        "endpoint": f"http://localhost:{settings.PORT}",
        "healthy": True,
    }


# ============================================================================
# AGENTCORE GOING FURTHER ENDPOINTS
# ============================================================================

@app.get("/api/agentcore/memories/episodes")
async def get_episodic_memories(query: str, user=Depends(get_current_user)):
    """Search episodic memories for relevant past experiences"""
    if not user:
        return {"episodes": [], "message": "Sign in to search episodic memories"}
    try:
        from services.agentcore_memory import search_episodic_memories
        episodes = search_episodic_memories(user["sub"], query)
        return {"episodes": episodes, "query": query, "user": user["email"]}
    except Exception as e:
        logger.warning(f"Failed to search episodic memories: {e}")
        return {"episodes": [], "error": str(e)}


@app.post("/api/agentcore/policy/create")
async def create_nl_policy(request: Request):
    """Create a Cedar policy from natural language description"""
    try:
        from services.agentcore_policy import create_policy_from_natural_language
        body = await request.json()
        result = create_policy_from_natural_language(
            gateway_id=body.get("gateway_id", ""),
            policy_name=body.get("policy_name", ""),
            natural_language_rule=body.get("rule", ""),
        )
        return result
    except Exception as e:
        logger.error(f"NL policy creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agentcore/analytics")
async def analytics_query(request: Request):
    """Run a data analytics query using Code Interpreter agent"""
    try:
        from services.code_interpreter import create_analytics_agent
        body = await request.json()
        prompt = body.get("prompt", "")
        if not prompt:
            raise HTTPException(status_code=400, detail="prompt is required")
        agent = create_analytics_agent()
        if agent is None:
            return {
                "response": "Code Interpreter is not available. Ensure AGENTCORE_RUNTIME_ENDPOINT is configured and strands-agents-tools is installed.",
                "available": False,
            }
        result = str(agent(prompt))
        return {"response": result, "available": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MAIN ENTRYPOINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )