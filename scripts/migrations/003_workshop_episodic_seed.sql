-- =========================================================================
-- Migration 003 — /workshop episodic memory seed (DAT406 Week 2)
-- =========================================================================
-- Adds one table — customer_episodic_seed — that backs the
-- "welcome-back" turn on /workshop. When a known demo customer is
-- picked from the chat's picker, the Atelier emits a MEMORY · EPISODIC
-- panel reading 3-5 rows from here so the first turn lands with real
-- continuity ("last session you added a linen shirt for Lisbon").
--
-- Ownership split — teaching intent:
--
--   Episodic   — AGENTCORE interface, Aurora-seeded fixture in dev.
--                In prod, AgentCore Memory owns the session history.
--                This table is the OFFLINE FALLBACK so the workshop
--                runs without a provisioned AgentCore Memory resource.
--   Procedural — AURORA, always. orders ⋈ product_catalog IS the
--                procedural signal; no primitive to delegate to.
--   Preferences— AURORA primary (customers.preferences_summary),
--                AgentCore mirror under user:{id}:preferences.
--
-- Runs after 002_workshop_seed.sql so the customer FK target exists.
-- Idempotent — safe to re-run.
-- =========================================================================

\set ON_ERROR_STOP on

BEGIN;

-- -- customer_episodic_seed ---------------------------------------------
-- One row per seeded past turn. ``ts_offset_days`` is negative and
-- resolved at read time (``now() - interval '${offset} days'``) so
-- the workshop never ships with a calendar date baked into the data.
-- ``summary_text`` is the compact narrative shown as a panel row;
-- keep it under ~90 chars so it renders cleanly in the Atelier's
-- right-rail card without truncation.
CREATE TABLE IF NOT EXISTS customer_episodic_seed (
    id              BIGSERIAL PRIMARY KEY,
    customer_id     TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    summary_text    TEXT NOT NULL,
    ts_offset_days  INTEGER NOT NULL CHECK (ts_offset_days <= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_episodic_seed_customer_idx
    ON customer_episodic_seed (customer_id, ts_offset_days DESC);

-- -- seed rows ----------------------------------------------------------
-- 3-5 episodes per demo customer, arranged oldest → newest. The
-- most-recent row is what the "welcome-back" turn reads; older rows
-- give the MEMORY · EPISODIC panel enough context to feel lived-in.
--
-- Clear-and-reinsert keeps this idempotent and lets us rewrite the
-- narratives without managing conflict keys.
DELETE FROM customer_episodic_seed
WHERE customer_id IN (
    'CUST-0001','CUST-0002','CUST-0003','CUST-0004',
    'CUST-0005','CUST-0006','CUST-0007','CUST-0008'
);

INSERT INTO customer_episodic_seed (customer_id, summary_text, ts_offset_days) VALUES
    -- Marco — linen / summer / travel
    ('CUST-0001', 'Browsed mens linen shirts for a Lisbon trip; added one to bag.', -14),
    ('CUST-0001', 'Asked about wrinkle-resistance in travel fabrics.', -9),
    ('CUST-0001', 'Compared two camp shirts; saved a sage-green one.',  -3),

    -- Anya — workwear / neutrals / minimal
    ('CUST-0002', 'Asked for workwear in a muted palette; liked a charcoal blazer.', -18),
    ('CUST-0002', 'Filtered dresses under $120, sorted by colour.', -7),
    ('CUST-0002', 'Requested fabric care labels on two shirts.', -2),

    -- Priya — evening / jewellery / statement
    ('CUST-0003', 'Viewed two evening dresses; asked which pairs with a gold cuff.', -20),
    ('CUST-0003', 'Compared three earring sets; saved a drop-pearl pair.', -11),
    ('CUST-0003', 'Asked for bags that match an emerald dress.', -4),

    -- Kenji — tech / watches / gear
    ('CUST-0004', 'Compared two phones on battery + weight; saved one.', -15),
    ('CUST-0004', 'Asked about tablet keyboards with backlighting.', -6),
    ('CUST-0004', 'Priced a pair of headphones vs. earbuds for travel.', -1),

    -- Sofia — beauty / skin care
    ('CUST-0005', 'Restocked a vitamin-C serum; asked about pairing with retinol.', -22),
    ('CUST-0005', 'Filtered fragrances by "clean" notes; saved two.', -8),
    ('CUST-0005', 'Asked for a travel-size sunscreen recommendation.', -3),

    -- Leo — sport / outdoor
    ('CUST-0006', 'Compared trail runners vs. road; saved a pair of trail shoes.', -17),
    ('CUST-0006', 'Asked about moisture-wicking layers for a half-marathon.', -5),
    ('CUST-0006', 'Viewed hiking daypacks under 20 litres.', -2),

    -- Imani — bags / dresses / statement
    ('CUST-0007', 'Saved a leather tote for a work conference.', -13),
    ('CUST-0007', 'Asked which dresses complement a cognac handbag.', -8),
    ('CUST-0007', 'Viewed occasion dresses in jewel tones.', -3),

    -- Haruto — mobile / home office
    ('CUST-0008', 'Compared two tablets for note-taking; saved one.', -16),
    ('CUST-0008', 'Asked about a monitor arm for a small desk.', -9),
    ('CUST-0008', 'Priced a mechanical keyboard with quiet switches.', -2);

COMMIT;

\echo '✅ Migration 003 complete — customer_episodic_seed table + 24 seed rows'

-- Self-check: how many episodes per demo customer?
SELECT customer_id, COUNT(*) AS episodes
FROM customer_episodic_seed
GROUP BY customer_id
ORDER BY customer_id;
