"""``/api/workshop/*`` — telemetry-replay endpoint for the DAT406 /workshop route.

This router is the backend half of the PostgresConf Builders Session
(DAT406) telemetry surface. Unlike ``/api/agent/chat`` — which streams
storefront-shaped SSE events (product cards, cart ops, badges) for
``ConciergeModal`` — this endpoint returns a single flat replay payload:

    POST /api/workshop/query
    → {
        "session_id": "...",
        "events": [
          {"type": "plan",  "steps": [...], ...},
          {"type": "step",  "index": 0, "state": "active"},
          {"type": "panel", "tag": "LLM · HAIKU · INTENT", ...},
          ...
          {"type": "response", "text": "...", "citations": [...]}
        ]
      }

The frontend's ``WorkshopChat`` + ``TelemetryStream`` components iterate
the events list with per-type animation beats (see
``conferences/2026-postgresconf-agentic-ai/static/index.html`` playEvents()).

**Not an SSE stream.** Week 1 returns one consolidated JSON blob at
end-of-turn. Once enough specialists emit panels mid-execution
(Week 5+) this can promote to SSE without changing the event dict shape
— the client already replays with artificial delays so a true stream is
transparent.

**Session continuity.** The caller may pass ``session_id`` or let the
endpoint mint one. The value round-trips to ``AgentContext.session_id``
and is echoed back in the response so the SPA can persist it to
localStorage (same key the other chat surfaces use).

Week 1 scope: the endpoint wires up the AgentContext + orchestrator hand-off
and returns a minimally populated events list (a canned PLAN card + the
orchestrator's final text as a ``response`` event). Panels #1-11 arrive
as the specialists and orchestrator get instrumented in Weeks 2-6.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.agent_context import AgentContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workshop", tags=["workshop"])


class WorkshopQueryRequest(BaseModel):
    """Body of ``POST /api/workshop/query``.

    ``customer_id`` is optional — the workshop chat starts as anonymous.
    When a demo customer is picked from the user dropdown (Week 1 UI),
    it's passed here so the recommendation agent's ``MEMORY · PROCEDURAL``
    query excludes that customer from the cohort-overlap result.
    """

    query: str = Field(..., min_length=1, description="Shopper / operator question")
    session_id: Optional[str] = Field(
        default=None,
        description="Stable across turns. Omit on first turn; echo back from the previous response.",
    )
    customer_id: Optional[str] = Field(
        default=None,
        description="Seeded demo customer id (e.g. 'CUST-0003'). None ⇒ anonymous.",
    )


class WorkshopQueryResponse(BaseModel):
    """Flat replay payload. Keep the shape identical to Coffee Roastery's
    ``/api/query`` so the frontend renderer is a straight port."""

    session_id: str
    events: list[dict[str, Any]]


@router.post("/query", response_model=WorkshopQueryResponse)
async def query(payload: WorkshopQueryRequest) -> WorkshopQueryResponse:
    """Run one workshop turn and return the full event trail.

    Week 1 hand-off is deliberately thin — we construct an ``AgentContext``,
    emit a canned PLAN decomposing "route → specialist → compose", invoke
    the existing in-process orchestrator (``services.chat.ChatService``)
    without further instrumentation, and seal the turn with a ``response``
    event carrying the orchestrator's final text.

    The hooks for panels #1-11 are already in place — the AgentContext is
    threaded through the orchestrator call site in Week 2 so each
    specialist's DB / LLM / Gateway call produces a real panel event
    instead of being invisible.
    """
    session_id = payload.session_id or f"ws-{uuid.uuid4().hex[:12]}"
    customer_id = payload.customer_id or "anonymous"

    ctx = AgentContext(
        session_id=session_id,
        customer_id=customer_id,
        query=payload.query.strip(),
    )

    # Week 1 stub plan. The real decomposition lands in Week 4 when the
    # orchestrator runs a Haiku intent-parse and emits LLM · HAIKU · INTENT
    # before fanning out to specialists.
    ctx.emit_plan(
        steps=[
            "Parse intent",
            "Route to specialist",
            "Compose response",
        ],
        duration_ms=0,
        title="Plan",
    )
    ctx.step_active(0)

    # Invoke the existing ChatService path. Wrapped in a broad try/except
    # so Week 1 always returns a valid events list even if the
    # orchestrator trips over a config gap (missing AGENTCORE_MEMORY_ID,
    # etc.) — the frontend can then render the error as the response text
    # instead of a 5xx breaking the replay.
    try:
        # Import here rather than at module top so the router can load
        # even when the chat service's Strands dependencies aren't yet
        # installed in the test environment.
        from services.chat import ChatService
        from app import db_service  # populated by lifespan startup

        if db_service is None:
            raise RuntimeError("Database service not initialised")

        chat_service = ChatService(db_service=db_service)
        result = await chat_service.generate_response(
            message=ctx.query,
            conversation_history=None,
            session_id=ctx.session_id,
            guardrails_enabled=False,
            use_agents=True,
        )

        ctx.step_done(0)
        ctx.step_active(1)
        ctx.step_done(1)
        ctx.step_active(2)

        response_text = result.get("response") or "(no response)"
        ctx.emit_response(text=response_text, confidence=None)
        ctx.step_done(2)

    except Exception as exc:
        logger.exception("Workshop turn failed: %s", exc)
        ctx.emit_response(
            text=f"Workshop turn failed: {exc.__class__.__name__}: {exc}",
            confidence=None,
        )

    return WorkshopQueryResponse(
        session_id=ctx.session_id,
        events=ctx.events,
    )
