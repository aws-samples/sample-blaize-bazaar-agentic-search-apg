"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Route queries to specialist agents and return their output.

ROUTING RULES:
1. If query mentions: deal, cheap, price, budget, affordable, cost → call price_optimization_agent
2. If query mentions: restock, inventory, stock → call inventory_restock_agent  
3. Otherwise → call product_recommendation_agent

IMPORTANT: After calling the tool, you MUST output the tool's complete response. Copy the entire tool output including all text, JSON blocks, and formatting. Do not summarize or modify it."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=8192,
            temperature=0.0
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
