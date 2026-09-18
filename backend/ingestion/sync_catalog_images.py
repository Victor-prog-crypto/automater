"""
Automater Backend - Catalog Image Sync Script
Parses MASTER_PRODUCTS from app.js, pulls real retailer images using Vertex AI Nano Banana
or CSE/fallback engine, saves them to public/products/, and updates app.js with real paths.
"""

import re
import json
import logging
from pathlib import Path
from typing import Optional
from backend.ingestion.cse_image_puller import GoogleCSEImagePuller, PUBLIC_PRODUCTS_DIR
from backend.ingestion.vertex_packshot_engine import VertexPackshotEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.sync_images")

APP_JS_PATH = Path(__file__).resolve().parent.parent.parent / 'app.js'


def extract_products_from_app_js():
    """Extracts product records from MASTER_PRODUCTS Map in app.js."""
    if not APP_JS_PATH.exists():
        logger.error(f"Cannot find app.js at {APP_JS_PATH}")
        return []

    content = APP_JS_PATH.read_text(encoding="utf-8")
    
    # Match entries like: ['6001007001001', { gtin: '...', retailerId: '...', title: '...', ... }]
    pattern = r"\['(\d+)',\s*\{([^}]+)\}\]"
    matches = re.findall(pattern, content)
    
    products = []
    for gtin, body in matches:
        def get_field(name):
            m = re.search(rf"{name}:\s*['\"]([^'\"]+)['\"]", body)
            return m.group(1) if m else ""

        title = get_field("title")
        brand = get_field("brand")
        retailer_id = get_field("retailerId") or "shoprite"
        category = get_field("category")
        weight = get_field("weight")
        
        products.append({
            "gtin": gtin,
            "title": title,
            "brand": brand,
            "retailerId": retailer_id,
            "category": category,
            "weight": weight
        })

    logger.info(f"Extracted {len(products)} products from MASTER_PRODUCTS in app.js")
    return products


def update_app_js_image_urls(products):
    """Updates imageUrl: '/products/GTIN.svg' to '/products/GTIN.jpg' in app.js if JPG exists."""
    content = APP_JS_PATH.read_text(encoding="utf-8")
    updated_count = 0

    for p in products:
        gtin = p["gtin"]
        jpg_file = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
        if jpg_file.exists() and jpg_file.stat().st_size > 1500:
            old_pattern = f"'/products/{gtin}.svg'"
            new_target = f"'/products/{gtin}.jpg'"
            if old_pattern in content:
                content = content.replace(old_pattern, new_target)
                updated_count += 1

    APP_JS_PATH.write_text(content, encoding="utf-8")
    logger.info(f"[OK] Updated {updated_count} product image references to real JPGs in app.js")
    return updated_count


def sync_vertex_packshots(overwrite: bool = False, limit: Optional[int] = None, gtin_filter: Optional[str] = None):
    """
    Generates photorealistic commercial studio packshots using Vertex AI Nano Banana
    (gemini-2.5-flash-image) for catalog products.
    """
    products = extract_products_from_app_js()
    if not products:
        logger.warning("No products found in app.js to sync.")
        return

    if gtin_filter:
        products = [p for p in products if p["gtin"] == gtin_filter]

    if limit and limit > 0:
        products = products[:limit]

    engine = VertexPackshotEngine()
    success_count = 0
    total = len(products)

    print("\n" + "=" * 70)
    print(f"AUTOMATER - VERTEX AI NANO BANANA PACKSHOT GENERATOR")
    print(f"Model: {engine.model_name} | Target Products: {total}")
    print("=" * 70 + "\n")

    for idx, p in enumerate(products, 1):
        gtin = p["gtin"]
        title = p["title"]
        print(f"[{idx}/{total}] Packshot generation: {gtin} - {title[:45]}...")
        result = engine.generate_and_save_product_packshot(p, overwrite=overwrite)
        if result:
            success_count += 1
            print(f"      -> [OK] Packshot ready: {Path(result).name}")
        else:
            print(f"      -> [FAIL] Generation failed or rate-limited for {gtin}")

    updated = update_app_js_image_urls(products)

    print("\n" + "=" * 70)
    print(f"VERTEX PACKSHOT SYNC COMPLETE: {success_count}/{total} packshots ready.")
    print(f"Updated {updated} product mappings in app.js.")
    print("=" * 70 + "\n")


def sync_images(overwrite=False):
    """Fallback / CSE multi-tier image sync."""
    products = extract_products_from_app_js()
    if not products:
        logger.warning("No products found in app.js to sync.")
        return

    puller = GoogleCSEImagePuller()
    success_count = 0
    total = len(products)

    print("\n" + "=" * 70)
    print(f"AUTOMATER — REAL PRODUCT IMAGE PULLER (CSE & TIERED ENGINE)")
    print(f"Target Retailer: Shoprite South Africa | Total Products: {total}")
    print("=" * 70 + "\n")

    for idx, p in enumerate(products, 1):
        gtin = p["gtin"]
        title = p["title"]
        print(f"[{idx}/{total}] Processing: {gtin} - {title[:45]}...")
        result = puller.pull_image_for_product(p, overwrite=overwrite)
        if result:
            success_count += 1
            print(f"      -> Success: {result}")
        else:
            print(f"      -> Fallback: Kept SVG vector placeholder")

    # Update app.js references
    updated = update_app_js_image_urls(products)

    print("\n" + "=" * 70)
    print(f"IMAGE SYNC COMPLETE: {success_count}/{total} images available.")
    print(f"Updated {updated} product mappings in app.js to high-res JPG.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    sync_images()
