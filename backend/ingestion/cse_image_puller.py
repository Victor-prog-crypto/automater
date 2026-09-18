"""
Automater Backend - Google Custom Search Engine (CSE) Product Image Puller
Mirrors SchoolLibry's fetchGoogleCustomSearchImage architecture with retailer-specific
query optimization, GTIN barcode targeting, and multi-tier fallbacks.
"""

import os
import re
import json
import time
import logging
import requests
from pathlib import Path
from typing import Optional, Dict, Any, List
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.cse_puller")

# Config from SchoolLibry setup
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
GOOGLE_SEARCH_CX = os.getenv("GOOGLE_SEARCH_CX") or ""

PUBLIC_PRODUCTS_DIR = Path(__file__).resolve().parent.parent.parent / 'public' / 'products'
PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

RETAILER_DOMAINS = {
    'shoprite': 'shoprite.co.za',
    'checkers': 'checkers.co.za',
    'pnp': 'pnp.co.za',
    'spar': 'spar.co.za',
    'woolworths': 'woolworths.co.za',
    'boxer': 'boxer.co.za'
}


class GoogleCSEImagePuller:
    """
    Automated Product Image Puller leveraging Google Custom Search Engine (CSE)
    configured identically to SchoolLibry's fetchGoogleCustomSearchImage.
    """

    def __init__(self, api_key: str = "", cx: str = ""):
        self.api_key = api_key or GOOGLE_SEARCH_API_KEY
        self.cx = cx or GOOGLE_SEARCH_CX
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        })

    def fetch_cse_image(self, query: str, retailer_id: str = "shoprite") -> Optional[str]:
        """
        Tier 1: Queries Google Custom Search Engine API for product images.
        """
        if not self.api_key or not self.cx:
            return None

        clean_query = query.replace('"', '').replace("'", '').strip()
        retailer_domain = RETAILER_DOMAINS.get(retailer_id, "shoprite.co.za")
        
        # If the CSE is already configured specifically for Shoprite, plain query works best.
        # Otherwise fallback to site:domain targeting.
        queries_to_try = [clean_query, f"{clean_query} site:{retailer_domain}"]
        
        for q in queries_to_try:
            url = (
                f"https://customsearch.googleapis.com/customsearch/v1?"
                f"key={quote_plus(self.api_key)}&"
                f"cx={quote_plus(self.cx)}&"
                f"q={quote_plus(q)}&"
                f"searchType=image&"
                f"safe=active&"
                f"num=5"
            )
            try:
                logger.info(f"[CSE] Querying Custom Search (cx={self.cx[:6]}...): '{q}'")
                resp = self.session.get(url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("items", [])
                    if items and isinstance(items, list):
                        for item in items:
                            img_link = item.get("link")
                            if img_link and (img_link.startswith("http://") or img_link.startswith("https://")):
                                return img_link
                elif resp.status_code == 403:
                    logger.warning(f"[CSE] 403 Forbidden: Check Custom Search API is enabled in Google Cloud Console for key.")
                    break
            except Exception as e:
                logger.warning(f"[CSE] Request error for '{q}': {e}")

        return None

    def fetch_open_food_facts_image(self, gtin: str) -> Optional[str]:
        """
        Tier 2: Queries Open Food Facts / Barcode API for exact product imagery.
        """
        url = f"https://world.openfoodfacts.org/api/v2/product/{gtin}.json"
        try:
            resp = self.session.get(url, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                product = data.get("product", {})
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

    def fetch_retail_catalog_image(self, query: str, retailer_id: str = "shoprite") -> Optional[str]:
        """
        Tier 3: DuckDuckGo / Public Retail Web Search fallback (mirroring SchoolLibry).
        """
        retailer_name = retailer_id.capitalize()
        search_term = f"{query} {retailer_name} South Africa product"
        ddg_url = f"https://duckduckgo.com/html/?q={quote_plus(search_term)}"

        try:
            resp = self.session.get(ddg_url, timeout=8)
            if resp.status_code == 200:
                # Look for common retailer image patterns in the HTML results
                matches = re.findall(r'(https?://[^"\'\s]+?\.(?:jpg|jpeg|png|webp))', resp.text, re.IGNORECASE)
                for match in matches:
                    if any(domain in match.lower() for domain in ["shoprite", "checkers", "pnp", "cloudinary", "scene7"]):
                        return match
        except Exception as e:
            logger.debug(f"[RetailCatalog] Fallback search failed: {e}")

        return None

    def download_image(self, url: str, output_path: Path) -> bool:
        """
        Downloads remote image and saves it locally if valid.
        """
        try:
            headers = {"User-Agent": USER_AGENT, "Referer": "https://www.google.com/"}
            resp = self.session.get(url, headers=headers, timeout=12, stream=True)
            if resp.status_code == 200 and len(resp.content) > 1500:
                with open(output_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"✓ Saved image ({len(resp.content):,} bytes) -> {output_path.name}")
                return True
        except Exception as e:
            logger.warning(f"Failed to download {url}: {e}")
        return False

    def pull_image_for_product(self, product: Dict[str, Any], overwrite: bool = False) -> Optional[str]:
        """
        Main orchestration: checks local file, then triggers Tier 1 -> Tier 2 -> Tier 3.
        """
        gtin = str(product.get("gtin") or product.get("barcode") or "").strip()
        title = product.get("title") or product.get("name") or ""
        retailer_id = product.get("retailerId") or "shoprite"

        if not gtin:
            return None

        target_file = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
        if target_file.exists() and not overwrite and target_file.stat().st_size > 2000:
            logger.info(f"Image already exists for {gtin} ({title[:35]}...)")
            return f"/products/{gtin}.jpg"

        image_url = None

        # 1. Tier 1: Google Custom Search Engine
        image_url = self.fetch_cse_image(title, retailer_id)

        # 2. Tier 2: Open Food Facts GTIN Barcode
        if not image_url:
            image_url = self.fetch_open_food_facts_image(gtin)

        # 3. Tier 3: Retail Catalog / Web Search fallback
        if not image_url:
            image_url = self.fetch_retail_catalog_image(title, retailer_id)

        if image_url:
            success = self.download_image(image_url, target_file)
            if success:
                return f"/products/{gtin}.jpg"

        return None
