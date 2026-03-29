#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; exit 1; }

log "==================== DAT406 Fast Database Load ===================="

# Find project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Find or download CSV file
CSV_FILE=""
for path in "$PROJECT_ROOT/data/product-catalog-cohere-v4.csv" \
            "/workshop/sample-blaize-bazaar-agentic-search-apg/data/product-catalog-cohere-v4.csv"; do
    if [ -f "$path" ]; then
        CSV_FILE="$path"
        break
    fi
done

# Download from S3 if not found locally
if [ -z "$CSV_FILE" ]; then
    log "CSV not found locally, downloading from S3..."
    mkdir -p "$PROJECT_ROOT/data"
    CSV_FILE="$PROJECT_ROOT/data/product-catalog-cohere-v4.csv"
    
    # Use Workshop Studio assets bucket (variables set by CloudFormation)
    if [ -n "${ASSETS_BUCKET_NAME:-}" ] && [ -n "${ASSETS_BUCKET_PREFIX:-}" ]; then
        S3_URL="s3://${ASSETS_BUCKET_NAME}/${ASSETS_BUCKET_PREFIX}product-catalog-cohere-v4.csv"
    else
        # Fallback for local development
        S3_URL="s3://ws-assets-prod-iad-r-pdx-f3b3f9f1a7d6a3d0/YOUR-EVENT-ID/product-catalog-cohere-v4.csv"
    fi
    
    if command -v aws &> /dev/null; then
        log "Downloading from: $S3_URL"
        aws s3 cp "$S3_URL" "$CSV_FILE" || error "Failed to download CSV from S3"
    else
        error "AWS CLI not found and CSV not present locally"
    fi
fi

log "Using CSV: $CSV_FILE"

# Load environment
for env_path in "$PROJECT_ROOT/.env" "/workshop/sample-blaize-bazaar-agentic-search-apg/.env"; do
    if [ -f "$env_path" ]; then
        source "$env_path"
        break
    fi
done

# Verify variables
for var in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
    if [ -z "${!var:-}" ]; then error "Missing $var"; fi
done

log "Loading data into $DB_HOST:$DB_PORT/$DB_NAME..."

# Execute SQL with embedded CSV path
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << SQL
\set ON_ERROR_STOP on

-- Create extension and schema
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS bedrock_integration;
DROP TABLE IF EXISTS bedrock_integration.product_catalog CASCADE;

-- Create optimized table
CREATE TABLE bedrock_integration.product_catalog (
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
);

\echo 'Loading data from CSV...'
-- Create temporary table matching CSV column names (lowercase)
CREATE TEMP TABLE temp_products (
    "productId" VARCHAR(10),
    product_description TEXT,
    imgurl TEXT,
    producturl TEXT,
    stars NUMERIC,
    reviews INTEGER,
    price NUMERIC,
    category_id INTEGER,
    isbestseller BOOLEAN,
    boughtinlastmonth INTEGER,
    category_name VARCHAR(255),
    quantity INTEGER,
    embedding vector(1024)
);

-- Load CSV into temp table
\copy temp_products FROM '$CSV_FILE' WITH (FORMAT csv, HEADER true);

-- Copy from temp to final table with column name mapping
INSERT INTO bedrock_integration.product_catalog 
    ("productId", product_description, "imgUrl", "productURL", stars, reviews, 
     price, category_id, "isBestSeller", "boughtInLastMonth", category_name, quantity, embedding)
SELECT 
    "productId", product_description, imgurl, producturl, stars, reviews,
    price, category_id, isbestseller, boughtinlastmonth, category_name, quantity, embedding
FROM temp_products;

DROP TABLE temp_products;

\echo 'Creating indexes...'

-- Vector similarity index (HNSW) - optimized for ~1,000 products
CREATE INDEX idx_product_embedding_hnsw 
ON bedrock_integration.product_catalog 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128);

-- Full-text search index
CREATE INDEX idx_product_fts 
ON bedrock_integration.product_catalog
USING GIN (to_tsvector('english', product_description));

-- Category index
CREATE INDEX idx_product_category_name 
ON bedrock_integration.product_catalog(category_name);

-- Price index (partial - only valid prices)
CREATE INDEX idx_product_price 
ON bedrock_integration.product_catalog(price) WHERE price > 0;

-- Stars index (partial - highly rated)
CREATE INDEX idx_product_stars 
ON bedrock_integration.product_catalog(stars) WHERE stars >= 4.0;

-- Composite index for common queries
CREATE INDEX idx_product_category_price 
ON bedrock_integration.product_catalog(category_name, price) 
WHERE price > 0 AND quantity > 0;

-- Bestseller index (partial)
CREATE INDEX idx_product_bestseller 
ON bedrock_integration.product_catalog("isBestSeller") 
WHERE "isBestSeller" = TRUE;

-- Analyze for query planner
VACUUM ANALYZE bedrock_integration.product_catalog;

\echo 'Creating session management tables...'
-- Session management tables (required by Blaize Bazaar app)
CREATE TABLE IF NOT EXISTS bedrock_integration.conversations (
    session_id VARCHAR(255) PRIMARY KEY,
    agent_name VARCHAR(255),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
ON bedrock_integration.conversations(created_at);

CREATE TABLE IF NOT EXISTS bedrock_integration.messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES bedrock_integration.conversations(session_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id 
ON bedrock_integration.messages(session_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON bedrock_integration.messages(created_at);

CREATE TABLE IF NOT EXISTS bedrock_integration.session_metadata (
    session_id VARCHAR(255) PRIMARY KEY REFERENCES bedrock_integration.conversations(session_id) ON DELETE CASCADE,
    user_preferences JSONB DEFAULT '{}'::jsonb,
    context_data JSONB DEFAULT '{}'::jsonb,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bedrock_integration.tool_uses (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES bedrock_integration.conversations(session_id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_input JSONB,
    tool_output JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tool_uses_session_id 
ON bedrock_integration.tool_uses(session_id);

CREATE INDEX IF NOT EXISTS idx_tool_uses_timestamp 
ON bedrock_integration.tool_uses(timestamp);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bedrock_integration.conversations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON bedrock_integration.messages TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON bedrock_integration.session_metadata TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON bedrock_integration.tool_uses TO postgres;
GRANT USAGE, SELECT ON SEQUENCE bedrock_integration.messages_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE bedrock_integration.tool_uses_id_seq TO postgres;

\echo 'Verifying data...'
SELECT COUNT(*) as product_count FROM bedrock_integration.product_catalog;
SELECT 'Session tables created' as session_status;
SQL

if [ $? -eq 0 ]; then
    log "✅ Database loaded successfully"
    log "==================== Load Complete ===================="
else
    error "Database load failed"
fi
