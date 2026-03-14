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
6. When the user mentions a price limit (e.g. 'under $50', 'below $200'), ALWAYS pass max_price to the agent tool.

GOOD: "Here are the best workout headphones:"
BAD: "Based on your interest in headphones, here are personalized recommendations!"
BAD: "I've routed your query to the recommendation agent."
"""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
            max_tokens=4096,
            temperature=0.0
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent]
    )


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
