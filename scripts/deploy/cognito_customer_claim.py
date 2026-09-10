"""Cognito pre-token-generation trigger (V2_0): stamp the shopper's customer claim.

Adds ``custom:customer_id`` to the ACCESS token of an authenticated shopper,
read from a server-controlled map keyed by the Cognito subject. The Gateway
validates the access token and AgentCore Policy exposes its claims as
principal tags, so a Cedar rule can bind the verified identity to a tool's
``customer_id`` input without naming individual shoppers.

What this deliberately never does:

* read ``clientMetadata`` or any attribute a shopper can write. The only input
  is the subject Cognito already authenticated, looked up in a map that
  deployment administration rendered from ``pellier.principal_customers``;
* add a claim for a subject the map does not know. A staff account or an
  unmapped user simply has no customer claim, and every claim-scoped Cedar
  rule fails closed on ``principal.hasTag``;
* imply authority. The claim says which customer the principal *is*. Whether
  that customer owns an order, may return it, or may act at all is decided by
  Cedar, the tool, and Aurora, in that order.

V2_0 runs on sign-in and on token refresh, so a refreshed access token carries
the same claim. The user pool must be on the Essentials or Plus feature plan
for access-token customization; ``deploy_customer_claim_trigger.py`` checks.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CLAIM_NAME = "custom:customer_id"
MAP_ENV = "CUSTOMER_CLAIM_MAP"
_CUSTOMER_ID = re.compile(r"^CUST-[A-Z0-9-]{1,40}$")


def _mapping() -> Dict[str, str]:
    raw = os.environ.get(MAP_ENV, "").strip()
    if not raw:
        return {}
    try:
        loaded = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("%s is not JSON; issuing no customer claims", MAP_ENV)
        return {}
    return {
        str(sub): str(customer)
        for sub, customer in loaded.items()
        if isinstance(sub, str) and isinstance(customer, str)
    }


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    request = event.get("request") or {}
    attributes = request.get("userAttributes") or {}
    sub = str(attributes.get("sub") or "").strip()
    customer_id = _mapping().get(sub, "")
    response = event.setdefault("response", {})
    if not sub or not customer_id:
        logger.info("no customer claim for trigger=%s", event.get("triggerSource"))
        return event
    if not _CUSTOMER_ID.fullmatch(customer_id):
        logger.error("refusing malformed customer id for subject %s", sub[:8])
        return event
    response["claimsAndScopeOverrideDetails"] = {
        "accessTokenGeneration": {
            "claimsToAddOrOverride": {CLAIM_NAME: customer_id},
        },
    }
    logger.info(
        "customer claim issued trigger=%s customer=%s",
        event.get("triggerSource"),
        customer_id,
    )
    return event
