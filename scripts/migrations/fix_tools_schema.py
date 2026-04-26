#!/usr/bin/env python3
"""Fix tools table schema to match seed_tool_registry.py expectations.

Adds tool_id and owner_agent columns, migrates data, drops old columns.
"""
import json
import boto3
import psycopg

client = boto3.client("secretsmanager", region_name="us-west-2")
resp = client.get_secret_value(
    SecretId="arn:aws:secretsmanager:us-west-2:619763002613:secret:rds!cluster-5100afbd-ab1f-4498-b49f-502a7dcad9d9-Hbpbdd"
)
creds = json.loads(resp["SecretString"])

conn = psycopg.connect(
    host="dat4xx-labs-test.cluster-chygmprofdnr.us-west-2.rds.amazonaws.com",
    port=5432, dbname="postgres",
    user=creds["username"], password=creds["password"],
)
cur = conn.cursor()

# Check current columns
cur.execute("""SELECT column_name FROM information_schema.columns
WHERE table_name='tools' ORDER BY ordinal_position""")
cols = [r[0] for r in cur.fetchall()]
print(f"Current columns: {cols}")

# Add tool_id if missing
if "tool_id" not in cols:
    print("Adding tool_id column...")
    cur.execute("ALTER TABLE tools ADD COLUMN tool_id TEXT")
    cur.execute("UPDATE tools SET tool_id = name WHERE tool_id IS NULL")
    cur.execute("ALTER TABLE tools ALTER COLUMN tool_id SET NOT NULL")
    # Add unique constraint
    cur.execute("ALTER TABLE tools ADD CONSTRAINT tools_tool_id_key UNIQUE (tool_id)")
    print("  done")

# Add owner_agent if missing
if "owner_agent" not in cols:
    print("Adding owner_agent column...")
    cur.execute("ALTER TABLE tools ADD COLUMN owner_agent TEXT NOT NULL DEFAULT 'unknown'")
    # Migrate from owner to owner_agent
    if "owner" in cols:
        cur.execute("UPDATE tools SET owner_agent = owner")
    print("  done")

conn.commit()

# Verify
cur.execute("""SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='tools' ORDER BY ordinal_position""")
print("\nFinal schema:")
for r in cur.fetchall():
    print(f"  {r[0]:30s} {r[1]}")

cur.execute("SELECT tool_id, name, owner_agent FROM tools ORDER BY id")
print("\nTool data:")
for r in cur.fetchall():
    print(f"  {r[0]:30s} name={r[1]:30s} owner={r[2]}")

conn.close()
print("\nDone.")
