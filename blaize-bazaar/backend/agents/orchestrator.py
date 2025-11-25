"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar orchestrator. Route to the right agent and return its output.

AGENTS:
- price_optimization_agent: Best deals, pricing queries
- inventory_restock_agent: Stock levels, restocking
- product_recommendation_agent: General product search

CRITICAL: After calling an agent, return its EXACT output. If the agent returns a ```json block, you MUST include it in your response unchanged."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=16384,
            temperature=0.0
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
