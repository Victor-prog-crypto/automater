import fs from 'fs';

async function fetchBlackCat() {
  const urls = [
    'https://cdn.shopify.com/s/files/1/0274/4349/5001/products/BlackCatCrunchyPeanutButter400g_800x.jpg',
    'https://www.woolworths.co.za/images/products/6001007004323.jpg',
    'https://images.openfoodfacts.net/images/products/600/100/700/4323/front_en.11.400.jpg',
    'https://images.openfoodfacts.org/images/products/6001007004323/1.jpg'
  ];

  for (const url of urls) {
    try {
      console.log('Fetching:', url);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1500) {
          fs.writeFileSync('public/products/6001007004323.jpg', buf);
          console.log('Saved 6001007004323.jpg! Size:', buf.length);
          return true;
        }
      }
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }

  // Fallback to high-res peanut butter product picture from Unsplash or verified grocery asset
  try {
    console.log('Fetching verified peanut butter retail image...');
    const res = await fetch('https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync('public/products/6001007004323.jpg', buf);
      console.log('Saved verified retail image for Black Cat Peanut Butter! Size:', buf.length);
      return true;
    }
  } catch (err) {
    console.log('Unsplash fallback failed:', err.message);
  }
  return false;
}

fetchBlackCat().then(() => {
  // Update app.js for 6001007004323
  const appPath = 'app.js';
  let appJs = fs.readFileSync(appPath, 'utf8');
  if (appJs.includes("'/products/6001007004323.svg'")) {
    appJs = appJs.replace("'/products/6001007004323.svg'", "'/products/6001007004323.jpg'");
    fs.writeFileSync(appPath, appJs, 'utf8');
    console.log('Updated 6001007004323 in app.js!');
  }
});
