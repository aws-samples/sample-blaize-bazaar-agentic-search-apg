#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARN:${NC} $1"; }

log "==================== DAT406 Database Setup Starting ===================="

# Find project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
log "Project root: $PROJECT_ROOT"

# Load environment from multiple possible locations
ENV_FILE=""
for path in "$PROJECT_ROOT/.env" "/workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env" "$HOME/.env"; do
    if [ -f "$path" ]; then
        ENV_FILE="$path"
        break
    fi
done

if [ -z "$ENV_FILE" ]; then
    error ".env file not found in $PROJECT_ROOT, /workshop, or $HOME"
fi

source "$ENV_FILE"
log "✅ Environment loaded from $ENV_FILE"

# Verify variables
for var in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD AWS_REGION; do
    if [ -z "${!var:-}" ]; then error "Missing $var"; fi
done

log "Database: $DB_HOST:$DB_PORT/$DB_NAME"

# Test connectivity
log "Testing database..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" &>/dev/null; then
    log "✅ Database connected"
else
    error "Database connection failed"
fi

log "Testing Bedrock Titan v2 model access..."
python3 << PYTHON_TEST
import sys, json, boto3
try:
    bedrock = boto3.client('bedrock-runtime', region_name='${AWS_REGION}')
    response = bedrock.invoke_model(
        modelId='amazon.titan-embed-text-v2:0',
        body=json.dumps({'inputText': 'test', 'dimensions': 1024, 'normalize': True}),
        contentType='application/json',
        accept='application/json'
    )
    result = json.loads(response['body'].read())
    if 'embedding' in result and len(result['embedding']) == 1024:
        print('SUCCESS')
        sys.exit(0)
    sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
PYTHON_TEST

if [ $? -eq 0 ]; then
    log "✅ Bedrock Titan v2 model is accessible"
else
    error "Cannot access Bedrock Titan v2 model. Enable it in AWS Console: https://console.aws.amazon.com/bedrock/"
fi

# Create schema
log "Creating schema..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS bedrock_integration;
DROP TABLE IF EXISTS bedrock_integration.product_catalog CASCADE;

CREATE TABLE bedrock_integration.product_catalog (
    "productId" VARCHAR(255) PRIMARY KEY,
    product_description TEXT NOT NULL,
    imgurl TEXT,
    producturl TEXT,
    stars NUMERIC(3,2),
    reviews INTEGER,
    price NUMERIC(10,2),
    category_id INTEGER,
    isbestseller BOOLEAN DEFAULT FALSE,
    boughtinlastmonth INTEGER,
    category_name VARCHAR(255),
    quantity INTEGER DEFAULT 0,
    embedding vector(1024),
    created_at TIMESTAMP DEFAULT NOW()
);
SQL

log "✅ Schema created"

# Load data with embeddings
log "Loading 21,704 products with embeddings (5-8 minutes)..."

cat > /tmp/load_dat406.py << 'PYTHON'
import os, sys, json, time, boto3, psycopg, pandas as pd, numpy as np
from pathlib import Path
from pgvector.psycopg import register_vector
from pandarallel import pandarallel
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432'),
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD')
}

# Find data file
for path in [
    Path(os.getenv('PROJECT_ROOT', '/workshop/sample-dat406-build-agentic-ai-powered-search-apg')) / 'data' / 'amazon-products-sample.csv',
    Path('/workshop/sample-dat406-build-agentic-ai-powered-search-apg/data/amazon-products-sample.csv'),
    Path.cwd() / 'data' / 'amazon-products-sample.csv',
    Path.cwd().parent / 'data' / 'amazon-products-sample.csv'
]:
    if path.exists():
        DATA_FILE = path
        break
else:
    print(f"❌ Data file not found in any expected location")
    sys.exit(1)

print(f"📁 Using data file: {DATA_FILE}")

bedrock = boto3.client('bedrock-runtime', region_name=os.getenv('AWS_REGION', 'us-west-2'))

def generate_embedding(text):
    try:
        response = bedrock.invoke_model(
            body=json.dumps({'inputText': str(text)[:2000], 'dimensions': 1024, 'normalize': True}),
            modelId='amazon.titan-embed-text-v2:0',
            accept='application/json',
            contentType='application/json'
        )
        return json.loads(response['body'].read())['embedding']
    except:
        return [0.0] * 1024

print("📊 Loading data...")
df = pd.read_csv(str(DATA_FILE))
df = df.dropna(subset=['product_description'])
df = df.fillna({'stars': 0.0, 'reviews': 0, 'price': 0.0, 'category_id': 0, 
                'isbestseller': False, 'boughtinlastmonth': 0, 'category_name': 'Uncategorized',
                'quantity': 0, 'imgurl': '', 'producturl': ''})
df['product_description'] = df['product_description'].str[:2000]

print(f"✅ Loaded {len(df)} products")
print("🚀 Generating embeddings with 10 workers...")

pandarallel.initialize(progress_bar=True, nb_workers=10, verbose=0)
df['embedding'] = df['product_description'].parallel_apply(generate_embedding)

print("💾 Inserting into database...")
conn_str = f"host={DB_CONFIG['host']} port={DB_CONFIG['port']} dbname={DB_CONFIG['dbname']} user={DB_CONFIG['user']} password={DB_CONFIG['password']}"
with psycopg.connect(conn_str) as conn:
    register_vector(conn)
    with conn.cursor() as cur:
        batches = []
        for _, row in df.iterrows():
            batches.append((
                row['productId'], row['product_description'],
                row.get('imgurl', ''), row.get('producturl', ''),
                float(row['stars']), int(row['reviews']), float(row['price']),
                int(row['category_id']), bool(row.get('isbestseller', False)),
                int(row.get('boughtinlastmonth', 0)), row['category_name'],
                int(row['quantity']), row['embedding']
            ))
        
        for i in tqdm(range(0, len(batches), 1000), desc="Inserting"):
            chunk = batches[i:i+1000]
            cur.executemany("""
                INSERT INTO bedrock_integration.product_catalog 
                ("productId", product_description, imgurl, producturl, stars, reviews, 
                 price, category_id, isbestseller, boughtinlastmonth, category_name, 
                 quantity, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("productId") DO UPDATE SET
                    product_description = EXCLUDED.product_description,
                    embedding = EXCLUDED.embedding
            """, chunk)
            conn.commit()

print("✅ Data loaded successfully")
PYTHON

export PROJECT_ROOT="$PROJECT_ROOT"
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD AWS_REGION
python3 /tmp/load_dat406.py
if [ $? -eq 0 ]; then
    log "✅ Products loaded with embeddings"
else
    error "Failed to load products"
fi

# Create indexes
log "Creating indexes..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
CREATE INDEX IF NOT EXISTS idx_product_embedding_hnsw 
ON bedrock_integration.product_catalog 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_product_fts 
ON bedrock_integration.product_catalog
USING GIN (to_tsvector('english', product_description));

CREATE INDEX IF NOT EXISTS idx_product_category 
ON bedrock_integration.product_catalog(category_name);

CREATE INDEX IF NOT EXISTS idx_product_price 
ON bedrock_integration.product_catalog(price) WHERE price > 0;

VACUUM ANALYZE bedrock_integration.product_catalog;
SQL

log "✅ Indexes created"

# Verify data loaded
COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM bedrock_integration.product_catalog;" | xargs)
log "📊 Total products in database: $COUNT"

if [ "$COUNT" -gt 0 ]; then
    log "✅ Database setup complete and verified"
    log "==================== Setup Complete ===================="
else
    error "No products found in database after setup"
fi
