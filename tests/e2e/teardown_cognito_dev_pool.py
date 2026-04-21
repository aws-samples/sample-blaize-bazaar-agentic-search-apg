#!/usr/bin/env python3
"""Tear down the E2E test user in a dedicated Cognito dev pool.

Pair of ``bootstrap_cognito_dev_pool.py``. Runs at the tail end of the CI
job so the dev pool does not accumulate orphaned users between runs.

Environment variables (all required unless ``--dry-run`` is passed):

* ``E2E_COGNITO_POOL_ID`` — dedicated dev pool (must NOT contain ``prod``)
* ``E2E_TEST_USER_EMAIL`` — username to delete (same one bootstrap created)
* ``E2E_AWS_REGION``      — AWS region of the pool

Production safety: same ``prod``/``production``/``prd`` denylist guard as
bootstrap. Even though this script deletes a single user (not a pool), the
guard exists so a misconfigured CI env can never point this at a shared
pool.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from bootstrap_cognito_dev_pool import (
    EXIT_AWS_ERROR,
    EXIT_MISSING_CONFIG,
    EXIT_OK,
    EXIT_PROD_GUARD,
    assert_non_production_pool,
)


@dataclass(frozen=True)
class TeardownConfig:
    """Config subset needed to delete a single user."""

    pool_id: str
    email: str
    region: str

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "TeardownConfig":
        required = {
            "E2E_COGNITO_POOL_ID": "pool_id",
            "E2E_TEST_USER_EMAIL": "email",
            "E2E_AWS_REGION": "region",
        }
        missing = [k for k in required if not env.get(k)]
        if missing:
            msg = (
                "[teardown_cognito_dev_pool] Missing required env vars: "
                + ", ".join(missing)
            )
            print(msg, file=sys.stderr)
            raise SystemExit(EXIT_MISSING_CONFIG)

        return cls(
            pool_id=env["E2E_COGNITO_POOL_ID"],
            email=env["E2E_TEST_USER_EMAIL"],
            region=env["E2E_AWS_REGION"],
        )


def plan(cfg: TeardownConfig) -> list[dict[str, Any]]:
    """Return the ordered AWS calls this script would perform."""
    return [
        {
            "service": "cognito-idp",
            "operation": "AdminDeleteUser",
            "params": {
                "UserPoolId": cfg.pool_id,
                "Username": cfg.email,
            },
        }
    ]


def teardown(
    cfg: TeardownConfig,
    *,
    dry_run: bool,
    client: Any = None,
) -> int:
    """Delete the test user. Missing users are a no-op (exit 0)."""
    assert_non_production_pool(cfg.pool_id)

    steps = plan(cfg)
    if dry_run:
        print(
            "[teardown_cognito_dev_pool] DRY RUN — the following AWS calls "
            "would be made (no boto3 client will be created):"
        )
        print(json.dumps(steps, indent=2))
        return EXIT_OK

    if client is None:
        import boto3  # type: ignore[import-not-found]

        client = boto3.client("cognito-idp", region_name=cfg.region)

    try:
        client.admin_delete_user(
            UserPoolId=cfg.pool_id,
            Username=cfg.email,
        )
    except getattr(
        getattr(client, "exceptions", None), "UserNotFoundException", Exception,
    ):
        # User was already cleaned up (e.g., bootstrap failed after the
        # credentials file was written). Treat as success — the desired
        # end-state (user absent) has been reached.
        print(
            f"[teardown_cognito_dev_pool] User {cfg.email} not found in "
            f"pool {cfg.pool_id}; nothing to do.",
            file=sys.stderr,
        )
        return EXIT_OK
    except Exception as exc:  # noqa: BLE001
        print(
            f"[teardown_cognito_dev_pool] AWS error: {exc}",
            file=sys.stderr,
        )
        return EXIT_AWS_ERROR

    print(
        f"[teardown_cognito_dev_pool] Deleted user {cfg.email} from pool "
        f"{cfg.pool_id}.",
        file=sys.stderr,
    )
    return EXIT_OK


def _parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Delete the E2E test user from a dedicated Cognito dev pool."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Print the AWS calls that would be made without invoking "
            "boto3. Safe to run without any AWS credentials."
        ),
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = _parse_args(argv)
    cfg = TeardownConfig.from_env(os.environ)
    return teardown(cfg, dry_run=args.dry_run)


if __name__ == "__main__":  # pragma: no cover — CLI entrypoint
    raise SystemExit(main())
