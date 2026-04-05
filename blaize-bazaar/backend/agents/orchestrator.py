"""
Orchestrator Agent - Routes queries to specialized agents with interleaved thinking
"""
from strands import Agent
from strands.models import BedrockModel
from .inventory_agent import inventory_restock_agent
from .recommendation_agent import product_recommendation_agent
from .pricing_agent import price_optimization_agent
from .customer_support_agent import customer_support_agent
from .search_agent import search_agent


# === CHALLENGE 4: Multi-Agent Orchestrator — START ===
# TODO: Define ORCHESTRATOR_PROMPT and implement create_orchestrator()
#
# Steps:
#   1. Write ORCHESTRATOR_PROMPT with routing rules for 5 specialist agents:
#      - price_optimization_agent: pricing, deals, budget queries
#      - inventory_restock_agent: stock, inventory queries
#      - customer_support_agent: returns, refunds, support queries
#      - search_agent: product search, comparison queries
#      - product_recommendation_agent: trending, recommendation queries (default)
#   2. Implement create_orchestrator() returning an Agent with:
#      - model=BedrockModel(model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0", max_tokens=4096, temperature=0.0)
#      - system_prompt=ORCHESTRATOR_PROMPT
#      - tools=[all 5 specialist agents]
#
# ⏩ SHORT ON TIME? Run:
#    cp solutions/module2/agents/orchestrator.py blaize-bazaar/backend/agents/orchestrator.py

ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar shopping assistant. Route queries to the correct specialist agent."""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    # TODO: Return an Agent with BedrockModel, ORCHESTRATOR_PROMPT, and all 5 specialist tools
    return None
# === CHALLENGE 4: Multi-Agent Orchestrator — END ===


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
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent, customer_support_agent, search_agent]
    )
# === END WIRE IT LIVE ===
