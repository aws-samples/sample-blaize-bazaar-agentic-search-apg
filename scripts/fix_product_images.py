#!/usr/bin/env python3
"""
Fix product images using Unsplash API — category-based approach.

Instead of searching per-product (1,008 API calls), searches per-category
(24 categories × 6 images = 144 calls) and assigns images round-robin
within each category. Fits within Unsplash demo tier limits with batching.

Usage:
    # Run all categories (may need multiple runs if rate limited)
    UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py

    # Dry run (preview without writing)
    UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py --dry-run

    # Resume from a specific category
    UNSPLASH_ACCESS_KEY=<key> python3 scripts/fix_product_images.py --resume-from "Laptops"
"""

import csv
import json
import os
import sys
import time
import urllib.request
import urllib.parse
from collections import defaultdict
from pathlib import Path

UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")
CSV_PATH = "data/premium-products-with-embeddings.csv"
CACHE_PATH = "data/.image_cache.json"
IMAGES_PER_CATEGORY = 6
REQUEST_DELAY = 1.5  # seconds between API calls

# Search queries per category — tuned for Unsplash's stock photo library
CATEGORY_QUERIES = {
    "Beauty": ["cosmetics flatlay", "makeup products", "beauty skincare", "lipstick cosmetic", "foundation makeup", "beauty product bottle"],
    "Fragrances": ["perfume bottle luxury", "fragrance cologne", "perfume elegant", "eau de parfum", "luxury perfume glass", "scent bottle"],
    "Furniture": ["modern furniture", "sofa living room", "dining table wood", "bedroom furniture", "office desk chair", "bookshelf interior"],
    "Groceries": ["organic food grocery", "healthy food ingredients", "pantry staples", "fresh produce kitchen", "spices cooking", "olive oil bottle"],
    "Home Decoration": ["home decor interior", "wall art decoration", "candle home cozy", "vase flowers decor", "modern lamp interior", "throw pillow decor"],
    "Kitchen Accessories": ["kitchen utensils", "cutting board knife", "cooking tools", "kitchen gadget", "salad bowl kitchen", "blender juicer"],
    "Laptops": ["laptop computer desk", "macbook workspace", "laptop coding", "thin laptop silver", "gaming laptop", "laptop coffee desk"],
    "Mens Shirts": ["mens dress shirt", "button down shirt", "casual mens shirt", "oxford shirt folded", "mens fashion shirt", "polo shirt mens"],
    "Mens Shoes": ["mens leather shoes", "sneakers mens", "oxford shoes brown", "mens boots casual", "running shoes mens", "loafers mens"],
    "Mens Watches": ["luxury watch wrist", "mens watch steel", "chronograph watch", "dive watch", "dress watch elegant", "watch closeup"],
    "Mobile Accessories": ["phone charger cable", "phone case", "wireless earbuds", "power bank", "phone stand desk", "charging station"],
    "Motorcycle": ["motorcycle road", "sportbike", "cruiser motorcycle", "motorcycle helmet", "motorbike adventure", "classic motorcycle"],
    "Skin Care": ["skincare routine", "serum bottle dropper", "moisturizer cream jar", "face mask skincare", "cleanser bottle", "skincare products minimal"],
    "Smartphones": ["smartphone modern", "mobile phone hand", "phone screen", "smartphone photography", "cellphone minimal", "phone technology"],
    "Sports Accessories": ["fitness equipment gym", "yoga mat accessories", "running gear", "sports water bottle", "resistance bands", "workout accessories"],
    "Sunglasses": ["sunglasses fashion", "aviator sunglasses", "designer sunglasses", "sunglasses beach", "polarized sunglasses", "cat eye sunglasses"],
    "Tablets": ["tablet device", "ipad digital", "tablet drawing", "tablet reading", "digital tablet pen", "tablet workspace"],
    "Tops": ["fashion top clothing", "casual tshirt", "womens blouse", "sweater knitwear", "crop top fashion", "turtleneck sweater"],
    "Vehicle": ["car modern", "sedan luxury", "suv vehicle", "electric car", "sports car", "car interior dashboard"],
    "Womens Bags": ["handbag leather", "tote bag fashion", "crossbody bag", "designer purse", "backpack womens", "clutch bag evening"],
    "Womens Dresses": ["dress fashion elegant", "summer dress floral", "maxi dress", "cocktail dress", "casual dress womens", "wrap dress"],
    "Womens Jewellery": ["jewelry earrings gold", "necklace pendant", "bracelet silver", "ring diamond", "jewelry minimal", "pearl earrings"],
    "Womens Shoes": ["womens heels elegant", "ankle boots womens", "sneakers womens", "sandals summer", "ballet flats", "wedge shoes"],
    "Womens Watches": ["womens watch elegant", "rose gold watch", "bracelet watch", "minimalist watch womens", "luxury watch feminine", "watch jewelry"],
}


def search_unsplash(query: str) -> str | None:
    """Search Unsplash and return the small image URL."""
    encoded = urllib.parse.quote(query)
    url = f"https://api.unsplash.com/search/photos?query={encoded}&per_page=1&orientation=squarish"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Client-ID {UNSPLASH_ACCESS_KEY}")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            remaining = resp.headers.get("X-Ratelimit-Remaining", "?")
            results = data.get("results", [])
            if results:
                # Use w=400 for consistent sizing
                raw_url = results[0]["urls"]["raw"]
                return f"{raw_url}&w=400&q=80"
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"\n❌ Rate limited! Remaining: 0. Save cache and resume later.")
            return "RATE_LIMITED"
        print(f"  ⚠️ HTTP {e.code}")
    except Exception as e:
        print(f"  ⚠️ {e}")
    return None


def load_cache() -> dict:
    """Load cached category→images mapping."""
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    """Save category→images mapping to disk."""
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--resume-from", type=str, default=None, help="Resume from this category")
    args = parser.parse_args()

    if not UNSPLASH_ACCESS_KEY:
        print("❌ Set UNSPLASH_ACCESS_KEY environment variable")
        sys.exit(1)

    # Load existing cache (for resume)
    cache = load_cache()
    print(f"📦 Cache has images for {len(cache)} categories")

    # Phase 1: Fetch images per category
    categories = sorted(CATEGORY_QUERIES.keys())
    skip = args.resume_from is not None
    api_calls = 0

    for cat in categories:
        if skip:
            if cat == args.resume_from:
                skip = False
            else:
                continue

        if cat in cache and len(cache[cat]) >= IMAGES_PER_CATEGORY:
            print(f"✅ {cat}: {len(cache[cat])} images (cached)")
            continue

        queries = CATEGORY_QUERIES.get(cat, [f"{cat.lower()} product"])
        images = cache.get(cat, [])

        print(f"\n🔍 {cat} — fetching {IMAGES_PER_CATEGORY - len(images)} images...")

        for query in queries:
            if len(images) >= IMAGES_PER_CATEGORY:
                break

            print(f"  Searching: \"{query}\"", end=" ")
            url = search_unsplash(query)
            api_calls += 1

            if url == "RATE_LIMITED":
                save_cache(cache)
                print(f"\n💾 Cache saved. Resume with: --resume-from \"{cat}\"")
                print(f"   API calls made this run: {api_calls}")
                sys.exit(0)
            elif url:
                images.append(url)
                print(f"✅")
            else:
                print(f"❌")

            time.sleep(REQUEST_DELAY)

        cache[cat] = images
        save_cache(cache)
        print(f"  → {cat}: {len(images)} images collected")

    # Phase 2: Assign images to products
    print(f"\n{'='*50}")
    print(f"Phase 2: Assigning images to products...")

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    # Group products by category
    updated = 0
    for row in rows:
        cat = row.get("category_name", "").strip()
        images = cache.get(cat, [])
        if not images:
            continue
        # Round-robin assignment based on product index within category
        idx = updated % len(images)
        row["imgUrl"] = images[idx]
        updated += 1

    print(f"Updated {updated}/{len(rows)} products")

    if not args.dry_run:
        # Backup
        backup = CSV_PATH + ".backup"
        import shutil
        shutil.copy2(CSV_PATH, backup)
        print(f"💾 Backup: {backup}")

        # Write
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"✅ Written to {CSV_PATH}")
    else:
        print("🔍 Dry run — no files changed")

    print(f"\nAPI calls this run: {api_calls}")
    print(f"Categories cached: {len(cache)}")


if __name__ == "__main__":
    main()
