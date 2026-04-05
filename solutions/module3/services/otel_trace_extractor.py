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


def init_span_capture():
    """
    Attach an InMemorySpanExporter to the existing TracerProvider so we
    can read finished spans without interfering with the console exporter.
    """
    global _span_exporter
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor

        provider = trace.get_tracer_provider()
        if not isinstance(provider, TracerProvider):
            logger.warning("TracerProvider is not SDK-based; span capture unavailable")
            return

        _span_exporter = InMemorySpanExporter()
        provider.add_span_processor(SimpleSpanProcessor(_span_exporter))
        logger.info("✅ In-memory span capture initialized for trace extraction")

    except ImportError:
        logger.warning("OpenTelemetry SDK not available — span capture disabled")
    except Exception as e:
        logger.warning(f"Failed to init span capture: {e}")


def extract_agent_execution_from_otel() -> Dict[str, Any]:
    """
    Read finished spans from the in-memory exporter and build a structured
    agent_execution payload for the frontend.
    """
    if _span_exporter is None:
        return _empty_execution()

    try:
        spans = _span_exporter.get_finished_spans()
        if not spans:
            return _empty_execution()

        agent_steps: List[Dict[str, Any]] = []
        tool_calls: List[Dict[str, Any]] = []
        waterfall: List[Dict[str, Any]] = []
        total_start = None
        total_end = None

        for span in spans:
            attrs = dict(span.attributes) if span.attributes else {}
            name = span.name
            start_ns = span.start_time or 0
            end_ns = span.end_time or start_ns
            duration_ms = int((end_ns - start_ns) / 1_000_000)

            if total_start is None or start_ns < total_start:
                total_start = start_ns
            if total_end is None or end_ns > total_end:
                total_end = end_ns

            agent_name = attrs.get("gen_ai.agent.name", attrs.get("strands.agent.name", ""))
            tool_name = attrs.get("strands.tool.name", "")
            total_tokens = attrs.get("gen_ai.usage.total_tokens", 0)

            # Waterfall entry for every span
            waterfall.append({
                "name": name,
                "agent": agent_name or None,
                "tool": tool_name or None,
                "start_ms": int(start_ns / 1_000_000),
                "duration_ms": duration_ms,
                "tokens": total_tokens,
            })

            # Agent invocation spans
            if "invoke_agent" in name or (agent_name and "chat" not in name and "cycle" not in name):
                agent_steps.append({
                    "agent": agent_name or "Agent",
                    "action": f"Processing ({name})",
                    "status": "completed",
                    "timestamp": start_ns / 1e9,
                    "duration_ms": duration_ms,
                })

            # Tool execution spans
            if tool_name:
                tool_calls.append({
                    "tool": tool_name,
                    "params": f"via {agent_name}" if agent_name else "",
                    "result": f"{duration_ms}ms",
                    "timestamp": start_ns / 1e9,
                    "duration_ms": duration_ms,
                    "status": "success",
                })

        total_duration_ms = int((total_end - total_start) / 1_000_000) if total_start and total_end else 0

        # Normalize waterfall start times to be relative
        if waterfall and total_start:
            base_ms = int(total_start / 1_000_000)
            for w in waterfall:
                w["start_ms"] -= base_ms

        # Clear spans for next query
        _span_exporter.clear()

        return {
            "agent_steps": agent_steps,
            "tool_calls": tool_calls,
            "reasoning_steps": [],
            "waterfall": waterfall,
            "total_duration_ms": total_duration_ms,
            "success_rate": 1.0,
            "otel_enabled": True,
            "span_count": len(spans),
        }

    except Exception as e:
        logger.warning(f"Failed to extract OTEL trace: {e}")
        return _empty_execution()


def get_waterfall_data() -> Dict[str, Any]:
    """Return the latest waterfall data (or empty) without clearing spans."""
    if _span_exporter is None:
        return {"waterfall": [], "span_count": 0}

    try:
        spans = _span_exporter.get_finished_spans()
        if not spans:
            return {"waterfall": [], "span_count": 0}

        waterfall = []
        total_start = None
        for span in spans:
            attrs = dict(span.attributes) if span.attributes else {}
            start_ns = span.start_time or 0
            end_ns = span.end_time or start_ns
            duration_ms = int((end_ns - start_ns) / 1_000_000)
            if total_start is None or start_ns < total_start:
                total_start = start_ns
            waterfall.append({
                "name": span.name,
                "agent": attrs.get("gen_ai.agent.name", attrs.get("strands.agent.name", None)),
                "tool": attrs.get("strands.tool.name", None),
                "start_ms": int(start_ns / 1_000_000),
                "duration_ms": duration_ms,
                "tokens": attrs.get("gen_ai.usage.total_tokens", 0),
            })

        if waterfall and total_start:
            base_ms = int(total_start / 1_000_000)
            for w in waterfall:
                w["start_ms"] -= base_ms

        return {"waterfall": waterfall, "span_count": len(spans)}

    except Exception as e:
        logger.warning(f"Failed to get waterfall data: {e}")
        return {"waterfall": [], "span_count": 0}


def _empty_execution() -> Dict[str, Any]:
    """Return empty execution structure"""
    return {
        "agent_steps": [],
        "tool_calls": [],
        "reasoning_steps": [],
        "waterfall": [],
        "total_duration_ms": 0,
        "success_rate": 0,
        "otel_enabled": False,
    }


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
