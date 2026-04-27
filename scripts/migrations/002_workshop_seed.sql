-- =========================================================================
-- Migration 002 — workshop demo seed data
-- =========================================================================
-- Seeds the customers + orders tables with the 3 persona customers.
-- Superseded by seed_personas.py for live seeding (handles integer
-- product IDs from the boutique catalog). This SQL file is kept for
-- schema reference and as a fallback if the Python seeder isn't available.
--
-- Customer design:
--   CUST-MARCO  Marco         — returning, linen / summer / travel
--   CUST-ANNA   Anna          — gift-giver, milestone occasions
--   CUST-FRESH  A new visitor — empty memory, cold start
-- =========================================================================
\
set ON_ERROR_STOP on BEGIN;
-- -- customers ---------------------------------------------------------
INSERT INTO customers (id, name, preferences_summary)
VALUES (
        'CUST-MARCO',
        'Marco',
        'Linen and summer staples. Travel-friendly. Warm neutrals.'
    ),
    (
        'CUST-ANNA',
        'Anna',
        'Buys for others. Gift-giver. Milestone occasions.'
    ),
    ('CUST-FRESH', 'A new visitor', '') ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name,
    preferences_summary = EXCLUDED.preferences_summary;
-- -- orders -----------------------------------------------------------
-- Orders use integer productIds from the boutique catalog.
-- Run seed_personas.py for the full order set; this SQL is reference only.
-- Marco — 7 orders (linen / summer / travel)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
VALUES ('CUST-MARCO', 1, 1, now() - interval '56 days'),
    ('CUST-MARCO', 4, 1, now() - interval '48 days'),
    ('CUST-MARCO', 9, 1, now() - interval '40 days'),
    ('CUST-MARCO', 6, 1, now() - interval '32 days'),
    ('CUST-MARCO', 3, 1, now() - interval '24 days'),
    ('CUST-MARCO', 8, 1, now() - interval '16 days'),
    ('CUST-MARCO', 7, 1, now() - interval '8 days') ON CONFLICT DO NOTHING;
-- Anna — 5 orders (gift-shaped, varied price bands)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
VALUES ('CUST-ANNA', 5, 1, now() - interval '40 days'),
    ('CUST-ANNA', 7, 1, now() - interval '32 days'),
    ('CUST-ANNA', 3, 1, now() - interval '24 days'),
    ('CUST-ANNA', 8, 1, now() - interval '16 days'),
    ('CUST-ANNA', 6, 1, now() - interval '8 days') ON CONFLICT DO NOTHING;
-- Fresh visitor — no orders
COMMIT;
\ echo '✅ Migration 002 complete — 3 persona customers + orders seeded'