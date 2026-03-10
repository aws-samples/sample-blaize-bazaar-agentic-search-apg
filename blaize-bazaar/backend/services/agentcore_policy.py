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
        """Check a single policy against parameters."""
        pid = policy["id"]

        if pid == "max-restock-quantity":
            qty = params.get("quantity", 0)
            if isinstance(qty, (int, float)) and qty > 500:
                return {
                    "policy_id": pid,
                    "policy_name": policy["name"],
                    "reason": f"Restock quantity {qty} exceeds maximum of 500 units",
                    "cedar_condition": "resource.quantity > 500",
                }

        elif pid == "restrict-categories":
            query = str(params.get("query", "")).lower()
            found = RESTRICTED_WORDS & set(re.findall(r'\w+', query))
            if found:
                return {
                    "policy_id": pid,
                    "policy_name": policy["name"],
                    "reason": f"Query contains restricted terms: {', '.join(sorted(found))}",
                    "cedar_condition": 'resource.query like "*<term>*"',
                }

        elif pid == "price-ceiling":
            price = params.get("price", 0)
            if isinstance(price, (int, float)) and price > 10000:
                return {
                    "policy_id": pid,
                    "policy_name": policy["name"],
                    "reason": f"Price ${price:,.2f} exceeds ceiling of $10,000",
                    "cedar_condition": "resource.price > 10000",
                }

        return None


# Singleton
_policy_service: Optional[PolicyService] = None


def get_policy_service() -> PolicyService:
    global _policy_service
    if _policy_service is None:
        _policy_service = PolicyService()
    return _policy_service
