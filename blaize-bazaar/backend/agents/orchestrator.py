"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are Blaize Bazaar orchestrator. Route queries to specialist agents.

For product searches: Call product_recommendation_agent(query="user query")
For pricing/deals: Call price_optimization_agent(query="user query")
For inventory: Call inventory_restock_agent(query="user query")

Always call the appropriate agent tool."""


def create_orchestrator(enable_interleaved_thinking: bool = False):
    """Create the orchestrator agent with all specialized agents as tools
    
    Args:
        enable_interleaved_thinking: Enable Claude Sonnet 4's extended thinking (default: False)
    
    Returns:
        Agent configured with or without interleaved thinking
    """
    if enable_interleaved_thinking:
        # Claude 4 with interleaved thinking
        model = BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=4096,
            temperature=1,  # Required when thinking is enabled
            additional_request_fields={
                "anthropic_beta": ["interleaved-thinking-2025-05-14"],
                "reasoning_config": {
                    "type": "enabled",
                    "budget_tokens": 3000
                }
            }
        )
    else:
        # Standard Claude 4 without thinking
        model = BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            max_tokens=4096,
            temperature=0.7  # Lower temperature for more consistent tool use
        )
    
    return Agent(
        model=model,
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
