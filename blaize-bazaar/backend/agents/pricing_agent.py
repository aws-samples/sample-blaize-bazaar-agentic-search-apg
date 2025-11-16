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
    try:
        # Direct tool call - bypass LLM text generation
        result = semantic_product_search(query=query, limit=5)
        result_dict = json.loads(result)
        
        # Extract products array
        products = result_dict.get('products', [])
        
        # Return as JSON array
        return json.dumps(products)
    except Exception as e:
        return json.dumps({"error": str(e)})
