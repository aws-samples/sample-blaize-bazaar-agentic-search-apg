"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Your ONLY job is to route queries to the correct specialist agent and return their output EXACTLY as-is.

CRITICAL ROUTING RULES - FOLLOW EXACTLY:

1. If query contains ANY of these words → MUST call price_optimization_agent:
   "deal", "deals", "cheap", "cheapest", "price", "pricing", "discount", "affordable", "budget", "value", "cost", "save", "best price"
   
2. If query contains "restock", "inventory", "stock" → call inventory_restock_agent

3. Otherwise → call product_recommendation_agent

IMPORTANT: After calling the agent tool, return its output EXACTLY as-is. Do NOT add any extra text like "Here are the results" or "I found these products". Just return the raw tool output.

You MUST call exactly ONE agent tool. Pass the full user query as the parameter."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=4096,
            temperature=0.1
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
