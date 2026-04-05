"""
Product Recommendation Agent - Suggests products based on user preferences
"""
import json
import re

from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import get_trending_products, get_product_by_category


def _ensure_products_in_output(text: str, tool_results: list) -> str:
    """If the LLM output lacks a JSON products block, extract from tool results and append."""
    if re.search(r'```json\s*\[', text):
        return text

    all_products = []
    for result_str in tool_results:
        try:
            data = json.loads(result_str)
            if isinstance(data, dict) and "products" in data:
                all_products.extend(data["products"])
            elif isinstance(data, list):
                all_products.extend(data)
        except (json.JSONDecodeError, TypeError):
            pass

    if all_products:
        text += f"\n\n```json\n{json.dumps(all_products)}\n```"
    return text


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.

    Args:
        query: User's product inquiry

    Returns:
        Agent response with product recommendations
    """
    # === CHALLENGE 3: Specialist Agent — START ===
    # TODO: Implement the recommendation agent following the inventory_agent.py pattern
    #
    # Steps:
    #   1. Create an Agent with BedrockModel(model_id=settings.BEDROCK_CHAT_MODEL, max_tokens=4096, temperature=0.2)
    #   2. Write a system_prompt for a Product Recommendation Specialist
    #   3. Set tools=[get_trending_products, get_product_by_category]
    #   4. Invoke: result = agent(query)
    #   5. Return: str(result)
    #   6. Wrap in try/except, return error JSON on failure
    #
    # ⏩ SHORT ON TIME? Run:
    #    cp solutions/module2/agents/recommendation_agent.py blaize-bazaar/backend/agents/recommendation_agent.py
    return json.dumps({"error": "Recommendation agent not implemented yet — complete Challenge 3"})
    # === CHALLENGE 3: Specialist Agent — END ===
