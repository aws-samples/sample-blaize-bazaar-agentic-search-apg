#!/usr/bin/env python3
"""Deploy the customer-claim pre-token trigger onto the workshop user pool.

Idempotent. Creates or updates:

1. an execution role with basic Lambda logging only;
2. the ``cognito_customer_claim`` function, whose ``CUSTOMER_CLAIM_MAP`` is
   rendered from ``pellier.principal_customers`` over the RDS Data API, so
   the token claim and the row-level-security mapping come from one table;
3. the invoke permission for this pool; and
4. the pool's ``PreTokenGenerationConfig`` at ``LambdaVersion=V2_0``.

Step 4 is the delicate one. ``UpdateUserPool`` replaces the pool's mutable
settings wholesale: an omitted optional attribute is reset to its default.
Every current setting is therefore read back and passed through unchanged,
with only ``LambdaConfig`` merged.

Run from the repo root with the backend ``.env`` (or the box environment)
providing ``COGNITO_POOL_ID``, ``DB_CLUSTER_ARN`` and ``DB_SECRET_ARN``:

    pellier/backend/.venv/bin/python scripts/deploy/deploy_customer_claim_trigger.py

``--mapping-json`` bypasses the database read for a rehearsal without a
reachable cluster; it must still be a subject-to-customer map.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

DEPLOY = Path(__file__).resolve().parent
REPO = DEPLOY.parents[1]
sys.path.insert(0, str(DEPLOY))

from gateway_initiate_return import _load_env, _require  # noqa: E402

FUNCTION_NAME = "pellier-cognito-customer-claim"
ROLE_NAME = "pellier-cognito-customer-claim-role"
HANDLER_FILE = DEPLOY / "cognito_customer_claim.py"
LAMBDA_RUNTIME = "python3.12"
SUPPORTED_TIERS = {"ESSENTIALS", "PLUS"}
LAMBDA_VERSION = "V2_0"
PERMISSION_SID = "AllowCognitoPreTokenGeneration"

_TRUST = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole",
        }
    ],
}
_BASIC_LOGGING = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"


def _region() -> str:
    return os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"


def mapping_from_database(region: str) -> Dict[str, str]:
    """Read subject -> customer from the same table RLS keys off."""
    cluster_arn = _require("DB_CLUSTER_ARN")
    secret_arn = os.environ.get("DB_SECRET_ARN") or os.environ.get("SECRET_ARN") or ""
    if not secret_arn:
        raise SystemExit("DB_SECRET_ARN (or SECRET_ARN) is required to read principal_customers")
    database = os.environ.get("DB_NAME") or os.environ.get("DATABASE") or "postgres"
    rds = boto3.client("rds-data", region_name=region)
    response = rds.execute_statement(
        resourceArn=cluster_arn,
        secretArn=secret_arn,
        database=database,
        sql="SELECT principal_sub, customer_id FROM pellier.principal_customers",
    )
    mapping: Dict[str, str] = {}
    for record in response.get("records", []):
        sub = record[0].get("stringValue", "")
        customer = record[1].get("stringValue", "")
        if sub and customer:
            mapping[sub] = customer
    if not mapping:
        raise SystemExit(
            "pellier.principal_customers is empty; run scripts/seed_principal_mappings.py "
            "before deploying the claim trigger, or no shopper will carry a claim"
        )
    return mapping


def ensure_role(iam: Any) -> str:
    try:
        role = iam.get_role(RoleName=ROLE_NAME)["Role"]
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "NoSuchEntity":
            raise
        role = iam.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=json.dumps(_TRUST),
            Description="Pellier Cognito pre-token trigger: logging only",
            Tags=[{"Key": "PellierWorkshopId", "Value": os.environ.get("WORKSHOP_ID", "dat416")}],
        )["Role"]
        iam.attach_role_policy(RoleName=ROLE_NAME, PolicyArn=_BASIC_LOGGING)
        time.sleep(10)
    return role["Arn"]


def _package() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(HANDLER_FILE, "cognito_customer_claim.py")
    return buffer.getvalue()


def _wait_for_function(lam: Any) -> None:
    for _ in range(30):
        state = lam.get_function_configuration(FunctionName=FUNCTION_NAME)
        if state.get("State") == "Active" and state.get("LastUpdateStatus") in (None, "Successful"):
            return
        time.sleep(2)
    raise SystemExit(f"{FUNCTION_NAME} did not become Active")


def ensure_function(lam: Any, role_arn: str, mapping: Dict[str, str]) -> str:
    env = {"Variables": {"CUSTOMER_CLAIM_MAP": json.dumps(mapping, sort_keys=True)}}
    code = _package()
    try:
        lam.get_function(FunctionName=FUNCTION_NAME)
        exists = True
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
        exists = False
    if not exists:
        for attempt in range(6):
            try:
                created = lam.create_function(
                    FunctionName=FUNCTION_NAME,
                    Runtime=LAMBDA_RUNTIME,
                    Role=role_arn,
                    Handler="cognito_customer_claim.handler",
                    Code={"ZipFile": code},
                    Description="Stamps custom:customer_id on shopper access tokens",
                    Timeout=5,
                    MemorySize=128,
                    Architectures=["arm64"],
                    Environment=env,
                )
                break
            except ClientError as exc:
                # A freshly created role is not assumable for a few seconds.
                if exc.response["Error"]["Code"] != "InvalidParameterValueException" or attempt == 5:
                    raise
                time.sleep(5)
        _wait_for_function(lam)
        return created["FunctionArn"]
    _wait_for_function(lam)
    lam.update_function_code(FunctionName=FUNCTION_NAME, ZipFile=code)
    _wait_for_function(lam)
    updated = lam.update_function_configuration(
        FunctionName=FUNCTION_NAME, Environment=env, Runtime=LAMBDA_RUNTIME, Role=role_arn
    )
    _wait_for_function(lam)
    return updated["FunctionArn"]


def ensure_permission(lam: Any, pool_arn: str) -> None:
    try:
        lam.add_permission(
            FunctionName=FUNCTION_NAME,
            StatementId=PERMISSION_SID,
            Action="lambda:InvokeFunction",
            Principal="cognito-idp.amazonaws.com",
            SourceArn=pool_arn,
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceConflictException":
            raise


def attach_trigger(idp: Any, pool_id: str, function_arn: str) -> Dict[str, Any]:
    pool = idp.describe_user_pool(UserPoolId=pool_id)["UserPool"]
    tier = pool.get("UserPoolTier", "LITE")
    if tier not in SUPPORTED_TIERS:
        raise SystemExit(
            f"user pool {pool_id} is on the {tier} plan; access-token claim "
            "customization needs ESSENTIALS or PLUS"
        )
    members = idp.meta.service_model.operation_model("UpdateUserPool").input_shape.members
    kwargs: Dict[str, Any] = {
        name: pool[name] for name in members if name in pool and name != "UserPoolId"
    }
    if "Name" in pool and "PoolName" in members:
        kwargs["PoolName"] = pool["Name"]
    # Cognito rejects the deprecated per-pool validity beside the password
    # policy's own; the password policy is the one that is still honoured.
    admin_config = dict(kwargs.get("AdminCreateUserConfig") or {})
    admin_config.pop("UnusedAccountValidityDays", None)
    if admin_config:
        kwargs["AdminCreateUserConfig"] = admin_config
    lambda_config = dict(pool.get("LambdaConfig") or {})
    lambda_config["PreTokenGenerationConfig"] = {
        "LambdaVersion": LAMBDA_VERSION,
        "LambdaArn": function_arn,
    }
    lambda_config.pop("PreTokenGeneration", None)
    kwargs["LambdaConfig"] = lambda_config
    kwargs["UserPoolId"] = pool_id
    idp.update_user_pool(**kwargs)
    return idp.describe_user_pool(UserPoolId=pool_id)["UserPool"]["LambdaConfig"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mapping-json", default="", help="Subject->customer JSON instead of the database read")
    args = parser.parse_args()
    _load_env()
    region = _region()
    pool_id = _require("COGNITO_POOL_ID")

    mapping = json.loads(args.mapping_json) if args.mapping_json else mapping_from_database(region)
    iam = boto3.client("iam", region_name=region)
    lam = boto3.client("lambda", region_name=region)
    idp = boto3.client("cognito-idp", region_name=region)

    role_arn = ensure_role(iam)
    function_arn = ensure_function(lam, role_arn, mapping)
    pool_arn = idp.describe_user_pool(UserPoolId=pool_id)["UserPool"]["Arn"]
    ensure_permission(lam, pool_arn)
    lambda_config = attach_trigger(idp, pool_id, function_arn)

    print(json.dumps({
        "function": function_arn,
        "role": role_arn,
        "poolId": pool_id,
        "lambdaConfig": lambda_config,
        "mappedSubjects": len(mapping),
        "customers": sorted(set(mapping.values())),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
