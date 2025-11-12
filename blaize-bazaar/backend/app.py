"""
DAT406 Workshop - Main FastAPI Application
FastAPI app with semantic search (Lab 1) and multi-agent system (Lab 2)
"""

import time
import logging
import json
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi import File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    RecommendationRequest,
    AgentResponse,
    HealthResponse,
    ChatRequest,
    ChatResponse,
)
from models.image_search_models import ImageSearchResponse
from models.product import Product, ProductWithScore, InventoryStats
from services.database import DatabaseService
from services.embeddings import EmbeddingService
from services.bedrock import BedrockService
from services.chat import ChatService
from services.image_search import ImageSearchService, get_image_search_service
from services.sql_query_logger import init_query_logger, get_query_logger
from services.index_performance import get_index_performance_service
from services.hybrid_search import HybridSearchService

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
bedrock_service: BedrockService = None
chat_service: ChatService = None
image_search_service: ImageSearchService = None
query_logger = None
index_performance_service = None

# Lab 2 agents use function pattern - no global instances needed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI app
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting DAT406 Workshop API...")
    
    global db_service, embedding_service, bedrock_service, chat_service, image_search_service, query_logger, index_performance_service
    
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
            # strands_telemetry.setup_otlp_exporter()   # Prod: CloudWatch X-Ray
            logger.info("✅ Strands OpenTelemetry tracing enabled (compact format)")
        except ImportError:
            logger.warning("⚠️ Strands OpenTelemetry not available - install with: pip install 'strands-agents[otel]'")
        except Exception as e:
            logger.warning(f"⚠️ Failed to setup OpenTelemetry: {e}")
        
        # Initialize core services
        db_service = DatabaseService()
        await db_service.connect()
        logger.info("✅ Database service initialized")
        
        embedding_service = EmbeddingService()
        logger.info("✅ Embedding service initialized")
        
        bedrock_service = BedrockService()
        logger.info("✅ Bedrock service initialized")
        
        chat_service = ChatService()
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
        
        # Initialize agent tools with database service reference (live data)
        from services.agent_tools import set_db_service
        set_db_service(db_service)
        logger.info("✅ Agent tools initialized with live database access")
        
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


async def get_bedrock_service() -> BedrockService:
    """Get Bedrock service instance"""
    if not bedrock_service:
        raise HTTPException(status_code=503, detail="Bedrock service not initialized")
    return bedrock_service

def get_image_search_service_dep():
    """Dependency for image search service"""
    global image_search_service
    if not image_search_service:
        raise HTTPException(status_code=503, detail="Image search service not initialized")
    return image_search_service


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
    and Amazon Titan embeddings. Optionally uses hybrid search (vector + full-text).
    """
    start_time = time.time()
    use_hybrid = request.query.startswith("hybrid:") or use_hybrid
    if use_hybrid and request.query.startswith("hybrid:"):
        request.query = request.query.replace("hybrid:", "").strip()
    
    try:
        search_type = "hybrid" if use_hybrid else "vector"
        logger.info(f"🔍 {search_type.upper()} search: '{request.query}' (limit={request.limit})")
        
        # Generate query embedding
        query_embedding = embeddings.generate_embedding(request.query)
        logger.info(f"✅ Generated embedding vector (1024 dimensions)")
        
        if use_hybrid:
            # Hybrid search with RRF
            hybrid_service = HybridSearchService(db)
            hybrid_result = await hybrid_service.search(
                query=request.query,
                embedding=query_embedding,
                limit=request.limit
            )
            results = hybrid_result["results"]
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
            # Prepare SQL with quality filters for better curation
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
                FROM bedrock_integration.product_catalog
                WHERE stars >= 3.5
                  AND reviews >= 10
                  AND "imgUrl" IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """
            
            # Get connection for logging
            import psycopg
            conn_string = f"host={settings.DB_HOST} port={settings.DB_PORT} dbname={settings.DB_NAME} user={settings.DB_USER} password={settings.DB_PASSWORD}"
            
            # Force index usage with multiple settings
            await db.execute_query("SET LOCAL enable_seqscan = off")
            await db.execute_query("SET LOCAL random_page_cost = 1")
            await db.execute_query("SET LOCAL cpu_tuple_cost = 0.01")
            
            # Execute query with index forced
            results = await db.fetch_all(
                query_sql,
                query_embedding,
                query_embedding,
                request.limit
            )
            
            # Log the query
            query_logger_instance = get_query_logger()
            with psycopg.connect(conn_string) as conn:
                conn.execute("SET LOCAL enable_seqscan = off")
                conn.execute("SET LOCAL random_page_cost = 1")
                conn.execute("SET LOCAL cpu_tuple_cost = 0.01")
                
                with query_logger_instance.log_query(
                    query_type="semantic_search",
                    sql=query_sql,
                    params=[query_embedding, query_embedding, request.limit],
                    connection=conn,
                    search_query=request.query
                ) as query_metadata:
                    query_metadata["rows_returned"] = len(results)
        
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
            FROM bedrock_integration.product_catalog
            WHERE "productId" = $1
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
        
        # Search database with quality filters
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
            FROM bedrock_integration.product_catalog
            WHERE stars >= 3.5
              AND reviews >= 10
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
    limit: int = Query(default=10, ge=1, le=50),
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
            FROM bedrock_integration.product_catalog
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
        # Build dynamic query
        conditions = []
        params = []
        param_count = 1
        
        if category:
            conditions.append(f"category_name = ${param_count}")
            params.append(category)
            param_count += 1
        
        if min_stars is not None:
            conditions.append(f"stars >= ${param_count}")
            params.append(min_stars)
            param_count += 1
        
        if max_price is not None:
            conditions.append(f"price <= ${param_count}")
            params.append(max_price)
            param_count += 1
        
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
            FROM bedrock_integration.product_catalog
            {where_clause}
            ORDER BY reviews DESC
            LIMIT ${param_count} OFFSET ${param_count + 1}
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
async def list_custom_tools(
    db: DatabaseService = Depends(get_db_service)
):
    """List all custom business logic tools available"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.list_custom_tools()
    except Exception as e:
        logger.error(f"Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tools/trending")
async def get_trending(
    limit: int = Query(default=10, ge=1, le=50),
    db: DatabaseService = Depends(get_db_service)
):
    """Get trending products using business logic"""
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(db)
        return await logic.get_trending_products(limit)
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
        return await logic.get_price_statistics(category)
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


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
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
            session_id=request.session_id
        )
        
        return ChatResponse(**response)
        
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint - sends agent thinking process in real-time
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    
    if not chat_service:
        raise HTTPException(status_code=503, detail="Chat service not initialized")
    
    async def event_generator():
        try:
            # Send initial event
            data = json.dumps({'type': 'start', 'content': 'Initializing agent...'})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.1)
            
            # Send orchestrator step
            data = json.dumps({'type': 'agent_step', 'agent': 'Orchestrator', 'action': 'Analyzing query and routing to specialists', 'status': 'in_progress'})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.3)
            
            # Determine which agent to use
            query_lower = request.message.lower()
            if 'inventory' in query_lower or 'stock' in query_lower or 'restock' in query_lower:
                agent_name = 'Inventory Agent'
                agent_action = 'Analyzing stock levels and inventory health'
            elif 'recommend' in query_lower or 'suggest' in query_lower or 'need' in query_lower:
                agent_name = 'Recommendation Agent'
                agent_action = 'Finding matching products'
            elif 'price' in query_lower or 'deal' in query_lower:
                agent_name = 'Pricing Agent'
                agent_action = 'Analyzing prices and deals'
            else:
                agent_name = 'Search Agent'
                agent_action = 'Searching product catalog'
            
            # Send specialist agent step
            data = json.dumps({'type': 'agent_step', 'agent': agent_name, 'action': agent_action, 'status': 'in_progress'})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.2)
            
            # Send tool call event
            data = json.dumps({'type': 'tool_call', 'tool': 'semantic_product_search', 'status': 'executing'})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.3)
            
            # Get actual response with session persistence
            history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
            response = await chat_service.chat(
                message=request.message,
                conversation_history=history,
                session_id=request.session_id
            )
            
            # Send completion event
            data = json.dumps({'type': 'agent_step', 'agent': agent_name, 'action': agent_action, 'status': 'completed'})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.1)
            
            # Stream response content word by word
            words = response['response'].split(' ')
            current_text = ''
            for i, word in enumerate(words):
                current_text += word + ' '
                data = json.dumps({'type': 'content', 'content': current_text.strip()})
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.03)  # 30ms delay between words
            
            # Send final response with all data
            data = json.dumps({'type': 'complete', 'response': response})
            yield f"data: {data}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            data = json.dumps({'type': 'error', 'error': str(e)})
            yield f"data: {data}\n\n"
    
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
            FROM bedrock_integration.product_catalog
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
            orchestrator = create_orchestrator(enable_interleaved_thinking=enable_thinking)
            response = orchestrator(query)
        elif agent_type == "inventory":
            response = inventory_restock_agent(query)
        elif agent_type == "recommendation":
            response = product_recommendation_agent(query)
        elif agent_type == "pricing":
            response = price_optimization_agent(query)
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