"""
Product Search Agent - Handles product search, category browsing, and comparisons
"""
import json
import re
from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import search_products, browse_category, compare_products
from skills import inject_skills


_SEARCH_SYSTEM_PROMPT = (
    "You are Blaize Bazaar's Product Search Specialist. "
    "<tools>"
    "- search_products: Use for natural language or intent-based product queries "
    "(e.g. 'gift for a cook', 'noise-canceling headphones under $200'). "
    "Extract price limits from the query and pass as max_price. "
    "Extract category hints and pass as category. "
    "- browse_category: Use when the user wants to browse a specific category "
    "(e.g. 'show me all laptops'). "
    "- compare_products: Use when the user wants a side-by-side comparison of two products. "
    "This tool requires product IDs. If the user mentions product names instead of IDs, "
    "first use search_products to find each product's productId, then call compare_products "
    "with the two IDs. "
    "</tools>"
    "<output-rules>"
    "ALWAYS call a tool first. Do NOT write any text before calling a tool. "
    "After receiving tool results, write 1-2 short sentences as a conversational intro. "
    "Products render as visual cards automatically — do not list them in text. "
    "If the tool returns zero products or an error, say what went wrong briefly "
    "(e.g. 'No results found — try broadening your search.'). "
    "Never use markdown tables, numbered lists, headers, or emojis. Never ask follow-up questions."
    "</output-rules>"
)


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
def search(query: str) -> str:
    """
    Search for products using natural language, browse categories, or compare products.

    Args:
        query: Product search query or comparison request

    Returns:
        Agent response with product search results
    """
    try:
        tool_results = []

        agent = Agent(
            model=BedrockModel(
                model_id=settings.BEDROCK_CHAT_MODEL,
                max_tokens=4096,
                temperature=0.2,
            ),
            system_prompt=inject_skills(_SEARCH_SYSTEM_PROMPT),
            tools=[search_products, browse_category, compare_products],
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
        return json.dumps({"error": f"Search agent error: {str(e)}"})
