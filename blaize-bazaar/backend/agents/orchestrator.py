"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar shopping assistant. You have specialist agents to help find products.

AGENTS:
- price_optimization_agent: Best deals, pricing queries
- inventory_restock_agent: Stock levels, restocking
- product_recommendation_agent: General product search

RULES:
1. Call the right agent, then return its output directly.
2. Write 1 short sentence before the products — answer the user's question, don't describe what you did.
3. NEVER say "Based on your interest in..." or "I routed your query to..." or mention agent names.
4. NEVER apologize. If results are limited, show what's available.
5. If the agent returns a ```json block, include it UNCHANGED in your response.

GOOD: "Here are the best workout headphones:"
BAD: "Based on your interest in headphones, here are personalized recommendations!"
BAD: "I've routed your query to the recommendation agent."
"""


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
