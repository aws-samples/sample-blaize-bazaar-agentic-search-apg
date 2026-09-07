"""The Memory dashboard reads only the namespace authorized by its route.

Authenticated conversation namespaces must match the event writer. An absent
namespace must never fall back to a persona seed or anonymous conversation.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from routes import observatory as ao


def _run(coro: Any) -> Any:
    return asyncio.run(coro)


@pytest.fixture
def patch_memory(monkeypatch):
    """Patch ``AgentCoreMemory.get_session_history`` to return canned
    turns and capture the namespace it was asked for."""
    captured: dict = {}

    def _install(turns: list[dict], *, error: Exception | None = None):
        from services.agentcore_memory import AgentCoreMemory

        async def _fake_history(self, session_ns: str):
            captured["namespace"] = session_ns
            captured["strict"] = self._strict
            if error is not None:
                raise error
            return turns

        monkeypatch.setattr(AgentCoreMemory, "get_session_history", _fake_history)
        return captured

    return _install


def test_working_overlay_reads_the_authorized_writer_namespace(
    patch_memory,
) -> None:
    """The route's authorized namespace is passed unchanged to Memory."""
    captured = patch_memory([
        {"role": "user", "content": "What linen do you have for 10 days in Goa?"},
        {"role": "assistant", "content": "Here are four linen pieces."},
    ])

    items = _run(ao._load_live_working("marco", namespace="user-sub-marco-session-persona-marco-abc123"))

    assert items is not None
    assert len(items) == 2
    assert items[0]["substrate"] == "working"
    assert items[0]["content"].startswith("What linen")
    assert captured["namespace"] == "user-sub-marco-session-persona-marco-abc123"
    assert captured["strict"] is True


def test_working_overlay_does_not_read_without_authorized_namespace(
    patch_memory,
) -> None:
    captured = patch_memory([{"role": "user", "content": "private conversation"}])

    assert _run(ao._load_live_working("marco")) == []
    assert captured == {}


def test_working_overlay_returns_empty_when_history_empty(
    patch_memory,
) -> None:
    captured = patch_memory([])

    assert _run(ao._load_live_working("marco", namespace="user-sub-marco-session-abc")) == []
    assert captured["namespace"] == "user-sub-marco-session-abc"


def test_working_overlay_propagates_memory_unavailability(
    patch_memory,
) -> None:
    """An unavailable service must not appear to be an empty conversation."""
    patch_memory([], error=RuntimeError("memory unavailable"))
    with pytest.raises(RuntimeError, match="memory unavailable"):
        _run(ao._load_live_working("marco", namespace="user-sub-marco-session-abc"))


def test_working_overlay_returns_empty_for_unknown_persona(patch_memory) -> None:
    captured = patch_memory([{"role": "user", "content": "private conversation"}])
    assert _run(ao._load_live_working("nobody")) == []
    assert captured == {}
