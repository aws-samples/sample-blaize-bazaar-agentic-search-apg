-- =========================================================================
-- Migration 002 — /workshop demo seed data (DAT406 Week 1)
-- =========================================================================
-- Seeds the customers + orders tables with 8 demo customers and ~32 orders
-- arranged to give the MEMORY · PROCEDURAL panel visible cohort overlap.
--
-- Customer design:
--   CUST-0001 Marco     — leans linen / summer / travel
--   CUST-0002 Anya      — leans workwear / neutrals / minimal
--   CUST-0003 Priya     — leans evening / jewellery / accessories
--   CUST-0004 Kenji     — leans tech / watches / gear
--   CUST-0005 Sofia     — leans skin care / fragrance / beauty
--   CUST-0006 Leo       — leans shoes / sport / outdoor
--   CUST-0007 Imani     — leans bags / dresses / statement
--   CUST-0008 Haruto    — leans mobile / tablets / home office
--
-- Order design: each customer gets 3-5 orders concentrated in their lean,
-- with 1-2 outlier orders that overlap a neighbouring customer. That
-- overlap is what makes the procedural memory query interesting — the
-- "what did customers similar to me buy?" result shows real cohort
-- patterns, not a single cluster.
--
-- product_ids below are drawn from the live catalog (category prefix
-- ensures they exist: PMENS, PWDRS, PKITC, etc.). ON CONFLICT DO NOTHING
-- makes the whole file idempotent — re-run as many times as you want.
-- =========================================================================

\set ON_ERROR_STOP on

BEGIN;

-- -- customers ---------------------------------------------------------
INSERT INTO customers (id, name, preferences_summary) VALUES
    ('CUST-0001', 'Marco Ferraro',    'Linen & summer staples. Travel-friendly.'),
    ('CUST-0002', 'Anya Volkov',      'Workwear + neutrals. Minimalist.'),
    ('CUST-0003', 'Priya Raman',      'Evening wear, jewellery, statement pieces.'),
    ('CUST-0004', 'Kenji Watanabe',   'Tech, watches, and EDC gear.'),
    ('CUST-0005', 'Sofia Martinez',   'Skin care, fragrance, gift-giving.'),
    ('CUST-0006', 'Leo Okonkwo',      'Performance shoes, outdoor, sport.'),
    ('CUST-0007', 'Imani Clarke',     'Bags, dresses, occasion wear.'),
    ('CUST-0008', 'Haruto Tanaka',    'Mobile + tablets, home office.')
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        preferences_summary = EXCLUDED.preferences_summary;

-- -- orders -----------------------------------------------------------
-- Each block groups a customer's orders. Product ids are drawn from
-- known category prefixes in the live catalog:
--   PSPRT  Sports     PMENS  Mens     PWDRS  Womens Dresses
--   PKITC  Kitchen    PBEAU  Beauty   PSKCA  Skin Care
--   PMOBI  Mobile     PTABL  Tablets  PWBAG  Womens Bags
--   PWJEW  Womens Jewellery
--
-- We stick to a small cross-product set so a minimal catalog (which
-- might not have 1000+ rows) still satisfies the FKs. The WHERE EXISTS
-- guard on the INSERTs below drops rows for product ids that aren't in
-- the catalog — keeps this seed safe against abbreviated catalog loads.
--
-- The timestamps spread orders over the last 60 days so orders_customer_idx
-- has something to sort against; the exact dates don't matter for the
-- showcase query (it groups by product, not by time).

-- Marco (linen / summer): skew to mens shirts + sports
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0001', 'PMENS0001', 1, now() - interval '55 days'),
    ('CUST-0001', 'PMENS0002', 1, now() - interval '40 days'),
    ('CUST-0001', 'PMENS0003', 2, now() - interval '30 days'),
    ('CUST-0001', 'PSPRT0001', 1, now() - interval '20 days'),
    ('CUST-0001', 'PSPRT0002', 1, now() - interval '10 days')
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Anya (workwear / neutrals): mens shirts overlap with Marco + womens dresses
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0002', 'PMENS0001', 1, now() - interval '48 days'),   -- overlap w Marco
    ('CUST-0002', 'PMENS0004', 1, now() - interval '35 days'),
    ('CUST-0002', 'PWDRS0001', 1, now() - interval '25 days'),
    ('CUST-0002', 'PWDRS0002', 1, now() - interval '12 days')
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Priya (evening / jewellery)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0003', 'PWDRS0001', 1, now() - interval '52 days'),   -- overlap w Anya
    ('CUST-0003', 'PWJEW0001', 1, now() - interval '38 days'),
    ('CUST-0003', 'PWJEW0002', 1, now() - interval '22 days'),
    ('CUST-0003', 'PWBAG0001', 1, now() - interval '14 days'),
    ('CUST-0003', 'PWDRS0003', 1, now() - interval '5 days')
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Kenji (tech / watches)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0004', 'PMOBI0001', 1, now() - interval '45 days'),
    ('CUST-0004', 'PMOBI0002', 2, now() - interval '30 days'),
    ('CUST-0004', 'PTABL0001', 1, now() - interval '18 days'),
    ('CUST-0004', 'PTABL0002', 1, now() - interval '8 days')
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Sofia (beauty / skin care)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0005', 'PBEAU0001', 2, now() - interval '50 days'),
    ('CUST-0005', 'PBEAU0002', 1, now() - interval '35 days'),
    ('CUST-0005', 'PSKCA0001', 3, now() - interval '20 days'),
    ('CUST-0005', 'PSKCA0002', 1, now() - interval '6 days'),
    ('CUST-0005', 'PWBAG0001', 1, now() - interval '12 days')   -- overlap w Priya
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Leo (sport / outdoor)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0006', 'PSPRT0001', 2, now() - interval '42 days'),   -- overlap w Marco
    ('CUST-0006', 'PSPRT0002', 1, now() - interval '28 days'),   -- overlap w Marco
    ('CUST-0006', 'PSPRT0003', 1, now() - interval '16 days'),
    ('CUST-0006', 'PMENS0003', 1, now() - interval '9 days')    -- overlap w Marco
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Imani (bags / dresses)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0007', 'PWBAG0001', 1, now() - interval '44 days'),   -- overlap w Priya+Sofia
    ('CUST-0007', 'PWDRS0002', 1, now() - interval '33 days'),   -- overlap w Anya
    ('CUST-0007', 'PWDRS0003', 1, now() - interval '21 days'),   -- overlap w Priya
    ('CUST-0007', 'PWJEW0001', 1, now() - interval '7 days')    -- overlap w Priya
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

-- Haruto (mobile / home office)
INSERT INTO orders (customer_id, product_id, quantity, placed_at)
SELECT * FROM (VALUES
    ('CUST-0008', 'PMOBI0001', 1, now() - interval '47 days'),   -- overlap w Kenji
    ('CUST-0008', 'PMOBI0002', 1, now() - interval '32 days'),   -- overlap w Kenji
    ('CUST-0008', 'PTABL0001', 1, now() - interval '17 days'),   -- overlap w Kenji
    ('CUST-0008', 'PKITC0001', 1, now() - interval '4 days')
) AS v(customer_id, product_id, quantity, placed_at)
WHERE EXISTS (
    SELECT 1 FROM blaize_bazaar.product_catalog
    WHERE "productId" = v.product_id
)
ON CONFLICT DO NOTHING;

COMMIT;

\echo '✅ Migration 002 complete — demo customers + orders seeded'

-- Self-check: how many orders landed? (some may be skipped if catalog
-- doesn't have the referenced product ids — that's expected in
-- stripped-down dev envs, just means the cohort overlap is sparser).
SELECT c.id, c.name, COUNT(o.id) AS orders_placed
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
