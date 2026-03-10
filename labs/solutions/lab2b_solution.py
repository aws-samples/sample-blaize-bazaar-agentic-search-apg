#!/usr/bin/env python3
"""Lab 2b Solution: Nova Multimodal Embeddings for Image Search

Complete reference implementation for the Nova Multimodal bonus lab.
"""

import json
import io
import base64
import math
from typing import List

import boto3

NOVA_MODEL_ID = "amazon.nova-embed-image-v2:0"
EMBEDDING_DIM = 1024

bedrock = boto3.client("bedrock-runtime", region_name="us-west-2")


def nova_text_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    resp = bedrock.invoke_model(
        modelId=NOVA_MODEL_ID,
        body=json.dumps({
            "inputText": text,
            "embeddingConfig": {"outputEmbeddingLength": dim},
        }),
        contentType="application/json",
        accept="application/json",
    )
    return json.loads(resp["body"].read())["embedding"]


def nova_image_embedding(image_bytes: bytes, dim: int = EMBEDDING_DIM) -> List[float]:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    resp = bedrock.invoke_model(
        modelId=NOVA_MODEL_ID,
        body=json.dumps({
            "inputImage": b64,
            "embeddingConfig": {"outputEmbeddingLength": dim},
        }),
        contentType="application/json",
        accept="application/json",
    )
    return json.loads(resp["body"].read())["embedding"]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    return dot / (mag_a * mag_b) if mag_a and mag_b else 0.0


def create_test_image() -> bytes:
    """Create a minimal valid JPEG for testing."""
    try:
        from PIL import Image
        img = Image.new("RGB", (64, 64), color=(200, 50, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()
    except ImportError:
        # Minimal 1x1 red JPEG if Pillow not available
        return base64.b64decode(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////"
            "////////////////////////////////////////////////////////////"
            "2wBDAf//////////////////////////////////////////////////////"
            "////////////////////////////////////////////wAARCAABAAEDASIA"
            "AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAA"
            "AAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/a"
            "AAwDAQACEQMRAD8AKwA="
        )


# ===========================================================================
# Section 2 Solution: Nova Image Embedding
# ===========================================================================
def section2_image_embedding():
    print("\n" + "=" * 60)
    print("Section 2 Solution: Nova Image Embeddings")
    print("=" * 60)

    image_bytes = create_test_image()
    print(f"Test image size: {len(image_bytes)} bytes")

    # Generate at 1024 dimensions
    emb_1024 = nova_image_embedding(image_bytes, dim=1024)
    print(f"\nImage embedding (1024-dim):")
    print(f"  Dimensions: {len(emb_1024)}")
    print(f"  First 5 values: {[round(v, 4) for v in emb_1024[:5]]}")

    # Compare dimensions
    print("\nDimension comparison:")
    for dim in [256, 1024]:
        emb = nova_image_embedding(image_bytes, dim=dim)
        print(f"  dim={dim}: vector length = {len(emb)}")


# ===========================================================================
# Section 3 Solution: Cross-Modal Similarity
# ===========================================================================
def section3_cross_modal_similarity():
    print("\n" + "=" * 60)
    print("Section 3 Solution: Cross-Modal Similarity")
    print("=" * 60)

    # Text embeddings
    texts = [
        "red leather handbag with gold hardware",
        "blue canvas backpack for hiking",
        "wireless bluetooth headphones",
    ]
    text_embeddings = {}
    for t in texts:
        text_embeddings[t] = nova_text_embedding(t)
        print(f"Generated text embedding for: '{t}'")

    # Text-to-text similarity
    print("\nText-to-text similarity:")
    for i, t1 in enumerate(texts):
        for t2 in texts[i + 1:]:
            sim = cosine_similarity(text_embeddings[t1], text_embeddings[t2])
            print(f"  '{t1[:30]}...' vs '{t2[:30]}...': {sim:.4f}")

    # Cross-modal: image vs text
    image_bytes = create_test_image()
    img_emb = nova_image_embedding(image_bytes)
    print(f"\nCross-modal similarity (test image vs text):")
    for t in texts:
        sim = cosine_similarity(img_emb, text_embeddings[t])
        print(f"  Image vs '{t[:40]}...': {sim:.4f}")

    print("\nKey insight: Nova embeds text and images in the SAME vector space,")
    print("enabling direct cross-modal similarity search without an intermediary.")


if __name__ == "__main__":
    print("Lab 2b Solution: Nova Multimodal Embeddings")
    print("=" * 60)
    section2_image_embedding()
    section3_cross_modal_similarity()
    print("\nDone!")
