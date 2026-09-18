"""
Automater Backend - Vertex AI Nano Banana Product Packshot Engine
Leverages Google Vertex AI (gemini-2.5-flash-image) configured identically to SchoolLibry's
Vertex Nano Banana engine to generate photorealistic studio product packaging packshots
on pure white backgrounds for South African supermarket retail items.
"""

import os
import re
import io
import json
import time
import base64
import logging
import requests
from pathlib import Path
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from PIL import Image

# Load environment
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.vertex_packshot")

# Vertex credentials loaded strictly from environment (.env)
VERTEX_CLIENT_ID = os.getenv("VERTEX_CLIENT_ID", "")
VERTEX_CLIENT_SECRET = os.getenv("VERTEX_CLIENT_SECRET", "")
VERTEX_REFRESH_TOKEN = os.getenv("VERTEX_REFRESH_TOKEN", "")
VERTEX_PROJECT_ID = os.getenv("VERTEX_PROJECT_ID", "")

PUBLIC_PRODUCTS_DIR = Path(__file__).resolve().parent.parent.parent / 'public' / 'products'
PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)


class VertexPackshotEngine:
    """
    High-fidelity retail packshot generator using Vertex AI Nano Banana (gemini-2.5-flash-image)
    with automated OAuth2 token refresh and multi-region rotation.
    """

    def __init__(
        self,
        client_id: str = "",
        client_secret: str = "",
        refresh_token: str = "",
        project_id: str = "",
        model_name: str = "gemini-2.5-flash-image"
    ):
        self.client_id = client_id or VERTEX_CLIENT_ID
        self.client_secret = client_secret or VERTEX_CLIENT_SECRET
        self.refresh_token = refresh_token or VERTEX_REFRESH_TOKEN
        self.project_id = project_id or VERTEX_PROJECT_ID
        self.model_name = model_name
        self.cached_token: Optional[str] = None
        self.token_expires_at: float = 0
        self.region_cooldowns: Dict[str, float] = {}
        # us-central1 is the primary hub for Gemini 2.5 flash image
        self.regions = ["us-central1"]

    def get_access_token(self) -> str:
        """Refreshes and returns an OAuth2 bearer token for Google Cloud Vertex AI."""
        now = time.time()
        if self.cached_token and now < (self.token_expires_at - 300):
            return self.cached_token

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token"
        }

        try:
            resp = requests.post("https://oauth2.googleapis.com/token", data=data, timeout=15)
            if resp.status_code == 200:
                result = resp.json()
                token = result.get("access_token")
                expires_in = result.get("expires_in", 3600)
                if token:
                    self.cached_token = token
                    self.token_expires_at = now + expires_in
                    logger.info("[OK] Acquired fresh Vertex AI OAuth2 access token")
                    return token
            else:
                logger.error(f"OAuth token refresh failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Failed to refresh Vertex AI OAuth token: {e}")

        return self.cached_token or ""

    def generate_image_bytes(self, prompt: str, max_retries: int = 2) -> Optional[bytes]:
        """Calls Vertex AI model with retry handling to generate image bytes."""
        token = self.get_access_token()
        if not token:
            logger.error("No valid Vertex AI access token available.")
            return None

        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE"]
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        for attempt in range(1, max_retries + 1):
            loc = "us-central1"
            endpoint = f"https://{loc}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{loc}/publishers/google/models/{self.model_name}:generateContent"

            try:
                logger.info(f"[Vertex Nano Banana] Generating packshot via {loc} (attempt {attempt}/{max_retries})...")
                resp = requests.post(endpoint, json=payload, headers=headers, timeout=90)

                if resp.status_code == 200:
                    vdata = resp.json()
                    candidates = vdata.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for p in parts:
                            inline = p.get("inlineData") or p.get("inline_data")
                            if inline and "data" in inline:
                                b64_data = inline["data"]
                                raw_bytes = base64.b64decode(b64_data)
                                logger.info(f"[OK] Generated image ({len(raw_bytes)} bytes) from {loc}")
                                return raw_bytes
                elif resp.status_code == 429:
                    logger.warning(f"[Vertex] 429 Rate limit in {loc}. Waiting 15s before retry...")
                    time.sleep(15)
                    continue
                else:
                    logger.warning(f"[Vertex] HTTP {resp.status_code}: {resp.text[:200]}")
                    time.sleep(3)
            except requests.exceptions.Timeout:
                logger.warning(f"[Vertex] Request timed out on attempt {attempt}. Retrying...")
                time.sleep(3)
            except Exception as e:
                logger.warning(f"[Vertex] Call failed: {e}")
                time.sleep(3)

        return None

    def build_packshot_prompt(self, product: Dict[str, Any]) -> str:
        """Constructs an optimized studio packshot prompt for South African retail products."""
        title = product.get("title", "")
        brand = product.get("brand", "")
        weight = product.get("weight", "")
        category = product.get("category", "")
        retailer = product.get("retailerId", "shoprite")

        retailer_note = ""
        if "ritebrand" in title.lower() or retailer.lower() == "shoprite":
            retailer_note = "Shoprite South Africa supermarket packaging style, "

        prompt = (
            f"Studio commercial product photography of {title}, {brand} brand, {weight} {category}. "
            f"{retailer_note}Photorealistic retail product packaging packshot on a clean seamless pure white background (#FFFFFF). "
            f"Centered hero packshot, sharp high-resolution retail packaging label, authentic typography, natural soft lighting, commercial studio packshot, no crop."
        )
        return prompt

    def generate_and_save_product_packshot(
        self,
        product: Dict[str, Any],
        overwrite: bool = False
    ) -> Optional[str]:
        """
        Generates and saves the product packshot as both .jpg and .png
        under public/products/{gtin}.jpg and public/products/{gtin}.png.
        """
        gtin = str(product.get("gtin", "")).strip()
        if not gtin:
            return None

        jpg_path = PUBLIC_PRODUCTS_DIR / f"{gtin}.jpg"
        png_path = PUBLIC_PRODUCTS_DIR / f"{gtin}.png"

        # Check if already generated
        if not overwrite and jpg_path.exists() and jpg_path.stat().st_size > 50000:
            logger.info(f"Skipping {gtin} (already has high-res packshot: {jpg_path.stat().st_size // 1024} KB)")
            return str(jpg_path)

        prompt = self.build_packshot_prompt(product)
        raw_bytes = self.generate_image_bytes(prompt)
        if not raw_bytes:
            return None

        try:
            img = Image.open(io.BytesIO(raw_bytes))
            if img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    rgb_img.paste(img, mask=img.split()[3])
                else:
                    rgb_img.paste(img.convert("RGB"))
                img = rgb_img
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.save(jpg_path, "JPEG", quality=95, optimize=True)
            img.save(png_path, "PNG", optimize=True)

            logger.info(f"[OK] Saved packshots for GTIN {gtin}: {jpg_path.name} & {png_path.name}")
            return str(jpg_path)
        except Exception as e:
            logger.error(f"Failed to process and save image for {gtin}: {e}")
            return None
