-- =========================================================================
-- Migration 003 — episodic memory seed for the 3 persona customers
-- =========================================================================
-- Seeds customer_episodic_seed with LTM facts for Marco and Anna.
-- CUST-FRESH gets no rows (empty memory — the cold-start contrast).
--
-- Idempotent: DELETE + re-INSERT per customer.
-- Superseded by seed_personas.py for live seeding.
-- =========================================================================
\
set ON_ERROR_STOP on BEGIN;
-- Create table if not exists (same DDL as original migration)
CREATE TABLE IF NOT EXISTS customer_episodic_seed (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    ts_offset_days INTEGER NOT NULL CHECK (ts_offset_days <= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_episodic_seed_customer_idx ON customer_episodic_seed (customer_id, ts_offset_days DESC);
-- Clear and re-insert for the 3 personas
DELETE FROM customer_episodic_seed
WHERE customer_id IN ('CUST-MARCO', 'CUST-ANNA', 'CUST-FRESH');
INSERT INTO customer_episodic_seed (customer_id, summary_text, ts_offset_days)
VALUES -- Marco — linen / summer / travel
    (
        'CUST-MARCO',
        'Prefers natural fibers, oat tones',
        -60
    ),
    (
        'CUST-MARCO',
        'Bought Maren tunic oat last August',
        -45
    ),
    ('CUST-MARCO', 'Sizes consistently in M', -40),
    (
        'CUST-MARCO',
        'Browsed mens linen shirts for a Lisbon trip; added one to bag.',
        -14
    ),
    (
        'CUST-MARCO',
        'Asked about wrinkle-resistance in travel fabrics.',
        -9
    ),
    (
        'CUST-MARCO',
        'Compared two camp shirts; saved a sage-green one.',
        -3
    ),
    -- Anna — gift-giver
    (
        'CUST-ANNA',
        'Past orders skew gift-shaped — multiple recipients, varied price bands',
        -50
    ),
    (
        'CUST-ANNA',
        'Recent searches mention ''for my mother''',
        -20
    ),
    (
        'CUST-ANNA',
        'Price bands range $140 to $310, milestone-leaning',
        -15
    ),
    (
        'CUST-ANNA',
        'Bought a sundress as a birthday gift last month',
        -30
    ),
    (
        'CUST-ANNA',
        'Asked about gift wrapping and delivery timing for an anniversary',
        -9
    );
-- CUST-FRESH — no episodes (empty memory)
COMMIT;
\ echo '✅ Migration 003 complete — episodic seed for 3 personas'