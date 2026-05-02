"""
Policy Hook — Strands ``BeforeToolCallEvent`` enforcement layer.

This module hangs the existing ``PolicyService`` (Cedar local engine,
``services/agentcore_policy.py``) off the Strands event loop so every
agent tool call is inspected BEFORE it runs. A DENY decision cancels
the tool via ``event.cancel_tool = "..."`` — Strands then injects a
synthetic tool result containing the denial message, which the agent
reads and paraphrases back to the user.

Why a hook and not a wrapper per tool:

* Zero per-tool plumbing. Every new @tool in ``services/agent_tools``
  is covered the moment the hook is attached — no need to remember
  to add a decorator.
* Uniform telemetry. Every enforcement decision flows through the
  same spot, so the Atelier Policy panel can show an honest,
  complete audit trail keyed on ``toolUseId``.
* Single source of truth. ``PolicyService.evaluate()`` is the one
  place policies live; the hook just plumbs tool_use → evaluate and
  translates the decision into the Strands control-flow primitive
  (``cancel_tool``).

We also capture each decision in a per-turn decision log (in-memory,
bounded) so the routes in ``routes/atelier.py`` can surface live
enforcement data to the Atelier Policy tab without needing a
backend-agnostic store.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional

from strands.hooks import HookProvider, HookRegistry
from strands.hooks.events import BeforeToolCallEvent

from services.agentcore_policy import get_policy_service

logger = logging.getLogger(__name__)


# Map Strands tool names → PolicyService action keys. PolicyService's
# ``applies_to`` field uses a smaller vocabulary than the tool set
# (e.g., ``set_price`` covers pricing-changing tools collectively).
# Tools not in this map simply bypass the policy engine — they're
# read-only catalog queries with no risk surface worth enforcing.
_TOOL_TO_POLICY_ACTION: Dict[str, str] = {
    # Restock gates on quantity.
    "restock_product": "restock_product",
    # Search gates on restricted categories/keywords.
    "search_products": "search_products",
    "browse_category": "search_products",
    # Pricing-changing tools gate on ceiling. (The current tool set
    # doesn't have a direct ``set_price`` tool — the mapping exists
    # so a future pricing-write tool inherits enforcement automatically.)
    "set_price": "set_price",
}


# Bounded in-memory buffer of recent enforcement decisions, keyed by
# session_id so the Atelier Policy tab can show "this turn's
# decisions" without mixing sessions. Each entry is a plain dict so
# routes can serialize it to JSON directly. 1000 entries per session
# is far more than a workshop needs; the oldest are evicted in FIFO
# order when the cap is hit.
_DECISIONS_MAX = 1000
_decisions_lock = threading.Lock()
_decisions: Dict[str, Deque[Dict[str, Any]]] = {}


def record_decision(session_id: Optional[str], decision: Dict[str, Any]) -> None:
    """Append a decision to the per-session buffer. Public so the
    Atelier routes can read without importing the deque directly."""
    if not session_id:
        session_id = "_anonymous"
    with _decisions_lock:
        buf = _decisions.get(session_id)
        if buf is None:
            buf = deque(maxlen=_DECISIONS_MAX)
            _decisions[session_id] = buf
        buf.append(decision)


def get_decisions(session_id: Optional[str], limit: int = 50) -> List[Dict[str, Any]]:
    """Return the most recent ``limit`` decisions for a session.
    Newest first. Empty list if session has no recorded decisions."""
    if not session_id:
        session_id = "_anonymous"
    with _decisions_lock:
        buf = _decisions.get(session_id)
        if not buf:
            return []
        # deque is oldest-first; reverse to return newest-first.
        entries = list(buf)
    return list(reversed(entries[-limit:]))


class PolicyEnforcementHook(HookProvider):
    """Strands hook provider that consults ``PolicyService`` before
    every tool call and cancels DENY outcomes.

    One instance per agent turn. ``session_id`` is stashed on the
    hook so every decision gets tagged with the right session, and
    the Atelier Policy tab can filter by the current session.

    We deliberately DON'T intercept the agent's prose — attackers
    could phrase a restricted query conversationally. Tools are the
    chokepoint because the specialist has to call one to act on the
    catalog. A Bedrock Guardrail can layer in on the prose side
    later (Commit 11).
    """

    def __init__(self, session_id: Optional[str] = None) -> None:
        self.session_id = session_id
        self._policy = get_policy_service()

    def register_hooks(self, registry: HookRegistry, **_: Any) -> None:
        """Strands HookProvider contract — register our callback."""
        registry.add_callback(BeforeToolCallEvent, self._on_before_tool)

    def _on_before_tool(self, event: BeforeToolCallEvent) -> None:
        """Evaluate the pending tool call against PolicyService and
        cancel it with a human-readable message on DENY."""
        tool_use = event.tool_use
        if not isinstance(tool_use, dict):
            return
        tool_name = tool_use.get("name", "")
        action = _TOOL_TO_POLICY_ACTION.get(tool_name)
        if action is None:
            return  # Not a policy-gated tool; let it run.

        # Strands stores tool args under ``input`` for v1 tool_use.
        # Fall back to ``parameters`` and the top-level dict for
        # compatibility with older shapes.
        params = tool_use.get("input")
        if not isinstance(params, dict):
            params = tool_use.get("parameters")
        if not isinstance(params, dict):
            params = {}

        try:
            result = self._policy.evaluate(action, params)
        except Exception as exc:
            logger.warning(
                "PolicyService.evaluate raised for tool=%s: %s — fail-open",
                tool_name, exc,
            )
            return

        decision_record = {
            "timestamp_ms": int(time.time() * 1000),
            "tool_name": tool_name,
            "action": action,
            "decision": result.get("decision", "ALLOW"),
            "violations": result.get("violations", []),
            "matching_policies": result.get("matching_policies", []),
            "parameters": params,
            "tool_use_id": tool_use.get("toolUseId"),
        }
        record_decision(self.session_id, decision_record)

        if result.get("decision") == "DENY":
            violations = result.get("violations", [])
            # Compose a user-facing reason. If multiple violations,
            # join them with semicolons — the agent will paraphrase
            # the whole thing into its own reply.
            reasons = [v.get("reason", "") for v in violations if v.get("reason")]
            reason_text = "; ".join(reasons) if reasons else "Policy denied this action"
            cancel_msg = (
                f"Policy denied: {reason_text}. "
                "Explain to the user that this request conflicts with an active "
                "store policy and offer a compliant alternative if possible."
            )
            # Strands interprets a string here as both a cancellation
            # AND the synthetic tool-result payload the agent sees.
            event.cancel_tool = cancel_msg
            logger.info(
                "🚫 policy_deny | tool=%s | %s",
                tool_name, reason_text[:80],
            )
