"""
Strands SDK Tools for Agents
Provides @tool decorated functions for agent use with live database access
"""
from strands import tool
import json
import asyncio

# Global database service reference
_db_service = None

def set_db_service(db_service):
    """Set the database service instance"""
    global _db_service
    _db_service = db_service

def _run_async(coro):
    """Helper to run async functions in sync context"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@tool
def get_inventory_health() -> str:
    """Get current inventory health statistics with live data from database"""
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_inventory_health())
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_trending_products(limit: int = 10) -> str:
    """Get trending products with live data from database"""
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_trending_products(limit))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_category_price_analysis(category: str = None) -> str:
    """Get category price analysis with live data from database (matches Part 2 notebook)"""
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_price_statistics(category))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def restock_product(product_id: str, quantity: int) -> str:
    """Restock a product in database with live execution"""
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.restock_product(product_id, quantity))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def semantic_product_search(
    query: str,
    max_price: float = None,
    min_rating: float = 4.0,
    category: str = None,
    limit: int = 5
) -> str:
    """Search products using AI-powered semantic understanding with filters
    
    Args:
        query: Natural language search query
        max_price: Maximum price filter (optional)
        min_rating: Minimum star rating (default: 4.0)
        category: Category filter (optional)
        limit: Number of results (default: 5)
    """
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.semantic_product_search(
            query, max_price, min_rating, category, limit
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_product_by_category(
    category: str,
    min_rating: float = 4.0,
    max_price: float = None,
    limit: int = 10
) -> str:
    """Get products by category with filters
    
    Args:
        category: Product category name
        min_rating: Minimum star rating (default: 4.0)
        max_price: Maximum price filter (optional)
        limit: Number of results (default: 10)
    """
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_products_by_category(
            category, min_rating, max_price, limit
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_low_stock_products(limit: int = 3) -> str:
    """Get products with low stock (quantity < 10) prioritized by demand
    
    Args:
        limit: Number of results (default: 3)
    """
    if not _db_service:
        return json.dumps({"error": "Database service not initialized"})
    
    try:
        from services.business_logic import BusinessLogic
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_low_stock_products(limit))
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})
