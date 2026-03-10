#!/usr/bin/env python3
"""Part 4: AgentCore — Production-Ready Agents — Blaize Bazaar Workshop

Productionize your agent with Amazon Bedrock AgentCore: identity, memory,
tool discovery, observability, and serverless runtime.

Sections:
  1. Identity — Cognito JWT Verification (pre-built demo)
  2. TODO: Memory — AgentCore Persistent Preferences
  3. TODO: Gateway — MCP Tool Discovery
  4. Observability — OTLP/X-Ray Tracing (pre-built demo)
  5. TODO: Runtime — Lambda Deployment Entrypoint

Run from repo root:
    python labs/lab4_agentcore.py
"""

import json
import os
import sys
from typing import Dict, Any, Optional

from shared.config import get_connection_string, BEDROCK_CHAT_MODEL

try:
    from strands import Agent, tool
    from strands.models import BedrockModel
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    print("⚠️  Strands SDK not installed. Agent features disabled.")
    print("   Install with: pip install strands-agents strands-agents-tools")
    def tool(fn):
        return fn

conn_string = get_connection_string()


# ============================================================
# Section 1: Identity — Cognito JWT Verification (Pre-built)
# ============================================================

def section_1_identity():
    """Demonstrate Cognito JWT verification for agent identity."""
    print("=== Section 1: Identity — Cognito JWT (Pre-built) ===\n")

    # This demonstrates the verification flow — in production,
    # the backend middleware handles this automatically.

    # Simulated JWT claims (what you get after verifying a Cognito token)
    mock_claims = {
        "sub": "abc123-user-id",
        "email": "workshop@example.com",
        "token_use": "access",
        "iss": "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_XXXXX",
    }

    print("  Cognito JWT Claims (decoded):")
    for key, value in mock_claims.items():
        print(f"    {key}: {value}")

    print("\n  ✅ Identity verified — agent knows who the user is")
    print("  💡 In the app: user email appears in header, traces show session.user")
    print()
    return mock_claims


# ============================================================
# Section 2: TODO — Memory — AgentCore Persistent Preferences
# ============================================================

def section_2_memory():
    """
    TODO: Create an AgentCore Memory session manager.

    AgentCore Memory automatically extracts preferences from conversations
    and recalls them in future sessions — even after closing the browser.

    Steps:
        1. Import AgentCoreMemoryConfig and AgentCoreMemorySessionManager
        2. Create a config with memory_id, session_id, and actor_id
        3. Create the session manager
        4. Attach it to an agent

    Hints:
        - from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
        - from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager
        - The memory_id comes from your CloudFormation outputs
        - actor_id is the user's Cognito sub claim
    """
    print("=== Section 2: Memory — AgentCore Persistent Preferences ===\n")

    memory_id = os.environ.get("AGENTCORE_MEMORY_ID", "")
    if not memory_id:
        print("  ⚠️ AGENTCORE_MEMORY_ID not set — skipping")
        print("  Set it from CloudFormation outputs: export AGENTCORE_MEMORY_ID=...")
        return None

    # TODO: Your implementation here (~10 lines)
    # 1. Create AgentCoreMemoryConfig with memory_id, session_id, actor_id
    # 2. Create AgentCoreMemorySessionManager with the config
    # 3. Print success message
    # 4. Return the session_manager

    print("  ⏳ TODO: Implement AgentCore Memory session manager")
    return None


# ============================================================
# Section 3: TODO — Gateway — MCP Tool Discovery
# ============================================================

def section_3_gateway():
    """
    TODO: Create an agent that discovers tools via MCP Gateway.

    Instead of hard-coding tool imports, connect to an AgentCore Gateway
    MCP server and let the agent discover available tools at runtime.

    Steps:
        1. Import MCPClient from strands.tools.mcp
        2. Import streamablehttp_client from mcp.client
        3. Create a transport function pointing to AGENTCORE_GATEWAY_URL
        4. Create MCPClient with the transport
        5. Create an Agent with the MCP client as a tool

    Hints:
        - from strands.tools.mcp.mcp_client import MCPClient
        - from mcp.client.streamable_http import streamablehttp_client
        - The gateway URL comes from your CloudFormation outputs
    """
    print("=== Section 3: Gateway — MCP Tool Discovery ===\n")

    gateway_url = os.environ.get("AGENTCORE_GATEWAY_URL", "")
    if not gateway_url:
        print("  ⚠️ AGENTCORE_GATEWAY_URL not set — skipping")
        print("  Set it from CloudFormation outputs: export AGENTCORE_GATEWAY_URL=...")
        return None

    if not STRANDS_AVAILABLE:
        print("  ⚠️ Strands SDK not available")
        return None

    # TODO: Your implementation here (~15 lines)
    # 1. Create transport function: streamablehttp_client(gateway_url, headers={...})
    # 2. Create MCPClient with the transport
    # 3. Create Agent with MCP client as tool
    # 4. List discovered tools
    # 5. Return the agent

    print("  ⏳ TODO: Implement MCP Gateway tool discovery")
    return None


# ============================================================
# Section 4: Observability — OTLP/X-Ray Tracing (Pre-built)
# ============================================================

def section_4_observability():
    """Demonstrate OTLP exporter setup for CloudWatch X-Ray traces."""
    print("=== Section 4: Observability — OTLP/X-Ray (Pre-built) ===\n")

    # In the real app, this is done in app.py lifespan():
    #   strands_telemetry.setup_otlp_exporter()

    print("  OTEL Configuration:")
    print(f"    OTEL_EXPORTER_OTLP_ENDPOINT = {os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT', 'not set')}")
    print(f"    OTEL_SERVICE_NAME = {os.environ.get('OTEL_SERVICE_NAME', 'blaize-bazaar')}")

    # Set defaults for demo
    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", "https://xray.us-west-2.amazonaws.com/v1/traces")
    os.environ.setdefault("OTEL_SERVICE_NAME", "blaize-bazaar")

    if STRANDS_AVAILABLE:
        try:
            from strands.telemetry import StrandsTelemetry
            telemetry = StrandsTelemetry()
            telemetry.setup_console_exporter()
            print("\n  ✅ Console exporter active (traces print to stdout)")
            print("  💡 In production: uncomment setup_otlp_exporter() to send to X-Ray")
        except Exception as e:
            print(f"\n  ⚠️ Telemetry setup failed: {e}")
    else:
        print("\n  ⚠️ Strands SDK not available for telemetry demo")

    print()


# ============================================================
# Section 5: TODO — Runtime — Lambda Deployment Entrypoint
# ============================================================

def section_5_runtime():
    """
    TODO: Create an AgentCore Runtime entrypoint for Lambda deployment.

    The @app.entrypoint decorator wraps your orchestrator so it can run
    in an AgentCore Lambda microVM instead of a local FastAPI process.

    Steps:
        1. Import BedrockAgentCoreApp from bedrock_agentcore.runtime
        2. Create app = BedrockAgentCoreApp()
        3. Define @app.entrypoint function that:
           - Extracts prompt from payload
           - Creates orchestrator
           - Runs orchestrator(prompt)
           - Returns response dict

    Hints:
        - from bedrock_agentcore.runtime import BedrockAgentCoreApp
        - payload has keys: {"prompt": "...", "session_id": "..."}
        - Deploy with: agentcore configure && agentcore launch
    """
    print("=== Section 5: Runtime — Lambda Deployment ===\n")

    # TODO: Your implementation here (~10 lines)
    # 1. Import BedrockAgentCoreApp
    # 2. Create app instance
    # 3. Define @app.entrypoint handler
    # 4. Print the entrypoint info

    print("  ⏳ TODO: Implement AgentCore Runtime entrypoint")
    print("  💡 After implementing, deploy with:")
    print("     $ pip install bedrock-agentcore")
    print("     $ agentcore configure")
    print("     $ agentcore launch")
    print()


# ============================================================
# Main — Run all sections
# ============================================================

def main():
    print("\n" + "=" * 70)
    print("Part 4: AgentCore — Production-Ready Agents")
    print("=" * 70 + "\n")

    results = {}

    # Section 1: Identity (pre-built)
    results["identity"] = section_1_identity()
    print("-" * 50)

    # Section 2: Memory (TODO)
    session_manager = section_2_memory()
    if session_manager:
        print("  ✅ AgentCore Memory configured")
    else:
        print("  ⏳ TODO: Implement section_2_memory()")
    results["memory"] = session_manager is not None
    print("-" * 50)

    # Section 3: Gateway (TODO)
    gateway_agent = section_3_gateway()
    if gateway_agent:
        print("  ✅ Gateway agent created with MCP tools")
    else:
        print("  ⏳ TODO: Implement section_3_gateway()")
    results["gateway"] = gateway_agent is not None
    print("-" * 50)

    # Section 4: Observability (pre-built)
    section_4_observability()
    results["observability"] = True
    print("-" * 50)

    # Section 5: Runtime (TODO)
    section_5_runtime()
    results["runtime"] = False  # Can't verify without actual deployment
    print("-" * 50)

    # Summary
    completed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\n{'=' * 70}")
    print(f"Results: {completed}/{total} sections complete")
    print(f"{'=' * 70}")
    for section, done in results.items():
        status = "✅" if done else "⏳"
        print(f"  {status} {section}")

    if completed < total:
        print(f"\n📝 Complete the TODOs in sections 2, 3, and 5")
        print("   Then check the solution: labs/solutions/lab4_solution.py")


if __name__ == "__main__":
    main()
