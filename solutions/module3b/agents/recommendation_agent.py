"""
Product Recommendation Agent - Suggests products based on user preferences
"""
from strands import Agent, tool
from strands.models import BedrockModel
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.

    Args:
        query: User's product inquiry

    Returns:
        Agent response with product recommendations
    """
    try:
        agent = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-sonnet-4-6",
                max_tokens=4096,
            ),
            system_prompt=(
                "You are Blaize Bazaar's Product Recommendation Specialist. "
                "Help users discover products using semantic search for specific queries "
                "and trending data for general discovery. Always consider price, ratings, "
                "and availability when making recommendations."
            ),
            tools=[semantic_product_search, get_trending_products, get_product_by_category],
        )
        result = agent(query)
        return str(result)
    except Exception as e:
        import json
        return json.dumps({"error": f"Recommendation agent error: {str(e)}"})
