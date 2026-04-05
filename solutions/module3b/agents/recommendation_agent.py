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
    try:
        tool_results = []

        agent = Agent(
            model=BedrockModel(
                model_id=settings.BEDROCK_CHAT_MODEL,
                max_tokens=4096,
                temperature=0.2,
            ),
            system_prompt=(
                "You are Blaize Bazaar's Product Recommendation Specialist. "
                "<tools>"
                "- get_trending_products: Use when the user asks about trending, popular, or best-selling items. "
                "Pass the category parameter if they mention a specific category (e.g. 'trending electronics', "
                "'popular shoes'). "
                "- get_product_by_category: Use for browsing a specific product category to surface curated picks. "
                "</tools>"
                "<output-rules>"
                "ALWAYS call a tool first. Do NOT write any text before calling a tool. "
                "After receiving tool results, write 1-2 short sentences as a conversational intro. "
                "Products render as visual cards automatically — do not list them in text. "
                "If the tool returns zero products or an error, say what went wrong briefly "
                "(e.g. 'No trending products found in that category right now.'). "
                "Never use markdown tables, numbered lists, headers, or emojis. Never ask follow-up questions."
                "</output-rules>"
            ),
            tools=[get_trending_products, get_product_by_category],
        )

        # Capture inner tool results so we can guarantee product data in output
        try:
            from strands.hooks.events import AfterToolCallEvent

            def capture_result(event: AfterToolCallEvent):
                if hasattr(event, 'result') and event.result:
                    raw = event.result
                    if isinstance(raw, dict) and 'content' in raw:
                        for block in raw.get('content', []):
                            if isinstance(block, dict) and 'text' in block:
                                tool_results.append(block['text'])

            agent.add_hook(capture_result)
        except ImportError:
            pass

        result = agent(query)
        text = str(result)
        return _ensure_products_in_output(text, tool_results)
    except Exception as e:
        return json.dumps({"error": f"Recommendation agent error: {str(e)}"})
