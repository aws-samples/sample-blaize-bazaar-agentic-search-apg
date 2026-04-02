"""
Customer Support Agent - Handles return policies, troubleshooting, and general support
"""
import json
import logging
import re
from strands import Agent, tool
from strands.models import BedrockModel
from config import settings
from services.agent_tools import get_return_policy, search_products

logger = logging.getLogger(__name__)


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
def customer_support_agent(query: str) -> str:
    """
    Handle customer support queries including return policies and troubleshooting.

    Args:
        query: Customer support question or request

    Returns:
        Agent response with support information and optional product data
    """
    try:
        tool_results = []
        tools = [get_return_policy, search_products]

        # Optional Exa MCP integration for web-based troubleshooting.
        # Requires EXA_API_KEY env var and network egress (not provisioned
        # by default workshop bootstrap scripts).
        exa_client = None
        try:
            import os
            from strands.tools.mcp import MCPClient
            from mcp import StdioServerParameters

            exa_api_key = os.environ.get("EXA_API_KEY")
            if exa_api_key:
                exa_client = MCPClient(
                    lambda: StdioServerParameters(
                        command="npx",
                        args=["-y", "exa-mcp-server"],
                        env={"EXA_API_KEY": exa_api_key},
                    )
                )
        except Exception:
            logger.warning("Exa MCP tools unavailable — continuing with local tools only")

        system_prompt = (
            "You are Blaize Bazaar's Customer Support Specialist. "
            "<tools>"
            "- get_return_policy: Use for questions about returns, refunds, warranties, or return windows. "
            "Pass the product category name (e.g. 'Electronics', 'Shoes'). "
            "- search_products: Use for product-related support queries when the customer needs help "
            "finding or identifying a product. "
            "</tools>"
            "<chaining>"
            "If the customer mentions a specific product name or ID instead of a category, first use "
            "search_products to identify the product's category_name, then call get_return_policy with "
            "that category. "
            "</chaining>"
        )

        if exa_client:
            system_prompt += (
                "Use Exa web search tools for troubleshooting questions that cannot be answered "
                "using the local tools alone. "
            )

        system_prompt += (
            "<output-rules>"
            "Write 1-2 short sentences as a conversational intro. Products render as visual cards "
            "automatically — do not list them in text. Never use markdown tables, numbered lists, "
            "headers, or emojis. Never ask follow-up questions."
            "</output-rules>"
        )

        if exa_client:
            with exa_client:
                exa_tools = exa_client.list_tools_sync()
                agent = Agent(
                    model=BedrockModel(
                        model_id=settings.BEDROCK_CHAT_MODEL,
                        max_tokens=4096,
                        temperature=0.2,
                    ),
                    system_prompt=system_prompt,
                    tools=tools + exa_tools,
                )

                # Capture inner tool results for _ensure_products_in_output
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
        else:
            agent = Agent(
                model=BedrockModel(
                    model_id=settings.BEDROCK_CHAT_MODEL,
                    max_tokens=4096,
                    temperature=0.2,
                ),
                system_prompt=system_prompt,
                tools=tools,
            )

            # Capture inner tool results for _ensure_products_in_output
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
        return json.dumps({"error": f"Support agent error: {str(e)}"})
