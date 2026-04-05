"""
Price Optimization Agent - Analyzes pricing and suggests deals
"""
import json
import re
from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import get_price_analysis, get_product_by_category, search_products


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
def price_optimization_agent(query: str) -> str:
    """
    Analyze product pricing and suggest optimal deals.
    Finds best-value products, compares prices across categories,
    and helps users find products within budget constraints.

    Args:
        query: Pricing-related question or request

    Returns:
        JSON array of products with pricing analysis
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
                "You are Blaize Bazaar's Pricing Specialist. "
                "<tools>"
                "- get_price_analysis: Use for category-level pricing statistics (average, min, max, distribution). "
                "- search_products: Use when the user describes specific products with price constraints "
                "(e.g. 'laptops under $500'). "
                "- get_product_by_category: Use to browse products in a category when the user wants to see "
                "what is available at various price points. "
                "</tools>"
                "<output-rules>"
                "ALWAYS call a tool first. Do NOT write any text before calling a tool. "
                "Call at most 2 tools per query. "
                "After receiving tool results, write 1-2 short sentences as a conversational intro. "
                "Products render as visual cards automatically — do not list them in text. "
                "If the tool returns zero products or an error, say what went wrong briefly "
                "(e.g. 'No pricing data available for that category right now.'). "
                "Never use markdown tables, numbered lists, headers, or emojis. Never ask follow-up questions."
                "</output-rules>"
            ),
            tools=[get_price_analysis, get_product_by_category, search_products],
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
        return json.dumps({"error": f"Pricing agent error: {str(e)}"})
