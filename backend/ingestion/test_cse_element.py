import requests
import re
import json

cx = 'd300b7d0c83664c44'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

js_url = f'https://cse.google.com/cse.js?cx={cx}'
r = requests.get(js_url, headers=headers)
print('cse.js status:', r.status_code)

tok_match = re.search(r'cse_token["\']?\s*:\s*["\']([^"\']+)["\']', r.text)
cselibv_match = re.search(r'cselibVersion["\']?\s*:\s*["\']([^"\']+)["\']', r.text)

cse_token = tok_match.group(1) if tok_match else ''
cselibv = cselibv_match.group(1) if cselibv_match else ''

print('Extracted cse_token:', cse_token)
print('Extracted cselibVersion:', cselibv)

if cse_token:
    element_url = 'https://cse.google.com/cse/element/v1'
    params = {
        'rsz': 'filtered_cse',
        'num': '10',
        'hl': 'en',
        'source': 'gcsc',
        'gss': '.com',
        'cselibv': cselibv,
        'cx': cx,
        'q': 'Albany Superior White Bread',
        'cse_tok': cse_token,
        'sort': '',
        'exp': 'csqr,cc'
    }
    er = requests.get(element_url, params=params, headers=headers)
    print('Search response status:', er.status_code)
    # Parse json response
    match = re.search(r'google\.search\.cse\.api\d*\((.*)\);?', er.text, re.DOTALL)
    if match:
        data = json.loads(match.group(1))
        results = data.get('results', [])
        print(f'SUCCESS! Retrieved {len(results)} search results directly from Shoprite CSE ({cx})!')
        for i, res in enumerate(results[:5]):
            print(f"[{i+1}] {res.get('titleNoFormatting') or res.get('title')}")
            print(f"    Page: {res.get('url')}")
            img = res.get('image', {}).get('url') or res.get('thumbnailUrl')
            print(f"    Image: {img}")
    else:
        print('Response text preview:', er.text[:400])
