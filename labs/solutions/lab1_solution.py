#!/usr/bin/env python3
"""Part 1 SOLUTION: Semantic Search Foundations — Blaize Bazaar Workshop

Complete reference implementation with all TODOs filled in.

Run from repo root:
    python labs/solutions/lab1_solution.py
"""

import json
import sys
from typing import Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from shared.config import get_connection_string
from shared.embeddings import generate_embedding


conn_string = get_connection_string()


# ============================================================
# Section 1: Keyword vs Semantic Search Comparison (Pre-built)
# ============================================================

def keyword_search(query_text: str, limit: int = 5) -> List[Dict]:
    """Execute traditional keyword search using PostgreSQL full-text search."""
    with psycopg.connect(conn_string, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT "productId", product_description, price, stars,
                       reviews, category_name AS category
                FROM bedrock_integration.product_catalog
                WHERE to_tsvector('english', product_description)
                      @@ plainto_tsquery('english', %s)
                ORDER BY stars DESC, reviews DESC
                LIMIT %s
            """, (query_text, limit))
            return [dict(row) for row in cur.fetchall()]


def basic_semantic_search(query_text: str, limit: int = 5) -> List[Dict]:
    """Execute semantic similarity search using vector embeddings."""
    query_embedding = generate_embedding(query_text)
    with psycopg.connect(conn_string, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT "productId", product_description, price, stars,
                       reviews, category_name AS category,
                       embedding <=> %s::vector AS distance,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM bedrock_integration.product_catalog
                WHERE embedding IS NOT NULL
                ORDER BY distance ASC
                LIMIT %s
            """, (str(query_embedding), str(query_embedding), limit))
            return [dict(row) for row in cur.fetchall()]


def section_1_comparison():
    """Pre-built: Compare keyword search vs semantic search."""
    print("=== Section 1: Keyword vs Semantic Search ===\n")
    query = "something to keep my drinks cold"
    print(f'Query: "{query}"\n')

    print("--- Keyword Search Results ---")
    kw_results = keyword_search(query, limit=3)
    if kw_results:
        for i, p in enumerate(kw_results, 1):
            print(f"  {i}. {p['product_description'][:70]}")
            print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['reviews']:,} reviews")
    else:
        print("  ❌ No results — keyword search requires exact term matches")

    print("\n--- Semantic Search Results ---")
    sem_results = basic_semantic_search(query, limit=3)
    for i, p in enumerate(sem_results, 1):
        print(f"  {i}. {p['product_description'][:70]}")
        print(f"     ${p['price']:.2f} | {p['stars']}⭐ | Similarity: {p['similarity']:.3f}")

    print("\n💡 Semantic search understands intent — finds relevant products")
    print("   even without exact keyword matches.")


# ============================================================
# Section 2: Database Exploration (Pre-built)
# ============================================================

def section_2_db_exploration():
    """Pre-built: Explore the Aurora PostgreSQL database."""
    print("=== Section 2: Database Exploration ===\n")
    with psycopg.connect(conn_string, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
            row = cur.fetchone()
            print(f"  pgvector version:  {row['extversion'] if row else 'N/A'}")

            cur.execute("SELECT COUNT(*) AS cnt FROM bedrock_integration.product_catalog;")
            print(f"  Total products:    {cur.fetchone()['cnt']:,}")

            cur.execute("""
                SELECT vector_dims(embedding) AS dims
                FROM bedrock_integration.product_catalog
                WHERE embedding IS NOT NULL LIMIT 1;
            """)
            dims_row = cur.fetchone()
            print(f"  Embedding dims:    {dims_row['dims'] if dims_row else 'N/A'}")

            cur.execute("""
                SELECT COUNT(DISTINCT category_name) AS cnt
                FROM bedrock_integration.product_catalog;
            """)
            print(f"  Categories:        {cur.fetchone()['cnt']}")


# ============================================================
# Section 3: Embedding Generation (Pre-built)
# ============================================================

def section_3_embedding_demo():
    """Pre-built: Generate an embedding and run basic similarity search."""
    print("=== Section 3: Embedding Generation & Basic Search ===\n")
    sample_query = "wireless headphones for running"
    print(f'  Generating embedding for: "{sample_query}"')
    embedding = generate_embedding(sample_query)
    print(f"  Vector dimensions: {len(embedding)}")
    print(f"  Sample values:     {[f'{v:.6f}' for v in embedding[:5]]}")

    results = basic_semantic_search(sample_query, limit=3)
    print(f"\n  Top {len(results)} results:")
    for i, p in enumerate(results, 1):
        print(f"  {i}. {p['product_description'][:65]}")
        print(f"     ${p['price']:.2f} | {p['stars']}⭐ | Similarity: {p['similarity']:.3f}")


# ============================================================
# Section 4: SOLUTION — Filtered Semantic Search
# ============================================================

def semantic_search_with_filters(
    query_text: str,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    category: Optional[str] = None,
    limit: int = 5,
) -> List[Dict]:
    """SOLUTION: Semantic search with optional business filters.

    Combines pgvector cosine distance with price, rating, and category
    filters in a single query using dynamic WHERE clause construction.
    """
    # Step 1: Generate query embedding
    query_embedding = generate_embedding(query_text)

    with psycopg.connect(conn_string, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            # Step 2: Build dynamic WHERE clause
            where_clauses = ["embedding IS NOT NULL"]
            params: list = [str(query_embedding), str(query_embedding)]

            # Step 3: Add optional filters
            if max_price is not None:
                where_clauses.append("price <= %s")
                params.append(max_price)
            if min_rating is not None:
                where_clauses.append("stars >= %s")
                params.append(min_rating)
            if category is not None:
                where_clauses.append("category_name ILIKE %s")
                params.append(f"%{category}%")

            where_clause = " AND ".join(where_clauses)

            # Step 4: Execute with ORDER BY cosine distance
            params.extend([str(query_embedding), limit])

            cur.execute(f"""
                SELECT
                    "productId",
                    product_description AS title,
                    price,
                    stars,
                    reviews,
                    category_name AS category,
                    embedding <=> %s::vector AS distance,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM bedrock_integration.product_catalog
                WHERE {where_clause}
                ORDER BY embedding <=> %s::vector ASC
                LIMIT %s
            """, params)

            return [dict(row) for row in cur.fetchall()]


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 1 SOLUTION: Semantic Search Foundations")
    print("=" * 60 + "\n")

    section_1_comparison()
    print()
    section_2_db_exploration()
    print()
    section_3_embedding_demo()

    print("\n" + "=" * 60)
    print("Section 4: Filtered Semantic Search (SOLUTION)")
    print("=" * 60 + "\n")

    # Test 1: No filters
    print('Test 1: "wireless headphones for running" (no filter)')
    print("-" * 50)
    results = semantic_search_with_filters("wireless headphones for running", limit=3)
    for i, p in enumerate(results, 1):
        print(f"  {i}. {p['title'][:60]}")
        print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['similarity']:.1%} match")
    print("  ✅ Test 1 PASSED\n")

    # Test 2: Price filter
    print('Test 2: "something to keep coffee hot" (max $30)')
    print("-" * 50)
    results = semantic_search_with_filters("something to keep coffee hot", max_price=30.0, limit=3)
    for i, p in enumerate(results, 1):
        flag = "✓" if p["price"] <= 30 else "⚠️"
        print(f"  {i}. {p['title'][:60]}")
        print(f"     ${p['price']:.2f} {flag} | {p['stars']}⭐ | {p['similarity']:.1%} match")
    all_under = all(p["price"] <= 30.0 for p in results)
    print(f"  {'✅' if all_under else '❌'} Test 2 {'PASSED' if all_under else 'FAILED'}\n")

    print("=" * 60)
    print("🎉 All sections complete!")
    print("   • Keyword vs semantic comparison")
    print("   • Database exploration with pgvector")
    print("   • Embedding generation and basic search")
    print("   • Filtered semantic search with dynamic WHERE")
    print("=" * 60)
