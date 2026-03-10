#!/usr/bin/env python3
"""Part 4 SOLUTION: AgentCore — Production-Ready Agents

Complete reference implementation for all 5 AgentCore sections.
Compare with labs/lab4_agentcore.py to see the solutions.
"""

import json
import os
import sys
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.config import get_connection_string, BEDROCK_CHAT_MODEL

try:
    from strands import Agent, tool
    from strands.models import BedrockModel
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    def tool(fn):
        return fn

conn_string = get_connection_string()


# ============================================================
# Section 1: Identity — Cognito JWT Verification (Pre-built)
# ============================================================

def section_1_identity():
    """Demonstrate Cognito JWT verification for agent identity."""
    print("=== Section 1: Identity — Cognito JWT ===\n")

    mock_claims = {
        "sub": "abc123-user-id",
        "email": "workshop@example.com",
        "token_use": "access",
    }

    print("  Cognito JWT Claims (decoded):")
    for key, value in mock_claims.items():
        print(f"    {key}: {value}")
    print("\n  ✅ Identity verified")
    return mock_claims


# ============================================================
# Section 2 SOLUTION: Memory — AgentCore Persistent Preferences
# ============================================================

def section_2_memory():
    """SOLUTION: Create an AgentCore Memory session manager."""
    print("=== Section 2: Memory — AgentCore Persistent Preferences ===\n")

    memory_id = os.environ.get("AGENTCORE_MEMORY_ID", "")
    if not memory_id:
        print("  ⚠️ AGENTCORE_MEMORY_ID not set — skipping")
        return None

    try:
        from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
        from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager

        config = AgentCoreMemoryConfig(
            memory_id=memory_id,
            session_id="lab4-demo-session",
            actor_id="abc123-user-id",
            batch_size=5,
        )

        session_manager = AgentCoreMemorySessionManager(
            config,
            region_name=os.environ.get("AWS_REGION", "us-west-2"),
        )

        print("  ✅ AgentCore Memory session manager created")
        print(f"    memory_id: {memory_id}")
        print(f"    actor_id: abc123-user-id")
        return session_manager

    except ImportError:
        print("  ⚠️ bedrock-agentcore not installed: pip install bedrock-agentcore")
        return None
    except Exception as e:
        print(f"  ⚠️ Memory setup failed: {e}")
        return None


# ============================================================
# Section 3 SOLUTION: Gateway — MCP Tool Discovery
# ============================================================

def section_3_gateway():
    """SOLUTION: Create an agent that discovers tools via MCP Gateway."""
    print("=== Section 3: Gateway — MCP Tool Discovery ===\n")

    gateway_url = os.environ.get("AGENTCORE_GATEWAY_URL", "")
    if not gateway_url:
        print("  ⚠️ AGENTCORE_GATEWAY_URL not set — skipping")
        return None

    if not STRANDS_AVAILABLE:
        print("  ⚠️ Strands SDK not available")
        return None

    try:
        from strands.tools.mcp.mcp_client import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        # Create MCP transport to AgentCore Gateway
        def _create_transport():
            return streamablehttp_client(
                gateway_url,
                headers={"x-api-key": "dat406-workshop"},
            )

        # Create MCP client
        mcp_client = MCPClient(_create_transport)

        # Discover tools
        mcp_client.start()
        tools = mcp_client.list_tools_sync()
        print(f"  Discovered {len(tools)} tools via MCP:")
        for t in tools:
            print(f"    - {t.name}: {t.description[:60]}...")

        # Create agent with discovered tools
        agent = Agent(
            model=BedrockModel(
                model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
                max_tokens=4096,
                temperature=0.0,
            ),
            system_prompt="You are a shopping assistant. Use available tools to help users.",
            tools=[mcp_client],
        )

        print(f"\n  ✅ Gateway agent created with {len(tools)} MCP tools")
        return agent

    except ImportError as e:
        print(f"  ⚠️ MCP dependencies not installed: {e}")
        return None
    except Exception as e:
        print(f"  ⚠️ Gateway setup failed: {e}")
        return None


# ============================================================
# Section 4: Observability — OTLP/X-Ray Tracing (Pre-built)
# ============================================================

def section_4_observability():
    """Demonstrate OTLP exporter setup for CloudWatch X-Ray traces."""
    print("=== Section 4: Observability — OTLP/X-Ray ===\n")

    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", "https://xray.us-west-2.amazonaws.com/v1/traces")
    os.environ.setdefault("OTEL_SERVICE_NAME", "blaize-bazaar")

    print(f"  OTEL_EXPORTER_OTLP_ENDPOINT = {os.environ['OTEL_EXPORTER_OTLP_ENDPOINT']}")
    print(f"  OTEL_SERVICE_NAME = {os.environ['OTEL_SERVICE_NAME']}")

    if STRANDS_AVAILABLE:
        from strands.telemetry import StrandsTelemetry
        telemetry = StrandsTelemetry()
        telemetry.setup_console_exporter()
        print("\n  ✅ Console exporter active")
        print("  💡 Production: uncomment setup_otlp_exporter()")
    print()


# ============================================================
# Section 5 SOLUTION: Runtime — Lambda Deployment Entrypoint
# ============================================================

def section_5_runtime():
    """SOLUTION: Create an AgentCore Runtime entrypoint."""
    print("=== Section 5: Runtime — Lambda Deployment ===\n")

    try:
        from bedrock_agentcore.runtime import BedrockAgentCoreApp

        app = BedrockAgentCoreApp()

        @app.entrypoint
        def invoke(payload):
            """AgentCore Runtime entrypoint."""
            prompt = payload.get("prompt", "Hello")
            session_id = payload.get("session_id", "runtime-session")

            # In production, create_orchestrator() is imported from agents/
            # For the lab demo, we just show the structure
            print(f"    Received prompt: {prompt[:50]}...")
            print(f"    Session: {session_id}")

            return {"response": f"Runtime processed: {prompt}", "products": []}

        print("  ✅ AgentCore Runtime entrypoint created")
        print("  Deploy with:")
        print("    $ agentcore configure")
        print("    $ agentcore launch")
        print()
        return app

    except ImportError:
        print("  ⚠️ bedrock-agentcore not installed: pip install bedrock-agentcore")
        print()
        return None


# ============================================================
# Main
# ============================================================

def main():
    print("\n" + "=" * 70)
    print("Part 4 SOLUTION: AgentCore — Production-Ready Agents")
    print("=" * 70 + "\n")

    section_1_identity()
    print("-" * 50)
    section_2_memory()
    print("-" * 50)
    section_3_gateway()
    print("-" * 50)
    section_4_observability()
    print("-" * 50)
    section_5_runtime()

    print("=" * 70)
    print("✅ All sections complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
