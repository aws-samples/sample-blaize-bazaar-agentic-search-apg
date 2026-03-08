#!/usr/bin/env python3
"""Part 3 SOLUTION: Multi-Agent Orchestration — Blaize Bazaar Workshop

Complete reference implementation with all TODOs filled in.

Run from repo root:
    python labs/solutions/part3_solution.py
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
# Shared Tools (all 7 tools from Part 2)
# ============================================================

@tool
def get_inventory_health() -> str:
    """Retrieve current inventory health statistics."""
    try:
        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*) AS total_products,
                           COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock,
                           COUNT(CASE WHEN quantity > 0 AND quantity < 10 THEN 1 END) AS low_stock,
                           COUNT(CASE WHEN quantity >= 10 THEN 1 END) AS healthy_stock,
                           AVG(quantity) AS avg_quantity
                    FROM bedrock_integration.product_catalog
                """)
                stats = dict(cur.fetchone())
                total = stats["total_products"]
                healthy = stats["healthy_stock"]
                health_score = int((healthy / total * 100)) if total > 0 else 0

                alerts = []
                if stats["out_of_stock"] > 0:
                    alerts.append(f"🚨 {stats['out_of_stock']} products out of stock")
                if stats["low_stock"] > 0:
                    alerts.append(f"⚠️ {stats['low_stock']} products low stock")
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
                    "alerts": alerts,
                }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_low_stock_products(limit: int = 3) -> str:
    """Get products with low stock prioritized by demand."""
    try:
        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT "productId", product_description, price, stars,
                           reviews, category_name, quantity
                    FROM bedrock_integration.product_catalog
                    WHERE quantity < 10 AND stars >= 3.0
                    ORDER BY quantity ASC, reviews DESC LIMIT %s
                """, (limit,))
                products = [dict(r) for r in cur.fetchall()]
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
        return json.dumps({"error": str(e)})


@tool
def restock_product(product_id: str, quantity: int) -> str:
    """Restock a product by adding units."""
    try:
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
                    "old_quantity": old_qty, "new_quantity": old_qty + quantity,
                }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


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
    query: str, max_price: Optional[float] = None,
    min_rating: float = 4.0, limit: int = 5,
) -> str:
    """AI-powered semantic product search with filters."""
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

        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT "productId", product_description, price, stars,
                           reviews, category_name, quantity,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM bedrock_integration.product_catalog
                    WHERE {where}
                    ORDER BY embedding <=> %s::vector LIMIT %s
                """, params)
                products = [dict(r) for r in cur.fetchall()]
                return json.dumps({
                    "query": query,
                    "products": [{
                        "productId": p["productId"],
                        "product_description": p["product_description"],
                        "price": float(p["price"]), "stars": float(p["stars"]),
                        "reviews": p["reviews"], "category_name": p["category_name"],
                        "similarity": round(float(p["similarity"]), 3),
                    } for p in products],
                    "count": len(products),
                }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_trending_products(limit: int = 5) -> str:
    """Get trending products (high ratings + popular + in stock)."""
    try:
        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT "productId", product_description, category_name,
                           price, stars, reviews, quantity
                    FROM bedrock_integration.product_catalog
                    WHERE stars >= 4.5 AND reviews > 50 AND quantity > 0
                    ORDER BY stars DESC, reviews DESC LIMIT %s
                """, (limit,))
                products = [dict(r) for r in cur.fetchall()]
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
    category: str, min_rating: float = 4.0,
    max_price: Optional[float] = None, limit: int = 10,
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

        with psycopg.connect(conn_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT "productId", product_description, price, stars,
                           reviews, category_name, quantity
                    FROM bedrock_integration.product_catalog
                    WHERE {where}
                    ORDER BY stars DESC, reviews DESC LIMIT %s
                """, params)
                products = [dict(r) for r in cur.fetchall()]
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

def create_inventory_agent() -> Optional[object]:
    """Create the Inventory Agent."""
    if not STRANDS_AVAILABLE:
        return None
    return Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt="""You are Blaize Bazaar's Inventory Specialist.
Monitor stock levels, flag critical alerts, and recommend restocking.
Provide clear, data-driven responses.""",
        tools=[get_inventory_health, restock_product, get_low_stock_products],
    )


# ============================================================
# Section 2: Pricing Agent (Pre-built)
# ============================================================

def create_pricing_agent() -> Optional[object]:
    """Create the Pricing Agent."""
    if not STRANDS_AVAILABLE:
        return None
    return Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt="""You are Blaize Bazaar's Pricing Specialist.
Analyze pricing across categories, identify best-value products,
and provide budget recommendations using semantic search.""",
        tools=[get_category_price_analysis, get_product_by_category, semantic_product_search],
    )


# ============================================================
# Section 3: SOLUTION — Recommendation Agent
# ============================================================

def create_recommendation_agent() -> Optional[object]:
    """SOLUTION: Create the Recommendation Agent."""
    if not STRANDS_AVAILABLE:
        return None
    return Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt="""You are Blaize Bazaar's Product Recommendation Specialist.
Provide personalized product suggestions based on user preferences.
Use trending products for discovery queries and semantic search for specific needs.
Always explain why you're recommending each product.""",
        tools=[get_trending_products, semantic_product_search, get_product_by_category],
    )


# ============================================================
# Section 4: AgentCore Memory (Phase 2 placeholder)
# ============================================================

def section_4_agentcore_memory():
    """AgentCore Memory configuration placeholder."""
    try:
        from agentcore import MemoryClient
        AGENTCORE_AVAILABLE = True
    except ImportError:
        AGENTCORE_AVAILABLE = False

    print("=== Section 4: AgentCore Memory (Phase 2) ===\n")
    if not AGENTCORE_AVAILABLE:
        print("  ⚠️  AgentCore SDK not installed. Memory features disabled.")
        print("     When available, pass memory to the orchestrator:")
        print("     memory = MemoryClient(namespace='blaize-bazaar',")
        print("                           short_term_strategy='conversation',")
        print("                           long_term_strategy='preferences')")
        return
    # TODO: Implement when SDK is available


# ============================================================
# Section 5: SOLUTION — Orchestrator Wiring
# ============================================================

def create_orchestrator() -> Optional[object]:
    """SOLUTION: Create the Orchestrator that routes to specialist agents."""
    if not STRANDS_AVAILABLE:
        return None

    # Create specialist agents
    inventory_agent = create_inventory_agent()
    pricing_agent = create_pricing_agent()
    recommendation_agent = create_recommendation_agent()

    if not all([inventory_agent, pricing_agent, recommendation_agent]):
        print("  ❌ Could not create all specialist agents")
        return None

    # Wrap agents as @tool functions for the orchestrator
    @tool
    def inventory_restock_agent(query: str) -> str:
        """Analyze inventory levels and provide restocking recommendations.

        Args:
            query: Inventory-related question or restock command

        Returns:
            Inventory analysis or restock confirmation
        """
        return str(inventory_agent(query))

    @tool
    def price_optimization_agent(query: str) -> str:
        """Analyze product pricing and suggest optimal deals.

        Args:
            query: Pricing-related question or request

        Returns:
            Pricing analysis or deal recommendations
        """
        return str(pricing_agent(query))

    @tool
    def product_recommendation_agent(query: str) -> str:
        """Provide personalized product recommendations.

        Args:
            query: Product inquiry or recommendation request

        Returns:
            Personalized product recommendations
        """
        return str(recommendation_agent(query))

    ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Route queries to the right specialist agent.

AGENTS:
- price_optimization_agent: Best deals, pricing queries, budget recommendations
- inventory_restock_agent: Stock levels, restocking, inventory health
- product_recommendation_agent: General product search, trending items, recommendations

RULES:
1. Analyze the user's query to determine which agent is best suited
2. Call the appropriate agent with the full query
3. Return the agent's response to the user
4. If unsure, use product_recommendation_agent as the default"""

    return Agent(
        model=BEDROCK_CHAT_MODEL,
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[inventory_restock_agent, price_optimization_agent, product_recommendation_agent],
    )


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Part 3 SOLUTION: Multi-Agent Orchestration")
    print("=" * 60 + "\n")

    if not STRANDS_AVAILABLE:
        print("⚠️  Strands SDK required for full solution demo.")
        print("   Showing tool outputs directly instead.\n")

        print("--- Inventory Health ---")
        health = json.loads(get_inventory_health())
        print(f"  Health Score: {health.get('health_score', 'N/A')}%")
        for alert in health.get("alerts", []):
            print(f"  {alert}")

        print("\n--- Trending Products ---")
        trending = json.loads(get_trending_products(limit=3))
        for i, p in enumerate(trending.get("trending_products", []), 1):
            print(f"  {i}. {p['title'][:55]}")
            print(f"     ${p['price']:.2f} | {p['stars']}⭐ | {p['reviews']:,} reviews")

        print("\n--- Category Analysis ---")
        analysis = json.loads(get_category_price_analysis(category="Electronics"))
        pr = analysis.get("price_range", {})
        print(f"  {analysis.get('category', 'N/A')}: "
              f"${pr.get('min', 0):.2f} – ${pr.get('max', 0):.2f}")

        section_4_agentcore_memory()
        print("\n" + "=" * 60)
        print("🎉 All tools verified! Install Strands SDK for full agent demo.")
        print("=" * 60)
        sys.exit(0)

    # Full agent demo
    print("Creating specialist agents...\n")

    inv = create_inventory_agent()
    print("  ✅ Inventory Agent")
    price = create_pricing_agent()
    print("  ✅ Pricing Agent")
    rec = create_recommendation_agent()
    print("  ✅ Recommendation Agent")

    print("\nCreating Orchestrator...\n")
    orchestrator = create_orchestrator()
    if orchestrator:
        print("  ✅ Orchestrator ready\n")
    else:
        print("  ❌ Orchestrator creation failed")
        sys.exit(1)

    section_4_agentcore_memory()

    # Test the orchestrator
    test_queries = [
        "What are the trending products right now?",
        "What is the current inventory health?",
        "Find me wireless headphones under $100",
    ]

    print("\n" + "=" * 60)
    print("Testing Orchestrator")
    print("=" * 60)

    for query in test_queries:
        print(f'\n  Query: "{query}"')
        print("  " + "-" * 50)
        response = orchestrator(query)
        print(f"  Response: {str(response)[:400]}")

    print("\n" + "=" * 60)
    print("🎉 Multi-agent system complete!")
    print("   • 3 specialist agents with 7 tools")
    print("   • Orchestrator routing queries intelligently")
    print("   • AgentCore Memory ready for Phase 2")
    print("=" * 60)
