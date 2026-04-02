"""
Hybrid Search Service - Vector + Full-Text Search
Combines pgvector semantic search with PostgreSQL full-text search
for optimal relevance and recall.
"""
import asyncio
import hashlib
import json
import logging
import time
from typing import List, Dict, Any, Optional
from services.database import DatabaseService
from services.cache import get_cache

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
        limit: int = 5,
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
        # Check search cache (keyed on query + weights + limit)
        cache = get_cache()
        cache_key = f"{query}|{vector_weight:.2f}|{fulltext_weight:.2f}|{limit}"
        if cache:
            cached = cache.get("search", cache_key)
            if cached is not None:
                logger.info("⚡ Search cache hit")
                cached["cache_hit"] = True
                return cached

        # === WIRE IT LIVE (Lab 1) — RRF Weight Normalization ===
        # Try adjusting these weights to see how they affect search results!
        # Default: vector=0.6, fulltext=0.4 — try 0.8/0.2 for more semantic results
        total = vector_weight + fulltext_weight
        if total == 0:
            vector_weight, fulltext_weight = 0.5, 0.5
        else:
            vector_weight /= total
            fulltext_weight /= total
        # === END WIRE IT LIVE ===
        
        # Run both searches concurrently
        vector_results, fulltext_results = await asyncio.gather(
            self._vector_search(embedding, limit * 2, ef_search),
            self._fulltext_search(query, limit * 2),
        )
        logger.info(f"🔵 Vector search: {len(vector_results)} results")
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
        
        result = {
            "results": fused_results,
            "total": len(fused_results),
            "method": "hybrid_rrf",
            "weights": {
                "vector": vector_weight,
                "fulltext": fulltext_weight
            },
            "cache_hit": False,
        }

        # Store in cache (5 min TTL for search results)
        if cache:
            cache.set("search", cache_key, result, ttl=300)

        return result
    
    async def _vector_search(
        self,
        embedding: List[float],
        limit: int,
        ef_search: int,
        iterative_scan: bool = True
    ) -> List[Dict[str, Any]]:
        """
        TODO (Module 2): Implement vector similarity search using pgvector.

        This is the core of semantic search — it finds products whose meaning
        is similar to the query, even when exact keywords don't match.

        Steps:
            1. Get a connection from self.db.get_connection() (async context manager)
            2. Create a cursor (async context manager)
            3. Set the HNSW ef_search parameter: SET LOCAL hnsw.ef_search = {ef_search}
            4. Enable iterative scan (pgvector 0.8.0):
               SET LOCAL hnsw.iterative_scan = 'relaxed_order'
               This ensures filtered queries always return enough results by
               continuing to scan the HNSW index if initial results are filtered out.
            5. Execute a SELECT query that:
               - Selects: "productId" as product_id, product_description,
                 "imgUrl" as img_url, "productURL" as product_url,
                 category_name, price, reviews, stars as rating,
                 "isBestSeller" as isbestseller, "boughtInLastMonth" as boughtinlastmonth,
                 quantity, and similarity score
               - Computes similarity as: 1 - (embedding <=> %s::vector)
               - Filters: stars >= 3.5, reviews >= 10, "imgUrl" IS NOT NULL
               - Orders by: embedding <=> %s::vector (ascending = most similar first)
               - Limits to: %s results
               - Uses parameters: (embedding, embedding, limit)
            6. Fetch all results and return as list of dicts

        Hints:
            - The <=> operator computes cosine distance (lower = more similar)
            - Similarity = 1 - distance (higher = more similar)
            - Use %s::vector to cast the embedding parameter to a vector type
            - The embedding parameter appears twice: once for similarity score,
              once for ORDER BY
            - iterative_scan prevents "overfiltering" — without it, HNSW may
              return fewer results than requested when WHERE filters are strict

        Args:
            embedding: Query embedding vector (1024 floats from Cohere Embed v4)
            ef_search: HNSW search parameter (higher = better accuracy, slower)
            limit: Maximum number of results
            iterative_scan: Enable pgvector 0.8.0 iterative scanning (default: True)

        Returns:
            List of product dicts with similarity scores

        ⏩ SHORT ON TIME? Run:
           cp solutions/module2/services/hybrid_search.py blaize-bazaar/backend/services/hybrid_search.py
        """
        async with self.db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(f"SET LOCAL hnsw.ef_search = {int(ef_search)}")
                if iterative_scan:
                    await cur.execute("SET LOCAL hnsw.iterative_scan = 'relaxed_order'")
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
                    FROM blaize_bazaar.product_catalog
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
            FROM blaize_bazaar.product_catalog
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

    async def search_with_rerank(
        self,
        query: str,
        embedding: List[float],
        rerank_service,
        limit: int = 5,
        candidate_pool_size: int = 20,
        ef_search: int = 40,
    ) -> Dict[str, Any]:
        """
        Hybrid search with Cohere Rerank post-processing.

        Pipeline:
          1. Run keyword + vector search in parallel
          2. Merge unique candidates (dedup by product_id)
          3. Re-rank merged candidates using Cohere Rerank
          4. Return top results with relevance scores and timing metadata
        """
        # Step 1: Run both searches
        search_start = time.time()
        vector_results = await self._vector_search(embedding, candidate_pool_size, ef_search)
        fulltext_results = await self._fulltext_search(query, candidate_pool_size)
        search_time_ms = (time.time() - search_start) * 1000

        logger.info(f"🔵 Vector: {len(vector_results)} | 🟡 Keyword: {len(fulltext_results)}")

        # Step 2: Merge unique candidates
        seen_ids = set()
        merged_candidates = []

        for result in vector_results:
            pid = result["product_id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                result["source"] = "vector"
                merged_candidates.append(result)

        for result in fulltext_results:
            pid = result["product_id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                result["source"] = "fulltext"
            elif any(c["product_id"] == pid for c in merged_candidates):
                # Mark as appearing in both
                for c in merged_candidates:
                    if c["product_id"] == pid:
                        c["source"] = "both"
                        break
                continue
            merged_candidates.append(result)

        vector_count = len(vector_results)
        fulltext_count = len(fulltext_results)
        unique_count = len(merged_candidates)

        logger.info(f"🔀 Merged: {unique_count} unique candidates from {vector_count}+{fulltext_count}")

        # Step 3: Rerank using Cohere (run in thread to avoid blocking event loop)
        document_texts = [r["product_description"] for r in merged_candidates]

        rerank_result = await asyncio.to_thread(
            rerank_service.rerank,
            query=query,
            documents=document_texts,
            top_n=limit,
        )

        # Step 4: Map rerank results back to product data
        reranked_results = []
        for rank_item in rerank_result["results"]:
            idx = rank_item["index"]
            candidate = merged_candidates[idx].copy()
            candidate["relevance_score"] = rank_item["relevance_score"]
            candidate["rerank_position"] = len(reranked_results) + 1
            # Convert Decimal types to float for JSON serialization
            if hasattr(candidate.get("price"), '__float__'):
                candidate["price"] = float(candidate["price"])
            if hasattr(candidate.get("rating"), '__float__'):
                candidate["rating"] = float(candidate["rating"])
            reranked_results.append(candidate)

        logger.info(f"🏆 Reranked → top {len(reranked_results)} results")

        return {
            "results": reranked_results,
            "total": len(reranked_results),
            "method": "hybrid_rerank",
            "pipeline": {
                "vector_candidates": vector_count,
                "fulltext_candidates": fulltext_count,
                "unique_candidates": unique_count,
                "reranked_top_n": limit,
            },
            "timing": {
                "search_time_ms": round(search_time_ms, 2),
                "rerank_time_ms": rerank_result["rerank_time_ms"],
            },
        }
