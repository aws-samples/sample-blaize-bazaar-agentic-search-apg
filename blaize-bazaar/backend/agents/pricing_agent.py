"""
Price Optimization Agent - Analyzes pricing and suggests deals
"""
import json
from strands import Agent, tool
from strands.models import BedrockModel
from services.agent_tools import get_price_analysis, get_product_by_category, semantic_product_search

# Reuse model + agent across invocations to avoid per-call overhead
_pricing_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-6",
    max_tokens=4096,
)

_pricing_agent = Agent(
    model=_pricing_model,
    system_prompt=(
        "You are Blaize Bazaar's Pricing Specialist. "
        "Analyze pricing trends, find best deals, and help users "
        "find products within their budget. Use semantic search "
        "for price-filtered queries and category analysis for comparisons."
    ),
    tools=[get_price_analysis, get_product_by_category, semantic_product_search],
)


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
        result = _pricing_agent(query)
        return str(result)
    except Exception as e:
        return json.dumps({"error": f"Pricing agent error: {str(e)}"})
