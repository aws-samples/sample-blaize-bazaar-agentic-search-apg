"""
OpenTelemetry Trace Extractor for Agent Execution Visualization

Captures real Strands SDK spans via InMemorySpanExporter and extracts
agent steps, tool calls, and timing for the frontend waterfall view.
"""
import logging
import time
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Module-level exporter reference
_span_exporter = None


# === CHALLENGE 8: Observability — START ===
# TODO: Implement OpenTelemetry span capture and trace extraction
#
# Steps:
#   1. Implement init_span_capture() to attach InMemorySpanExporter to TracerProvider
#   2. Implement extract_agent_execution_from_otel() to read spans and build
#      structured agent_execution payload (agent_steps, tool_calls, waterfall)
#   3. Implement get_waterfall_data() for the frontend trace visualization
#   4. Implement _empty_execution() helper returning empty structure
#
# ⏩ SHORT ON TIME? Run:
#    cp solutions/module3/services/otel_trace_extractor.py blaize-bazaar/backend/services/otel_trace_extractor.py

def init_span_capture():
    """Attach InMemorySpanExporter to capture agent execution spans."""
    pass

def extract_agent_execution_from_otel():
    """Read finished spans and build structured execution payload."""
    return _empty_execution()

def get_waterfall_data():
    """Return latest waterfall data for frontend visualization."""
    return {"waterfall": [], "span_count": 0}

def _empty_execution():
    """Return empty execution structure."""
    return {
        "agent_steps": [], "tool_calls": [], "reasoning_steps": [],
        "waterfall": [], "total_duration_ms": 0, "success_rate": 0, "otel_enabled": False,
    }
# === CHALLENGE 8: Observability — END ===


def infer_agent_from_query(query: str, start_time: float) -> Dict[str, Any]:
    """
    Fallback: Infer agent execution from query keywords with routing decision.
    Used when OpenTelemetry traces are not available.
    """
    agent_steps = []
    tool_calls = []
    routing_decision = None

    agent_steps.append({
        "agent": "Orchestrator",
        "action": "Analyzing query and routing to specialists",
        "status": "completed",
        "timestamp": start_time,
        "duration_ms": 50,
    })

    query_lower = query.lower()
    step_time = start_time + 0.1
    query_snippet = query[:30] + "..." if len(query) > 30 else query

    if any(word in query_lower for word in ["deal", "cheap", "price", "discount", "budget", "cost", "value"]):
        detected = [w for w in ["deal", "cheap", "price", "discount", "budget", "cost", "value"] if w in query_lower]
        routing_decision = {
            "selected_agent": "Pricing Agent",
            "confidence": 95,
            "reason": f"Pricing keywords: {', '.join(detected[:2])}",
            "alternatives": [{"agent": "Recommendation Agent", "confidence": 5}],
        }
        agent_steps.append({"agent": "Pricing Agent", "action": "Analyzing prices and deals", "status": "completed", "timestamp": step_time, "duration_ms": 160})
        tool_calls.append({"tool": "search_products", "params": f"query='{query_snippet}', limit=5", "result": "Found 5 products", "timestamp": step_time + 0.025, "duration_ms": 150, "status": "success"})
    elif any(word in query_lower for word in ["stock", "inventory", "restock"]):
        detected = [w for w in ["stock", "inventory", "restock"] if w in query_lower]
        routing_decision = {
            "selected_agent": "Inventory Agent",
            "confidence": 98,
            "reason": f"Inventory keywords: {', '.join(detected)}",
            "alternatives": [{"agent": "Recommendation Agent", "confidence": 2}],
        }
        agent_steps.append({"agent": "Inventory Agent", "action": "Analyzing stock levels", "status": "completed", "timestamp": step_time, "duration_ms": 180})
        tool_calls.append({"tool": "get_inventory_health", "params": "category=all", "result": "Health score: 85%", "timestamp": step_time + 0.02, "duration_ms": 120, "status": "success"})
    else:
        routing_decision = {
            "selected_agent": "Recommendation Agent",
            "confidence": 90,
            "reason": "General product search query",
            "alternatives": [{"agent": "Pricing Agent", "confidence": 10}],
        }
        agent_steps.append({"agent": "Recommendation Agent", "action": "Searching product catalog", "status": "completed", "timestamp": step_time, "duration_ms": 200})
        tool_calls.append({"tool": "search_products", "params": f"query='{query_snippet}', limit=5", "result": "Found 5 products", "timestamp": step_time + 0.05, "duration_ms": 150, "status": "success"})

    total_duration = time.time() - start_time

    return {
        "agent_steps": agent_steps,
        "tool_calls": tool_calls,
        "reasoning_steps": [],
        "routing_decision": routing_decision,
        "waterfall": [],
        "total_duration_ms": int(total_duration * 1000),
        "success_rate": 1.0,
        "otel_enabled": False,
        "inferred": True,
    }
