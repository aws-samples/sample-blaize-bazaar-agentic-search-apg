#!/usr/bin/env python3
"""Lab 2b: Nova Multimodal Embeddings for Image Search — Bonus Lab

Explore Amazon Nova Embeddings V2 for cross-modal search:
text-to-image, image-to-text, and image-to-image similarity.

Sections:
  1. Nova Text Embedding (pre-built demo)
  2. TODO: Nova Image Embedding
  3. TODO: Cross-Modal Similarity Comparison

Prerequisites:
  - Amazon Nova Embed Image V2 model access in Bedrock
  - pip install boto3

Run from repo root:
    python labs/lab2b_nova_image_search.py
"""

import json
import sys
import base64
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
NOVA_MODEL_ID = "amazon.nova-embed-image-v2:0"
EMBEDDING_DIM = 1024  # Must be one of: 256, 384, 1024, 3072

try:
    bedrock = boto3.client("bedrock-runtime", region_name="us-west-2")
except Exception as e:
    print(f"Failed to create Bedrock client: {e}")
    sys.exit(1)


def nova_text_embedding(text: str, dim: int = EMBEDDING_DIM):
    """Generate a text embedding using Nova Embeddings V2."""
    resp = bedrock.invoke_model(
        modelId=NOVA_MODEL_ID,
        body=json.dumps({
            "inputText": text,
            "embeddingConfig": {"outputEmbeddingLength": dim},
        }),
        contentType="application/json",
        accept="application/json",
    )
    body = json.loads(resp["body"].read())
    return body["embedding"]


def nova_image_embedding(image_bytes: bytes, dim: int = EMBEDDING_DIM):
    """Generate an image embedding using Nova Embeddings V2."""
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
    body = json.loads(resp["body"].read())
    return body["embedding"]


def cosine_similarity(a, b):
    """Compute cosine similarity between two vectors."""
    import math
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    return dot / (mag_a * mag_b) if mag_a and mag_b else 0.0


# ===========================================================================
# Section 1: Nova Text Embedding (pre-built demo)
# ===========================================================================
def section1_text_embedding():
    """Demonstrate Nova text embeddings with dimension control."""
    print("\n" + "=" * 60)
    print("Section 1: Nova Text Embeddings")
    print("=" * 60)

    queries = [
        "wireless bluetooth headphones for running",
        "red leather handbag with gold hardware",
    ]

    for q in queries:
        try:
            emb = nova_text_embedding(q)
            print(f"\nQuery: '{q}'")
            print(f"  Dimensions: {len(emb)}")
            print(f"  First 5 values: {[round(v, 4) for v in emb[:5]]}")
        except ClientError as e:
            print(f"  Error: {e}")
            return

    # Show Matryoshka dimension flexibility
    print("\nMatryoshka dimension comparison:")
    text = "premium noise-cancelling headphones"
    for dim in [256, 384, 1024]:
        try:
            emb = nova_text_embedding(text, dim=dim)
            print(f"  dim={dim}: vector length = {len(emb)}")
        except ClientError as e:
            print(f"  dim={dim}: Error - {e}")


# ===========================================================================
# Section 2: TODO — Nova Image Embedding
# ===========================================================================
def section2_image_embedding():
    """
    TODO: Generate an image embedding using Nova Embeddings V2.

    Instructions:
      1. Load a sample image (or use a generated placeholder)
      2. Call nova_image_embedding() to get the vector
      3. Print the embedding dimensions and first 5 values
      4. Compare embedding at different dimensions (256 vs 1024)

    Hint: Use the nova_image_embedding() function defined above.
    """
    print("\n" + "=" * 60)
    print("Section 2: Nova Image Embeddings")
    print("=" * 60)

    # TODO: Complete this section
    # Step 1: Create a small test image (1x1 white pixel JPEG)
    # You can use any JPEG image bytes here
    #
    # Step 2: Generate embedding at 1024 dimensions
    # emb = nova_image_embedding(image_bytes, dim=1024)
    #
    # Step 3: Print results
    # print(f"Image embedding dimensions: {len(emb)}")
    # print(f"First 5 values: {[round(v, 4) for v in emb[:5]]}")

    print("  [TODO] Complete this section to generate image embeddings")
    print("  Hint: Use nova_image_embedding(image_bytes, dim=1024)")


# ===========================================================================
# Section 3: TODO — Cross-Modal Similarity
# ===========================================================================
def section3_cross_modal_similarity():
    """
    TODO: Compare text and image embeddings in the same vector space.

    Instructions:
      1. Generate a text embedding for "red leather handbag"
      2. Generate an image embedding for a sample image
      3. Compute cosine similarity between the two
      4. Compare with text-to-text similarity as a baseline

    This demonstrates Nova's unique ability to embed text and images
    into the SAME vector space, enabling cross-modal search.

    Hint: Use cosine_similarity() to compare vectors.
    """
    print("\n" + "=" * 60)
    print("Section 3: Cross-Modal Similarity")
    print("=" * 60)

    # TODO: Complete this section
    # Step 1: Generate text embeddings for two related products
    # emb_text1 = nova_text_embedding("red leather handbag")
    # emb_text2 = nova_text_embedding("blue canvas backpack")
    #
    # Step 2: Compute text-to-text similarity (baseline)
    # sim_tt = cosine_similarity(emb_text1, emb_text2)
    # print(f"Text-to-text similarity: {sim_tt:.4f}")
    #
    # Step 3: If you have an image, compute cross-modal similarity
    # emb_img = nova_image_embedding(image_bytes)
    # sim_ti = cosine_similarity(emb_text1, emb_img)
    # print(f"Text-to-image similarity: {sim_ti:.4f}")

    print("  [TODO] Complete this section for cross-modal similarity")
    print("  Hint: Nova embeds text and images in the same vector space")


# ===========================================================================
# Main
# ===========================================================================
if __name__ == "__main__":
    print("Lab 2b: Nova Multimodal Embeddings for Image Search")
    print("=" * 60)

    try:
        section1_text_embedding()
    except ClientError as e:
        print(f"\nNova model not available: {e}")
        print("Ensure amazon.nova-embed-image-v2:0 is enabled in Bedrock.")
        sys.exit(1)

    section2_image_embedding()
    section3_cross_modal_similarity()

    print("\n" + "=" * 60)
    print("Lab 2b complete!")
    print("Check labs/solutions/lab2b_solution.py for reference answers.")
