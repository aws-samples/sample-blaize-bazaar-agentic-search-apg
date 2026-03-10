#!/usr/bin/env python3
"""Part 3: Multi-Agent Orchestration — Blaize Bazaar Workshop

Build a multi-agent system where specialist agents collaborate
through an orchestrator to handle complex e-commerce queries.

Sections:
  1. Inventory Agent (pre-built)
  2. Pricing Agent (pre-built)
  3. TODO: Recommendation Agent
  4. AgentCore Memory Configuration (Phase 2 placeholder)
  5. TODO: Orchestrator Wiring

Run from repo root:
    python labs/lab3_multi_agent.py
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
    def tool(fn):
        return fn

conn_string = get_connection_string()


# ============================================================
# Shared Tools (used by multiple agents)
# ============================================================

@tool
def get_inventory_health() -> str:
    """Retrieve current inventory health statistics."""
    try:
        stats = fetch_one("""
            SELECT COUNT(*) AS total_products,
                   COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock,
                   COUNT(CASE WHEN quantity > 0 AND quantity < 10 THEN 1 END) AS low_stock,
                   COUNT(CASE WHEN quantity >= 10 THEN 1 END) AS healthy_stock,
                   AVG(quantity) AS avg_quantity
            FROM bedrock_integration.product_catalog
        """)
        total = stats["total_products"]
        healthy = stats["healthy_stock"]
        health_score = int((healthy / total * 100)) if total > 0 else 0

        critical = fetch_all("""
            SELECT "productId", product_description, stars, reviews, quantity
            FROM bedrock_integration.product_catalog
            WHERE quantity < 10 AND stars >= 4.0 AND reviews > 100
            ORDER BY quantity ASC, reviews DESC LIMIT 5
        """)

        alerts = []
        if stats["out_of_stock"] > 0:
            alerts.append(f"🚨 {stats['out_of_stock']} products out of stock")
        if stats["low_stock"] > 0:
            alerts.append(f"⚠️ {stats['low_stock']} products low stock (<10 units)")
        if not alerts:
            alerts.append("✅ Inventory healthy")

        return json.dumps({
            "health_score": health_score,
            "statistics": {
                "total_products": total,
                "out_of_stock": stats["out_of_stock"],
                "low_stock": stats["low_stock"],
                "healthy_stock": healthy,
                "avg_quantity": round(float(stats["avg_quantity"]), 2),
            },
            "critical_items": critical,
            "alerts": alerts,
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Inventory check error: {str(e)}"})


@tool
def get_low_stock_products(limit: int = 3) -> str:
    """Get products with low stock prioritized by demand."""
    try:
        products = fetch_all("""
            SELECT "productId", product_description, price, stars,
                   reviews, category_name, quantity
            FROM bedrock_integration.product_catalog
            WHERE quantity < 10 AND stars >= 3.0
            ORDER BY quantity ASC, reviews DESC
            LIMIT %s
        """, (limit,))
        return json.dumps({
            "count": len(products),
            "products": [{
                "id": p["productId"], "name": p["product_description"],
                "category": p["category_name"], "price": float(p["price"]),
                "rating": float(p["stars"]), "reviews": p["reviews"],
                "quantity": p["quantity"],
            } for p in products],
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Low stock error: {str(e)}"})


@tool
def restock_product(product_id: str, quantity: int) -> str:
    """Restock a product by adding units to its inventory.

    Note: In Data API mode, this uses a single UPDATE with RETURNING.
    """
    try:
        import os
        if os.getenv("USE_DATA_API", "false").lower() == "true":
            # Data API mode — can't do multi-statement transactions easily
            product = fetch_one("""
                SELECT "productId", product_description, quantity
                FROM bedrock_integration.product_catalog
                WHERE "productId" = %s
            """, (product_id,))
            if not product:
                return json.dumps({"error": f"Product {product_id} not found"})
            # Note: UPDATE via Data API
            import boto3
            client = boto3.client("rds-data", region_name=os.getenv("AWS_REGION", "us-west-2"))
            client.execute_statement(
                resourceArn=os.getenv("DB_CLUSTER_ARN"),
                secretArn=os.getenv("DB_SECRET_ARN"),
                database=os.getenv("DB_NAME", "postgres"),
                sql=f"UPDATE bedrock_integration.product_catalog SET quantity = quantity + {int(quantity)} WHERE \"productId\" = '{product_id}'",
            )
            return json.dumps({
                "status": "success", "product_id": product_id,
                "product_name": product["product_description"],
                "old_quantity": product["quantity"],
                "new_quantity": product["quantity"] + quantity,
            }, indent=2)
        else:
            import psycopg
            from psycopg.rows import dict_row
            with psycopg.connect(conn_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT "productId", product_description, quantity
                        FROM bedrock_integration.product_catalog WHERE "productId" = %s
                    """, (product_id,))
                    product = cur.fetchone()
                    if not product:
                        return json.dumps({"error": f"Product {product_id} not found"})
                    old_qty = product["quantity"]
                    cur.execute("""
                        UPDATE bedrock_integration.product_catalog
                        SET quantity = quantity + %s WHERE "productId" = %s
                    """, (quantity, product_id))
                    conn.commit()
                    return json.dumps({
                        "status": "success", "product_id": product_id,
                        "product_name": product["product_description"],
                        "old_quantity": old_qty, "new_quantity": old_qty + quantity,
                    }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Restock error: {str(e)}"})


@tool
def get_category_price_analysis(category: str) -> str:
    """Analyze pricing statistics for a product category."""
    try:
        row = fetch_one("""
            SELECT category_name, COUNT(*) AS total_products,
                   MIN(price) AS min_price, MAX(price) AS max_price,
                   AVG(price) AS avg_price, AVG(stars) AS avg_rating
            FROM bedrock_integration.product_catalog
            WHERE category_name ILIKE %s AND quantity > 0
            GROUP BY category_name
        """, (f"%{category}%",))
        if not row:
            return json.dumps({"error": f"No products in: {category}"})
        return json.dumps({
            "category": row["category_name"],
            "total_products": row["total_products"],
            "price_range": {
                "min": float(row["min_price"]),
                "max": float(row["max_price"]),
                "avg": round(float(row["avg_price"]), 2),
            },
            "avg_rating": round(float(row["avg_rating"]), 2),
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def semantic_product_search(
    query: str,
    max_price: Optional[float] = None,
    min_rating: float = 4.0,
    limit: int = 5,
) -> str:
    """AI-powered semantic product search with optional filters."""
    try:
        query_embedding = generate_embedding(query)
        conditions = ["quantity > 0"]
        params: list = [str(query_embedding), str(query_embedding)]

        if max_price:
            conditions.append("price <= %s")
            params.append(max_price)
        if min_rating:
            conditions.append("stars >= %s")
            params.append(min_rating)

        where = " AND ".join(conditions)
        params.extend([str(query_embedding), limit])

        products = fetch_all(f"""
            SELECT "productId", product_description, price, stars,
                   reviews, category_name, quantity,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM bedrock_integration.product_catalog
            WHERE {where}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, tuple(params))

        return json.dumps({
            "query": query,
            "products": [{
                "productId": p["productId"],
                "product_description": p["product_description"],
                "price": float(p["price"]),
                "stars": float(p["stars"]),
                "reviews": p["reviews"],
                "category_name": p["category_name"],
                "quantity": p["quantity"],
                "similarity": round(float(p["similarity"]), 3),
            } for p in products],
            "count": len(products),
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Search error: {str(e)}"})


@tool
def get_trending_products(limit: int = 5) -> str:
    """Get trending products (high ratings + popular + in stock)."""
    try:
        products = fetch_all("""
            SELECT "productId", product_description, category_name,
                   price, stars, reviews, quantity
            FROM bedrock_integration.product_catalog
            WHERE stars >= 4.5 AND reviews > 50 AND quantity > 0
            ORDER BY stars DESC, reviews DESC
            LIMIT %s
        """, (limit,))
        return json.dumps({
            "trending_products": [{
                "id": p["productId"], "title": p["product_description"],
                "category": p["category_name"], "price": float(p["price"]),
                "stars": float(p["stars"]), "reviews": p["reviews"],
            } for p in products],
            "count": len(products),
            "criteria": "stars >= 4.5, reviews > 50, in stock",
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_product_by_category(
    category: str,
    min_rating: float = 4.0,
    max_price: Optional[float] = None,
    limit: int = 10,
) -> str:
    """Retrieve products by category with filters."""
    try:
        conditions = ["category_name ILIKE %s", "quantity > 0"]
        params: list = [f"%{category}%"]
        if min_rating:
            conditions.append("stars >= %s")
            params.append(min_rating)
        if max_price:
            conditions.append("price <= %s")
            params.append(max_price)
        where = " AND ".join(conditions)
        params.append(limit)

        products = fetch_all(f"""
            SELECT "productId", product_description, price, stars,
                   reviews, category_name, quantity
            FROM bedrock_integration.product_catalog
            WHERE {where}
            ORDER BY stars DESC, reviews DESC
            LIMIT %s
        """, tuple(params))

        return json.dumps({
            "category": category,
            "products": [{
                "id": p["productId"], "name": p["product_description"],
                "price": float(p["price"]), "rating": float(p["stars"]),
                "reviews": p["reviews"], "quantity": p["quantity"],
            } for p in products],
            "count": len(products),
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ============================================================
# Section 1: Inventory Agent (Pre-built)
# ============================================================

def section_1_inventory_agent():
    """Pre-built: Demonstrate the Inventory Agent with its tools."""
    print("=== Section 1: Inventory Agent (Pre-built) ===\n")

    if not STRANDS_AVAILABLE:
        print("  ⚠️  Strands SDK required. Showing tool output directly.\n")
        result = json.loads(get_inventory_health())
        print(f"  Health Score: {result.get('health_score', 'N/A')}%")
        for alert in result.get("alerts", []):
            print(f"  {alert}")
        return

    inventory_agent = Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt="""You are Blaize Bazaar's Inventory Specialist.
Monitor stock levels, flag critical alerts, and recommend restocking actions.
Provide clear, data-driven responses.""",
        tools=[get_inventory_health, restock_product, get_low_stock_products],
    )
    print("  Inventory Agent created with tools:")
    print("    • get_inventory_health")
    print("    • restock_product")
    print("    • get_low_stock_products\n")
    print("  Querying: 'What is the current inventory health?'\n")
    response = inventory_agent("What is the current inventory health?")
    print(f"  Agent response:\n  {str(response)[:500]}")


# ============================================================
# Section 2: Pricing Agent (Pre-built)
# ============================================================

def section_2_pricing_agent():
    """Pre-built: Demonstrate the Pricing Agent with its tools."""
    print("=== Section 2: Pricing Agent (Pre-built) ===\n")

    if not STRANDS_AVAILABLE:
        print("  ⚠️  Strands SDK required. Showing tool output directly.\n")
        result = json.loads(get_category_price_analysis(category="Accessories"))
        print(f"  Category: {result.get('category', 'N/A')}")
        pr = result.get("price_range", {})
        print(f"  Price range: ${pr.get('min', 0):.2f} – ${pr.get('max', 0):.2f}")
        return

    pricing_agent = Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt="""You are Blaize Bazaar's Pricing Specialist.
Analyze pricing across categories, identify best-value products,
and provide budget recommendations. Use semantic search for price-filtered queries.""",
        tools=[get_category_price_analysis, get_product_by_category, semantic_product_search],
    )
    print("  Pricing Agent created with tools:")
    print("    • get_category_price_analysis")
    print("    • get_product_by_category")
    print("    • semantic_product_search\n")
    print("  Querying: 'Analyze pricing for Accessories'\n")
    response = pricing_agent("Analyze pricing for Accessories")
    print(f"  Agent response:\n  {str(response)[:500]}")


# ============================================================
# Section 3: TODO — Recommendation Agent
# ============================================================

def section_3_recommendation_agent() -> Optional[object]:
    """
    TODO: Build the Recommendation Agent.

    Follow the same pattern as the Inventory and Pricing agents above.

    Steps:
        1. Create an Agent with model=BEDROCK_CHAT_MODEL
        2. Write a system_prompt that describes a Product Recommendation
           Specialist who provides personalized suggestions
        3. Assign tools: [get_trending_products, semantic_product_search,
                          get_product_by_category]
        4. Return the agent instance

    Hints:
        - The system prompt should mention using trending products for
          discovery queries and semantic search for specific needs
        - Keep the prompt concise (5-8 lines)
        - The agent will be used by the orchestrator in Section 5

    Returns:
        Agent instance, or None if not implemented
    """
    if not STRANDS_AVAILABLE:
        print("  ⚠️  Strands SDK required for agent creation.")
        return None

    # TODO: Your implementation here (~8 lines)
    return None


# ============================================================
# Section 4: AgentCore Memory Configuration (Phase 2)
# ============================================================

def section_4_agentcore_memory():
    """AgentCore Memory configuration placeholder (Phase 2)."""
    try:
        from agentcore import MemoryClient
        AGENTCORE_AVAILABLE = True
    except ImportError:
        AGENTCORE_AVAILABLE = False

    print("=== Section 4: AgentCore Memory (Phase 2) ===\n")

    if not AGENTCORE_AVAILABLE:
        print("  ⚠️  AgentCore SDK not installed. Memory features disabled.")
        print("     Install with: pip install amazon-bedrock-agentcore-sdk\n")
        print("  When available, AgentCore Memory provides:")
        print("    • Managed short-term memory (conversation context)")
        print("    • Long-term memory (user preferences)")
        print("    • No manual session table management needed")
        return


# ============================================================
# Section 5: TODO — Orchestrator Wiring
# ============================================================

def section_5_orchestrator():
    """
    TODO: Wire up the Orchestrator that routes queries to specialist agents.

    The orchestrator is a meta-agent whose "tools" are the specialist agents
    themselves (wrapped with @tool). It decides which specialist to invoke
    based on the user's query.

    Steps:
        1. Wrap each specialist agent call in a @tool function:
           - inventory_restock_agent(query: str) -> str
           - price_optimization_agent(query: str) -> str
           - product_recommendation_agent(query: str) -> str
        2. Create the orchestrator Agent with:
           - model=BEDROCK_CHAT_MODEL
           - system_prompt describing routing rules
           - tools=[inventory_restock_agent, price_optimization_agent,
                     product_recommendation_agent]
        3. Test with: orchestrator("What are the trending products right now?")

    Returns:
        Orchestrator Agent instance, or None if not implemented
    """
    if not STRANDS_AVAILABLE:
        print("  ⚠️  Strands SDK required for orchestrator.")
        return None

    # TODO: Your implementation here (~20 lines)
    return None


# ============================================================
# Main — runs all sections sequentially
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 3: Multi-Agent Orchestration")
    print("=" * 60 + "\n")

    section_1_inventory_agent()
    print()
    section_2_pricing_agent()

    print("\n" + "=" * 60)
    print("--- YOUR TURN ---")
    print("=" * 60 + "\n")

    print("Testing Recommendation Agent...\n")
    rec_agent = section_3_recommendation_agent()
    if rec_agent:
        print("  ✅ Recommendation Agent created!")
        print("  Testing: 'What are the best wireless headphones?'\n")
        response = rec_agent("What are the best wireless headphones?")
        print(f"  Agent response:\n  {str(response)[:500]}")
    else:
        print("  ⏳ TODO: Implement section_3_recommendation_agent()")

    print()
    section_4_agentcore_memory()

    print("\nTesting Orchestrator...\n")
    orchestrator = section_5_orchestrator()
    if orchestrator:
        print("  ✅ Orchestrator created!")
        print("  Testing: 'What are the trending products right now?'\n")
        response = orchestrator("What are the trending products right now?")
        print(f"  Orchestrator response:\n  {str(response)[:500]}")
    else:
        print("  ⏳ TODO: Implement section_5_orchestrator()")

    print("\n" + "=" * 60)
    if rec_agent and orchestrator:
        print("🎉 Multi-agent system complete!")
        print("   • 3 specialist agents with distinct tools")
        print("   • Orchestrator routing queries to the right agent")
        print("   • AgentCore Memory ready for Phase 2")
    else:
        print("📝 Complete the TODOs in sections 3 and 5")
        print("   then re-run: python labs/part3_multi_agent.py")
    print("=" * 60)
