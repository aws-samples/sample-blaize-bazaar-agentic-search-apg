"""
AgentCore Gateway — MCP Tool Discovery via Bedrock AgentCore Gateway.

Solution: create_gateway_orchestrator() implemented with MCPClient
and streamable HTTP transport for dynamic tool discovery.
"""
import logging
from typing import Optional, List, Dict, Any

from config import settings

logger = logging.getLogger(__name__)


def create_gateway_orchestrator():
    """
    Create an orchestrator that discovers tools via MCP Gateway.
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


def create_gateway_orchestrator_with_semantic_search():
    """
    Create an orchestrator that discovers tools via Gateway semantic search.
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
                "For pricing, search for 'pricing' tools."
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
    """List all tools registered in the AgentCore Gateway MCP server."""
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
