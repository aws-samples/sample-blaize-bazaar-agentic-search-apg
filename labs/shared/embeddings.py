#!/usr/bin/env python3
"""
Embedding utilities for Blaize Bazaar Workshop Labs

Generates vector embeddings using Cohere Embed v4 via Amazon Bedrock.
Uses asymmetric input types (search_query vs search_document) for
improved retrieval quality.
"""

import json
from typing import List

import boto3

from shared.config import AWS_REGION, BEDROCK_EMBEDDING_MODEL

# Module-level Bedrock client (created once, reused)
_bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def generate_embedding(text: str, input_type: str = "search_query") -> List[float]:
    """Generate a 1024-dimensional embedding vector using Cohere Embed v4.

    Args:
        text: Input text to embed (max ~8192 characters)
        input_type: "search_query" for queries, "search_document" for indexing

    Returns:
        List of 1024 floats representing the semantic embedding

    Raises:
        ValueError: If text is empty
        botocore.exceptions.ClientError: If Bedrock API call fails
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    text = text[:8192].strip()

    response = _bedrock_client.invoke_model(
        modelId=BEDROCK_EMBEDDING_MODEL,
        contentType="application/json",
        accept="*/*",
        body=json.dumps({
            "texts": [text],
            "input_type": input_type,
            "embedding_types": ["float"],
            "output_dimension": 1024,
        }),
    )

    result = json.loads(response["body"].read())
    return result["embeddings"]["float"][0]
