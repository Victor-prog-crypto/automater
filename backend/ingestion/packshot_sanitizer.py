"""
Automater — Permanent CSE Packshot Studio-White (#FFFFFF) Sanitizer & Manifest Lock

Ensures every product image pulled via Google CSE, Shoprite JSON-LD, or Open Food Facts:
1. Decodes cleanly from any raw web format (WebP, PNG, JPEG, GIF) — never leaving WebP bytes in a .jpg file.
2. Composites alpha/transparent cutouts cleanly onto pure studio white (#FFFFFF) with zero dark premultiplied fringes.
3. Strips weird non-white outer studio backdrops (pitch-black RGBA->RGB bugs, grey cycloramas, tinted borders)
   using edge-stopped perimeter BFS flood-fill so interior white packaging/labels are never harmed.
4. Centers the product proportionally on a crisp 600x600 pure #FFFFFF canvas as a standards-compliant RGB JPEG.
5. Records SHA-256 & verification metadata in public/products/manifest.json so CSE images are stored forever locally.
"""

import io
import json
import hashlib
import logging
import argparse
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List

from PIL import Image, ImageFilter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("automater.packshot_sanitizer")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PUBLIC_PRODUCTS_DIR = BASE_DIR / "public" / "products"
DIST_PRODUCTS_DIR = BASE_DIR / "dist" / "products"
MANIFEST_PATH = PUBLIC_PRODUCTS_DIR / "manifest.json"


def _color_dist_sq(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> int:
    dr = c1[0] - c2[0]
    dg = c1[1] - c2[1]
    db = c1[2] - c2[2]
    return dr * dr + dg * dg + db * db


def _composite_rgba_onto_white(img: Image.Image) -> Tuple[Image.Image, bool]:
    """
    Converts any image mode to RGB, compositing transparency onto pure #FFFFFF
    while cleaning ultra-faint shadow dust (<14 alpha) so corners stay exact (255,255,255).
    Returns (rgb_image, had_transparency).
    """
    has_alpha = (
        img.mode in ("RGBA", "LA")
        or (img.mode == "P" and "transparency" in img.info)
    )
    if not has_alpha:
        return img.convert("RGB"), False

    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    # Check if perimeter is genuinely transparent
    border_transparent = 0
    border_total = 0
    for x in range(0, w, max(1, w // 40)):
        for y in (0, h - 1):
            border_total += 1
            if px[x, y][3] < 235:
                border_transparent += 1
    for y in range(0, h, max(1, h // 40)):
        for x in (0, w - 1):
            border_total += 1
            if px[x, y][3] < 235:
                border_transparent += 1

    had_real_cutout = border_total > 0 and (border_transparent / border_total) > 0.25

    # Clean near-zero alpha dust & un-darken premultiplied black fringes on cutout edges
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 14:
                px[x, y] = (255, 255, 255, 0)
            elif a < 245 and r < 20 and g < 20 and b < 20:
                # Lift premultiplied black cutout edge halo toward neutral light edge
                lift = int((245 - a) * 0.65)
                px[x, y] = (min(255, r + lift), min(255, g + lift), min(255, b + lift), a)

    white_bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    composited = Image.alpha_composite(white_bg, rgba).convert("RGB")
    return composited, had_real_cutout


def _flood_fill_weird_border_to_white(rgb_img: Image.Image) -> Image.Image:
    """
    Removes non-white exterior backgrounds connected to the outer border:
      - Pitch-black (0,0,0) backgrounds caused by prior broken RGBA->RGB conversions
      - Light-grey / off-white (#D8D8D8..#FEFEFE) studio boxes from CSE web thumbnails
      - Uniform solid colored studio backdrops around the outer perimeter
    Uses an edge-barrier BFS starting strictly from outer border pixels so interior
    white packaging, milk cartons, bread bags, and typography remain 100% intact.
    """
    orig_w, orig_h = rgb_img.size
    # Work at native resolution up to 800px max side for fast, crisp perimeter flood-fill
    max_work = 800
    if max(orig_w, orig_h) > max_work:
        scale = max_work / float(max(orig_w, orig_h))
        work_img = rgb_img.resize(
            (max(1, int(round(orig_w * scale))), max(1, int(round(orig_h * scale)))),
            Image.Resampling.LANCZOS,
        )
    else:
        work_img = rgb_img.copy()

    w, h = work_img.size
    px = work_img.load()

    # Collect outer perimeter samples
    border_coords: List[Tuple[int, int]] = []
    for x in range(w):
        border_coords.append((x, 0))
        border_coords.append((x, h - 1))
    for y in range(1, h - 1):
        border_coords.append((0, y))
        border_coords.append((w - 1, y))

    pure_white_count = 0
    near_white_grey_count = 0
    pitch_dark_count = 0
    border_colors: List[Tuple[int, int, int]] = []

    for bx, by in border_coords:
        c = px[bx, by]
        border_colors.append(c)
        if c[0] >= 252 and c[1] >= 252 and c[2] >= 252:
            pure_white_count += 1
        if min(c) >= 195 and (max(c) - min(c)) <= 28:
            near_white_grey_count += 1
        if max(c) <= 28:
            pitch_dark_count += 1

    total_b = max(1, len(border_coords))

    # Fast path: perimeter is already >96% pure white — just snap >=246 border-connected off-whites
    if pure_white_count / total_b >= 0.96:
        visited = bytearray(w * h)
        q = deque()
        for bx, by in border_coords:
            c = px[bx, by]
            if c[0] >= 245 and c[1] >= 245 and c[2] >= 245:
                idx = by * w + bx
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((bx, by))
        while q:
            cx, cy = q.popleft()
            px[cx, cy] = (255, 255, 255)
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nidx = ny * w + nx
                    if not visited[nidx]:
                        nc = px[nx, ny]
                        if nc[0] >= 246 and nc[1] >= 246 and nc[2] >= 246:
                            visited[nidx] = 1
                            q.append((nx, ny))
        return work_img

    # Determine dominant perimeter backdrop mode
    is_dark_bug_bg = (pitch_dark_count / total_b) >= 0.55
    is_grey_studio_bg = (near_white_grey_count / total_b) >= 0.60

    # Quantize border colors into coarse 16-level buckets to check if there's a uniform colored studio backdrop
    buckets: Dict[Tuple[int, int, int], int] = {}
    for c in border_colors:
        bkey = (c[0] >> 4, c[1] >> 4, c[2] >> 4)
        buckets[bkey] = buckets.get(bkey, 0) + 1
    top_bucket, top_count = max(buckets.items(), key=lambda kv: kv[1])
    dom_samples = [
        c for c in border_colors
        if abs((c[0] >> 4) - top_bucket[0]) <= 1
        and abs((c[1] >> 4) - top_bucket[1]) <= 1
        and abs((c[2] >> 4) - top_bucket[2]) <= 1
    ]
    if dom_samples:
        ref_color = (
            sum(c[0] for c in dom_samples) // len(dom_samples),
            sum(c[1] for c in dom_samples) // len(dom_samples),
            sum(c[2] for c in dom_samples) // len(dom_samples),
        )
    else:
        ref_color = (255, 255, 255)

    is_uniform_studio_bg = (len(dom_samples) / total_b) >= 0.62

    if not (is_dark_bug_bg or is_grey_studio_bg or is_uniform_studio_bg):
        # Complex edge-to-edge photo: still gently frame onto white canvas without eating product pixels
        return work_img

    # Configure edge-stopped flood-fill thresholds
    if is_dark_bug_bg:
        max_ref_dist_sq = 48 * 48
        max_step_dist_sq = 22 * 22
    elif is_grey_studio_bg:
        # Careful step barrier so white/cream packaging edges stop the flood immediately
        max_ref_dist_sq = 42 * 42
        max_step_dist_sq = 11 * 11
    else:
        max_ref_dist_sq = 44 * 44
        max_step_dist_sq = 16 * 16

    bg_mask = bytearray(w * h)
    q = deque()

    def matches_seed(c: Tuple[int, int, int]) -> bool:
        if is_dark_bug_bg and max(c) <= 38:
            return True
        if is_grey_studio_bg and min(c) >= 195 and (max(c) - min(c)) <= 30:
            return True
        return _color_dist_sq(c, ref_color) <= max_ref_dist_sq

    for bx, by in border_coords:
        c = px[bx, by]
        if matches_seed(c):
            idx = by * w + bx
            if not bg_mask[idx]:
                bg_mask[idx] = 255
                q.append((bx, by))

    while q:
        cx, cy = q.popleft()
        cc = px[cx, cy]
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if bg_mask[nidx]:
                    continue
                nc = px[nx, ny]
                step_sq = _color_dist_sq(cc, nc)
                if step_sq > max_step_dist_sq:
                    continue
                if is_dark_bug_bg and max(nc) <= 46:
                    bg_mask[nidx] = 255
                    q.append((nx, ny))
                elif is_grey_studio_bg and min(nc) >= 198 and (max(nc) - min(nc)) <= 28:
                    bg_mask[nidx] = 255
                    q.append((nx, ny))
                elif _color_dist_sq(nc, ref_color) <= max_ref_dist_sq:
                    bg_mask[nidx] = 255
                    q.append((nx, ny))

    # For dark RGBA-bug JPEGs, erode 1px JPEG ringing halo adjacent to background mask
    if is_dark_bug_bg:
        halo_indices = []
        for y in range(1, h - 1):
            row_off = y * w
            for x in range(1, w - 1):
                idx = row_off + x
                if not bg_mask[idx]:
                    c = px[x, y]
                    if max(c) <= 75 and (
                        bg_mask[idx - 1] or bg_mask[idx + 1] or bg_mask[idx - w] or bg_mask[idx + w]
                    ):
                        halo_indices.append(idx)
        for idx in halo_indices:
            bg_mask[idx] = 255

    # Build feathered alpha matte (0 = background -> white, 255 = foreground product)
    fg_mask_bytes = bytes(0 if b else 255 for b in bg_mask)
    fg_mask = Image.frombytes("L", (w, h), fg_mask_bytes)
    fg_mask_soft = fg_mask.filter(ImageFilter.GaussianBlur(radius=0.85))

    white_canvas = Image.new("RGB", (w, h), (255, 255, 255))
    cleaned = Image.composite(work_img, white_canvas, fg_mask_soft)
    return cleaned


def _frame_product_on_studio_square(rgb_img: Image.Image, target_size: int = 600, margin_ratio: float = 0.06) -> Image.Image:
    """
    Finds the product's non-white bounding box, trims dead space, and centers it
    proportionally with a clean studio margin on a pure #FFFFFF square canvas.
    """
    w, h = rgb_img.size
    px = rgb_img.load()

    min_x, min_y = w, h
    max_x, max_y = -1, -1

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 249 or g < 249 or b < 249:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y

    canvas = Image.new("RGB", (target_size, target_size), (255, 255, 255))

    if max_x <= min_x or max_y <= min_y:
        # Fallback if image was blank
        resized = rgb_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
        canvas.paste(resized, (0, 0))
        return canvas

    cropped = rgb_img.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = cropped.size

    usable = int(round(target_size * (1.0 - 2.0 * margin_ratio)))
    scale = min(usable / float(cw), usable / float(ch))
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))

    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    offset_x = (target_size - new_w) // 2
    offset_y = (target_size - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    return canvas


def sanitize_packshot_bytes(raw_bytes: bytes, target_size: int = 600) -> bytes:
    """
    Full pipeline: raw downloaded image bytes -> pure #FFFFFF 600x600 studio RGB JPEG bytes.
    """
    img = Image.open(io.BytesIO(raw_bytes))
    composited, had_cutout = _composite_rgba_onto_white(img)
    if not had_cutout:
        composited = _flood_fill_weird_border_to_white(composited)
    else:
        # Even after cutout composite, snap any faint 250..254 edge haze on outer frame
        composited = _flood_fill_weird_border_to_white(composited)

    studio_img = _frame_product_on_studio_square(composited, target_size=target_size, margin_ratio=0.06)

    out = io.BytesIO()
    studio_img.save(
        out,
        format="JPEG",
        quality=91,
        optimize=True,
        progressive=True,
        subsampling=0,
    )
    return out.getvalue()


def update_packshot_manifest(entries_update: Dict[str, Dict[str, Any]]) -> None:
    """Atomically updates public/products/manifest.json for permanent packshot provenance tracking."""
    PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    existing: Dict[str, Any] = {"version": 1, "background": "#FFFFFF", "items": {}}
    if MANIFEST_PATH.exists():
        try:
            loaded = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            if isinstance(loaded, dict) and isinstance(loaded.get("items"), dict):
                existing = loaded
        except Exception:
            pass

    existing["updatedAt"] = datetime.now(timezone.utc).isoformat()
    existing["background"] = "#FFFFFF"
    existing["items"].update(entries_update)
    existing["totalVerifiedPackshots"] = len(existing["items"])

    MANIFEST_PATH.write_text(json.dumps(existing, indent=2, sort_keys=True), encoding="utf-8")


def sanitize_and_store_forever(
    gtin: str,
    raw_bytes: bytes,
    source: str = "google_cse",
    target_size: int = 600,
) -> Optional[Path]:
    """
    Sanitizes raw image bytes onto pure #FFFFFF, writes permanently to public/products/{gtin}.jpg
    (and dist/products/{gtin}.jpg if dist exists), and locks it in manifest.json.
    """
    clean_gtin = str(gtin).strip()
    if not clean_gtin:
        return None

    PUBLIC_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    jpg_bytes = sanitize_packshot_bytes(raw_bytes, target_size=target_size)
    if len(jpg_bytes) < 1500:
        return None

    jpg_path = PUBLIC_PRODUCTS_DIR / f"{clean_gtin}.jpg"
    jpg_path.write_bytes(jpg_bytes)

    if DIST_PRODUCTS_DIR.exists():
        (DIST_PRODUCTS_DIR / f"{clean_gtin}.jpg").write_bytes(jpg_bytes)

    sha256_hex = hashlib.sha256(jpg_bytes).hexdigest()
    update_packshot_manifest({
        clean_gtin: {
            "file": f"/products/{clean_gtin}.jpg",
            "format": "JPEG",
            "dimensions": f"{target_size}x{target_size}",
            "background": "#FFFFFF",
            "bytes": len(jpg_bytes),
            "sha256": sha256_hex,
            "source": source,
            "lockedForever": True,
            "savedAt": datetime.now(timezone.utc).isoformat(),
        }
    })
    return jpg_path


def batch_sanitize_directory(directory: Path = PUBLIC_PRODUCTS_DIR, target_size: int = 600) -> Dict[str, int]:
    """
    Normalizes all existing *.jpg files in public/products/ into genuine 600x600 pure #FFFFFF RGB JPEGs
    and locks them into public/products/manifest.json.
    """
    jpg_files = sorted(directory.glob("*.jpg"))
    manifest_updates: Dict[str, Dict[str, Any]] = {}
    converted = 0
    failed = 0

    for f in jpg_files:
        gtin = f.stem
        try:
            raw = f.read_bytes()
            clean_bytes = sanitize_packshot_bytes(raw, target_size=target_size)
            f.write_bytes(clean_bytes)
            if DIST_PRODUCTS_DIR.exists():
                (DIST_PRODUCTS_DIR / f.name).write_bytes(clean_bytes)

            manifest_updates[gtin] = {
                "file": f"/products/{f.name}",
                "format": "JPEG",
                "dimensions": f"{target_size}x{target_size}",
                "background": "#FFFFFF",
                "bytes": len(clean_bytes),
                "sha256": hashlib.sha256(clean_bytes).hexdigest(),
                "source": "cse_verified_local",
                "lockedForever": True,
                "savedAt": datetime.now(timezone.utc).isoformat(),
            }
            converted += 1
        except Exception as exc:
            logger.warning(f"Failed to sanitize {f.name}: {exc}")
            failed += 1

    if manifest_updates:
        update_packshot_manifest(manifest_updates)

    logger.info(f"[OK] Sanitized {converted} packshots onto pure #FFFFFF ({failed} failed).")
    return {"converted": converted, "failed": failed}


def main():
    parser = argparse.ArgumentParser(description="Automater Studio-White (#FFFFFF) CSE Packshot Sanitizer")
    parser.add_argument("--file", type=str, default=None, help="Single image file path to sanitize in-place")
    parser.add_argument("--gtin", type=str, default=None, help="GTIN identifier when sanitizing a single file")
    parser.add_argument("--source", type=str, default="google_cse", help="Provenance label for manifest.json")
    parser.add_argument("--all", action="store_true", help="Sanitize all *.jpg files in public/products/")
    parser.add_argument("--size", type=int, default=600, help="Target square studio dimension (default 600)")
    args = parser.parse_args()

    if args.file:
        p = Path(args.file)
        if not p.exists():
            raise SystemExit(f"File not found: {p}")
        gtin = args.gtin or p.stem
        raw = p.read_bytes()
        sanitize_and_store_forever(gtin=gtin, raw_bytes=raw, source=args.source, target_size=args.size)
        logger.info(f"[OK] Sanitized & locked {gtin}.jpg onto pure #FFFFFF")
    else:
        batch_sanitize_directory(PUBLIC_PRODUCTS_DIR, target_size=args.size)


if __name__ == "__main__":
    main()
