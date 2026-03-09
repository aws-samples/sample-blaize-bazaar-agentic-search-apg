"""
RAG (Retrieval-Augmented Generation) Demo Service

Demonstrates the RAG pattern by comparing LLM responses with and without
retrieved product context from the vector store.
"""
import json
import logging
from typing import Dict, Any, List, Optional

import boto3
from config import settings

logger = logging.getLogger(__name__)


class RAGDemoService:
    """Compare LLM responses: naive (no context) vs RAG (with retrieved products)."""

    def __init__(self, db_service=None, embedding_service=None):
        self.db_service = db_service
        self.embedding_service = embedding_service
        self.bedrock = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)
        self.model_id = settings.BEDROCK_CHAT_MODEL

    def _chat_completion(self, system: str, user: str) -> str:
        """Simple Bedrock chat completion."""
        try:
            response = self.bedrock.converse(
                modelId=self.model_id,
                messages=[{"role": "user", "content": [{"text": user}]}],
                system=[{"text": system}],
                inferenceConfig={"maxTokens": 512, "temperature": 0.3},
            )
            return response["output"]["message"]["content"][0]["text"]
        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            return f"Error: {e}"

    async def rag_query(self, query: str, with_context: bool = True) -> Dict[str, Any]:
        """
        Run a query with or without RAG context.

        Args:
            query: User's product question
            with_context: If True, retrieve products and inject into prompt

        Returns:
            Response text, retrieved products (if any), token estimate
        """
        retrieved_products: List[Dict] = []
        context_text = ""

        if with_context and self.db_service and self.embedding_service:
            # Step 1: Generate embedding
            embedding = self.embedding_service.generate_embedding(query)

            # Step 2: Retrieve top-5 via pgvector
            results = await self.db_service.vector_search(embedding, limit=5)
            retrieved_products = [
                {
                    "name": r.get("product_description", ""),
                    "price": r.get("price", 0),
                    "rating": r.get("stars", 0),
                    "category": r.get("category_name", ""),
                    "reviews": r.get("reviews", 0),
                }
                for r in results
            ]

            # Step 3: Stuff into prompt
            context_text = "PRODUCT CATALOG CONTEXT (from vector search):\n"
            for i, p in enumerate(retrieved_products, 1):
                context_text += (
                    f"{i}. {p['name']} — ${p['price']}, "
                    f"{p['rating']}★, {p['reviews']} reviews, {p['category']}\n"
                )

        # Build system prompt
        if with_context:
            system = (
                "You are a shopping assistant. Answer the user's question using ONLY "
                "the product catalog context provided below. Be specific about products, "
                "prices, and ratings. If a product isn't in the context, say so.\n\n"
                f"{context_text}"
            )
        else:
            system = (
                "You are a shopping assistant. Answer the user's question about products. "
                "You do NOT have access to any product catalog. Provide general advice based "
                "on your training knowledge."
            )

        response = self._chat_completion(system, query)
        context_tokens = len(context_text.split()) if context_text else 0

        return {
            "query": query,
            "response": response,
            "retrieved_products": retrieved_products,
            "with_context": with_context,
            "context_tokens": context_tokens,
        }

    async def rag_compare(self, query: str) -> Dict[str, Any]:
        """Run both with and without context, returning side-by-side results."""
        without = await self.rag_query(query, with_context=False)
        with_rag = await self.rag_query(query, with_context=True)

        return {
            "query": query,
            "without_context": without,
            "with_context": with_rag,
        }
