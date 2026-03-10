"""
Cohere Rerank Service - Relevance Re-ranking via Amazon Bedrock

Re-ranks candidate documents using Cohere Rerank v3.5 for improved
search quality in hybrid search pipelines.
"""
import logging
import json
import time
from typing import List, Dict, Any

import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)


class RerankService:
    """
    Service for re-ranking search results using Cohere Rerank v3.5 via Bedrock.

    Takes a query and a list of candidate documents, returns them re-ordered
    by relevance with confidence scores.
    """

    def __init__(self):
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION
        )
        self.model_id = settings.BEDROCK_RERANK_MODEL
        logger.info(f"Initialized rerank service: {self.model_id}")

    def rerank(
        self,
        query: str,
        documents: List[str],
        top_n: int = 5,
    ) -> Dict[str, Any]:
        """
        Re-rank documents by relevance to query.

        Args:
            query: Search query text
            documents: List of document texts to re-rank
            top_n: Number of top results to return

        Returns:
            Dict with results list and rerank_time_ms
        """
        if not query or not documents:
            return {"results": [], "rerank_time_ms": 0}

        start_time = time.time()

        request_body = {
            "query": query,
            "documents": documents,
            "top_n": min(top_n, len(documents)),
            "api_version": 2,
        }

        try:
            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="*/*",
                body=json.dumps(request_body)
            )
            response_body = json.loads(response["body"].read())

            rerank_time_ms = (time.time() - start_time) * 1000

            results = response_body.get("results", [])

            logger.info(f"Reranked {len(documents)} docs → top {len(results)} in {rerank_time_ms:.0f}ms")

            return {
                "results": results,
                "rerank_time_ms": round(rerank_time_ms, 2),
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Rerank API error ({error_code}): {e}")
            raise
        except Exception as e:
            logger.error(f"Rerank failed: {e}")
            raise

    def health_check(self) -> dict:
        """Check if rerank service is accessible."""
        try:
            result = self.rerank(
                query="test",
                documents=["test document"],
                top_n=1,
            )
            return {
                "status": "healthy",
                "model_id": self.model_id,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "model_id": self.model_id,
            }
