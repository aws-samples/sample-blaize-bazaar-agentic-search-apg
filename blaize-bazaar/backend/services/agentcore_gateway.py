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


# === WIRE IT LIVE (Lab 4c) ===
def create_gateway_orchestrator():
    """
    Create an orchestrator that discovers tools via MCP Gateway.

    Instead of importing tool functions directly, this connects to an
    AgentCore Gateway MCP server which exposes tools as MCP resources.
    The agent dynamically discovers available tools at runtime.

    Returns:
        Strands Agent with MCP-discovered tools, or None if not configured
    """
    if not settings.AGENTCORE_GATEWAY_URL:
        logger.info("AGENTCORE_GATEWAY_URL not set — gateway disabled")
        return None

    try:
        from strands import Agent
        from strands.models import BedrockModel
        from strands.tools.mcp.mcp_client import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        # Create MCP transport to AgentCore Gateway
        def _create_transport():
            return streamablehttp_client(
                settings.AGENTCORE_GATEWAY_URL,
                headers={"x-api-key": "dat406-workshop"},
            )

        # Create MCP client and discover tools
        mcp_client = MCPClient(_create_transport)

        # Create orchestrator with discovered tools
        orchestrator = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                max_tokens=4096,
                temperature=0.0,
            ),
            system_prompt=(
                "You are the Blaize Bazaar shopping assistant. "
                "Use the available tools to help users find products, "
                "check prices, and get recommendations. "
                "Always be helpful and concise."
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
# === END WIRE IT LIVE ===


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
                headers={"x-api-key": "dat406-workshop"},
            )

        mcp_client = MCPClient(_create_transport)
        mcp_client.start()

        tools = []
        for tool in mcp_client.list_tools_sync():
            tools.append({
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": tool.inputSchema if hasattr(tool, "inputSchema") else {},
            })

        mcp_client.stop()
        return tools

    except ImportError:
        logger.warning("MCP dependencies not installed")
        return []
    except Exception as e:
        logger.warning(f"Failed to list gateway tools: {e}")
        return []
