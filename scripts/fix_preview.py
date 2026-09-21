from pathlib import Path
import re

p = Path(r'C:\Users\tthek\AUTOMATER_PRODUCTS_PREVIEW.html')
text = p.read_text(encoding='utf-8')

blocks = text.split('<!-- ')
new_blocks = [blocks[0]]

count = 0
for block in blocks[1:]:
    gtin_match = re.search(r'text-\[10px\][^>]*>(\d{7,14})</span>', block)
    if gtin_match:
        gtin = gtin_match.group(1)
        old_src = 'src="./automater/public/products/"'
        new_src = f'src="./automater/public/products/{gtin}.jpg"'
        if old_src in block:
            block = block.replace(old_src, new_src)
            block = block.replace("this.src='./automater/public/products/'", f"this.src='./automater/public/products/{gtin}.svg'")
            count += 1
    new_blocks.append(block)

fixed = '<!-- '.join(new_blocks)
p.write_text(fixed, encoding='utf-8')
print(f'Successfully updated {count} image paths in AUTOMATER_PRODUCTS_PREVIEW.html!')
