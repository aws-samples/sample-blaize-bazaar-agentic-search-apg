"""
Product Recommendation Agent - Suggests products based on user preferences
"""
import json
import re

from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import (
    search_products,
    trending_products,
    compare_products,
    browse_category,
)
from skills import inject_skills
from services.persona_context import inject_persona_preamble
from storefront_copy import RECOMMENDATION_SYSTEM_PROMPT


def _ensure_products_in_output(text: str, tool_results: list) -> str:
    """If the LLM output lacks a JSON products block, extract from tool results and append."""
    if re.search(r'```json\s*\[', text):
        return text

    all_products = []
    for result_str in tool_results:
        try:
            data = json.loads(result_str)
            if isinstance(data, dict) and "products" in data:
                all_products.extend(data["products"])
            elif isinstance(data, list):
                all_products.extend(data)
        except (json.JSONDecodeError, TypeError):
            pass

    if all_products:
        text += f"\n\n```json\n{json.dumps(all_products)}\n```"
    return text


@tool
def recommendation(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.

    Args:
        query: User's product inquiry

    Returns:
        Agent response with product recommendations

    ⏩ SHORT ON TIME? Run:
       cp solutions/module2/agents/recommendation_agent.py blaize-bazaar/backend/agents/recommendation_agent.py
    """
    try:
        tool_results = []

        # === CHALLENGE 3: START ===
        # inject_skills() reads the current turn's loaded skills from the
        # ContextVar set by chat.chat_stream(). When zero skills are loaded
        # (the common case), this is a no-op and returns the base prompt
        # unchanged. Agent-agnostic — see backend/skills/context.py.
        agent = Agent(
            model=BedrockModel(
                model_id=settings.BEDROCK_CHAT_MODEL,
                max_tokens=4096,
                temperature=0.2,
            ),
            system_prompt=inject_persona_preamble(
                inject_skills(RECOMMENDATION_SYSTEM_PROMPT)
            ),
            tools=[
                search_products,
                trending_products,
                compare_products,
                browse_category,
            ],
        )
        # === CHALLENGE 3: END ===

        # Capture inner tool results so we can guarantee product data in output
        try:
            from strands.hooks.events import AfterToolCallEvent

            def capture_result(event: AfterToolCallEvent):
                if hasattr(event, 'result') and event.result:
                    raw = event.result
                    if isinstance(raw, dict) and 'content' in raw:
                        for block in raw.get('content', []):
                            if isinstance(block, dict) and 'text' in block:
                                tool_results.append(block['text'])

            agent.add_hook(capture_result)
        except ImportError:
            pass

        result = agent(query)
        text = str(result)
        return _ensure_products_in_output(text, tool_results)
    except Exception as e:
        return json.dumps({"error": f"Recommendation agent error: {str(e)}"})
