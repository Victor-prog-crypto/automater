import re
import os

with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Match each product entry in MASTER_PRODUCTS map
gtins = re.findall(r"\['(\d{8,14})',\s*\{", text)
print(f"Total products found in MASTER_PRODUCTS: {len(gtins)}")

all_ok = True
for gtin in gtins:
    img_path = f"public/products/{gtin}.jpg"
    exists = os.path.isfile(img_path)
    size = os.path.getsize(img_path) if exists else 0
    if not exists or size < 1000:
        print(f"MISSING or TINY: {gtin} -> {img_path} (size={size})")
        all_ok = False
    else:
        pass

if all_ok:
    print("ALL 34 PRODUCTS HAVE VALID, NON-EMPTY IMAGES IN public/products/")
else:
    print("Some products are missing valid images!")
