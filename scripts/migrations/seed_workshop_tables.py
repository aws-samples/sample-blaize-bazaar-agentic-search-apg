#!/usr/bin/env python3
"""
Seed workshop tables — customers, orders, customer_episodic_seed, tools, return_policies.

Uses the boutique catalog's integer productIds. Idempotent — safe to re-run.
Reads DB credentials from Secrets Manager or environment variables.
"""
import json
import logging
import os
import sys

import boto3
import psycopg

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)


def get_conn_string() -> str:
    """Build a psycopg connection string from env or Secrets Manager."""
    # Try direct env first
    if os.getenv("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    # Try Secrets Manager
    secret_arn = os.getenv("DB_SECRET_ARN")
    region = os.getenv("AWS_REGION", "us-west-2")
    host = os.getenv("DB_HOST", "")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "postgres")

    if secret_arn:
        client = boto3.client("secretsmanager", region_name=region)
        resp = client.get_secret_value(SecretId=secret_arn)
        creds = json.loads(resp["SecretString"])
        host = host or creds.get("host", "")
        return f"host={host} port={port} dbname={dbname} user={creds['username']} password={creds['password']}"

    # Fallback: try RDS managed secret pattern
    if host:
        # Assume env has DB_USER / DB_PASSWORD
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        return f"host={host} port={port} dbname={dbname} user={user} password={password}"

    # Last resort: localhost
    return f"host=localhost port=5432 dbname=postgres user=postgres"



DDL = """
-- customers table
CREATE TABLE IF NOT EXISTS customers (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    preferences_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders table
CREATE TABLE IF NOT EXISTS orders (
    id          BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    placed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, product_id, placed_at)
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id, placed_at DESC);

-- episodic seed table
CREATE TABLE IF NOT EXISTS customer_episodic_seed (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    summary_text    TEXT NOT NULL,
    ts_offset_days  INTEGER NOT NULL CHECK (ts_offset_days <= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_episodic_seed_customer_idx
    ON customer_episodic_seed (customer_id, ts_offset_days DESC);

-- tools table for tool registry discovery
CREATE TABLE IF NOT EXISTS tools (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    owner           TEXT NOT NULL DEFAULT 'orchestrator',
    description_emb vector(1024)
);
CREATE INDEX IF NOT EXISTS tools_emb_hnsw_idx
    ON tools USING hnsw (description_emb vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- return policies table
CREATE TABLE IF NOT EXISTS blaize_bazaar.return_policies (
    category_name VARCHAR(50) PRIMARY KEY,
    return_window_days INTEGER NOT NULL,
    conditions TEXT,
    refund_method TEXT
);
"""

CUSTOMERS = [
    ("CUST-0001", "Marco Ferraro",   "Linen and summer staples. Travel-friendly. Warm neutrals."),
    ("CUST-0002", "Anya Volkov",     "Workwear and neutrals. Minimalist. Structured pieces."),
    ("CUST-0003", "Priya Raman",     "Evening wear, dresses, statement accessories."),
    ("CUST-0004", "Kenji Watanabe",  "Outerwear, utility, and everyday carry."),
    ("CUST-0005", "Sofia Martinez",  "Home goods, candles, and gift-giving."),
    ("CUST-0006", "Leo Okonkwo",     "Footwear, sport, and outdoor."),
    ("CUST-0007", "Imani Clarke",    "Bags, dresses, and occasion wear."),
    ("CUST-0008", "Haruto Tanaka",   "Tops, bottoms, and home office."),
]

# Orders use real integer productIds from the boutique catalog.
# Each customer gets 3-5 orders in their lean + 1-2 overlaps.
ORDERS = [
    # Marco — linen / summer / travel
    ("CUST-0001", 1, 1, "55 days"),   # Italian Linen Camp Shirt
    ("CUST-0001", 4, 1, "40 days"),   # Relaxed Oxford Shirt
    ("CUST-0001", 2, 1, "30 days"),   # Wide-Leg Linen Trousers
    ("CUST-0001", 11, 1, "20 days"),  # Linen Camp Shirt
    ("CUST-0001", 6, 1, "10 days"),   # Leather Slide Sandal (overlap Leo)

    # Anya — workwear / neutrals / minimal
    ("CUST-0002", 1, 1, "48 days"),   # Italian Linen Camp Shirt (overlap Marco)
    ("CUST-0002", 35, 1, "35 days"),  # Poplin Band-Collar Shirt
    ("CUST-0002", 5, 1, "25 days"),   # Sundress in Washed Linen
    ("CUST-0002", 19, 1, "12 days"),  # Poplin Shirt Dress

    # Priya — evening / dresses / accessories
    ("CUST-0003", 5, 1, "52 days"),   # Sundress in Washed Linen (overlap Anya)
    ("CUST-0003", 91, 1, "38 days"),  # Gold Hoop Earrings
    ("CUST-0003", 30, 1, "22 days"),  # Brass Cuff Bracelet
    ("CUST-0003", 25, 1, "14 days"),  # Leather Crossbody
    ("CUST-0003", 20, 1, "5 days"),   # Tiered Cotton Maxi

    # Kenji — outerwear / utility
    ("CUST-0004", 9, 1, "45 days"),   # Linen Utility Jacket
    ("CUST-0004", 15, 1, "30 days"),  # Lightweight Chore Jacket
    ("CUST-0004", 17, 1, "18 days"),  # Quilted Vest
    ("CUST-0004", 14, 1, "8 days"),   # Linen Overshirt

    # Sofia — home / candles / gifts
    ("CUST-0005", 28, 2, "50 days"),  # Soy Candle in Ceramic
    ("CUST-0005", 8, 1, "35 days"),   # Ceramic Tumbler Set
    ("CUST-0005", 27, 1, "20 days"),  # Linen Throw Blanket
    ("CUST-0005", 88, 1, "6 days"),   # Incense Bundle
    ("CUST-0005", 25, 1, "12 days"),  # Leather Crossbody (overlap Priya)

    # Leo — footwear / sport / outdoor
    ("CUST-0006", 10, 1, "42 days"),  # Featherweight Trail Runner
    ("CUST-0006", 6, 1, "28 days"),   # Leather Slide Sandal (overlap Marco)
    ("CUST-0006", 22, 1, "16 days"),  # Canvas Court Sneaker
    ("CUST-0006", 67, 1, "9 days"),   # Running Sneaker

    # Imani — bags / dresses
    ("CUST-0007", 25, 1, "44 days"),  # Leather Crossbody (overlap Priya+Sofia)
    ("CUST-0007", 19, 1, "33 days"),  # Poplin Shirt Dress (overlap Anya)
    ("CUST-0007", 20, 1, "21 days"),  # Tiered Cotton Maxi (overlap Priya)
    ("CUST-0007", 73, 1, "7 days"),   # Saddle Bag

    # Haruto — tops / bottoms / home
    ("CUST-0008", 32, 1, "47 days"),  # Boxy Cotton Tee
    ("CUST-0008", 43, 1, "32 days"),  # High-Waist Denim
    ("CUST-0008", 84, 1, "17 days"),  # Cotton Waffle Bath Towel Set
    ("CUST-0008", 8, 1, "4 days"),    # Ceramic Tumbler Set (overlap Sofia)
]

EPISODES = [
    # Marco — linen / summer / travel
    ("CUST-0001", "Browsed mens linen shirts for a Lisbon trip; added one to bag.", -14),
    ("CUST-0001", "Asked about wrinkle-resistance in travel fabrics.", -9),
    ("CUST-0001", "Compared two camp shirts; saved a sage-green one.", -3),

    # Anya — workwear / neutrals
    ("CUST-0002", "Asked for workwear in a muted palette; liked a charcoal blazer.", -18),
    ("CUST-0002", "Filtered dresses under $150, sorted by colour.", -7),
    ("CUST-0002", "Requested fabric care labels on two shirts.", -2),

    # Priya — evening / accessories
    ("CUST-0003", "Viewed two evening dresses; asked which pairs with a gold cuff.", -20),
    ("CUST-0003", "Compared three earring sets; saved a drop-pearl pair.", -11),
    ("CUST-0003", "Asked for bags that match an emerald dress.", -4),

    # Kenji — outerwear / utility
    ("CUST-0004", "Compared utility jackets for layering in autumn.", -15),
    ("CUST-0004", "Asked about water-resistance in waxed cotton.", -6),
    ("CUST-0004", "Saved a quilted vest for weekend hikes.", -1),

    # Sofia — home / gifts
    ("CUST-0005", "Restocked soy candles; asked about scent pairing.", -22),
    ("CUST-0005", "Filtered home goods by price; saved a linen throw.", -8),
    ("CUST-0005", "Asked for a gift bundle recommendation under $100.", -3),

    # Leo — footwear / sport
    ("CUST-0006", "Compared trail runners vs road shoes; saved a trail pair.", -17),
    ("CUST-0006", "Asked about sole durability for long-distance walks.", -5),
    ("CUST-0006", "Viewed canvas sneakers for weekend markets.", -2),

    # Imani — bags / dresses
    ("CUST-0007", "Saved a leather tote for a work conference.", -13),
    ("CUST-0007", "Asked which dresses complement a cognac handbag.", -8),
    ("CUST-0007", "Viewed occasion dresses in jewel tones.", -3),

    # Haruto — tops / home
    ("CUST-0008", "Compared cotton tees for everyday wear.", -16),
    ("CUST-0008", "Asked about towel sets for a bathroom refresh.", -9),
    ("CUST-0008", "Saved a ceramic tumbler set as a housewarming gift.", -2),
]

RETURN_POLICIES = [
    ("Linen",       30, "Unworn, tags attached, original packaging", "Original payment method within 5-7 business days"),
    ("Dresses",     30, "Unworn, tags attached, original packaging", "Original payment method within 5-7 business days"),
    ("Outerwear",   30, "Unworn, tags attached, original packaging", "Original payment method within 5-7 business days"),
    ("Footwear",    30, "Unworn, in original box with tags", "Original payment method within 5-7 business days"),
    ("Accessories", 14, "Unused, original packaging", "Store credit or exchange"),
    ("Bags",        30, "Unused, original packaging, no marks", "Original payment method within 5-7 business days"),
    ("Home",        14, "Unopened, original packaging", "Store credit or exchange"),
    ("Tops",        30, "Unworn, tags attached", "Original payment method within 5-7 business days"),
    ("Bottoms",     30, "Unworn, tags attached", "Original payment method within 5-7 business days"),
]

TOOLS = [
    ("search_products",   "Search the product catalog using semantic similarity. Finds products matching natural language descriptions, styles, occasions, or moods.", False, "search_agent"),
    ("trending_products", "Get trending and popular products. Returns best-sellers ranked by recent purchase velocity and review momentum.", False, "recommendation_agent"),
    ("compare_products",  "Compare two or more products side by side on price, rating, category, and description.", False, "search_agent"),
    ("price_analysis",    "Analyze pricing across categories. Returns min, max, average, and percentile breakdowns.", False, "pricing_agent"),
    ("inventory_health",  "Check inventory levels and stock health. Flags low-stock and out-of-stock items.", False, "inventory_agent"),
    ("restock_product",   "Restock a product by adding units to inventory. Requires approval for quantities over 50.", True, "inventory_agent"),
    ("return_policy",     "Look up the return policy for a product category. Returns window, conditions, and refund method.", False, "support_agent"),
    ("low_stock",         "List products with critically low inventory that may need restocking.", False, "inventory_agent"),
    ("browse_category",   "Browse products filtered by category name. Returns all items in the specified category.", False, "search_agent"),
]


def run(conn_string: str) -> None:
    log.info("Connecting to database...")
    with psycopg.connect(conn_string) as conn:
        with conn.cursor() as cur:
            # 1. DDL — create tables
            log.info("Creating tables (customers, orders, customer_episodic_seed, tools, return_policies)...")
            cur.execute(DDL)
            conn.commit()

            # 2. Customers — upsert
            log.info("Seeding %d customers...", len(CUSTOMERS))
            for cid, name, prefs in CUSTOMERS:
                cur.execute(
                    """INSERT INTO customers (id, name, preferences_summary)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (id) DO UPDATE
                         SET name = EXCLUDED.name,
                             preferences_summary = EXCLUDED.preferences_summary""",
                    (cid, name, prefs),
                )
            conn.commit()

            # 3. Orders — clear and reinsert (idempotent)
            log.info("Seeding %d orders...", len(ORDERS))
            cust_ids = tuple(set(o[0] for o in ORDERS))
            cur.execute(
                "DELETE FROM orders WHERE customer_id = ANY(%s)",
                (list(cust_ids),),
            )
            inserted = 0
            for cid, pid, qty, offset in ORDERS:
                cur.execute(
                    f"""INSERT INTO orders (customer_id, product_id, quantity, placed_at)
                        VALUES (%s, %s, %s, now() - interval '{offset}')
                        ON CONFLICT DO NOTHING""",
                    (cid, pid, qty),
                )
                inserted += cur.rowcount
            log.info("  -> %d order rows inserted", inserted)
            conn.commit()

            # 4. Episodic seed — clear and reinsert
            log.info("Seeding %d episodic memory rows...", len(EPISODES))
            cur.execute(
                "DELETE FROM customer_episodic_seed WHERE customer_id = ANY(%s)",
                (list(cust_ids),),
            )
            for cid, text, offset in EPISODES:
                cur.execute(
                    """INSERT INTO customer_episodic_seed (customer_id, summary_text, ts_offset_days)
                       VALUES (%s, %s, %s)""",
                    (cid, text, offset),
                )
            conn.commit()

            # 5. Return policies — upsert
            log.info("Seeding %d return policies...", len(RETURN_POLICIES))
            for cat, days, cond, refund in RETURN_POLICIES:
                cur.execute(
                    """INSERT INTO blaize_bazaar.return_policies (category_name, return_window_days, conditions, refund_method)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (category_name) DO UPDATE
                         SET return_window_days = EXCLUDED.return_window_days,
                             conditions = EXCLUDED.conditions,
                             refund_method = EXCLUDED.refund_method""",
                    (cat, days, cond, refund),
                )
            conn.commit()

            # 6. Tools — upsert (without embeddings; those get added by seed_tool_registry.py)
            log.info("Seeding %d tools...", len(TOOLS))
            for name, desc, approval, owner in TOOLS:
                cur.execute(
                    """INSERT INTO tools (name, description, requires_approval, owner)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (name) DO UPDATE
                         SET description = EXCLUDED.description,
                             requires_approval = EXCLUDED.requires_approval,
                             owner = EXCLUDED.owner""",
                    (name, desc, approval, owner),
                )
            conn.commit()

            # 7. Verify
            cur.execute("SELECT COUNT(*) FROM customers")
            log.info("  customers: %d", cur.fetchone()[0])
            cur.execute("SELECT COUNT(*) FROM orders")
            log.info("  orders: %d", cur.fetchone()[0])
            cur.execute("SELECT COUNT(*) FROM customer_episodic_seed")
            log.info("  episodic seeds: %d", cur.fetchone()[0])
            cur.execute("SELECT COUNT(*) FROM blaize_bazaar.return_policies")
            log.info("  return policies: %d", cur.fetchone()[0])
            cur.execute("SELECT COUNT(*) FROM tools")
            log.info("  tools: %d", cur.fetchone()[0])

    log.info("Done.")


if __name__ == "__main__":
    conn_str = get_conn_string()
    run(conn_str)
