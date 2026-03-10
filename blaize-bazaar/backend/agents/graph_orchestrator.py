"""
Graph Orchestrator — Multi-agent DAG visualization using Strands 1.0.

Provides the graph structure (nodes + edges) for the orchestrator's
decision flow: Router → [Recommendation, Pricing, Inventory] → Aggregator.

If Strands GraphBuilder is available, uses it; otherwise returns a static
DAG structure for visualization purposes.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Try importing Strands graph support
GRAPH_AVAILABLE = False
try:
    from strands.agent.graph import GraphBuilder  # type: ignore
    GRAPH_AVAILABLE = True
    logger.info("Strands GraphBuilder available — graph orchestrator enabled")
except ImportError:
    logger.info("Strands GraphBuilder not available — using static graph structure")


def get_graph_structure() -> Dict[str, Any]:
    """
    Return the multi-agent orchestrator graph structure.

    Nodes represent agents/decision points, edges represent data flow.
    This structure is used by the frontend GraphVisualization component.
    """
    nodes = [
        {
            "id": "router",
            "label": "Router",
            "type": "decision",
            "description": "Analyzes query intent and routes to specialist agents",
            "model": "Claude Haiku 4.5",
        },
        {
            "id": "recommendation",
            "label": "Product Recommendation",
            "type": "agent",
            "description": "Semantic search via pgvector + Cohere Embed v4",
            "model": "Claude Haiku 4.5",
        },
        {
            "id": "pricing",
            "label": "Price Optimization",
            "type": "agent",
            "description": "Price analysis, deals, and discount finder",
            "model": "Claude Haiku 4.5",
        },
        {
            "id": "inventory",
            "label": "Inventory & Restock",
            "type": "agent",
            "description": "Stock levels, restocking, and availability",
            "model": "Claude Haiku 4.5",
        },
        {
            "id": "aggregator",
            "label": "Aggregator",
            "type": "aggregation",
            "description": "Combines results and formats final response",
            "model": "Claude Haiku 4.5",
        },
    ]

    edges = [
        {"from": "router", "to": "recommendation", "label": "product queries"},
        {"from": "router", "to": "pricing", "label": "price queries"},
        {"from": "router", "to": "inventory", "label": "stock queries"},
        {"from": "recommendation", "to": "aggregator", "label": "results"},
        {"from": "pricing", "to": "aggregator", "label": "results"},
        {"from": "inventory", "to": "aggregator", "label": "results"},
    ]

    return {
        "available": True,
        "graph_builder_available": GRAPH_AVAILABLE,
        "nodes": nodes,
        "edges": edges,
        "description": (
            "The orchestrator routes user queries through a multi-agent DAG. "
            "The Router analyzes intent and dispatches to specialist agents "
            "(Recommendation, Pricing, Inventory) which can run in parallel. "
            "Results are aggregated into a unified response."
        ),
    }
