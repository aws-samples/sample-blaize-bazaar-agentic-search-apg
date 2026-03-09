"""
Embeddings service for DAT406 Workshop

Generates vector embeddings using Amazon Titan Text Embeddings v2 via Bedrock.
Provides async embedding generation for search queries and documents.
"""

import logging
import time
from functools import lru_cache
from typing import List, Tuple

import boto3
import json
from botocore.exceptions import ClientError

try:
    from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
    HAS_TENACITY = True
except ImportError:
    HAS_TENACITY = False

from config import settings

logger = logging.getLogger(__name__)


_EMBEDDING_CACHE: dict[str, List[float]] = {}
_EMBEDDING_CACHE_MAX = 200
_CACHE_HITS = 0
_CACHE_MISSES = 0
_TOTAL_EMBEDDING_COST = 0.0
_EMBEDDING_COST_PER_CALL = 0.00002  # ~$0.02 per 1K Titan v2 calls


def get_cache_stats() -> dict:
    """Return embedding cache statistics for the Context & Cost dashboard."""
    total = _CACHE_HITS + _CACHE_MISSES
    return {
        "cache_size": len(_EMBEDDING_CACHE),
        "cache_max": _EMBEDDING_CACHE_MAX,
        "hits": _CACHE_HITS,
        "misses": _CACHE_MISSES,
        "hit_rate": round(_CACHE_HITS / total, 4) if total > 0 else 0.0,
        "total_requests": total,
        "total_embedding_cost_usd": round(_TOTAL_EMBEDDING_COST, 6),
    }


class EmbeddingService:
    """
    Service for generating text embeddings using Amazon Titan v2.

    Titan Text Embeddings v2 generates 1024-dimensional vectors optimized
    for semantic search and retrieval tasks.
    """

    def __init__(self):
        """Initialize embeddings service with Bedrock client."""
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION
        )
        self.model_id = settings.BEDROCK_EMBEDDING_MODEL
        self.embedding_dimension = 1024

        # Retry event tracking for frontend indicators
        self._retry_callbacks = []
        logger.debug(f"Initialized embeddings service: {self.model_id}")

    def on_retry(self, callback):
        """Register a callback for retry events: callback(attempt, max_attempts)"""
        self._retry_callbacks.append(callback)

    def _notify_retry(self, attempt: int, max_attempts: int = 3):
        for cb in self._retry_callbacks:
            try:
                cb(attempt, max_attempts)
            except Exception:
                pass

    def _call_bedrock_embedding(self, request_body: dict) -> dict:
        """
        Call Bedrock embedding API with retry logic.

        Wire It Live: Participants add @tenacity.retry decorator here.
        Hint: @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=0.5, max=5))
        """
        # --- Wire It Live: Add retry decorator ---
        # If tenacity is available, we retry manually to emit events
        max_attempts = 3
        last_error = None
        for attempt in range(1, max_attempts + 1):
            try:
                response = self.bedrock_runtime.invoke_model(
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps(request_body)
                )
                return json.loads(response['body'].read())
            except ClientError as e:
                last_error = e
                error_code = e.response['Error']['Code']
                if error_code in ('ThrottlingException', 'ServiceUnavailableException', 'ModelTimeoutException'):
                    if attempt < max_attempts:
                        self._notify_retry(attempt, max_attempts)
                        wait_time = min(0.5 * (2 ** (attempt - 1)), 5)
                        logger.warning(f"Bedrock API retry {attempt}/{max_attempts}, waiting {wait_time}s: {error_code}")
                        time.sleep(wait_time)
                        continue
                raise
            except Exception as e:
                last_error = e
                if attempt < max_attempts:
                    self._notify_retry(attempt, max_attempts)
                    time.sleep(0.5 * attempt)
                    continue
                raise
        raise last_error  # type: ignore
        # --- End Wire It Live ---

    def generate_embedding(
        self,
        text: str,
        normalize: bool = True,
    ) -> List[float]:
        """
        Generate embedding vector for a single text string.
        
        Args:
            text: Input text to embed
            normalize: Whether to normalize the embedding vector
            
        Returns:
            List of floats representing the embedding vector (1024 dimensions)
            
        Raises:
            ValueError: If text is empty or invalid
            ClientError: If Bedrock API call fails
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        # Truncate if too long (Titan v2 has input limits)
        max_length = 8192  # characters
        text = text[:max_length].strip()

        global _CACHE_HITS, _CACHE_MISSES, _TOTAL_EMBEDDING_COST

        # Check cache first
        if text in _EMBEDDING_CACHE:
            _CACHE_HITS += 1
            logger.debug("Embedding cache hit")
            return _EMBEDDING_CACHE[text]

        _CACHE_MISSES += 1

        try:
            # Prepare request body for Titan
            request_body = {
                "inputText": text
            }

            # Call Bedrock API with retry logic
            response_body = self._call_bedrock_embedding(request_body)

            # Extract embedding vector (Titan format)
            embedding = response_body.get('embedding', [])

            if not embedding or len(embedding) != self.embedding_dimension:
                raise ValueError(
                    f"Invalid embedding dimension: expected {self.embedding_dimension}, "
                    f"got {len(embedding)}"
                )

            _TOTAL_EMBEDDING_COST += _EMBEDDING_COST_PER_CALL

            # Store in cache (evict oldest if full)
            if len(_EMBEDDING_CACHE) >= _EMBEDDING_CACHE_MAX:
                oldest_key = next(iter(_EMBEDDING_CACHE))
                del _EMBEDDING_CACHE[oldest_key]
            _EMBEDDING_CACHE[text] = embedding

            return embedding
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"Bedrock API error ({error_code}): {error_message}")
            raise
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def generate_embeddings_batch(
        self,
        texts: List[str],
        normalize: bool = True,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Note: Titan v2 doesn't support native batch processing, so this
        method calls the API sequentially. For enterprise deployments, consider
        implementing async batch processing with rate limiting.
        
        Args:
            texts: List of input texts
            normalize: Whether to normalize embedding vectors
            
        Returns:
            List of embedding vectors, one per input text
        """
        if not texts:
            return []
        
        embeddings = []
        errors = []
        
        for i, text in enumerate(texts):
            try:
                embedding = self.generate_embedding(text, normalize=normalize)
                embeddings.append(embedding)
            except Exception as e:
                logger.error(f"Error embedding text {i}: {e}")
                errors.append((i, str(e)))
                # Append zero vector as placeholder
                embeddings.append([0.0] * self.embedding_dimension)
        
        if errors:
            logger.warning(
                f"Failed to generate {len(errors)} embeddings out of {len(texts)}"
            )
        
        return embeddings
    
    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Convenience method that applies query-specific preprocessing.
        
        Args:
            query: Search query text
            
        Returns:
            Embedding vector for the query
        """
        # Clean and preprocess query
        query = query.strip()
        
        if not query:
            raise ValueError("Query cannot be empty")
        
        # Generate embedding
        return self.generate_embedding(query, normalize=True)
    
    def embed_document(self, document: str) -> List[float]:
        """
        Generate embedding for a document.
        
        Convenience method that applies document-specific preprocessing.
        
        Args:
            document: Document text to embed
            
        Returns:
            Embedding vector for the document
        """
        # Clean and preprocess document
        document = document.strip()
        
        if not document:
            raise ValueError("Document cannot be empty")
        
        # Generate embedding
        return self.generate_embedding(document, normalize=True)
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embedding vectors.
        
        Returns:
            int: Embedding dimension (1024 for Titan v2)
        """
        return self.embedding_dimension
    
    def get_model_id(self) -> str:
        """
        Get the Bedrock model ID being used.
        
        Returns:
            str: Model ID
        """
        return self.model_id
    
    def health_check(self) -> dict:
        """
        Check if embeddings service is healthy.
        
        Performs a test embedding generation to verify Bedrock connectivity.
        
        Returns:
            dict: Health check results
        """
        try:
            # Generate test embedding
            test_text = "test"
            embedding = self.generate_embedding(test_text)
            
            return {
                "status": "healthy",
                "model_id": self.model_id,
                "embedding_dimension": len(embedding),
                "region": settings.AWS_REGION
            }
            
        except Exception as e:
            logger.error(f"Embeddings health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "model_id": self.model_id
            }