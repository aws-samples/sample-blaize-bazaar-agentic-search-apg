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


# ----- /api/workshop/tool-registry ---------------------------------------
# Card 7 dual-ranking fetch. The frontend opens Card 7, passes a demo
# query (defaulted if omitted), and gets back { pgvector_rows, gateway }
# so the modal renders Aurora and Gateway side-by-side. Gateway-unset is
# a first-class response shape — ``gateway.configured = false`` — rather
# than a quiet empty list, because the teaching point is *seeing* the
# single-source fallback, not guessing why it's empty.


class ToolRegistryQuery(BaseModel):
    query: str = Field(
        default="show me something for long summer walks",
        description="Demo query for the Card 7 dual-ranking fetch. Workshop "
        "attendees can override via the Card 7 input field.",
        min_length=1,
    )
    limit: int = Field(default=3, ge=1, le=9)


@router.post("/tool-registry")
async def tool_registry(payload: ToolRegistryQuery) -> dict[str, Any]:
    """Dual-rank tool discovery for Card 7.

    Returns:
        {
          "query": str,
          "pgvector": {
            "rows": [ {name, description, similarity}, ... ],
            "duration_ms": int,
            "total_count": int,
            "error": str | None,
          },
          "gateway": {
            "configured": bool,
            "url": str | None,
            "tools": [ {name, description, input_schema}, ... ],
            "error": str | None,
          }
        }
    """
    from services.embeddings import EmbeddingService
    from services.tool_registry import discover_tools
    from app import db_service  # lifespan-initialised

    if db_service is None:
        raise HTTPException(status_code=503, detail="Database not ready")  # copy-allow: http-error-detail

    # Aurora side — always runs.
    pgvector_block: dict[str, Any]
    try:
        emb = EmbeddingService().embed_query(payload.query)
        pgv = await discover_tools(db_service, emb, limit=payload.limit)
        pgvector_block = {
            "rows": pgv["rows"],
            "duration_ms": pgv["duration_ms"],
            "total_count": pgv["total_count"],
            "error": pgv.get("error"),
        }
    except Exception as exc:
        logger.warning("Card 7 pgvector fetch failed: %s", exc)
        pgvector_block = {
            "rows": [],
            "duration_ms": 0,
            "total_count": 0,
            "error": str(exc),
        }

    # Gateway side — reports "not configured" as a first-class state.
    from config import settings

    gateway_block: dict[str, Any] = {
        "configured": bool(settings.AGENTCORE_GATEWAY_URL),
        "url": settings.AGENTCORE_GATEWAY_URL,
        "tools": [],
        "error": None,
    }
    if gateway_block["configured"]:
        try:
            from services.agentcore_gateway import list_gateway_tools

            gateway_block["tools"] = list_gateway_tools()
        except Exception as exc:
            gateway_block["error"] = str(exc)
            logger.warning("Card 7 gateway list failed: %s", exc)

    return {
        "query": payload.query,
        "pgvector": pgvector_block,
        "gateway": gateway_block,
    }


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

        # --- Week 2: Card 7 shadow-mode discovery panels -----------------
        # Embed the turn once, run Tool Registry (Aurora) + Gateway panel
        # emitters against the same vector / prompt. Failures here are
        # logged and swallowed — discovery is a teaching overlay, it must
        # never break the user-facing turn.
        try:
            from services.embeddings import EmbeddingService
            from services.episodic_memory import emit_memory_episodic_panel
            from services.workshop_panels import (
                emit_gateway_panel,
                emit_tool_registry_panel,
            )

            emb_service = EmbeddingService()
            # EmbeddingService.embed_query is sync; it's cached and small,
            # so a direct call from the async handler is fine. Wrapping
            # in to_thread would add latency without an ergonomic win.
            turn_embedding = emb_service.embed_query(ctx.query)
            # Episodic panel fires first so MEMORY · EPISODIC anchors
            # the trace at index 1 — matches the teaching flow
            # "who are you? → what do we know? → what can we use?".
            await emit_memory_episodic_panel(ctx, db_service=db_service)
            await emit_tool_registry_panel(
                ctx, db_service=db_service, query_embedding=turn_embedding
            )
            emit_gateway_panel(ctx, query_text=ctx.query)
        except Exception as panel_exc:  # pragma: no cover - teaching overlay
            logger.warning("Card 7 panel emission failed: %s", panel_exc)
        # -----------------------------------------------------------------

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


# ----- /api/workshop/resume ---------------------------------------------
# The "welcome-back" turn. Fired by the Atelier chat when the user
# picks a seeded demo customer and no session_id exists yet. Emits
# three cohesive panels — MEMORY · EPISODIC, MEMORY · PREFERENCES,
# MEMORY · PROCEDURAL — plus a composed response text the chat
# column renders as the first assistant reply.
#
# Separate from /query so the frontend can auto-fire it on customer
# change without the user typing a pseudo-query, and so the backend
# doesn't have to branch on a sentinel query string. Same response
# shape as /query, so the frontend renderer is shared.


class WorkshopResumeRequest(BaseModel):
    """Body of ``POST /api/workshop/resume``.

    Anonymous callers get a 400 — the resume turn is specifically the
    "welcome-back for a known demo customer" surface. The chat column
    never fires this for anonymous.
    """

    customer_id: str = Field(
        ...,
        min_length=1,
        description="Seeded demo customer id (e.g. 'CUST-0001').",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional — resume into an existing session if the chat already has one.",
    )


def _compose_resume_text(
    customer_name: str,
    preferences_summary: Optional[str],
    latest_episode: Optional[str],
    cohort_top_product: Optional[str],
) -> str:
    """Build the welcome-back assistant text deterministically.

    No LLM call — this is the teaching moment about continuity, not
    about generation. The text quotes the three memory reads so the
    attendee can map each clause to the panel that sourced it.
    """
    first_name = customer_name.split(" ", 1)[0] if customer_name else "there"
    parts = [f"Welcome back, {first_name}."]
    if latest_episode:
        parts.append(f"Last time: {latest_episode}")
    if preferences_summary:
        parts.append(f"Your preferences on file: {preferences_summary}")
    if cohort_top_product:
        parts.append(
            f"Customers with a similar history recently picked up {cohort_top_product}."
        )
    parts.append("Want to pick that thread up, or start somewhere new?")
    return " ".join(parts)


@router.post("/resume", response_model=WorkshopQueryResponse)
async def resume(payload: WorkshopResumeRequest) -> WorkshopQueryResponse:
    """Replay the three MEMORY panels + emit a welcome-back response.

    Panel order mirrors the teaching flow — EPISODIC first ("who are
    you?"), PREFERENCES next ("what do we know?"), PROCEDURAL last
    ("what might we suggest?"). The composed response text references
    all three so the trace reads end-to-end.
    """
    customer_id = payload.customer_id.strip()
    if customer_id == "anonymous" or not customer_id:
        raise HTTPException(  # copy-allow: http-error-detail
            status_code=400,
            detail="resume requires a seeded customer_id",
        )

    session_id = payload.session_id or f"ws-{uuid.uuid4().hex[:12]}"
    ctx = AgentContext(
        session_id=session_id,
        customer_id=customer_id,
        query="(resumed session)",
    )

    ctx.emit_plan(
        steps=["Recall", "Summarize", "Offer"],
        duration_ms=0,
        title="Resume",
    )
    ctx.step_active(0)

    try:
        from services.episodic_memory import (
            emit_memory_episodic_panel,
            emit_memory_preferences_panel,
            emit_memory_procedural_panel,
        )
        from app import db_service  # populated by lifespan startup

        if db_service is None:
            raise RuntimeError("Database service not initialised")

        episodes = await emit_memory_episodic_panel(ctx, db_service=db_service)
        ctx.step_done(0)
        ctx.step_active(1)

        prefs_row = await emit_memory_preferences_panel(ctx, db_service=db_service)
        cohort = await emit_memory_procedural_panel(ctx, db_service=db_service)
        ctx.step_done(1)
        ctx.step_active(2)

        latest_episode = (
            episodes[0]["summary_text"].rstrip(".") if episodes else None
        )
        preferences_summary = (
            (prefs_row or {}).get("preferences_summary") if prefs_row else None
        )
        customer_name = (prefs_row or {}).get("name", customer_id) if prefs_row else customer_id
        cohort_top_product = cohort[0].get("name") if cohort else None

        text = _compose_resume_text(
            customer_name=customer_name,
            preferences_summary=preferences_summary,
            latest_episode=latest_episode,
            cohort_top_product=cohort_top_product,
        )
        ctx.emit_response(text=text, confidence=None)
        ctx.step_done(2)

    except Exception as exc:
        logger.exception("Workshop resume failed: %s", exc)
        ctx.emit_response(
            text=f"Workshop resume failed: {exc.__class__.__name__}: {exc}",
            confidence=None,
        )

    return WorkshopQueryResponse(
        session_id=ctx.session_id,
        events=ctx.events,
    )
