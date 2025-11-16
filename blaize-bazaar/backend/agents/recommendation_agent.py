"""
Product Recommendation Agent - Suggests products based on user preferences
"""
from strands import Agent, tool
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.
    Directly calls semantic_product_search and returns JSON products.
    
    Args:
        query: User's product inquiry with preferences
    
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
