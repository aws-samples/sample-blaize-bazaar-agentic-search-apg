"""
AgentCore Policy Service — Cedar-based policy evaluation for agent actions.

Provides local Cedar policy evaluation with default deny-list rules
for restricted categories, price ceilings, and restock limits.
"""
import logging
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Default Cedar policies
DEFAULT_POLICIES = [
    {
        "id": "max-restock-quantity",
        "name": "Maximum Restock Quantity",
        "description": "Prevent restocking more than 500 units at once",
        "cedar": (
            'forbid (\n'
            '  principal,\n'
            '  action == Action::"restock_product",\n'
            '  resource\n'
            ')\n'
            'when { resource.quantity > 500 };'
        ),
        "applies_to": "restock_product",
    },
    {
        "id": "restrict-categories",
        "name": "Restricted Categories",
        "description": "Block searches for weapons, tobacco, and alcohol",
        "cedar": (
            'forbid (\n'
            '  principal,\n'
            '  action == Action::"semantic_product_search",\n'
            '  resource\n'
            ')\n'
            'when {\n'
            '  resource.query like "*weapon*" ||\n'
            '  resource.query like "*tobacco*" ||\n'
            '  resource.query like "*alcohol*" ||\n'
            '  resource.query like "*gun*" ||\n'
            '  resource.query like "*ammunition*"\n'
            '};'
        ),
        "applies_to": "semantic_product_search",
    },
    {
        "id": "price-ceiling",
        "name": "Price Ceiling",
        "description": "Block price optimization above $10,000",
        "cedar": (
            'forbid (\n'
            '  principal,\n'
            '  action == Action::"set_price",\n'
            '  resource\n'
            ')\n'
            'when { resource.price > 10000 };'
        ),
        "applies_to": "set_price",
    },
]

RESTRICTED_WORDS = {"weapon", "weapons", "gun", "guns", "ammunition", "tobacco", "alcohol"}


class PolicyService:
    """Evaluate agent actions against Cedar policies (local engine)."""

    def __init__(self):
        self.policies = list(DEFAULT_POLICIES)
        logger.info(f"PolicyService initialized with {len(self.policies)} default policies")

    def list_policies(self) -> List[Dict[str, Any]]:
        return self.policies

    def evaluate(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate an action against all matching Cedar policies.

        Returns:
            {
                "decision": "ALLOW" | "DENY",
                "violations": [...],
                "matching_policies": [...],
            }
        """
        violations: List[Dict[str, Any]] = []
        matching_policies: List[str] = []

        for policy in self.policies:
            if policy["applies_to"] != action:
                continue

            matching_policies.append(policy["id"])
            violation = self._check_policy(policy, action, parameters)
            if violation:
                violations.append(violation)

        decision = "DENY" if violations else "ALLOW"
        return {
            "decision": decision,
            "action": action,
            "parameters": parameters,
            "violations": violations,
            "matching_policies": matching_policies,
            "policies_evaluated": len(matching_policies),
        }

    def _check_policy(
        self, policy: Dict[str, Any], action: str, params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        TODO (Module 4): Implement Cedar policy evaluation for a single policy.

        Check if the given action + parameters violate the policy.
        Return a violation dict if denied, or None if allowed.

        Steps:
            1. Get the policy ID: pid = policy["id"]
            2. For "max-restock-quantity":
               - Get qty from params.get("quantity", 0)
               - If qty > 500, return a violation dict:
                 {"policy_id": pid, "policy_name": policy["name"],
                  "reason": f"Restock quantity {qty} exceeds maximum of 500 units",
                  "cedar_condition": "resource.quantity > 500"}
            3. For "restrict-categories":
               - Get query from params, lowercase it
               - Check if any RESTRICTED_WORDS appear in the query
               - If found, return violation with the matched terms
            4. For "price-ceiling":
               - Get price from params
               - If price > 10000, return violation
            5. Return None if no violation

        Hints:
            - Use RESTRICTED_WORDS set for category checking
            - re.findall(r'\\w+', query) splits query into words for set intersection
            - Each violation dict needs: policy_id, policy_name, reason, cedar_condition

        ⏩ SHORT ON TIME? Run:
           cp solutions/module4/services/agentcore_policy.py blaize-bazaar/backend/services/agentcore_policy.py
        """
        # TODO: Your implementation here (~20 lines)
        return None


# Singleton
_policy_service: Optional[PolicyService] = None


def get_policy_service() -> PolicyService:
    global _policy_service
    if _policy_service is None:
        _policy_service = PolicyService()
    return _policy_service


# ============================================================================
# AgentCore Policy API — Natural Language Policy Creation
# ============================================================================

def create_policy_from_natural_language(
    gateway_id: str,
    policy_name: str,
    natural_language_rule: str,
    region: str = None,
) -> Dict[str, Any]:
    """
    Create an AgentCore Policy from a natural language description.

    AgentCore Policy automatically compiles natural language rules into
    Cedar policies and attaches them to the Gateway for real-time enforcement.
    This replaces the need to write Cedar syntax manually.

    Example natural language rules:
        - "Forbid restocking more than 500 units in a single operation"
        - "Allow all agents to search products but block weapons and tobacco"
        - "Only allow the inventory agent to call restock_product"

    Args:
        gateway_id: AgentCore Gateway ID to attach the policy to
        policy_name: Human-readable policy name
        natural_language_rule: Plain English description of the policy rule
        region: AWS region (defaults to settings.AWS_REGION)

    Returns:
        Dict with policy_id, cedar_statement, and status
    """
    import boto3
    from config import settings

    region = region or settings.AWS_REGION

    try:
        client = boto3.client("bedrock-agentcore-control", region_name=region)

        # Step 1: Create or get the policy engine for this gateway
        policy_engine_id = _get_or_create_policy_engine(client, gateway_id)

        # Step 2: Create the policy using natural language
        # AgentCore auto-compiles to Cedar
        response = client.create_policy(
            policyEngineId=policy_engine_id,
            name=policy_name,
            description=natural_language_rule,
            validationMode="FAIL_ON_ANY_FINDINGS",
            definition={
                "naturalLanguage": {
                    "statement": natural_language_rule,
                }
            },
        )

        policy_id = response.get("policyId", "")
        logger.info(f"✅ Policy created from natural language: {policy_id}")

        return {
            "policy_id": policy_id,
            "name": policy_name,
            "natural_language": natural_language_rule,
            "status": response.get("status", "CREATING"),
            "policy_engine_id": policy_engine_id,
        }

    except ImportError:
        logger.warning("boto3 not available for AgentCore Policy API")
        return {"error": "boto3 not available"}
    except Exception as e:
        logger.error(f"Failed to create NL policy: {e}")
        return {"error": str(e)}


def _get_or_create_policy_engine(client, gateway_id: str) -> str:
    """Get existing policy engine for a gateway, or create one."""
    try:
        # List existing policy engines
        response = client.list_policy_engines()
        for engine in response.get("policyEngines", []):
            if engine.get("gatewayId") == gateway_id:
                return engine["policyEngineId"]

        # Create new policy engine attached to the gateway
        response = client.create_policy_engine(
            name=f"blaize-bazaar-policy-engine",
            description="Policy engine for Blaize Bazaar agent actions",
            gatewayIdentifier=gateway_id,
        )
        engine_id = response["policyEngineId"]
        logger.info(f"✅ Policy engine created: {engine_id}")
        return engine_id

    except Exception as e:
        logger.error(f"Failed to get/create policy engine: {e}")
        raise
