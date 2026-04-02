"""
AgentCore Gateway — MCP Tool Discovery via Bedrock AgentCore Gateway.

Wire It Live: Participants implement create_gateway_orchestrator() using
Strands SDK's MCPClient with streamable HTTP transport to discover tools
dynamically from an MCP server instead of hard-coding tool imports.
"""
import logging
from typing import Optional, List, Dict, Any

from config import settings

logger = logging.getLogger(__name__)


# === TODO (Module 4) ===
def create_gateway_orchestrator():
    """
    TODO (Module 4): Create an orchestrator that discovers tools via MCP Gateway.

    Instead of importing tool functions directly, this connects to an
    AgentCore Gateway MCP server which exposes tools as MCP resources.
    The agent dynamically discovers available tools at runtime.

    Steps:
        1. Check if settings.AGENTCORE_GATEWAY_URL is set (return None if not)
        2. Import required modules:
           - from strands import Agent
           - from strands.models import BedrockModel
           - from strands.tools.mcp.mcp_client import MCPClient
           - from mcp.client.streamable_http import streamablehttp_client
        3. Create a transport function:
           def _create_transport():
               return streamablehttp_client(settings.AGENTCORE_GATEWAY_URL,
                                            headers={"x-api-key": settings.AGENTCORE_GATEWAY_API_KEY})
        4. Create mcp_client = MCPClient(_create_transport)
        5. Create orchestrator = Agent(
               model=BedrockModel(model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                                  max_tokens=4096, temperature=0.0),
               system_prompt="You are the Blaize Bazaar shopping assistant. "
                   "Use the available tools to help users find products, "
                   "check prices, and get recommendations.",
               tools=[mcp_client],
           )
        6. Return orchestrator
        7. Handle ImportError and general exceptions

    Returns:
        Strands Agent with MCP-discovered tools, or None if not configured

    ⏩ SHORT ON TIME? Run:
       cp solutions/module4/services/agentcore_gateway.py blaize-bazaar/backend/services/agentcore_gateway.py
    """
    if not settings.AGENTCORE_GATEWAY_URL:
        logger.info("AGENTCORE_GATEWAY_URL not set — gateway disabled")
        return None

    try:
        from strands import Agent
        from strands.models import BedrockModel
        from strands.tools.mcp.mcp_client import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        def _create_transport():
            return streamablehttp_client(
                settings.AGENTCORE_GATEWAY_URL,
                headers={"x-api-key": settings.AGENTCORE_GATEWAY_API_KEY},
            )

        mcp_client = MCPClient(_create_transport)

        orchestrator = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                max_tokens=4096,
                temperature=0.0,
            ),
            system_prompt=(
                "You are the Blaize Bazaar shopping assistant. "
                "Use the available tools to find products, check prices, and manage inventory. "
                "Write 1-2 sentences of context before results. Do not mention tool names or routing."
            ),
            tools=[mcp_client],
        )

        logger.info(f"✅ Gateway orchestrator created (url={settings.AGENTCORE_GATEWAY_URL})")
        return orchestrator

    except ImportError as e:
        logger.warning(f"MCP dependencies not installed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Gateway orchestrator setup failed: {e}")
        return None
# === END TODO ===


def create_gateway_orchestrator_with_semantic_search():
    """
    Create an orchestrator that discovers tools via Gateway semantic search.

    Instead of loading all tools into the agent's context (list_tools),
    this uses the x_amz_bedrock_agentcore_search tool to find relevant
    tools by natural language description at query time. This scales to
    hundreds or thousands of tools without bloating the agent's prompt.

    Returns:
        Strands Agent with semantic tool discovery, or None if not configured
    """
    if not settings.AGENTCORE_GATEWAY_URL:
        logger.info("AGENTCORE_GATEWAY_URL not set — semantic search disabled")
        return None

    try:
        from strands import Agent
        from strands.models import BedrockModel
        from strands.tools.mcp.mcp_client import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        def _create_transport():
            return streamablehttp_client(
                settings.AGENTCORE_GATEWAY_URL,
                headers={"x-api-key": settings.AGENTCORE_GATEWAY_API_KEY},
            )

        mcp_client = MCPClient(_create_transport)

        # The agent uses x_amz_bedrock_agentcore_search to find tools
        # by description rather than loading all tools into its prompt.
        # This is the production pattern for large tool catalogs.
        orchestrator = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                max_tokens=4096,
                temperature=0.0,
            ),
            system_prompt=(
                "You are the Blaize Bazaar shopping assistant. "
                "Use the x_amz_bedrock_agentcore_search tool to find "
                "relevant tools for the user's query, then invoke them. "
                "For product searches, search for 'product search' tools. "
                "For inventory questions, search for 'inventory' tools. "
                "For pricing, search for 'pricing' tools. "
                "For return policies and support, search for 'return policy' or 'customer support' tools. "
                "For category browsing, search for 'category' tools. "
                "For product comparisons, search for 'compare products' tools."
            ),
            tools=[mcp_client],
        )

        logger.info(f"✅ Gateway orchestrator with semantic search created")
        return orchestrator

    except ImportError as e:
        logger.warning(f"MCP dependencies not installed: {e}")
        return None
    except Exception as e:
        logger.warning(f"Gateway semantic search setup failed: {e}")
        return None


def list_gateway_tools() -> List[Dict[str, Any]]:
    """
    List all tools registered in the AgentCore Gateway MCP server.

    Returns a list of tool descriptors with name, description, and input schema.
    """
    if not settings.AGENTCORE_GATEWAY_URL:
        return []

    try:
        from strands.tools.mcp.mcp_client import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        def _create_transport():
            return streamablehttp_client(
                settings.AGENTCORE_GATEWAY_URL,
                headers={"x-api-key": settings.AGENTCORE_GATEWAY_API_KEY},
            )

        mcp_client = MCPClient(_create_transport)
        mcp_client.start()

        try:
            tools = []
            for tool in mcp_client.list_tools_sync():
                tools.append({
                    "name": tool.name,
                    "description": tool.description or "",
                    "input_schema": tool.inputSchema if hasattr(tool, "inputSchema") else {},
                })
            return tools
        finally:
            mcp_client.stop()

    except ImportError:
        logger.warning("MCP dependencies not installed")
        return []
    except Exception as e:
        logger.warning(f"Failed to list gateway tools: {e}")
        return []
