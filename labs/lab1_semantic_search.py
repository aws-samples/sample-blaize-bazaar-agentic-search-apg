#!/usr/bin/env python3
"""Part 1: Semantic Search Foundations — Blaize Bazaar Workshop

Build semantic search with pgvector and Aurora PostgreSQL, enabling
natural language product discovery through vector embeddings.

Sections:
  1. Keyword vs Semantic Search Comparison (pre-built)
  2. Database Exploration (pre-built)
  3. Embedding Generation & Basic Similarity Search (pre-built)
  4. TODO: Filtered Semantic Search

Run from repo root:
    python labs/lab1_semantic_search.py
"""

import json
import sys
from typing import Dict, List, Optional

from shared.config import get_connection_string
from shared.db import fetch_all, fetch_one
from shared.embeddings import generate_embedding


# ============================================================
# Section 1: Keyword vs Semantic Search Comparison (Pre-built)
# ============================================================

def keyword_search(query_text: str, limit: int = 5) -> List[Dict]:
    """Execute traditional keyword search using PostgreSQL full-text search.

    Args:
        query_text: Search terms for keyword matching
        limit: Maximum results to return

    Returns:
        List of matching product dictionaries
    """
    return fetch_all("""
        SELECT
            "productId",
            product_description,
            price,
            stars,
            reviews,
            category_name AS category
        FROM bedrock_integration.product_catalog
        WHERE to_tsvector('english', product_description)
              @@ plainto_tsquery('english', %s)
        ORDER BY stars DESC, reviews DESC
        LIMIT %s
    """, (query_text, limit))


def basic_semantic_search(query_text: str, limit: int = 5) -> List[Dict]:
    """Execute semantic similarity search using vector embeddings.

    Pipeline:
        1. Generate embedding vector from natural language query
        2. Compute cosine distance against all product embeddings
        3. Return top-k products ranked by similarity

    Args:
        query_text: Natural language search query
        limit: Maximum results to return

    Returns:
        List of product dictionaries with similarity scores
    """
    query_embedding = generate_embedding(query_text)

    return fetch_all("""
        SELECT
            "productId",
            product_description,
            price,
            stars,
            reviews,
            category_name AS category,
            embedding <=> %s::vector AS distance,
            1 - (embedding <=> %s::vector) AS similarity
        FROM bedrock_integration.product_catalog
        WHERE embedding IS NOT NULL
        ORDER BY distance ASC
        LIMIT %s
    """, (str(query_embedding), str(query_embedding), limit))


def section_1_comparison():
    """Pre-built: Compare keyword search vs semantic search side-by-side."""
    print("=== Section 1: Keyword vs Semantic Search ===\n")

    query = "something to keep my drinks cold"
    print(f'Query: "{query}"\n')

    # Keyword search
    print("--- Keyword Search Results ---")
    kw_results = keyword_search(query, limit=3)
    if kw_results:
        for i, p in enumerate(kw_results, 1):
            print(f"  {i}. {p['product_description'][:70]}")
            print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['reviews']:,} reviews")
    else:
        print("  ❌ No results — keyword search requires exact term matches")

    # Semantic search
    print("\n--- Semantic Search Results ---")
    sem_results = basic_semantic_search(query, limit=3)
    for i, p in enumerate(sem_results, 1):
        print(f"  {i}. {p['product_description'][:70]}")
        print(f"     ${p['price']:.2f} | {p['stars']}⭐ | Similarity: {p['similarity']:.3f}")

    print("\n💡 Semantic search understands intent — it finds coolers and insulated")
    print("   bottles even though the query never mentions those words.")


# ============================================================
# Section 2: Database Exploration (Pre-built)
# ============================================================

def section_2_db_exploration():
    """Pre-built: Explore the Aurora PostgreSQL database and pgvector setup."""
    print("=== Section 2: Database Exploration ===\n")

    row = fetch_one("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
    pgvector_version = row["extversion"] if row else "NOT INSTALLED"
    print(f"  pgvector version:  {pgvector_version}")

    count_row = fetch_one("SELECT COUNT(*) AS cnt FROM bedrock_integration.product_catalog;")
    print(f"  Total products:    {count_row['cnt']:,}")

    dims_row = fetch_one("""
        SELECT vector_dims(embedding) AS dims
        FROM bedrock_integration.product_catalog
        WHERE embedding IS NOT NULL
        LIMIT 1;
    """)
    dims = dims_row["dims"] if dims_row else "N/A"
    print(f"  Embedding dims:    {dims}")

    cat_row = fetch_one("""
        SELECT COUNT(DISTINCT category_name) AS cnt
        FROM bedrock_integration.product_catalog;
    """)
    print(f"  Categories:        {cat_row['cnt']}")

    idx_rows = fetch_all("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'bedrock_integration'
          AND indexdef ILIKE '%%hnsw%%'
        LIMIT 1;
    """)
    if idx_rows:
        print(f"  HNSW index:        {idx_rows[0]['indexname']}")
    else:
        print("  HNSW index:        (none found)")

    print("\n💡 Vectors stored alongside business data — one database, one query,")
    print("   combining semantic search with price/rating/inventory filters.")


# ============================================================
# Section 3: Embedding Generation & Basic Search (Pre-built)
# ============================================================

def section_3_embedding_demo():
    """Pre-built: Generate an embedding and run a basic similarity search."""
    print("=== Section 3: Embedding Generation & Basic Search ===\n")

    sample_query = "wireless headphones for running"
    print(f'  Generating embedding for: "{sample_query}"')

    embedding = generate_embedding(sample_query)
    print(f"  Vector dimensions: {len(embedding)}")
    print(f"  Sample values:     {[f'{v:.6f}' for v in embedding[:5]]}")
    print(f"  Value range:       [{min(embedding):.6f}, {max(embedding):.6f}]")

    print(f"\n  Running semantic search...")
    results = basic_semantic_search(sample_query, limit=3)
    print(f"  Found {len(results)} results:\n")
    for i, p in enumerate(results, 1):
        print(f"  {i}. {p['product_description'][:65]}")
        print(f"     ${p['price']:.2f} | {p['stars']}⭐ | Similarity: {p['similarity']:.3f}")


# ============================================================
# Section 4: TODO — Filtered Semantic Search
# ============================================================

def semantic_search_with_filters(
    query_text: str,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    category: Optional[str] = None,
    limit: int = 5,
) -> Optional[List[Dict]]:
    """
    TODO: Combine vector similarity search with business filters.

    Build a semantic search function that supports optional filtering
    by price, rating, and category — all in a single SQL query.

    Steps:
        1. Generate the query embedding using generate_embedding()
        2. Open a database connection with psycopg.connect()
        3. Build a WHERE clause that always includes "embedding IS NOT NULL"
        4. Conditionally add filters for max_price, min_rating, and category
        5. ORDER BY cosine distance ascending (most similar first)
        6. Return results as a list of dicts with similarity scores

    Hints:
        - Cosine distance operator: embedding <=> %s::vector
        - Similarity = 1 - distance
        - Use parameterized queries: params list + %s placeholders
        - Category filter: category_name ILIKE %s with f"%{category}%"
        - pgvector 0.8.0 supports iterative scanning with WHERE filters

    Expected output format per row:
        {
            "productId": "...",
            "title": "...",
            "price": 29.99,
            "stars": 4.5,
            "reviews": 120,
            "category": "Electronics",
            "similarity": 0.823
        }

    Args:
        query_text: Natural language search query
        max_price: Optional maximum price filter
        min_rating: Optional minimum star rating filter
        category: Optional category name filter (partial match)
        limit: Number of results to return

    Returns:
        List of product dictionaries, or None if not implemented
    """
    # TODO: Your implementation here (~10 lines)
    return None


# ============================================================
# Main — runs all sections sequentially
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 1: Semantic Search Foundations")
    print("=" * 60 + "\n")

    section_1_comparison()
    print()
    section_2_db_exploration()
    print()
    section_3_embedding_demo()

    print("\n" + "=" * 60)
    print("--- YOUR TURN ---")
    print("=" * 60 + "\n")

    print("Testing semantic_search_with_filters()...\n")

    # Test 1: Basic semantic search (no filters)
    print('Test 1: "wireless headphones for running" (no filter)')
    print("-" * 50)
    results = semantic_search_with_filters("wireless headphones for running", limit=3)
    if results:
        for i, p in enumerate(results, 1):
            print(f"  {i}. {p['title'][:60]}")
            print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['similarity']:.1%} match")
        print("  ✅ Test 1 PASSED\n")
    else:
        print("  ⏳ TODO: Implement semantic_search_with_filters() and re-run\n")

    # Test 2: With price filter
    print('Test 2: "something to keep coffee hot" (max $30)')
    print("-" * 50)
    results = semantic_search_with_filters(
        "something to keep coffee hot", max_price=30.0, limit=3
    )
    if results:
        all_under = all(p["price"] <= 30.0 for p in results)
        for i, p in enumerate(results, 1):
            flag = "✓" if p["price"] <= 30 else "⚠️"
            print(f"  {i}. {p['title'][:60]}")
            print(f"     ${p['price']:.2f} {flag} | {p['stars']}⭐ | {p['similarity']:.1%} match")
        if all_under:
            print("  ✅ Test 2 PASSED — price filter working\n")
        else:
            print("  ❌ Test 2 FAILED — some results exceed price limit\n")
    else:
        print("  ⏳ TODO: Implement semantic_search_with_filters() and re-run\n")

    print("=" * 60)
    if results:
        print("🎉 You've built semantic search with business filters!")
        print("   • pgvector <=> cosine distance operator")
        print("   • Dynamic SQL with parameterized filters")
        print("   • pgvector 0.8.0 iterative scanning")
    else:
        print("📝 Complete the TODO in semantic_search_with_filters()")
        print("   then re-run: python labs/part1_semantic_search.py")
    print("=" * 60)
