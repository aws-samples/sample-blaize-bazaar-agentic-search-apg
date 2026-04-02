"""
Price Optimization Agent - Analyzes pricing and suggests deals
"""
import json
import re
from strands import Agent, tool
from strands.models import BedrockModel
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
                model_id="global.anthropic.claude-sonnet-4-6",
                max_tokens=4096,
                temperature=0.2,
            ),
            system_prompt=(
                "You are Blaize Bazaar's Pricing Specialist. "
                "Use get_price_analysis for category-level statistics. "
                "Use search_products when the user describes products with price constraints. "
                "Call at most 2 tools per query. "
                "Write 1-2 short sentences as a conversational intro. Products render as visual cards "
                "automatically — do not list them in text. Never use markdown tables, numbered lists, "
                "headers, or emojis. Never ask follow-up questions."
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
