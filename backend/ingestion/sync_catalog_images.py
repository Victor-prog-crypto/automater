"""
Automater Backend - Permanent CSE Catalog Image Sync Script
Pulls authentic retailer packshots via Google CSE / Shoprite JSON-LD / Open Food Facts,
sanitizes backgrounds onto pure studio white (#FFFFFF), stores them permanently in
public/products/{gtin}.jpg (+ manifest.json lock), and updates catalog references.
Zero Vertex AI usage ($0 generative AI cost).
"""

import re
import json
import logging
from pathlib import Path
from backend.ingestion.cse_image_puller import GoogleCSEImagePuller, PUBLIC_PRODUCTS_DIR
from backend.ingestion.packshot_sanitizer import batch_sanitize_directory

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.sync_images")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
APP_JS_PATH = BASE_DIR / "app.js"
CATALOG_JSON_PATH = BASE_DIR / "public" / "data" / "shoprite_catalog.json"


def extract_products_for_sync():
    """Loads verified catalog products from shoprite_catalog.json (falling back to app.js)."""
    if CATALOG_JSON_PATH.exists():
        try:
            payload = json.loads(CATALOG_JSON_PATH.read_text(encoding="utf-8"))
            items = payload.get("allProducts", [])
            if items:
                logger.info(f"Loaded {len(items)} products from shoprite_catalog.json")
                return items
        except Exception as exc:
            logger.warning(f"Failed reading shoprite_catalog.json: {exc}")

    if not APP_JS_PATH.exists():
        return []

    content = APP_JS_PATH.read_text(encoding="utf-8")
    pattern = r"\['(\d+)',\s*\{([^}]+)\}\]"
    matches = re.findall(pattern, content)
    products = []
    for gtin, body in matches:
        def get_field(name):
            m = re.search(rf"{name}:\s*['\"]([^'\"]+)['\"]", body)
            return m.group(1) if m else ""

        products.append({
            "gtin": gtin,
            "title": get_field("title"),
            "brand": get_field("brand"),
            "retailerId": get_field("retailerId") or "shoprite",
            "category": get_field("category"),
            "weight": get_field("weight"),
        })
    return products


def update_app_js_image_urls(products):
    """Updates imageUrl: '/products/GTIN.svg' to '/products/GTIN.jpg' in app.js if JPG exists."""
    if not APP_JS_PATH.exists():
        return 0
    content = APP_JS_PATH.read_text(encoding="utf-8")
    updated_count = 0

    for p in products:
        gtin = str(p["gtin"])
        jpg_file = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
        if jpg_file.exists() and jpg_file.stat().st_size > 1500:
            old_pattern = f"'/products/{gtin}.svg'"
            new_target = f"'/products/{gtin}.jpg'"
            if old_pattern in content:
                content = content.replace(old_pattern, new_target)
                updated_count += 1

    if updated_count:
        APP_JS_PATH.write_text(content, encoding="utf-8")
    logger.info(f"[OK] Verified/updated {updated_count} product image references to permanent JPGs.")
    return updated_count


def sync_images(overwrite: bool = False):
    """Permanent CSE + pure-#FFFFFF studio packshot image sync (no Vertex AI)."""
    products = extract_products_for_sync()
    if not products:
        logger.warning("No products found to sync.")
        return

    puller = GoogleCSEImagePuller()
    success_count = 0
    total = len(products)

    print("\n" + "=" * 70)
    print("AUTOMATER — PERMANENT CSE PACKSHOT PULLER & PURE-WHITE SANITIZER")
    print(f"Target Retailer: Shoprite South Africa | Total Products: {total}")
    print("=" * 70 + "\n")

    for idx, p in enumerate(products, 1):
        gtin = p["gtin"]
        title = p.get("title") or p.get("name") or ""
        print(f"[{idx}/{total}] Processing: {gtin} - {title[:45]}...")
        result = puller.pull_image_for_product(p, overwrite=overwrite)
        if result:
            success_count += 1
            print(f"      -> Locked Forever (#FFFFFF): {result}")
        else:
            print("      -> Fallback: Kept clean SVG vector packshot")

    batch_sanitize_directory(PUBLIC_PRODUCTS_DIR)
    updated = update_app_js_image_urls(products)

    print("\n" + "=" * 70)
    print(f"CSE PACKSHOT SYNC COMPLETE: {success_count}/{total} pure-white images stored forever.")
    print(f"Updated {updated} SVG->JPG mappings.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    sync_images()
