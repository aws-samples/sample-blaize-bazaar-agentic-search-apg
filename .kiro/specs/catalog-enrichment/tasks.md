# Tasks

## Task 1: Create the Trim Script

- [x] 1. Create `scripts/trim-catalog.py` that reads `data/product-catalog-cohere-v4.csv`, scores unlocked products per category using the weighted formula (40% reviews, 30% description length, 20% isBestSeller, 10% price diversity), keeps 25 products for each of the 11 Demo_Critical_Categories and 12 for each of the 13 Supporting_Categories, preserves all 29 Locked_Products unconditionally, and writes `data/product-catalog-trimmed.csv` with all original CSV columns including embeddings. Print per-category summary and locked product verification. Support `--dry-run` flag that validates logic without writing output.

## Task 2: Create the Add New Products Script

- [x] 2. Create `scripts/add-new-products.py` that reads `data/product-catalog-trimmed.csv`, creates 13 new products (6 headphones PMOBI0043-0048, 4 drinkware PSPRT0043-0046, 3 gift sets PBEAU0043/PKITC0043/PSKCA0043) with hardcoded descriptions/prices/stars/reviews/quantities from the design doc, resolves category_id from the trimmed CSV, fetches Unsplash images using `raw` URL format with `?w=400&q=80&fit=crop` params (with placeholder fallback on failure), generates 1024-dim embeddings via Cohere Embed v4 (`us.cohere.embed-v4:0`, `input_type: search_document`), and writes `data/product-catalog-trimmed-added.csv` (444 rows). Requires env vars: `AWS_REGION`, `UNSPLASH_ACCESS_KEY`. Support `--dry-run` flag that skips API calls.

## Task 3: Create the Enrich Descriptions Script

- [x] 3. Create `scripts/enrich-descriptions.py` that reads `data/product-catalog-trimmed-added.csv` and applies three enrichment passes: (a) append `" Available {color}."` to 39 products per the COLOR_MAP from the design doc, (b) append material descriptions to 5 products per the MATERIAL_MAP, (c) prefix `"CLEARANCE — "` to ~15 well-stocked (qty>100) non-locked products and multiply their price by 0.4. Skip-and-warn for any productId not found in the CSV. Re-embed all modified descriptions via Cohere Embed v4 (`input_type: search_document`). Write `data/product-catalog-enriched.csv` (444 rows). Support `--dry-run` flag.

## Task 4: Create the Post-Load SQL Script

- [x] 4. Create `scripts/post-load-adjustments.sql` with two UPDATE statements using CTEs: (a) star rating redistribution ordered by `md5("productId")` — 3% at 2.0-2.9, 7% at 3.0-3.4, 15% at 3.5-3.9, 35% at 4.0-4.4, 40% at 4.5-5.0 — excluding 42 products (all 29 locked products + all 13 new products); (b) inventory redistribution ordered by `md5("productId" || 'inv')` — 6% at 0, 8% at 1-5, 12% at 6-15, 34% at 16-100, 40% at 101-1000 — excluding 14 products (all 13 new products + PSUNG0007). IMPORTANT: the star and inventory exclusion lists are intentionally different — do NOT unify them into a single shared list.

## Task 5: Create the Load Database Script

- [x] 5. Create `scripts/load-database-fast.sh` based on the existing `scripts/seed-database.sh` with these changes: (a) look for `data/product-catalog-enriched.csv` first, fall back to `data/product-catalog-cohere-v4.csv` with a warning; (b) after CSV import and index creation, execute `\i` on `post-load-adjustments.sql`; (c) run VACUUM ANALYZE after post-load adjustments. Preserve all existing behavior: schema creation, table schema, all 7 indexes (HNSW m=16/ef_construction=128, FTS GIN, category, price, stars, category-price composite, bestseller), session management tables, and permission grants.

## Task 6: Validation and Verification

- [x] 6. Create two validation scripts: (a) `scripts/validate-enrichment.py` that reads `data/product-catalog-enriched.csv` and validates correctness properties P1-P4 and P8-P10 from the design doc — locked products present (P1), category counts exact (P2), new product embeddings valid (P3), enriched descriptions are supersets (P4), CSV column integrity (P8), no duplicate productIds (P9), clearance price reduction correct (P10) — printing PASS/FAIL for each property; (b) `scripts/validate-post-load.sql` as a runnable SQL script that checks P5 (all 13 new product quantities match specified values + PSUNG0007 qty=1), P6 (star distribution within bounds: 40-55 below 3.5, 160-200 at 4.5+), and P7 (inventory distribution: 20-30 out of stock, 75-105 low stock) — using SELECT statements that print labeled results for each check.
