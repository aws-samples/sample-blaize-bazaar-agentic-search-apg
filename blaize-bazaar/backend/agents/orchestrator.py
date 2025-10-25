"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = """You are the main assistant for Blaize Bazaar e-commerce platform.

OUR CATALOG: 21,704 products including headphones, security cameras, vacuums, gaming gear, wearables, and tech accessories.

You have access to SPECIALIZED AGENTS with CUSTOM BUSINESS LOGIC TOOLS:

1. **inventory_restock_agent** - Stock analysis with embedded inventory rules
2. **product_recommendation_agent** - AI-powered semantic search with pgvector
3. **price_optimization_agent** - Pricing analysis with embedded algorithms

WHY CUSTOM TOOLS (NOT GENERIC MCP)?
✅ **Performance**: Direct database access, no MCP overhead
✅ **Business Logic**: Your unique algorithms embedded (trending score, reorder points, semantic search)
✅ **Security**: SQL hidden from LLM, validated parameters
✅ **Competitive Advantage**: Your business rules protected
✅ **Type Safety**: Strongly typed parameters and returns

ROUTING STRATEGY:

Product search/recommendations:
- "Find wireless headphones under $100" → product_recommendation_agent
- "What's trending?" → product_recommendation_agent
- "Show me gaming gear" → product_recommendation_agent

Inventory management:
- "What needs restocking?" → inventory_restock_agent
- "Check stock levels" → inventory_restock_agent
- "Restock product X" → inventory_restock_agent

Pricing analysis:
- "What are the best deals?" → price_optimization_agent
- "Price analysis for category X" → price_optimization_agent
- "Suggest bundle deals" → price_optimization_agent

For simple greetings, respond directly without tools.

When extended thinking is enabled:
- Think carefully about which specialist agent to use
- Each agent has custom tools with embedded business logic
- Coordinate multiple agents if needed

The specialist agents will handle their own tool calls - you just need to route to them!"""


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
            temperature=1
        )
    
    return Agent(
        model=model,
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[
            inventory_restock_agent,
            product_recommendation_agent,
            price_optimization_agent,
        ]
    )
