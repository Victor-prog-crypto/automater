import { automationCore, AUTOMATION_EVENTS, RetailDOMScraper } from './automation-core.js';
import {
  SHOPRITE_SA_STORES,
  SHOPRITE_LIVE_PRODUCTS,
  SHOPRITE_RETAIL_DEPARTMENTS,
  SHOPRITE_PROVINCE_HUBS,
  getShopriteStoresSortedByDistance,
  getExactShopriteBranchDeal
} from './shoprite-stores-sa.js';
import {
  openShopriteStoreLocator,
  openContinuousPhoneScanner,
  openSequentialTillCheckout,
  openProductQuickViewModal,
  openAllDepartmentsModal,
  mountModalDialog,
  renderTill1DBarcodeSvg
} from './till-scanner-engine.js';
import {
  ensurePersistentCellphoneStorage,
  saveLocalCustomProduct,
  loadAllLocalCustomProducts,
  saveLocalOrderRecord,
  loadAllLocalOrders
} from './local-vault.js';
import {
  computeGs1CheckDigit,
  normalizeScannedBarcode,
  decodeShopriteVariableWeightBarcode,
  resolveOpenFoodFactsBarcode,
  loadXtraSavingsCard,
  openXtraSavingsCardModal,
  openShopriteScalePluModal,
  openDigitalTillSlipModal
} from './shoprite-pos-engine.js';

const ROUTES = Object.freeze(['market', 'trolley', 'cartel', 'tracker', 'savings']);
const STORAGE_KEY = 'automater_unified_v8';
const MIN_BARCODE_LENGTH = 6;

const RETAILERS = Object.freeze({
  shoprite: { id: 'shoprite', name: 'Shoprite', url: 'https://www.shoprite.co.za', host: 'shoprite.co.za', tagline: 'Low prices you can trust', loyalty: 'Xtra Savings', entryBarcode: '9000000000001', color: '#e11d2e', soft: '#fff1f2', initials: 'S', accent: 'from-red-600 to-rose-700', logoUrl: '/logos/shoprite.svg' },
  checkers: { id: 'checkers', name: 'Checkers', url: 'https://www.checkers.co.za', host: 'checkers.co.za', tagline: 'Better and better', loyalty: 'Sixty60 / Xtra', entryBarcode: '9000000000004', color: '#004831', soft: '#ecfdf5', initials: 'C', accent: 'from-emerald-800 to-teal-900', logoUrl: '/logos/checkers.svg' },
  pnp: { id: 'pnp', name: 'Pick n Pay', url: 'https://www.pnp.co.za', host: 'pnp.co.za', tagline: 'Fresh choices, smart prices', loyalty: 'Smart Shopper', entryBarcode: '9000000000002', color: '#005baa', soft: '#eff6ff', initials: 'PnP', accent: 'from-blue-600 to-indigo-800', logoUrl: '/logos/pnp.svg' },
  spar: { id: 'spar', name: 'SPAR', url: 'https://www.spar.co.za', host: 'spar.co.za', tagline: 'Good for you', loyalty: 'SPAR Rewards', entryBarcode: '9000000000003', color: '#138a42', soft: '#f0fdf4', initials: 'SPAR', accent: 'from-emerald-600 to-green-700', logoUrl: '/logos/spar.svg' },
  woolworths: { id: 'woolworths', name: 'Woolworths', url: 'https://www.woolworths.co.za', host: 'woolworths.co.za', tagline: 'The difference', loyalty: 'WRewards', entryBarcode: '9000000000005', color: '#18181b', soft: '#fafafa', initials: 'WW', accent: 'from-zinc-900 to-neutral-950', logoUrl: '/logos/woolworths.svg' },
  boxer: { id: 'boxer', name: 'Boxer', url: 'https://www.boxer.co.za', host: 'boxer.co.za', tagline: 'Never pay more than the Boxer price', loyalty: 'Boxer Club', entryBarcode: '9000000000006', color: '#ea580c', soft: '#fff7ed', initials: 'BXR', accent: 'from-orange-600 to-amber-700', logoUrl: '/logos/boxer.svg' }
});

// Production CSE + Shoprite JSON-LD verified catalog (317 authentic SKUs across all 12 retail departments, pure #FFFFFF packshots)
const MASTER_PRODUCTS = new Map(SHOPRITE_LIVE_PRODUCTS.map((p) => [p.gtin, p]));
const PRODUCTS = new Map(MASTER_PRODUCTS);

// South African Pricing Zones (Towns + Big City Metro Sections) mapped to SA Provinces & Shoprite Branches
const PRICING_ZONES = [
  { id: 'polokwane', kind: 'town', name: 'Polokwane', province: 'Limpopo', provinceCode: 'LP', scopeLabel: 'Town-wide pricing', anchorHub: 'Polokwane Town Retailers', lat: -23.9045, lon: 29.4689, zoneMult: 0.99 },
  { id: 'mbombela', kind: 'town', name: 'Mbombela (Nelspruit)', province: 'Mpumalanga', provinceCode: 'MP', scopeLabel: 'Town-wide pricing', anchorHub: 'Mbombela Town Retailers', lat: -25.4753, lon: 30.9694, zoneMult: 1.0 },
  { id: 'pietermaritzburg', kind: 'town', name: 'Pietermaritzburg', province: 'KwaZulu-Natal', provinceCode: 'KZN', scopeLabel: 'Town-wide pricing', anchorHub: 'Pietermaritzburg Town Retailers', lat: -29.6006, lon: 30.3794, zoneMult: 0.99 },
  { id: 'bloemfontein', kind: 'town', name: 'Bloemfontein', province: 'Free State', provinceCode: 'FS', scopeLabel: 'Town-wide pricing', anchorHub: 'Bloemfontein Town Retailers', lat: -29.0852, lon: 26.1596, zoneMult: 0.99 },
  { id: 'stellenbosch', kind: 'town', name: 'Stellenbosch', province: 'Western Cape', provinceCode: 'WC', scopeLabel: 'Town-wide pricing', anchorHub: 'Stellenbosch Town Retailers', lat: -33.9321, lon: 18.8602, zoneMult: 1.01 },
  { id: 'richards_bay', kind: 'town', name: 'Richards Bay', province: 'KwaZulu-Natal', provinceCode: 'KZN', scopeLabel: 'Town-wide pricing', anchorHub: 'Richards Bay Town Retailers', lat: -28.7807, lon: 32.0383, zoneMult: 1.0 },
  { id: 'rustenburg', kind: 'town', name: 'Rustenburg', province: 'North West', provinceCode: 'NW', scopeLabel: 'Town-wide pricing', anchorHub: 'Rustenburg Town Retailers', lat: -25.6676, lon: 27.2421, zoneMult: 0.99 },
  { id: 'george', kind: 'town', name: 'George', province: 'Western Cape', provinceCode: 'WC', scopeLabel: 'Town-wide pricing', anchorHub: 'George Town Retailers', lat: -33.9630, lon: 22.4617, zoneMult: 1.0 },

  { id: 'jhb_north', kind: 'metro', city: 'Johannesburg', section: 'Sandton, Rosebank & North', name: 'Johannesburg · Sandton & North', province: 'Gauteng', provinceCode: 'GP', scopeLabel: 'City-area pricing', anchorHub: 'Sandton / Rosebank Area', lat: -26.1076, lon: 28.0567, zoneMult: 1.02 },
  { id: 'jhb_south_soweto', kind: 'metro', city: 'Johannesburg', section: 'Soweto, Southgate & CBD', name: 'Johannesburg · Soweto & South', province: 'Gauteng', provinceCode: 'GP', scopeLabel: 'City-area pricing', anchorHub: 'Soweto / Southgate Area', lat: -26.2485, lon: 27.8540, zoneMult: 0.98 },
  { id: 'pta_east_central', kind: 'metro', city: 'Pretoria', section: 'Hatfield, Menlyn & Centurion', name: 'Pretoria · Hatfield & East', province: 'Gauteng', provinceCode: 'GP', scopeLabel: 'City-area pricing', anchorHub: 'Hatfield / Menlyn Area', lat: -25.7479, lon: 28.2293, zoneMult: 1.01 },
  { id: 'dbn_central', kind: 'metro', city: 'Durban', section: 'Central, Berea & Harbour', name: 'Durban · Central & Berea', province: 'KwaZulu-Natal', provinceCode: 'KZN', scopeLabel: 'City-area pricing', anchorHub: 'Durban Central / Berea Area', lat: -29.8587, lon: 31.0218, zoneMult: 0.99 },
  { id: 'dbn_north_umhlanga', kind: 'metro', city: 'Durban', section: 'Umhlanga, Gateway & Phoenix', name: 'Durban · Umhlanga & North', province: 'KwaZulu-Natal', provinceCode: 'KZN', scopeLabel: 'City-area pricing', anchorHub: 'Umhlanga / North Coast Area', lat: -29.7257, lon: 31.0664, zoneMult: 1.01 },
  { id: 'cpt_central', kind: 'metro', city: 'Cape Town', section: 'City Bowl, Sea Point & Woodstock', name: 'Cape Town · City Bowl & Atlantic', province: 'Western Cape', provinceCode: 'WC', scopeLabel: 'City-area pricing', anchorHub: 'City Bowl / Gardens Area', lat: -33.9249, lon: 18.4241, zoneMult: 1.02 },
  { id: 'cpt_north_flats', kind: 'metro', city: 'Cape Town', section: 'Bellville, Parow & Cape Flats', name: 'Cape Town · Bellville & Cape Flats', province: 'Western Cape', provinceCode: 'WC', scopeLabel: 'City-area pricing', anchorHub: 'Bellville / Mitchells Plain Area', lat: -33.9000, lon: 18.6290, zoneMult: 0.98 }
];

const OTHER_BENCHMARK_STORES = [
  { id: 'checkers_sandton_0210', retailerId: 'checkers', retailer: 'Checkers', name: 'Checkers Hyper Sandton City', address: 'Sandton City Mall, Sandton', retailerStoreCode: '0210', color: '#004831', loyalty: 'Sixty60 / Xtra' },
  { id: 'pnp_rosebank_0033', retailerId: 'pnp', retailer: 'Pick n Pay', name: 'Pick n Pay Rosebank Mall', address: 'Bath Ave, Rosebank', retailerStoreCode: '0033', color: '#005baa', loyalty: 'Smart Shopper' },
  { id: 'spar_umhlanga_0045', retailerId: 'spar', retailer: 'SPAR', name: 'SUPERSPAR Umhlanga Rocks', address: 'Chartwell Dr, Umhlanga', retailerStoreCode: '0045', color: '#138a42', loyalty: 'SPAR Rewards' },
  { id: 'woolworths_gateway_0019', retailerId: 'woolworths', retailer: 'Woolworths', name: 'Woolworths Gateway', address: 'Gateway Mall, Umhlanga', retailerStoreCode: '0019', color: '#18181b', loyalty: 'WRewards' },
  { id: 'boxer_durban_0012', retailerId: 'boxer', retailer: 'Boxer', name: 'Boxer Superstores Durban', address: 'Dr Pixley KaSeme St, Durban', retailerStoreCode: '0012', color: '#ea580c', loyalty: 'Boxer Club' }
];

const STORE_PRICES = new Map();

const STORE_PRICE_FACTORS = {
  shoprite: { regMult: 1.0, promoMult: 1.0 },
  checkers: { regMult: 1.03, promoMult: 1.02 },
  pnp: { regMult: 1.04, promoMult: 1.03 },
  spar: { regMult: 1.05, promoMult: 1.04 },
  woolworths: { regMult: 1.12, promoMult: 1.09 },
  boxer: { regMult: 0.94, promoMult: 0.92 }
};

const CATEGORIES = SHOPRITE_RETAIL_DEPARTMENTS.map((dept) => ({
  ...dept,
  label: dept.shortLabel || dept.id
}));

const COUPONS = [
  { id: 'basket10', label: 'R10 Basket Boost', detail: 'R10 off when your basket reaches R100', tone: 'from-slate-800 to-slate-950' },
  { id: 'fresh5', label: 'Fresh Five', detail: '5% off all Fresh Fruit & Vegetables', tone: 'from-[#234e3b] to-[#1a3a2c]' }
];

function getRouteFromHash() {
  const candidate = location.hash.slice(1);
  if (candidate === 'list') return 'trolley';
  return ROUTES.includes(candidate) ? candidate : 'market';
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch (_) {
    return {};
  }
}

const persisted = loadPersistedState();

const state = {
  route: getRouteFromHash(),
  pricingZoneId: persisted.pricingZoneId || 'polokwane',
  currentStoreId: persisted.currentStoreId || SHOPRITE_SA_STORES[0].id,
  storeConfirmed: Boolean(persisted.storeConfirmed),
  userCoords: persisted.userCoords || null,
  gpsStatus: 'idle',
  detectedDistanceKm: null,
  retailerId: persisted.retailerId || 'shoprite',
  globalSearchOpen: false,
  globalSearchQuery: '',
  selectedCatalogBarcode: '6001253010178',
  catalogSearch: '',
  catalogCategory: 'all',
  catalogViewMode: 'grid',
  houseBrandOnly: false,
  catalogSort: 'default',
  cart: Array.isArray(persisted.cart) ? persisted.cart : [],
  instoreBudget: Number(persisted.instoreBudget) || 500,
  displayedCartTotal: 0,
  coupons: new Set(Array.isArray(persisted.coupons) ? persisted.coupons : []),
  completedSavings: Number(persisted.completedSavings) || 0,
  loyaltyPoints: Number(persisted.loyaltyPoints) || 680,
  pastReceipts: [],
  overlay: null,
  order: null,
  scanBusy: false
};

function savePersistedState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pricingZoneId: state.pricingZoneId,
      currentStoreId: state.currentStoreId,
      storeConfirmed: state.storeConfirmed,
      userCoords: state.userCoords,
      retailerId: state.retailerId,
      cart: state.cart,
      instoreBudget: state.instoreBudget,
      coupons: Array.from(state.coupons),
      completedSavings: state.completedSavings,
      loyaltyPoints: state.loyaltyPoints
    }));
  } catch (_) {}
}

const screen = document.querySelector('#screen');
const modalRoot = document.querySelector('#modal-root');
const toast = document.querySelector('#toast');
const searchButton = document.querySelector('#header-search-button');
const globalSearchDrawer = document.querySelector('#global-search-drawer');
const cartButton = document.querySelector('#header-cart-button');
const cartCount = document.querySelector('#header-cart-count');
const cartTotalEl = document.querySelector('#header-cart-total');
const cartPlus = document.querySelector('#header-cart-plus');
const floatingTrolleyCallout = document.querySelector('#floating-trolley-callout');
const headerSubtitle = document.querySelector('#header-subtitle');
const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

const RETAILER_THEMES = Object.freeze({
  shoprite: {
    heroGradient: 'linear-gradient(145deg, #991b1b 0%, #dc2626 52%, #450a0a 100%)',
    barometerBg: 'rgba(69, 10, 10, 0.35)',
    pillBg: '#fef2f2',
    pillText: '#b91c1c',
    border: '#fecaca',
    accent: '#e11d2e'
  },
  checkers: {
    heroGradient: 'linear-gradient(145deg, #003d29 0%, #0d6e52 52%, #022c22 100%)',
    barometerBg: 'rgba(2, 44, 34, 0.38)',
    pillBg: '#ecfdf5',
    pillText: '#065f46',
    border: '#a7f3d0',
    accent: '#004831'
  },
  pnp: {
    heroGradient: 'linear-gradient(145deg, #003d75 0%, #005baa 52%, #172554 100%)',
    barometerBg: 'rgba(23, 37, 84, 0.38)',
    pillBg: '#eff6ff',
    pillText: '#1d4ed8',
    border: '#bfdbfe',
    accent: '#005baa'
  },
  spar: {
    heroGradient: 'linear-gradient(145deg, #0f6e34 0%, #15803d 52%, #052e16 100%)',
    barometerBg: 'rgba(5, 46, 22, 0.38)',
    pillBg: '#f0fdf4',
    pillText: '#15803d',
    border: '#bbf7d0',
    accent: '#138a42'
  },
  woolworths: {
    heroGradient: 'linear-gradient(145deg, #18181b 0%, #27272a 52%, #09090b 100%)',
    barometerBg: 'rgba(9, 9, 11, 0.45)',
    pillBg: '#f4f4f5',
    pillText: '#18181b',
    border: '#d4d4d8',
    accent: '#18181b'
  },
  boxer: {
    heroGradient: 'linear-gradient(145deg, #9a3412 0%, #ea580c 52%, #431407 100%)',
    barometerBg: 'rgba(67, 20, 7, 0.38)',
    pillBg: '#fff7ed',
    pillText: '#c2410c',
    border: '#fed7aa',
    accent: '#ea580c'
  }
});

const firebaseConfig = Object.freeze({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

let firestoreDb = null;

async function initializeFirebaseConnectivity() {
  const configured = ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => Boolean(firebaseConfig[key]));
  if (!configured) return null;
  return firestoreDb;
}

function getActiveZone() {
  return PRICING_ZONES.find((z) => z.id === state.pricingZoneId) || PRICING_ZONES[0];
}

function getActiveStore(retailerId = state.retailerId) {
  const targetRet = retailerId || state.retailerId || 'shoprite';
  if (targetRet === 'shoprite') {
    if (state.storeConfirmed && state.currentStoreId) {
      const confirmed = SHOPRITE_SA_STORES.find((s) => s.id === state.currentStoreId);
      if (confirmed) return confirmed;
    }
    const zone = getActiveZone();
    const sorted = getShopriteStoresSortedByDistance(zone.lat, zone.lon, SHOPRITE_SA_STORES);
    return sorted[0] || SHOPRITE_SA_STORES[0];
  }
  const bench = OTHER_BENCHMARK_STORES.find((s) => s.retailerId === targetRet);
  const ret = RETAILERS[targetRet] || RETAILERS.shoprite;
  const zone = getActiveZone();
  return bench || {
    id: `${targetRet}_${zone.id}`,
    retailerId: targetRet,
    retailer: ret.name,
    name: `${ret.name} ${zone.name}`,
    retailerStoreCode: '0101',
    provinceCode: zone.provinceCode || 'GP',
    color: ret.color,
    loyalty: ret.loyalty
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findClosestZone(latitude, longitude) {
  let closest = PRICING_ZONES[0];
  let minDistance = Infinity;
  PRICING_ZONES.forEach((zone) => {
    const dist = haversineKm(latitude, longitude, zone.lat, zone.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = zone;
    }
  });
  return { zone: closest, distanceKm: Math.round(minDistance * 10) / 10 };
}

function formatUnitPrice(price, weightStr) {
  if (!weightStr) return null;
  const match = weightStr.match(/([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (!val || isNaN(val)) return null;
  const unit = match[2].toLowerCase();
  if (unit === 'kg') return `${zar.format(price / val)} / kg`;
  if (unit === 'g') return `${zar.format(price / (val / 1000))} / kg`;
  if (unit === 'l' || unit === 'litre' || unit === 'litres') return `${zar.format(price / val)} / L`;
  if (unit === 'ml') return `${zar.format(price / (val / 1000))} / L`;
  return null;
}

function getZonePrice(zoneId, retailerId, gtin) {
  const safeZoneId = zoneId || state.pricingZoneId || 'polokwane';
  const safeRetId = retailerId || 'shoprite';
  const branchTag = safeRetId === 'shoprite' && state.storeConfirmed ? state.currentStoreId : safeZoneId;
  const compositeKey = `${branchTag}_${safeRetId}_${gtin}`;
  if (STORE_PRICES.has(compositeKey)) {
    return STORE_PRICES.get(compositeKey);
  }

  const master = MASTER_PRODUCTS.get(gtin);
  if (safeRetId === 'shoprite' && master) {
    const shopriteBranch = getActiveStore('shoprite');
    const deal = getExactShopriteBranchDeal(shopriteBranch, master);
    const priceObj = {
      zoneId: safeZoneId,
      retailerId: 'shoprite',
      gtin,
      ...deal,
      lastUpdatedAt: Date.now()
    };
    STORE_PRICES.set(compositeKey, priceObj);
    return priceObj;
  }

  if (!master) {
    const customProd = PRODUCTS.get(gtin) || decodeShopriteVariableWeightBarcode(gtin, MASTER_PRODUCTS);
    if (customProd) {
      const factor = (STORE_PRICE_FACTORS[safeRetId]?.regMult) || 1.0;
      const baseUnit = Number(customProd.price || customProd.rawPrice || 19.99);
      const activePrice = safeRetId === 'shoprite'
        ? baseUnit
        : Math.max(1.49, Math.round((baseUnit * factor) * 2) / 2 - 0.01);
      const regularPrice = Math.max(activePrice, Number(customProd.basePrice || activePrice));
      return {
        regularPrice,
        promoPrice: activePrice < regularPrice ? activePrice : null,
        activePrice,
        hasPromo: activePrice < regularPrice,
        savings: Math.max(0, Number((regularPrice - activePrice).toFixed(2))),
        aisle: customProd.category || 'General Grocery',
        inStock: true
      };
    }
    return { regularPrice: 19.99, promoPrice: 16.99, activePrice: 16.99, hasPromo: true, savings: 3.0, inStock: true };
  }

  const zone = PRICING_ZONES.find((z) => z.id === safeZoneId) || PRICING_ZONES[0];
  const factors = STORE_PRICE_FACTORS[safeRetId] || { regMult: 1.0, promoMult: 1.0 };
  const zMult = zone.zoneMult || 1.0;
  const calcReg = Math.max(1.99, Math.round((master.basePrice * factors.regMult * zMult) * 2) / 2 - 0.01);
  const calcPromo = master.promoPrice ? Math.max(1.49, Math.round((master.promoPrice * factors.promoMult * zMult) * 2) / 2 - 0.01) : null;
  const hasPromo = Boolean(calcPromo && calcPromo < calcReg);
  const activePrice = hasPromo ? calcPromo : calcReg;

  const priceObj = {
    zoneId: safeZoneId,
    retailerId: safeRetId,
    gtin,
    regularPrice: calcReg,
    promoPrice: hasPromo ? calcPromo : null,
    activePrice,
    hasPromo,
    savings: hasPromo ? Number((calcReg - activePrice).toFixed(2)) : 0,
    aisle: master.category || 'General Grocery',
    inStock: true,
    lastUpdatedAt: Date.now()
  };
  STORE_PRICES.set(compositeKey, priceObj);
  return priceObj;
}

function getStorePrice(storeId, gtin) {
  const store = SHOPRITE_SA_STORES.find((s) => s.id === storeId) || OTHER_BENCHMARK_STORES.find((s) => s.id === storeId);
  if (store && store.retailerId === 'shoprite' && MASTER_PRODUCTS.has(gtin)) {
    return getExactShopriteBranchDeal(store, MASTER_PRODUCTS.get(gtin));
  }
  return getZonePrice(state.pricingZoneId, store?.retailerId || state.retailerId, gtin);
}

function normalizeProductForStore(raw, retailerId = state.retailerId) {
  if (!raw) return null;
  const barcode = String(raw.barcode || raw.gtin || '').trim();
  const deal = getZonePrice(state.pricingZoneId, retailerId, barcode);
  const activePrice = deal.activePrice ?? ((deal.promoPrice && deal.promoPrice < deal.regularPrice) ? deal.promoPrice : deal.regularPrice);
  const regularPrice = deal.regularPrice || raw.basePrice || activePrice;
  return {
    barcode,
    gtin: barcode,
    sku: raw.sku || '',
    barcodeFormat: raw.barcodeFormat || 'EAN13',
    name: raw.name || raw.title || 'Grocery Item',
    title: raw.title || raw.name || 'Grocery Item',
    brand: raw.brand || 'Shoprite',
    weight: raw.weight || '1 unit',
    category: raw.category || 'Food Cupboard & Pantry',
    subCategory: raw.subCategory || '',
    regionalPrices: raw.regionalPrices || null,
    price: Number(activePrice) || 19.99,
    basePrice: Number(regularPrice) || Number(activePrice) || 19.99,
    image: raw.image || raw.imageUrl || '',
    imageUrl: raw.imageUrl || raw.image || '',
    emoji: raw.emoji || '🛍️',
    isHouseBrand: Boolean(raw.isHouseBrand),
    retailerId: retailerId || 'shoprite',
    deal
  };
}

/**
 * 5-Tier Universal Shoprite South Africa Barcode & PLU Resolver ($0 Cloud Cost)
 */
async function fetchProductFromFirestore(barcode) {
  const code = normalizeScannedBarcode(barcode);
  if (!code) return null;

  const xtra = loadXtraSavingsCard();
  if (xtra && xtra.cardNumber === code) {
    showToast('💳 Xtra Savings Card recognized — linked for Till Mode!');
    return '__XTRA_CARD__';
  }

  let raw = MASTER_PRODUCTS.get(code) || PRODUCTS.get(code);
  if (!raw && /^\d{6,9}$/.test(code)) {
    for (const prod of PRODUCTS.values()) {
      if (String(prod.sku || '') === code) {
        raw = prod;
        break;
      }
    }
  }
  if (raw) {
    return normalizeProductForStore(raw, state.retailerId);
  }

  const scaleItem = decodeShopriteVariableWeightBarcode(code, MASTER_PRODUCTS);
  if (scaleItem) {
    PRODUCTS.set(scaleItem.barcode, scaleItem);
    return scaleItem;
  }

  const offItem = await resolveOpenFoodFactsBarcode(code);
  if (offItem) {
    PRODUCTS.set(offItem.barcode, offItem);
    await saveLocalCustomProduct(offItem);
    return offItem;
  }

  return null;
}

function searchCatalogProducts(rawQuery) {
  const q = String(rawQuery || '').toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = [];

  for (const prod of PRODUCTS.values()) {
    const prodCode = String(prod.gtin || prod.barcode || '');
    const prodTitle = String(prod.title || prod.name || '');
    const hay = [
      prodTitle,
      prod.brand || '',
      prodCode,
      prod.sku || '',
      prod.weight || '',
      prod.category || '',
      prod.subCategory || '',
      ...(prod.searchKeywords || [])
    ].join(' ').toLowerCase();

    if (!tokens.every((tk) => hay.includes(tk))) continue;
    const deal = getZonePrice(state.pricingZoneId, state.retailerId, prodCode);
    let score = 0;
    if (prodCode === q || prod.sku === q) score += 100;
    else if (prodCode.startsWith(q)) score += 60;
    if (prodTitle.toLowerCase().startsWith(q)) score += 45;
    if (prod.isHouseBrand) score += 5;

    results.push({ ...prod, gtin: prodCode, title: prodTitle, deal, _score: score });
  }

  return results.sort((a, b) => b._score - a._score || (a.deal.activePrice || 0) - (b.deal.activePrice || 0));
}

function openStoreBranchModal(autoRequestGps = false) {
  openShopriteStoreLocator({
    modalRoot,
    state,
    autoRequestGps,
    playBeep: playBeepSound,
    showToast,
    onSelectStore: (store) => {
      if (!store) return;
      state.currentStoreId = store.id;
      state.retailerId = 'shoprite';
      state.storeConfirmed = true;
      const matchedZone = findClosestZone(store.geoPoint.latitude, store.geoPoint.longitude);
      if (matchedZone?.zone) state.pricingZoneId = matchedZone.zone.id;
      STORE_PRICES.clear();
      savePersistedState();
      playBeepSound();
      automationCore.vibrateProductAdded();
      showToast(`📍 Checked into ${store.name} (#${store.retailerStoreCode})`);
      render();
    }
  });
}

function openShopriteXtraCardHelper() {
  openXtraSavingsCardModal({
    modalRoot,
    mountModalDialog,
    renderTill1DBarcodeSvg,
    onCardUpdated: () => render(),
    showToast
  });
}

function openLooseScalePluHelper() {
  openShopriteScalePluModal({
    modalRoot,
    mountModalDialog,
    zar,
    onAddScaleProduct: (scaleProd, qty = 1) => {
      PRODUCTS.set(scaleProd.barcode, scaleProd);
      for (let i = 0; i < qty; i++) {
        addToCart(scaleProd, state.retailerId, { silent: i > 0 });
      }
      automationCore.vibrateProductAdded();
      playBeepSound();
      render();
    },
    showToast
  });
}

function openReceiptSlipHelper(receipt) {
  openDigitalTillSlipModal({
    modalRoot,
    mountModalDialog,
    receipt,
    zar,
    onReAddBasket: (items) => {
      let count = 0;
      for (const it of items) {
        if (it.barcode && !MASTER_PRODUCTS.has(it.barcode) && !PRODUCTS.has(it.barcode)) {
          PRODUCTS.set(it.barcode, it);
        }
        const qty = Math.max(1, Number(it.quantity) || 1);
        for (let i = 0; i < qty; i++) {
          addToCart(it, receipt.retailerId || 'shoprite', { silent: true });
        }
        count += qty;
      }
      automationCore.vibrateProductAdded();
      playBeepSound();
      routeTo('trolley');
      showToast(`🛒 Restored ${count} item(s) from Till Slip into Trolley!`);
    }
  });
}

function routeTo(route) {
  const mapped = route === 'list' ? 'trolley' : route;
  const safeRoute = ROUTES.includes(mapped) ? mapped : 'market';
  if (location.hash !== `#${safeRoute}`) history.pushState(null, '', `#${safeRoute}`);
  state.route = safeRoute;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function getRetailer() {
  return state.retailerId ? RETAILERS[state.retailerId] : RETAILERS.shoprite;
}

function getItemPricingForRetailer(item, retailerId = state.retailerId) {
  const gtin = item.barcode || item.gtin;
  if (gtin && (MASTER_PRODUCTS.has(gtin) || PRODUCTS.has(gtin))) {
    const zp = getZonePrice(state.pricingZoneId, retailerId, gtin);
    const hasPromo = Boolean(zp.promoPrice && zp.promoPrice < zp.regularPrice);
    const activePrice = zp.activePrice ?? (hasPromo ? zp.promoPrice : zp.regularPrice);
    return { activePrice, regularPrice: zp.regularPrice || activePrice, hasPromo };
  }
  const factor = (STORE_PRICE_FACTORS[retailerId]?.regMult) || 1.0;
  const baseUnit = item.rawPrice || item.price || 19.99;
  const activePrice = retailerId === 'shoprite' && item.isScaleItem
    ? Number(baseUnit)
    : Math.max(1.49, Math.round((baseUnit * factor) * 2) / 2 - 0.01);
  const regularPrice = Math.max(activePrice, Math.round((activePrice * 1.12) * 2) / 2 - 0.01);
  return { activePrice, regularPrice, hasPromo: regularPrice > activePrice };
}

function getRetailerCart(retailerId = state.retailerId) {
  const target = retailerId || state.retailerId || 'shoprite';
  return state.cart.map((item) => {
    const { activePrice, regularPrice } = getItemPricingForRetailer(item, target);
    return {
      ...item,
      retailerId: target,
      price: activePrice,
      basePrice: regularPrice
    };
  });
}

function getItemCount() {
  return state.cart.reduce((count, item) => count + item.quantity, 0);
}

function getMerchandiseTotal(retailerId = state.retailerId) {
  return getRetailerCart(retailerId).reduce((total, item) => total + item.price * item.quantity, 0);
}

function getBuiltInSavings(retailerId = state.retailerId) {
  return getRetailerCart(retailerId).reduce((total, item) => total + Math.max(0, item.basePrice - item.price) * item.quantity, 0);
}

function getCouponSavings(retailerId = state.retailerId) {
  let total = 0;
  const merch = getMerchandiseTotal(retailerId);
  if (state.coupons.has('basket10') && merch >= 100) total += 10;
  if (state.coupons.has('fresh5')) {
    total += getRetailerCart(retailerId)
      .filter((item) => item.category === 'Fresh Fruit & Vegetables' || item.category === 'Bakery & Fresh Produce' || item.category === 'Vegetables & Fruit')
      .reduce((sum, item) => sum + item.price * item.quantity * 0.05, 0);
  }
  return Math.min(total, merch);
}

function getPayableTotal(retailerId = state.retailerId) {
  return Math.max(0, getMerchandiseTotal(retailerId) - getCouponSavings(retailerId));
}

function getCurrentSavings(retailerId = state.retailerId) {
  return getBuiltInSavings(retailerId) + getCouponSavings(retailerId);
}

let countAnimFrame = null;
function animateCartTotalDisplay(targetTotal) {
  if (!cartTotalEl) return;
  const startTotal = state.displayedCartTotal || 0;
  if (Math.abs(targetTotal - startTotal) < 0.005) {
    state.displayedCartTotal = targetTotal;
    cartTotalEl.textContent = zar.format(targetTotal);
    return;
  }
  if (countAnimFrame) cancelAnimationFrame(countAnimFrame);
  const duration = 380;
  const startAt = performance.now();

  const tick = (now) => {
    const elapsed = Math.min(1, (now - startAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const current = startTotal + (targetTotal - startTotal) * eased;
    state.displayedCartTotal = current;
    cartTotalEl.textContent = zar.format(current);
    if (elapsed < 1) {
      countAnimFrame = requestAnimationFrame(tick);
    } else {
      state.displayedCartTotal = targetTotal;
      cartTotalEl.textContent = zar.format(targetTotal);
    }
  };
  countAnimFrame = requestAnimationFrame(tick);
}

function triggerFloatingTrolleyNotice(product, retailerId = state.retailerId, addedQty = 1) {
  const totalInCart = getItemCount();
  const runningTotal = getPayableTotal(retailerId);
  const itemName = product?.name || product?.title || 'Item';
  const itemImage = product?.image || product?.imageUrl || '';
  const itemEmoji = product?.emoji || '🛍️';

  if (cartButton) {
    cartButton.classList.remove('cart-pop');
    void cartButton.offsetWidth;
    cartButton.classList.add('cart-pop');
  }
  if (cartCount) {
    cartCount.classList.remove('cart-pop');
    void cartCount.offsetWidth;
    cartCount.classList.add('cart-pop');
  }
  if (cartPlus) {
    cartPlus.textContent = `+${addedQty}`;
    cartPlus.classList.remove('hidden', 'cart-plus-float');
    void cartPlus.offsetWidth;
    cartPlus.classList.add('cart-plus-float');
    window.clearTimeout(triggerFloatingTrolleyNotice.plusTimer);
    triggerFloatingTrolleyNotice.plusTimer = window.setTimeout(() => {
      cartPlus.classList.add('hidden');
    }, 920);
  }

  if (floatingTrolleyCallout) {
    floatingTrolleyCallout.innerHTML = `
      <div id="floating-trolley-card" class="pointer-events-auto cursor-pointer relative rounded-2xl border border-[#cde0d4] bg-white/98 p-2.5 shadow-xl shadow-slate-900/15 backdrop-blur-xl ring-1 ring-slate-900/5">
        <div class="absolute -top-1.5 right-6 size-3 rotate-45 border-l border-t border-[#cde0d4] bg-white"></div>
        <div class="flex items-center gap-2.5">
          <div class="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50 p-1">
            ${itemImage ? `<img src="${itemImage}" alt="" class="max-h-full max-w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-base\\'>${itemEmoji}</span>';" />` : `<span class="text-base">${itemEmoji}</span>`}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[9px] font-black uppercase tracking-wider text-[#234e3b]">In Trolley · ${totalInCart} item${totalInCart === 1 ? '' : 's'} ↑</span>
              <span class="rounded-full bg-[#edf3ee] px-1.5 py-0.2 text-[9px] font-black text-[#234e3b] tabular-nums">${zar.format(runningTotal)}</span>
            </div>
            <p class="truncate text-[11px] font-black text-slate-900 mt-0.5">${escapeHtml(itemName)}</p>
            <p class="text-[9.5px] font-semibold text-slate-500">Tap to compare across all 6 stores</p>
          </div>
        </div>
      </div>
    `;
    floatingTrolleyCallout.classList.remove('hidden', 'trolley-float-out');
    floatingTrolleyCallout.classList.add('trolley-float-in');

    floatingTrolleyCallout.querySelector('#floating-trolley-card')?.addEventListener('click', () => {
      floatingTrolleyCallout.classList.add('hidden');
      routeTo('trolley');
    });

    window.clearTimeout(triggerFloatingTrolleyNotice.timer);
    window.clearTimeout(triggerFloatingTrolleyNotice.hideTimer);
    triggerFloatingTrolleyNotice.timer = window.setTimeout(() => {
      floatingTrolleyCallout.classList.remove('trolley-float-in');
      floatingTrolleyCallout.classList.add('trolley-float-out');
      triggerFloatingTrolleyNotice.hideTimer = window.setTimeout(() => {
        floatingTrolleyCallout.classList.add('hidden');
        floatingTrolleyCallout.classList.remove('trolley-float-out');
      }, 260);
    }, 2700);
  }
}

function addToCart(product, retailerId = state.retailerId, options = {}) {
  const targetRetailer = retailerId || state.retailerId || 'shoprite';
  const barcode = String(product.barcode || product.gtin).trim();
  const normalizedName = product.name || product.title || 'Grocery Item';
  const normalizedImage = product.image || product.imageUrl || '';
  const { activePrice, regularPrice } = getItemPricingForRetailer({ ...product, barcode }, targetRetailer);

  const existing = state.cart.find((item) => item.barcode === barcode);
  if (existing) {
    existing.quantity += 1;
    existing.price = activePrice;
    existing.basePrice = regularPrice;
  } else {
    state.cart.unshift({
      ...product,
      barcode,
      sku: product.sku || '',
      name: normalizedName,
      image: normalizedImage,
      rawPrice: product.price || product.promoPrice || product.basePrice || activePrice,
      price: activePrice,
      basePrice: regularPrice,
      checkedInStore: Boolean(product.checkedInStore),
      quantity: 1,
      retailerId: targetRetailer
    });
  }
  savePersistedState();
  updateCartBadge();
  if (!options.silent) {
    triggerFloatingTrolleyNotice({ ...product, name: normalizedName, image: normalizedImage }, targetRetailer, 1);
  }
  return state.cart.find((item) => item.barcode === barcode);
}

function addProductToTrolley(productOrGtin, qtyDelta = 1, retailerId = state.retailerId, showFeedbackToast = false) {
  const targetRetailer = retailerId || state.retailerId || 'shoprite';
  const raw = typeof productOrGtin === 'string'
    ? (MASTER_PRODUCTS.get(productOrGtin) || PRODUCTS.get(productOrGtin))
    : productOrGtin;
  if (!raw) return null;

  let addedRow = null;
  const count = Math.max(1, qtyDelta);
  for (let i = 0; i < count; i++) {
    addedRow = addToCart(raw, targetRetailer, { silent: i > 0 });
  }
  if (!addedRow) return null;

  automationCore.addToCartel(addedRow, targetRetailer);
  automationCore.vibrateProductAdded();
  playBeepSound();
  if (showFeedbackToast) {
    showToast(`📳 Added (${addedRow.quantity}×): ${addedRow.name.slice(0, 28)} · ${zar.format(addedRow.price)}`);
  }
  return addedRow;
}

function changeCartItemQty(barcode, delta, retailerId = state.retailerId) {
  const code = String(barcode).trim();
  const existing = state.cart.find((item) => item.barcode === code);
  if (!existing) {
    return delta > 0 ? addProductToTrolley(code, delta, retailerId, true) : null;
  }
  const nextQty = existing.quantity + delta;
  if (nextQty <= 0) {
    removeCartItem(code);
    return null;
  }
  existing.quantity = nextQty;
  savePersistedState();
  updateCartBadge();
  if (delta > 0) {
    automationCore.vibrateProductAdded();
    playBeepSound();
  }
  return existing;
}

function removeCartItem(barcode) {
  state.cart = state.cart.filter((item) => item.barcode !== String(barcode));
  savePersistedState();
  updateCartBadge();
  render();
}

function updateCartBadge() {
  const totalCount = getItemCount();
  const runningTotal = getPayableTotal(state.retailerId);

  if (cartCount) {
    cartCount.textContent = totalCount;
    cartCount.classList.toggle('hidden', totalCount === 0);
  }
  if (cartTotalEl) {
    cartTotalEl.classList.toggle('hidden', totalCount === 0);
    animateCartTotalDisplay(totalCount === 0 ? 0 : runningTotal);
  }
  if (cartButton) {
    const isTrolleyActive = state.route === 'trolley' || state.route === 'cartel';
    cartButton.classList.toggle('bg-slate-900', isTrolleyActive);
    cartButton.classList.toggle('text-white', isTrolleyActive);
    cartButton.classList.toggle('ring-slate-900', isTrolleyActive);
    cartButton.classList.toggle('bg-white', !isTrolleyActive);
    cartButton.classList.toggle('text-slate-800', !isTrolleyActive);
    cartButton.classList.toggle('ring-stone-200/90', !isTrolleyActive);
  }
}

function toggleGlobalSearchDrawer(forceState) {
  state.globalSearchOpen = typeof forceState === 'boolean' ? forceState : !state.globalSearchOpen;
  if (searchButton) {
    searchButton.classList.toggle('bg-slate-900', state.globalSearchOpen);
    searchButton.classList.toggle('text-white', state.globalSearchOpen);
    searchButton.classList.toggle('ring-slate-900', state.globalSearchOpen);
    searchButton.classList.toggle('bg-stone-100/90', !state.globalSearchOpen);
    searchButton.classList.toggle('text-slate-700', !state.globalSearchOpen);
  }
  renderGlobalSearchDrawer(true);
}

function renderGlobalSearchDrawer(shouldFocus = false) {
  if (!globalSearchDrawer) return;
  if (!state.globalSearchOpen) {
    globalSearchDrawer.classList.add('hidden');
    globalSearchDrawer.innerHTML = '';
    return;
  }
  globalSearchDrawer.classList.remove('hidden');
  const q = (state.globalSearchQuery || '').trim();
  const matches = q
    ? searchCatalogProducts(q).slice(0, 8)
    : Array.from(MASTER_PRODUCTS.values()).slice(0, 6);

  globalSearchDrawer.innerHTML = `
    <div class="rounded-2xl border border-stone-200 bg-white p-2.5 shadow-lg">
      <div class="relative flex items-center gap-2">
        <span class="pl-2 text-sm text-slate-400">🔍</span>
        <input
          id="global-header-search-input"
          type="text"
          value="${escapeHtml(state.globalSearchQuery)}"
          placeholder="Search 317+ Shoprite & Market items (Milk, Bread, Rice, Nappies, 600...)..."
          class="h-9 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none"
        />
        ${state.globalSearchQuery ? `<button id="clear-global-search" type="button" class="rounded-lg px-2 py-1 text-[10px] font-black text-slate-400 hover:text-slate-700">Clear</button>` : ''}
        <button id="close-global-search" type="button" class="rounded-xl bg-stone-100 px-2.5 py-1 text-[10px] font-black text-slate-600 hover:bg-stone-200">Done</button>
      </div>

      <div class="mt-2 max-h-64 space-y-1.5 overflow-y-auto border-t border-stone-100 pt-2">
        <p class="px-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400">${q ? `Matching Products (${matches.length})` : 'Quick Add Popular Staples'}</p>
        ${matches.length ? matches.map((p) => {
          const gtin = p.gtin || p.barcode;
          const zp = p.deal || getZonePrice(state.pricingZoneId, state.retailerId, gtin);
          const price = zp.activePrice ?? ((zp.promoPrice && zp.promoPrice < zp.regularPrice) ? zp.promoPrice : zp.regularPrice);
          const inCart = state.cart.find((c) => c.barcode === gtin);
          return `
            <div class="flex items-center justify-between gap-2.5 rounded-xl bg-stone-50/80 p-2 hover:bg-stone-100/80 transition">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="size-9 shrink-0 rounded-lg bg-white border border-stone-200/70 p-0.5 flex items-center justify-center overflow-hidden">
                  <img src="${p.imageUrl || p.image}" alt="" class="max-h-full max-w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-base\\'>${p.emoji || '🛍️'}</span>';" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-black text-slate-900">${escapeHtml(p.title || p.name)}</p>
                  <p class="text-[10px] font-semibold text-slate-500">${escapeHtml(p.weight || '1 unit')} &middot; <strong class="text-slate-800">${zar.format(price)}</strong></p>
                </div>
              </div>
              <button type="button" data-global-search-add="${gtin}" class="shrink-0 rounded-xl bg-[#234e3b] px-3 py-1.5 text-[10px] font-black text-white shadow-2xs hover:bg-[#1b3d2e] active:scale-95 transition">
                ${inCart ? `🛒 ${inCart.quantity} (+1)` : '+ Trolley'}
              </button>
            </div>
          `;
        }).join('') : `
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-2.5 text-xs gap-2">
            <span class="text-slate-500 truncate">Not listed? Add "<strong>${escapeHtml(state.globalSearchQuery)}</strong>" or scan shelf tag</span>
            <div class="flex shrink-0 gap-1.5">
              <button id="global-ocr-tag-btn" type="button" class="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white">🏷️ OCR Tag</button>
              <button id="global-add-custom-btn" type="button" class="rounded-xl bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white">+ Custom</button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  const input = globalSearchDrawer.querySelector('#global-header-search-input');
  if (shouldFocus && input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  input?.addEventListener('input', (e) => {
    state.globalSearchQuery = e.target.value;
    if (state.route === 'market') {
      state.catalogSearch = e.target.value;
      renderMarket();
    }
    renderGlobalSearchDrawer(true);
  });

  globalSearchDrawer.querySelector('#clear-global-search')?.addEventListener('click', () => {
    state.globalSearchQuery = '';
    if (state.route === 'market') {
      state.catalogSearch = '';
      renderMarket();
    }
    renderGlobalSearchDrawer(true);
  });

  globalSearchDrawer.querySelector('#close-global-search')?.addEventListener('click', () => {
    toggleGlobalSearchDrawer(false);
  });

  globalSearchDrawer.querySelectorAll('[data-global-search-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gtin = btn.dataset.globalSearchAdd;
      const prod = MASTER_PRODUCTS.get(gtin) || PRODUCTS.get(gtin);
      if (!prod) return;
      addToCart({
        barcode: gtin,
        sku: prod.sku || '',
        name: prod.title || prod.name,
        weight: prod.weight,
        category: prod.category,
        image: prod.imageUrl || prod.image,
        emoji: prod.emoji
      }, state.retailerId);
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(25);
      render();
      renderGlobalSearchDrawer(false);
    });
  });

  globalSearchDrawer.querySelector('#global-ocr-tag-btn')?.addEventListener('click', () => {
    toggleGlobalSearchDrawer(false);
    openCrowdsourceModal('');
  });

  globalSearchDrawer.querySelector('#global-add-custom-btn')?.addEventListener('click', () => {
    const customName = state.globalSearchQuery.trim();
    if (!customName) return;
    const prefix12 = `20${String(Date.now()).slice(-5)}01999`;
    const validEan13 = `${prefix12}${computeGs1CheckDigit(prefix12)}`;
    const customProd = {
      barcode: validEan13,
      gtin: validEan13,
      name: customName,
      title: customName,
      weight: '1 unit',
      category: 'Food Cupboard & Pantry',
      price: 19.99,
      basePrice: 22.99,
      emoji: '🛍️'
    };
    PRODUCTS.set(validEan13, customProd);
    addToCart(customProd, state.retailerId);
    state.globalSearchQuery = '';
    playBeepSound();
    render();
    renderGlobalSearchDrawer(true);
  });
}

function render() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.route === state.route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  const zone = getActiveZone();
  if ((state.route === 'cartel' || state.route === 'trolley') && getRetailer()) {
    headerSubtitle.textContent = `${getRetailer().name} · Trolley Comparison`;
  } else if (state.route === 'tracker' && state.order) {
    headerSubtitle.textContent = `Order #${state.order.id} · Live`;
  } else if (state.route === 'tracker' && (state.pastReceipts || []).length) {
    headerSubtitle.textContent = `Digital POS Slips (${state.pastReceipts.length})`;
  } else if (state.route === 'market') {
    headerSubtitle.textContent = state.storeConfirmed
      ? `${getActiveStore('shoprite').name}`
      : `Open Market · ${zone.kind === 'town' ? zone.name : zone.city}`;
  } else if (state.route === 'savings') {
    headerSubtitle.textContent = 'Savings & Coupons';
  } else {
    headerSubtitle.textContent = 'Retail, reimagined';
  }
  if (state.route === 'market') renderMarket();
  if (state.route === 'trolley' || state.route === 'cartel') renderCartel();
  if (state.route === 'tracker') renderTracker();
  if (state.route === 'savings') renderSavings();
  updateCartBadge();
}

// ==========================================
// UNIFIED TROLLEY STORE COMPARISON ENGINE
// ==========================================

function calculateTrolleyComparison() {
  if (!state.cart.length) {
    return { storeTotals: [], cheapest: null, mostExpensive: null, maxSavings: 0 };
  }

  const results = Object.values(RETAILERS).map((ret) => {
    const total = getPayableTotal(ret.id);
    const builtInSav = getCurrentSavings(ret.id);
    return {
      retailerId: ret.id,
      retailer: ret,
      total: Math.round(total * 100) / 100,
      savings: Math.round(builtInSav * 100) / 100
    };
  });

  results.sort((a, b) => a.total - b.total);
  const cheapest = results[0];
  const mostExpensive = results[results.length - 1];
  const maxSavings = Math.max(0, Math.round((mostExpensive.total - cheapest.total) * 100) / 100);

  return { storeTotals: results, cheapest, mostExpensive, maxSavings };
}

// ==========================================
// UNIFIED OPEN MARKET CATALOG (317 VERIFIED SKUs · 12 AISLES · PURE #FFFFFF PACKSHOTS)
// ==========================================

const SA_STAPLE_BARGAINS = [
  { gtin: '6001707771105', name: 'White Star Maize 2.5kg', store: 'Shoprite', price: 35.49 },
  { gtin: '6001001271110', name: 'Ritebrand Milk 1L', store: 'Shoprite', price: 18.99 },
  { gtin: '6001253010178', name: 'Albany White Bread 700g', store: 'Shoprite', price: 14.99 },
  { gtin: '6001231000191', name: 'Tastic Rice 2kg', store: 'Shoprite', price: 41.99 },
  { gtin: '6001582051095', name: 'Excella Oil 5L', store: 'Shoprite', price: 160.49 }
];

function renderProductCard(product, zone) {
  const priceData = getZonePrice(zone.id, state.retailerId, product.gtin);
  const hasPromo = Boolean(priceData.promoPrice && priceData.promoPrice < priceData.regularPrice);
  const activePrice = priceData.activePrice ?? (hasPromo ? priceData.promoPrice : priceData.regularPrice);
  const savings = hasPromo ? (priceData.regularPrice - activePrice) : 0;
  const unitPrice = formatUnitPrice(activePrice, product.weight);

  const inCartItem = state.cart.find((i) => i.barcode === product.gtin);
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  return `
    <div data-select-catalog-product="${product.gtin}" class="market-product-card cursor-pointer group relative flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-3 shadow-2xs transition-all duration-200 hover:border-stone-300 hover:shadow-sm">
      <div>
        <!-- Pure #FFFFFF Studio Packshot Container with Direct 1-Tap Trolley Control -->
        <div class="relative w-full aspect-square overflow-hidden rounded-2xl bg-white border border-stone-100 p-2 pb-10 flex items-center justify-center">
          <img
            src="${product.imageUrl}"
            alt="${escapeHtml(product.title)}"
            loading="lazy"
            class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
            onerror="this.onerror=null;this.parentElement.querySelector('img')?.remove();this.parentElement.insertAdjacentHTML('afterbegin','<span class=\\'grid size-full place-items-center text-3xl\\'>${product.emoji || '🛍️'}</span>');"
          />

          ${hasPromo ? `
            <span class="pointer-events-none absolute top-2 right-2 rounded-md bg-[#234e3b] px-1.5 py-0.5 text-[7.5px] font-black text-white shadow-2xs">
              -${Math.round((savings / priceData.regularPrice) * 100)}%
            </span>
          ` : ''}

          <!-- Direct 1-Tap Trolley Action on Product Image -->
          <div class="absolute inset-x-2 bottom-2 z-10 flex items-center justify-center">
            ${inCartQty > 0 ? `
              <div class="flex w-full items-center justify-between rounded-xl bg-[#234e3b] px-1.5 py-1 text-white shadow-md">
                <button type="button" data-card-dec-trolley="${product.gtin}" class="grid size-6 place-items-center rounded-lg bg-white/15 text-xs font-black hover:bg-white/25 active:scale-90 transition" aria-label="Remove one ${escapeHtml(product.title)}">&minus;</button>
                <span class="text-[10px] font-black tabular-nums">🛒 ${inCartQty} in Trolley</span>
                <button type="button" data-card-add-trolley="${product.gtin}" class="grid size-6 place-items-center rounded-lg bg-white text-xs font-black text-[#234e3b] hover:bg-stone-100 active:scale-90 transition" aria-label="Add one more ${escapeHtml(product.title)}">+</button>
              </div>
            ` : `
              <button
                type="button"
                data-card-add-trolley="${product.gtin}"
                class="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#234e3b] px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#1b3d2e] active:scale-95"
                title="Add directly to Trolley"
              >
                <span>+ Add to Trolley</span>
              </button>
            `}
          </div>
        </div>

        <!-- Product Details -->
        <div class="mt-2.5">
          <div class="flex items-center justify-between gap-1">
            <span class="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">${escapeHtml(product.brand)}</span>
            <span class="shrink-0 rounded bg-stone-100 px-1.5 py-0.2 text-[8px] font-bold text-slate-500">${escapeHtml((product.subCategory || product.category || '').split(' ')[0])}</span>
          </div>
          <h4 class="text-xs font-black text-slate-900 line-clamp-2 leading-snug mt-0.5">${escapeHtml(product.title)}</h4>
          <div class="flex items-center justify-between mt-0.5">
            <p class="text-[10px] text-slate-400 font-semibold">${escapeHtml(product.weight || '1 unit')}</p>
            ${unitPrice ? `<span class="text-[8.5px] font-bold text-slate-400 font-mono">${unitPrice}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Clean Market Price Row -->
      <div class="mt-2.5 border-t border-stone-100 pt-2 flex items-baseline justify-between gap-1">
        <span class="text-sm font-black text-slate-900 tabular-nums">${zar.format(activePrice)}</span>
        ${hasPromo ? `
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-slate-400 line-through">${zar.format(priceData.regularPrice)}</span>
            <span class="rounded-md bg-[#edf3ee] px-1.5 py-0.2 text-[8px] font-black text-[#234e3b]">
              -${zar.format(savings)}
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderMarket() {
  const zone = getActiveZone();
  const activeShoprite = getActiveStore('shoprite');
  const linkedXtra = loadXtraSavingsCard();
  const searchQuery = (state.catalogSearch || '').toLowerCase().trim();
  const selectedCat = state.catalogCategory || 'all';
  const allProducts = Array.from(PRODUCTS.values());

  let filteredProducts = allProducts.filter((product) => {
    const matchesCategory = selectedCat === 'all' || product.category === selectedCat;
    if (!matchesCategory) return false;
    if (!searchQuery) return true;

    const hay = [
      product.title || product.name || '',
      product.brand || '',
      product.gtin || product.barcode || '',
      product.sku || '',
      product.subCategory || '',
      ...(product.searchKeywords || [])
    ].join(' ').toLowerCase();
    return searchQuery.split(/\s+/).every((tk) => hay.includes(tk));
  });

  if (state.catalogSort === 'price-asc') {
    filteredProducts.sort((a, b) => {
      const pA = getZonePrice(zone.id, state.retailerId, a.gtin || a.barcode);
      const pB = getZonePrice(zone.id, state.retailerId, b.gtin || b.barcode);
      return (pA.activePrice || pA.regularPrice) - (pB.activePrice || pB.regularPrice);
    });
  } else if (state.catalogSort === 'savings-desc') {
    filteredProducts.sort((a, b) => {
      const pA = getZonePrice(zone.id, state.retailerId, a.gtin || a.barcode);
      const pB = getZonePrice(zone.id, state.retailerId, b.gtin || b.barcode);
      return (pB.savings || 0) - (pA.savings || 0);
    });
  } else if (state.catalogSort === 'name-asc') {
    filteredProducts.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
  }

  const totalItemsInCart = getItemCount();

  screen.innerHTML = `
    <section class="overflow-hidden pb-28">
      <!-- Unified Open Grocery Market Top Header -->
      <div class="px-5 pt-4 pb-3 border-b border-stone-200/60" style="background: linear-gradient(180deg, #eff4f0 0%, #f8faf8 58%, #fafaf9 100%)">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-[9.5px] font-black uppercase tracking-widest text-[#3b5e4c]/80">Central Grocery Catalog · 12 Aisles</p>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Open Market</h1>
          </div>
          ${totalItemsInCart > 0 ? `
            <button id="market-compare-cta" type="button" class="flex items-center gap-1.5 rounded-2xl bg-[#234e3b] px-3.5 py-2 text-[11px] font-black text-white shadow-xs hover:bg-[#1b3d2e] active:scale-95 transition">
              <span>⚖️</span>
              <span>Compare ${totalItemsInCart} in Trolley ➔</span>
            </button>
          ` : `
            <span class="rounded-2xl bg-[#e7efe9] px-3 py-1.5 text-[10px] font-black text-[#234e3b]">
              ${allProducts.length} Items Ready
            </span>
          `}
        </div>

        <!-- Town / City Area Pricing Zone Bar -->
        <button id="open-zone-selector-btn" type="button" class="mt-3 w-full rounded-2xl border border-[#d6e3da] bg-white/85 px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3 text-left hover:bg-white hover:border-[#bed3c5] active:scale-99 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-[#eaf2ec] text-sm text-[#234e3b]">📍</span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-black text-slate-900 truncate">${escapeHtml(state.storeConfirmed ? activeShoprite.name : zone.name)}</span>
                <span class="rounded-md bg-[#eaf2ec] px-1.5 py-0.2 text-[8.5px] font-bold text-[#2b5440]">
                  ${state.storeConfirmed ? `Branch #${escapeHtml(activeShoprite.retailerStoreCode)}` : (zone.kind === 'town' ? 'Town-wide pricing' : 'City-area pricing')}
                </span>
                ${state.detectedDistanceKm !== null ? `<span class="text-[8.5px] font-mono font-bold text-slate-400">${state.detectedDistanceKm} km</span>` : ''}
              </div>
              <p class="text-[10px] text-slate-500 truncate mt-0.5">
                Pick items freely — compare total across all 6 retailers or scan at Shoprite POS till
              </p>
            </div>
          </div>
          <span class="shrink-0 rounded-xl bg-stone-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
            ${zone.kind === 'town' ? 'Town ▾' : 'Area ▾'}
          </span>
        </button>

        <!-- In-Store Shoprite POS Quick Action Strip (Scale PLU · 80 Branches · Xtra Card · On-Device OCR) -->
        <div class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <button id="market-open-shoprite-branches" type="button" class="shrink-0 flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-[10.5px] font-black text-[#e11d2e] shadow-2xs hover:bg-rose-50 active:scale-95 transition">
            <span>🏪</span><span>80 Shoprite Stores</span>
          </button>
          <button id="market-open-scale-plu" type="button" class="shrink-0 flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-[10.5px] font-black text-amber-950 shadow-2xs hover:bg-amber-100 active:scale-95 transition">
            <span>⚖️</span><span>Loose / Scale PLU</span>
          </button>
          <button id="market-open-xtra-card" type="button" class="shrink-0 flex items-center gap-1 rounded-xl border ${linkedXtra ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-stone-200 bg-white text-slate-700'} px-2.5 py-1.5 text-[10.5px] font-black shadow-2xs active:scale-95 transition">
            <span>💳</span><span>${linkedXtra ? 'Xtra Card ✓' : 'Link Xtra Card'}</span>
          </button>
          <button id="market-open-tag-ocr" type="button" class="shrink-0 flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[10.5px] font-black text-slate-700 shadow-2xs hover:bg-stone-100 active:scale-95 transition">
            <span>🏷️</span><span>Shelf Tag OCR</span>
          </button>
        </div>
      </div>

      <!-- Softly Blended SA Staples Deal Ticker -->
      <div class="px-5 pt-2.5">
        <div class="rounded-2xl bg-[#eef3ef]/90 border border-[#d6e3da] p-2 shadow-2xs flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            <span class="shrink-0 rounded-lg bg-[#2b5440]/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#234e3b]">
              Popular
            </span>
            ${SA_STAPLE_BARGAINS.map((b) => `
              <button
                type="button"
                data-staple-search="${b.name.split(' ')[0]}"
                class="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/90 border border-stone-200/70 px-2.5 py-1 text-[9.5px] font-bold text-slate-700 hover:bg-white transition active:scale-95"
              >
                <span>${escapeHtml(b.name)}</span>
                <span class="font-black text-[#234e3b]">${zar.format(b.price)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Department Filter & Toolbar -->
      <div class="px-5 pt-3">
        ${state.catalogSearch ? `
          <div class="mb-3 flex items-center justify-between rounded-2xl border border-[#cfe0d5] bg-[#edf3ee]/80 px-3.5 py-2 text-xs">
            <span class="font-bold text-slate-700">Showing ${filteredProducts.length} result(s) for "<strong>${escapeHtml(state.catalogSearch)}</strong>"</span>
            <button id="clear-search-btn" type="button" class="rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-2xs">Clear ✕</button>
          </div>
        ` : ''}

        <!-- 12 Supermarket Department Icons -->
        <div class="flex items-center gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none]">
          <button type="button" data-catalog-cat="all" class="flex flex-col items-center shrink-0 group">
            <div class="size-12 rounded-2xl grid place-items-center text-xl transition shadow-2xs ${selectedCat === 'all' ? 'bg-slate-900 text-white scale-105 ring-2 ring-slate-900/15' : 'bg-white text-slate-700 border border-stone-200/90 hover:border-slate-400'}">
              🛍️
            </div>
            <span class="mt-1 text-[9.5px] font-black truncate max-w-[4.8rem] text-center ${selectedCat === 'all' ? 'text-slate-900' : 'text-slate-500'}">All (${allProducts.length})</span>
          </button>
          ${CATEGORIES.map((cat) => {
            const isCatActive = selectedCat === cat.id;
            const count = allProducts.filter((p) => p.category === cat.id).length;
            return `
              <button type="button" data-catalog-cat="${escapeHtml(cat.id)}" class="flex flex-col items-center shrink-0 group">
                <div class="size-12 rounded-2xl grid place-items-center text-xl transition shadow-2xs ${isCatActive ? 'bg-slate-900 text-white scale-105 ring-2 ring-slate-900/15' : 'bg-white text-slate-700 border border-stone-200/90 hover:border-slate-400'}">
                  ${cat.emoji}
                </div>
                <span class="mt-1 text-[9.5px] font-black truncate max-w-[4.8rem] text-center ${isCatActive ? 'text-slate-900' : 'text-slate-500'}">${escapeHtml(cat.label)} (${count})</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Shared Top Brand Filter Chips -->
        <div class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span class="shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Brands:</span>
          ${['Ritebrand', 'Freshmark', 'White Star', 'Albany', 'Clover', 'Tastic', 'Koo', 'Sunlight', 'Rama', 'Huggies'].map((b) => {
            const isBrandActive = (state.catalogSearch || '').toLowerCase() === b.toLowerCase();
            return `
              <button
                type="button"
                data-brand-filter="${b}"
                class="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold border transition ${isBrandActive ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' : 'bg-white text-slate-600 border-stone-200 hover:border-stone-300'}"
              >
                ${b}
              </button>
            `;
          }).join('')}
        </div>

        <!-- View Mode & Sort Toolbar -->
        <div class="mt-3 flex items-center justify-between gap-1.5 pt-2 border-t border-stone-200/70">
          <div class="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <button
              type="button"
              data-toggle-view-mode
              class="shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border border-stone-200 bg-white text-slate-700 hover:border-stone-300 transition active:scale-95"
            >
              <span>${state.catalogViewMode === 'aisles' ? '🏬 Aisle Mode' : '▦ Grid Mode'}</span>
            </button>

            <button
              type="button"
              data-cycle-sort
              class="shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border border-stone-200 bg-white text-slate-700 hover:border-stone-300 transition active:scale-95"
            >
              <span>⇅</span>
              <span>Sort: ${state.catalogSort === 'price-asc' ? 'Low Price' : (state.catalogSort === 'savings-desc' ? 'Top Savings' : (state.catalogSort === 'name-asc' ? 'A-Z' : 'Default'))}</span>
            </button>
          </div>

          <button
            type="button"
            id="open-category-manager-btn"
            class="shrink-0 flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white hover:bg-slate-800 active:scale-95 transition shadow-2xs"
          >
            <span>🏷️</span>
            <span>All 12 Aisles</span>
          </button>
        </div>
      </div>

      <!-- Product Catalog Grid / Aisle Sections -->
      <div class="px-5 pt-3">
        ${filteredProducts.length === 0 ? `
          <div class="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-2xs">
            <span class="text-3xl">🔍</span>
            <h4 class="mt-2 text-sm font-black text-slate-900">No items found for "${escapeHtml(state.catalogSearch)}"</h4>
            <p class="mt-1 text-xs text-slate-400">Try searching another brand, open Loose Scale PLU, or snap the shelf price tag.</p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              <button id="reset-catalog-btn" type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">Reset Search</button>
              <button id="empty-ocr-tag-btn" type="button" class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">🏷️ Scan Shelf Tag</button>
            </div>
          </div>
        ` : (state.catalogViewMode === 'aisles' && selectedCat === 'all' && !searchQuery) ? `
          <div class="space-y-5">
            ${CATEGORIES.map((cat) => {
              const deptProducts = filteredProducts.filter((p) => p.category === cat.id);
              if (!deptProducts.length) return '';
              return `
                <div class="rounded-3xl bg-stone-100/70 p-3.5 border border-stone-200/80 shadow-2xs">
                  <div class="flex items-center justify-between pb-2.5 border-b border-stone-200">
                    <div class="flex items-center gap-2">
                      <span class="grid size-8 place-items-center rounded-xl bg-white text-base shadow-2xs">${cat.emoji}</span>
                      <div>
                        <h3 class="text-xs font-black text-slate-900">${escapeHtml(cat.id)}</h3>
                        <p class="text-[9.5px] text-slate-400 font-bold">${deptProducts.length} items · ${escapeHtml(cat.aisle || '')}</p>
                      </div>
                    </div>
                    <button type="button" data-catalog-cat="${escapeHtml(cat.id)}" class="rounded-lg bg-white px-2.5 py-1 text-[9.5px] font-black text-slate-800 border border-stone-200 hover:border-slate-400 active:scale-95 transition">
                      Filter Aisle ▾
                    </button>
                  </div>
                  <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    ${deptProducts.map((product) => renderProductCard(product, zone)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${filteredProducts.map((product) => renderProductCard(product, zone)).join('')}
          </div>
        `}
      </div>
    </section>`;

  bindCatalogInteractions(zone);
}

function bindCatalogInteractions(zone) {
  screen.querySelector('#market-compare-cta')?.addEventListener('click', () => routeTo('trolley'));
  screen.querySelector('#market-open-shoprite-branches')?.addEventListener('click', () => openStoreBranchModal(false));
  screen.querySelector('#market-open-scale-plu')?.addEventListener('click', openLooseScalePluHelper);
  screen.querySelector('#market-open-xtra-card')?.addEventListener('click', openShopriteXtraCardHelper);
  screen.querySelector('#market-open-tag-ocr')?.addEventListener('click', () => openCrowdsourceModal(''));
  screen.querySelector('#empty-ocr-tag-btn')?.addEventListener('click', () => openCrowdsourceModal(''));

  screen.querySelector('#open-zone-selector-btn')?.addEventListener('click', () => {
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(20);
    openPricingZoneModal();
  });

  screen.querySelectorAll('[data-staple-search]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.catalogSearch = btn.dataset.stapleSearch;
      state.globalSearchQuery = state.catalogSearch;
      playBeepSound();
      renderMarket();
    });
  });

  screen.querySelector('#clear-search-btn')?.addEventListener('click', () => {
    state.catalogSearch = '';
    state.globalSearchQuery = '';
    renderMarket();
    if (state.globalSearchOpen) renderGlobalSearchDrawer(false);
  });

  screen.querySelector('#reset-catalog-btn')?.addEventListener('click', () => {
    state.catalogSearch = '';
    state.globalSearchQuery = '';
    state.catalogCategory = 'all';
    renderMarket();
  });

  screen.querySelector('[data-toggle-view-mode]')?.addEventListener('click', () => {
    state.catalogViewMode = state.catalogViewMode === 'aisles' ? 'grid' : 'aisles';
    playBeepSound();
    renderMarket();
  });

  screen.querySelector('[data-cycle-sort]')?.addEventListener('click', () => {
    const sorts = ['default', 'price-asc', 'savings-desc', 'name-asc'];
    state.catalogSort = sorts[(sorts.indexOf(state.catalogSort) + 1) % sorts.length];
    playBeepSound();
    renderMarket();
  });

  screen.querySelector('#open-category-manager-btn')?.addEventListener('click', () => {
    const activeShoprite = getActiveStore('shoprite');
    openAllDepartmentsModal({
      modalRoot,
      departments: SHOPRITE_RETAIL_DEPARTMENTS,
      allProducts: Array.from(PRODUCTS.values()),
      selectedCategory: state.catalogCategory,
      activeStore: activeShoprite,
      zar,
      getStorePrice: (p, sId) => getStorePrice(sId, p.gtin || p.barcode),
      onSelectCategory: (catId) => {
        state.catalogCategory = catId;
        playBeepSound();
        renderMarket();
      }
    });
    playBeepSound();
  });

  screen.querySelectorAll('[data-catalog-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.catalogCategory = btn.dataset.catalogCat;
      playBeepSound();
      renderMarket();
    });
  });

  screen.querySelectorAll('[data-brand-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const brand = btn.dataset.brandFilter;
      state.catalogSearch = (state.catalogSearch || '').toLowerCase() === brand.toLowerCase() ? '' : brand;
      state.globalSearchQuery = state.catalogSearch;
      playBeepSound();
      renderMarket();
    });
  });

  screen.querySelectorAll('[data-card-add-trolley]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gtin = btn.dataset.cardAddTrolley;
      const product = MASTER_PRODUCTS.get(gtin) || PRODUCTS.get(gtin);
      if (!product) return;

      addToCart({
        barcode: gtin,
        sku: product.sku || '',
        name: product.title || product.name,
        weight: product.weight || '1 unit',
        category: product.category || 'Food Cupboard & Pantry',
        image: product.imageUrl || product.image,
        emoji: product.emoji || '🛍️'
      }, state.retailerId);
      automationCore.addToCartel({ barcode: gtin, name: product.title || product.name }, state.retailerId);
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate([35, 20, 35]);
      renderMarket();
    });
  });

  screen.querySelectorAll('[data-card-dec-trolley]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gtin = btn.dataset.cardDecTrolley;
      const existing = state.cart.find((i) => i.barcode === gtin);
      if (!existing) return;
      if (existing.quantity <= 1) {
        removeCartItem(gtin);
      } else {
        existing.quantity -= 1;
        savePersistedState();
        updateCartBadge();
        renderMarket();
      }
    });
  });

  // Tap card -> opens Product Quick-View, Scannable GS1 Barcode & 9-Province Regional Price Sheet
  screen.querySelectorAll('[data-select-catalog-product]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const gtin = card.dataset.selectCatalogProduct;
      const product = MASTER_PRODUCTS.get(gtin) || PRODUCTS.get(gtin);
      if (!product) return;
      const activeShoprite = getActiveStore('shoprite');
      const normalized = normalizeProductForStore(product, state.retailerId);
      openProductQuickViewModal({
        modalRoot,
        state,
        product: normalized,
        activeStore: activeShoprite,
        zar,
        getStorePrice: (p, sId) => getStorePrice(sId, p.gtin || p.barcode),
        onAddToTrolley: (code) => {
          addProductToTrolley(code, 1, state.retailerId, false);
          renderMarket();
        },
        onChangeQty: (code, delta) => {
          changeCartItemQty(code, delta, state.retailerId);
          renderMarket();
        },
        onAddToList: (normProd) => {
          addProductToTrolley(normProd, 1, state.retailerId, false);
          renderMarket();
        },
        getCartQty: (code) => {
          const row = state.cart.find((c) => c.barcode === code);
          return row ? row.quantity : 0;
        }
      });
    });
  });
}

function triggerLiveZoneGpsMatch({ onComplete } = {}) {
  if (!('geolocation' in navigator)) {
    state.gpsStatus = 'manual';
    showToast('Geolocation not supported — select your town or city area.');
    if (onComplete) onComplete(false);
    return;
  }
  state.gpsStatus = 'locating';
  if (onComplete) onComplete('locating');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      state.userCoords = { latitude, longitude };
      const { zone, distanceKm } = findClosestZone(latitude, longitude);
      state.pricingZoneId = zone.id;
      state.detectedDistanceKm = distanceKm;
      state.gpsStatus = 'matched';
      STORE_PRICES.clear();
      savePersistedState();
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate([35, 20, 35]);
      showToast(`📍 Matched to ${zone.name} (${distanceKm} km)`);
      if (onComplete) onComplete(true, zone);
    },
    () => {
      state.gpsStatus = 'manual';
      showToast('Live GPS unavailable — pick your town or city area.');
      if (onComplete) onComplete(false);
    },
    { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
  );
}

function openPricingZoneModal() {
  state.overlay = 'pricing-zone';
  const currentZone = getActiveZone();
  const townZones = PRICING_ZONES.filter((z) => z.kind === 'town');
  const metroZones = PRICING_ZONES.filter((z) => z.kind === 'metro');

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[88vh] w-full max-w-lg overflow-hidden rounded-[2.25rem] bg-stone-50 p-6 shadow-2xl border border-stone-200/90">
        <div class="flex items-center justify-between pb-3 border-b border-stone-200/80">
          <div>
            <h3 class="text-base font-black text-slate-900">Select Town, City Area or Branch</h3>
            <p class="text-xs text-slate-500">Retailer sales apply town-wide, by city area, or exact Shoprite branch</p>
          </div>
          <button id="close-zone-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-stone-200/80 text-xs font-bold text-slate-600 hover:bg-stone-300/70">✕</button>
        </div>

        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button id="auto-gps-zone-btn" type="button" class="flex items-center justify-between rounded-2xl bg-[#234e3b] px-3.5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1b3d2e] active:scale-98 transition">
            <span>📍 Match Live GPS Area</span>
            <span class="text-[9px] uppercase bg-white/15 px-1.5 py-0.5 rounded">GPS</span>
          </button>
          <button id="zone-pick-shoprite-branch-btn" type="button" class="flex items-center justify-between rounded-2xl bg-[#e11d2e] px-3.5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-red-700 active:scale-98 transition">
            <span>🏪 Pick Exact Shoprite (80)</span>
            <span class="text-[9px] uppercase bg-white/15 px-1.5 py-0.5 rounded">SA</span>
          </button>
        </div>

        <div class="mt-4 space-y-4 max-h-[54vh] overflow-y-auto pr-1">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">🏘️ Towns (Shared across all town branches)</p>
            <div class="grid grid-cols-2 gap-2">
              ${townZones.map((z) => {
                const isCurrent = z.id === currentZone.id && !state.storeConfirmed;
                return `
                  <button type="button" data-pick-zone="${z.id}" class="rounded-2xl border-2 p-3 text-left transition active:scale-98 ${isCurrent ? 'border-[#234e3b] bg-[#eaf2ec]' : 'border-stone-200/90 bg-white hover:border-stone-300'}">
                    <div class="flex items-center justify-between gap-1">
                      <h4 class="text-xs font-black text-slate-900 truncate">${escapeHtml(z.name)}</h4>
                      ${isCurrent ? '<span class="text-[9px] font-black text-[#234e3b]">●</span>' : ''}
                    </div>
                    <p class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(z.province)} · Town-wide</p>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">🏙️ Big Cities (Shared across metro area / section)</p>
            <div class="space-y-2">
              ${metroZones.map((z) => {
                const isCurrent = z.id === currentZone.id && !state.storeConfirmed;
                return `
                  <button type="button" data-pick-zone="${z.id}" class="w-full flex items-center justify-between rounded-2xl border-2 p-3 text-left transition active:scale-98 ${isCurrent ? 'border-[#234e3b] bg-[#eaf2ec]' : 'border-stone-200/90 bg-white hover:border-stone-300'}">
                    <div class="min-w-0">
                      <h4 class="text-xs font-black text-slate-900 truncate">${escapeHtml(z.city)} · ${escapeHtml(z.section)}</h4>
                      <p class="text-[10px] text-slate-500 truncate">${escapeHtml(z.province)} · Area-wide promotions</p>
                    </div>
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-black ${isCurrent ? 'bg-[#234e3b] text-white' : 'bg-stone-100 text-slate-600'}">
                      ${isCurrent ? 'Active' : 'Select'}
                    </span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-zone-modal-btn')?.addEventListener('click', closeModal);
  modalRoot.querySelector('#zone-pick-shoprite-branch-btn')?.addEventListener('click', () => {
    closeModal();
    openStoreBranchModal(false);
  });

  modalRoot.querySelectorAll('[data-pick-zone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.pricingZoneId = btn.dataset.pickZone;
      state.storeConfirmed = false;
      state.detectedDistanceKm = null;
      state.gpsStatus = 'manual';
      STORE_PRICES.clear();
      savePersistedState();
      closeModal();
      playBeepSound();
      showToast(`📍 Pricing set to ${getActiveZone().name}`);
      render();
    });
  });

  modalRoot.querySelector('#auto-gps-zone-btn')?.addEventListener('click', () => {
    triggerLiveZoneGpsMatch({
      onComplete: (ok) => {
        if (ok) {
          closeModal();
          render();
        }
      }
    });
  });
}

// ==========================================
// MERGED UNIFIED TROLLEY + 6-STORE COMPARISON BAROMETER + SHOPRITE POS READY
// ==========================================

function renderCartel() {
  const retailer = getRetailer();
  const theme = RETAILER_THEMES[retailer.id] || RETAILER_THEMES.shoprite;
  const zone = getActiveZone();
  const activeShoprite = getActiveStore('shoprite');
  const linkedXtra = loadXtraSavingsCard();
  const activeRetailerCart = getRetailerCart(state.retailerId);
  const activeItemCount = getItemCount();
  const activeTotal = getPayableTotal(state.retailerId);
  const activeSavings = getCurrentSavings(state.retailerId);
  const comparison = calculateTrolleyComparison();
  const cheapestStore = comparison.cheapest;
  const isCheapestSelected = cheapestStore && cheapestStore.retailerId === retailer.id;
  const switchPotential = cheapestStore ? Math.max(0, Math.round((activeTotal - cheapestStore.total) * 100) / 100) : 0;

  const budgetCap = Math.max(50, Number(state.instoreBudget) || 500);
  const budgetPct = Math.min(100, Math.round((activeTotal / budgetCap) * 100));
  const isOverBudget = activeTotal > budgetCap;

  screen.innerHTML = `
    <section class="pb-44">
      <!-- Integrated Retailer-Themed Store Comparison Barometer Hero -->
      <div class="relative overflow-hidden rounded-b-[2.25rem] px-5 pb-6 pt-4 text-white shadow-xl transition-all duration-300" style="background: ${theme.heroGradient}">
        <!-- Top Utility Row -->
        <div class="flex items-center justify-between gap-2">
          <button id="trolley-back-market-btn" type="button" class="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md hover:bg-white/25 active:scale-95 transition">
            <span>←</span><span>Market</span>
          </button>
          <button id="trolley-zone-btn" type="button" class="inline-flex items-center gap-1 rounded-xl bg-black/25 px-2.5 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur-md hover:bg-black/35 transition max-w-[11rem] truncate">
            <span>📍</span><span class="truncate">${escapeHtml(retailer.id === 'shoprite' && state.storeConfirmed ? activeShoprite.name : zone.name)} ▾</span>
          </button>
          <button id="trolley-search-add-btn" type="button" class="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md hover:bg-white/25 active:scale-95 transition">
            <span>+ Add Item</span>
          </button>
        </div>

        <!-- Active Store Spotlight -->
        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="grid size-14 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-lg border border-white/30 overflow-hidden">
              <img src="${retailer.logoUrl}" alt="${retailer.name}" class="h-full w-full object-contain" onerror="this.parentElement.style.background='${retailer.color}';this.parentElement.innerHTML='<span class=\\'font-black text-white text-base\\'>${retailer.initials}</span>';" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">${retailer.loyalty}</span>
                ${activeRetailerCart.length > 0 && isCheapestSelected ? `
                  <span class="rounded-full bg-emerald-400/25 border border-emerald-300/40 px-2 py-0.5 text-[9px] font-black text-emerald-100">🥇 Lowest Basket</span>
                ` : ''}
              </div>
              <h1 class="mt-1 text-2xl font-black tracking-tight truncate">${retailer.name} Trolley</h1>
              <p class="text-[11px] font-medium text-white/80">${activeItemCount} item${activeItemCount === 1 ? '' : 's'} &middot; ${activeSavings > 0 ? `Saving ${zar.format(activeSavings)} on promos` : retailer.tagline}</p>
            </div>
          </div>

          <div class="text-right shrink-0">
            <p class="text-[9.5px] font-black uppercase tracking-wider text-white/70">Store Total</p>
            <p class="text-2xl font-black tracking-tight tabular-nums">${zar.format(activeTotal)}</p>
          </div>
        </div>

        <!-- In-Store POS Quick Strip (Scale PLU · Xtra Savings Card · Shelf Tag OCR · Budget Guardrail) -->
        <div class="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <button id="trolley-open-scale-plu" type="button" class="shrink-0 rounded-xl bg-amber-400/95 px-2.5 py-1.5 text-[10.5px] font-black text-slate-950 shadow-xs active:scale-95 transition">
            ⚖️ Loose / Scale PLU
          </button>
          ${retailer.id === 'shoprite' ? `
            <button id="trolley-open-xtra-card" type="button" class="shrink-0 rounded-xl ${linkedXtra ? 'bg-emerald-400/25 border border-emerald-300/40 text-emerald-50' : 'bg-white/15 border border-white/25 text-white'} px-2.5 py-1.5 text-[10.5px] font-black active:scale-95 transition">
              💳 ${linkedXtra ? 'Xtra Card Linked ✓' : 'Link Xtra Card'}
            </button>
          ` : ''}
          <button id="trolley-open-tag-ocr" type="button" class="shrink-0 rounded-xl bg-white/15 border border-white/20 px-2.5 py-1.5 text-[10.5px] font-black text-white active:scale-95 transition">
            🏷️ Shelf Tag OCR
          </button>
          ${activeRetailerCart.length > 0 ? `
            <button id="trolley-clear-all-btn" type="button" class="shrink-0 rounded-xl bg-black/25 px-2.5 py-1.5 text-[10px] font-black text-white/80 hover:text-white active:scale-95 transition">
              Clear
            </button>
          ` : ''}
        </div>

        <!-- Live In-Store Budget Guardrail -->
        <div class="mt-2.5 rounded-2xl bg-black/20 px-3 py-2 text-white">
          <div class="flex items-center justify-between text-[10.5px] font-bold">
            <span>
              🎯 Trolley Budget: <strong class="font-black">${zar.format(activeTotal)}</strong> / ${zar.format(budgetCap)}
              ${isOverBudget ? `<span class="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">Over by ${zar.format(activeTotal - budgetCap)}</span>` : ''}
            </span>
            <button id="trolley-edit-budget-btn" type="button" class="rounded-md bg-white/15 px-2 py-0.5 text-[9.5px] font-black text-white hover:bg-white/25">Set Limit</button>
          </div>
          <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div class="h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-amber-300' : 'bg-emerald-400'}" style="width:${budgetPct}%"></div>
          </div>
        </div>

        <!-- Engaged 6-Store Comparison Barometer Integrated Into Hero -->
        ${activeRetailerCart.length > 0 ? `
          <div class="mt-4 rounded-3xl p-3.5 backdrop-blur-md border border-white/15" style="background: ${theme.barometerBg}">
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center gap-1.5">
                <span class="text-xs">⚖️</span>
                <span class="text-[10px] font-black uppercase tracking-[.14em] text-white/90">Store Comparison Barometer</span>
              </div>
              ${!isCheapestSelected && switchPotential > 0 ? `
                <button type="button" data-switch-cartel-retailer="${cheapestStore.retailerId}" class="rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-black shadow-sm active:scale-95 transition" style="color: ${cheapestStore.retailer.color}">
                  Save ${zar.format(switchPotential)} at ${cheapestStore.retailer.name} ➔
                </button>
              ` : `
                <span class="text-[10px] font-bold text-emerald-200">Best store active · Spread ${zar.format(comparison.maxSavings)}</span>
              `}
            </div>

            <!-- 6 Interactive Retailer Theme Cards -->
            <div class="grid grid-cols-3 gap-2">
              ${comparison.storeTotals.map((st, rank) => {
                const isSelected = st.retailerId === retailer.id;
                const isLowest = rank === 0;
                const diff = Math.max(0, Math.round((st.total - cheapestStore.total) * 100) / 100);
                const barWidth = comparison.mostExpensive.total > 0
                  ? Math.max(35, Math.round((st.total / comparison.mostExpensive.total) * 100))
                  : 100;
                const rankBadge = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;

                return `
                  <button
                    type="button"
                    data-switch-cartel-retailer="${st.retailerId}"
                    class="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-2.5 text-left transition-all duration-200 active:scale-95 ${isSelected ? 'bg-white text-slate-950 shadow-lg ring-2 ring-white scale-[1.02]' : 'bg-white/12 text-white hover:bg-white/20 border border-white/15'}"
                  >
                    <div class="absolute inset-x-0 top-0 h-1" style="background: ${st.retailer.color}"></div>
                    <div class="flex items-center justify-between gap-1 pt-0.5">
                      <div class="size-5 shrink-0 rounded-md bg-white p-0.5 shadow-2xs overflow-hidden border border-slate-100">
                        <img src="${st.retailer.logoUrl}" alt="${st.retailer.name}" class="size-full object-contain" onerror="this.parentElement.style.background='${st.retailer.color}';this.parentElement.innerHTML='<span class=\\'text-[7px] font-black text-white\\'>${st.retailer.initials}</span>';" />
                      </div>
                      <span class="text-[9.5px] font-black ${isSelected ? 'text-slate-600' : 'text-white/80'}">${rankBadge}</span>
                    </div>

                    <p class="mt-1.5 truncate text-[10.5px] font-black ${isSelected ? 'text-slate-900' : 'text-white'}">${st.retailer.name}</p>
                    <p class="text-xs font-black tabular-nums ${isSelected ? '' : 'text-white'}" style="${isSelected ? `color:${st.retailer.color}` : ''}">${zar.format(st.total)}</p>

                    <div class="mt-1.5 h-1 w-full overflow-hidden rounded-full ${isSelected ? 'bg-slate-100' : 'bg-white/15'}">
                      <div class="h-full rounded-full transition-all duration-300" style="width:${barWidth}%; background:${isLowest ? '#10b981' : st.retailer.color}"></div>
                    </div>

                    <span class="mt-1 block text-[8.5px] font-bold ${isLowest ? (isSelected ? 'text-emerald-700 font-black' : 'text-emerald-200 font-black') : (isSelected ? 'text-slate-400' : 'text-white/65')}">
                      ${isLowest ? 'Cheapest 🎯' : `+${zar.format(diff)}`}
                    </span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Grocery Items Under Active Retailer -->
      ${activeRetailerCart.length ? cartelItems(activeRetailerCart, retailer, theme) : emptyCartel(retailer)}

      <!-- Bottom Checkout Bar (Delivery OR Sequential/Single-Code POS Till Checkout) -->
      <div class="fixed inset-x-0 bottom-[5rem] z-30 mx-auto max-w-3xl border-t border-stone-200 bg-white/95 px-5 py-3 shadow-[0_-16px_40px_-28px_rgba(15,23,42,.4)] backdrop-blur-xl">
        <div class="mb-2.5 flex items-end justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">${activeItemCount} unit${activeItemCount === 1 ? '' : 's'} under ${retailer.name} &middot; saved ${zar.format(activeSavings)}</p>
            <p class="mt-0.5 text-xs font-bold text-slate-600">Press <strong class="text-slate-900">Top Volume (+)</strong> or <strong class="text-slate-900">Next Barcode</strong> at Till</p>
          </div>
          <p class="text-2xl font-black tracking-tight tabular-nums" style="color:${retailer.color}">${zar.format(activeTotal)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="delivery-checkout" type="button" class="secondary-button min-h-12 text-xs" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>🚚 Order Delivery</span>
          </button>
          <button id="store-checkout" type="button" class="primary-button min-h-12 text-xs text-white shadow-md active:scale-95 transition" style="background:${retailer.color}" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>⚡ ${retailer.name} Till (${activeItemCount}${retailer.id === 'shoprite' && linkedXtra ? '+Xtra' : ''})</span>
          </button>
        </div>
      </div>
    </section>`;

  bindCartelInteractions();
}

function emptyCartel(retailer) {
  const quickStaples = SA_STAPLE_BARGAINS.slice(0, 4).map((b) => MASTER_PRODUCTS.get(b.gtin)).filter(Boolean);
  return `
    <div class="mx-5 mt-5 rounded-[2rem] border border-dashed border-stone-300 bg-white/80 p-6 text-center">
      <span class="mx-auto grid size-14 place-items-center rounded-2xl text-3xl" style="background:${retailer.soft}">&#128722;</span>
      <h2 class="mt-3 text-base font-black text-slate-900">Your Trolley is empty</h2>
      <p class="mt-1 text-xs leading-5 text-slate-500">Add groceries from the Open Market, scan barcodes with your phone camera, or weigh loose produce to compare all 6 retailers live.</p>

      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <button data-go-market-empty type="button" class="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm">
          Browse Open Market
        </button>
        <button data-open-camera type="button" class="rounded-xl bg-[#234e3b] px-4 py-2.5 text-xs font-black text-white shadow-sm flex items-center gap-1.5">
          <span>📷 Scan Barcode</span>
        </button>
        <button id="empty-open-scale-plu" type="button" class="rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-sm">
          ⚖️ Loose / Scale PLU
        </button>
      </div>

      <div class="mt-5 border-t border-stone-200/70 pt-4 text-left">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Quick Add Staples to Test Comparison &amp; POS Till</p>
        <div class="mt-2.5 grid grid-cols-2 gap-2">
          ${quickStaples.map((p) => `
            <button type="button" data-empty-quick-add="${p.gtin}" class="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-2 text-left hover:bg-white transition active:scale-95">
              <img src="${p.imageUrl}" alt="" class="size-8 rounded-lg object-contain bg-white p-0.5 border border-stone-100" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[10.5px] font-black text-slate-800">${escapeHtml(p.title.split(' ').slice(0, 3).join(' '))}</p>
                <p class="text-[9.5px] font-bold text-[#234e3b]">+ Add</p>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function cartelItems(items, retailer, theme) {
  const checkedCount = items.filter((i) => i.checkedInStore).length;
  return `
    <div class="px-5 pt-4 pb-2">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="size-2.5 rounded-full" style="background:${retailer.color}"></span>
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700">${retailer.name} Priced Trolley</h2>
        </div>
        <span id="scan-status" class="rounded-full px-2.5 py-0.5 text-[10px] font-black" style="background:${theme.pillBg}; color:${theme.pillText}">
          ${checkedCount}/${items.length} picked &middot; 1D EAN-13 Ready
        </span>
      </div>

      <ul class="space-y-2.5">
        ${items.map((item) => `
          <li class="relative overflow-hidden rounded-[1.4rem] bg-red-500" data-swipe-shell="${item.barcode}">
            <div class="absolute inset-y-0 right-0 flex w-24 items-center justify-center text-xs font-black text-white">Delete</div>
            <article class="product-row relative flex items-center gap-3 rounded-[1.4rem] bg-white p-3 shadow-2xs border transition" style="border-color: ${item.checkedInStore ? theme.border : 'rgba(226,232,240,0.8)'}" data-swipe-row="${item.barcode}">
              <!-- Tick-off Circle (Merged from Checklist for aisle picking) -->
              <button
                type="button"
                data-toggle-cart-picked="${item.barcode}"
                class="grid size-6 shrink-0 place-items-center rounded-full border-2 transition"
                style="${item.checkedInStore ? `background:${retailer.color}; border-color:${retailer.color}; color:#fff` : 'border-color:#cbd5e1'}"
                title="Mark picked off shelf"
                aria-label="Mark ${escapeHtml(item.name)} picked off shelf"
              >
                ${item.checkedInStore ? '<svg viewBox="0 0 24 24" class="size-3.5 fill-none stroke-current stroke-[3]"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </button>

              <div class="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-white border border-stone-100 p-1 flex items-center justify-center">
                ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-2xl\\'>${item.emoji || '🛍️'}</span>';" />` : `<span class="grid size-full place-items-center text-2xl">${item.emoji || '🛍️'}</span>`}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="truncate text-xs font-black ${item.checkedInStore ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.name)}</h3>
                  <strong class="shrink-0 text-sm font-black text-slate-900 tabular-nums">${zar.format(item.price * item.quantity)}</strong>
                </div>

                <div class="mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-semibold text-slate-400">${escapeHtml(item.weight || '1 unit')}</span>
                  <span class="rounded bg-stone-100 px-1.5 py-0.2 font-mono text-[8.5px] text-slate-500">${escapeHtml(item.barcode)}</span>
                </div>

                <div class="mt-1.5 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10.5px] font-bold text-slate-500">${zar.format(item.price)} ea</span>
                    ${item.basePrice > item.price ? `
                      <span class="text-[9.5px] text-slate-400 line-through">${zar.format(item.basePrice)}</span>
                      <span class="rounded-md px-1.5 py-0.2 text-[8px] font-black" style="background:${theme.pillBg}; color:${theme.pillText}">
                        -${zar.format((item.basePrice - item.price) * item.quantity)}
                      </span>
                    ` : ''}
                  </div>

                  <div class="flex items-center gap-1">
                    <button type="button" data-cart-qty-dec="${item.barcode}" class="grid size-7 place-items-center rounded-lg bg-stone-100 text-xs font-black text-slate-700 hover:bg-stone-200" aria-label="Decrease ${escapeHtml(item.name)}">&minus;</button>
                    <span class="min-w-5 text-center text-xs font-black text-slate-900 tabular-nums">${item.quantity}</span>
                    <button type="button" data-cart-qty-inc="${item.barcode}" class="grid size-7 place-items-center rounded-lg text-xs font-black text-white" style="background:${retailer.color}" aria-label="Increase ${escapeHtml(item.name)}">+</button>
                    <button type="button" data-remove-cart-item="${item.barcode}" class="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition" aria-label="Delete ${escapeHtml(item.name)} from trolley" title="Remove item">✕</button>
                  </div>
                </div>
              </div>
            </article>
          </li>
        `).join('')}
      </ul>
    </div>`;
}

function bindCartelInteractions() {
  screen.querySelector('#trolley-back-market-btn')?.addEventListener('click', () => routeTo('market'));
  screen.querySelector('#trolley-zone-btn')?.addEventListener('click', openPricingZoneModal);
  screen.querySelector('#trolley-search-add-btn')?.addEventListener('click', () => toggleGlobalSearchDrawer(true));
  screen.querySelector('[data-go-market-empty]')?.addEventListener('click', () => routeTo('market'));
  screen.querySelector('#trolley-open-scale-plu')?.addEventListener('click', openLooseScalePluHelper);
  screen.querySelector('#empty-open-scale-plu')?.addEventListener('click', openLooseScalePluHelper);
  screen.querySelector('#trolley-open-xtra-card')?.addEventListener('click', openShopriteXtraCardHelper);
  screen.querySelector('#trolley-open-tag-ocr')?.addEventListener('click', () => openCrowdsourceModal(''));

  screen.querySelector('#trolley-clear-all-btn')?.addEventListener('click', () => {
    state.cart = [];
    savePersistedState();
    updateCartBadge();
    renderCartel();
    showToast('Cleared Trolley');
  });

  screen.querySelector('#trolley-edit-budget-btn')?.addEventListener('click', () => {
    const raw = window.prompt('Set your in-store Trolley budget limit (ZAR):', String(state.instoreBudget || 500));
    if (raw === null) return;
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed >= 20) {
      state.instoreBudget = Math.round(parsed);
      savePersistedState();
      renderCartel();
      showToast(`🎯 Trolley budget set to ${zar.format(state.instoreBudget)}`);
    }
  });

  screen.querySelectorAll('[data-empty-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prod = MASTER_PRODUCTS.get(btn.dataset.emptyQuickAdd);
      if (!prod) return;
      addToCart({
        barcode: prod.gtin,
        sku: prod.sku || '',
        name: prod.title,
        weight: prod.weight,
        category: prod.category,
        image: prod.imageUrl,
        emoji: prod.emoji
      }, state.retailerId);
      playBeepSound();
      renderCartel();
    });
  });

  screen.querySelectorAll('[data-switch-cartel-retailer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const retId = btn.dataset.switchCartelRetailer;
      if (!RETAILERS[retId]) return;
      state.retailerId = retId;
      savePersistedState();
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(25);
      render();
      showToast(`Comparing under ${getRetailer().name} (${zar.format(getPayableTotal(retId))})`);
    });
  });

  screen.querySelectorAll('[data-toggle-cart-picked]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.cart.find((i) => i.barcode === btn.dataset.toggleCartPicked);
      if (item) {
        item.checkedInStore = !item.checkedInStore;
        savePersistedState();
        playBeepSound();
        renderCartel();
      }
    });
  });

  screen.querySelectorAll('[data-cart-qty-dec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.cartQtyDec;
      const existing = state.cart.find((i) => i.barcode === code);
      if (!existing) return;
      if (existing.quantity <= 1) {
        removeCartItem(code);
      } else {
        existing.quantity -= 1;
        savePersistedState();
        updateCartBadge();
        renderCartel();
      }
    });
  });

  screen.querySelectorAll('[data-cart-qty-inc]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.cartQtyInc;
      const existing = state.cart.find((i) => i.barcode === code);
      if (existing) {
        addToCart(existing, state.retailerId);
        renderCartel();
      }
    });
  });

  screen.querySelectorAll('[data-remove-cart-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeCartItem(btn.dataset.removeCartItem);
      showToast('Item removed from Trolley');
    });
  });

  screen.querySelectorAll('[data-open-camera]').forEach((btn) => btn.addEventListener('click', openLiveCameraScanner));
  screen.querySelector('#delivery-checkout')?.addEventListener('click', openPayment);
  screen.querySelector('#store-checkout')?.addEventListener('click', () => openMasterBarcode(state.retailerId, 0));
  screen.querySelectorAll('[data-swipe-row]').forEach(bindSwipeRow);
}

function bindSwipeRow(row) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  const barcode = row.dataset.swipeRow;

  row.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    currentX = 0;
    isSwiping = false;
    row.style.transition = 'none';
  }, { passive: true });

  row.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) return;
    const deltaX = event.touches[0].clientX - startX;
    const deltaY = event.touches[0].clientY - startY;

    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      isSwiping = true;
      if (event.cancelable) event.preventDefault();
      currentX = Math.max(-140, deltaX);
      row.style.transform = `translateX(${currentX}px)`;
    }
  }, { passive: false });

  row.addEventListener('touchend', () => {
    row.style.transition = 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease';
    if (currentX <= -75) {
      row.style.transform = 'translateX(-115%)';
      row.style.opacity = '0';
      window.setTimeout(() => {
        removeCartItem(barcode);
        showToast('Item removed from Trolley');
      }, 200);
    } else {
      row.style.transform = 'translateX(0px)';
    }
  }, { passive: true });
}

function renderTracker() {
  const order = state.order;
  const tillSlips = (state.pastReceipts || []).filter((r) => r && (r.type === 'instore_pos_till' || Array.isArray(r.items)));
  const steps = ['Order confirmed', 'Picking your items', 'Driver on the way', 'Delivered'];

  screen.innerHTML = `
    <section class="px-5 py-8 pb-32">
      <p class="section-kicker">Receipts &amp; Tracker</p>
      <h1 class="mt-2 text-3xl sm:text-4xl font-black tracking-[-.04em]">${order ? 'On its way.' : tillSlips.length ? 'Digital POS Till Slips' : 'Nothing on the road.'}</h1>

      ${order ? `
        <div class="mt-6">
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold text-slate-500">Order #${escapeHtml(order.id)}</p>
            <span class="rounded-full bg-[#edf3ee] px-3 py-1.5 text-[10px] font-black text-[#234e3b]">LIVE</span>
          </div>
          <div class="card mt-3 overflow-hidden">
            <div class="relative h-48 bg-[#e8eee9]">
              <div class="absolute inset-0 opacity-40" style="background-image:linear-gradient(35deg,transparent 45%,#fff 46%,#fff 51%,transparent 52%),linear-gradient(145deg,transparent 35%,#d1d5db 36%,#d1d5db 39%,transparent 40%);background-size:90px 70px"></div>
              <div class="absolute left-[58%] top-[42%] grid size-12 place-items-center rounded-full bg-slate-950 text-xl text-white shadow-xl ring-4 ring-white">&#128757;</div>
              <div class="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-black shadow">About ${Math.max(4, 18 - order.step * 5)} min away</div>
            </div>
            <div class="p-5">
              <div class="flex items-center gap-3">
                <div class="grid size-12 place-items-center rounded-2xl bg-amber-100 text-2xl">&#128104;</div>
                <div><h2 class="font-black">Thabo is your driver</h2><p class="text-xs font-semibold text-slate-400">Toyota Starlet &middot; CA 482-991</p></div>
                <button type="button" class="ml-auto grid size-10 place-items-center rounded-xl bg-stone-100 text-xs font-black">Call</button>
              </div>
              <div class="my-5 border-t border-stone-100"></div>
              <div class="space-y-4">${steps.map((label, index) => `<div class="flex items-center gap-3 ${index > order.step ? 'opacity-35' : ''}"><span class="grid size-7 place-items-center rounded-full ${index <= order.step ? 'bg-[#234e3b] text-white' : 'bg-stone-200'} text-xs font-black">${index < order.step ? '&check;' : index + 1}</span><span class="text-sm font-bold">${label}</span></div>`).join('')}</div>
            </div>
          </div>
          <div class="mt-5 rounded-[1.75rem] bg-slate-950 p-5 text-white">
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-white/50">Give this code to your driver</p>
            <div class="mt-2 flex items-center justify-between"><p class="text-4xl font-black tracking-[.2em]">${escapeHtml(order.code)}</p><span class="text-xs font-bold text-[#b7e2cb]">Payout locked &#128274;</span></div>
            <p class="mt-3 text-xs leading-5 text-white/55">Funds unlock only after the driver enters your secure code.</p>
          </div>
          ${order.step < 3 ? '<button id="advance-order" type="button" class="secondary-button mt-4 w-full">Demo: advance delivery</button>' : ''}
        </div>
      ` : ''}

      ${tillSlips.length ? `
        <div class="mt-7">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-lg font-black text-slate-950">Past POS Till Slips &amp; Orders</h2>
              <p class="text-xs text-slate-500">Stored 100% locally on your phone with SARS 0% / 15% VAT breakdown</p>
            </div>
            <span class="rounded-xl bg-[#edf3ee] px-2.5 py-1 text-[10.5px] font-black text-[#234e3b]">${tillSlips.length} Slip${tillSlips.length === 1 ? '' : 's'}</span>
          </div>

          <div class="space-y-3">
            ${tillSlips.map((slip, idx) => {
              const unitTotal = (slip.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
              const dt = new Date(slip.createdAt || slip._lastModified || Date.now()).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
              return `
                <article data-open-slip-idx="${idx}" class="card cursor-pointer p-4 transition hover:ring-2 hover:ring-[#234e3b]/30 active:scale-[.99]">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-stone-100 text-xl border border-stone-200">🧾</span>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="rounded bg-[#e11d2e] px-1.5 py-0.5 text-[8.5px] font-black uppercase text-white">${slip.type === 'instore_pos_till' ? 'POS TILL SLIP' : 'DELIVERY'}</span>
                          <span class="font-mono text-[10px] font-bold text-slate-400">#${escapeHtml(slip.id)}</span>
                        </div>
                        <h3 class="mt-0.5 truncate text-sm font-black text-slate-950">${escapeHtml(slip.storeName || 'Shoprite South Africa')}</h3>
                        <p class="text-[11px] font-semibold text-slate-500">${escapeHtml(dt)} &middot; ${unitTotal} unit${unitTotal === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-base font-black text-slate-950">${zar.format(slip.total || 0)}</p>
                      ${(slip.savings || 0) > 0 ? `<p class="text-[10px] font-black text-[#234e3b]">Saved ${zar.format(slip.savings)}</p>` : ''}
                      <span class="mt-1 inline-block text-[10px] font-black text-[#e11d2e]">Open Slip ➔</span>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>
      ` : !order ? `
        <div class="card mt-7 px-7 py-12 text-center">
          <span class="mx-auto grid size-16 place-items-center rounded-3xl bg-stone-100 text-3xl">🧾</span>
          <h2 class="mt-4 font-black">Digital POS Till Slips &amp; Deliveries live here</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">Complete an in-store Till Checkout or place a delivery order from your top-right Trolley to view itemized SARS VAT receipts and re-add items in 1 tap.</p>
          <button data-go-market type="button" class="secondary-button mx-auto mt-6">Browse Market</button>
        </div>
      ` : ''}
    </section>`;

  screen.querySelector('[data-go-market]')?.addEventListener('click', () => routeTo('market'));
  screen.querySelector('#advance-order')?.addEventListener('click', () => { state.order.step += 1; renderTracker(); });
  screen.querySelectorAll('[data-open-slip-idx]').forEach((card) => {
    card.addEventListener('click', () => {
      const slip = tillSlips[Number(card.dataset.openSlipIdx)];
      if (slip) openReceiptSlipHelper(slip);
    });
  });
}

function renderSavings() {
  const zone = getActiveZone();
  const liveSavings = getCurrentSavings();
  const totalSavings = state.completedSavings + liveSavings;
  const cartTotal = getMerchandiseTotal();
  const basketBoostTarget = 100;
  const basketBoostProgress = Math.min(100, Math.round((cartTotal / basketBoostTarget) * 100));
  const cartProduceItems = state.cart.filter((item) => item.category === 'Fresh Fruit & Vegetables' || item.category === 'Bakery & Fresh Produce' || item.category === 'Vegetables & Fruit');
  const projectedPoints = Math.floor(getPayableTotal());

  screen.innerHTML = `
    <section class="px-5 py-8">
      <p class="section-kicker">Savings & Optimization · ${escapeHtml(zone.name)}</p>
      <h1 class="mt-2 text-4xl font-black tracking-[-.04em]">More money,<br><span class="text-[#234e3b]">still in your pocket.</span></h1>

      <!-- Real-Time Loyalty Point Ledger -->
      <div class="mt-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1b3d2e] via-[#234e3b] to-slate-900 p-6 text-white shadow-xl">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-black uppercase tracking-[.2em] text-white/70">Session Savings</p>
          <span class="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Gold Tier</span>
        </div>
        <p class="mt-2 text-5xl font-black tracking-[-.06em]">${zar.format(totalSavings)}</p>

        <div class="mt-6 border-t border-white/15 pt-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-white/80">Automater Loyalty Balance</p>
              <p class="text-2xl font-black">${state.loyaltyPoints.toLocaleString('en-ZA')} <span class="text-xs font-bold text-white/70">pts</span></p>
            </div>
            ${projectedPoints > 0 ? `
              <div class="rounded-2xl bg-black/20 px-3.5 py-2 text-right backdrop-blur-md">
                <p class="text-[9px] font-black uppercase tracking-wider text-[#b7e2cb]">+${projectedPoints} pts pending</p>
                <p class="text-[10px] text-white/70">from active trolley</p>
              </div>` : ''}
          </div>

          <div class="mt-4">
            <div class="flex justify-between text-[10px] font-bold text-white/75">
              <span>Next Reward: R50 Voucher</span>
              <span>${state.loyaltyPoints} / 1,000 pts</span>
            </div>
            <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/25">
              <div class="h-full rounded-full bg-[#9ad4b5] transition-all duration-500" style="width:${Math.min(100, (state.loyaltyPoints / 1000) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Basket Optimization Trackers -->
      <div class="mt-7">
        <h2 class="text-xl font-black">Basket Optimization</h2>
        <div class="mt-3 space-y-3">
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-stone-100 text-lg">⚡</span>
                <div>
                  <h3 class="text-sm font-black">R10 Basket Boost</h3>
                  <p class="text-xs text-slate-500">${cartTotal >= basketBoostTarget ? 'Threshold reached! R10 discount applied.' : `Add ${zar.format(basketBoostTarget - cartTotal)} more to unlock R10 off`}</p>
                </div>
              </div>
              <span class="text-xs font-black ${cartTotal >= basketBoostTarget ? 'text-[#234e3b]' : 'text-slate-400'}">${basketBoostProgress}%</span>
            </div>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div class="h-full rounded-full ${cartTotal >= basketBoostTarget ? 'bg-[#2f6f52]' : 'bg-slate-800'} transition-all duration-300" style="width:${basketBoostProgress}%"></div>
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-[#edf3ee] text-lg">🥑</span>
                <div>
                  <h3 class="text-sm font-black">Fresh Five Produce Saver</h3>
                  <p class="text-xs text-slate-500">${cartProduceItems.length ? `${cartProduceItems.length} fresh item(s) in trolley receiving 5% off` : 'Add fruit or veg to trigger 5% produce discount'}</p>
                </div>
              </div>
              <span class="rounded-xl px-2 py-1 text-[10px] font-black ${state.coupons.has('fresh5') ? 'bg-[#edf3ee] text-[#234e3b]' : 'bg-stone-100 text-slate-500'}">
                ${state.coupons.has('fresh5') ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Coupons -->
      <div class="mt-7">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-black">Coupons & Boosters</h2>
          <span class="text-xs font-bold text-slate-400">${state.coupons.size} of ${COUPONS.length} active</span>
        </div>
        <div class="mt-3 space-y-3">
          ${COUPONS.map((coupon) => `
            <article class="card flex items-center gap-4 p-4">
              <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${coupon.tone} text-2xl text-white">🏷️</span>
              <div class="min-w-0 flex-1">
                <h3 class="font-black">${coupon.label}</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500">${coupon.detail}</p>
              </div>
              <button data-coupon="${coupon.id}" class="rounded-xl px-3.5 py-2 text-[10px] font-black transition active:scale-95 ${state.coupons.has(coupon.id) ? 'bg-[#edf3ee] text-[#234e3b] ring-1 ring-[#bdd4c5]' : 'bg-slate-900 text-white'}">
                ${state.coupons.has(coupon.id) ? '✓ Applied' : '+ Apply'}
              </button>
            </article>`).join('')}
        </div>
      </div>

      <!-- Town / Area Retailer Price Comparison Matrix -->
      <div class="card mt-7 p-5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="font-black text-base text-slate-900">Retailer Comparison · ${escapeHtml(zone.name)}</h2>
            <p class="text-xs text-slate-400">
              ${state.cart.length > 0 ? `Comparing your ${state.cart.reduce((s, i) => s + i.quantity, 0)} trolley item(s) across ${escapeHtml(zone.name)}` : `Benchmarking top 6 staples across retailers in ${escapeHtml(zone.name)}`}
            </p>
          </div>
          <span class="rounded-full bg-[#edf3ee] px-2.5 py-0.5 text-[9px] font-black text-[#234e3b]">
            ${state.cart.length > 0 ? 'My Trolley' : 'Staples'}
          </span>
        </div>

        <div class="mt-4 space-y-2.5">
          ${(() => {
            const comparisonItems = state.cart.length > 0 
              ? state.cart 
              : Array.from(MASTER_PRODUCTS.values()).slice(0, 6).map(p => ({ barcode: p.gtin, quantity: 1, ...p }));

            const storeComparisons = Object.values(RETAILERS).map((ret) => {
              const total = comparisonItems.reduce((sum, item) => {
                const pr = getZonePrice(zone.id, ret.id, item.barcode || item.gtin);
                const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
                return sum + activePrice * (item.quantity || 1);
              }, 0);
              return { retailer: ret, total };
            }).sort((a, b) => a.total - b.total);

            const cheapest = storeComparisons[0];
            const highest = storeComparisons[storeComparisons.length - 1];
            const maxSavings = Math.max(0, highest.total - cheapest.total);

            return `
              ${storeComparisons.map((item, idx) => {
                const isCheapest = idx === 0;
                const isCurrent = item.retailer.id === state.retailerId;
                const diff = item.total - cheapest.total;

                return `
                  <div 
                    data-drilldown-retailer="${item.retailer.id}" 
                    class="flex items-center justify-between rounded-2xl border p-3.5 transition cursor-pointer active:scale-98 ${isCheapest ? 'bg-[#f1f7f3] border-[#bdd4c5]' : isCurrent ? 'bg-stone-50 border-slate-900/30' : 'bg-stone-50/70 border-stone-200/80 hover:border-stone-300'}"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="grid size-10 shrink-0 place-items-center rounded-xl bg-white p-1.5 border border-stone-200/80 overflow-hidden shadow-2xs">
                        <img src="${item.retailer.logoUrl}" alt="${item.retailer.name}" class="h-full w-full object-contain" onerror="this.parentElement.style.background='${item.retailer.color}';this.parentElement.innerHTML='<span class=\\'font-black text-white text-xs\\'>${item.retailer.initials}</span>';" />
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h4 class="text-xs font-black text-slate-900 truncate">${item.retailer.name}</h4>
                          ${isCheapest ? '<span class="rounded-md bg-[#234e3b] px-1.5 py-0.2 text-[8px] font-black text-white">LOWEST BASKET</span>' : ''}
                          ${isCurrent ? '<span class="rounded-md bg-slate-900 px-1.5 py-0.2 text-[8px] font-mono font-bold text-white">ACTIVE</span>' : ''}
                        </div>
                        <p class="text-[10px] text-slate-400 truncate">${escapeHtml(zone.name)} · ${zone.scopeLabel}</p>
                      </div>
                    </div>

                    <div class="text-right shrink-0">
                      <span class="text-xs font-black text-slate-900">${zar.format(item.total)}</span>
                      <span class="block text-[9px] font-bold ${isCheapest ? 'text-[#234e3b] font-black' : 'text-slate-400'}">
                        ${isCheapest ? 'Best Value' : `+${zar.format(diff)}`}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}

              ${maxSavings > 0 ? `
                <div class="mt-4 rounded-2xl bg-[#234e3b] p-4 text-white shadow-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[9px] font-black uppercase tracking-wider text-[#b7e2cb]">Recommended Retailer in ${escapeHtml(zone.name)}</p>
                      <h4 class="text-xs font-black mt-0.5">${cheapest.retailer.name} has the lowest basket total</h4>
                      <p class="text-[11px] text-white/80 mt-0.5">Switching saves <strong>${zar.format(maxSavings)}</strong> across ${escapeHtml(zone.name)}.</p>
                    </div>
                    <button 
                      id="switch-to-cheapest-store-btn" 
                      type="button" 
                      data-target-retailer="${cheapest.retailer.id}" 
                      class="shrink-0 rounded-xl bg-white px-3.5 py-2.5 text-xs font-black text-[#173829] shadow-sm active:scale-95 transition hover:bg-stone-100"
                    >
                      Switch ➔
                    </button>
                  </div>
                </div>
              ` : ''}
            `;
          })()}
        </div>
      </div>

      <!-- Itemized Ledger Breakdown -->
      <div class="card mt-7 p-5">
        <h2 class="font-black">Financial Savings Breakdown</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-slate-500">Catalogue product specials</dt>
            <dd class="font-black text-[#234e3b]">${zar.format(getBuiltInSavings())}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Active coupon deductions</dt>
            <dd class="font-black text-[#234e3b]">${zar.format(getCouponSavings())}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Past completed order savings</dt>
            <dd class="font-black text-slate-800">${zar.format(state.completedSavings)}</dd>
          </div>
          <div class="flex justify-between border-t border-stone-100 pt-3">
            <dt class="font-black text-slate-950">Total Value Preserved</dt>
            <dd class="text-lg font-black text-[#234e3b]">${zar.format(totalSavings)}</dd>
          </div>
        </dl>
      </div>
    </section>`;

  screen.querySelectorAll('[data-coupon]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.coupon;
    if (state.coupons.has(id)) {
      state.coupons.delete(id);
      showToast('Coupon removed');
    } else {
      state.coupons.add(id);
      showToast('Coupon activated');
    }
    renderSavings();
  }));

  screen.querySelector('#switch-to-cheapest-store-btn')?.addEventListener('click', (e) => {
    const targetRetailerId = e.currentTarget.dataset.targetRetailer;
    state.retailerId = targetRetailerId;

    state.cart = state.cart.map(item => {
      const pr = getZonePrice(zone.id, targetRetailerId, item.barcode || item.gtin);
      const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
      return {
        ...item,
        retailerId: targetRetailerId,
        price: activePrice,
        basePrice: pr.regularPrice || item.basePrice
      };
    });

    playBeepSound();
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    savePersistedState();
    showToast(`✓ Trolley transferred to ${RETAILERS[targetRetailerId]?.name}!`);
    renderSavings();
  });

  screen.querySelectorAll('[data-drilldown-retailer]').forEach((card) => {
    card.addEventListener('click', () => {
      const retId = card.dataset.drilldownRetailer;
      const targetRetailer = RETAILERS[retId];
      if (targetRetailer) openStorePriceBreakdownModal(targetRetailer, zone);
    });
  });
}

function openStorePriceBreakdownModal(retailer, zone) {
  const comparisonItems = state.cart.length > 0 
    ? state.cart 
    : Array.from(MASTER_PRODUCTS.values()).slice(0, 6).map(p => ({ barcode: p.gtin, quantity: 1, ...p }));

  const total = comparisonItems.reduce((sum, item) => {
    const pr = getZonePrice(zone.id, retailer.id, item.barcode || item.gtin);
    const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
    return sum + activePrice * (item.quantity || 1);
  }, 0);

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[2.25rem] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5">
        <div class="flex items-center justify-between pb-3 border-b border-stone-100">
          <div class="flex items-center gap-2.5">
            <div class="grid size-10 place-items-center rounded-xl bg-white p-1.5 border border-stone-200 overflow-hidden shadow-2xs">
              <img src="${retailer.logoUrl}" alt="${retailer.name}" class="h-full w-full object-contain" onerror="this.parentElement.style.background='${retailer.color}';this.parentElement.innerHTML='<span class=\\'font-black text-white text-xs\\'>${retailer.initials}</span>';" />
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-900">${retailer.name} · ${escapeHtml(zone.name)}</h3>
              <p class="text-[10px] text-slate-400 font-bold">${zone.scopeLabel} &bull; ${retailer.loyalty}</p>
            </div>
          </div>
          <button id="close-drilldown-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-stone-100 text-xs font-bold text-slate-500 hover:bg-stone-200">✕</button>
        </div>

        <div class="mt-4 space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
          ${comparisonItems.map((item) => {
            const master = MASTER_PRODUCTS.get(item.barcode || item.gtin) || item;
            const pr = getZonePrice(zone.id, retailer.id, master.gtin || item.barcode);
            const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
            const hasPromo = pr.promoPrice && pr.promoPrice < pr.regularPrice;
            const qty = item.quantity || 1;

            return `
              <div class="flex items-center justify-between rounded-2xl border border-stone-100 p-2.5 bg-stone-50/70">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="size-10 shrink-0 overflow-hidden rounded-xl bg-white border border-stone-200 p-1 flex items-center justify-center">
                    <img src="${master.imageUrl || master.image}" alt="${escapeHtml(master.title || master.name)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-lg\\'>${master.emoji || '🛍️'}</span>';" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-black text-slate-900 truncate">${escapeHtml(master.title || master.name)}</h4>
                    <p class="text-[9px] text-slate-400 font-mono">Qty: ${qty} &bull; ${master.weight || '1 unit'}</p>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-xs font-black text-slate-900">${zar.format(activePrice * qty)}</span>
                  ${hasPromo ? `
                    <span class="block text-[8px] font-bold text-[#234e3b]">Promo (${zar.format(activePrice)} ea)</span>
                  ` : `
                    <span class="block text-[8px] text-slate-400 font-mono">${zar.format(activePrice)} ea</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mt-4 border-t border-stone-100 pt-3 flex items-center justify-between">
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Basket Cost</span>
            <p class="text-base font-black text-slate-900">${zar.format(total)}</p>
          </div>
          <button 
            id="modal-select-this-store-btn" 
            type="button" 
            class="rounded-2xl px-4 py-2.5 text-xs font-black text-white shadow-sm active:scale-95 transition" 
            style="background:${retailer.color}"
          >
            Shop ${retailer.name} ➔
          </button>
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-drilldown-modal-btn')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
  });

  modalRoot.querySelector('#modal-select-this-store-btn')?.addEventListener('click', () => {
    state.retailerId = retailer.id;
    savePersistedState();
    modalRoot.innerHTML = '';
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(30);
    showToast(`Switched active store to ${retailer.name}`);
    routeTo('market');
  });
}

function bindRetailerButtons() {
  screen.querySelectorAll('[data-retailer]').forEach((button) => button.addEventListener('click', () => {
    state.retailerId = button.dataset.retailer;
    render();
    showToast(`${getRetailer().name} selected`);
  }));
}

function openPayment() {
  if (!state.cart.length) return;
  state.overlay = 'payment';
  state.paymentMethod = 'nedbank'; // Default to Nedbank Open Banking EFT

  renderPaymentModal();
}

function renderPaymentModal() {
  const payable = getPayableTotal();
  const cardFeeEstimate = payable * 0.03; // Traditional 3% card fee
  const flatOpenBankingFee = 0.50; // 50c flat cent fee
  const merchantSavings = Math.max(0, cardFeeEstimate - flatOpenBankingFee);
  const nedbankRef = `NED-${Date.now().toString(36).toUpperCase()}`;

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <section class="sheet-enter max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[2.25rem] bg-white p-5 pb-safe sm:rounded-[2.25rem]" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden"></div>
        <div class="flex items-start justify-between">
          <div>
            <p class="section-kicker">Direct Open Banking</p>
            <h2 id="payment-title" class="mt-1 text-2xl font-black">Secure Settlement</h2>
          </div>
          <button data-close-modal class="grid size-10 place-items-center rounded-xl bg-slate-100 text-lg transition active:scale-95">&times;</button>
        </div>

        <!-- Payment Method Tabs -->
        <div class="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button id="tab-nedbank" type="button" class="rounded-xl py-2.5 text-xs font-black transition ${state.paymentMethod === 'nedbank' ? 'bg-[#004e38] text-white shadow-md' : 'text-slate-600'}">
            Nedbank Open Banking
          </button>
          <button id="tab-card" type="button" class="rounded-xl py-2.5 text-xs font-black transition ${state.paymentMethod === 'card' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600'}">
            Credit / Debit Card
          </button>
        </div>

        ${state.paymentMethod === 'nedbank' ? `
          <!-- Nedbank Open Banking EFT Interface -->
          <div class="mt-5 space-y-4">
            <div class="rounded-3xl bg-gradient-to-br from-[#004e38] to-[#00281c] p-5 text-white shadow-xl shadow-[#004e38]/25">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="grid size-8 place-items-center rounded-xl bg-white text-xs font-black text-[#004e38]">N</span>
                  <div>
                    <span class="block text-xs font-black tracking-wider uppercase">Nedbank Money API</span>
                    <span class="block text-[9px] text-emerald-300">Open Banking Certified</span>
                  </div>
                </div>
                <span class="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">Bypass 3% Fee</span>
              </div>

              <div class="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
                <div>
                  <p class="text-[10px] text-white/70">Payable Total</p>
                  <p class="text-3xl font-black tracking-tight">${zar.format(payable)}</p>
                </div>
                <div class="rounded-xl bg-black/25 px-2.5 py-1.5 text-right">
                  <p class="text-[9px] font-bold text-emerald-300">Processing Fee: R0.50 flat</p>
                  <p class="text-[8px] text-white/60">Saved ${zar.format(merchantSavings)} vs 3% card fee</p>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/75">
                <span>Ref: <strong class="font-mono">${nedbankRef}</strong></span>
                <span>Branch: 198765</span>
              </div>
            </div>

            <!-- Merchant Collection Ledger Notice -->
            <div class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
              <div class="flex items-center gap-2 font-black text-emerald-900">
                <span class="text-sm">🛡️</span>
                <span>Direct Account-to-Account Transfer</span>
              </div>
              <p class="mt-1 text-[11px] leading-4 text-emerald-800/80">Funds settle directly into Automater Corporate Collection Account without card interchange deductions.</p>
            </div>

            <button id="launch-approve-it" type="button" class="primary-button w-full bg-[#004e38] hover:bg-[#003828] shadow-lg shadow-[#004e38]/25">
              <span>Send 'Approve-it™' Push Notification</span>
            </button>
            <p class="text-center text-[10px] text-slate-400">Trigger biometric authorization on your Nedbank Money™ app.</p>
          </div>
        ` : `
          <!-- Card Payment Form -->
          <div class="mt-5 space-y-3">
            <div class="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-900 p-5 text-white shadow-xl">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/50">
                <span>Automater Pay</span>
                <span>VISA</span>
              </div>
              <p class="mt-8 font-mono text-lg tracking-[.12em]">&bull;&bull;&bull;&bull; &nbsp;&bull;&bull;&bull;&bull; &nbsp;&bull;&bull;&bull;&bull; &nbsp;4242</p>
              <div class="mt-4 flex justify-between text-xs">
                <span>YOUR NAME</span>
                <span>12/29</span>
              </div>
            </div>
            <form id="payment-form" class="space-y-3" novalidate>
              <label class="block text-xs font-black text-slate-600">Name on card
                <input name="name" autocomplete="cc-name" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="Full name">
              </label>
              <label class="block text-xs font-black text-slate-600">Card number
                <input name="card" autocomplete="cc-number" inputmode="numeric" required minlength="12" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-bold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="0000 0000 0000 0000">
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="text-xs font-black text-slate-600">Expiry
                  <input name="expiry" autocomplete="cc-exp" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none" placeholder="MM/YY">
                </label>
                <label class="text-xs font-black text-slate-600">CVV
                  <input name="cvv" autocomplete="cc-csc" inputmode="numeric" required minlength="3" maxlength="4" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none" placeholder="123">
                </label>
              </div>
              <button class="primary-button mt-2 w-full" type="submit">Pay ${zar.format(payable)} & order</button>
            </form>
          </div>
        `}
      </section>
    </div>`;

  bindModalClose();

  modalRoot.querySelector('#tab-nedbank')?.addEventListener('click', () => {
    state.paymentMethod = 'nedbank';
    renderPaymentModal();
  });

  modalRoot.querySelector('#tab-card')?.addEventListener('click', () => {
    state.paymentMethod = 'card';
    renderPaymentModal();
  });

  modalRoot.querySelector('#launch-approve-it')?.addEventListener('click', () => {
    openApproveItModal(nedbankRef, payable);
  });

  modalRoot.querySelector('#payment-form')?.addEventListener('submit', completeDeliveryPayment);
}

function openApproveItModal(reference, amount) {
  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      <section class="w-full max-w-sm overflow-hidden rounded-[2.25rem] bg-white p-6 shadow-2xl text-slate-950" role="dialog" aria-modal="true" aria-labelledby="approve-it-title">
        <!-- Banking Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-[#004e38] text-sm font-black text-white">N</span>
            <div>
              <h3 id="approve-it-title" class="text-sm font-black leading-tight text-slate-900">Nedbank Money™</h3>
              <p class="text-[10px] font-bold text-emerald-700">Approve-it™ Verification</p>
            </div>
          </div>
          <span class="flex size-3"><span class="absolute inline-flex size-3 animate-ping rounded-full bg-emerald-400 opacity-75"></span><span class="relative size-3 rounded-full bg-emerald-500"></span></span>
        </div>

        <!-- Biometric Pulsing Visual -->
        <div class="my-6 text-center">
          <div class="relative mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-4xl text-[#004e38] ring-8 ring-emerald-100/60 animate-pulse">
            👆
          </div>
          <h4 class="mt-4 text-base font-black">Payment Authorization</h4>
          <p class="mt-1 text-xs text-slate-500">Authorize instant transfer to Automater Central Corporate Collection account.</p>
        </div>

        <!-- Transaction Details -->
        <div class="rounded-2xl bg-slate-50 p-4 text-xs space-y-2">
          <div class="flex justify-between"><span class="text-slate-500">Merchant</span><strong class="text-slate-900">Automater (Pty) Ltd</strong></div>
          <div class="flex justify-between"><span class="text-slate-500">Account</span><strong class="text-slate-900">Nedbank Core · 1009847291</strong></div>
          <div class="flex justify-between"><span class="text-slate-500">Reference</span><strong class="font-mono text-slate-900">${reference}</strong></div>
          <div class="flex justify-between border-t border-slate-200 pt-2"><span class="font-bold text-slate-700">Amount</span><strong class="text-base font-black text-[#004e38]">${zar.format(amount)}</strong></div>
          <div class="flex justify-between"><span class="text-[10px] text-slate-400">Processing Fee</span><span class="text-[10px] font-bold text-emerald-700">R0.50 (Flat Cent Fee)</span></div>
        </div>

        <!-- Actions -->
        <div class="mt-6 space-y-2">
          <button id="confirm-approve-it" type="button" class="primary-button w-full bg-[#004e38] hover:bg-[#003828]">
            <span>Approve with Biometrics</span>
          </button>
          <button id="reject-approve-it" type="button" class="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600">
            Decline Transaction
          </button>
        </div>
      </section>
    </div>`;

  modalRoot.querySelector('#confirm-approve-it')?.addEventListener('click', () => {
    const btn = modalRoot.querySelector('#confirm-approve-it');
    btn.innerHTML = `<span>Biometric Verified · Settling...</span>`;
    btn.disabled = true;

    window.setTimeout(() => {
      completeDeliveryPayment({ preventDefault: () => {}, currentTarget: { reportValidity: () => true } });
      showToast('Approve-it™ Verified: Funds direct-settled at R0.50 flat fee');
    }, 700);
  });

  modalRoot.querySelector('#reject-approve-it')?.addEventListener('click', () => {
    closeModal();
    showToast('Transaction declined');
  });
}

function openCrowdsourceModal(barcode = '', initialShelfImageBlob = null) {
  state.overlay = 'crowdsource';
  let capturedThumbnailDataUrl = '';
  const _seed12 = `20${String(Date.now()).slice(-5)}01999`;
  const initialCode = String(barcode || '').trim() || `${_seed12}${computeGs1CheckDigit(_seed12)}`;
  const emojis = ['🍞', '🥛', '🥬', '🥩', '🧊', '🥫', '🥤', '🍪', '🍼', '🪥', '🧼', '🍎', '🥚'];
  const regionalPresets = [
    { name: 'Mister Bread White Sliced', weight: '700 g', category: 'Bakery', price: 16.49, basePrice: 18.99, emoji: '🍞' },
    { name: 'Ritebrand Long Life Milk', weight: '6 x 1 L', category: 'Dairy, Eggs & Milk', price: 89.99, basePrice: 99.99, emoji: '🥛' },
    { name: 'No Name Sunflower Oil', weight: '2 L', category: 'Food Cupboard & Pantry', price: 64.99, basePrice: 74.99, emoji: '🥫' },
    { name: 'SPAR Fresh Brown Eggs', weight: '18 pack', category: 'Dairy, Eggs & Milk', price: 49.99, basePrice: 59.99, emoji: '🥚' },
    { name: 'Albany Superior White Bread', weight: '700 g', category: 'Bakery', price: 18.99, basePrice: 22.99, emoji: '🍞' }
  ];

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <section class="sheet-enter max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[2.25rem] bg-white p-5 pb-safe sm:rounded-[2.25rem]" role="dialog" aria-modal="true" aria-labelledby="crowdsource-title">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden"></div>
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-1.5">
              <p class="section-kicker text-emerald-600">On-Device Cellphone OCR</p>
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800">100% LOCAL · $0 CLOUD</span>
            </div>
            <h2 id="crowdsource-title" class="mt-1 text-2xl font-black">Scan Shelf Tag</h2>
          </div>
          <button data-close-modal class="grid size-10 place-items-center rounded-xl bg-slate-100 text-lg transition active:scale-95">&times;</button>
        </div>

        <p class="mt-2 text-xs leading-5 text-slate-500">Snap the physical shelf price label — text, ZAR promo/was prices, weight, and barcode are extracted <strong>directly on your cellphone</strong> offline.</p>

        <!-- On-Device Shelf Tag Snap Upload -->
        <div class="mt-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-center">
          <input type="file" id="shelf-tag-camera" accept="image/*" capture="environment" class="hidden">
          <label for="shelf-tag-camera" class="cursor-pointer flex flex-col items-center justify-center gap-1.5">
            <span class="grid size-11 place-items-center rounded-full bg-emerald-600 text-lg text-white shadow-md shadow-emerald-600/30">📷</span>
            <strong class="text-xs font-black text-emerald-950">Snap Shelf Price Tag (On-Device OCR)</strong>
            <span class="text-[10px] text-emerald-700/80">Runs locally via phone NPU / WebAssembly — zero Cloud Vision fees</span>
          </label>
          <div id="shelf-tag-preview" class="mt-2.5 hidden rounded-xl bg-white p-2.5 text-left text-xs font-bold text-slate-700 shadow-sm border border-emerald-200"></div>
        </div>

        <!-- Regional Brand Quick Presets -->
        <div class="mt-4">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick House Brand Presets</p>
          <div class="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            ${regionalPresets.map((preset, idx) => `
              <button type="button" data-preset="${idx}" class="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 active:scale-95 transition">
                ${preset.name.split(' ')[0]} ${preset.name.split(' ')[1] || ''}
              </button>
            `).join('')}
          </div>
        </div>

        <form id="crowdsource-form" class="mt-4 space-y-3" novalidate>
          <div class="grid grid-cols-3 gap-3">
            <label class="col-span-2 block text-xs font-black text-slate-700">Product Name
              <input id="cs-name" name="name" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="e.g. Mister Bread White Sliced">
            </label>
            <label class="block text-xs font-black text-slate-700">Barcode
              <input id="cs-barcode" name="barcode" required value="${escapeHtml(initialCode)}" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="block text-xs font-black text-slate-700">Department
              <select id="cs-category" name="category" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                ${SHOPRITE_RETAIL_DEPARTMENTS.map((dept) => `
                  <option value="${escapeHtml(dept.id)}">${escapeHtml(dept.emoji)} ${escapeHtml(dept.shortLabel || dept.id)}</option>
                `).join('')}
              </select>
            </label>

            <label class="block text-xs font-black text-slate-700">Package / Weight
              <input id="cs-weight" name="weight" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="e.g. 700 g or 2 L">
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="block text-xs font-black text-slate-700">Promotional Price (ZAR)
              <input id="cs-price" name="price" type="number" step="0.01" min="0.5" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="18.99">
            </label>
            <label class="block text-xs font-black text-slate-700">Shelf Base Price (ZAR)
              <input id="cs-base-price" name="basePrice" type="number" step="0.01" min="0.5" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="22.99">
            </label>
          </div>

          <div>
            <label class="block text-xs font-black text-slate-700">Product Icon</label>
            <div class="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              ${emojis.map((emoji, idx) => `
                <label class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl transition hover:border-emerald-500 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
                  <input type="radio" name="emoji" value="${emoji}" class="sr-only" ${idx === 0 ? 'checked' : ''}>
                  <span>${emoji}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <button class="primary-button mt-4 w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25" type="submit">
            <span>Save Forever on Phone &amp; Add to Trolley</span>
          </button>
        </form>
      </section>
    </div>`;

  bindModalClose();

  const runOnDeviceShelfScan = async (fileOrBlob) => {
    if (!fileOrBlob) return;
    const preview = modalRoot.querySelector('#shelf-tag-preview');
    const barcodeInput = modalRoot.querySelector('#cs-barcode');
    if (preview) {
      preview.classList.remove('hidden');
      preview.innerHTML = `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] font-extrabold text-emerald-800">
            <span id="ocr-status-label">📱 Initializing on-device phone OCR...</span>
            <span id="ocr-pct-label">10%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div id="ocr-progress-bar" class="h-full rounded-full bg-emerald-600 transition-all duration-200" style="width: 10%"></div>
          </div>
        </div>
      `;
    }

    try {
      const { scanShelfTagOnCellphone } = await import('./local-vision-ocr.js');
      const scanRes = await scanShelfTagOnCellphone(fileOrBlob, {
        fallbackBarcode: barcodeInput?.value || initialCode,
        onProgress: ({ status, progress }) => {
          const pct = Math.max(10, Math.min(99, Math.round((progress || 0) * 100)));
          const statusEl = modalRoot.querySelector('#ocr-status-label');
          const pctEl = modalRoot.querySelector('#ocr-pct-label');
          const barEl = modalRoot.querySelector('#ocr-progress-bar');
          if (statusEl) statusEl.textContent = `📱 ${status}`;
          if (pctEl) pctEl.textContent = `${pct}%`;
          if (barEl) barEl.style.width = `${pct}%`;
        }
      });

      capturedThumbnailDataUrl = scanRes.thumbnailDataUrl || '';

      const nameInput = modalRoot.querySelector('#cs-name');
      const weightInput = modalRoot.querySelector('#cs-weight');
      const categorySelect = modalRoot.querySelector('#cs-category');
      const priceInput = modalRoot.querySelector('#cs-price');
      const basePriceInput = modalRoot.querySelector('#cs-base-price');

      if (nameInput) nameInput.value = scanRes.name;
      if (barcodeInput && scanRes.barcode) barcodeInput.value = scanRes.barcode;
      if (weightInput) weightInput.value = scanRes.weight;
      if (categorySelect && scanRes.category) categorySelect.value = scanRes.category;
      if (priceInput) priceInput.value = scanRes.price.toFixed(2);
      if (basePriceInput) basePriceInput.value = scanRes.basePrice.toFixed(2);

      const emojiRadio = modalRoot.querySelector(`input[name="emoji"][value="${scanRes.emoji}"]`);
      if (emojiRadio) emojiRadio.checked = true;

      if (preview) {
        preview.innerHTML = `
          <div class="flex items-center gap-2.5">
            ${capturedThumbnailDataUrl ? `<img src="${capturedThumbnailDataUrl}" alt="Shelf tag preview" class="size-12 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5" />` : ''}
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-black text-emerald-900">✓ Extracted on Phone (${escapeHtml(scanRes.engine)})</p>
              <p class="truncate text-[11px] font-bold text-slate-700">${escapeHtml(scanRes.name)} · ${escapeHtml(scanRes.weight)}</p>
              <p class="text-[11px] font-black text-emerald-700">R ${scanRes.price.toFixed(2)} ${scanRes.basePrice > scanRes.price ? `<span class="text-slate-400 line-through font-normal">Was R ${scanRes.basePrice.toFixed(2)}</span>` : ''}</p>
            </div>
          </div>
        `;
      }

      automationCore.triggerHaptic?.('success');
      showToast(`📱 Phone OCR: ${scanRes.name} (R${scanRes.price.toFixed(2)})`);
    } catch (err) {
      if (preview) {
        preview.innerHTML = `<span class="text-amber-700">Could not auto-read label (${escapeHtml(err?.message || 'blurry photo')}) — type details below or tap a preset.</span>`;
      }
    }
  };

  modalRoot.querySelector('#shelf-tag-camera')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) runOnDeviceShelfScan(file);
  });

  if (initialShelfImageBlob) {
    runOnDeviceShelfScan(initialShelfImageBlob);
  }

  // Handle Quick Regional Brand Presets
  modalRoot.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = regionalPresets[parseInt(btn.dataset.preset, 10)];
      if (preset) {
        modalRoot.querySelector('#cs-name').value = preset.name;
        modalRoot.querySelector('#cs-weight').value = preset.weight;
        modalRoot.querySelector('#cs-category').value = preset.category;
        modalRoot.querySelector('#cs-price').value = preset.price;
        modalRoot.querySelector('#cs-base-price').value = preset.basePrice;
        showToast(`Loaded ${preset.name}`);
      }
    });
  });

  modalRoot.querySelector('#crowdsource-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const cleanBarcode = String(formData.get('barcode') || initialCode).trim();
    const price = parseFloat(formData.get('price')) || 19.99;
    const basePrice = Math.max(price, parseFloat(formData.get('basePrice')) || price);
    const cleanName = String(formData.get('name') || '').trim();

    const newProduct = {
      barcode: cleanBarcode,
      gtin: cleanBarcode,
      name: cleanName,
      title: cleanName,
      brand: 'Shoprite',
      category: formData.get('category'),
      weight: String(formData.get('weight') || '1 unit').trim(),
      price,
      promoPrice: price < basePrice ? price : null,
      basePrice,
      image: capturedThumbnailDataUrl || '',
      imageUrl: capturedThumbnailDataUrl || '',
      emoji: formData.get('emoji') || '🛍️',
      retailerId: state.retailerId || 'shoprite',
      indexedVia: 'on_device_cellphone_ocr'
    };

    // Save to active catalog AND persist forever on cellphone in IndexedDB
    PRODUCTS.set(cleanBarcode, newProduct);
    STORE_PRICES.delete(`${state.currentStoreId}_${cleanBarcode}`);
    await saveLocalCustomProduct(newProduct);

    addProductToTrolley(newProduct, 1, state.retailerId, false);
    closeModal();
    routeTo('trolley');
    showToast(`📳 ${newProduct.name} saved forever on phone & added!`);
  });
}

function completeDeliveryPayment(event) {
  event.preventDefault();
  if (event.currentTarget && typeof event.currentTarget.reportValidity === 'function') {
    if (!event.currentTarget.reportValidity()) return;
  }
  const activeStore = getActiveStore(state.retailerId);
  const code = String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');
  state.order = {
    id: Date.now().toString(36).slice(-6).toUpperCase(),
    type: 'delivery',
    code,
    step: 0,
    items: structuredClone(state.cart),
    total: getPayableTotal(),
    savings: getCurrentSavings(),
    storeName: activeStore.name,
    storeCode: activeStore.retailerStoreCode,
    retailerId: state.retailerId,
    createdAt: Date.now()
  };
  saveLocalOrderRecord(state.order);
  state.pastReceipts = [state.order, ...(state.pastReceipts || [])];
  state.completedSavings += getCurrentSavings();
  state.loyaltyPoints += Math.floor(getPayableTotal());
  state.cart = [];
  savePersistedState();
  closeModal();
  routeTo('tracker');
  showToast('Payment approved - delivery created');
}

// ============================================================================
// PILLAR 3: AT THE TILL — SEQUENTIAL 1-BY-1 BARCODE CHECKOUT (TOP VOLUME +)
// ============================================================================

async function openMasterBarcode(retailerId = state.retailerId, stepIndex = 0) {
  const targetRet = retailerId || state.retailerId || 'shoprite';
  const retailer = RETAILERS[targetRet] || RETAILERS.shoprite;
  const activeStore = getActiveStore(targetRet);
  const cartItems = getRetailerCart(targetRet);

  if (!cartItems.length) {
    showToast(`Your ${retailer.name} Trolley is empty — search or scan products first!`);
    return;
  }

  await openSequentialTillCheckout({
    modalRoot,
    state,
    retailer,
    activeStore,
    cartItems,
    zar,
    payableTotal: getPayableTotal(targetRet),
    totalSavings: getCurrentSavings(targetRet),
    automationCore,
    playAdvanceSound,
    initialIndex: stepIndex,
    onVoidCartItem: (origBarcode) => {
      state.cart = state.cart.filter((c) => c.barcode !== origBarcode);
      savePersistedState();
      updateCartBadge();
    },
    onCompleteCheckout: async (summary) => {
      const savedNow = summary?.totalSavings ?? getCurrentSavings(targetRet);
      const paidNow = summary?.payableTotal ?? getPayableTotal(targetRet);
      const earnedPts = Math.floor(paidNow);
      const slipRecord = {
        id: `SR-${Date.now().toString(36).slice(-6).toUpperCase()}`,
        type: 'instore_pos_till',
        retailerId: targetRet,
        retailerName: retailer.name,
        storeId: activeStore.id,
        storeName: activeStore.name,
        storeCode: activeStore.retailerStoreCode,
        items: summary?.items || structuredClone(cartItems),
        total: paidNow,
        savings: savedNow,
        xtraCardNumber: summary?.xtraCardNumber || null,
        createdAt: Date.now()
      };
      await saveLocalOrderRecord(slipRecord);
      state.pastReceipts = [slipRecord, ...(state.pastReceipts || [])];
      state.completedSavings += savedNow;
      state.loyaltyPoints += earnedPts;
      state.cart = [];
      savePersistedState();
      updateCartBadge();
      routeTo('tracker');
      showToast(`🎉 Till checkout complete! Digital Slip #${slipRecord.id} saved (+${earnedPts} pts)`);
    },
    showToast
  });
}

// Shared Web Audio Context (avoids browser max-6 AudioContext limit during rapid scanning)
let sharedAudioCtx = null;
function getSharedAudioContext() {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

function playBeepSound() {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // Crisp POS C6 beep
    osc.frequency.setValueAtTime(1318.5, now + 0.055); // E6 confirmation chime
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch (_) {}
}

function playAdvanceSound(isComplete = false) {
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    if (isComplete) {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.07);
      osc.frequency.setValueAtTime(1567.98, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      osc.frequency.setValueAtTime(1244.5, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (_) {}
}

// ============================================================================
// PILLAR 2: CONTINUOUS PHONE CAMERA BARCODE SCANNER + VIBRATION
// ============================================================================

async function openLiveCameraScanner() {
  const activeStore = getActiveStore(state.retailerId);

  await openContinuousPhoneScanner({
    modalRoot,
    state,
    activeStore,
    zar,
    searchCatalogProducts: (q) => searchCatalogProducts(q, activeStore.id),
    onBarcodeDetected: async (code) => {
      const product = await fetchProductFromFirestore(code);
      if (product === '__XTRA_CARD__') {
        setTimeout(() => openShopriteXtraCardHelper(), 60);
        return null;
      }
      if (!product) {
        setTimeout(() => openCrowdsourceModal(code), 60);
        return null;
      }
      const added = addProductToTrolley(product, 1, state.retailerId, true);
      if (state.route === 'trolley' || state.route === 'cartel') {
        renderCartel();
      } else if (state.route === 'market') {
        renderMarket();
      }
      return added;
    },
    onQuickAddProduct: (gtin) => {
      const added = addProductToTrolley(gtin, 1, state.retailerId, true);
      if (state.route === 'trolley' || state.route === 'cartel') {
        renderCartel();
      } else if (state.route === 'market') {
        renderMarket();
      }
      return added;
    },
    onChangeCartQty: (barcode, delta) => {
      const row = changeCartItemQty(barcode, delta, state.retailerId);
      if (state.route === 'trolley' || state.route === 'cartel') {
        renderCartel();
      } else if (state.route === 'market') {
        renderMarket();
      }
      return row;
    },
    getRetailerCart: (retId) => getRetailerCart(retId || state.retailerId),
    getPayableTotal: (retId) => getPayableTotal(retId || state.retailerId),
    onOpenTillCheckout: () => openMasterBarcode(state.retailerId),
    onGoToTrolley: () => routeTo('trolley'),
    onOpenShelfTagOcr: (capturedBlob) => setTimeout(() => openCrowdsourceModal('', capturedBlob), 60),
    onOpenScalePlu: () => setTimeout(() => openLooseScalePluHelper(), 60),
    showToast
  });
}

function closeModal() {
  state.overlay = null;
  modalRoot.innerHTML = '';
}

function bindModalClose() {
  modalRoot.querySelectorAll('[data-close-modal]').forEach((btn) => {
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Close dialog');
    btn.addEventListener('click', closeModal);
  });
  const backdrop = modalRoot.firstElementChild;
  if (backdrop && backdrop.tagName !== 'DIALOG') {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('toast-visible');
    window.setTimeout(() => toast.classList.add('hidden'), 180);
  }, 2500);
}

async function handleHardwareScan(rawScan) {
  const cleanInput = String(rawScan).trim();
  if (!cleanInput) return;

  // Check if this is a multi-line barcode stream
  const lines = cleanInput.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) {
    state.scanBusy = true;
    let matchedCount = 0;
    for (const code of lines) {
      const product = await fetchProductFromFirestore(code);
      if (product && product !== '__XTRA_CARD__') {
        addToCart(product, state.retailerId, { silent: true });
        matchedCount++;
      }
    }
    state.scanBusy = false;
    automationCore.vibrateProductAdded();
    playBeepSound();
    routeTo('trolley');
    showToast(`📳 Scanned Stream: Added ${matchedCount} items to ${getRetailer().name} Trolley!`);
    return;
  }

  const cleanBarcode = lines[0] || cleanInput;
  const retailer = Object.values(RETAILERS).find((item) => item.entryBarcode === cleanBarcode);
  if (retailer) {
    state.retailerId = retailer.id;
    savePersistedState();
    routeTo('trolley');
    showToast(`Welcome to ${retailer.name} — scanner linked`);
    return;
  }
  state.scanBusy = true;
  if (state.route === 'trolley' || state.route === 'cartel') {
    const status = document.querySelector('#scan-status');
    if (status) status.textContent = `Looking up ${cleanBarcode}...`;
  }
  try {
    const product = await fetchProductFromFirestore(cleanBarcode);
    if (product === '__XTRA_CARD__') {
      openShopriteXtraCardHelper();
      return;
    }
    if (!product) {
      openCrowdsourceModal(cleanBarcode);
      return;
    }
    addProductToTrolley(product, 1, state.retailerId, true);
    if (state.route === 'trolley' || state.route === 'cartel') {
      renderCartel();
    } else if (state.route === 'market') {
      renderMarket();
    }
  } catch (error) {
    console.error('Hardware product scan failed:', error);
    openCrowdsourceModal(cleanBarcode);
  } finally {
    state.scanBusy = false;
  }
}

// Global Keyboard & Detector Stream Logic
const SCANNER_SPEED_THRESHOLD_MS = 40;
let scanBuffer = '';
let lastScannerKeyAt = 0;
let isHardwareStream = false;
let scanQueue = Promise.resolve();

function hardwareScannerKeydown(event) {
  // Escape light-dismisses any non-<dialog> overlay inside modalRoot
  if (event.key === 'Escape' && modalRoot.firstElementChild && modalRoot.firstElementChild.tagName !== 'DIALOG') {
    event.preventDefault();
    closeModal();
    return;
  }
  // Never intercept keys when Sequential Till Checkout is open (Volume Up / Arrows step barcodes)
  if (state.overlay === 'till-checkout' || state.overlay === 'camera') return;
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
  const now = performance.now();
  const gap = lastScannerKeyAt ? now - lastScannerKeyAt : Infinity;
  const isInputFocused = document.activeElement && (
    document.activeElement.tagName === 'INPUT' ||
    document.activeElement.tagName === 'TEXTAREA' ||
    document.activeElement.isContentEditable
  );

  if (event.key === 'Enter') {
    if (scanBuffer.length >= MIN_BARCODE_LENGTH && isHardwareStream) {
      event.preventDefault();
      event.stopPropagation();
      const barcode = scanBuffer.trim();
      scanBuffer = '';
      lastScannerKeyAt = 0;
      isHardwareStream = false;

      if (isInputFocused && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }

      scanQueue = scanQueue.then(() => handleHardwareScan(barcode));
      return;
    }
    scanBuffer = '';
    lastScannerKeyAt = 0;
    isHardwareStream = false;
    return;
  }

  // Barcode characters: alphanumeric or dash
  if (event.key.length === 1 && /^[0-9A-Za-z\-]$/.test(event.key)) {
    if (gap <= SCANNER_SPEED_THRESHOLD_MS) {
      isHardwareStream = true;
      scanBuffer += event.key;
      lastScannerKeyAt = now;

      if (isInputFocused) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      if (!isInputFocused) {
        scanBuffer = event.key;
        isHardwareStream = false;
        lastScannerKeyAt = now;
      } else {
        scanBuffer = '';
        isHardwareStream = false;
        lastScannerKeyAt = 0;
      }
    }
  }
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const dlBtn = document.querySelector('#header-download-button');
  if (dlBtn) {
    dlBtn.classList.add('ring-2', 'ring-[#e11d2e]', 'bg-rose-50', 'animate-pulse');
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const dlBtn = document.querySelector('#header-download-button');
  if (dlBtn) {
    dlBtn.classList.remove('animate-pulse');
  }
  showToast('✓ Automater is installed as a native app!');
});

function openInstallModal() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-950/70 p-4 backdrop-blur-sm flex items-end sm:items-center justify-center modal-enter">
      <div class="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl text-slate-900 border border-slate-100 max-h-[90dvh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <span class="grid size-12 place-items-center rounded-2xl bg-[#e11d2e] text-white text-xl font-black shadow-lg shadow-red-600/30">📥</span>
            <div>
              <h2 class="text-lg font-black tracking-tight">Install Automater Smart Trolley</h2>
              <p class="text-xs text-slate-400">Zero-Queue Shoprite Scanner &amp; Till Mode</p>
            </div>
          </div>
          <button id="close-install-modal" type="button" class="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500 hover:bg-slate-200">
            &times;
          </button>
        </div>

        <div class="mt-5 space-y-4">
          ${isStandalone ? `
            <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-3">
              <span class="text-2xl">✅</span>
              <div>
                <strong class="block text-xs font-black text-emerald-800">Native Standalone Mode Active</strong>
                <span class="text-[11px] text-emerald-600">Automater is running as an installed application on this device.</span>
              </div>
            </div>
          ` : `
            <div class="rounded-3xl border border-rose-200 bg-rose-50/60 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="rounded-full bg-[#e11d2e] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Recommended</span>
                <span class="text-[10px] font-bold text-[#e11d2e]">Works 100% Offline in Store</span>
              </div>
              <h3 class="text-sm font-black text-slate-900">Install to Home Screen</h3>
              <p class="text-xs text-slate-500 mt-1 leading-5">Caches all 80 SA Shoprite locations, branch deals, camera barcode scanner, and 1D till barcodes for instant offline use inside thick-walled malls.</p>
              
              <button id="trigger-pwa-install-btn" type="button" class="mt-3.5 w-full rounded-2xl bg-[#e11d2e] py-3 text-xs font-black text-white shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition flex items-center justify-center gap-2">
                <span>📲</span><span>Install Automater App Now</span>
              </button>

              ${isIOS ? `
                <div class="mt-3 rounded-xl bg-white/80 p-3 border border-rose-100 text-xs text-slate-600 space-y-1">
                  <p class="font-black text-slate-900">📱 iOS Safari Steps:</p>
                  <p>1. Tap <strong>Share</strong> at the bottom of Safari.</p>
                  <p>2. Tap <strong>Add to Home Screen ➕</strong>.</p>
                </div>
              ` : ''}
            </div>
          `}

          <div class="rounded-3xl border border-slate-100 bg-white p-4">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Zero-Queue Hardware Capabilities</h4>
            <div class="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>📍</span><span>80 SA Shoprites Offline</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>📳</span><span>Haptic Add Vibration</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>📷</span><span>Optical EAN-13 Scanner</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>🔊+</span><span>Top Volume Till Stepper</span>
              </div>
            </div>
          </div>
        </div>

        <button id="close-install-btn-bottom" type="button" class="mt-5 w-full rounded-2xl bg-slate-100 py-3 text-xs font-black text-slate-700 hover:bg-slate-200 active:scale-95 transition">
          Close
        </button>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-install-modal')?.addEventListener('click', closeModal);
  modalRoot.querySelector('#close-install-btn-bottom')?.addEventListener('click', closeModal);

  modalRoot.querySelector('#trigger-pwa-install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('✓ Automater is installing to your device!');
        closeModal();
      }
      deferredInstallPrompt = null;
    } else if (isIOS) {
      showToast('Follow the Safari steps above to Add to Home Screen!');
    } else {
      showToast('Tap browser menu (⋮) -> "Install app" or "Add to Home Screen"');
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTOMATER_PRODUCT_SELECTED' && event.data.product) {
    const scraped = event.data.product;
    const barcode = scraped.barcode;
    state.selectedCatalogBarcode = barcode;
    PRODUCTS.set(barcode, scraped);
    automationCore.selectProduct({ barcode, ...scraped });
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(45);
    showToast(`✓ Captured: ${scraped.name} (${zar.format(scraped.price)})`);
    renderMarket();
  }
});

window.addEventListener('keydown', hardwareScannerKeydown, { capture: true });
window.addEventListener('hashchange', () => { state.route = getRouteFromHash(); render(); });
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => routeTo(button.dataset.route)));
document.querySelector('#header-search-button')?.addEventListener('click', () => toggleGlobalSearchDrawer());
document.querySelector('#header-store-button')?.addEventListener('click', () => openStoreBranchModal(!state.storeConfirmed));
document.querySelector('#header-download-button')?.addEventListener('click', openInstallModal);
document.querySelector('#header-cart-button')?.addEventListener('click', () => routeTo('trolley'));
document.querySelector('#header-camera-button')?.addEventListener('click', openLiveCameraScanner);
window.handleHardwareScan = handleHardwareScan;
window.openLiveCameraScanner = openLiveCameraScanner;
window.openTillCheckout = openMasterBarcode;
window.openStoreBranchModal = openStoreBranchModal;
window.openInstallModal = openInstallModal;
window.openCrowdsourceModal = openCrowdsourceModal;

async function hydrateCellphoneVaultAndPermanentPackshots() {
  // 1. Request non-evictable cellphone storage so CSE packshots & scanned barcodes persist forever
  await ensurePersistentCellphoneStorage();

  // 2. Restore all user-scanned shelf-tag OCR / OpenFoodFacts products & past Digital Till Slips from IndexedDB
  const [savedCustom, savedOrders] = await Promise.all([
    loadAllLocalCustomProducts(),
    loadAllLocalOrders()
  ]);

  let needsRender = false;
  if (savedCustom.length > 0) {
    for (const item of savedCustom) {
      if (item && item.barcode) {
        PRODUCTS.set(item.barcode, item);
      }
    }
    needsRender = true;
  }
  if (savedOrders.length > 0) {
    state.pastReceipts = savedOrders;
    needsRender = true;
  }
  if (needsRender) {
    render();
  }

  // 3. Register Service Worker & warm permanent CSE packshot cache in background during idle time
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const warmPackshots = () => {
        const sw = reg.active || navigator.serviceWorker.controller;
        if (!sw) return;
        const packshotUrls = Array.from(MASTER_PRODUCTS.values())
          .map((p) => p.imageUrl)
          .filter((u) => u && u.startsWith('/products/'));
        sw.postMessage({ type: 'WARM_PACKSHOTS_FOREVER', urls: packshotUrls });
      };
      const scheduleIdle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2500));
      scheduleIdle(warmPackshots);
    } catch (error) {
      console.warn('Service worker registration skipped:', error);
    }
  }
}

initializeFirebaseConnectivity();
render();
hydrateCellphoneVaultAndPermanentPackshots();
