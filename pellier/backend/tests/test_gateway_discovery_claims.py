"""Publication is not visibility.

AgentCore Gateway evaluates Cedar on MCP tool discovery, so `list_tools` returns
the subset the calling token could be permitted to invoke. Measured live on the
release-candidate Gateway on 2026-09-10:

    shopper token (customer claim, no staff scope)   14 of 15 published
    staff token   (staff scope, no customer claim)   13 of 15 published

The first run after `issue_credit` was published failed provisioning, because the
deploy compared a shopper's listing against the whole catalogue and read a working
staff-only boundary as a missing tool. These tests pin the model that replaced it.
"""

from __future__ import annotations

import os
import pathlib
import sys

sys.path.insert(0, os.path.abspath("../../scripts/deploy"))

from gateway_tool_schemas import (  # noqa: E402
    OWNER_SCOPED_GATEWAY_TOOLS,
    STAFF_ONLY_GATEWAY_TOOLS,
    discoverable_tools_for_claims,
    workshop_published_tools,
)

REPO = pathlib.Path(__file__).resolve().parents[3]


def test_a_shopper_cannot_discover_the_staff_only_tool() -> None:
    visible = discoverable_tools_for_claims(
        has_staff_scope=False, has_customer_claim=True
    )
    assert "issue_credit" not in visible
    assert visible == workshop_published_tools() - STAFF_ONLY_GATEWAY_TOOLS


def test_a_staff_token_without_a_customer_mapping_loses_the_owner_scoped_reads() -> None:
    visible = discoverable_tools_for_claims(
        has_staff_scope=True, has_customer_claim=False
    )
    assert "issue_credit" in visible
    assert not (visible & OWNER_SCOPED_GATEWAY_TOOLS)


def test_no_claim_shape_can_discover_more_than_is_published() -> None:
    published = workshop_published_tools()
    for staff in (True, False):
        for owner in (True, False):
            visible = discoverable_tools_for_claims(
                has_staff_scope=staff, has_customer_claim=owner
            )
            assert visible <= published


def test_both_claims_together_see_every_published_tool() -> None:
    """The operator desk carries both, and it must not be missing a capability."""
    visible = discoverable_tools_for_claims(
        has_staff_scope=True, has_customer_claim=True
    )
    assert visible == workshop_published_tools()


def test_the_backend_staff_only_set_matches_the_published_schema() -> None:
    """Two copies of one governance fact, on opposite sides of a package boundary."""
    from services.agentcore_gateway import STAFF_ONLY_GATEWAY_TOOLS as backend_set

    assert backend_set == STAFF_ONLY_GATEWAY_TOOLS


def test_the_provisioner_shapes_its_expectation_from_the_caller_claims() -> None:
    """A count check that ignores the caller is the bug this replaced."""
    source = (REPO / "scripts" / "provision_agentcore_end_to_end.py").read_text(
        encoding="utf-8"
    )
    assert "discoverable_tools_for_claims(" in source
    assert "custom:staff_scope" in source
    assert "custom:customer_id" in source
    # And the listing still has to prove the boundary, not merely tolerate it.
    assert "Staff-only tools are discoverable by a non-staff token" in source
