"""
OpenTelemetry Trace Extractor for Agent Execution Visualization

Extracts trace data from Strands OpenTelemetry spans for UI display.
"""
import logging
from typing import Dict, Any, List
from opentelemetry import trace

logger = logging.getLogger(__name__)


def extract_agent_execution_from_otel() -> Dict[str, Any]:
    """
    Extract agent execution data from current OpenTelemetry trace context
    
    Returns structured data for frontend visualization:
    - agent_steps: List of agent invocations
    - tool_calls: List of tool executions
    - reasoning_steps: Extended thinking steps (if available)
    - total_duration_ms: Total execution time
    - token_usage: Token metrics from LLM calls
    """
    try:
        # Get current span from context
        current_span = trace.get_current_span()
        
        if not current_span or not current_span.is_recording():
            logger.debug("No active OpenTelemetry span found")
            return _empty_execution()
        
        # Extract span context
        span_context = current_span.get_span_context()
        trace_id = format(span_context.trace_id, '032x') if span_context.is_valid else None
        
        logger.debug(f"📊 Extracting OTEL trace data (trace_id: {trace_id})")
        
        # Note: In-memory span extraction requires span processor
        # For now, return trace_id for external lookup
        return {
            "agent_steps": [],
            "tool_calls": [],
            "reasoning_steps": [],
            "total_duration_ms": 0,
            "success_rate": 100,
            "trace_id": trace_id,
            "otel_enabled": True,
            "note": "View full trace in OpenTelemetry backend (Jaeger/X-Ray)"
        }
        
    except Exception as e:
        logger.warning(f"Failed to extract OTEL trace: {e}")
        return _empty_execution()


def _empty_execution() -> Dict[str, Any]:
    """Return empty execution structure"""
    return {
        "agent_steps": [],
        "tool_calls": [],
        "reasoning_steps": [],
        "total_duration_ms": 0,
        "success_rate": 0,
        "otel_enabled": False
    }


def infer_agent_from_query(query: str, start_time: float) -> Dict[str, Any]:
    """
    Fallback: Infer agent execution from query keywords with routing decision
    
    Used when OpenTelemetry traces are not available.
    Enhanced with tool parameters, results, and routing confidence.
    """
    import time
    
    agent_steps = []
    tool_calls = []
    routing_decision = None
    
    # Orchestrator step
    agent_steps.append({
        "agent": "Orchestrator",
        "action": "Analyzing query and routing to specialists",
        "status": "completed",
        "timestamp": start_time,
        "duration_ms": 50
    })
    
    # Infer specialist agent from query with confidence
    query_lower = query.lower()
    step_time = start_time + 100
    
    # Extract query snippet for display
    query_snippet = query[:30] + '...' if len(query) > 30 else query
    
    if any(word in query_lower for word in ['deal', 'cheap', 'price', 'discount', 'budget', 'cost', 'value']):
        detected_keywords = [w for w in ['deal', 'cheap', 'price', 'discount', 'budget', 'cost', 'value'] if w in query_lower]
        routing_decision = {
            "selected_agent": "Pricing Agent",
            "confidence": 95,
            "reason": f"Pricing keywords detected: {', '.join(detected_keywords[:2])}",
            "alternatives": [{"agent": "Recommendation Agent", "confidence": 5}]
        }
        agent_steps.append({
            "agent": "Pricing Agent",
            "action": "Analyzing prices and deals",
            "status": "completed",
            "timestamp": step_time,
            "duration_ms": 160
        })
        tool_calls.append({
            "tool": "semantic_product_search",
            "params": f"query='{query_snippet}', limit=5",
            "result": "Found 5 products",
            "timestamp": step_time + 25,
            "duration_ms": 150,
            "status": "success"
        })
    elif any(word in query_lower for word in ['stock', 'inventory', 'restock']):
        detected_keywords = [w for w in ['stock', 'inventory', 'restock'] if w in query_lower]
        routing_decision = {
            "selected_agent": "Inventory Agent",
            "confidence": 98,
            "reason": f"Inventory keywords detected: {', '.join(detected_keywords)}",
            "alternatives": [{"agent": "Recommendation Agent", "confidence": 2}]
        }
        agent_steps.append({
            "agent": "Inventory Agent",
            "action": "Analyzing stock levels",
            "status": "completed",
            "timestamp": step_time,
            "duration_ms": 180
        })
        tool_calls.append({
            "tool": "get_inventory_health",
            "params": "category=all",
            "result": "Health score: 85%",
            "timestamp": step_time + 20,
            "duration_ms": 120,
            "status": "success"
        })
    else:
        routing_decision = {
            "selected_agent": "Recommendation Agent",
            "confidence": 90,
            "reason": "General product search query",
            "alternatives": [{"agent": "Pricing Agent", "confidence": 10}]
        }
        agent_steps.append({
            "agent": "Recommendation Agent",
            "action": "Searching product catalog",
            "status": "completed",
            "timestamp": step_time,
            "duration_ms": 200
        })
        tool_calls.append({
            "tool": "semantic_product_search",
            "params": f"query='{query_snippet}', limit=5",
            "result": "Found 5 products",
            "timestamp": step_time + 50,
            "duration_ms": 150,
            "status": "success"
        })
    
    total_duration = time.time() - start_time
    
    return {
        "agent_steps": agent_steps,
        "tool_calls": tool_calls,
        "reasoning_steps": [],
        "routing_decision": routing_decision,
        "total_duration_ms": int(total_duration * 1000),
        "success_rate": 100,
        "otel_enabled": False,
        "inferred": True
    }
