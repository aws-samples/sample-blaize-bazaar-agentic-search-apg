"""
Product Recommendation Agent - Suggests products based on user preferences

TODO (Module 3b): Implement the recommendation agent.
"""
from strands import Agent, tool
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    TODO (Module 3b): Build the Product Recommendation Agent.

    This specialist agent handles product discovery queries like
    "find me running shoes under $80" or "what's trending in electronics?"

    Follow the pattern from inventory_agent.py and pricing_agent.py:
        1. Create an Agent() with:
           - model: BedrockModel with "global.anthropic.claude-sonnet-4-6"
           - system_prompt: Describe a recommendation specialist who helps
             users discover products using semantic search and trending data
           - tools: [semantic_product_search, get_trending_products, get_product_by_category]
        2. Invoke the agent with the query: result = agent(query)
        3. Return str(result)
        4. Wrap in try/except

    Hints:
        - Import BedrockModel: from strands.models import BedrockModel
        - Keep the system prompt focused: "You are Blaize Bazaar's Product
          Recommendation Specialist. Help users discover products..."
        - The agent will automatically choose which tool to call based on the query

    Args:
        query: User's product inquiry

    Returns:
        Agent response as string (typically includes ```json product blocks)

    ⏩ SHORT ON TIME? Run:
       cp solutions/module3b/agents/recommendation_agent.py blaize-bazaar/backend/agents/recommendation_agent.py
    """
    # TODO: Your implementation here (~10 lines)
    import json
    return json.dumps({"error": "Recommendation agent not implemented yet — complete Module 3b TODO"})
