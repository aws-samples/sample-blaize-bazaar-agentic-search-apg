"""Regression coverage for customer boundaries and durable workshop evidence."""
import asyncio
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import observatory, workshop
from services.auth import get_current_user
from services.agentcore_identity import AgentCoreIdentityService
from services.governed_turn_receipt import _trace_metadata


@pytest.mark.parametrize("principal,status", [
    (None, 401),
    ({"sub": "verified-marco", "username": "marco"}, 403),
    ({"sub": "unmapped", "username": "unmapped"}, 403),
])
def test_customer_memory_and_resume_reject_before_reading(principal, status, monkeypatch):
    api = FastAPI()
    api.include_router(observatory.router)
    api.include_router(workshop.router)
    api.dependency_overrides[get_current_user] = lambda: principal

    async def no_database():
        pytest.fail("an unauthorized request reached the database")

    monkeypatch.setattr(observatory, "_live_db", no_database)
    client = TestClient(api)
    assert client.get("/api/observatory/memory/theo").status_code == status
    assert client.post("/api/observatory/resume", json={"customer_id": "CUST-THEO"}).status_code == status
    assert client.post("/api/observatory/query", json={
        "customer_id": "CUST-THEO", "query": "Read this customer's history",
    }).status_code == status


def test_memory_dashboard_uses_authenticated_writer_namespace(monkeypatch):
    class DB:
        async def fetch_one(self, sql, *params):
            assert params == ("verified-theo", "verified-theo")
            return {"session_id": "persona-theo-abc"}

    namespace = asyncio.run(AgentCoreIdentityService.latest_shopper_namespace(DB(), "verified-theo"))
    assert namespace == AgentCoreIdentityService.build_namespace("verified-theo", "persona-theo-abc")
    captured = []
    from services.agentcore_memory import AgentCoreMemory

    async def preferences(self, actor_id):
        captured.append(actor_id)
        return ["Prefers blue linen"]

    monkeypatch.setattr(AgentCoreMemory, "get_semantic_memories", preferences)
    rows = asyncio.run(observatory._load_live_semantic("theo", namespace=namespace))
    assert rows[0]["content"] == "Prefers blue linen"
    assert captured == [namespace]
    assert asyncio.run(observatory._load_live_semantic("theo")) == []


@pytest.mark.parametrize("result,expected", [
    ({"error": "timeout"}, "failed"),
    ({"success": False}, "failed"),
    ({"status": "denied"}, "denied"),
    ({"success": True}, "succeeded"),
    ({"rows": []}, "unavailable"),
    (None, "unavailable"),
])
def test_audit_outcome_never_invents_success(result, expected):
    assert observatory._audit_result_status(result) == expected


def test_memory_receipt_survives_projection_without_content():
    memory = {
        "source": "agentcore-memory", "turns_loaded": 2, "turns_persisted": 2,
        "read_status": "succeeded", "write_status": "succeeded",
        "namespace_scope": "verified-principal", "conversation": "private content",
    }
    projected = _trace_metadata({"memory": memory})["memory"]
    assert projected["turns_loaded"] == 2
    assert projected["write_status"] == "succeeded"
    assert "conversation" not in projected
    assert "memory" not in _trace_metadata({"memory": None})


def test_publishing_ticket_history_also_installs_ownership(monkeypatch):
    sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts/deploy"))
    import render_agentcore_project as renderer

    published = renderer.workshop_target_tools()
    published[renderer.EXPERIENCE_TARGET] = [
        *published[renderer.EXPERIENCE_TARGET], "get_ticket_history", "issue_credit", "future_tool",
    ]
    monkeypatch.setattr(renderer, "workshop_target_tools", lambda: published)
    policies = {item["name"]: item["statement"] for item in renderer.baseline_policies()}
    permit = policies["baseline_permit_workshop_tools"]
    assert "___get_ticket_history" not in permit
    owned_permit = policies["get_ticket_history_permit_owner"]
    assert owned_permit.startswith("permit")
    assert "when {" in owned_permit
    assert 'context.input.customer_id == "CUST-THEO"' in owned_permit
    assert "___issue_credit" not in permit
    assert "___future_tool" not in permit
    scope = policies["get_ticket_history_identity_scope"]
    assert scope.startswith("forbid")
    assert "___get_ticket_history" in scope
    assert 'principal.hasTag("username")' in scope
    assert "context.input has customer_id" in scope
    assert 'principal.getTag("username") == "theo"' in scope
    assert 'context.input.customer_id == "CUST-THEO"' in scope
