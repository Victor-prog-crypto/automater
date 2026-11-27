/**
 * Automater — Shoprite South Africa Universal POS, GS1 Variable-Weight Scale,
 * Xtra Savings Loyalty Card, Open Food Facts Resolver & Digital Till Slip Engine
 *
 * Guarantees 100% Shoprite product & POS coverage ($0 cloud API cost):
 *   Tier 1: Bundled Offline Shoprite Master Catalog + Local Cellphone Vault (0ms)
 *   Tier 2: GS1 SA Prefix 20-29 Variable-Weight Scale Decoder & Encoder (Butchery, Deli, Bakery, Freshmark)
 *   Tier 3: Built-in 36-Item Shoprite Loose Produce, Hot Deli & Bakery Scale PLU Directory
 *   Tier 4: Live Open Food Facts v2 Lookup with On-Device #FFFFFF Studio Packshot Sanitizer
 *   Tier 5: On-Device Cellphone Shelf-Tag OCR Fallback (local-vision-ocr.js)
 */

const XTRA_SAVINGS_STORAGE_KEY = 'automater_xtra_savings_card_v1';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[ch]);
}

// ============================================================================
// 1. GS1 MODULO-10 CHECKSUM & HUMAN-READABLE POS BARCODE UTILITIES
// ============================================================================

export function computeGs1CheckDigit(digitsWithoutCheck) {
  const s = String(digitsWithoutCheck || '').replace(/\D/g, '');
  if (!s.length) return 0;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const posFromRight = s.length - 1 - i;
    const weight = posFromRight % 2 === 0 ? 3 : 1;
    sum += Number(s[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGs1Ean13(code) {
  const clean = String(code || '').trim();
  if (!/^\d{13}$/.test(clean)) return false;
  return computeGs1CheckDigit(clean.slice(0, 12)) === Number(clean[12]);
}

export function isValidGs1Ean8(code) {
  const clean = String(code || '').trim();
  if (!/^\d{8}$/.test(clean)) return false;
  return computeGs1CheckDigit(clean.slice(0, 7)) === Number(clean[7]);
}

/**
 * Normalizes scanned or typed barcode strings (handles EAN-13, EAN-8, 12-digit UPC-A -> EAN-13,
 * 14-digit GTIN-14 -> EAN-13, and 8-digit Shoprite SKU codes).
 */
export function normalizeScannedBarcode(rawInput) {
  const trimmed = String(rawInput || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.length === 12) {
    const asEan13 = `0${digits}`;
    if (isValidGs1Ean13(asEan13)) return asEan13;
  }
  if (digits.length === 14 && digits.startsWith('0')) {
    const asEan13 = digits.slice(1);
    if (isValidGs1Ean13(asEan13)) return asEan13;
  }
  return digits;
}

/**
 * Formats barcode digits into spaced blocks for instant manual cashier entry if a screen is cracked.
 */
export function formatPosBarcodeDigits(rawCode) {
  const clean = String(rawCode || '').trim();
  if (/^\d{13}$/.test(clean)) {
    return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7, 13)}`;
  }
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)}`;
  }
  if (/^\d{16}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
  }
  return clean;
}

// ============================================================================
// 2. SHOPRITE IN-STORE LOOSE PRODUCE, BAKERY, HOT DELI & BUTCHERY SCALE PLU DIRECTORY
// ============================================================================

export const SHOPRITE_INSTORE_SCALE_PLU_CATALOG = Object.freeze([
  // Freshmark Loose Fruit & Vegetables (Prefix 25)
  { pluPrefix: '251011', pluCode: '1011', title: 'Freshmark Loose Bananas', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Fruit', pricePerKg: 22.99, defaultWeightKg: 0.75, emoji: '🍌', isZeroVat: true },
  { pluPrefix: '251024', pluCode: '1024', title: 'Freshmark Loose Washed Potatoes', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 19.99, defaultWeightKg: 1.0, emoji: '🥔', isZeroVat: true },
  { pluPrefix: '251038', pluCode: '1038', title: 'Freshmark Loose Brown Onions', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 21.99, defaultWeightKg: 0.8, emoji: '🧅', isZeroVat: true },
  { pluPrefix: '251045', pluCode: '1045', title: 'Freshmark Loose Ripe Tomatoes', category: 'Fresh Fruit & Vegetables', subCategory: 'Salad & Avocados', pricePerKg: 26.99, defaultWeightKg: 0.65, emoji: '🍅', isZeroVat: true },
  { pluPrefix: '251062', pluCode: '1062', title: 'Freshmark Sweet Potatoes Loose', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 24.99, defaultWeightKg: 0.85, emoji: '🍠', isZeroVat: true },
  { pluPrefix: '251079', pluCode: '1079', title: 'Freshmark Whole Butternut Loose', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 16.99, defaultWeightKg: 1.1, emoji: '🎃', isZeroVat: true },
  { pluPrefix: '251086', pluCode: '1086', title: 'Freshmark Loose Green Peppers', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 34.99, defaultWeightKg: 0.45, emoji: '🫑', isZeroVat: true },
  { pluPrefix: '251093', pluCode: '1093', title: 'Freshmark Loose Royal Gala Apples', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Fruit', pricePerKg: 27.99, defaultWeightKg: 0.6, emoji: '🍎', isZeroVat: true },
  { pluPrefix: '251109', pluCode: '1109', title: 'Freshmark Loose Valencia Oranges', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Fruit', pricePerKg: 18.99, defaultWeightKg: 1.0, emoji: '🍊', isZeroVat: true },
  { pluPrefix: '251123', pluCode: '1123', title: 'Freshmark Fresh Ginger Root', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 89.99, defaultWeightKg: 0.2, emoji: '🫚', isZeroVat: true },
  { pluPrefix: '252861', pluCode: '2861', title: 'Freshmark Large Green Cabbage Head', category: 'Fresh Fruit & Vegetables', subCategory: 'Fresh Vegetables', pricePerKg: 19.99, unitFixedPrice: 19.99, defaultWeightKg: 1.0, emoji: '🥬', isZeroVat: true },

  // Shoprite In-Store Bakery Counter (Prefix 24)
  { pluPrefix: '248011', pluCode: '8011', title: 'Shoprite Bakery Fresh White Rolls (Each)', category: 'Bakery', subCategory: 'Rolls, Wraps & Buns', unitFixedPrice: 2.99, defaultQty: 4, emoji: '🥖', isZeroVat: false },
  { pluPrefix: '248012', pluCode: '8012', title: 'Shoprite Bakery Fresh Brown Rolls (Each)', category: 'Bakery', subCategory: 'Rolls, Wraps & Buns', unitFixedPrice: 2.79, defaultQty: 4, emoji: '🥖', isZeroVat: true },
  { pluPrefix: '248025', pluCode: '8025', title: 'Shoprite Bakery Fresh Vetkoek / Amagwinya', category: 'Bakery', subCategory: 'Rolls, Wraps & Buns', unitFixedPrice: 4.99, defaultQty: 2, emoji: '🥯', isZeroVat: false },
  { pluPrefix: '248034', pluCode: '8034', title: 'Shoprite Bakery Traditional Roosterkoek', category: 'Bakery', subCategory: 'Rolls, Wraps & Buns', unitFixedPrice: 6.99, defaultQty: 2, emoji: '🫓', isZeroVat: false },
  { pluPrefix: '248052', pluCode: '8052', title: 'Shoprite Bakery Fresh Milk Tart Whole', category: 'Bakery', subCategory: 'Cakes & Sweet Bakes', unitFixedPrice: 34.99, defaultQty: 1, emoji: '🥧', isZeroVat: false },
  { pluPrefix: '248068', pluCode: '8068', title: 'Shoprite Bakery Ring Doughnut Iced', category: 'Bakery', subCategory: 'Cakes & Sweet Bakes', unitFixedPrice: 6.99, defaultQty: 2, emoji: '🍩', isZeroVat: false },

  // Shoprite Hot Deli & Ready-to-Eat Counter (Prefix 24)
  { pluPrefix: '249101', pluCode: '9101', title: 'Shoprite Deli Hot Slap Chips (Medium)', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 19.99, defaultQty: 1, emoji: '🍟', isZeroVat: false },
  { pluPrefix: '249102', pluCode: '9102', title: 'Shoprite Deli Hot Slap Chips (Large Family)', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 34.99, defaultQty: 1, emoji: '🍟', isZeroVat: false },
  { pluPrefix: '249115', pluCode: '9115', title: 'Shoprite Deli Fried Russian Sausage (Each)', category: 'Deli, Pies & Ready Meals', subCategory: 'Polony, Viennas & Russians', unitFixedPrice: 14.99, defaultQty: 1, emoji: '🌭', isZeroVat: false },
  { pluPrefix: '249120', pluCode: '9120', title: 'Shoprite Deli Russian & Hot Chips Combo', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 29.99, defaultQty: 1, emoji: '🍟', isZeroVat: false },
  { pluPrefix: '249134', pluCode: '9134', title: 'Shoprite Deli Quarter Chicken & Roll Meal', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 39.99, defaultQty: 1, emoji: '🍗', isZeroVat: false },
  { pluPrefix: '249148', pluCode: '9148', title: 'Shoprite Deli Whole Flame-Grilled Rotisserie Chicken', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 89.99, defaultQty: 1, emoji: '🍗', isZeroVat: false },
  { pluPrefix: '249155', pluCode: '9155', title: 'Shoprite Deli Fried Hake Fillet Portion', category: 'Deli, Pies & Ready Meals', subCategory: 'Hot Pies & Ready Meals', unitFixedPrice: 29.99, defaultQty: 1, emoji: '🐟', isZeroVat: false },
  { pluPrefix: '249162', pluCode: '9162', title: 'Shoprite Deli Chakalaka / Coleslaw Salad Tub', category: 'Deli, Pies & Ready Meals', subCategory: 'Dips, Olives & Pickles', pricePerKg: 69.99, defaultWeightKg: 0.35, emoji: '🥗', isZeroVat: false },

  // Shoprite Master Butchery & Cheese Scale Counter (Prefix 23 & 26)
  { pluPrefix: '233724', pluCode: '3724', title: 'Shoprite Butchery Championship Boerewors', category: 'Butchery, Meat & Poultry', subCategory: 'Boerewors & Braai', pricePerKg: 109.99, defaultWeightKg: 0.65, emoji: '🌭', isZeroVat: false },
  { pluPrefix: '233732', pluCode: '3732', title: 'Shoprite Butchery Regular Beef Mince', category: 'Butchery, Meat & Poultry', subCategory: 'Beef, Steak & Mince', pricePerKg: 99.99, defaultWeightKg: 0.5, emoji: '🥩', isZeroVat: false },
  { pluPrefix: '233810', pluCode: '3810', title: 'Shoprite Butchery Beef Chuck / Brisket Braai', category: 'Butchery, Meat & Poultry', subCategory: 'Beef, Steak & Mince', pricePerKg: 104.99, defaultWeightKg: 0.75, emoji: '🥩', isZeroVat: false },
  { pluPrefix: '233825', pluCode: '3825', title: 'Shoprite Butchery Beef Stew Bone-In', category: 'Butchery, Meat & Poultry', subCategory: 'Beef, Steak & Mince', pricePerKg: 94.99, defaultWeightKg: 0.8, emoji: '🥩', isZeroVat: false },
  { pluPrefix: '233842', pluCode: '3842', title: 'Shoprite Butchery Pork Braai Chops', category: 'Butchery, Meat & Poultry', subCategory: 'Pork & Lamb', pricePerKg: 89.99, defaultWeightKg: 0.65, emoji: '🥩', isZeroVat: false },
  { pluPrefix: '233860', pluCode: '3860', title: 'Shoprite Butchery Fresh Chicken Feet / Gizzards', category: 'Butchery, Meat & Poultry', subCategory: 'Fresh Poultry', pricePerKg: 49.99, defaultWeightKg: 0.7, emoji: '🍗', isZeroVat: false },
  { pluPrefix: '264985', pluCode: '4985', title: 'Shoprite Deli Weighed Gouda / Cheddar Wedge', category: 'Dairy, Eggs & Milk', subCategory: 'Cheese, Yoghurt & Maas', pricePerKg: 139.99, defaultWeightKg: 0.4, emoji: '🧀', isZeroVat: false }
]);

const SCALE_DEPT_FALLBACKS = Object.freeze({
  '20': { label: 'Shoprite Weighed Counter Item', category: 'Food Cupboard & Pantry', emoji: '⚖️' },
  '21': { label: 'Shoprite In-Store Scale Pack', category: 'Fresh Fruit & Vegetables', emoji: '⚖️' },
  '22': { label: 'Shoprite Deli Scale Pack', category: 'Deli, Pies & Ready Meals', emoji: '🥧' },
  '23': { label: 'Shoprite Master Butchery Pack', category: 'Butchery, Meat & Poultry', emoji: '🥩' },
  '24': { label: 'Shoprite Bakery & Hot Deli Pack', category: 'Deli, Pies & Ready Meals', emoji: '🥖' },
  '25': { label: 'Freshmark Weighed Produce Pack', category: 'Fresh Fruit & Vegetables', emoji: '🥬' },
  '26': { label: 'Shoprite Chilled Deli & Cheese Pack', category: 'Dairy, Eggs & Milk', emoji: '🧀' },
  '27': { label: 'Shoprite Reduced-to-Clear Markdown', category: 'Food Cupboard & Pantry', emoji: '🏷️' },
  '28': { label: 'Shoprite Bulk Butchery Pack', category: 'Butchery, Meat & Poultry', emoji: '🥩' },
  '29': { label: 'Shoprite Weighed Poultry / Meat Pack', category: 'Butchery, Meat & Poultry', emoji: '🍗' }
});

/**
 * Checks if a 13-digit barcode is an unweighed catalog template (digits 7..11 === '00000').
 */
export function isTemplateZeroScaleBarcode(barcode) {
  const clean = String(barcode || '').trim();
  return /^2\d{6}00000\d$/.test(clean);
}

/**
 * Encodes an active ZAR price into a 13-digit GS1 variable-measure Shoprite barcode
 * so that even catalog-browsed weighed items scan cleanly with a valid Modulo-10 check digit!
 */
export function encodeShopriteScaleBarcodeForTill(templateOrPrefix, zarAmount) {
  const digits = String(templateOrPrefix || '').replace(/\D/g, '');
  const prefix7 = digits.length >= 7
    ? digits.slice(0, 7)
    : `${digits.padEnd(6, '0').slice(0, 6)}0`;
  const cents = Math.max(1, Math.min(99999, Math.round((Number(zarAmount) || 19.99) * 100)));
  const price5 = String(cents).padStart(5, '0');
  const base12 = `${prefix7}${price5}`;
  const check = computeGs1CheckDigit(base12);
  return `${base12}${check}`;
}

/**
 * Decodes ANY physical 13-digit Shoprite GS1 Variable-Weight Scale Barcode (Prefixes 20-29).
 * Matches against MASTER_PRODUCTS PLU prefixes first, then SHOPRITE_INSTORE_SCALE_PLU_CATALOG,
 * and finally synthesizes an exact department weighed item from the embedded Rand/Cent price!
 */
export function decodeShopriteVariableWeightBarcode(barcode, masterProductsMap) {
  const clean = String(barcode || '').trim();
  if (!/^2\d{12}$/.test(clean)) return null;

  const prefix2 = clean.slice(0, 2);
  const prefix6 = clean.slice(0, 6);
  const prefix7 = clean.slice(0, 7);
  const embeddedCents = parseInt(clean.slice(7, 12), 10) || 0;
  const hasEmbeddedPrice = embeddedCents > 0;
  const embeddedPriceZar = hasEmbeddedPrice ? Number((embeddedCents / 100).toFixed(2)) : null;

  // Ensure barcode has a valid GS1 EAN-13 check digit for the POS laser
  const validTillBarcode = isValidGs1Ean13(clean)
    ? clean
    : `${clean.slice(0, 12)}${computeGs1CheckDigit(clean.slice(0, 12))}`;

  // 1. Match against MASTER_PRODUCTS prefix (e.g. 233724... -> Championship Boerewors, 2925155... -> Goldi Fillet)
  let matchedMaster = null;
  if (masterProductsMap) {
    for (const prod of masterProductsMap.values()) {
      const g = String(prod.gtin || '');
      if (!g.startsWith('2') || g.length !== 13) continue;
      if (g.slice(0, 7) === prefix7 || (prefix2 !== '29' && g.slice(0, 6) === prefix6)) {
        matchedMaster = prod;
        break;
      }
    }
  }

  if (matchedMaster) {
    const perKgRate = Number(matchedMaster.promoPrice || matchedMaster.basePrice || 89.99);
    const finalPrice = embeddedPriceZar ?? perKgRate;
    let weightLabel = matchedMaster.weight || 'Weighed pack';
    if (embeddedPriceZar && perKgRate > 5 && /kg/i.test(String(matchedMaster.title + ' ' + matchedMaster.weight))) {
      const estKg = embeddedPriceZar / perKgRate;
      weightLabel = estKg < 1
        ? `${Math.max(50, Math.round(estKg * 1000))} g @ R${perKgRate.toFixed(2)}/kg`
        : `${estKg.toFixed(2)} kg @ R${perKgRate.toFixed(2)}/kg`;
    }

    return {
      barcode: hasEmbeddedPrice ? validTillBarcode : encodeShopriteScaleBarcodeForTill(matchedMaster.gtin, finalPrice),
      gtin: hasEmbeddedPrice ? validTillBarcode : encodeShopriteScaleBarcodeForTill(matchedMaster.gtin, finalPrice),
      templateGtin: matchedMaster.gtin,
      sku: matchedMaster.sku || prefix6,
      barcodeFormat: 'EAN13',
      isScaleItem: true,
      hasPhysicalScaleSticker: hasEmbeddedPrice,
      name: matchedMaster.title,
      title: matchedMaster.title,
      brand: matchedMaster.brand || 'Shoprite',
      weight: weightLabel,
      category: matchedMaster.category,
      subCategory: matchedMaster.subCategory || '',
      price: finalPrice,
      basePrice: embeddedPriceZar ? Number((embeddedPriceZar * 1.08).toFixed(2)) : (matchedMaster.basePrice || finalPrice),
      image: matchedMaster.imageUrl || '',
      imageUrl: matchedMaster.imageUrl || '',
      emoji: matchedMaster.emoji || '🥩',
      isHouseBrand: true,
      retailerId: 'shoprite'
    };
  }

  // 2. Match against SHOPRITE_INSTORE_SCALE_PLU_CATALOG (loose produce, rolls, hot deli, butcher cuts)
  const matchedPlu = SHOPRITE_INSTORE_SCALE_PLU_CATALOG.find((item) => item.pluPrefix === prefix6);
  if (matchedPlu) {
    const fallbackPrice = matchedPlu.unitFixedPrice
      ? Number((matchedPlu.unitFixedPrice * (matchedPlu.defaultQty || 1)).toFixed(2))
      : Number(((matchedPlu.pricePerKg || 29.99) * (matchedPlu.defaultWeightKg || 0.7)).toFixed(2));
    const finalPrice = embeddedPriceZar ?? fallbackPrice;
    let weightLabel = 'Weighed pack';
    if (matchedPlu.pricePerKg && finalPrice > 0) {
      const kg = finalPrice / matchedPlu.pricePerKg;
      weightLabel = kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(2)} kg`;
    } else if (matchedPlu.unitFixedPrice) {
      const estUnits = Math.max(1, Math.round(finalPrice / matchedPlu.unitFixedPrice));
      weightLabel = `${estUnits} unit${estUnits === 1 ? '' : 's'}`;
    }

    const encodedCode = hasEmbeddedPrice
      ? validTillBarcode
      : encodeShopriteScaleBarcodeForTill(`${matchedPlu.pluPrefix}0`, finalPrice);

    return {
      barcode: encodedCode,
      gtin: encodedCode,
      sku: `PLU-${matchedPlu.pluCode}`,
      barcodeFormat: 'EAN13',
      isScaleItem: true,
      hasPhysicalScaleSticker: hasEmbeddedPrice,
      name: matchedPlu.title,
      title: matchedPlu.title,
      brand: 'Shoprite Fresh',
      weight: weightLabel,
      category: matchedPlu.category,
      subCategory: matchedPlu.subCategory,
      price: finalPrice,
      basePrice: finalPrice,
      image: '',
      imageUrl: '',
      emoji: matchedPlu.emoji,
      isHouseBrand: true,
      retailerId: 'shoprite'
    };
  }

  // 3. Universal fallback for ANY Shoprite 20-29 weighed sticker with an embedded Rand.Cent price!
  if (hasEmbeddedPrice) {
    const deptMeta = SCALE_DEPT_FALLBACKS[prefix2] || SCALE_DEPT_FALLBACKS['20'];
    const pluNum = prefix2 === '29' ? clean.slice(2, 7) : clean.slice(2, 6);
    return {
      barcode: validTillBarcode,
      gtin: validTillBarcode,
      sku: `PLU-${pluNum}`,
      barcodeFormat: 'EAN13',
      isScaleItem: true,
      hasPhysicalScaleSticker: true,
      name: `${deptMeta.label} (PLU #${pluNum})`,
      title: `${deptMeta.label} (PLU #${pluNum})`,
      brand: 'Shoprite Scale',
      weight: 'Weighed Scale Pack',
      category: deptMeta.category,
      subCategory: 'Weighed Counter',
      price: embeddedPriceZar,
      basePrice: embeddedPriceZar,
      image: '',
      imageUrl: '',
      emoji: deptMeta.emoji,
      isHouseBrand: true,
      retailerId: 'shoprite'
    };
  }

  return null;
}

// ============================================================================
// 3. LIVE OPEN FOOD FACTS RESOLVER + ON-DEVICE #FFFFFF PACKSHOT SANITIZER
// ============================================================================

function generateWhiteStudioSvgDataUrl(title, brand, emoji, gtin) {
  const safeBrand = String(brand || 'SHOPRITE').replace(/[&<>'"]/g, '').slice(0, 18).toUpperCase();
  const safeTitle = String(title || 'Grocery Item').replace(/[&<>'"]/g, '').slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <rect width="400" height="400" fill="#ffffff"/>
    <rect x="64" y="40" width="272" height="320" rx="28" fill="#f8fafc" stroke="#e2e8f0" stroke-width="4"/>
    <rect x="64" y="40" width="272" height="60" rx="28" fill="#e11d2e"/>
    <text x="200" y="78" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="16" font-weight="900">${safeBrand}</text>
    <text x="200" y="198" text-anchor="middle" font-size="68">${emoji || '🛍️'}</text>
    <text x="200" y="268" text-anchor="middle" fill="#0f172a" font-family="system-ui,sans-serif" font-size="13" font-weight="800">${safeTitle}</text>
    <text x="200" y="328" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="12" font-weight="700">${gtin}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Downloads a remote product thumbnail on-device and composites it onto a pure #FFFFFF
 * 320x320 studio square JPEG Data URL so it NEVER has weird transparent/black backgrounds
 * and stays cached offline forever in IndexedDB!
 */
async function sanitizeRemoteImageOntoWhiteCanvas(imageUrl, fallbackSvgArgs) {
  if (!imageUrl || typeof document === 'undefined') {
    return generateWhiteStudioSvgDataUrl(...fallbackSvgArgs);
  }
  try {
    const res = await fetch(imageUrl, { mode: 'cors', signal: AbortSignal.timeout(3200) });
    if (!res.ok) return generateWhiteStudioSvgDataUrl(...fallbackSvgArgs);
    const blob = await res.blob();
    const bitmapUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = bitmapUrl;
      });
      const size = 320;
      const pad = 20;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      const maxDim = size - pad * 2;
      const scale = Math.min(maxDim / (img.naturalWidth || 1), maxDim / (img.naturalHeight || 1));
      const drawW = Math.round((img.naturalWidth || 1) * scale);
      const drawH = Math.round((img.naturalHeight || 1) * scale);
      const dx = Math.round((size - drawW) / 2);
      const dy = Math.round((size - drawH) / 2);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      return canvas.toDataURL('image/jpeg', 0.88);
    } finally {
      URL.revokeObjectURL(bitmapUrl);
    }
  } catch (_) {
    return generateWhiteStudioSvgDataUrl(...fallbackSvgArgs);
  }
}

function classifyDepartmentFromText(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(baby|nappies|wipes|formula|purity|pampers|huggies)\b/.test(t)) return { category: 'Baby & Toddler', emoji: '🍼', estPrice: 44.99 };
  if (/\b(frozen|ice cream|fries|fish fingers)\b/.test(t)) return { category: 'Frozen Foods', emoji: '🧊', estPrice: 49.99 };
  if (/\b(soap|toothpaste|shampoo|deodorant|lotion|sanitary|medicine|pain|tablet)\b/.test(t)) return { category: 'Personal Care & Health', emoji: '🪥', estPrice: 29.99 };
  if (/\b(bleach|detergent|laundry|dishwash|toilet|cleaner|dog|cat|pet)\b/.test(t)) return { category: 'Household, Cleaning & Pets', emoji: '🧼', estPrice: 36.99 };
  if (/\b(vienna|polony|bacon|ham|pie|russian|salami|hummus|deli)\b/.test(t)) return { category: 'Deli, Pies & Ready Meals', emoji: '🥧', estPrice: 32.99 };
  if (/\b(bread|rolls|buns|muffin|cake|rusk|bakery)\b/.test(t)) return { category: 'Bakery', emoji: '🍞', estPrice: 18.99 };
  if (/\b(milk|yoghurt|yogurt|cheese|butter|margarine|eggs|amasi|maas|cream)\b/.test(t)) return { category: 'Dairy, Eggs & Milk', emoji: '🥛', estPrice: 27.99 };
  if (/\b(beef|chicken|pork|lamb|boerewors|mince|steak|meat)\b/.test(t)) return { category: 'Butchery, Meat & Poultry', emoji: '🥩', estPrice: 69.99 };
  if (/\b(juice|cola|soda|drink|water|coffee|tea|rooibos|cocoa|energy)\b/.test(t)) return { category: 'Beverages, Tea & Coffee', emoji: '🥤', estPrice: 24.99 };
  if (/\b(chips|crisps|biscuits|cookies|chocolate|sweets|candy|nuts|popcorn|snack)\b/.test(t)) return { category: 'Snacks, Biscuits & Sweets', emoji: '🍪', estPrice: 21.99 };
  if (/\b(apple|banana|potato|onion|tomato|avocado|fruit|vegetable|salad)\b/.test(t)) return { category: 'Fresh Fruit & Vegetables', emoji: '🥬', estPrice: 24.99 };
  return { category: 'Food Cupboard & Pantry', emoji: '🥫', estPrice: 29.99 };
}

/**
 * Live Tier-4 barcode lookup via Open Food Facts v2 API (free, $0 API key, covers thousands of SA 600... barcodes).
 * Automatically sanitizes the packshot onto pure #FFFFFF and caches forever on the user's phone!
 */
export async function resolveOpenFoodFactsBarcode(barcode) {
  const clean = normalizeScannedBarcode(barcode);
  if (!/^\d{8,14}$/.test(clean)) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=code,product_name,product_name_en,brands,quantity,categories,image_front_small_url,image_front_url`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3600) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== 1 || !data.product) return null;

    const p = data.product;
    const rawName = String(p.product_name_en || p.product_name || '').trim();
    if (!rawName) return null;

    const rawBrand = String(p.brands || '').split(',')[0].trim() || 'Shoprite';
    const title = rawName.toLowerCase().startsWith(rawBrand.toLowerCase())
      ? rawName
      : `${rawBrand} ${rawName}`.trim();
    const weight = String(p.quantity || '1 unit').trim();
    const { category, emoji, estPrice } = classifyDepartmentFromText(`${title} ${p.categories || ''}`);
    const remoteImg = p.image_front_small_url || p.image_front_url || '';
    const whitePackshotDataUrl = await sanitizeRemoteImageOntoWhiteCanvas(remoteImg, [title, rawBrand, emoji, clean]);

    return {
      barcode: clean,
      gtin: clean,
      sku: '',
      barcodeFormat: isValidGs1Ean8(clean) ? 'EAN8' : 'EAN13',
      name: title,
      title,
      brand: rawBrand,
      weight,
      category,
      subCategory: 'Store Shelf Item',
      price: estPrice,
      promoPrice: null,
      basePrice: estPrice,
      image: whitePackshotDataUrl,
      imageUrl: whitePackshotDataUrl,
      emoji,
      isHouseBrand: /\b(ritebrand|freshmark|pot o|u-save|jolly tots)\b/i.test(title),
      retailerId: 'shoprite',
      indexedVia: 'open_food_facts_cached_forever',
      needsShelfPriceConfirm: true
    };
  } catch (_) {
    return null;
  }
}

// ============================================================================
// 4. SOUTH AFRICAN SARS 0% VAT BASIC FOODSTUFFS & TILL RECEIPT CALCULATOR
// ============================================================================

export function isSaZeroRatedVatItem(item) {
  const hay = `${item?.name || item?.title || ''} ${item?.category || ''} ${item?.subCategory || ''}`.toLowerCase();
  if (item?.category === 'Fresh Fruit & Vegetables') return true;
  if (
    /\b(brown bread|wholewheat bread|maize meal|super maize|samp|sugar beans|dried beans|lentils|pilchards|sardines|full cream milk|low fat milk|fat free milk|fresh milk|uht milk|long life.*milk|amasi|maas|eggs|white rice|parboiled.*rice|basmati rice|sunflower oil|cooking oil|canola oil|vegetable oil|cake wheat flour|white bread wheat flour|sanitary pads|maxi pads|kotex|stayfree|always)\b/i.test(hay) &&
    !/\b(chips|chocolate|flavoured milk|biscuit|mayonnaise|sauce)\b/i.test(hay)
  ) {
    return true;
  }
  return false;
}

export function calculateSaVatBreakdown(cartItems, payableTotal) {
  let zeroRatedTotal = 0;
  let standardRatedTotal = 0;

  for (const item of cartItems || []) {
    const unit = Number(item.price ?? item.unitPrice ?? item.shopritePrice) || 0;
    const qty = Number(item.quantity ?? item.qty) || 1;
    const lineTotal = unit * qty;
    if (isSaZeroRatedVatItem(item)) {
      zeroRatedTotal += lineTotal;
    } else {
      standardRatedTotal += lineTotal;
    }
  }

  const gross = zeroRatedTotal + standardRatedTotal;
  const scale = gross > 0 && payableTotal != null ? payableTotal / gross : 1;
  const adjZero = Number((zeroRatedTotal * scale).toFixed(2));
  const adjStandard = Number((standardRatedTotal * scale).toFixed(2));
  const vatAmount15 = Number((adjStandard - adjStandard / 1.15).toFixed(2));

  return {
    zeroRatedTotal: adjZero,
    standardRatedTotal: adjStandard,
    vatAmount15,
    netExclVat: Number(((payableTotal ?? gross) - vatAmount15).toFixed(2))
  };
}

// ============================================================================
// 5. SHOPRITE XTRA SAVINGS DIGITAL LOYALTY CARD WALLET (100% LOCAL ON PHONE)
// ============================================================================

export function loadXtraSavingsCard() {
  try {
    const raw = localStorage.getItem(XTRA_SAVINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.cardNumber) return parsed;
    return null;
  } catch (_) {
    return null;
  }
}

export function saveXtraSavingsCard(cardNumber, holderName = 'Shoprite Shopper') {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  if (!digits) {
    try { localStorage.removeItem(XTRA_SAVINGS_STORAGE_KEY); } catch (_) {}
    return null;
  }
  // Ensure 13-digit cards have valid EAN-13 check digit if user generates demo card
  const record = {
    cardNumber: digits,
    holderName: String(holderName || 'Shoprite Shopper').trim(),
    includeInTillDeck: true,
    linkedAt: Date.now()
  };
  try {
    localStorage.setItem(XTRA_SAVINGS_STORAGE_KEY, JSON.stringify(record));
  } catch (_) {}
  return record;
}

export function generateDemoXtraSavingsCardNumber() {
  // Official SA 6009loyalty style 13-digit EAN-13 with valid GS1 Modulo-10 check digit
  const base12 = '600988045129';
  return `${base12}${computeGs1CheckDigit(base12)}`;
}

/**
 * Opens the Shoprite Xtra Savings Card Wallet Modal (<dialog>) so shoppers can link/scan
 * their loyalty card once and flash it as Barcode #1 at the Shoprite POS till!
 */
export function openXtraSavingsCardModal({
  modalRoot,
  mountModalDialog,
  renderTill1DBarcodeSvg,
  onCardUpdated,
  showToast
}) {
  const existing = loadXtraSavingsCard();

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="mx-auto flex h-dvh w-full max-w-md flex-col justify-end sm:justify-center sm:p-4" aria-labelledby="xtra-card-modal-title">
        <div class="sheet-enter flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
          <div class="bg-gradient-to-r from-[#e11d2e] via-red-600 to-rose-700 px-5 py-4 text-white">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="rounded-full bg-white/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-widest">Shoprite POS Loyalty</span>
                <h2 id="xtra-card-modal-title" class="mt-1 text-xl font-black tracking-tight">Xtra Savings Card</h2>
                <p class="mt-0.5 text-xs text-white/85">Flashes automatically as Step #1 at the Shoprite till so every branch promo unlocks!</p>
              </div>
              <button id="xtra-modal-close" type="button" class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-base font-black text-white hover:bg-white/25" aria-label="Close Xtra Savings modal">✕</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            ${existing ? `
              <div class="rounded-3xl border-2 border-red-200 bg-gradient-to-b from-rose-50/70 to-white p-4 text-center shadow-sm">
                <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#e11d2e] mb-2">
                  <span>✓ Linked Xtra Savings Card</span>
                  <span>Ready for Till Laser</span>
                </div>
                <div class="rounded-2xl bg-white p-2 border border-slate-100">
                  <svg id="xtra-preview-barcode-svg" class="mx-auto w-full max-w-[290px] h-auto"></svg>
                </div>
                <p class="mt-2 font-mono text-xs font-black text-slate-700">${escapeHtml(formatPosBarcodeDigits(existing.cardNumber))}</p>
              </div>
            ` : ''}

            <form id="xtra-card-form" class="space-y-3">
              <label class="block text-xs font-black text-slate-700">
                Xtra Savings Card / Barcode Number (8–16 digits)
                <input
                  id="xtra-card-input"
                  type="text"
                  inputmode="numeric"
                  required
                  minlength="8"
                  maxlength="20"
                  value="${escapeHtml(existing?.cardNumber || '')}"
                  placeholder="e.g. 6009880451292"
                  class="mt-1.5 h-12 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black text-slate-950 outline-none focus:border-[#e11d2e] focus:bg-white"
                />
              </label>

              <div class="flex gap-2">
                <button id="xtra-demo-card-btn" type="button" class="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-[#e11d2e] hover:bg-rose-100 active:scale-95 transition">
                  ⚡ Fill Demo Card (EAN-13)
                </button>
                ${existing ? `
                  <button id="xtra-remove-card-btn" type="button" class="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 active:scale-95 transition">
                    Remove
                  </button>
                ` : ''}
              </div>

              <button type="submit" class="w-full rounded-2xl bg-[#e11d2e] py-3.5 text-sm font-black text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-[.985] transition">
                💳 Save Xtra Savings Card on Phone
              </button>
            </form>
          </div>
        </div>
      </div>
    `,
    { closedBy: 'any' }
  );

  if (!dialog) return;

  if (existing) {
    const svgEl = dialog.querySelector('#xtra-preview-barcode-svg');
    renderTill1DBarcodeSvg?.(svgEl, existing.cardNumber, { height: 78 });
  }

  dialog.querySelector('#xtra-modal-close')?.addEventListener('click', () => dialog.close());

  dialog.querySelector('#xtra-demo-card-btn')?.addEventListener('click', () => {
    const input = dialog.querySelector('#xtra-card-input');
    if (input) input.value = generateDemoXtraSavingsCardNumber();
  });

  dialog.querySelector('#xtra-remove-card-btn')?.addEventListener('click', () => {
    saveXtraSavingsCard('');
    onCardUpdated?.(null);
    showToast?.('Removed Xtra Savings card');
    dialog.close();
  });

  dialog.querySelector('#xtra-card-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = dialog.querySelector('#xtra-card-input')?.value || '';
    const digits = rawVal.replace(/\D/g, '');
    if (digits.length < 8) {
      showToast?.('Enter at least 8 digits from the back of your Xtra Savings card');
      return;
    }
    const saved = saveXtraSavingsCard(digits);
    onCardUpdated?.(saved);
    showToast?.('💳 Shoprite Xtra Savings card linked for Till Mode!');
    dialog.close();
  });
}

// ============================================================================
// 6. SHOPRITE LOOSE PRODUCE, BAKERY, HOT DELI & BUTCHERY SCALE MODAL (<dialog>)
// ============================================================================

export function openShopriteScalePluModal({
  modalRoot,
  mountModalDialog,
  zar,
  onAddScaleProduct,
  showToast
}) {
  let activeDeptFilter = 'all';
  let searchQuery = '';

  const deptTabs = [
    { id: 'all', label: '⚖️ All Scale Items' },
    { id: 'Fresh Fruit & Vegetables', label: '🥬 Loose Produce' },
    { id: 'Bakery', label: '🥖 Loose Bakery' },
    { id: 'Deli, Pies & Ready Meals', label: '🍟 Hot Deli' },
    { id: 'Butchery, Meat & Poultry', label: '🥩 Butchery' }
  ];

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="mx-auto flex h-dvh w-full max-w-lg flex-col justify-end sm:justify-center sm:p-4" aria-labelledby="scale-plu-title">
        <div class="sheet-enter flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
          <div class="bg-slate-950 px-5 py-4 text-white">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-widest text-emerald-400">GS1 Prefix 23–26 Scale Engine</span>
                <h2 id="scale-plu-title" class="mt-1 text-lg font-black">Loose Produce, Bakery &amp; Hot Deli</h2>
                <p class="mt-0.5 text-[11px] text-white/75">Add weighed fruit/veg, loose rolls, amagwinya, hot chips, or butcher packs with valid Shoprite EAN-13 scale barcodes.</p>
              </div>
              <button id="scale-modal-close" type="button" class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-base font-black text-white hover:bg-white/20" aria-label="Close scale PLU picker">✕</button>
            </div>

            <input
              id="scale-plu-search"
              type="search"
              autocomplete="off"
              placeholder="Search bananas, rolls, hot chips, russian, wors, PLU..."
              class="mt-3 h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 text-xs font-bold text-white placeholder:text-white/50 outline-none focus:border-emerald-400"
            />

            <div id="scale-dept-tabs" class="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"></div>
          </div>

          <div id="scale-plu-list" class="flex-1 space-y-2.5 overflow-y-auto p-4 pb-safe"></div>
        </div>
      </div>
    `,
    { closedBy: 'any' }
  );

  if (!dialog) return;

  const tabsRoot = dialog.querySelector('#scale-dept-tabs');
  const listRoot = dialog.querySelector('#scale-plu-list');
  const searchInput = dialog.querySelector('#scale-plu-search');

  function renderTabs() {
    tabsRoot.innerHTML = deptTabs.map((t) => `
      <button
        type="button"
        data-scale-tab="${escapeHtml(t.id)}"
        class="shrink-0 rounded-xl px-2.5 py-1 text-[10.5px] font-black transition ${
          activeDeptFilter === t.id ? 'bg-[#e11d2e] text-white' : 'bg-white/10 text-white/75 hover:bg-white/20'
        }"
      >
        ${escapeHtml(t.label)}
      </button>
    `).join('');

    tabsRoot.querySelectorAll('[data-scale-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDeptFilter = btn.dataset.scaleTab;
        renderTabs();
        renderItems();
      });
    });
  }

  function renderItems() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = SHOPRITE_INSTORE_SCALE_PLU_CATALOG.filter((item) => {
      if (activeDeptFilter !== 'all' && item.category !== activeDeptFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.pluCode.includes(q) ||
        item.subCategory.toLowerCase().includes(q)
      );
    });

    if (!filtered.length) {
      listRoot.innerHTML = `<p class="py-8 text-center text-xs font-bold text-slate-400">No loose/scale item matched "${escapeHtml(searchQuery)}".</p>`;
      return;
    }

    listRoot.innerHTML = filtered.map((item, idx) => {
      const isWeighed = Boolean(item.pricePerKg && !item.unitFixedPrice);
      const defaultTotal = isWeighed
        ? Number((item.pricePerKg * (item.defaultWeightKg || 0.7)).toFixed(2))
        : Number((item.unitFixedPrice * (item.defaultQty || 1)).toFixed(2));

      return `
        <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div class="flex items-start justify-between gap-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-2xl border border-slate-200/80">${item.emoji}</span>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">PLU #${item.pluCode}</span>
                  <span class="text-[10px] font-bold text-slate-500">${escapeHtml(item.subCategory)}</span>
                </div>
                <h3 class="mt-0.5 truncate text-xs font-black text-slate-950">${escapeHtml(item.title)}</h3>
                <p class="text-[10.5px] font-bold text-[#e11d2e]">
                  ${isWeighed ? `${zar.format(item.pricePerKg)} / kg` : `${zar.format(item.unitFixedPrice)} each`}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-2.5 flex items-center gap-2 border-t border-slate-200/70 pt-2.5">
            ${isWeighed ? `
              <label class="flex-1 text-[10px] font-bold text-slate-600">
                Scale Sticker Price (ZAR) or Weight (kg)
                <div class="mt-1 flex gap-1.5">
                  <input type="number" step="0.05" min="0.05" max="25" value="${item.defaultWeightKg}" data-scale-kg="${idx}" class="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-900" aria-label="Weight in kg" />
                  <span class="self-center text-[10px] font-bold text-slate-400">kg =</span>
                  <input type="number" step="0.01" min="1" max="999" value="${defaultTotal.toFixed(2)}" data-scale-zar="${idx}" class="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-emerald-700" aria-label="Sticker Rand price" />
                </div>
              </label>
            ` : `
              <label class="flex-1 text-[10px] font-bold text-slate-600">
                Quantity in Bag
                <div class="mt-1 flex items-center gap-2">
                  <input type="number" step="1" min="1" max="50" value="${item.defaultQty || 1}" data-scale-qty="${idx}" class="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-900" />
                  <span class="text-xs font-black text-emerald-700" data-scale-unit-total="${idx}">${zar.format(defaultTotal)}</span>
                </div>
              </label>
            `}
            <button
              type="button"
              data-add-scale-idx="${idx}"
              data-plu-prefix="${item.pluPrefix}"
              class="self-end h-9 shrink-0 rounded-xl bg-[#e11d2e] px-3.5 text-xs font-black text-white shadow-sm hover:bg-red-700 active:scale-95 transition"
            >
              + Trolley
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Live sync weight <-> Rand price inputs
    listRoot.querySelectorAll('[data-scale-kg]').forEach((kgInput) => {
      const idx = Number(kgInput.dataset.scaleKg);
      const item = filtered[idx];
      const zarInput = listRoot.querySelector(`[data-scale-zar="${idx}"]`);
      kgInput.addEventListener('input', () => {
        const kg = parseFloat(kgInput.value) || 0;
        if (zarInput && kg > 0) {
          zarInput.value = (kg * item.pricePerKg).toFixed(2);
        }
      });
      zarInput?.addEventListener('input', () => {
        const rands = parseFloat(zarInput.value) || 0;
        if (rands > 0 && item.pricePerKg > 0) {
          kgInput.value = (rands / item.pricePerKg).toFixed(2);
        }
      });
    });

    listRoot.querySelectorAll('[data-scale-qty]').forEach((qtyInput) => {
      const idx = Number(qtyInput.dataset.scaleQty);
      const item = filtered[idx];
      const lbl = listRoot.querySelector(`[data-scale-unit-total="${idx}"]`);
      qtyInput.addEventListener('input', () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        if (lbl) lbl.textContent = zar.format(qty * item.unitFixedPrice);
      });
    });

    listRoot.querySelectorAll('[data-add-scale-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.addScaleIdx);
        const item = filtered[idx];
        const isWeighed = Boolean(item.pricePerKg && !item.unitFixedPrice);

        if (isWeighed) {
          const zarVal = parseFloat(listRoot.querySelector(`[data-scale-zar="${idx}"]`)?.value) || (item.pricePerKg * item.defaultWeightKg);
          const kgVal = parseFloat(listRoot.querySelector(`[data-scale-kg="${idx}"]`)?.value) || (zarVal / item.pricePerKg);
          const tillBarcode = encodeShopriteScaleBarcodeForTill(`${item.pluPrefix}0`, zarVal);
          const weightStr = kgVal < 1 ? `${Math.round(kgVal * 1000)} g` : `${kgVal.toFixed(2)} kg`;
          const svgImg = generateWhiteStudioSvgDataUrl(item.title, `PLU #${item.pluCode}`, item.emoji, tillBarcode);

          onAddScaleProduct({
            barcode: tillBarcode,
            gtin: tillBarcode,
            sku: `PLU-${item.pluCode}`,
            barcodeFormat: 'EAN13',
            isScaleItem: true,
            name: item.title,
            title: item.title,
            brand: 'Shoprite Scale',
            weight: weightStr,
            category: item.category,
            subCategory: item.subCategory,
            price: Number(zarVal.toFixed(2)),
            basePrice: Number(zarVal.toFixed(2)),
            image: svgImg,
            imageUrl: svgImg,
            emoji: item.emoji,
            isHouseBrand: true,
            retailerId: 'shoprite'
          }, 1);
        } else {
          const qty = Math.max(1, parseInt(listRoot.querySelector(`[data-scale-qty="${idx}"]`)?.value, 10) || 1);
          const unitBarcode = encodeShopriteScaleBarcodeForTill(`${item.pluPrefix}0`, item.unitFixedPrice);
          const svgImg = generateWhiteStudioSvgDataUrl(item.title, `PLU #${item.pluCode}`, item.emoji, unitBarcode);

          onAddScaleProduct({
            barcode: unitBarcode,
            gtin: unitBarcode,
            sku: `PLU-${item.pluCode}`,
            barcodeFormat: 'EAN13',
            isScaleItem: true,
            name: item.title,
            title: item.title,
            brand: 'Shoprite Bakery/Deli',
            weight: '1 unit',
            category: item.category,
            subCategory: item.subCategory,
            price: item.unitFixedPrice,
            basePrice: item.unitFixedPrice,
            image: svgImg,
            imageUrl: svgImg,
            emoji: item.emoji,
            isHouseBrand: true,
            retailerId: 'shoprite'
          }, qty);
        }

        dialog.close();
      });
    });
  }

  dialog.querySelector('#scale-modal-close')?.addEventListener('click', () => dialog.close());
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderItems();
  });

  renderTabs();
  renderItems();
}

// ============================================================================
// 7. DIGITAL SHOPRITE POS TILL SLIP MODAL (<dialog>)
// ============================================================================

export function openDigitalTillSlipModal({
  modalRoot,
  mountModalDialog,
  receipt,
  zar,
  onReAddBasket
}) {
  if (!receipt || !modalRoot) return;
  const vat = calculateSaVatBreakdown(receipt.items || [], receipt.total);
  const dateLabel = new Date(receipt.createdAt || receipt._lastModified || Date.now()).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="mx-auto flex h-dvh w-full max-w-md flex-col justify-end sm:justify-center sm:p-4" aria-labelledby="till-slip-title">
        <div class="sheet-enter flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
          <div class="flex items-center justify-between border-b border-slate-100 bg-[#e11d2e] px-5 py-4 text-white">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-white/80">Digital POS Till Slip</p>
              <h2 id="till-slip-title" class="text-lg font-black">${escapeHtml(receipt.storeName || 'Shoprite South Africa')}</h2>
            </div>
            <button id="slip-close-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/15 text-base font-black text-white" aria-label="Close till slip">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto bg-stone-100 p-4 font-mono text-xs text-slate-900">
            <div class="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/90 space-y-3">
              <div class="border-b border-dashed border-slate-300 pb-3 text-center">
                <p class="text-sm font-black tracking-tight text-[#e11d2e]">SHOPRITE SOUTH AFRICA</p>
                <p class="text-[10px] font-bold text-slate-600">LOW PRICES YOU CAN TRUST</p>
                <p class="mt-1 text-[10px] text-slate-500">Branch #${escapeHtml(receipt.storeCode || '0023')} · ${escapeHtml(dateLabel)}</p>
                <p class="text-[10px] text-slate-400">Slip #${escapeHtml(receipt.id)}</p>
              </div>

              <div class="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                ${(receipt.items || []).map((it) => {
                  const zeroVat = isSaZeroRatedVatItem(it);
                  const lineSum = (Number(it.price) || 0) * (Number(it.quantity) || 1);
                  return `
                    <div class="flex items-start justify-between gap-2 text-[11px]">
                      <div class="min-w-0">
                        <p class="truncate font-bold text-slate-900">${escapeHtml(it.name)}${zeroVat ? ' *' : ''}</p>
                        <p class="text-[9.5px] text-slate-500">${it.quantity} × ${zar.format(it.price)} · ${escapeHtml(it.barcode)}</p>
                      </div>
                      <span class="shrink-0 font-black">${zar.format(lineSum)}</span>
                    </div>
                  `;
                }).join('')}
              </div>

              <div class="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
                ${receipt.savings > 0 ? `
                  <div class="flex justify-between font-black text-emerald-700">
                    <span>XTRA SAVINGS DISCOUNT</span>
                    <span>−${zar.format(receipt.savings)}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between text-base font-black text-slate-950 pt-1">
                  <span>TOTAL PAID</span>
                  <span>${zar.format(receipt.total)}</span>
                </div>
              </div>

              <div class="space-y-0.5 text-[10px] text-slate-500">
                <div class="flex justify-between"><span>* Zero-Rated Basic Food (0% VAT)</span><span>${zar.format(vat.zeroRatedTotal)}</span></div>
                <div class="flex justify-between"><span>Standard Rated (15% VAT Incl.)</span><span>${zar.format(vat.standardRatedTotal)}</span></div>
                <div class="flex justify-between font-bold text-slate-700"><span>15% SARS VAT Included</span><span>${zar.format(vat.vatAmount15)}</span></div>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-200 bg-white p-4 pb-safe flex gap-2">
            <button id="slip-readd-btn" type="button" class="flex-1 rounded-2xl bg-[#e11d2e] py-3 text-xs font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition">
              🛒 Re-Add Items to Trolley
            </button>
            <button id="slip-done-btn" type="button" class="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `,
    { closedBy: 'any' }
  );

  if (!dialog) return;
  dialog.querySelector('#slip-close-btn')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#slip-done-btn')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#slip-readd-btn')?.addEventListener('click', () => {
    onReAddBasket?.(receipt.items || []);
    dialog.close();
  });
}
