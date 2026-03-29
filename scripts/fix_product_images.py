#!/usr/bin/env python3
"""
Fix product images using Unsplash API — fetch 42+ unique images per category.

Uses broad search queries with per_page=30, 2 pages per category = 60 candidates.
Total API calls: 24 categories × 2 pages = 48 (fits in free tier's 50/hour).

Usage:
    UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py
    UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py --dry-run
"""

import csv
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import shutil
from collections import defaultdict

UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")
CSV_PATH = "data/product-catalog-cohere-v4.csv"
CACHE_PATH = "data/.image_cache_v2.json"
TARGET_PER_CATEGORY = 42
REQUEST_DELAY = 1.2  # seconds between API calls

# One broad query per category — optimized for diverse results
CATEGORY_QUERIES = {
    "Beauty":              "beauty cosmetics makeup products",
    "Fragrances":          "perfume fragrance bottle luxury",
    "Furniture":           "modern furniture interior design",
    "Groceries":           "fresh food groceries organic",
    "Home Decoration":     "home decoration interior decor",
    "Kitchen Accessories": "kitchen utensils cookware tools",
    "Laptops":             "laptop computer workspace technology",
    "Mens Shirts":         "mens shirt fashion clothing",
    "Mens Shoes":          "mens shoes sneakers footwear",
    "Mens Watches":        "mens luxury watch wristwatch",
    "Mobile Accessories":  "phone accessories charger earbuds",
    "Motorcycle":          "motorcycle motorbike road",
    "Skin Care":           "skincare serum cream products",
    "Smartphones":         "smartphone mobile phone technology",
    "Sports Accessories":  "fitness sports equipment workout",
    "Sunglasses":          "sunglasses eyewear fashion",
    "Tablets":             "tablet ipad digital device",
    "Tops":                "fashion clothing tops tshirt",
    "Vehicle":             "car automobile luxury vehicle",
    "Womens Bags":         "handbag purse fashion bag",
    "Womens Dresses":      "dress womens fashion elegant",
    "Womens Jewellery":    "jewelry necklace earrings gold",
    "Womens Shoes":        "womens shoes heels fashion",
    "Womens Watches":      "womens watch elegant jewelry",
}


def search_unsplash(query: str, page: int = 1, per_page: int = 30) -> list[str]:
    """Search Unsplash and return list of image URLs."""
    encoded = urllib.parse.quote(query)
    url = (
        f"https://api.unsplash.com/search/photos"
        f"?query={encoded}&per_page={per_page}&page={page}"
        f"&order_by=relevant&content_filter=high"
    )
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Client-ID {UNSPLASH_ACCESS_KEY}")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            remaining = resp.headers.get("X-Ratelimit-Remaining", "?")
            data = json.loads(resp.read().decode())
            results = data.get("results", [])
            urls = []
            for r in results:
                raw_url = r["urls"]["raw"]
                # Construct consistent URL: 400px wide, high quality
                clean_url = raw_url.split("?")[0] + "?w=400&q=80&fit=crop"
                urls.append(clean_url)
            print(f"    Page {page}: {len(urls)} images (remaining: {remaining})")
            return urls
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"\n    RATE LIMITED! Wait ~1 hour and re-run.")
            return ["RATE_LIMITED"]
        print(f"    HTTP {e.code}")
    except Exception as e:
        print(f"    Error: {e}")
    return []


def load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not UNSPLASH_ACCESS_KEY:
        print("Set UNSPLASH_ACCESS_KEY environment variable")
        sys.exit(1)

    cache = load_cache()
    print(f"Cache has images for {len(cache)} categories\n")

    # Track all used URLs globally to ensure uniqueness across categories
    all_used_urls = set()
    for cat, urls in cache.items():
        if len(urls) >= TARGET_PER_CATEGORY:
            all_used_urls.update(urls)

    # Phase 1: Fetch images per category (2 pages × 30 results = 60 candidates)
    categories = sorted(CATEGORY_QUERIES.keys())
    api_calls = 0

    for cat in categories:
        if cat in cache and len(cache[cat]) >= TARGET_PER_CATEGORY:
            print(f"  {cat}: {len(cache[cat])} images (cached)")
            continue

        query = CATEGORY_QUERIES[cat]
        print(f"\n  {cat} — searching \"{query}\"")

        urls = []
        for page in [1, 2]:
            result = search_unsplash(query, page=page, per_page=30)
            api_calls += 1

            if result and result[0] == "RATE_LIMITED":
                save_cache(cache)
                print(f"\n  Cache saved ({len(cache)} categories). Re-run after rate limit resets.")
                print(f"  API calls this run: {api_calls}")
                sys.exit(0)

            # Only add URLs not used by other categories
            for url in result:
                if url not in all_used_urls:
                    urls.append(url)
                    all_used_urls.add(url)

            time.sleep(REQUEST_DELAY)

        cache[cat] = urls
        save_cache(cache)
        print(f"    -> {len(urls)} unique images for {cat}")

    # Phase 2: Assign images to products
    print(f"\n{'='*60}")
    print(f"Phase 2: Assigning unique images to products...\n")

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    # Group products by category and assign unique images
    cat_counters = defaultdict(int)
    updated = 0
    skipped_cats = set()

    for row in rows:
        cat = row.get("category_name", "").strip()
        images = cache.get(cat, [])
        if not images:
            skipped_cats.add(cat)
            continue

        idx = cat_counters[cat]
        # Use modulo for safety, but we should have enough (42+ per category)
        row["imgUrl"] = images[idx % len(images)]
        cat_counters[cat] += 1
        updated += 1

    # Report
    print(f"  Updated {updated}/{len(rows)} products")
    for cat in sorted(cat_counters.keys()):
        images = cache.get(cat, [])
        count = cat_counters[cat]
        unique = min(count, len(images))
        reused = count - unique if count > len(images) else 0
        status = f"{unique} unique" + (f", {reused} reused" if reused else "")
        print(f"    {cat}: {count} products, {len(images)} images available ({status})")

    if skipped_cats:
        print(f"\n  Skipped (no images): {skipped_cats}")

    if not args.dry_run:
        backup = CSV_PATH + ".backup2"
        shutil.copy2(CSV_PATH, backup)
        print(f"\n  Backup: {backup}")

        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"  Written to {CSV_PATH}")
    else:
        print("\n  Dry run — no files changed")

    print(f"\n  API calls: {api_calls}")
    print(f"  Categories: {len(cache)}")


if __name__ == "__main__":
    main()
