#!/usr/bin/env python3
"""Part 2: Context Management & Custom Agent Tools — Blaize Bazaar Workshop

Build custom Aurora PostgreSQL tools with Strands SDK that reduce token
usage while maintaining conversation quality.

Sections:
  1. Token Efficiency Demo (pre-built)
  2. Complete Tool Example: get_category_price_analysis (pre-built)
  3. TODO: Build get_trending_products
  4. TODO: AgentCore Gateway Registration (Phase 2 placeholder)

Run from repo root:
    python labs/part2_custom_tools.py
"""

import json
import sys
from typing import Dict, List, Optional

from shared.config import get_connection_string, BEDROCK_CHAT_MODEL
from shared.db import fetch_all, fetch_one
from shared.embeddings import generate_embedding

try:
    from strands import Agent, tool
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    print("⚠️  Strands SDK not installed. Agent features disabled.")
    print("   Install with: pip install strands-agents strands-agents-tools")
    # Provide a no-op @tool decorator so the file still parses
    def tool(fn):
        return fn

conn_string = get_connection_string()


# ============================================================
# Section 1: Token Efficiency Demo (Pre-built)
# ============================================================

def section_1_token_efficiency():
    """Pre-built: Demonstrate why structured tool responses save tokens."""
    print("=== Section 1: Token Efficiency Demo ===\n")

    # Simulate a raw database dump (what an unoptimized tool returns)
    raw_dump = {
        "rows": [
            {
                "productId": "B07XYZ123",
                "product_description": "Premium Wireless Noise-Cancelling Headphones with 30-Hour Battery Life and Quick Charge",
                "category_name": "Electronics",
                "price": 249.99,
                "stars": 4.7,
                "reviews": 3421,
                "quantity": 156,
                "imgUrl": "https://example.com/images/headphones-premium.jpg",
                "productURL": "https://example.com/products/B07XYZ123",
                "embedding": "[0.0234, -0.0891, 0.0456, ...]  (1024 floats)",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-11-20T14:22:00Z",
                "seller_id": "SELLER_A1B2C3",
                "warehouse_location": "US-WEST-2",
            }
        ],
        "query_metadata": {
            "execution_time_ms": 45,
            "rows_scanned": 21704,
            "index_used": "hnsw_product_embedding",
        },
    }

    # Optimized structured response (what a well-designed tool returns)
    structured = {
        "trending_products": [
            {
                "id": "B07XYZ123",
                "title": "Premium Wireless Noise-Cancelling Headphones",
                "price": 249.99,
                "stars": 4.7,
                "reviews": 3421,
            }
        ],
        "count": 1,
        "criteria": "stars >= 4.5, reviews > 50, in stock",
    }

    raw_tokens = len(json.dumps(raw_dump))
    structured_tokens = len(json.dumps(structured))
    savings = (1 - structured_tokens / raw_tokens) * 100

    print(f"  Raw dump size:        {raw_tokens:,} characters")
    print(f"  Structured size:      {structured_tokens:,} characters")
    print(f"  Token savings:        ~{savings:.0f}%\n")
    print("  💡 Custom tools let you control exactly what the LLM sees.")
    print("     Less noise → better reasoning → lower cost.")


# ============================================================
# Section 2: Complete Tool Example (Pre-built)
# ============================================================

@tool
def get_category_price_analysis(category: str) -> str:
    """Analyze pricing statistics for a product category.

    Returns price range, average rating, and best-value products
    for the given category.

    Args:
        category: Product category name (partial match supported)

    Returns:
        JSON string with pricing analysis
    """
    try:
        row = fetch_one("""
            SELECT
                category_name,
                COUNT(*) AS total_products,
                MIN(price) AS min_price,
                MAX(price) AS max_price,
                AVG(price) AS avg_price,
                AVG(stars) AS avg_rating
            FROM bedrock_integration.product_catalog
            WHERE category_name ILIKE %s AND quantity > 0
            GROUP BY category_name
        """, (f"%{category}%",))

        if not row:
            return json.dumps({"error": f"No products in category: {category}"})

        best_value = fetch_all("""
            SELECT
                "productId", product_description, price, stars, reviews,
                (price / NULLIF(stars, 0)) AS value_score
            FROM bedrock_integration.product_catalog
            WHERE category_name ILIKE %s
              AND quantity > 0 AND stars > 0 AND price > 0
            ORDER BY value_score ASC
            LIMIT 5
        """, (f"%{category}%",))

        result = {
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
            "best_value_products": [
                {
                    "id": p["productId"],
                    "name": p["product_description"],
                    "price": float(p["price"]),
                    "rating": float(p["stars"]),
                    "reviews": p["reviews"],
                    "value_score": round(float(p["value_score"]), 2),
                }
                for p in best_value
            ],
        }
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Analysis error: {str(e)}"})


def section_2_tool_example():
    """Pre-built: Demonstrate the complete get_category_price_analysis tool."""
    print("=== Section 2: Complete Tool — get_category_price_analysis ===\n")

    result_json = get_category_price_analysis(category="Electronics")
    data = json.loads(result_json)

    if "error" in data:
        print(f"  ❌ {data['error']}")
        return

    analysis = data["analysis"]
    print(f"  Category:       {data['category']}")
    print(f"  Total products: {analysis['total_products']}")
    print(f"  Price range:    ${analysis['price_range']['min']:.2f} – "
          f"${analysis['price_range']['max']:.2f}")
    print(f"  Average price:  ${analysis['price_range']['average']:.2f}")
    print(f"  Average rating: {analysis['average_rating']}⭐\n")

    print("  Best value products:")
    for i, p in enumerate(data["best_value_products"][:3], 1):
        print(f"    {i}. {p['name'][:55]}")
        print(f"       ${p['price']:.2f} | {p['rating']}⭐ | value_score: {p['value_score']}")

    print("\n  💡 The @tool decorator makes this function discoverable to Strands agents.")
    print("     Structured JSON output keeps token usage low.")


# ============================================================
# Section 3: TODO — Build get_trending_products
# ============================================================

# @tool  # <-- Uncomment when you implement the function
def get_trending_products(limit: int = 5) -> Optional[str]:
    """
    TODO: Build a tool that returns trending products.

    Trending = high ratings + proven popularity + in stock.

    Steps:
        1. Connect to the database using psycopg.connect(conn_string)
        2. Write a SELECT query with THREE filter conditions:
           - stars >= 4.5  (high ratings)
           - reviews > 50  (proven popularity)
           - quantity > 0  (in stock)
        3. ORDER BY stars DESC, reviews DESC
        4. LIMIT by the limit parameter
        5. Format results as structured JSON with:
           - "trending_products" array (id, title, category, price, stars, reviews)
           - "count" integer
           - "criteria" string describing the filters used

    Hints:
        - Use row_factory=dict_row for dictionary results
        - Use %s for parameterized LIMIT
        - Return json.dumps(result, indent=2)
        - Wrap in try/except, return error JSON on failure

    Args:
        limit: Maximum number of products to return (default: 5)

    Returns:
        JSON string with trending products, or None if not implemented
    """
    # TODO: Your implementation here (~10 lines)
    return None


# ============================================================
# Section 4: TODO — AgentCore Gateway Registration (Phase 2)
# ============================================================

def section_4_agentcore_gateway():
    """
    TODO (Phase 2): Register tools in Amazon Bedrock AgentCore Gateway.

    AgentCore Gateway provides secure, managed tool discovery so agents
    can find and invoke tools by semantic description rather than
    hard-coded function references.

    Steps:
        1. Import GatewayClient from agentcore SDK
        2. Create a GatewayClient with tool_server_name="blaize-bazaar-tools"
        3. Register each @tool function with gateway.register_tool()
        4. Verify discovery with gateway.discover_tools("popular products")

    This section will be completed when the AgentCore SDK is available
    in the workshop environment.
    """
    try:
        from agentcore import GatewayClient
        AGENTCORE_AVAILABLE = True
    except ImportError:
        AGENTCORE_AVAILABLE = False

    print("=== Section 4: AgentCore Gateway Registration ===\n")

    if not AGENTCORE_AVAILABLE:
        print("  ⚠️  AgentCore SDK not installed. Gateway features disabled.")
        print("     Install with: pip install amazon-bedrock-agentcore-sdk")
        print("     This section will be available when the SDK is released.")
        return

    # TODO: Implement gateway registration when SDK is available
    # gateway = GatewayClient(tool_server_name="blaize-bazaar-tools")
    # gateway.register_tool(get_trending_products)
    # gateway.register_tool(get_category_price_analysis)
    # results = gateway.discover_tools("What products are popular?")
    # print(f"  Discovered {len(results)} tools via semantic search")
    print("  ⏳ TODO: Implement gateway registration")


# ============================================================
# Main — runs all sections sequentially
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 2: Context Management & Custom Agent Tools")
    print("=" * 60 + "\n")

    section_1_token_efficiency()
    print()
    section_2_tool_example()

    print("\n" + "=" * 60)
    print("--- YOUR TURN ---")
    print("=" * 60 + "\n")

    print("Testing get_trending_products()...\n")
    result = get_trending_products(limit=3)

    if result:
        data = json.loads(result)
        if "trending_products" in data and len(data["trending_products"]) > 0:
            print("🔥 Trending Products:")
            print("-" * 50)
            for i, p in enumerate(data["trending_products"], 1):
                print(f"  {i}. {p['title'][:55]}")
                print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['reviews']:,} reviews")

            # Verify business logic
            all_high = all(p["stars"] >= 4.5 for p in data["trending_products"])
            all_popular = all(p["reviews"] > 50 for p in data["trending_products"])
            if all_high and all_popular:
                print("\n  ✅ Business logic verified — all filters working!")
            else:
                print("\n  ⚠️  Check WHERE clause — some products don't meet criteria")
            print(f"\n  Criteria: {data['criteria']}")
            print(f"  Results:  {data['count']} products")
        else:
            print("  ❌ No results returned. Check your query.")
    else:
        print("  ⏳ TODO: Implement get_trending_products() and re-run")

    print()
    section_4_agentcore_gateway()

    print("\n" + "=" * 60)
    if result:
        print("🎉 You've built a custom agent tool!")
        print("   • @tool decorator for Strands agent discovery")
        print("   • Business logic with parameterized SQL")
        print("   • Structured JSON response for token efficiency")
    else:
        print("📝 Complete the TODO in get_trending_products()")
        print("   then re-run: python labs/part2_custom_tools.py")
    print("=" * 60)
