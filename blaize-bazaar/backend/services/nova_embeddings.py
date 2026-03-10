"""
Nova Multimodal Embedding Service
Uses Amazon Nova Embeddings V2 for text and image embeddings at configurable dimensions.
"""
import logging
import json
import base64
from typing import Optional, List

import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)

NOVA_MODEL_ID = "amazon.nova-embed-image-v2:0"
EMBEDDING_DIM = 1024  # Match existing Cohere index dimension


class NovaEmbeddingService:
    """Generate text and image embeddings using Amazon Nova Embeddings V2."""

    def __init__(self):
        self.client = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.AWS_REGION,
        )
        self._available: Optional[bool] = None

    @property
    def is_available(self) -> bool:
        """Lazy check — calls the model once to verify access."""
        if self._available is None:
            try:
                self.client.invoke_model(
                    modelId=NOVA_MODEL_ID,
                    body=json.dumps({
                        "inputText": "test",
                        "embeddingConfig": {"outputEmbeddingLength": 256},
                    }),
                    contentType="application/json",
                    accept="application/json",
                )
                self._available = True
                logger.info("Nova Embeddings V2 is available")
            except Exception as e:
                self._available = False
                logger.warning(f"Nova Embeddings V2 not available: {e}")
        return self._available

    def generate_text_embedding(self, text: str, dim: int = EMBEDDING_DIM) -> Optional[List[float]]:
        """Generate a text embedding vector."""
        try:
            resp = self.client.invoke_model(
                modelId=NOVA_MODEL_ID,
                body=json.dumps({
                    "inputText": text,
                    "embeddingConfig": {"outputEmbeddingLength": dim},
                }),
                contentType="application/json",
                accept="application/json",
            )
            body = json.loads(resp["body"].read())
            return body.get("embedding")
        except ClientError as e:
            logger.error(f"Nova text embedding error: {e}")
            return None

    def generate_image_embedding(self, image_bytes: bytes, dim: int = EMBEDDING_DIM) -> Optional[List[float]]:
        """Generate an image embedding vector."""
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            resp = self.client.invoke_model(
                modelId=NOVA_MODEL_ID,
                body=json.dumps({
                    "inputImage": b64,
                    "embeddingConfig": {"outputEmbeddingLength": dim},
                }),
                contentType="application/json",
                accept="application/json",
            )
            body = json.loads(resp["body"].read())
            return body.get("embedding")
        except ClientError as e:
            logger.error(f"Nova image embedding error: {e}")
            return None

    def analyze_image_for_search(self, image_bytes: bytes) -> Optional[str]:
        """
        Use Nova to generate a rich text description from an image,
        which can then be embedded with Cohere for catalog search.

        This bridges the embedding-space gap: Nova understands the image,
        Cohere embeds the description into the catalog's vector space.
        """
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")

            # Use Claude for the actual vision analysis but with
            # Nova-style richer prompting for product search
            vision_client = boto3.client(
                service_name="bedrock-runtime",
                region_name=settings.AWS_REGION,
            )
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 512,
                "temperature": 0.2,
                "system": (
                    "You are an expert product analyst. Generate a detailed, "
                    "search-optimized description from product images. Include: "
                    "product type, materials, colors, style, brand indicators, "
                    "target audience, and use cases. Be specific and concise."
                ),
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
                            },
                            {
                                "type": "text",
                                "text": (
                                    "Describe this product in detail for semantic search. "
                                    "Include specific attributes: type, color, material, style, "
                                    "features, and likely search terms. Return plain text only, "
                                    "no JSON or markdown."
                                ),
                            },
                        ],
                    }
                ],
            }
            resp = vision_client.invoke_model(
                modelId="global.anthropic.claude-sonnet-4-6",
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            result = json.loads(resp["body"].read())
            for block in result.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            return None
        except Exception as e:
            logger.error(f"Nova image analysis error: {e}")
            return None


# Singleton
_nova_service: Optional[NovaEmbeddingService] = None


def get_nova_embedding_service() -> NovaEmbeddingService:
    global _nova_service
    if _nova_service is None:
        _nova_service = NovaEmbeddingService()
    return _nova_service
