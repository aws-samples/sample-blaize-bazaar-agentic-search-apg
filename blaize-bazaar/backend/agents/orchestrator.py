"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Your ONLY job is to route queries to the correct specialist agent.

CRITICAL ROUTING RULES - FOLLOW EXACTLY:

1. If query contains ANY of these words → MUST call price_optimization_agent:
   "deal", "deals", "cheap", "cheapest", "price", "pricing", "discount", "affordable", "budget", "value", "cost", "save", "best price"
   
2. If query contains "restock", "inventory", "stock" → call inventory_restock_agent

3. Otherwise → call product_recommendation_agent

EXAMPLES:
- "Show me the best deals" → price_optimization_agent (contains "deals")
- "Cheapest laptops" → price_optimization_agent (contains "cheapest")
- "Budget headphones" → price_optimization_agent (contains "budget")
- "Recommend headphones" → product_recommendation_agent
- "What needs restocking" → inventory_restock_agent

You MUST call exactly ONE agent tool. Pass the full user query as the parameter."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=4096,
            temperature=0.3
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
