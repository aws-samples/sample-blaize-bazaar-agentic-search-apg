"""
Search Quality Evaluation Service

Evaluates search quality using Precision@k and NDCG@k against a golden dataset
of expected results from the product catalog.
"""
import logging
import math
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Golden dataset — known-good query → expected product IDs pairs
# These are realistic category/keyword queries that should return specific products
GOLDEN_DATASET = [
    {"query": "wireless bluetooth headphones", "expected_ids": ["B09JFL3GJK", "B0B6B2Q2LK", "B09MV3J1CQ", "B0BT35LT1T", "B08HMWZBXC"], "category": "Electronics"},
    {"query": "running shoes for men", "expected_ids": ["B08GYKNCCP", "B0849QCJL5", "B087CJYS3Q", "B08G1D2H1C", "B0BQS14H6F"], "category": "Shoes"},
    {"query": "organic face moisturizer", "expected_ids": ["B07VQBFHK9", "B003YGXMCC", "B00YAF5UBG", "B07C4YRMGD", "B075FX3GRM"], "category": "Beauty"},
    {"query": "stainless steel water bottle", "expected_ids": ["B083GC3RRF", "B07W5JN1Y2", "B07PGHM9SK", "B08BFGGM8J", "B095RYVBVT"], "category": "Kitchen"},
    {"query": "laptop backpack waterproof", "expected_ids": ["B01KJMZCJ4", "B073JYC4XM", "B08LDC58XR", "B085ZFPVJN", "B0BSHF7WHK"], "category": "Bags"},
    {"query": "protein powder chocolate", "expected_ids": ["B000QSNYGI", "B07NQ1T4YD", "B00J074W94", "B01DPUNNWW", "B07QY8K5Z2"], "category": "Health"},
    {"query": "mechanical keyboard gaming", "expected_ids": ["B09GFYPC7Q", "B0B3Y55FYY", "B09HN4DQVG", "B07N2WMJ5H", "B08HR68MQZ"], "category": "Electronics"},
    {"query": "yoga mat thick non slip", "expected_ids": ["B07KXBY37P", "B01LP0V6FI", "B087J6BXGY", "B07BYBH1HY", "B08GC1PTVX"], "category": "Sports"},
    {"query": "cast iron skillet", "expected_ids": ["B00006JSUB", "B07PP9MJHM", "B09L5C3DR5", "B073Q86YQ3", "B07G29YX2R"], "category": "Kitchen"},
    {"query": "noise cancelling earbuds", "expected_ids": ["B09JFL3GJK", "B0BT35LT1T", "B0B6B2Q2LK", "B08HMWZBXC", "B09MV3J1CQ"], "category": "Electronics"},
    {"query": "mens casual dress shirt", "expected_ids": ["B078PGKL8S", "B01MFHJ4JK", "B08MV7SMKF", "B0B2L3T8HZ", "B09NRTM7XJ"], "category": "Clothing"},
    {"query": "vitamins for energy", "expected_ids": ["B07T81JF21", "B07NQBM4GK", "B01F1H2PJG", "B078HR5JJP", "B07DK561C2"], "category": "Health"},
    {"query": "smart watch fitness tracker", "expected_ids": ["B0BDFK1KMR", "B0B4N6H2RP", "B09HX9W1N5", "B09WMKY5SN", "B097C3TB1C"], "category": "Electronics"},
    {"query": "kids educational toys", "expected_ids": ["B07C56G8QR", "B083W4YK3D", "B07H4VG7J1", "B09BKV7LYR", "B08V596YH1"], "category": "Toys"},
    {"query": "natural shampoo sulfate free", "expected_ids": ["B01DUAXBW0", "B07GVW1FKZ", "B07KFCVB2L", "B0814LRSGF", "B07YFY33YS"], "category": "Beauty"},
    {"query": "portable phone charger", "expected_ids": ["B07S829LBX", "B0B9JXP3GP", "B08LH26PFT", "B0194WDVHI", "B08THCNNCS"], "category": "Electronics"},
    {"query": "winter jacket women waterproof", "expected_ids": ["B07JMXYRM7", "B09FQH66HL", "B07X26LTSG", "B08LP5RFHD", "B0BN8Y3KRB"], "category": "Clothing"},
    {"query": "coffee grinder burr", "expected_ids": ["B0B12DLB7P", "B07CSKGLMM", "B08LF39Q2G", "B07F1C79QL", "B09CPYQ8FF"], "category": "Kitchen"},
    {"query": "resistance bands exercise", "expected_ids": ["B07HQP96Y3", "B0798RK87Y", "B01AVDVHTI", "B07HCGDR5P", "B093GP7TTR"], "category": "Sports"},
    {"query": "desk lamp led adjustable", "expected_ids": ["B0849YWKDF", "B08DKQ3K3B", "B07JG69VW4", "B08535V37N", "B09T6Q9FPN"], "category": "Home"},
    {"query": "sunscreen spf 50", "expected_ids": ["B004CDJ71E", "B07HB3R47P", "B00AEN4QZ8", "B07GNVSCDB", "B08GBQT146"], "category": "Beauty"},
    {"query": "dog food grain free", "expected_ids": ["B01N1038JJ", "B07DK5GY88", "B07DK561C2", "B074DPSP6R", "B08C7YRWBY"], "category": "Pet"},
    {"query": "air purifier bedroom", "expected_ids": ["B07VVK39F7", "B0B8HKG2GK", "B07RLWZ5J5", "B085BCZL86", "B08R7QTBSJ"], "category": "Home"},
    {"query": "camping tent 4 person", "expected_ids": ["B08FXX2TN4", "B07CVMT6YK", "B078SK94FR", "B09T6W8VK5", "B087DFKMQK"], "category": "Sports"},
    {"query": "electric toothbrush sonic", "expected_ids": ["B09LV8SZLL", "B078GVDB4L", "B082TP6Z7K", "B08LDQYBJG", "B09BLFFSLZ"], "category": "Health"},
]


class SearchEvalService:
    """Evaluate search quality using Precision@k and NDCG@k."""

    def __init__(self, db_service=None, embedding_service=None):
        self.db_service = db_service
        self.embedding_service = embedding_service

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

    async def evaluate_search(self, method: str = "vector", k: int = 5) -> Dict[str, Any]:
        """
        Run evaluation across the golden dataset.

        Args:
            method: "vector" or "hybrid"
            k: Number of results to evaluate

        Returns:
            Aggregate metrics and per-query results.
        """
        if not self.db_service or not self.embedding_service:
            return {"error": "Services not initialized", "results": []}

        per_query_results = []
        total_precision = 0.0
        total_ndcg = 0.0
        evaluated = 0

        for item in GOLDEN_DATASET:
            query = item["query"]
            expected_ids = item["expected_ids"]

            try:
                # Generate embedding
                embedding = self.embedding_service.generate_embedding(query)

                # Run search
                if method == "hybrid":
                    from services.hybrid_search import HybridSearchService
                    hybrid_svc = HybridSearchService(self.db_service)
                    results = await hybrid_svc.hybrid_search(query, embedding, limit=k)
                    retrieved_ids = [r.get("product_id", r.get("productId", "")) for r in results]
                else:
                    results = await self.db_service.vector_search(embedding, limit=k)
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
            "total_queries": len(GOLDEN_DATASET),
            "evaluated": evaluated,
            "avg_precision_at_k": avg_precision,
            "avg_ndcg_at_k": avg_ndcg,
            "results": per_query_results,
        }
