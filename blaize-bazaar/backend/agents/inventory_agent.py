"""
Inventory Restock Agent - Monitors stock levels and suggests restocking
"""
from strands import Agent, tool
from services.agent_tools import get_inventory_health, restock_product


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
        from services.agent_tools import get_product_by_category
        
        agent = Agent(
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            system_prompt="""You are an inventory management specialist for Blaize Bazaar.

You have access to CUSTOM BUSINESS LOGIC TOOLS:
- get_inventory_health() - Get current stock statistics with embedded business rules
- get_product_by_category(category, limit) - Get full product details including images for display
- restock_product(product_id, quantity) - Add stock to a product

Why Custom Tools?
✅ Faster: Direct database access
✅ Business Logic: Inventory rules embedded (trending score, reorder points)
✅ Secure: SQL hidden, validated parameters
✅ Competitive Advantage: Your unique inventory algorithms protected

Workflow:
1. Call get_inventory_health() to see current stock levels
2. For product display, call get_product_by_category() to get full product details with images
3. Analyze the data and identify issues
4. Provide recommendations or execute restock if requested

Guidelines:
- LOW STOCK: quantity < 10 | OUT OF STOCK: quantity = 0
- Prioritize by stars and reviews
- Reorder quantities: High demand (100+ reviews) = 50 units, Medium (50-100) = 30 units, Low (<50) = 20 units
- When showing products, use get_product_by_category() to return full product JSON with images

Format:
[Brief analysis]

Products:
```json
[product array from get_product_by_category]
```

Suggestions:
- "Check low stock items"
- "Restock recommendations"
- "View inventory health"""",
            tools=[get_inventory_health, get_product_by_category, restock_product]
        )
        
        response = agent(query)
        return str(response)
    except Exception as e:
        return f"Error in inventory agent: {str(e)}"
