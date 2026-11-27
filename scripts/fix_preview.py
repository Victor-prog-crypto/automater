import json
import html
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def rebuild_gallery():
    cat = json.loads((BASE_DIR / "public/data/shoprite_catalog.json").read_text(encoding="utf-8"))
    prods = cat["allProducts"]

    cards = []
    for p in prods:
        gtin = html.escape(str(p["gtin"]))
        title = html.escape(str(p["title"]))
        dept = html.escape(str(p["category"]))
        weight = html.escape(str(p.get("weight", "")))
        promo = float(p.get("promoPrice") or p.get("basePrice") or 0)
        reg = float(p.get("basePrice") or promo)
        was_html = f'<span class="text-xs text-slate-500 line-through">R {reg:.2f}</span>' if reg > promo else ""
        cards.append(f"""
      <div class="bg-slate-800/80 border border-slate-700 rounded-3xl p-4 overflow-hidden shadow-lg hover:border-slate-500 transition">
        <div class="aspect-square w-full rounded-2xl overflow-hidden bg-white flex items-center justify-center p-3">
          <img src="./{gtin}.jpg" alt="{title}" loading="lazy" width="300" height="300" class="max-h-full max-w-full object-contain" onerror="this.src='./{gtin}.svg'" />
        </div>
        <div class="mt-3">
          <span class="text-[10px] font-mono font-bold bg-slate-700 px-2 py-0.5 rounded text-slate-300">{gtin}</span>
          <h3 class="text-sm font-black text-white mt-1.5 leading-snug">{title}</h3>
          <p class="text-xs text-slate-400 mt-0.5">{dept} &bull; {weight}</p>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
            <span class="text-emerald-400 font-black text-sm">R {promo:.2f}</span>
            {was_html}
          </div>
        </div>
      </div>""")

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Automater — Pure-White CSE Packshots Gallery ({len(prods)} Items)</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6">
  <header class="max-w-6xl mx-auto pb-8 border-b border-slate-800 flex items-center justify-between">
    <div>
      <span class="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">CSE Permanent Local Vault &middot; #FFFFFF Studio</span>
      <h1 class="text-3xl font-black text-white mt-2">Shoprite Pure-White Packshots Gallery</h1>
      <p class="text-slate-400 text-sm mt-1">Zero Vertex AI &middot; Locked forever in <code class="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono text-xs">public/products/manifest.json</code></p>
    </div>
    <div class="text-right">
      <span class="text-2xl font-black text-emerald-400">{len(prods)} SKUs</span>
      <p class="text-xs text-slate-500">600x600 Pure #FFFFFF JPEG</p>
    </div>
  </header>
  <main class="max-w-6xl mx-auto mt-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {"".join(cards)}
    </div>
  </main>
</body>
</html>"""

    pub_gal = BASE_DIR / "public/products/gallery.html"
    dist_gal = BASE_DIR / "dist/products/gallery.html"
    pub_gal.write_text(page, encoding="utf-8")
    if dist_gal.parent.exists():
        dist_gal.write_text(page, encoding="utf-8")
    print(f"[OK] Updated gallery.html with {len(prods)} pure-white #FFFFFF CSE packshots.")


if __name__ == "__main__":
    rebuild_gallery()
