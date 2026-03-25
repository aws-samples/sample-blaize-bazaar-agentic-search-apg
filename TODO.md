# TODO — Pre-Launch Punch List

Items to address before the workshop goes live.

---

## Data Quality

- [x] **Replace product images with category-matched Unsplash photos** — Done. 24 categories × 6 curated photos, round-robin assigned. All 1,008 products updated.
- [ ] **Per-product image refinement (optional)** — The curated approach assigns category-level images. For higher fidelity, run `scripts/fix_product_images.py` with Unsplash API production access (5,000 req/hour) to match images per-product. ~70% hit rate. Requires: `UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py`

## Screenshots

- [ ] **Add architecture diagrams** — Content pages have `<!-- TODO: Add architecture diagram screenshot -->` placeholders. Mermaid diagrams are in place but static screenshots may be needed for print/PDF versions.
- [ ] **Replace old notebook screenshots** — `static/part1/` through `static/part4/` contain screenshots from the old notebook-based flow. Replace with screenshots of the in-app TODO experience.
- [ ] **Add Getting Started screenshots** — Verify sign-in flow images in `static/prereq/` are accurate for the 2026 workshop environment.
- [ ] **Add Production Deployment screenshots** — Sub-pages under section 6 have `<!-- TODO: Screenshot -->` placeholders for Lambda deploy output, Gateway console, Runtime dashboard, and trace waterfall.

## Workshop Content

- [x] **Update product counts** — All references updated to ~1,000.
- [x] **Solution files validated** — All 8 solution files differ from TODOs and compile clean.
- [x] **Frontend demo queries updated** — DemoChatCarousel, PersonalizationDemo, RAGDemo, GuardrailsDemo all use queries matching the premium dataset.
- [x] **Search limit reduced to 5** — Ensures unique images in all search results.
- [ ] **End-to-end workshop walkthrough** — Run through the full flow in a fresh workshop environment: start in TODO mode, complete each module's challenges (or cp solutions), restart, verify storefront evolves correctly at each stage.

## Infrastructure

- [ ] **Verify CFN templates with premium dataset** — Test a full stack deploy from scratch. Confirm `load-database-fast.sh` loads the premium CSV correctly.
- [ ] **Test AgentCore integration** — Verify Memory, Gateway, and Policy challenges work against a live AgentCore deployment. Test the Code Interpreter analytics agent.
- [ ] **Reload test database** — Run `scripts/load-database-fast.sh` against the test Aurora cluster to load the updated product images.
