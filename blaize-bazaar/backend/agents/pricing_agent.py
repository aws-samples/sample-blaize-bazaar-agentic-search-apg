"""
Price Optimization Agent - Analyzes pricing and suggests deals
"""
from strands import Agent, tool
from services.agent_tools import get_category_price_analysis, get_product_by_category, semantic_product_search


@tool
def price_optimization_agent(query: str) -> str:
    """
    Analyze product pricing and suggest optimal deals.
    Directly calls semantic_product_search and returns JSON products.
    
    Args:
        query: Pricing-related question or request
    
    Returns:
        JSON array of products
    """
    import json
    import re
    try:
        # Extract price constraint from query
        max_price = None
        price_matches = re.findall(r'under \$?(\d+)', query.lower())
        if price_matches:
            max_price = float(max([int(p) for p in price_matches]))
        
        # Direct tool call with price filter
        result = semantic_product_search(
            query=query,
            max_price=max_price,
            min_rating=0.0,
            limit=5
        )
        result_dict = json.loads(result)
        
        # Extract products array - semantic_product_search returns 'products' key
        products = result_dict.get('products', result_dict.get('matches', []))
        
        # Ensure products have required fields
        formatted_products = []
        for p in products:
            formatted_products.append({
                "productId": p.get("productId"),
                "product_description": p.get("product_description"),
                "price": p.get("price", 0),
                "stars": p.get("stars", 0),
                "reviews": p.get("reviews", 0),
                "category_name": p.get("category_name", ""),
                "quantity": p.get("quantity", 0),
                "imgUrl": p.get("imgUrl", ""),
                "product_url": p.get("product_url", "")
            })
        
        # Return formatted string with JSON block for chat.py parsing
        return f"```json\n{json.dumps(formatted_products, indent=2)}\n```"
    except Exception as e:
        return json.dumps({"error": str(e)})