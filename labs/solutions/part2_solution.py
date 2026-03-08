#!/usr/bin/env python3
"""Part 2 SOLUTION: Context Management & Custom Agent Tools — Blaize Bazaar Workshop

Complete reference implementation with all TODOs filled in.

Run from repo root:
    python labs/solutions/part2_solution.py
"""

import json
import sys
from typing import Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from shared.config import get_connection_string, BEDROCK_CHAT_MODEL
from shared.embeddings import generate_embedding

try:
    from strands import Agent, tool
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    print("⚠️  Strands SDK not installed. Agent features disabled.")
    def tool(fn):
        return fn

conn_string = get_connection_string()


# ============================================================
# Section 1: Token Efficiency Demo (Pre-built)
# ============================================================

def section_1_token_efficiency():
    """Pre-built: Demonstrate why structured tool responses save tokens."""
    print("=== Section 1: Token Efficiency Demo ===\n")

    raw_dump = {
        "rows": [{
            "productId": "B07XYZ123",
            "product_description": "Premium Wireless Noise-Cancelling Headphones",
            "category_name": "Electronics", "price": 249.99, "stars": 4.7,
            "reviews": 3421, "quantity": 156,
            "imgUrl": "https://example.com/img.jpg",
            "embedding": "[0.0234, -0.0891, ...] (1024 floats)",
            "created_at": "2024-01-15T10:30:00Z",
            "seller_id": "SELLER_A1B2C3",
        }],
        "query_metadata": {"execution_time_ms": 45, "rows_scanned": 21704},
    }
    structured = {
        "trending_products": [{
            "id": "B07XYZ123", "title": "Premium Wireless Headphones",
            "price": 249.99, "stars": 4.7, "reviews": 3421,
        }],
        "count": 1, "criteria": "stars >= 4.5, reviews > 50, in stock",
    }

    raw_size = len(json.dumps(raw_dump))
    struct_size = len(json.dumps(structured))
    print(f"  Raw dump:    {raw_size:,} chars")
    print(f"  Structured:  {struct_size:,} chars")
    print(f"  Savings:     ~{(1 - struct_size / raw_size) * 100:.0f}%")


# ============================================================
# Section 2: Complete Tool Example (Pre-built)
# ============================================================

@tool
def get_category_price_analysis(category: str) -> str:
    """Analyze pricing statistics for a product category."""
    try:
        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT category_name, COUNT(*) AS total_products,
                           MIN(price) AS min_price, MAX(price) AS max_price,
                           AVG(price) AS avg_price, AVG(stars) AS avg_rating
                    FROM bedrock_integration.product_catalog
                    WHERE category_name ILIKE %s AND quantity > 0
                    GROUP BY category_name
                """, (f"%{category}%",))
                row = cur.fetchone()
                if not row:
                    return json.dumps({"error": f"No products in: {category}"})

                cur.execute("""
                    SELECT "productId", product_description, price, stars, reviews,
                           (price / NULLIF(stars, 0)) AS value_score
                    FROM bedrock_integration.product_catalog
                    WHERE category_name ILIKE %s AND quantity > 0 AND stars > 0 AND price > 0
                    ORDER BY value_score ASC LIMIT 5
                """, (f"%{category}%",))
                best_value = cur.fetchall()

                return json.dumps({
                    "category": row["category_name"],
                    "analysis": {
                        "total_products": row["total_products"],
                        "price_range": {
                            "min": float(row["min_price"]),
                            "max": float(row["max_price"]),
                            "average": round(float(row["avg_price"]), 2),
                        },
                        "average_rating": round(float(row["avg_rating"]), 2),
                    },
                    "best_value_products": [{
                        "id": p["productId"],
                        "name": p["product_description"],
                        "price": float(p["price"]),
                        "rating": float(p["stars"]),
                        "reviews": p["reviews"],
                        "value_score": round(float(p["value_score"]), 2),
                    } for p in best_value],
                }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


def section_2_tool_example():
    """Pre-built: Demonstrate get_category_price_analysis."""
    print("=== Section 2: Complete Tool — get_category_price_analysis ===\n")
    result_json = get_category_price_analysis(category="Electronics")
    data = json.loads(result_json)
    if "error" in data:
        print(f"  ❌ {data['error']}")
        return
    a = data["analysis"]
    print(f"  Category:       {data['category']}")
    print(f"  Total products: {a['total_products']}")
    print(f"  Price range:    ${a['price_range']['min']:.2f} – ${a['price_range']['max']:.2f}")
    print(f"  Average rating: {a['average_rating']}⭐\n")
    print("  Best value products:")
    for i, p in enumerate(data["best_value_products"][:3], 1):
        print(f"    {i}. {p['name'][:55]}")
        print(f"       ${p['price']:.2f} | {p['rating']}⭐ | value: {p['value_score']}")


# ============================================================
# Section 3: SOLUTION — get_trending_products
# ============================================================

@tool
def get_trending_products(limit: int = 5) -> str:
    """SOLUTION: Get trending products based on ratings and reviews.

    Returns products with high ratings (4.5+), many reviews (50+), and in stock.

    Args:
        limit: Maximum number of products to return

    Returns:
        JSON string with trending products
    """
    try:
        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT "productId", product_description, category_name,
                           price, stars, reviews, quantity
                    FROM bedrock_integration.product_catalog
                    WHERE stars >= 4.5
                      AND reviews > 50
                      AND quantity > 0
                    ORDER BY stars DESC, reviews DESC
                    LIMIT %s
                """, (limit,))
                products = cur.fetchall()

                result = {
                    "trending_products": [{
                        "id": p["productId"],
                        "title": p["product_description"],
                        "category": p["category_name"],
                        "price": float(p["price"]),
                        "stars": float(p["stars"]),
                        "reviews": p["reviews"],
                    } for p in products],
                    "count": len(products),
                    "criteria": "stars >= 4.5, reviews > 50, in stock",
                }
                return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Database error: {str(e)}"})


# ============================================================
# Section 4: AgentCore Gateway (Phase 2 placeholder)
# ============================================================

def section_4_agentcore_gateway():
    """AgentCore Gateway registration placeholder."""
    try:
        from agentcore import GatewayClient
        AGENTCORE_AVAILABLE = True
    except ImportError:
        AGENTCORE_AVAILABLE = False

    print("=== Section 4: AgentCore Gateway Registration ===\n")
    if not AGENTCORE_AVAILABLE:
        print("  ⚠️  AgentCore SDK not installed. Gateway features disabled.")
        return

    # When SDK is available:
    # gateway = GatewayClient(tool_server_name="blaize-bazaar-tools")
    # gateway.register_tool(get_trending_products)
    # gateway.register_tool(get_category_price_analysis)
    # results = gateway.discover_tools("What products are popular?")
    # print(f"  Discovered {len(results)} tools")
    print("  ⏳ Gateway registration ready for AgentCore SDK")


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 2 SOLUTION: Context Management & Custom Agent Tools")
    print("=" * 60 + "\n")

    section_1_token_efficiency()
    print()
    section_2_tool_example()

    print("\n" + "=" * 60)
    print("Section 3: get_trending_products (SOLUTION)")
    print("=" * 60 + "\n")

    result = get_trending_products(limit=3)
    data = json.loads(result)

    if "trending_products" in data and data["trending_products"]:
        print("🔥 Trending Products:")
        print("-" * 50)
        for i, p in enumerate(data["trending_products"], 1):
            print(f"  {i}. {p['title'][:55]}")
            print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['reviews']:,} reviews")

        all_high = all(p["stars"] >= 4.5 for p in data["trending_products"])
        all_popular = all(p["reviews"] > 50 for p in data["trending_products"])
        print(f"\n  ✅ Business logic verified: high_rated={all_high}, popular={all_popular}")
        print(f"  Criteria: {data['criteria']}")
        print(f"  Results:  {data['count']} products")
    else:
        print("  ❌ No results returned")

    print()
    section_4_agentcore_gateway()

    print("\n" + "=" * 60)
    print("🎉 All sections complete!")
    print("   • Token efficiency demonstration")
    print("   • get_category_price_analysis tool")
    print("   • get_trending_products tool (SOLUTION)")
    print("   • AgentCore Gateway placeholder")
    print("=" * 60)
