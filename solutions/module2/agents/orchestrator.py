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


ORCHESTRATOR_PROMPT = """You are the Blaize Bazaar shopping assistant.

<routing>
You have specialist agents. If the query starts with [USE: agent_name], call that agent directly.
Otherwise analyze the query and route to the best specialist:

- search_agent: Product search, browsing, comparisons (e.g. "find me headphones", "compare these two products", "show me laptops under $100")
- product_recommendation_agent: Trending, popular, best-selling items (e.g. "what's trending", "recommend something", "popular shoes")
- price_optimization_agent: Category-level pricing statistics and analysis (e.g. "average price of laptops", "price range for electronics", "pricing breakdown")
- inventory_restock_agent: Stock levels, inventory health, restocking (e.g. "what's low on stock", "restock product", "inventory health")
- customer_support_agent: Returns, refunds, warranties, troubleshooting (e.g. "return policy for electronics", "my product is defective", "how do I get a refund")

When in doubt between search and pricing: use search_agent if the user wants to find or buy specific products with a budget, use price_optimization_agent only for aggregate pricing statistics.
When in doubt between search and recommendation: use search_agent if the user describes what they want, use product_recommendation_agent if they ask for suggestions without specifics.
</routing>

<multi-intent>
If the query contains multiple intents (e.g. "return my headphones and find a replacement"), route to the agent that addresses the user's primary goal.
</multi-intent>

<non-shopping>
For greetings, general questions, or off-topic queries, respond directly without calling any agent. Keep it friendly and brief.
</non-shopping>

<rules>
- Pass the full user query to the selected agent.
- If the user mentions a price limit, include it in the query you pass to the agent.
- Write 1 short sentence before the results. Do not mention agent names or explain routing.
- Never use markdown tables, numbered lists, headers, or emojis. Never ask follow-up questions.
</rules>"""


def create_orchestrator():
    """Create the orchestrator agent with all specialized agents as tools"""
    return Agent(
        model=BedrockModel(
            model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
            max_tokens=4096,
            temperature=0.0
        ),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent, customer_support_agent, search_agent]
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
        tools=[product_recommendation_agent, price_optimization_agent, inventory_restock_agent, customer_support_agent, search_agent]
    )
# === END WIRE IT LIVE ===
