"""
Hybrid Search Service - Vector + Full-Text Search
Combines pgvector semantic search with PostgreSQL full-text search
for optimal relevance and recall.
"""
import logging
from typing import List, Dict, Any, Optional
from services.database import DatabaseService

logger = logging.getLogger(__name__)

class HybridSearchService:
    """
    Hybrid search combining vector similarity and full-text search
    
    Strategies:
    - Vector search: Semantic similarity using pgvector
    - Full-text search: Keyword matching using PostgreSQL tsvector
    - RRF (Reciprocal Rank Fusion): Combines rankings from both methods
    """
    
    def __init__(self, db: DatabaseService):
        self.db = db
    
    async def search(
        self,
        query: str,
        embedding: List[float],
        limit: int = 10,
        vector_weight: float = 0.6,
        fulltext_weight: float = 0.4,
        ef_search: int = 40
    ) -> Dict[str, Any]:
        """
        Hybrid search with RRF ranking
        
        Args:
            query: Search query text
            embedding: Query embedding vector
            limit: Number of results
            vector_weight: Weight for vector search (0-1)
            fulltext_weight: Weight for full-text search (0-1)
            ef_search: HNSW ef_search parameter
        """
        # === WIRE IT LIVE (Lab 1) — RRF Weight Normalization ===
        # Try adjusting these weights to see how they affect search results!
        # Default: vector=0.6, fulltext=0.4 — try 0.8/0.2 for more semantic results
        total = vector_weight + fulltext_weight
        vector_weight /= total
        fulltext_weight /= total
        # === END WIRE IT LIVE ===
        
        # Run both searches in parallel
        vector_results = await self._vector_search(embedding, limit * 2, ef_search)
        logger.info(f"🔵 Vector search: {len(vector_results)} results")
        
        fulltext_results = await self._fulltext_search(query, limit * 2)
        logger.info(f"🟡 Full-text search: {len(fulltext_results)} results")
        
        # Apply RRF (Reciprocal Rank Fusion)
        fused_results = self._reciprocal_rank_fusion(
            vector_results,
            fulltext_results,
            vector_weight,
            fulltext_weight,
            limit
        )
        logger.info(f"🔀 Hybrid search returned {len(fused_results)} results with RRF scores")
        
        return {
            "results": fused_results,
            "total": len(fused_results),
            "method": "hybrid_rrf",
            "weights": {
                "vector": vector_weight,
                "fulltext": fulltext_weight
            }
        }
    
    async def _vector_search(
        self,
        embedding: List[float],
        limit: int,
        ef_search: int
    ) -> List[Dict[str, Any]]:
        """Vector similarity search using pgvector with quality filters"""
        async with self.db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SET LOCAL hnsw.ef_search = {ef_search}")
                await cur.execute("""
                    SELECT 
                        "productId" as product_id,
                        product_description,
                        "imgUrl" as img_url,
                        "productURL" as product_url,
                        category_name,
                        price,
                        reviews,
                        stars as rating,
                        "isBestSeller" as isbestseller,
                        "boughtInLastMonth" as boughtinlastmonth,
                        quantity,
                        1 - (embedding <=> %s::vector) as similarity
                    FROM bedrock_integration.product_catalog
                    WHERE stars >= 3.5
                      AND reviews >= 10
                      AND "imgUrl" IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """, (embedding, embedding, limit))
                results = await cur.fetchall()
                return [dict(r) for r in results]
    
    async def _fulltext_search(
        self,
        query: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Full-text search using PostgreSQL tsvector with quality filters"""
        search_query = """
            SELECT 
                "productId" as product_id,
                product_description,
                "imgUrl" as img_url,
                "productURL" as product_url,
                category_name,
                price,
                reviews,
                stars as rating,
                "isBestSeller" as isbestseller,
                "boughtInLastMonth" as boughtinlastmonth,
                quantity,
                ts_rank(
                    to_tsvector('english', product_description || ' ' || category_name),
                    plainto_tsquery('english', %s)
                ) as rank
            FROM bedrock_integration.product_catalog
            WHERE to_tsvector('english', product_description || ' ' || category_name) 
                  @@ plainto_tsquery('english', %s)
              AND stars >= 3.5
              AND reviews >= 10
              AND "imgUrl" IS NOT NULL
            ORDER BY rank DESC
            LIMIT %s
        """
        results = await self.db.fetch_all(search_query, query, query, limit)
        return [dict(r) for r in results]
    
    def _reciprocal_rank_fusion(
        self,
        vector_results: List[Dict[str, Any]],
        fulltext_results: List[Dict[str, Any]],
        vector_weight: float,
        fulltext_weight: float,
        limit: int,
        k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Reciprocal Rank Fusion (RRF) algorithm
        
        RRF Score = Σ(weight / (k + rank))
        where k=60 is a constant that reduces impact of high ranks
        """
        scores = {}

        # === WIRE IT LIVE (Lab 1) — RRF Scoring Formula ===
        # RRF Score = weight / (k + rank) — higher k smooths out rank differences
        # Try changing k from 60 to 10 to amplify top-ranked results
        # Score vector results
        for rank, result in enumerate(vector_results, 1):
            pid = result['product_id']
            score = vector_weight / (k + rank)
            scores[pid] = {
                'score': score,
                'data': result,
                'vector_rank': rank,
                'fulltext_rank': None
            }
        
        # Add fulltext results
        for rank, result in enumerate(fulltext_results, 1):
            pid = result['product_id']
            score = fulltext_weight / (k + rank)
            
            if pid in scores:
                scores[pid]['score'] += score
                scores[pid]['fulltext_rank'] = rank
            else:
                scores[pid] = {
                    'score': score,
                    'data': result,
                    'vector_rank': None,
                    'fulltext_rank': rank
                }
        
        # Sort by RRF score and format results
        sorted_items = sorted(scores.items(), key=lambda x: x[1]['score'], reverse=True)
        
        results = []
        for pid, item in sorted_items[:limit]:
            result = item['data'].copy()
            result['rrf_score'] = item['score']
            result['vector_rank'] = item['vector_rank']
            result['fulltext_rank'] = item['fulltext_rank']
            results.append(result)
        
        return results
