#!/usr/bin/env python3
"""Wrapper to run seed_tool_registry.py with Aurora credentials from Secrets Manager."""
import json
import os
import subprocess
import sys
import boto3

client = boto3.client("secretsmanager", region_name="us-west-2")
resp = client.get_secret_value(
    SecretId="arn:aws:secretsmanager:us-west-2:619763002613:secret:rds!cluster-5100afbd-ab1f-4498-b49f-502a7dcad9d9-Hbpbdd"
)
creds = json.loads(resp["SecretString"])

env = os.environ.copy()
env["DB_HOST"] = "dat4xx-labs-test.cluster-chygmprofdnr.us-west-2.rds.amazonaws.com"
env["DB_PORT"] = "5432"
env["DB_NAME"] = "postgres"
env["DB_USER"] = creds["username"]
env["DB_PASSWORD"] = creds["password"]
env["AWS_REGION"] = "us-west-2"

result = subprocess.run(
    [sys.executable, "scripts/seed_tool_registry.py"],
    env=env,
    cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)
sys.exit(result.returncode)
