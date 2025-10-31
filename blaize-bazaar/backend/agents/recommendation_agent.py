"""
Product Recommendation Agent - Suggests products based on user preferences
"""
from strands import Agent, tool
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.
    Uses custom business logic tools with embedded AI-powered search.
    
    Args:
        query: User's product inquiry with preferences
    
    Returns:
        Personalized product recommendations with reasoning
    """
    try:
        agent = Agent(
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            system_prompt="""You are the product recommendation specialist. Call semantic_product_search() with the query, then return results as JSON.

Format:
```json
[{"productId":"B001","name":"Product Name","price":99.0,"stars":4.5,"reviews":100,"category":"Category","quantity":10,"image_url":"url"}]
```""",
            tools=[semantic_product_search, get_product_by_category, get_trending_products]
        )
        
        response = agent(query)
        return str(response)
    except Exception as e:
        return f"Error in recommendation agent: {str(e)}"
