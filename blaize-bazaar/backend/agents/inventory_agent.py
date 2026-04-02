"""
Inventory Restock Agent - Monitors stock levels and suggests restocking
"""
import json
import re
from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import get_inventory_health, restock_product, get_low_stock_products


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
        tool_results = []

        agent = Agent(
            model=BedrockModel(
                model_id=settings.BEDROCK_CHAT_MODEL,
                max_tokens=4096,
                temperature=0.2,
            ),
            system_prompt=(
                "You are Blaize Bazaar's Inventory Specialist. "
                "<tools>"
                "- get_inventory_health: Use for overall stock statistics and warehouse health overview. "
                "- get_low_stock_products: Use to find items that need restocking, prioritized by demand. "
                "- restock_product: Use when the user provides a specific product ID and quantity to restock. "
                "If the user mentions a product by name instead of ID, inform them you need the product ID. "
                "</tools>"
                "<output-rules>"
                "Write 1-2 short sentences summarizing stock status. Products render as visual cards "
                "automatically — do not list them in text. Never use markdown tables, numbered lists, "
                "headers, or emojis. Never ask follow-up questions."
                "</output-rules>"
            ),
            tools=[get_inventory_health, restock_product, get_low_stock_products],
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
        return json.dumps({"error": f"Inventory agent error: {str(e)}"})
