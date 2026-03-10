"""
Search Quality Evaluation Service

Evaluates search quality using Precision@k and NDCG@k.
The golden dataset is built dynamically on first run using a high-quality
baseline vector search (ef_search=400) against the actual product catalog.
"""
import logging
import math
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Evaluation queries — diverse categories to test search quality
EVAL_QUERIES = [
    {"query": "wireless bluetooth headphones", "category": "Electronics"},
    {"query": "running shoes for men", "category": "Shoes"},
    {"query": "organic face moisturizer", "category": "Beauty"},
    {"query": "stainless steel water bottle", "category": "Kitchen"},
    {"query": "laptop backpack waterproof", "category": "Bags"},
    {"query": "protein powder chocolate", "category": "Health"},
    {"query": "mechanical keyboard gaming", "category": "Electronics"},
    {"query": "yoga mat thick non slip", "category": "Sports"},
    {"query": "cast iron skillet", "category": "Kitchen"},
    {"query": "noise cancelling earbuds", "category": "Electronics"},
    {"query": "mens casual dress shirt", "category": "Clothing"},
    {"query": "vitamins for energy", "category": "Health"},
    {"query": "smart watch fitness tracker", "category": "Electronics"},
    {"query": "kids educational toys", "category": "Toys"},
    {"query": "natural shampoo sulfate free", "category": "Beauty"},
    {"query": "portable phone charger", "category": "Electronics"},
    {"query": "winter jacket women waterproof", "category": "Clothing"},
    {"query": "coffee grinder burr", "category": "Kitchen"},
    {"query": "resistance bands exercise", "category": "Sports"},
    {"query": "desk lamp led adjustable", "category": "Home"},
    {"query": "sunscreen spf 50", "category": "Beauty"},
    {"query": "dog food grain free", "category": "Pet"},
    {"query": "air purifier bedroom", "category": "Home"},
    {"query": "camping tent 4 person", "category": "Sports"},
    {"query": "electric toothbrush sonic", "category": "Health"},
]


class SearchEvalService:
    """Evaluate search quality using Precision@k and NDCG@k."""

    def __init__(self, db_service=None, embedding_service=None):
        self.db_service = db_service
        self.embedding_service = embedding_service
        self._golden_cache: Optional[Dict[str, List[str]]] = None

    @staticmethod
    def precision_at_k(retrieved_ids: List[str], expected_ids: List[str], k: int = 5) -> float:
        """Calculate Precision@k: fraction of top-k results that are relevant."""
        retrieved_top_k = retrieved_ids[:k]
        if not retrieved_top_k:
            return 0.0
        relevant = sum(1 for rid in retrieved_top_k if rid in expected_ids)
        return relevant / len(retrieved_top_k)

    @staticmethod
    def ndcg_at_k(retrieved_ids: List[str], expected_ids: List[str], k: int = 5) -> float:
        """Calculate NDCG@k (Normalized Discounted Cumulative Gain)."""
        retrieved_top_k = retrieved_ids[:k]
        if not retrieved_top_k:
            return 0.0

        # DCG
        dcg = 0.0
        for i, rid in enumerate(retrieved_top_k):
            if rid in expected_ids:
                dcg += 1.0 / math.log2(i + 2)  # +2 because log2(1) = 0

        # Ideal DCG (best possible ranking)
        ideal_hits = min(len(expected_ids), k)
        idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_hits))

        return dcg / idcg if idcg > 0 else 0.0

    async def _build_golden_dataset(self, k: int = 5) -> Dict[str, List[str]]:
        """
        Build golden dataset by running high-quality baseline vector search
        (ef_search=400) for each query. The top-k results from this exhaustive
        search become the 'expected' results that other methods are compared against.
        """
        if self._golden_cache is not None:
            return self._golden_cache

        from services.hybrid_search import HybridSearchService
        hybrid_svc = HybridSearchService(self.db_service)

        golden: Dict[str, List[str]] = {}
        for item in EVAL_QUERIES:
            query = item["query"]
            try:
                embedding = self.embedding_service.generate_embedding(query)
                # High ef_search for exhaustive, high-quality baseline
                results = await hybrid_svc._vector_search(embedding, k, ef_search=400)
                ids = [r.get("product_id", r.get("productId", "")) for r in results]
                golden[query] = ids
            except Exception as e:
                logger.warning(f"Golden dataset build failed for '{query}': {e}")
                golden[query] = []

        self._golden_cache = golden
        logger.info(f"Built golden dataset: {len(golden)} queries, avg {sum(len(v) for v in golden.values()) / max(len(golden), 1):.1f} expected IDs each")
        return golden

    async def evaluate_search(self, method: str = "vector", k: int = 5) -> Dict[str, Any]:
        """
        Run evaluation across queries.

        The golden dataset is built from a high-quality baseline vector search
        (ef_search=400). Then the specified method (vector with default ef_search,
        or hybrid) is compared against that baseline.

        Args:
            method: "vector" or "hybrid"
            k: Number of results to evaluate
        """
        if not self.db_service or not self.embedding_service:
            return {"error": "Services not initialized", "results": []}

        # Build golden dataset on first call
        golden = await self._build_golden_dataset(k)

        from services.hybrid_search import HybridSearchService
        hybrid_svc = HybridSearchService(self.db_service)

        per_query_results = []
        total_precision = 0.0
        total_ndcg = 0.0
        evaluated = 0

        for item in EVAL_QUERIES:
            query = item["query"]
            expected_ids = golden.get(query, [])

            if not expected_ids:
                per_query_results.append({
                    "query": query,
                    "category": item["category"],
                    "precision_at_k": 0.0,
                    "ndcg_at_k": 0.0,
                    "error": "No golden data",
                })
                continue

            try:
                embedding = self.embedding_service.generate_embedding(query)

                if method == "hybrid":
                    response = await hybrid_svc.search(query, embedding, limit=k)
                    results = response.get("results", [])
                else:
                    # Default ef_search (40) — lower quality than golden baseline (400)
                    results = await hybrid_svc._vector_search(embedding, k, ef_search=40)
                retrieved_ids = [r.get("product_id", r.get("productId", "")) for r in results]

                p_at_k = self.precision_at_k(retrieved_ids, expected_ids, k)
                n_at_k = self.ndcg_at_k(retrieved_ids, expected_ids, k)

                total_precision += p_at_k
                total_ndcg += n_at_k
                evaluated += 1

                per_query_results.append({
                    "query": query,
                    "category": item["category"],
                    "precision_at_k": round(p_at_k, 4),
                    "ndcg_at_k": round(n_at_k, 4),
                    "retrieved_count": len(retrieved_ids),
                    "matches": sum(1 for r in retrieved_ids if r in expected_ids),
                })

            except Exception as e:
                logger.warning(f"Eval failed for '{query}': {e}")
                per_query_results.append({
                    "query": query,
                    "category": item["category"],
                    "precision_at_k": 0.0,
                    "ndcg_at_k": 0.0,
                    "error": str(e),
                })

        avg_precision = round(total_precision / evaluated, 4) if evaluated else 0.0
        avg_ndcg = round(total_ndcg / evaluated, 4) if evaluated else 0.0

        return {
            "method": method,
            "k": k,
            "total_queries": len(EVAL_QUERIES),
            "evaluated": evaluated,
            "avg_precision_at_k": avg_precision,
            "avg_ndcg_at_k": avg_ndcg,
            "results": per_query_results,
        }
