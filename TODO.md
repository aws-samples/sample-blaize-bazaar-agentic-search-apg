# TODO — Pre-Launch Punch List

Items to address before the workshop goes live.

---

## Data Quality

- [ ] **Fix image/description mismatches in premium dataset** — Several products in `data/premium-products-with-embeddings.csv` have Unsplash stock photos that don't match the product description (e.g., "water bottle" shows a cyclist). Audit all ~1,000 products and replace mismatched `imgUrl` values. Reload DB after fixing.

## Screenshots

- [ ] **Add architecture diagrams** — Content pages have `<!-- TODO: Add architecture diagram screenshot -->` placeholders in sections 3-6. Create diagrams showing the pgvector pipeline, agent tool flow, multi-agent routing, and AgentCore architecture.
- [ ] **Replace old notebook screenshots** — `static/part1/` through `static/part4/` contain screenshots from the old notebook-based flow (notebook-auto-open.png, open-part1.png, etc.). Replace with screenshots of the in-app TODO experience.
- [ ] **Add Getting Started screenshots** — The Getting Started page references sign-in flow images from `static/prereq/` — verify these are still accurate for the 2026 environment.

## Workshop Content

- [ ] **Update product counts in content if dataset changes** — If the premium dataset grows beyond ~1,000 products, update references in Welcome page, FAQs, Troubleshooting, and Credits.
- [ ] **Test all `cp solutions/...` commands end-to-end** — Run through the full workshop flow: start in TODO mode, cp each solution file, restart, verify each module works in the storefront.
- [ ] **Verify Blaize Bazaar Demo page queries** — The demo page in the workshop content still references old queries. Update with queries that work well against the premium dataset.

## Infrastructure

- [ ] **Verify CFN templates work with premium dataset** — The `load-database-fast.sh` script references the premium CSV. Test a full stack deploy from scratch to confirm the bootstrap loads correctly.
- [ ] **Test AgentCore integration (Module 4)** — Challenges 3-4 (Memory + Gateway) need a live AgentCore environment. Verify the TODO fallbacks and solution files work against a real AgentCore deployment.
