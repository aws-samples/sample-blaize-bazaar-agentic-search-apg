"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent


ORCHESTRATOR_PROMPT = ""
# TODO (Module 3b): Write the orchestrator system prompt.
#
# The prompt should include:
# 1. Role: "You are the Blaize Bazaar shopping assistant"
# 2. List of available agents and when to route to each:
#    - price_optimization_agent: Best deals, pricing queries
#    - inventory_restock_agent: Stock levels, restocking
#    - product_recommendation_agent: General product search
# 3. Rules:
#    - Call the right agent, then return its output directly
#    - Write 1 short sentence before the products
#    - NEVER mention agent names to the user
#    - When user mentions a price limit, pass max_price to the agent
#
# See inventory_agent.py and pricing_agent.py for examples of agent prompts.
#
# ⏩ SHORT ON TIME? Run:
#    cp solutions/module3b/agents/orchestrator.py blaize-bazaar/backend/agents/orchestrator.py


def create_orchestrator():
    """
    TODO (Module 3b): Create the orchestrator agent that routes to specialists.

    Steps:
        1. Create an Agent() with:
           - model: BedrockModel(model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                                 max_tokens=4096, temperature=0.0)
           - system_prompt: ORCHESTRATOR_PROMPT (fill it in above)
           - tools: [product_recommendation_agent, price_optimization_agent,
                      inventory_restock_agent]
        2. Return the agent

    The orchestrator's "tools" are the specialist agents themselves (wrapped
    with @tool in their respective files). It decides which specialist to
    invoke based on the user's query.

    Returns:
        Strands Agent instance
    """
    # TODO: Your implementation here (~8 lines)
    return None


# === WIRE IT LIVE (Lab 3) ===
GUARDRAILS_PROMPT_SUFFIX = """

GUARDRAILS (ACTIVE):
- Do NOT recommend products related to weapons, alcohol, or tobacco
- Do NOT provide medical, legal, or financial advice
- Flag inappropriate requests politely
- Keep all responses family-friendly
- If a user asks for restricted content, respond: "I can't help with that, but I'd love to help you find something else!"
"""


def create_guarded_orchestrator():
    """Create a guardrails-aware orchestrator that adds content moderation
    rules to the system prompt and can filter responses through Bedrock Guardrails."""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
            max_tokens=4096,
            temperature=0.0
        ),
        system_prompt=ORCHESTRATOR_PROMPT + GUARDRAILS_PROMPT_SUFFIX,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )
# === END WIRE IT LIVE ===
