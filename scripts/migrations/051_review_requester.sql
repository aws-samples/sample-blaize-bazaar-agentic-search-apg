-- =========================================================================
-- 051_review_requester.sql — who asked for the action a review carries.
--
-- A review opened from a storefront turn used to record only the customer the
-- proposal names. That customer came from the tool arguments, which on an
-- anonymous session come from the persona the shopper picked in the UI. An
-- operator reading the queue could not tell a signed-in Theo from a stranger
-- who chose the Theo persona, and approving the second produced a real write
-- against the real Theo's rows.
--
-- The review now binds the requester's verified identity, or its explicit
-- absence, at the moment it is opened:
--
--   requested_by_sub   the Cognito subject of the principal whose turn opened
--                      the review; NULL when no verified principal was present
--   requester_kind     shopper    — a verified shopper token opened it
--                      operator   — staff prepared it on the desk
--                      unverified — an anonymous session opened it; the
--                                   customer named on the review is a
--                                   storefront selection, not a proved identity
--
-- The requesting customer, the staff actor who decides, and the customer scope
-- the write runs under stay three separate facts: `requested_by_sub` here,
-- `decided_by` beside it, and `principal_customers` at execution time.
-- =========================================================================

\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE pellier.approvals
    ADD COLUMN IF NOT EXISTS requested_by_sub TEXT,
    ADD COLUMN IF NOT EXISTS requester_kind TEXT NOT NULL DEFAULT 'unverified';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'approvals_requester_kind_check'
    ) THEN
        ALTER TABLE pellier.approvals
            ADD CONSTRAINT approvals_requester_kind_check
            CHECK (requester_kind IN ('shopper', 'operator', 'unverified'));
    END IF;
END $$;

COMMENT ON COLUMN pellier.approvals.requested_by_sub IS
    'Cognito subject whose turn opened the review; NULL when no verified principal was present.';
COMMENT ON COLUMN pellier.approvals.requester_kind IS
    'shopper (verified token), operator (prepared on the desk), or unverified (anonymous session; the customer is a storefront selection).';

COMMIT;
