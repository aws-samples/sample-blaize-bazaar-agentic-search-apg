#!/usr/bin/env python3
"""
Load enriched catalog into Aurora PostgreSQL via RDS Data API.
Replaces seed-database.sh when psql connectivity is not available.
"""

import csv
import os
import sys
import time

import boto3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Find CSV
CSV_FILE = os.path.join(PROJECT_ROOT, 'data', 'product-catalog-enriched.csv')
if not os.path.exists(CSV_FILE):
    CSV_FILE = os.path.join(PROJECT_ROOT, 'data', 'product-catalog-cohere-v4.csv')
    print(f'WARNING: Enriched catalog not found, falling back to {CSV_FILE}')

# Load .env
env_path = os.path.join(PROJECT_ROOT, '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

CLUSTER_ARN = os.environ.get('DB_CLUSTER_ARN')
SECRET_ARN = os.environ.get('DB_SECRET_ARN')
DATABASE = os.environ.get('DB_NAME', 'postgres')
REGION = os.environ.get('AWS_REGION', 'us-west-2')

if not CLUSTER_ARN or not SECRET_ARN:
    print('ERROR: DB_CLUSTER_ARN and DB_SECRET_ARN must be set', file=sys.stderr)
    sys.exit(1)

client = boto3.client('rds-data', region_name=REGION)


def run_sql(sql, ignore_errors=False):
    """Execute a SQL statement via RDS Data API."""
    try:
        result = client.execute_statement(
            resourceArn=CLUSTER_ARN,
            secretArn=SECRET_ARN,
            database=DATABASE,
            sql=sql,
        )
        return result
    except Exception as e:
        if ignore_errors:
            print(f'  (ignored: {e})')
            return None
        raise


def run_sql_batch(sql, param_sets):
    """Execute a batch SQL statement via RDS Data API."""
    result = client.batch_execute_statement(
        resourceArn=CLUSTER_ARN,
        secretArn=SECRET_ARN,
        database=DATABASE,
        sql=sql,
        parameterSets=param_sets,
    )
    return result


print(f'Using CSV: {CSV_FILE}')
print(f'Target: {CLUSTER_ARN}')

# Step 1: Create extension and schema
print('\n[1/7] Creating extension and schema...')
run_sql('CREATE EXTENSION IF NOT EXISTS vector')
run_sql('CREATE SCHEMA IF NOT EXISTS blaize_bazaar')
run_sql('DROP TABLE IF EXISTS blaize_bazaar.tool_uses CASCADE')
run_sql('DROP TABLE IF EXISTS blaize_bazaar.messages CASCADE')
run_sql('DROP TABLE IF EXISTS blaize_bazaar.session_metadata CASCADE')
run_sql('DROP TABLE IF EXISTS blaize_bazaar.conversations CASCADE')
run_sql('DROP TABLE IF EXISTS blaize_bazaar.product_catalog CASCADE')

# Step 2: Create table
print('[2/7] Creating product_catalog table...')
run_sql("""
CREATE TABLE blaize_bazaar.product_catalog (
    "productId" CHAR(10) PRIMARY KEY,
    product_description VARCHAR(500) NOT NULL,
    "imgUrl" VARCHAR(200),
    "productURL" VARCHAR(40),
    stars NUMERIC(2,1) CHECK (stars >= 1.0 AND stars <= 5.0),
    reviews INTEGER CHECK (reviews >= 0),
    price NUMERIC(8,2) CHECK (price >= 0),
    category_id SMALLINT CHECK (category_id > 0),
    "isBestSeller" BOOLEAN DEFAULT FALSE NOT NULL,
    "boughtInLastMonth" INTEGER CHECK ("boughtInLastMonth" >= 0),
    category_name VARCHAR(50) NOT NULL,
    quantity SMALLINT CHECK (quantity >= 0 AND quantity <= 1000),
    embedding vector(1024)
)
""")

# Step 3: Load CSV data
print('[3/7] Loading CSV data...')
with open(CSV_FILE, 'r') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f'  Read {len(rows)} rows from CSV')

# Insert in batches — RDS Data API has payload limits
# Each row with embedding is large, so use small batches
BATCH_SIZE = 5
insert_sql = """
INSERT INTO blaize_bazaar.product_catalog
    ("productId", product_description, "imgUrl", "productURL", stars, reviews,
     price, category_id, "isBestSeller", "boughtInLastMonth", category_name, quantity, embedding)
VALUES (:pid, :desc, :img, :url, :stars::numeric, :reviews::integer,
        :price::numeric, :catid::smallint, :bestseller::boolean, :bought::integer,
        :catname, :qty::smallint, :emb::vector)
"""

for i in range(0, len(rows), BATCH_SIZE):
    batch = rows[i:i + BATCH_SIZE]
    param_sets = []
    for row in batch:
        # Parse boolean
        bs = row.get('isBestSeller', 'False')
        is_best = bs.lower() in ('true', '1', 'yes')

        params = [
            {'name': 'pid', 'value': {'stringValue': row['productId'].strip()[:10]}},
            {'name': 'desc', 'value': {'stringValue': row['product_description'][:500]}},
            {'name': 'img', 'value': {'stringValue': (row.get('imgUrl') or '')[:200]}},
            {'name': 'url', 'value': {'stringValue': (row.get('productURL') or '')[:40]}},
            {'name': 'stars', 'value': {'stringValue': str(row.get('stars', '4.0'))}},
            {'name': 'reviews', 'value': {'longValue': int(float(row.get('reviews', 0)))}},
            {'name': 'price', 'value': {'stringValue': str(row.get('price', '0'))}},
            {'name': 'catid', 'value': {'longValue': int(float(row.get('category_id', 1)))}},
            {'name': 'bestseller', 'value': {'stringValue': str(is_best).lower()}},
            {'name': 'bought', 'value': {'longValue': int(float(row.get('boughtInLastMonth', 0)))}},
            {'name': 'catname', 'value': {'stringValue': row.get('category_name', '')[:50]}},
            {'name': 'qty', 'value': {'longValue': int(float(row.get('quantity', 0)))}},
            {'name': 'emb', 'value': {'stringValue': row.get('embedding', '')}},
        ]
        param_sets.append(params)

    try:
        run_sql_batch(insert_sql, param_sets)
    except Exception as e:
        # If batch fails, try one by one
        print(f'  Batch {i//BATCH_SIZE + 1} failed ({e}), trying individual inserts...')
        for j, row_params in enumerate(param_sets):
            try:
                run_sql_batch(insert_sql, [row_params])
            except Exception as e2:
                pid = batch[j]['productId']
                print(f'    FAILED: {pid} — {e2}')

    if (i + BATCH_SIZE) % 50 == 0 or (i + BATCH_SIZE) >= len(rows):
        print(f'  Inserted {min(i + BATCH_SIZE, len(rows))}/{len(rows)} rows')

# Step 4: Create indexes
print('[4/7] Creating indexes...')
run_sql("""
CREATE INDEX idx_product_embedding_hnsw
ON blaize_bazaar.product_catalog
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128)
""")
print('  HNSW index created')

run_sql("""
CREATE INDEX idx_product_fts
ON blaize_bazaar.product_catalog
USING GIN (to_tsvector('english', product_description))
""")

run_sql("""
CREATE INDEX idx_product_category_name
ON blaize_bazaar.product_catalog(category_name)
""")

run_sql("""
CREATE INDEX idx_product_price
ON blaize_bazaar.product_catalog(price) WHERE price > 0
""")

run_sql("""
CREATE INDEX idx_product_stars
ON blaize_bazaar.product_catalog(stars) WHERE stars >= 4.0
""")

run_sql("""
CREATE INDEX idx_product_category_price
ON blaize_bazaar.product_catalog(category_name, price)
WHERE price > 0 AND quantity > 0
""")

run_sql("""
CREATE INDEX idx_product_bestseller
ON blaize_bazaar.product_catalog("isBestSeller")
WHERE "isBestSeller" = TRUE
""")
print('  All indexes created')

# Step 5: Post-load adjustments (star rating redistribution)
print('[5/7] Applying post-load adjustments...')

# Star rating redistribution
run_sql("""
WITH ranked AS (
    SELECT "productId",
        ROW_NUMBER() OVER (ORDER BY md5("productId")) AS rn,
        COUNT(*) OVER () AS total
    FROM blaize_bazaar.product_catalog
    WHERE "productId" NOT IN (
        'PLAPT0001','PLAPT0016','PLAPT0007','PLAPT0026','PLAPT0033','PLAPT0010',
        'PSMRT0001','PSMRT0009','PSMRT0039','PMOBI0002','PMOBI0004',
        'PKITC0010','PKITC0005','PSPRT0022','PSPRT0027',
        'PMSHO0011','PMSHO0016','PMSHO0017','PMSHO0018','PMSHO0021','PMSHO0036',
        'PWSHO0019','PWSHO0009','PWSHO0022','PWSHO0028',
        'PSUNG0007','PMWAT0001','PWBAG0001','PWBAG0002',
        'PMOBI0043','PMOBI0044','PMOBI0045','PMOBI0046','PMOBI0047','PMOBI0048',
        'PSPRT0043','PSPRT0044','PSPRT0045','PSPRT0046',
        'PBEAU0043','PKITC0043','PSKCA0043'
    )
)
UPDATE blaize_bazaar.product_catalog pc
SET stars = CASE
    WHEN r.rn <= r.total * 0.03 THEN ROUND(2.0 + (random() * 0.9)::numeric, 1)
    WHEN r.rn <= r.total * 0.10 THEN ROUND(3.0 + (random() * 0.4)::numeric, 1)
    WHEN r.rn <= r.total * 0.25 THEN ROUND(3.5 + (random() * 0.4)::numeric, 1)
    WHEN r.rn <= r.total * 0.60 THEN ROUND(4.0 + (random() * 0.4)::numeric, 1)
    ELSE ROUND(4.5 + (random() * 0.5)::numeric, 1)
END
FROM ranked r
WHERE pc."productId" = r."productId"
""")
print('  Star rating redistribution applied')

# Inventory redistribution
run_sql("""
WITH ranked AS (
    SELECT "productId",
        ROW_NUMBER() OVER (ORDER BY md5("productId" || 'inv')) AS rn,
        COUNT(*) OVER () AS total
    FROM blaize_bazaar.product_catalog
    WHERE "productId" NOT IN (
        'PMOBI0043','PMOBI0044','PMOBI0045','PMOBI0046','PMOBI0047','PMOBI0048',
        'PSPRT0043','PSPRT0044','PSPRT0045','PSPRT0046',
        'PBEAU0043','PKITC0043','PSKCA0043','PSUNG0007'
    )
)
UPDATE blaize_bazaar.product_catalog pc
SET quantity = CASE
    WHEN r.rn <= r.total * 0.06 THEN 0
    WHEN r.rn <= r.total * 0.14 THEN 1 + (random() * 4)::int
    WHEN r.rn <= r.total * 0.26 THEN 6 + (random() * 9)::int
    WHEN r.rn <= r.total * 0.60 THEN 16 + (random() * 84)::int
    ELSE 101 + (random() * 899)::int
END
FROM ranked r
WHERE pc."productId" = r."productId"
""")
print('  Inventory redistribution applied')

# Step 6: VACUUM ANALYZE
print('[6/7] Running VACUUM ANALYZE...')
# Note: VACUUM can't run inside a transaction, so we skip it via Data API
# (Data API runs each statement in an auto-commit transaction, but VACUUM
#  may still fail). We'll try it.
try:
    run_sql('VACUUM ANALYZE blaize_bazaar.product_catalog')
    print('  VACUUM ANALYZE complete')
except Exception as e:
    print(f'  VACUUM ANALYZE skipped ({e})')
    # Run ANALYZE at least
    try:
        run_sql('ANALYZE blaize_bazaar.product_catalog')
        print('  ANALYZE complete')
    except Exception:
        pass

# Step 7: Session management tables
print('[7/7] Creating session management tables...')
run_sql("""
CREATE TABLE IF NOT EXISTS blaize_bazaar.conversations (
    session_id VARCHAR(255) PRIMARY KEY,
    agent_name VARCHAR(255),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
)
""")
run_sql("""
CREATE INDEX IF NOT EXISTS idx_conversations_created_at
ON blaize_bazaar.conversations(created_at)
""")
run_sql("""
CREATE TABLE IF NOT EXISTS blaize_bazaar.messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES blaize_bazaar.conversations(session_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
)
""")
run_sql("""
CREATE INDEX IF NOT EXISTS idx_messages_session_id
ON blaize_bazaar.messages(session_id)
""")
run_sql("""
CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON blaize_bazaar.messages(created_at)
""")
run_sql("""
CREATE TABLE IF NOT EXISTS blaize_bazaar.session_metadata (
    session_id VARCHAR(255) PRIMARY KEY REFERENCES blaize_bazaar.conversations(session_id) ON DELETE CASCADE,
    user_preferences JSONB DEFAULT '{}'::jsonb,
    context_data JSONB DEFAULT '{}'::jsonb,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
run_sql("""
CREATE TABLE IF NOT EXISTS blaize_bazaar.tool_uses (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES blaize_bazaar.conversations(session_id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_input JSONB,
    tool_output JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
run_sql("""
CREATE INDEX IF NOT EXISTS idx_tool_uses_session_id
ON blaize_bazaar.tool_uses(session_id)
""")
run_sql("""
CREATE INDEX IF NOT EXISTS idx_tool_uses_timestamp
ON blaize_bazaar.tool_uses(timestamp)
""")

# Grant permissions
for table in ['conversations', 'messages', 'session_metadata', 'tool_uses']:
    run_sql(f'GRANT SELECT, INSERT, UPDATE, DELETE ON blaize_bazaar.{table} TO postgres')

run_sql('GRANT USAGE, SELECT ON SEQUENCE blaize_bazaar.messages_id_seq TO postgres')
run_sql('GRANT USAGE, SELECT ON SEQUENCE blaize_bazaar.tool_uses_id_seq TO postgres')
print('  Session tables created')

# Verify
result = run_sql('SELECT COUNT(*) as cnt FROM blaize_bazaar.product_catalog')
count = result['records'][0][0]['longValue']
print(f'\nVerification: {count} products loaded')

if count == 444:
    print('Database load complete - 444 products loaded successfully')
else:
    print(f'WARNING: Expected 444 products, got {count}')
