# Catalog Enrichment Specification v2 — Query-Backward Design

## Design Philosophy

Instead of patching 1,008 products with workarounds, **design the catalog backward from every query that needs to work**. Start with the demo, derive the products.

**Current catalog:** 1,008 products, 24 categories, 42 each, uniform quality (3.9–5.0★), 1 out-of-stock, 0 headphones, 0 tumblers, 0 noise-canceling anything.

**Target catalog:** ~446 products, 24 categories, variable per category, realistic quality/inventory distributions, every scripted query guaranteed 3–5 results.

---

## The Constraint Budget

| Resource | Limit | Usage |
|----------|-------|-------|
| Unsplash free tier | 50 calls/hour | ~15 new images (1 batch, done in minutes) |
| Cohere Embed v4 via Bedrock | ~$0.01 per 1K calls | ~115 embeddings (new products + color-modified descriptions) |
| Existing images | 1,008 already sourced | Reuse ~431 (no API calls needed) |
| Existing embeddings | 1,008 already generated | Reuse ~331 unchanged products |

---

## Step 1: Trim — Keep the Best Products Per Category

Remove the weakest 562 products. Keep products that maximize brand diversity, price range spread, and description quality.

### Selection criteria for "keep" priority

1. Recognizable brand names (Apple, Samsung, Nike, Sony — workshop audiences know these)
2. Price diversity within category (keep cheapest, mid-range, and premium)
3. Description length and richness (longer descriptions produce better embeddings)
4. Products referenced in scripted queries (MacBook Air, Samsung Galaxy S24, etc.)

### Keep counts

| Category | Keep | Role | Why |
|----------|------|------|-----|
| Laptops | 25 | Demo-critical | "laptop under $800", "MacBook Air", trending, pricing |
| Smartphones | 25 | Demo-critical | "Samsung Galaxy S24", pricing comparisons |
| Mobile Accessories | 25 | Demo-critical | "protect my iPhone", plus 6 new headphone products here |
| Mens Shoes | 25 | Demo-critical | "running shoes under $80", "comfortable shoes" |
| Womens Shoes | 25 | Demo-critical | "comfortable shoes for standing all day" |
| Beauty | 25 | Demo-critical | "trending in beauty", gift sets |
| Skin Care | 25 | Demo-critical | "skincare routine for dry skin" |
| Kitchen Accessories | 25 | Demo-critical | "gift for someone who loves cooking" |
| Sports Accessories | 25 | Demo-critical | "keep my drinks cold", fitness gear, 4 new tumbler products here |
| Mens Watches | 25 | Demo-critical | "cheapest watches", Rolex for keyword demo |
| Womens Watches | 25 | Demo-critical | "cheapest watches" |
| Fragrances | 12 | Supporting | Store variety |
| Furniture | 12 | Supporting | Store variety |
| Groceries | 12 | Supporting | Store variety, low price point anchor |
| Home Decoration | 12 | Supporting | Store variety |
| Mens Shirts | 12 | Supporting | Store variety |
| Motorcycle | 12 | Supporting | High-price anchor for price analysis |
| Sunglasses | 12 | Supporting | Store variety (PSUNG0007 needed for restock demo) |
| Tablets | 12 | Supporting | "Electronics" broad category mapping |
| Tops | 12 | Supporting | Store variety |
| Vehicle | 12 | Supporting | High-price anchor |
| Womens Bags | 12 | Supporting | "leather bag" query |
| Womens Dresses | 12 | Supporting | Store variety |
| Womens Jewellery | 12 | Supporting | "something nice for date night" |
| **Total** | **431** | | |

### Products to lock (never trim these)

These are explicitly referenced in scripted queries or the restock demo:

```
PLAPT0001  Apple MacBook Air M2          — keyword demo
PLAPT0016  Apple MacBook Air M1          — keyword demo
PLAPT0007  Apple MacBook Pro 14 M3       — premium laptop
PLAPT0026  Acer Aspire 5 ($549.99)       — "laptop under $800"
PLAPT0033  HP Pavilion 15 ($499.99)      — cheapest laptop
PLAPT0010  Lenovo IdeaPad Slim 5i ($749) — "laptop under $800"
PSMRT0001  Samsung Galaxy S24 Ultra      — keyword demo
PSMRT0009  Samsung Galaxy A54 ($449)     — affordable smartphone
PSMRT0039  Samsung Galaxy A25 ($299)     — cheapest smartphone
PMOBI0002  Spigen iPhone Case            — "protect my iPhone"
PMOBI0004  RhinoShield Case              — "protect my iPhone"
PKITC0010  Victorinox Chef's Knife       — "gift for cooking"
PKITC0005  KitchenAid Spatula Set        — "gift for cooking"
PSPRT0022  Hydro Flask Insulated         — "keep drinks cold"
PSPRT0027  Camelbak Chill                — "keep drinks cold"
PMSHO0011  New Balance 990v5             — running shoe anchor
PMSHO0016  Saucony Kinvara              — running shoe
PMSHO0017  Brooks Adrenaline            — running shoe
PMSHO0018  ASICS Gel-Nimbus             — running shoe
PMSHO0021  Hoka Clifton                 — running shoe
PMSHO0036  Skechers GOwalk ($74.99)     — "shoes under $80"
PWSHO0019  Skechers Go Walk Joy ($64.99) — "comfortable shoes"
PWSHO0009  Clarks Cloudsteppers ($59.99) — "comfortable shoes"
PWSHO0022  Hoka Bondi 8                 — running shoe
PWSHO0028  Brooks Adrenaline            — running shoe
PSUNG0007  Quay Sunglasses (qty=1)      — restock demo target
PMWAT0001  Rolex Submariner             — keyword demo
```

### Trim implementation

```python
# scripts/trim-catalog.py
import pandas as pd

df = pd.read_csv('product-catalog-cohere-v4.csv')

DEMO_CRITICAL = {
    'Laptops', 'Smartphones', 'Mobile Accessories', 'Mens Shoes', 'Womens Shoes',
    'Beauty', 'Skin Care', 'Kitchen Accessories', 'Sports Accessories',
    'Mens Watches', 'Womens Watches'
}

LOCKED_IDS = {
    'PLAPT0001', 'PLAPT0016', 'PLAPT0007', 'PLAPT0026', 'PLAPT0033', 'PLAPT0010',
    'PSMRT0001', 'PSMRT0009', 'PSMRT0039',
    'PMOBI0002', 'PMOBI0004',
    'PKITC0010', 'PKITC0005',
    'PSPRT0022', 'PSPRT0027',
    'PMSHO0011', 'PMSHO0016', 'PMSHO0017', 'PMSHO0018', 'PMSHO0021', 'PMSHO0036',
    'PWSHO0019', 'PWSHO0009', 'PWSHO0022', 'PWSHO0028',
    'PSUNG0007',
    'PMWAT0001',
}

keep_rows = []
for cat in df['category_name'].unique():
    cat_df = df[df['category_name'] == cat]
    target = 25 if cat in DEMO_CRITICAL else 12

    locked = cat_df[cat_df['productId'].isin(LOCKED_IDS)]
    unlocked = cat_df[~cat_df['productId'].isin(LOCKED_IDS)]

    unlocked = unlocked.copy()
    unlocked['_score'] = (
        unlocked['reviews'] / unlocked['reviews'].max() * 0.4
        + unlocked['product_description'].str.len() / 200 * 0.3
        + unlocked['isBestSeller'].astype(float) * 0.2
        + (1 - unlocked.groupby('category_name')['price'].rank(pct=True).abs()) * 0.1
    )

    remaining_slots = target - len(locked)
    best_unlocked = unlocked.nlargest(max(0, remaining_slots), '_score')

    keep_rows.append(locked)
    keep_rows.append(best_unlocked.drop(columns=['_score']))

trimmed = pd.concat(keep_rows, ignore_index=True)
print(f"Trimmed: {len(df)} -> {len(trimmed)} products")
trimmed.to_csv('product-catalog-trimmed.csv', index=False)
```

---

## Step 2: Add Missing Products (~13 new products)

These products fill zero-match gaps for scripted queries. Each needs a new Unsplash image and a new Cohere Embed v4 embedding.

### Headphones and Audio (add to Mobile Accessories)

| productId | product_description | price | stars | reviews | qty |
|-----------|-------------------|-------|-------|---------|-----|
| PMOBI0043 | Sony WH-1000XM5 Wireless Noise-Canceling Headphones — Industry-leading noise cancellation with Auto NC Optimizer, 30-hour battery life, and premium comfort ear cushions. | 348.00 | 4.8 | 5421 | 312 |
| PMOBI0044 | Apple AirPods Pro 2nd Gen USB-C — Active noise cancellation with adaptive transparency, personalized spatial audio, and MagSafe charging case. | 249.00 | 4.7 | 8932 | 8 |
| PMOBI0045 | JBL Tune 510BT Wireless On-Ear Headphones — 40-hour battery life, foldable flat design, JBL Pure Bass sound, lightweight and comfortable. | 29.95 | 4.4 | 3241 | 445 |
| PMOBI0046 | Samsung Galaxy Buds3 Pro True Wireless — AI-powered adaptive noise cancellation, 360 audio, IPX7 sweat and water resistant. | 229.99 | 4.6 | 2876 | 6 |
| PMOBI0047 | Beats Solo 4 Wireless On-Ear Headphones — Personalized spatial audio with head tracking, 50-hour battery, USB-C fast fuel charging. | 199.99 | 4.5 | 4102 | 203 |
| PMOBI0048 | Anker Soundcore Life Q20+ Noise-Canceling Headphones — Hybrid active noise cancellation, 40-hour playtime, Hi-Res Audio certified, ultra-soft protein earcups. | 49.99 | 4.4 | 6543 | 538 |

### Insulated Drinkware (add to Sports Accessories)

| productId | product_description | price | stars | reviews | qty |
|-----------|-------------------|-------|-------|---------|-----|
| PSPRT0043 | YETI Rambler 26oz Stainless Steel Bottle with Straw Cap — Double-wall vacuum-insulated, keeps drinks cold for 24 hours, dishwasher safe, durable DuraCoat color. | 40.00 | 4.8 | 7891 | 267 |
| PSPRT0044 | Stanley Quencher H2.0 FlowState Tumbler 40oz — Double-wall vacuum-insulated stainless steel tumbler, rotating three-position lid, fits car cup holders. | 35.00 | 4.7 | 12453 | 4 |
| PSPRT0045 | Owala FreeSip 24oz Insulated Water Bottle — Patented dual-drinking straw and chug lid, double-wall vacuum-insulated stainless steel, BPA-free. | 27.99 | 4.6 | 9234 | 389 |
| PSPRT0046 | Corkcicle Classic Canteen 16oz — Triple-insulated stainless steel bottle, keeps drinks cold 25 hours or hot 12, non-slip ergonomic flat sides. | 32.95 | 4.5 | 3456 | 156 |

### Gift Sets (add to existing categories)

| productId | product_description | price | stars | reviews | qty | category_name |
|-----------|-------------------|-------|-------|---------|-----|---------------|
| PBEAU0043 | Burt's Bees Essential Holiday Gift Set — 5-piece skincare collection with lip balm, cuticle cream, hand salve, body lotion, and foot cream in a decorative gift box. | 14.99 | 4.7 | 5621 | 711 | Beauty |
| PKITC0043 | Lodge Cast Iron Starter Gift Set — 10.25-inch skillet, 5-quart dutch oven with lid, and silicone handle holder, pre-seasoned and ready to cook. | 79.99 | 4.8 | 4321 | 0 | Kitchen Accessories |
| PSKCA0043 | CeraVe Skincare Gift Set — Hydrating facial cleanser, daily moisturizing lotion, and eye repair cream in a gift-ready box for all skin types. | 34.99 | 4.6 | 3892 | 423 | Skin Care |

### Unsplash search terms for new product images

| productId | Unsplash search query |
|-----------|---------------------|
| PMOBI0043 | `sony headphones wireless over ear` |
| PMOBI0044 | `airpods pro white case` |
| PMOBI0045 | `blue wireless headphones flat lay` |
| PMOBI0046 | `wireless earbuds charging case` |
| PMOBI0047 | `beats headphones red` |
| PMOBI0048 | `black over ear headphones minimal` |
| PSPRT0043 | `yeti water bottle outdoor` |
| PSPRT0044 | `stanley tumbler cup holder` |
| PSPRT0045 | `colorful water bottle stainless` |
| PSPRT0046 | `insulated canteen bottle minimal` |
| PBEAU0043 | `skincare gift set box` |
| PKITC0043 | `cast iron skillet cooking` |
| PSKCA0043 | `skincare products minimal white` |

**Total Unsplash API calls: 13** (well within 50/hour limit)

---

## Step 3: Add Color/Material to ~70 Existing Descriptions

Modify product descriptions to include color and material. Requires re-embedding only the modified products. No new images needed.

### Color assignments

```python
COLOR_MAP = {
    'Mens Shoes': [
        ('PMSHO0011', 'in Black'),         # New Balance 990v5
        ('PMSHO0016', 'in Navy Blue'),      # Saucony Kinvara
        ('PMSHO0017', 'in Grey'),           # Brooks Adrenaline
        ('PMSHO0018', 'in White'),          # ASICS Gel-Nimbus
        ('PMSHO0021', 'in Orange'),         # Hoka Clifton
        ('PMSHO0024', 'in All Black'),      # On Cloud 5
        ('PMSHO0031', 'in Core Black'),     # Adidas Ultraboost
        ('PMSHO0036', 'in Charcoal'),       # Skechers GOwalk
    ],
    'Womens Shoes': [
        ('PWSHO0010', 'in Grey'),           # New Balance 990v5
        ('PWSHO0019', 'in Navy'),           # Skechers Go Walk Joy
        ('PWSHO0022', 'in Black'),          # Hoka Bondi
        ('PWSHO0028', 'in Blue'),           # Brooks Adrenaline
        ('PWSHO0032', 'in Lavender'),       # Crocs Classic
        ('PWSHO0039', 'in All White'),      # On Cloud 5
    ],
    'Womens Bags': [
        ('PWBAG0001', 'in Black Leather'),
        ('PWBAG0002', 'in Brown Leather'),
        ('PWBAG0004', 'in Signature Canvas'),
        ('PWBAG0006', 'in Tan Suede'),
        ('PWBAG0010', 'in Navy Nylon'),
    ],
    'Mens Shirts': [
        ('PMSHR0001', 'in White'),
        ('PMSHR0003', 'in Light Blue'),
        ('PMSHR0005', 'in Navy Stripe'),
        ('PMSHR0008', 'in Charcoal'),
    ],
    'Sunglasses': [
        ('PSUNG0001', 'in Matte Black'),
        ('PSUNG0003', 'in Tortoise'),
        ('PSUNG0007', 'in Black'),
        ('PSUNG0010', 'in Gold'),
    ],
    'Womens Dresses': [
        ('PWDRS0001', 'in Black'),
        ('PWDRS0003', 'in Floral Print'),
        ('PWDRS0005', 'in Navy'),
        ('PWDRS0008', 'in Burgundy'),
    ],
    'Tops': [
        ('PTOPS0001', 'in White'),
        ('PTOPS0003', 'in Grey Heather'),
        ('PTOPS0005', 'in Black'),
        ('PTOPS0008', 'in Olive'),
    ],
}
# Apply: append " Available {color}." to description end, re-embed
# ~50 products
```

### Material assignments

```python
MATERIAL_MAP = {
    'Womens Bags': [
        ('PWBAG0008', ' — crafted from premium full-grain leather'),
        ('PWBAG0012', ' — made with recycled nylon fabric'),
    ],
    'Furniture': [
        ('PFURN0001', ' — solid walnut wood frame'),
        ('PFURN0005', ' — Italian leather upholstery'),
    ],
    'Kitchen Accessories': [
        ('PKITC0015', ' — forged from Japanese VG-10 stainless steel'),
    ],
}
# ~10 products
```

### Clearance prefix (adds "CLEARANCE — " to description)

~15 well-stocked products get the clearance prefix and a 60% price cut. These also need re-embedding.

**Total re-embedding for Step 3: ~75 products**

---

## Step 4: Realistic Quality Distribution (SQL only — no re-embedding)

Run as post-load SQL after the CSV is imported.

### Target distribution (~446 products)

| Stars | Count | % | Teaching purpose |
|-------|-------|---|-----------------|
| 4.5–5.0 | ~180 | 40% | Premium tier — top search results |
| 4.0–4.4 | ~155 | 35% | Good tier — solid results |
| 3.5–3.9 | ~65 | 15% | Decent — passes `WHERE stars >= 3.5` |
| 3.0–3.4 | ~30 | 7% | Below filter — demonstrates filtering value |
| 2.0–2.9 | ~16 | 3% | Low quality — clearly filtered out |

**Teaching impact:** The `WHERE stars >= 3.5` filter in `_vector_search()` now visibly excludes ~46 products. Without the filter, 2-star products pollute results.

---

## Step 5: Realistic Inventory Distribution (SQL only)

### Target distribution (~446 products)

| Stock level | Count | % | Teaching purpose |
|-------------|-------|---|-----------------|
| Out of stock (0) | ~25 | 6% | Availability queries, inventory alerts |
| Critical (1–5) | ~35 | 8% | Urgent restocking, Cedar policy demo |
| Low (6–15) | ~55 | 12% | `get_low_stock_products` rich results |
| Healthy (16–100) | ~150 | 34% | Normal operations |
| Well-stocked (100+) | ~181 | 40% | No concerns |

### Locked stock levels for demo products

| productId | Product | Quantity | Purpose |
|-----------|---------|----------|---------|
| PSUNG0007 | Quay Sunglasses | 1 | Restock demo target (Cedar policy test) |
| PSPRT0044 | Stanley Tumbler | 4 | Critical stock — popular product urgency |
| PMOBI0044 | AirPods Pro 2 | 8 | Low stock — buy-now pressure |
| PMOBI0046 | Samsung Galaxy Buds3 | 6 | Low stock |
| PKITC0043 | Lodge Cast Iron Gift Set | 0 | Out of stock — seasonal item |

**Teaching impact:** `get_inventory_health()` health score drops from ~98% to ~74%. `get_low_stock_products()` returns 90 products. Inventory agent demos are rich.

---

## Verification Matrix — Every Scripted Query Guaranteed

### Module 1: Keyword vs Semantic (5 queries)

| Query | Keyword | Semantic | Products |
|-------|---------|----------|----------|
| `MacBook Air` | 2 hits | 2+ | PLAPT0001, PLAPT0016 |
| `Samsung Galaxy S24` | 3 hits | 5+ | PSMRT0001, PSMRT0022, PSMRT0031 |
| `something to keep my drinks cold` | **0** | **4+** | YETI, Stanley, Owala, Hydro Flask |
| `gift for someone who loves cooking` | **0** | **4+** | Lodge set, Chef's knife, spatulas |
| `comfortable shoes for standing all day` | **0** | **4+** | Skechers, Clarks, Go Walk Joy |

### Module 2: Agent + Tools (6 queries)

| Query | Tool | Products |
|-------|------|----------|
| `What's trending right now?` | `get_trending_products` | Stanley Tumbler (12K reviews), AirPods Pro (9K), YETI (8K) |
| `Laptop for college under $800` | `semantic_product_search(max_price=800)` | 5+ laptops $499–$799 |
| `Wireless headphones under $50` | `semantic_product_search(max_price=50)` | **JBL Tune ($29.95), Anker Q20+ ($49.99)** |
| `Stainless steel tumbler` | `semantic_product_search` | **YETI, Stanley, Owala, Corkcicle** |
| `Noise canceling headphones` | `semantic_product_search` | **Sony XM5, AirPods Pro, Anker Q20+** |
| `Price range for laptops` | `get_price_analysis` | $499–$3000 |

### Module 3: Multi-Agent (6 queries)

| Query | Agent | Products |
|-------|-------|----------|
| `Find me running shoes under $80` | Recommendation | Skechers ($74), Crocs ($49), Roxy ($44) |
| `Best deals in laptops` | Pricing | Clearance laptops + price stats |
| `What products need restocking?` | Inventory | **90 low-stock products** |
| `Blue running shoes` | Recommendation | **Saucony in Navy Blue, Brooks in Blue** |
| `Leather bag under $200` | Recommendation | **PWBAG0001 Black Leather, PWBAG0002 Brown Leather** |
| `Show me trending beauty products` | Recommendation | Burt's Bees gift set (5.6K reviews), top beauty products |

### Module 4: AgentCore (4 queries)

| Query | Expected |
|-------|----------|
| `Restock PSUNG0007 with 1000 units` | Cedar DENIES (>500 max) |
| `Restock PSUNG0007 with 200 units` | Cedar PERMITS |
| `Find me running shoes under $80` (turn 1) | Products returned |
| `Show me cheaper options` (turn 2) | Memory recalls context |

---

## Implementation Plan for Kiro

### Phase 1: Trim (no API calls)
- Input: `product-catalog-cohere-v4.csv` (1,008 products)
- Run trim script keeping 431 best products
- Output: `product-catalog-trimmed.csv`

### Phase 2: Add new products (13 Unsplash + 13 embedding calls)
- Fetch 13 Unsplash images for headphones, tumblers, gift sets
- Generate 13 Cohere Embed v4 embeddings
- Output: `product-catalog-with-additions.csv` (444 products)

### Phase 3: Enrich descriptions (~75 embedding calls)
- Add color/material to ~60 product descriptions
- Add "CLEARANCE — " prefix to ~15 products (with 60% price cut)
- Re-embed all modified descriptions
- Output: `product-catalog-enriched.csv` (444 products, ~75 updated embeddings)

### Phase 4: Post-load SQL (no API calls)
- Quality distribution adjustments (stars/reviews)
- Inventory distribution adjustments (quantity)
- Lock specific products at target stock levels
- Run as part of `load-database-fast.sh`

### Total API budget

| API | Calls | Within limit? |
|-----|-------|--------------|
| Unsplash | 13 | Yes (50/hour limit) |
| Cohere Embed v4 | ~88 | Yes (< 2 min at Bedrock throughput) |

### Files to create or modify

| File | Action |
|------|--------|
| `scripts/trim-catalog.py` | New |
| `scripts/add-new-products.py` | New |
| `scripts/enrich-descriptions.py` | New |
| `scripts/post-load-adjustments.sql` | New |
| `data/product-catalog-enriched.csv` | New — the definitive catalog |
| `scripts/load-database-fast.sh` | Modified — use new CSV + post-load SQL |

### What NOT to change

- Existing productId format (PXXXX0NNN)
- Schema (no column changes)
- Embedding model (Cohere Embed v4, 1024 dimensions)
- HNSW index configuration
- Category names (keep all 24 exactly as named)
