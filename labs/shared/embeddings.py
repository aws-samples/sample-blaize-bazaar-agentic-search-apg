#!/usr/bin/env python3
"""
Embedding utilities for Blaize Bazaar Workshop Labs

Generates vector embeddings using Amazon Titan Text Embeddings V2
via Amazon Bedrock.
"""

import json
from typing import List

import boto3

from shared.config import AWS_REGION, BEDROCK_EMBEDDING_MODEL

# Module-level Bedrock client (created once, reused)
_bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def generate_embedding(text: str) -> List[float]:
    """Generate a 1024-dimensional embedding vector using Titan Text Embeddings V2.

    Args:
        text: Input text to embed (max ~8192 characters)

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
        accept="application/json",
        body=json.dumps({"inputText": text}),
    )

    result = json.loads(response["body"].read())
    return result["embedding"]
