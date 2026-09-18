import requests
import re
import json
from pathlib import Path
from PIL import Image
import io

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / 'public' / 'products'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-ZA,en-US;q=0.9,en;q=0.8'
}

batch_3_products = [
    {
        'gtin': '6001056000109',
        'title': 'Five Roses Ceylon Blend Tagged Teabags 102s',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGLlR8WlWsVyrxYsjB1z9THEW2iDlVKGg0rvbvG5Sq8MH0xgO_ScC3t6TKJ3ud9yIWzGIeT3CMt_g_zNQKo_HZIjaFA2F9syu-jOG0AA3b0iZsCxfu_LNB8CUBYiRX28nnapiF6At0gBl1RFGLJs3GFLyQgM1jqpZDsnrOBdm6ipYEyHQM7rXwZfKPIIJoADB0QsrKuTg=='
    },
    {
        'gtin': '6001087007788',
        'title': 'Colgate Triple Action Fluoride Toothpaste 100ml',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHUv_BM1pp5Gga57hHKbvZuzbKtccEiZ6allUMXP6IaeQOB1piRtM9z_Gan7QtlSaB2ym7MZEOVpPnj3WPu7g24pxsKK7_S1UighUXZg0FxWGbaZMSDDqj07-8hEPc1IaCf4Lfnp6PdFOPPeMSxHyiaYYvHIMG8d2_TAt1GtmKqsySdbpFoSW0hAnypGJIp6xbPyHALaQA1OpvTuRaY9Thw4Q=='
    },
    {
        'gtin': '6001007001407',
        'title': 'Bakers Choice Assorted Biscuits',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFmRC6SNF65Cr-iqSE0A6BhwME8pYFElhnwdzSFDTd40tY2S5oE8ykOymirfGTR-F5TS2nDr2M-_VrHW5CeP4XlU-J1IAW1wT1RSmTNn2h7LlVmWJDnS9ySPUrDjxaONwVK00oPs1CI-NEsbO0ade7nrS5f0-pBlU8t8lis6z0rN4SVzYIGFxkrB1xTqks='
    },
    {
        'gtin': '6001007000301',
        'title': "Fatti's & Moni's Macaroni Pasta 500g",
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGQINGITRJufROi_84VlSlkUDgw2F9NJLu1hwzHmsMes4mFGFIUpjgXsAUN9syFPKR7cGOk9th0f9aLek-7UHbbZo1CgiyU031zPzRjl3dPTCdIB2dTudyg70bxBKRt8aY5djaT933tLIE-xPy5I17t3TTcrzZ2ltb71SkZPiiWdqj9yq69-O-w'
    },
    {
        'gtin': '6001087005111',
        'title': 'Domestos Thick Bleach Original 750ml',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHBevAi7_bgTaXtrGvuyYALGcDbH6_7TfOwtmCUuQnD5_oaAvX1k6dJnOaX28a_40ODTN1QnAQ6S0BIFnnY8_SG81a-PUTX9RyygwHkMVnbH6NvpQBe94HUMZs1NcWHom8wH7kIufJX23wnCNraheN4YVUQeRtDFARwuJGTY62SyE7C-iqMEXF6Rd2Pb_Cp8B3ERwZXm_tXaG2APhwtdDO-9KwenWjlDHxisgfJX42onfUT5YUKSDeazkkkAnEkLaOF1-YNfcxF1Yk5lPGEmuMHizZ0aw=='
    },
    {
        'gtin': '6001087003346',
        'title': 'Handy Andy Multi-Purpose Cleaner Ammonia 750ml',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQENT7lQqCUIKMWeayIpewp8RARy0bk1-DWlCramhluzZkRODJ6UVYZHvqFh7cqwgAWSpygqNURC7xmdwdOXKxm1fSlNAUqZznOL5O63gG0Pr_KJsGjdhYSkWLaxai3q1Q0tfp7ZEuiVqAGBRkgVnF8WOjU0-_8Z7kEIjAQaP8QRMAgLpLt9KWBf1KyrF6aZe60sxPG0kqw='
    },
    {
        'gtin': '6001007006211',
        'title': 'Jungle Oats The Energy Champion 1kg Box',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEw52w-qlz4Xivt9wVyLtDQquHEzcvM7PZEOAQsK-x9ODQ7b3Yc2iUqDJylduzR4EKCSKNTPx-C8DVKz0EGmpGG_n7-Mswt8DhqlWvip7D8L_v6FBwbTbSzUJ47gRHB7oGEKP1VVvDiDevnjzH4pj9e1s6X'
    },
    {
        'gtin': '6001299001444',
        'title': 'Tropika Orange Flavoured Dairy Fruit Mix 2L',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFYfMvlrdR2OkQmm1il_F2IpEIINA9e7y5bhEAYksMr713z1CK3TA3Dj1lSzwciRsh2dl5XlfLyl1Y6jrii1PtxOtJQXYueGFVcGP-jqR2d0C_Ml5ExNgbJYro5cdNROd1cG9d7mulrNgklcdDsVQwiXj5JoGh6nB9wIW5rb2pYeKzlhyB0'
    },
    {
        'gtin': '6001007007553',
        'title': 'Crosse & Blackwell Tangy Mayonnaise 750g Bottle',
        'url': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWJWJprfhrGLNKzErNG7FwGvXs_b-WSSICEwQ-rRjLqqKkuA5KrBKMFUypWkDskGj0lpeghhswKgzr7sxUzcHjAmqLS8Wz2440Ftxl0Z5sU1hS5UNh8oOJsE4BYJOFPxUg8JXGs-mX1beLfIhyKghonthtmgw5CTI-jnWAJEnSNBL7uH8BS3iL1WDopmCL'
    }
]

for item in batch_3_products:
    gtin = item['gtin']
    title = item['title']
    url = item['url']
    print(f"Fetching real packshot for {gtin} ({title})...")
    try:
        r = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        img_match = re.search(r'property="og:image"\s*content="([^"]+)"', r.text)
        if not img_match:
            img_match = re.search(r'imageProductCardURL["\']?\s*:\s*["\']([^"\']+)["\']', r.text)
        if not img_match:
            img_match = re.search(r'https://catalog\.sixty60\.co\.za/v2/files/[a-zA-Z0-9_-]+', r.text)

        if img_match:
            raw_img_url = img_match.group(1) if hasattr(img_match, 'group') and img_match.groups() else img_match.group(0)
            clean_img_url = raw_img_url.replace('&amp;', '&')
            if 'width=' not in clean_img_url:
                clean_img_url += '?width=1200&height=1200'
            print(f"  -> Found CDN URL: {clean_img_url}")

            ir = requests.get(clean_img_url, headers=headers, timeout=15)
            if ir.status_code == 200 and len(ir.content) > 3000:
                img = Image.open(io.BytesIO(ir.content))
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                jpg_dest = OUTPUT_DIR / f"{gtin}.jpg"
                img.save(jpg_dest, 'JPEG', quality=95)
                print(f"  -> [OK] Successfully saved {jpg_dest.name} ({len(ir.content)} bytes)")
            else:
                print(f"  -> [FAIL] Image fetch returned {ir.status_code}, len={len(ir.content)}")
        else:
            print(f"  -> [FAIL] Could not locate product image in page HTML")
    except Exception as e:
        print(f"  -> [ERR] {e}")
