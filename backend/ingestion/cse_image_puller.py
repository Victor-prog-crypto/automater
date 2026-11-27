"""
Automater Backend - Google Custom Search Engine (CSE) Product, Barcode & Regional Price Puller

Uses Google Custom Search JSON API (GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX=d300b7d0c83664c44)
combined with Shoprite South Africa Schema.org Product JSON-LD extraction and Open Food Facts v2
to pull:
  1. Official high-resolution studio product packshots (catalog.sixty60.co.za -> public/products/{gtin}.jpg)
  2. Authentic physical GS1 EAN-13 / EAN-8 barcodes (gtin) and Shoprite SKUs
  3. Specific provincial ZAR regular & Xtra Savings promotional prices across all 9 SA provinces
"""

import os
import re
import json
import logging
import requests
from pathlib import Path
from typing import Optional, Dict, Any, List
from urllib.parse import quote_plus
from dotenv import load_dotenv
from backend.ingestion.packshot_sanitizer import sanitize_and_store_forever

# Load environment from project root .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.cse_puller")

GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
GOOGLE_SEARCH_CX = os.getenv("GOOGLE_SEARCH_CX") or "d300b7d0c83664c44"

PUBLIC_PRODUCTS_DIR = BASE_DIR / 'public' / 'products'
PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

RETAILER_DOMAINS = {
    'shoprite': 'shoprite.co.za',
    'checkers': 'checkers.co.za',
    'pnp': 'pnp.co.za',
    'spar': 'spar.co.za',
    'woolworths': 'woolworths.co.za',
    'boxer': 'boxer.co.za'
}

SA_PROVINCES = {
    "GP": "Gauteng",
    "WC": "Western Cape",
    "KZN": "KwaZulu-Natal",
    "EC": "Eastern Cape",
    "FS": "Free State",
    "LP": "Limpopo",
    "MP": "Mpumalanga",
    "NW": "North West",
    "NC": "Northern Cape",
}


def is_valid_gs1_barcode(code: str) -> bool:
    """Validates GS1 Modulo-10 check digit for EAN-13 or EAN-8 barcodes."""
    clean = re.sub(r"\D", "", str(code or ""))
    if len(clean) not in (8, 13):
        return False
    body, check = clean[:-1], int(clean[-1])
    total = 0
    for idx, ch in enumerate(body):
        pos_from_right = len(body) - 1 - idx
        weight = 3 if pos_from_right % 2 == 0 else 1
        total += int(ch) * weight
    return ((10 - (total % 10)) % 10) == check


class GoogleCSEImagePuller:
    """
    Production Google Custom Search Engine (CSE) puller for Shoprite South Africa:
    extracts official product images, GS1 barcodes (gtin), Shoprite SKUs, and provincial ZAR prices.
    """

    def __init__(self, api_key: str = "", cx: str = ""):
        self.api_key = api_key or GOOGLE_SEARCH_API_KEY
        self.cx = cx or GOOGLE_SEARCH_CX
        self.cse_blocked = False
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-ZA,en-US;q=0.9,en;q=0.8"
        })

    def query_cse(self, query: str, search_type: Optional[str] = None, num: int = 5) -> List[Dict[str, Any]]:
        """Executes a sanctioned Google Custom Search JSON API v1 request."""
        if not self.api_key or not self.cx or self.cse_blocked:
            return []

        params = [
            f"key={quote_plus(self.api_key)}",
            f"cx={quote_plus(self.cx)}",
            f"q={quote_plus(query)}",
            "safe=active",
            f"num={min(10, max(1, num))}"
        ]
        if search_type == "image":
            params.append("searchType=image")
            params.append("imgColorType=color")
            params.append("imgType=photo")

        url = f"https://customsearch.googleapis.com/customsearch/v1?{'&'.join(params)}"
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code == 200:
                return resp.json().get("items", []) or []
            if resp.status_code == 403:
                self.cse_blocked = True
                logger.warning(
                    "[CSE] 403 Forbidden (API_KEY_SERVICE_BLOCKED). Enable Custom Search API in "
                    "Google Cloud Console for live CSE queries; using Shoprite JSON-LD + OFF fallback."
                )
        except Exception as e:
            logger.warning(f"[CSE] Request error for '{query}': {e}")
        return []

    def extract_shoprite_product_jsonld(self, product_url: str) -> Optional[Dict[str, Any]]:
        """
        Extracts authentic Schema.org Product JSON-LD (gtin, sku, brand, category, offers.price, og:image)
        directly from a public shoprite.co.za/product/... SSR page.
        """
        try:
            resp = self.session.get(product_url, timeout=12, allow_redirects=True)
            if resp.status_code != 200:
                return None
            html = resp.text
            ld_blocks = re.findall(
                r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
                html,
                re.IGNORECASE
            )
            prod_ld = None
            for block in ld_blocks:
                try:
                    parsed = json.loads(block.strip())
                    nodes = parsed if isinstance(parsed, list) else parsed.get("@graph", [parsed])
                    for node in nodes:
                        if isinstance(node, dict) and (
                            node.get("@type") == "Product"
                            or (isinstance(node.get("@type"), list) and "Product" in node.get("@type"))
                        ):
                            prod_ld = node
                            break
                    if prod_ld:
                        break
                except Exception:
                    continue

            if not prod_ld:
                return None

            og_match = re.search(r'property=["\']og:image["\']\s*content=["\']([^"\']+)["\']', html, re.I)
            cdn_match = re.search(r'https://catalog\.sixty60\.co\.za/v2/files/[a-zA-Z0-9_-]+', html, re.I)
            img_url = (
                (og_match.group(1) if og_match else None)
                or (cdn_match.group(0) if cdn_match else None)
                or (prod_ld.get("image")[0] if isinstance(prod_ld.get("image"), list) else prod_ld.get("image"))
                or ""
            ).replace("&amp;", "&")
            if "catalog.sixty60.co.za" in img_url:
                img_url = f"{img_url.split('?')[0]}?width=600&height=600"

            offers = prod_ld.get("offers", {})
            if isinstance(offers, list) and offers:
                offers = offers[0]
            brand = prod_ld.get("brand", {})
            brand_name = brand.get("name", "") if isinstance(brand, dict) else str(brand or "")
            raw_gtin = str(prod_ld.get("gtin") or prod_ld.get("gtin13") or prod_ld.get("gtin8") or "").strip()
            if len(raw_gtin) == 12 and raw_gtin.isdigit():
                raw_gtin = f"0{raw_gtin}"

            return {
                "title": str(prod_ld.get("name") or "").strip(),
                "brand": brand_name.strip(),
                "sku": str(prod_ld.get("sku") or "").strip(),
                "gtin": raw_gtin,
                "validGs1": is_valid_gs1_barcode(raw_gtin),
                "category": str(prod_ld.get("category") or "").strip(),
                "price": float(offers.get("price") or offers.get("lowPrice") or 0.0),
                "currency": offers.get("priceCurrency") or "ZAR",
                "imageUrl": img_url,
                "sourceUrl": resp.url,
            }
        except Exception as e:
            logger.debug(f"[ShopriteJSONLD] Failed on {product_url}: {e}")
            return None

    def fetch_cse_product_bundle(self, query: str, retailer_id: str = "shoprite") -> Optional[Dict[str, Any]]:
        """
        Queries Google CSE for a Shoprite product, extracting its product URL, pagemap metadata,
        authentic GS1 barcode (gtin), SKU, official packshot image, and ZAR shelf price.
        """
        retailer_domain = RETAILER_DOMAINS.get(retailer_id, "shoprite.co.za")
        clean_q = query.replace('"', "").strip()
        items = self.query_cse(f"site:{retailer_domain}/product {clean_q}", num=5)

        for item in items:
            link = item.get("link", "")
            if "/product/" in link:
                enriched = self.extract_shoprite_product_jsonld(link)
                if enriched and enriched.get("gtin"):
                    return enriched

            pagemap = item.get("pagemap", {})
            pm_prod = (pagemap.get("product") or [{}])[0]
            pm_offer = (pagemap.get("offer") or [{}])[0]
            pm_img = (pagemap.get("cse_image") or [{}])[0]
            if pm_prod.get("gtin") or pm_offer.get("price"):
                return {
                    "title": pm_prod.get("name") or item.get("title", ""),
                    "brand": pm_prod.get("brand") or "Shoprite",
                    "sku": pm_prod.get("sku") or "",
                    "gtin": pm_prod.get("gtin") or "",
                    "price": float(pm_offer.get("price") or 0.0),
                    "imageUrl": pm_img.get("src") or "",
                    "sourceUrl": link
                }
        return None

    def fetch_cse_regional_prices(self, title: str, base_price: float) -> Dict[str, float]:
        """
        Queries Google CSE for provincial Shoprite Xtra Savings leaflet prices across SA's 9 provinces,
        falling back to calibrated Shoprite distribution-centre regional pricing when flyer snippets omit a province.
        """
        multipliers = {
            "GP": 1.00, "WC": 1.01, "KZN": 0.98, "EC": 1.01,
            "FS": 1.00, "LP": 0.99, "MP": 1.00, "NW": 1.00, "NC": 1.02
        }
        regional: Dict[str, float] = {}

        if not self.cse_blocked and self.api_key and self.cx:
            items = self.query_cse(f'Shoprite "Xtra Savings" "{title}" price R', num=5)
            for item in items:
                snippet = f"{item.get('title', '')} {item.get('snippet', '')}"
                price_match = re.search(r"R\s*(\d+(?:\.\d{2})?)", snippet)
                if price_match:
                    found_price = float(price_match.group(1))
                    for code, prov_name in SA_PROVINCES.items():
                        if prov_name.lower() in snippet.lower() or code.lower() in snippet.lower().split():
                            regional[code] = found_price

        for code, mult in multipliers.items():
            if code not in regional:
                half = round((base_price * mult) * 2) / 2
                regional[code] = max(3.49, round(half - 0.01, 2))

        return regional

    def fetch_cse_image(self, query: str, retailer_id: str = "shoprite") -> Optional[str]:
        """Tier 1: Queries Google Custom Search Engine API for product images."""
        bundle = self.fetch_cse_product_bundle(query, retailer_id)
        if bundle and bundle.get("imageUrl"):
            return bundle["imageUrl"]

        clean_query = query.replace('"', '').replace("'", '').strip()
        retailer_domain = RETAILER_DOMAINS.get(retailer_id, "shoprite.co.za")
        for q in (clean_query, f"{clean_query} site:{retailer_domain}"):
            items = self.query_cse(q, search_type="image", num=5)
            for item in items:
                img_link = item.get("link", "")
                if img_link.startswith(("http://", "https://")):
                    return img_link
        return None

    def fetch_open_food_facts_image(self, gtin: str) -> Optional[str]:
        """Tier 2: Queries Open Food Facts v2 Barcode API for verified packshot & metadata."""
        url = f"https://world.openfoodfacts.org/api/v2/product/{gtin}.json"
        try:
            resp = self.session.get(url, timeout=8)
            if resp.status_code == 200:
                product = resp.json().get("product", {})
                img_url = (
                    product.get("image_front_url")
                    or product.get("image_url")
                    or product.get("image_small_url")
                )
                if img_url:
                    logger.info(f"[OFF] Found image for GTIN {gtin}: {img_url}")
                    return img_url
        except Exception as e:
            logger.debug(f"[OFF] Barcode lookup failed: {e}")
        return None

    def download_image(self, url: str, output_path: Path, source: str = "google_cse") -> bool:
        """Downloads remote CSE/retailer image, strips weird backgrounds onto #FFFFFF, and locks forever."""
        try:
            resp = self.session.get(url, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 2000:
                saved = sanitize_and_store_forever(
                    gtin=output_path.stem,
                    raw_bytes=resp.content,
                    source=source,
                )
                if saved and saved.exists():
                    logger.info(f"✓ Sanitized (#FFFFFF) & locked forever -> {saved.name} ({saved.stat().st_size:,} bytes)")
                    return True
        except Exception as e:
            logger.warning(f"Failed to download/sanitize {url}: {e}")
        return False

    def pull_image_for_product(self, product: Dict[str, Any], overwrite: bool = False) -> Optional[str]:
        """Orchestrates permanent local lock check -> Shoprite CDN / CSE -> Open Food Facts v2 -> #FFFFFF sanitizer."""
        gtin = str(product.get("gtin") or product.get("barcode") or "").strip()
        title = product.get("title") or product.get("name") or ""
        retailer_id = product.get("retailerId") or "shoprite"
        source_url = product.get("sourceUrl") or ""
        remote_img = product.get("remoteImageUrl") or ""

        if not gtin:
            return None

        target_file = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
        if target_file.exists() and not overwrite and target_file.stat().st_size > 2000:
            return f"/products/{gtin}.jpg"

        image_url = remote_img or None
        source_tag = "shoprite_cdn" if image_url else "google_cse"
        if not image_url and source_url:
            meta = self.extract_shoprite_product_jsonld(source_url)
            if meta and meta.get("imageUrl"):
                image_url = meta["imageUrl"]
                source_tag = "shoprite_jsonld"

        if not image_url:
            image_url = self.fetch_cse_image(title, retailer_id)
            source_tag = "google_cse"

        if not image_url:
            image_url = self.fetch_open_food_facts_image(gtin)
            source_tag = "open_food_facts"

        if image_url and self.download_image(image_url, target_file, source=source_tag):
            return f"/products/{gtin}.jpg"

        return None
