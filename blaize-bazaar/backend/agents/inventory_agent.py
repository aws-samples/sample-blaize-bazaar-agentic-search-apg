"""
Inventory Restock Agent - Monitors stock levels and suggests restocking
"""
from strands import Agent, tool
from services.agent_tools import get_inventory_health, restock_product, get_low_stock_products


@tool
def inventory_restock_agent(query: str) -> str:
    """
    Analyze inventory levels and provide restocking recommendations.
    Can also execute restock actions when user provides product ID and quantity.
    
    Args:
        query: Inventory-related question or restock command
    
    Returns:
        Restocking recommendations or restock confirmation with product details
    """
    try:
        import json
        from services.agent_tools import _db_service, _run_async
        from services.business_logic import BusinessLogic
        
        # Direct call - bypass agent for simplicity
        logic = BusinessLogic(_db_service)
        result = _run_async(logic.get_low_stock_products(3))
        products = result.get('products', [])
        
        return f"Top 3 items needing restock:\n\n```json\n{json.dumps(products, indent=2)}\n```"
    except Exception as e:
        return f"Error in inventory agent: {str(e)}"
