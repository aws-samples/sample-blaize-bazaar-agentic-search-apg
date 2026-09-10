"""The Cedar identity rule, the token trigger, and the application must agree.

Identity reaches Cedar as a claim, not as a list of shoppers
------------------------------------------------------------
The Lab 4 rule compares the access token's ``custom:customer_id`` tag with the
tool's ``customer_id`` input. The claim is stamped by the Cognito pre-token
trigger from ``pellier.principal_customers``, which is also what row-level
security keys off, so the policy, the token, and the database share one
mapping and no policy file has to enumerate shoppers. An earlier version wrote
four username-to-customer pairs into the rule; that duplicated the application
mapping and failed open whenever the two drifted.

What is checked
---------------
* the starter and the reference name the same claim the trigger issues;
* the starter stays unsolved and gives nothing away;
* the reference is fail-closed for shoppers and scoped away from staff;
* both files target the same action and pin the Gateway by ARN placeholder;
* neither file names a shopper, a customer id, or the ID-token claim;
* the trigger's mapping source is the same table RLS uses.

Nothing here writes to either file. A validator that repaired the starter would
delete the exercise.
"""

from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

import pytest

from services.turn_identity import USERNAME_TO_CUSTOMER_ID

_REPO = pathlib.Path(__file__).resolve().parents[3]
STARTER = _REPO / "policies" / "workshop_identity_match_forbid.cedar"
TEMPLATE = _REPO / "workshop" / "starters" / "workshop_identity_match_forbid.cedar"
REFERENCE = _REPO / "solutions" / "the-concierge" / "policies" / "identity_match_forbid.cedar"
TRIGGER = _REPO / "scripts" / "deploy" / "cognito_customer_claim.py"
DEPLOYER = _REPO / "scripts" / "deploy" / "deploy_customer_claim_trigger.py"
ACTION = re.compile(r'action\s*==\s*AgentCore::Action::"([^"]+)"')
RESOURCE = 'resource == AgentCore::Gateway::"${PELLIER_GATEWAY_ARN}"'


def _trigger_claim_name() -> str:
    spec = importlib.util.spec_from_file_location("cognito_customer_claim", TRIGGER)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules["cognito_customer_claim"] = module
    spec.loader.exec_module(module)
    return module.CLAIM_NAME


def test_all_three_policy_files_exist() -> None:
    for path in (STARTER, TEMPLATE, REFERENCE):
        assert path.is_file(), f"missing: {path}"


def test_the_working_copy_starts_as_the_starter() -> None:
    assert STARTER.read_bytes() == TEMPLATE.read_bytes()


def test_both_files_compare_the_claim_the_trigger_issues() -> None:
    claim = _trigger_claim_name()
    for path in (STARTER, REFERENCE):
        text = path.read_text()
        assert f'principal.hasTag("{claim}")' in text, path.name
    assert f'principal.getTag("{claim}") == context.input.customer_id' in REFERENCE.read_text()


def test_the_participant_starter_is_still_unsolved() -> None:
    starter = STARTER.read_text()
    assert re.search(r"unless\s*\{\s*false\s*\}", starter), (
        "the participant starter must ship with `unless { false }`; it currently "
        "contains something else, so either the exercise was solved in place or "
        "the fail-closed shape was lost."
    )
    assert "getTag(" not in starter, "the starter must not carry the comparison"


def test_neither_file_names_a_shopper_or_a_customer() -> None:
    for path in (STARTER, REFERENCE):
        text = path.read_text()
        for username, customer_id in USERNAME_TO_CUSTOMER_ID.items():
            assert f'"{username}"' not in text, f"{path.name} names {username!r}"
            assert customer_id not in text, f"{path.name} names {customer_id!r}"
        assert 'getTag("username")' not in text, path.name


def test_the_reference_is_fail_closed_for_shoppers_and_scoped_away_from_staff() -> None:
    reference = REFERENCE.read_text()
    assert re.search(
        r'when\s*\{\s*principal\.hasTag\("custom:customer_id"\)\s*\}', reference
    ), "the forbid must apply only to principals carrying a customer claim"
    assert "context.input has customer_id" in reference, (
        "a request with no customer_id must be denied rather than compared "
        "against an absent field."
    )
    assert "custom:staff_scope" not in reference, "staff authority is a permit, not a carve-out"


def test_both_files_target_the_same_action_and_pin_the_gateway() -> None:
    starter_action = ACTION.search(STARTER.read_text())
    reference_action = ACTION.search(REFERENCE.read_text())
    assert starter_action and reference_action
    assert starter_action.group(1) == reference_action.group(1)
    for path in (STARTER, REFERENCE):
        text = path.read_text()
        assert "principal is AgentCore::OAuthUser" in text, path.name
        assert RESOURCE in text, path.name
        assert "resource is AgentCore::Gateway" not in text, path.name


def test_the_claim_is_on_the_access_token_not_the_id_token() -> None:
    """`cognito:username` is on the ID token; the Gateway validates the access token."""
    for path in (STARTER, REFERENCE):
        assert "cognito:username" not in path.read_text(), path.name


def test_the_trigger_maps_subjects_from_the_row_level_security_table() -> None:
    deployer = DEPLOYER.read_text()
    assert "FROM pellier.principal_customers" in deployer
    trigger = TRIGGER.read_text()
    assert "clientMetadata" not in trigger.split("def handler", 1)[1]


@pytest.mark.parametrize("path", [STARTER, REFERENCE])
def test_no_file_carries_an_account_specific_arn(path: pathlib.Path) -> None:
    assert not re.search(r"arn:aws:bedrock-agentcore:[a-z0-9-]+:\d{12}:", path.read_text()), path.name
