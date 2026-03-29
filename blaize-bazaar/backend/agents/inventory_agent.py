"""
Inventory Restock Agent - Monitors stock levels and suggests restocking
"""
import json
from strands import Agent, tool
from strands.models import BedrockModel
from services.agent_tools import get_inventory_health, restock_product, get_low_stock_products

# Reuse model + agent across invocations to avoid per-call overhead
_inventory_model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-4-6",
    max_tokens=4096,
)

_inventory_agent = Agent(
    model=_inventory_model,
    system_prompt=(
        "You are Blaize Bazaar's Inventory Specialist. "
        "Monitor stock levels, flag critical alerts, and recommend restocking actions. "
        "Provide clear, data-driven responses with specific product details."
    ),
    tools=[get_inventory_health, restock_product, get_low_stock_products],
)


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
        result = _inventory_agent(query)
        return str(result)
    except Exception as e:
        return json.dumps({"error": f"Inventory agent error: {str(e)}"})
