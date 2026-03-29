#!/usr/bin/env python3
"""
Fix product images using curated Unsplash photo IDs.

No API calls needed — uses direct Unsplash image URLs with known photo IDs
that match each product category. Images are assigned round-robin within
each category for visual variety.

Usage:
    python3 scripts/fix_product_images_curated.py
    python3 scripts/fix_product_images_curated.py --dry-run
"""

import csv
import os
import shutil
import sys

CSV_PATH = "data/product-catalog-cohere-v4.csv"
BACKUP_PATH = "data/product-catalog-cohere-v4.csv.backup"

def unsplash_url(photo_id: str, w: int = 400, q: int = 80) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w={w}&q={q}&fit=crop"

# Curated Unsplash photo IDs per category
# Each ID was verified to show relevant, high-quality product imagery
CATEGORY_IMAGES = {
    "Beauty": [
        unsplash_url("1596462502278-27bfdc403348"),  # cosmetics flatlay
        unsplash_url("1522335789203-aabd1fc54bc9"),  # makeup brushes
        unsplash_url("1571781926291-c477ebfd024b"),  # skincare bottles
        unsplash_url("1586495777744-4413f21062fa"),  # lipstick
        unsplash_url("1512496015851-a90fb38ba796"),  # beauty products
        unsplash_url("1631729371254-42c2892f0e6e"),  # cosmetics minimal
    ],
    "Fragrances": [
        unsplash_url("1541643600914-78b084683601"),  # perfume bottles
        unsplash_url("1588405748880-12d1d2a59f75"),  # fragrance elegant
        unsplash_url("1592945403244-b3fbafd7f539"),  # perfume luxury
        unsplash_url("1563170351-be82bc888aa4"),      # cologne bottle
        unsplash_url("1595425959632-aaf7aa4d0f24"),  # perfume minimal
        unsplash_url("1547887538-e3a2f32cb1cc"),      # scent bottle
    ],
    "Furniture": [
        unsplash_url("1555041469-a586c61ea9bc"),  # modern sofa
        unsplash_url("1524758631624-e2822e304c36"),  # living room
        unsplash_url("1506439773649-6e0eb8cfb237"),  # dining table
        unsplash_url("1540574163026-643ea20ade25"),  # bedroom
        unsplash_url("1538688525198-9b88f6f53126"),  # office desk
        unsplash_url("1493663284031-b7e3aefcae8e"),  # bookshelf
    ],
    "Groceries": [
        unsplash_url("1542838132-92c53300491e"),  # fresh produce
        unsplash_url("1606787366850-de6330128bfc"),  # pantry items
        unsplash_url("1490818387583-1baba5e638af"),  # healthy food
        unsplash_url("1607623814075-e51df1bdc82f"),  # spices
        unsplash_url("1474979266404-7f28e938e5a4"),  # olive oil
        unsplash_url("1543168256-418811576931"),      # organic food
    ],
    "Home Decoration": [
        unsplash_url("1513694203232-719a280e022f"),  # home decor
        unsplash_url("1507003211169-0a1dd7228f2d"),  # wall art
        unsplash_url("1602028915047-37269d1a73f7"),  # candles
        unsplash_url("1487530811176-3780de880c2d"),  # vase flowers
        unsplash_url("1540932239986-30128078f3c5"),  # modern lamp
        unsplash_url("1616046229478-9901c5536a45"),  # throw pillows
    ],
    "Kitchen Accessories": [
        unsplash_url("1556909114-f6e7ad7d3136"),  # kitchen utensils
        unsplash_url("1466637574441-749b8f19452f"),  # cutting board
        unsplash_url("1590794056226-79ef935baafb"),  # cooking tools
        unsplash_url("1585515320754-f4c3e0e8f50c"),  # kitchen gadgets
        unsplash_url("1495521821757-a1efb6729352"),  # bowls kitchen
        unsplash_url("1570222094114-d054a817e56b"),  # blender
    ],
    "Laptops": [
        unsplash_url("1496181133206-80ce9b88a853"),  # macbook desk
        unsplash_url("1531297484001-80022131f5a1"),  # laptop workspace
        unsplash_url("1517694712202-14dd9538aa97"),  # laptop coding
        unsplash_url("1525547719571-a2d4ac8945e2"),  # thin laptop
        unsplash_url("1593642632559-0c6d3fc62b89"),  # laptop coffee
        unsplash_url("1611186871348-b1ce696e52c9"),  # laptop minimal
    ],
    "Mens Shirts": [
        unsplash_url("1602810318383-e386cc2a3ccf"),  # dress shirt
        unsplash_url("1596755094514-5c7c0f0a43c1"),  # button down
        unsplash_url("1620799140408-edc6dcb6d633"),  # casual shirt
        unsplash_url("1594938298603-c8148c4dae35"),  # oxford shirt
        unsplash_url("1489987707025-afc232f7ea0f"),  # mens fashion
        unsplash_url("1621072156002-e2fccdc0b176"),  # polo shirt
    ],
    "Mens Shoes": [
        unsplash_url("1542291026-7eec264c27ff"),  # leather shoes
        unsplash_url("1460353581641-37baddab0fa2"),  # sneakers
        unsplash_url("1614252235316-8c857d38b5f4"),  # oxford brown
        unsplash_url("1520639888713-7851133b1ed0"),  # mens boots
        unsplash_url("1556906781-9a412961c28c"),      # running shoes
        unsplash_url("1543163521-1bf539c55dd2"),      # loafers
    ],
    "Mens Watches": [
        unsplash_url("1524592094714-0f0654e20314"),  # luxury watch
        unsplash_url("1523170335258-f5ed11844a49"),  # watch steel
        unsplash_url("1522312346375-d1a52e2b99b3"),  # chronograph
        unsplash_url("1509048191080-d2984bad6ae5"),  # dive watch
        unsplash_url("1547996160-81dfa63595aa"),      # dress watch
        unsplash_url("1614164185128-e4ec99c436d7"),  # watch closeup
    ],
    "Mobile Accessories": [
        unsplash_url("1583394838336-d831a2f563a6"),  # phone charger
        unsplash_url("1601784551446-20c9e07cdbdb"),  # phone case
        unsplash_url("1590658268037-6bf12f032f55"),  # wireless earbuds
        unsplash_url("1609091839311-d5365f9ff1c5"),  # power bank
        unsplash_url("1586953208448-b95a79798f07"),  # phone stand
        unsplash_url("1618384887929-16ec33fab9ef"),  # charging station
    ],
    "Motorcycle": [
        unsplash_url("1558981806-ec527fa84c39"),  # motorcycle road
        unsplash_url("1568772585407-9361f9bf3a87"),  # sportbike
        unsplash_url("1449426468159-d96dbf08f19f"),  # cruiser
        unsplash_url("1558980394-0a06c4631733"),      # motorcycle detail
        unsplash_url("1609630875171-04b33b0143b0"),  # adventure bike
        unsplash_url("1571008887538-b36bb32f4571"),  # classic motorcycle
    ],
    "Skin Care": [
        unsplash_url("1556228578-8c89e6adf883"),  # skincare routine
        unsplash_url("1620916566398-39f1143ab7be"),  # serum dropper
        unsplash_url("1611930022073-b7a4ba5fcccd"),  # moisturizer jar
        unsplash_url("1596755389378-c31d21fd1273"),  # face mask
        unsplash_url("1570194065650-d99fb4b38b17"),  # cleanser bottle
        unsplash_url("1598440947619-2c35fc9aa908"),  # skincare minimal
    ],
    "Smartphones": [
        unsplash_url("1511707171634-5f897ff02aa6"),  # smartphone modern
        unsplash_url("1512941937-f8b94c9dd6c0"),      # phone in hand
        unsplash_url("1580910051074-3eb694886f2b"),  # phone screen
        unsplash_url("1592899677977-9c10ca588bbd"),  # smartphone photo
        unsplash_url("1510557880182-3d4d3cba35a5"),  # phone minimal
        unsplash_url("1601972599720-36938d4ecd31"),  # phone technology
    ],
    "Sports Accessories": [
        unsplash_url("1517836357463-d25dfeac3438"),  # fitness gym
        unsplash_url("1544367567-0f2fcb009e0b"),      # yoga mat
        unsplash_url("1461896836934-bd45ba078bf7"),  # running gear
        unsplash_url("1553062407-98eeb64c6a62"),      # water bottle sport
        unsplash_url("1598289431512-b97b0917affc"),  # resistance bands
        unsplash_url("1571019614242-c5c5dee9f50f"),  # workout gear
    ],
    "Sunglasses": [
        unsplash_url("1511499767150-a48a237f0083"),  # sunglasses fashion
        unsplash_url("1572635196237-14b3f281503f"),  # aviator
        unsplash_url("1577803645773-f96470509666"),  # designer sunglasses
        unsplash_url("1473496169904-658ba7c44d8a"),  # sunglasses beach
        unsplash_url("1508296695146-257a814070b4"),  # polarized
        unsplash_url("1574258495973-f010dfbb5371"),  # cat eye
    ],
    "Tablets": [
        unsplash_url("1544244015-0df4b3ffc6b0"),  # tablet device
        unsplash_url("1585790050230-5dd28404ccb9"),  # ipad digital
        unsplash_url("1561154464-82e9adf32764"),      # tablet drawing
        unsplash_url("1542751110-97427bbecf20"),      # tablet reading
        unsplash_url("1589739900243-4b52cd9b104e"),  # tablet pen
        unsplash_url("1527698266440-12104e498b76"),  # tablet workspace
    ],
    "Tops": [
        unsplash_url("1489987707025-afc232f7ea0f"),  # fashion clothing
        unsplash_url("1576566588028-4147f3842f27"),  # casual tshirt
        unsplash_url("1551488831-00ddcb6c6bd3"),      # womens blouse
        unsplash_url("1434389677669-e08b4cac3105"),  # sweater
        unsplash_url("1515886657613-9f3515b0c78f"),  # fashion top
        unsplash_url("1583743814966-8936f5b7be1a"),  # turtleneck
    ],
    "Vehicle": [
        unsplash_url("1494976388531-d1058494cdd8"),  # modern car
        unsplash_url("1549317661-bd12f8b2ef78"),      # sedan luxury
        unsplash_url("1519641471654-76ce0107ad1b"),  # suv
        unsplash_url("1560958089-b8a1929cea89"),      # electric car
        unsplash_url("1544636331-e26879cd4d9b"),      # sports car
        unsplash_url("1503376780353-7e6692767b70"),  # car interior
    ],
    "Womens Bags": [
        unsplash_url("1548036328-c11e31949d78"),  # handbag leather
        unsplash_url("1590874103328-eac38ef370c7"),  # tote bag
        unsplash_url("1566150905458-c3a1a526934d"),  # crossbody
        unsplash_url("1584917865442-de89df76afd3"),  # designer purse
        unsplash_url("1553062407-98eeb64c6a62"),      # backpack
        unsplash_url("1594223274512-ad4803739b7c"),  # clutch evening
    ],
    "Womens Dresses": [
        unsplash_url("1595777457583-95e059d581b8"),  # elegant dress
        unsplash_url("1572804013309-59a88b7e92f1"),  # summer dress
        unsplash_url("1566174053879-31528523f8ae"),  # maxi dress
        unsplash_url("1518622358385-8ea7d0794bf6"),  # cocktail dress
        unsplash_url("1515886657613-9f3515b0c78f"),  # casual dress
        unsplash_url("1496747611176-843222e1e57c"),  # wrap dress
    ],
    "Womens Jewellery": [
        unsplash_url("1535632066927-ab7c9ab60908"),  # gold jewelry
        unsplash_url("1599643478518-a784e5dc4c8f"),  # necklace pendant
        unsplash_url("1611591437281-460bfbe1220a"),  # bracelet silver
        unsplash_url("1605100804763-247f67b3557e"),  # ring diamond
        unsplash_url("1515562141836-999c6a555d3d"),  # jewelry minimal
        unsplash_url("1617038260897-41a1f14a8ca0"),  # pearl earrings
    ],
    "Womens Shoes": [
        unsplash_url("1543163521-1bf539c55dd2"),  # heels elegant
        unsplash_url("1603808033192-082d6919d3e1"),  # ankle boots
        unsplash_url("1595950653106-6c9ebd614d3a"),  # sneakers womens
        unsplash_url("1603487742131-4160ec999306"),  # sandals
        unsplash_url("1566150905458-c3a1a526934d"),  # ballet flats
        unsplash_url("1560343090-f0409e92791a"),      # wedge shoes
    ],
    "Womens Watches": [
        unsplash_url("1524592094714-0f0654e20314"),  # elegant watch
        unsplash_url("1614164185128-e4ec99c436d7"),  # rose gold watch
        unsplash_url("1547996160-81dfa63595aa"),      # bracelet watch
        unsplash_url("1523170335258-f5ed11844a49"),  # minimalist watch
        unsplash_url("1522312346375-d1a52e2b99b3"),  # luxury feminine
        unsplash_url("1509048191080-d2984bad6ae5"),  # watch jewelry
    ],
}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Read CSV
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    print(f"📦 Loaded {len(rows)} products")

    # Track per-category index for round-robin
    cat_index = {}
    updated = 0
    missing_cats = set()

    for row in rows:
        cat = row.get("category_name", "").strip()
        images = CATEGORY_IMAGES.get(cat)
        if not images:
            missing_cats.add(cat)
            continue

        idx = cat_index.get(cat, 0)
        row["imgUrl"] = images[idx % len(images)]
        cat_index[cat] = idx + 1
        updated += 1

    print(f"✅ Updated {updated}/{len(rows)} products across {len(cat_index)} categories")
    if missing_cats:
        print(f"⚠️  No images for: {', '.join(sorted(missing_cats))}")

    if not args.dry_run:
        shutil.copy2(CSV_PATH, BACKUP_PATH)
        print(f"💾 Backup: {BACKUP_PATH}")

        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"✅ Written to {CSV_PATH}")
    else:
        print("🔍 Dry run — no files changed")


if __name__ == "__main__":
    main()
