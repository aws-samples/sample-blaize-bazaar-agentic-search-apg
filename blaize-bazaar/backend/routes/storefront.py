"""``/api/storefront/*`` — concierge briefing + pulse bar.

Two small GET endpoints that power the storefront's "premium agentic"
chrome (see the pre-Week-3 enhancement plan):

- ``GET /api/storefront/briefing`` — shift-handover greeting for the
  concierge modal's empty state. Time-of-day greeting, first-person
  line with cited chips, and 3 action buttons that pre-compose the
  next concierge query.

- ``GET /api/storefront/pulse`` — 4 ambient metrics rendered above the
  hero. Each metric carries a ``source`` tag (``real`` / ``stub`` /
  ``partial``) so the frontend can render an honest "data source" dot.
  Stub fields light up for free when Week 5 (tool_audit writes) and
  Week 6 (evaluation_results) land.

Design rule: **never 5xx**. Both endpoints catch at the service boundary
and return structured fallbacks so the homepage chrome always renders.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from services.auth import get_current_user
from services.embeddings import get_cache_stats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storefront", tags=["storefront"])


# ---------------------------------------------------------------------------
# Shapes
# ---------------------------------------------------------------------------


SourceTag = Literal["real", "stub", "partial"]


class BriefingChip(BaseModel):
    label: str
    kind: Literal["stat", "product", "category"]
    meaning: Optional[str] = None
    product_id: Optional[str] = None
    source: SourceTag = "real"


class BriefingAction(BaseModel):
    id: str
    label: str
    primary: bool = False


class BriefingResponse(BaseModel):
    greeting: str
    line: str
    chips: list[BriefingChip] = Field(default_factory=list)
    actions: list[BriefingAction] = Field(default_factory=list)
    generated_at: str


class PulseMetric(BaseModel):
    id: str
    label: str
    primary: str
    secondary: str
    source: SourceTag


class PulseResponse(BaseModel):
    metrics: list[PulseMetric]
    generated_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _time_of_day_greeting(now: datetime, given_name: Optional[str]) -> str:
    """Return "Good {morning|afternoon|evening|night}, {name}." with sensible
    anonymous fallback. Local time is inferred from ``now`` — the caller can
    pass a naive datetime in server local time (tests) or a tz-aware UTC
    datetime (prod; we convert).

    Cutoffs match conventional English use:
        05:00 – 11:59  morning
        12:00 – 16:59  afternoon
        17:00 – 21:59  evening
        otherwise      night
    """
    hour = now.hour
    if 5 <= hour < 12:
        phase = "morning"
    elif 12 <= hour < 17:
        phase = "afternoon"
    elif 17 <= hour < 22:
        phase = "evening"
    else:
        phase = "night"

    if given_name:
        return f"Good {phase}, {given_name}."
    return f"Good {phase}."


def _extract_given_name(user: Optional[dict]) -> Optional[str]:
    """Pull a display name from the Cognito claim envelope.

    ``get_current_user`` today returns ``{sub, email}``; we derive a
    best-effort first name from the email local-part when no given_name
    claim is plumbed through (Week 4 will widen the claim set — update
    here when it does).
    """
    if not user:
        return None
    given = user.get("given_name")
    if given:
        return str(given).strip() or None
    email = user.get("email")
    if not email or email == "anonymous":
        return None
    local = email.split("@", 1)[0]
    # Strip digits and punctuation, title-case. "shayon.s+blaize" -> "Shayon".
    for sep in (".", "+", "_", "-"):
        local = local.split(sep, 1)[0]
    cleaned = "".join(ch for ch in local if ch.isalpha())
    return cleaned.title() if cleaned else None


async def _catalog_snapshot(db_service: Any) -> dict[str, Any]:
    """Return real catalog counts used by both briefing and pulse.

    Keys: ``product_count``, ``category_count``, ``bestseller_pick``
    (dict or None). All safe under the "never 5xx" contract — any
    failure returns a zeros-shape payload with an ``error`` key so
    callers can still render and log.
    """
    fallback = {
        "product_count": 0,
        "category_count": 0,
        "bestseller_pick": None,
        "error": None,
    }
    try:
        row = await db_service.fetch_one(
            "SELECT COUNT(*) AS n, COUNT(DISTINCT category_name) AS c "
            "FROM blaize_bazaar.product_catalog"
        )
        fallback["product_count"] = int(row["n"] or 0) if row else 0
        fallback["category_count"] = int(row["c"] or 0) if row else 0

        pick = await db_service.fetch_one(
            'SELECT "productId", product_description, category_name '
            "FROM blaize_bazaar.product_catalog "
            'WHERE "isBestSeller" = true '
            "ORDER BY stars DESC NULLS LAST, reviews DESC NULLS LAST "
            "LIMIT 1"
        )
        if pick:
            fallback["bestseller_pick"] = {
                "product_id": str(pick["productId"]).strip(),
                "description": str(pick["product_description"]).strip(),
                "category": str(pick["category_name"]).strip(),
            }
    except Exception as exc:
        fallback["error"] = str(exc)
        logger.warning("catalog snapshot failed: %s", exc)
    return fallback


async def _preference_summary(db_service: Any, sub: Optional[str]) -> Optional[str]:
    """Fetch ``customers.preferences_summary`` for the signed-in user.

    The ``customers`` table is seeded in migration 001; signed-in
    visitors whose sub isn't in that table get ``None`` (briefing
    falls back to the generic line). Never raises.
    """
    if not sub:
        return None
    try:
        row = await db_service.fetch_one(
            "SELECT preferences_summary FROM customers WHERE id = %s", sub
        )
        if row and row.get("preferences_summary"):
            return str(row["preferences_summary"]).strip() or None
    except Exception as exc:
        logger.warning("preferences_summary fetch failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/briefing", response_model=BriefingResponse)
async def briefing(
    user: Optional[dict] = Depends(get_current_user),
) -> BriefingResponse:
    """Shift-handover greeting for the concierge modal's empty state.

    Signed-in flow: time-of-day greeting with first name, line pulls
    catalog + preferences. Anonymous flow: generic but warm.

    Always returns 200. Downstream DB errors degrade to a safe copy.
    """
    from app import db_service  # lazy, matches routes/workshop.py pattern

    now = datetime.now(tz=timezone.utc).astimezone()
    given_name = _extract_given_name(user)
    greeting = _time_of_day_greeting(now, given_name)

    snapshot = (
        await _catalog_snapshot(db_service)
        if db_service is not None
        else {"product_count": 0, "category_count": 0, "bestseller_pick": None}
    )
    pref = await _preference_summary(db_service, user.get("sub") if user else None)

    chips: list[BriefingChip] = []
    line_parts: list[str] = []

    # Opening clause — anchored to real catalog size so the number is
    # never fabricated.
    if snapshot["product_count"] > 0:
        line_parts.append(
            f"I've been watching the boutique — {snapshot['product_count']} "
            f"products across {snapshot['category_count']} categories."
        )
        chips.append(
            BriefingChip(
                label=str(snapshot["product_count"]),
                kind="stat",
                meaning="products in catalog",
                source="real",
            )
        )
    else:
        line_parts.append("I've been watching the boutique.")

    pick = snapshot.get("bestseller_pick")
    if pick:
        short_name = pick["description"].split(",", 1)[0].strip()
        # Keep the chip label short enough to sit inline.
        if len(short_name) > 48:
            short_name = short_name[:45].rstrip() + "…"
        line_parts.append(
            f"Today's standout: {short_name} in {pick['category']}."
        )
        chips.append(
            BriefingChip(
                label=short_name,
                kind="product",
                product_id=pick["product_id"],
                source="real",
            )
        )

    if pref:
        line_parts.append(
            f"From what I know of you, {pref.split('.')[0].strip()}."
        )

    # Stubbed until Week 5 tool_audit writes land. The chip is visible
    # with a ``stub`` source so attendees see the scaffolding honestly.
    chips.append(
        BriefingChip(
            label="pre-vetted picks",
            kind="stat",
            meaning="grounded by fact-check",
            source="stub",
        )
    )

    actions = [
        BriefingAction(
            id="show_picks",
            label="Show me today's picks",
            primary=True,
        ),
        BriefingAction(
            id="whats_new",
            label="What's new since my last visit",
        ),
        BriefingAction(
            id="why_these",
            label="Why did the agent pick these?",
        ),
    ]

    return BriefingResponse(
        greeting=greeting,
        line=" ".join(line_parts),
        chips=chips,
        actions=actions,
        generated_at=now.isoformat(timespec="seconds"),
    )


@router.get("/pulse", response_model=PulseResponse)
async def pulse() -> PulseResponse:
    """Four ambient metrics. Always 200; stub fields light up when
    Week 5+ data sources land.
    """
    from app import db_service

    now = datetime.now(tz=timezone.utc).astimezone()
    snapshot = (
        await _catalog_snapshot(db_service)
        if db_service is not None
        else {"product_count": 0, "category_count": 0}
    )

    cache_stats = get_cache_stats()
    cost_usd = float(cache_stats.get("total_embedding_cost_usd", 0.0) or 0.0)
    total_calls = int(cache_stats.get("total_requests", 0) or 0)

    metrics = [
        PulseMetric(
            id="catalog",
            label="Catalog",
            primary=f"{snapshot['product_count']} products",
            secondary=(
                f"{snapshot['category_count']} categories · browse ready"
                if snapshot["product_count"] > 0
                else "loading…"
            ),
            source="real",
        ),
        PulseMetric(
            id="agent_activity",
            label="Agent activity",
            primary="— grounded picks",
            secondary="lights up Week 5 (tool_audit)",
            source="stub",
        ),
        PulseMetric(
            id="your_picks",
            label="Your picks",
            primary="pre-vetted",
            secondary="tap the chat to see",
            source="stub",
        ),
        PulseMetric(
            id="cost",
            label="Cost today",
            primary=f"${cost_usd:.4f}",
            secondary=f"{total_calls} embedding calls · process-scoped",
            source="partial",
        ),
    ]

    return PulseResponse(
        metrics=metrics, generated_at=now.isoformat(timespec="seconds")
    )
