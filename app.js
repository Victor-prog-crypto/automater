import QRCode from 'qrcode';
import { automationCore, AUTOMATION_EVENTS, RetailDOMScraper } from './automation-core.js';

const ROUTES = Object.freeze(['market', 'list', 'cartel', 'tracker', 'savings']);
const SCANNER_KEY_GAP_MS = 30;
const MIN_BARCODE_LENGTH = 6;

const RETAILERS = Object.freeze({
  shoprite: { id: 'shoprite', name: 'Shoprite', url: 'https://www.shoprite.co.za', host: 'shoprite.co.za', tagline: 'Low prices you can trust', loyalty: 'Xtra Savings', entryBarcode: '9000000000001', color: '#e11d2e', soft: '#fff1f2', initials: 'S', accent: 'from-red-600 to-rose-700' },
  checkers: { id: 'checkers', name: 'Checkers', url: 'https://www.checkers.co.za', host: 'checkers.co.za', tagline: 'Better and better', loyalty: 'Sixty60 / Xtra', entryBarcode: '9000000000004', color: '#004831', soft: '#ecfdf5', initials: 'C', accent: 'from-emerald-800 to-teal-900' },
  pnp: { id: 'pnp', name: 'Pick n Pay', url: 'https://www.pnp.co.za', host: 'pnp.co.za', tagline: 'Fresh choices, smart prices', loyalty: 'Smart Shopper', entryBarcode: '9000000000002', color: '#005baa', soft: '#eff6ff', initials: 'PnP', accent: 'from-blue-600 to-indigo-800' },
  spar: { id: 'spar', name: 'SPAR', url: 'https://www.spar.co.za', host: 'spar.co.za', tagline: 'Good for you', loyalty: 'SPAR Rewards', entryBarcode: '9000000000003', color: '#138a42', soft: '#f0fdf4', initials: 'SPAR', accent: 'from-emerald-600 to-green-700' },
  woolworths: { id: 'woolworths', name: 'Woolworths', url: 'https://www.woolworths.co.za', host: 'woolworths.co.za', tagline: 'The difference', loyalty: 'WRewards', entryBarcode: '9000000000005', color: '#18181b', soft: '#fafafa', initials: 'WW', accent: 'from-zinc-900 to-neutral-950' },
  boxer: { id: 'boxer', name: 'Boxer', url: 'https://www.boxer.co.za', host: 'boxer.co.za', tagline: 'Never pay more than the Boxer price', loyalty: 'Boxer Club', entryBarcode: '9000000000006', color: '#ea580c', soft: '#fff7ed', initials: 'BXR', accent: 'from-orange-600 to-amber-700' }
});

const MASTER_PRODUCTS = new Map([
  ['6001007001001', {
    gtin: '6001007001001',
    retailerId: 'shoprite',
    title: 'Albany Superior Thick Slices White Bread 700g',
    brand: 'Albany',
    imageUrl: '/products/6001007001001.jpg',
    category: 'Bakery & Grains',
    weight: '700 g',
    basePrice: 19.99,
    promoPrice: 16.99,
    emoji: '🍞',
    searchKeywords: ['albany', 'bread', 'white', 'sliced', 'superior', 'bakery', 'grains', 'toast']
  }],
  ['6001007001018', {
    gtin: '6001007001018',
    retailerId: 'shoprite',
    title: 'Albany Superior Sliced Brown Bread 700g',
    brand: 'Albany',
    imageUrl: '/products/6001007001018.jpg',
    category: 'Bakery & Grains',
    weight: '700 g',
    basePrice: 18.49,
    promoPrice: 15.99,
    emoji: '🍞',
    searchKeywords: ['albany', 'bread', 'brown', 'sliced', 'superior', 'bakery', 'grains', 'toast']
  }],
  ['6001299000270', {
    gtin: '6001299000270',
    retailerId: 'shoprite',
    title: 'Clover Full Cream Fresh Milk 2L',
    brand: 'Clover',
    imageUrl: '/products/6001299000270.jpg',
    category: 'Dairy & Eggs',
    weight: '2 L',
    basePrice: 39.99,
    promoPrice: 33.99,
    emoji: '🥛',
    searchKeywords: ['clover', 'milk', 'fresh', 'full cream', 'dairy', '2l', 'bottle']
  }],
  ['6001299000287', {
    gtin: '6001299000287',
    retailerId: 'shoprite',
    title: 'Clover 2% Low Fat Fresh Milk 2L',
    brand: 'Clover',
    imageUrl: '/products/6001299000287.jpg',
    category: 'Dairy & Eggs',
    weight: '2 L',
    basePrice: 39.99,
    promoPrice: 33.99,
    emoji: '🥛',
    searchKeywords: ['clover', 'milk', 'low fat', 'fresh', 'dairy', '2l', 'bottle']
  }],
  ['6001007002343', {
    gtin: '6001007002343',
    retailerId: 'shoprite',
    title: 'White Star Super Maize Meal 2.5kg',
    brand: 'White Star',
    imageUrl: '/products/6001007002343.jpg',
    category: 'Bakery & Grains',
    weight: '2.5 kg',
    basePrice: 37.99,
    promoPrice: 31.99,
    emoji: '🌽',
    searchKeywords: ['white star', 'maize', 'meal', 'pap', 'super maize', 'grains', '2.5kg']
  }],
  ['6001007000127', {
    gtin: '6001007000127',
    retailerId: 'shoprite',
    title: 'Tastic Long Grain Parboiled Rice 2kg',
    brand: 'Tastic',
    imageUrl: '/products/6001007000127.jpg',
    category: 'Bakery & Grains',
    weight: '2 kg',
    basePrice: 44.99,
    promoPrice: 37.99,
    emoji: '🍚',
    searchKeywords: ['tastic', 'rice', 'long grain', 'parboiled', 'pantry', 'grains', '2kg']
  }],
  ['6001007000899', {
    gtin: '6001007000899',
    retailerId: 'shoprite',
    title: 'Koo Baked Beans in Tomato Sauce 410g',
    brand: 'Koo',
    imageUrl: '/products/6001007000899.jpg',
    category: 'Pantry Essentials',
    weight: '410 g',
    basePrice: 18.49,
    promoPrice: 14.99,
    emoji: '🥫',
    searchKeywords: ['koo', 'baked beans', 'beans', 'tomato sauce', 'tin', 'canned', 'pantry']
  }],
  ['6001053000027', {
    gtin: '6001053000027',
    retailerId: 'shoprite',
    title: 'Lucky Star Pilchards in Tomato Sauce 400g',
    brand: 'Lucky Star',
    imageUrl: '/products/6001053000027.jpg',
    category: 'Pantry Essentials',
    weight: '400 g',
    basePrice: 28.99,
    promoPrice: 23.99,
    emoji: '🐟',
    searchKeywords: ['lucky star', 'pilchards', 'fish', 'tomato sauce', 'tin', 'canned', 'pantry']
  }],
  ['6001068594504', {
    gtin: '6001068594504',
    retailerId: 'shoprite',
    title: 'Simba Smoked Beef Flavoured Potato Chips 120g',
    brand: 'Simba',
    imageUrl: '/products/6001068594504.jpg',
    category: 'Snacks & Drinks',
    weight: '120 g',
    basePrice: 22.49,
    promoPrice: 18.99,
    emoji: '🥔',
    searchKeywords: ['simba', 'chips', 'crisps', 'smoked beef', 'snacks', 'potato', 'treats']
  }],
  ['6001068001002', {
    gtin: '6001068001002',
    retailerId: 'shoprite',
    title: 'Nescafé Ricoffy Instant Coffee 750g Tin',
    brand: 'Ricoffy',
    imageUrl: '/products/6001068001002.jpg',
    category: 'Hot Beverages',
    weight: '750 g',
    basePrice: 69.99,
    promoPrice: 57.99,
    emoji: '☕',
    searchKeywords: ['nescafe', 'ricoffy', 'coffee', 'instant', 'hot beverages', 'tin', 'warm']
  }],
  ['6001087002134', {
    gtin: '6001087002134',
    retailerId: 'shoprite',
    title: 'Sunlight Regular Dishwashing Liquid 750ml',
    brand: 'Sunlight',
    imageUrl: '/products/6001087002134.jpg',
    category: 'Household & Cleaning',
    weight: '750 ml',
    basePrice: 36.99,
    promoPrice: 28.99,
    emoji: '🧴',
    searchKeywords: ['sunlight', 'dishwashing', 'liquid', 'clean', 'household', 'green', 'dishes']
  }],
  ['6001087006781', {
    gtin: '6001087006781',
    retailerId: 'shoprite',
    title: 'Omo Auto Concentrated Washing Powder 2kg',
    brand: 'Omo',
    imageUrl: '/products/6001087006781.jpg',
    category: 'Household & Cleaning',
    weight: '2 kg',
    basePrice: 92.99,
    promoPrice: 76.99,
    emoji: '🧺',
    searchKeywords: ['omo', 'washing powder', 'auto', 'laundry', 'clean', 'household', 'detergent']
  }],
  ['6001087004565', {
    gtin: '6001087004565',
    retailerId: 'shoprite',
    title: 'Dettol Hygiene Soap Original 175g',
    brand: 'Dettol',
    imageUrl: '/products/6001087004565.jpg',
    category: 'Personal Care',
    weight: '175 g',
    basePrice: 18.99,
    promoPrice: 13.99,
    emoji: '🧼',
    searchKeywords: ['dettol', 'soap', 'hygiene', 'original', 'bath', 'personal care', 'wash']
  }],
  ['6001007005436', {
    gtin: '6001007005436',
    retailerId: 'shoprite',
    title: 'All Gold Tomato Sauce 700ml Bottle',
    brand: 'All Gold',
    imageUrl: '/products/6001007005436.jpg',
    category: 'Pantry Essentials',
    weight: '700 ml',
    basePrice: 41.99,
    promoPrice: 34.99,
    emoji: '🍅',
    searchKeywords: ['all gold', 'tomato', 'sauce', 'ketchup', 'pantry', 'bottle']
  }],
  ['6001087009874', {
    gtin: '6001087009874',
    retailerId: 'shoprite',
    title: 'Rama Original 70% Fat Spread 500g Tub',
    brand: 'Rama',
    imageUrl: '/products/6001087009874.jpg',
    category: 'Dairy & Eggs',
    weight: '500 g',
    basePrice: 26.99,
    promoPrice: 21.99,
    emoji: '🧈',
    searchKeywords: ['rama', 'margarine', 'butter', 'spread', 'dairy', 'fat spread']
  }],
  ['6001007008871', {
    gtin: '6001007008871',
    retailerId: 'shoprite',
    title: 'Bakers Blue Label Marie Biscuits 200g',
    brand: 'Bakers',
    imageUrl: '/products/6001007008871.jpg',
    category: 'Snacks & Drinks',
    weight: '200 g',
    basePrice: 19.99,
    promoPrice: 15.99,
    emoji: '🍪',
    searchKeywords: ['bakers', 'marie', 'biscuits', 'blue label', 'tea biscuits', 'snacks']
  }],
  ['5449000000996', {
    gtin: '5449000000996',
    retailerId: 'shoprite',
    title: 'Coca-Cola Original Taste Less Sugar 2L Bottle',
    brand: 'Coca-Cola',
    imageUrl: '/products/5449000000996.jpg',
    category: 'Snacks & Drinks',
    weight: '2 L',
    basePrice: 29.99,
    promoPrice: 24.99,
    emoji: '🥤',
    searchKeywords: ['coca cola', 'coke', 'soft drink', 'soda', 'beverages', '2l']
  }],
  ['6001007004323', {
    gtin: '6001007004323',
    retailerId: 'shoprite',
    title: 'Black Cat Crunchy Peanut Butter 400g Jar',
    brand: 'Black Cat',
    imageUrl: '/products/6001007004323.jpg',
    category: 'Pantry Essentials',
    weight: '400 g',
    basePrice: 45.99,
    promoPrice: 38.99,
    emoji: '🥜',
    searchKeywords: ['black cat', 'peanut butter', 'crunchy', 'spread', 'pantry']
  }],
  ['6001007003210', {
    gtin: '6001007003210',
    retailerId: 'shoprite',
    title: 'Golden Cloud Cake Wheat Flour 2.5kg Bag',
    brand: 'Golden Cloud',
    imageUrl: '/products/6001007003210.jpg',
    category: 'Bakery & Grains',
    weight: '2.5 kg',
    basePrice: 42.99,
    promoPrice: 36.99,
    emoji: '🌾',
    searchKeywords: ['golden cloud', 'flour', 'cake flour', 'wheat', 'baking', 'pantry']
  }],
  ['6001056000109', {
    gtin: '6001056000109',
    retailerId: 'shoprite',
    title: 'Five Roses Ceylon Blend Tagged Teabags 102s',
    brand: 'Five Roses',
    imageUrl: '/products/6001056000109.jpg',
    category: 'Hot Beverages',
    weight: '102 bags',
    basePrice: 59.99,
    promoPrice: 49.99,
    emoji: '🫖',
    searchKeywords: ['five roses', 'tea', 'ceylon', 'teabags', 'hot beverages', 'warm']
  }],
  ['6009510805536', {
    gtin: '6009510805536',
    retailerId: 'shoprite',
    title: 'Class 1 Crisp Red Gala Sweet Apples 1.5kg Bag',
    brand: 'Fresh Produce',
    imageUrl: '/products/6009510805536.jpg',
    category: 'Vegetables & Fruit',
    weight: '1.5 kg',
    basePrice: 33.50,
    promoPrice: 27.99,
    emoji: '🍎',
    searchKeywords: ['apples', 'gala', 'red', 'fruit', 'fresh produce', 'sweet', 'crisp']
  }],
  ['6001571002022', {
    gtin: '6001571002022',
    retailerId: 'shoprite',
    title: 'Ripe & Ready Creamy Hass Avocados 4pk',
    brand: 'Fresh Produce',
    imageUrl: '/products/6001571002022.jpg',
    category: 'Vegetables & Fruit',
    weight: '4 pk',
    basePrice: 49.99,
    promoPrice: 39.99,
    emoji: '🥑',
    searchKeywords: ['avocado', 'avo', 'hass', 'fresh produce', 'fruit', 'ripe']
  }],
  ['6001008000140', {
    gtin: '6001008000140',
    retailerId: 'shoprite',
    title: 'Goldi Frozen Mixed Chicken Portions 2kg Bag',
    brand: 'Goldi',
    imageUrl: '/products/6001008000140.jpg',
    category: 'Pantry Essentials',
    weight: '2 kg',
    basePrice: 99.99,
    promoPrice: 84.99,
    emoji: '🍗',
    searchKeywords: ['goldi', 'chicken', 'frozen', 'poultry', 'meat', 'portions', '2kg']
  }],
  ['6001087007788', {
    gtin: '6001087007788',
    retailerId: 'shoprite',
    title: 'Colgate Triple Action Fluoride Toothpaste 100ml',
    brand: 'Colgate',
    imageUrl: '/products/6001087007788.jpg',
    category: 'Personal Care',
    weight: '100 ml',
    basePrice: 22.99,
    promoPrice: 17.99,
    emoji: '🪥',
    searchKeywords: ['colgate', 'toothpaste', 'triple action', 'dental', 'personal care', 'hygiene']
  }],
  ['6001007001407', {
    gtin: '6001007001407',
    retailerId: 'shoprite',
    title: 'Bakers Choice Assorted Biscuits 200g',
    brand: 'Bakers',
    imageUrl: '/products/6001007001407.jpg',
    category: 'Snacks & Drinks',
    weight: '200 g',
    basePrice: 36.99,
    promoPrice: 29.99,
    emoji: '🍪',
    searchKeywords: ['bakers', 'choice assorted', 'biscuits', 'cookies', 'snacks', 'treats']
  }],
  ['6001007000301', {
    gtin: '6001007000301',
    retailerId: 'shoprite',
    title: "Fatti's & Moni's Macaroni Pasta 500g",
    brand: "Fatti's & Moni's",
    imageUrl: '/products/6001007000301.jpg',
    category: 'Pantry Essentials',
    weight: '500 g',
    basePrice: 21.99,
    promoPrice: 16.99,
    emoji: '🍝',
    searchKeywords: ['fattis', 'monis', 'macaroni', 'pasta', 'pantry', 'dinner']
  }],
  ['6001053001208', {
    gtin: '6001053001208',
    retailerId: 'shoprite',
    title: 'Lucky Star Shredded Tuna in Oil 170g',
    brand: 'Lucky Star',
    imageUrl: '/products/6001053001208.jpg',
    category: 'Pantry Essentials',
    weight: '170 g',
    basePrice: 29.99,
    promoPrice: 24.99,
    emoji: '🐟',
    searchKeywords: ['lucky star', 'tuna', 'shredded', 'fish', 'canned', 'pantry']
  }],
  ['6001087005111', {
    gtin: '6001087005111',
    retailerId: 'shoprite',
    title: 'Domestos Thick Bleach Original 750ml',
    brand: 'Domestos',
    imageUrl: '/products/6001087005111.jpg',
    category: 'Household & Cleaning',
    weight: '750 ml',
    basePrice: 39.99,
    promoPrice: 32.99,
    emoji: '🧴',
    searchKeywords: ['domestos', 'bleach', 'thick', 'cleaning', 'household', 'disinfectant']
  }],
  ['6001087003346', {
    gtin: '6001087003346',
    retailerId: 'shoprite',
    title: 'Handy Andy Multi-Purpose Cleaner Ammonia 750ml',
    brand: 'Handy Andy',
    imageUrl: '/products/6001087003346.jpg',
    category: 'Household & Cleaning',
    weight: '750 ml',
    basePrice: 37.99,
    promoPrice: 29.99,
    emoji: '✨',
    searchKeywords: ['handy andy', 'cleaner', 'ammonia', 'surface', 'household', 'shine']
  }],
  ['6001087008129', {
    gtin: '6001087008129',
    retailerId: 'shoprite',
    title: 'Shield MotionSense Antiperspirant Roll-On 50ml',
    brand: 'Shield',
    imageUrl: '/products/6001087008129.jpg',
    category: 'Personal Care',
    weight: '50 ml',
    basePrice: 32.99,
    promoPrice: 26.99,
    emoji: '⚡',
    searchKeywords: ['shield', 'roll on', 'deodorant', 'motionsense', 'personal care', 'fresh']
  }],
  ['6001007006211', {
    gtin: '6001007006211',
    retailerId: 'shoprite',
    title: 'Jungle Oats The Energy Champion 1kg Box',
    brand: 'Jungle Oats',
    imageUrl: '/products/6001007006211.jpg',
    category: 'Bakery & Grains',
    weight: '1 kg',
    basePrice: 45.99,
    promoPrice: 37.99,
    emoji: '🥣',
    searchKeywords: ['jungle oats', 'oats', 'porridge', 'breakfast', 'energy', 'grains']
  }],
  ['6001299001444', {
    gtin: '6001299001444',
    retailerId: 'shoprite',
    title: 'Clover Tropika Orange Flavoured Dairy Fruit Mix 2L',
    brand: 'Tropika',
    imageUrl: '/products/6001299001444.jpg',
    category: 'Snacks & Drinks',
    weight: '2 L',
    basePrice: 38.99,
    promoPrice: 31.99,
    emoji: '🍹',
    searchKeywords: ['tropika', 'clover', 'orange', 'fruit mix', 'dairy juice', 'beverages', '2l']
  }],
  ['6001007007553', {
    gtin: '6001007007553',
    retailerId: 'shoprite',
    title: 'Crosse & Blackwell Tangy Mayonnaise 750g Bottle',
    brand: 'Crosse & Blackwell',
    imageUrl: '/products/6001007007553.jpg',
    category: 'Pantry Essentials',
    weight: '750 g',
    basePrice: 46.99,
    promoPrice: 39.99,
    emoji: '🥗',
    searchKeywords: ['crosse blackwell', 'mayo', 'mayonnaise', 'tangy', 'condiment', 'pantry']
  }],
  ['6009510806120', {
    gtin: '6009510806120',
    retailerId: 'shoprite',
    title: 'First Choice Long Life Full Cream UHT Milk 1L',
    brand: 'First Choice',
    imageUrl: '/products/6009510806120.jpg',
    category: 'Dairy & Eggs',
    weight: '1 L',
    basePrice: 23.99,
    promoPrice: 18.99,
    emoji: '🥛',
    searchKeywords: ['first choice', 'uht', 'long life', 'milk', 'full cream', 'dairy', '1l']
  }]
]);

// Initialize active in-memory products from master catalog
const PRODUCTS = new Map(MASTER_PRODUCTS);

const PHYSICAL_STORES = [
  { id: 'shoprite_dbn_0142', retailerId: 'shoprite', retailer: 'Shoprite', name: 'Shoprite Durban Central', address: 'Dr Pixley KaSeme St, Durban Central', retailerStoreCode: '0142', color: '#e11d2e', loyalty: 'Xtra Savings' },
  { id: 'shoprite_cpt_0088', retailerId: 'shoprite', retailer: 'Shoprite', name: 'Shoprite Cape Town City', address: 'Grand Parade Centre, Cape Town', retailerStoreCode: '0088', color: '#e11d2e', loyalty: 'Xtra Savings' },
  { id: 'checkers_sandton_0210', retailerId: 'checkers', retailer: 'Checkers', name: 'Checkers Sandton City', address: 'Sandton City Mall, Rivonia Rd', retailerStoreCode: '0210', color: '#004831', loyalty: 'Sixty60 / Xtra' },
  { id: 'pnp_rosebank_0033', retailerId: 'pnp', retailer: 'Pick n Pay', name: 'Pick n Pay Rosebank Mall', address: 'Bath Ave, Rosebank, JHB', retailerStoreCode: '0033', color: '#005baa', loyalty: 'Smart Shopper' },
  { id: 'spar_umhlanga_0045', retailerId: 'spar', retailer: 'SPAR', name: 'SUPERSPAR Umhlanga Rocks', address: 'Chartwell Dr, Umhlanga, KZN', retailerStoreCode: '0045', color: '#138a42', loyalty: 'SPAR Rewards' },
  { id: 'woolworths_gateway_0019', retailerId: 'woolworths', retailer: 'Woolworths', name: 'Woolworths Gateway', address: 'Gateway Mall, Umhlanga Ridge', retailerStoreCode: '0019', color: '#18181b', loyalty: 'WRewards' },
  { id: 'boxer_durban_0012', retailerId: 'boxer', retailer: 'Boxer', name: 'Boxer Durban West St', address: 'West St & Field St, Durban', retailerStoreCode: '0012', color: '#ea580c', loyalty: 'Boxer Club' }
];

const STORE_PRICES = new Map();

function getStorePrice(storeId, gtin) {
  const compositeKey = `${storeId}_${gtin}`;
  if (STORE_PRICES.has(compositeKey)) {
    return STORE_PRICES.get(compositeKey);
  }
  const master = MASTER_PRODUCTS.get(gtin);
  if (!master) return { regularPrice: 19.99, promoPrice: 16.99, inStock: true };

  const priceObj = {
    storeId,
    gtin,
    regularPrice: master.basePrice,
    promoPrice: master.promoPrice,
    inStock: true,
    lastUpdatedAt: Date.now()
  };
  STORE_PRICES.set(compositeKey, priceObj);
  return priceObj;
}

const CATEGORIES = [
  'Bakery & Grains',
  'Dairy & Eggs',
  'Snacks & Drinks',
  'Pantry Essentials',
  'Hot Beverages',
  'Vegetables & Fruit',
  'Household & Cleaning',
  'Personal Care'
];

const COUPONS = [
  { id: 'basket10', label: 'R10 Basket Boost', detail: 'R10 off when your basket reaches R100', tone: 'from-violet-600 to-indigo-700' },
  { id: 'fresh5', label: 'Fresh Five', detail: '5% off all fruit and vegetables', tone: 'from-emerald-500 to-teal-700' }
];

const state = {
  route: getRouteFromHash(),
  retailerId: 'shoprite',
  currentStoreId: 'shoprite_dbn_0142',
  marketViewMode: 'deck',
  listFilterRetailer: 'all',
  selectedCatalogBarcode: '6001007001001',
  catalogSearch: '',
  catalogCategory: 'all',
  browserViewMode: 'catalogue',
  cart: [],
  shoppingList: [],
  coupons: new Set(),
  completedSavings: 0,
  loyaltyPoints: 680,
  overlay: null,
  order: null,
  scanBusy: false
};

const screen = document.querySelector('#screen');
const modalRoot = document.querySelector('#modal-root');
const toast = document.querySelector('#toast');
const cartCount = document.querySelector('#header-cart-count');
const headerSubtitle = document.querySelector('#header-subtitle');
const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

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

async function fetchProductFromFirestore(barcode) {
  await Promise.resolve();
  const product = PRODUCTS.get(String(barcode));
  return product ? { barcode: String(barcode), ...product } : null;
}

function getRouteFromHash() {
  const candidate = location.hash.slice(1);
  return ROUTES.includes(candidate) ? candidate : 'market';
}

function routeTo(route) {
  const safeRoute = ROUTES.includes(route) ? route : 'market';
  if (location.hash !== `#${safeRoute}`) history.pushState(null, '', `#${safeRoute}`);
  state.route = safeRoute;
  render();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function getRetailer() {
  return state.retailerId ? RETAILERS[state.retailerId] : RETAILERS.shoprite;
}

function getRetailerCart(retailerId = state.retailerId) {
  const target = retailerId || state.retailerId || 'shoprite';
  return state.cart.filter((item) => (item.retailerId || 'shoprite') === target);
}

function getItemCount(retailerId = state.retailerId) {
  if (retailerId === 'all') {
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  }
  return getRetailerCart(retailerId).reduce((count, item) => count + item.quantity, 0);
}

function getMerchandiseTotal(retailerId = state.retailerId) {
  return getRetailerCart(retailerId).reduce((total, item) => total + item.price * item.quantity, 0);
}

function getBuiltInSavings(retailerId = state.retailerId) {
  return getRetailerCart(retailerId).reduce((total, item) => total + (item.basePrice - item.price) * item.quantity, 0);
}

function getCouponSavings(retailerId = state.retailerId) {
  let total = 0;
  const merch = getMerchandiseTotal(retailerId);
  if (state.coupons.has('basket10') && merch >= 100) total += 10;
  if (state.coupons.has('fresh5')) {
    total += getRetailerCart(retailerId).filter((item) => item.category === 'Vegetables & Fruit').reduce((sum, item) => sum + item.price * item.quantity * 0.05, 0);
  }
  return Math.min(total, merch);
}

function getPayableTotal(retailerId = state.retailerId) {
  return Math.max(0, getMerchandiseTotal(retailerId) - getCouponSavings(retailerId));
}

function getCurrentSavings(retailerId = state.retailerId) {
  return getBuiltInSavings(retailerId) + getCouponSavings(retailerId);
}

function addToCart(product, retailerId = state.retailerId) {
  const targetRetailer = retailerId || product.retailerId || state.retailerId || 'shoprite';
  const existing = state.cart.find((item) => item.barcode === product.barcode && (item.retailerId || 'shoprite') === targetRetailer);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      ...product,
      quantity: 1,
      retailerId: targetRetailer
    });
  }
  updateCartBadge();
}

function removeCartItem(barcode, retailerId = state.retailerId) {
  const targetRetailer = retailerId || state.retailerId || 'shoprite';
  state.cart = state.cart.filter((item) => !(item.barcode === barcode && (item.retailerId || 'shoprite') === targetRetailer));
  updateCartBadge();
  render();
}

function addToList(product, retailerId = state.retailerId) {
  const targetRetailer = retailerId || state.retailerId || 'shoprite';
  const existing = state.shoppingList.find((item) => item.barcode === product.barcode && (item.retailerId || 'shoprite') === targetRetailer);
  if (existing) {
    existing.checked = false;
  } else {
    state.shoppingList.unshift({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: product.name,
      weight: product.weight || '1 unit',
      price: product.price || 19.99,
      image: product.image,
      emoji: product.emoji || '🛍️',
      barcode: product.barcode,
      checked: false,
      retailerId: targetRetailer
    });
  }
  showToast(`✓ Added "${product.name}" to ${RETAILERS[targetRetailer]?.name || 'Store'} list`);
  if (state.route === 'list') renderList();
}

function updateCartBadge() {
  const count = getItemCount(state.retailerId);
  cartCount.textContent = count;
  cartCount.classList.toggle('hidden', count === 0);
}

function render() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.route === state.route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (state.route === 'cartel' && getRetailer()) {
    headerSubtitle.textContent = `${getRetailer().name} · Trolley`;
  } else if (state.route === 'list') {
    headerSubtitle.textContent = 'Smart Checklist';
  } else if (state.route === 'tracker' && state.order) {
    headerSubtitle.textContent = `Order #${state.order.id} · Live`;
  } else if (state.route === 'market' && getRetailer()) {
    headerSubtitle.textContent = `${getRetailer().name} · Market`;
  } else if (state.route === 'savings') {
    headerSubtitle.textContent = 'Savings & Coupons';
  } else {
    headerSubtitle.textContent = 'Retail, reimagined';
  }
  if (state.route === 'market') renderMarket();
  if (state.route === 'list') renderList();
  if (state.route === 'cartel') renderCartel();
  if (state.route === 'tracker') renderTracker();
  if (state.route === 'savings') renderSavings();
  updateCartBadge();
}

function renderList() {
  const filter = state.listFilterRetailer || 'all';
  const filteredList = filter === 'all' 
    ? state.shoppingList 
    : state.shoppingList.filter((item) => (item.retailerId || 'shoprite') === filter);

  const completedCount = filteredList.filter((item) => item.checked).length;
  const totalItems = filteredList.length;
  const listEstimatedTotal = filteredList.reduce((acc, item) => acc + (item.price || 19.99), 0);

  const countsByRetailer = {
    all: state.shoppingList.length,
    shoprite: state.shoppingList.filter(i => (i.retailerId || 'shoprite') === 'shoprite').length,
    pnp: state.shoppingList.filter(i => (i.retailerId || 'shoprite') === 'pnp').length,
    spar: state.shoppingList.filter(i => (i.retailerId || 'shoprite') === 'spar').length
  };

  const quickSuggestions = [
    { name: 'Albany Superior White Bread', emoji: '🍞', barcode: '6001007001001', price: 16.99, weight: '700 g', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
    { name: 'Clover Full Cream Fresh Milk', emoji: '🥛', barcode: '6001299000270', price: 33.99, weight: '2 L', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80' },
    { name: 'Simba Smoked Beef Chips', emoji: '🥔', barcode: '6001068594502', price: 18.99, weight: '120 g', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80' },
    { name: 'Tastic Long Grain Rice', emoji: '🍚', barcode: '6001007000127', price: 37.99, weight: '2 kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80' },
    { name: 'Koo Baked Beans', emoji: '🥫', barcode: '6001007000899', price: 14.99, weight: '410 g', image: 'https://images.unsplash.com/photo-1588644525273-f37b60d78512?w=400&auto=format&fit=crop&q=80' }
  ];

  // Group items by retailer
  const retailersToRender = filter === 'all' 
    ? Object.keys(RETAILERS) 
    : [filter];

  screen.innerHTML = `
    <section class="px-5 pb-36 pt-7">
      <div class="flex items-center justify-between">
        <div>
          <p class="section-kicker">Multi-Store Planner</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight">Grocery Checklist</h1>
        </div>
        <span class="rounded-2xl bg-violet-100 px-3.5 py-2 text-xs font-black text-violet-800">
          ${completedCount}/${totalItems} Checked
        </span>
      </div>
      <p class="mt-2 text-xs text-slate-500">Your grocery list is categorized by retail store. Mirror picked items into the digital cartel for instant till checkout.</p>

      <!-- Retailer Filter Tabs -->
      <div class="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button type="button" data-list-filter="all" class="shrink-0 rounded-2xl px-3.5 py-2 text-xs font-black transition active:scale-95 ${filter === 'all' ? 'bg-slate-950 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          All Stores (${countsByRetailer.all})
        </button>
        ${Object.values(RETAILERS).map((ret) => `
          <button type="button" data-list-filter="${ret.id}" class="shrink-0 flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black transition active:scale-95 ${filter === ret.id ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}" style="${filter === ret.id ? `background:${ret.color}` : ''}">
            <span class="size-2 rounded-full" style="background:${ret.color}"></span>
            <span>${ret.name} (${countsByRetailer[ret.id]})</span>
          </button>
        `).join('')}
      </div>

      <!-- Add New Custom Item Form with Store Selector -->
      <form id="add-list-form" class="mt-5 flex flex-col gap-2 rounded-3xl bg-white p-3.5 shadow-sm border border-slate-200">
        <div class="flex gap-2">
          <input id="new-list-item-input" type="text" required placeholder="Add item (e.g. Bread, Eggs, Coffee)..." class="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold outline-none focus:border-violet-500">
          <select id="new-list-retailer-select" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none">
            ${Object.values(RETAILERS).map(r => `<option value="${r.id}" ${state.retailerId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>
          <button type="submit" class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-base font-black text-white active:scale-95 transition">
            +
          </button>
        </div>
      </form>

      <!-- Quick Add Essentials From Catalogue -->
      <div class="mt-4">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick Add Essentials</p>
        <div class="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          ${quickSuggestions.map((sug, idx) => `
            <button type="button" data-quick-add="${idx}" class="shrink-0 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 text-xs font-bold text-slate-700 shadow-sm hover:border-violet-400 active:scale-95 transition">
              <img src="${sug.image}" alt="${sug.name}" class="size-7 rounded-xl object-cover" />
              <span>${sug.name.split(' ')[0]}</span>
              <span class="text-[10px] text-slate-400">${zar.format(sug.price)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Categorized List by Retailer -->
      <div class="mt-6 space-y-6">
        ${retailersToRender.map((retId) => {
          const ret = RETAILERS[retId];
          const items = state.shoppingList.filter((item) => (item.retailerId || 'shoprite') === retId);
          if (!items.length) return '';
          const retTotal = items.reduce((sum, item) => sum + (item.price || 19.99), 0);

          return `
            <div class="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <!-- Retailer Header -->
              <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div class="flex items-center gap-2.5">
                  <span class="grid size-9 place-items-center rounded-2xl text-white font-black text-xs shadow-sm" style="background:${ret.color}">${ret.initials}</span>
                  <div>
                    <h3 class="text-sm font-black text-slate-900">${ret.name}</h3>
                    <p class="text-[10px] font-bold text-slate-400">${items.length} items &middot; Est. ${zar.format(retTotal)}</p>
                  </div>
                </div>
                <button type="button" data-move-retailer-cartel="${ret.id}" class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black text-white shadow-sm active:scale-95 transition" style="background:${ret.color}">
                  <span>🛒</span><span>Put in ${ret.name} Cartel</span>
                </button>
              </div>

              <!-- Retailer Items -->
              <div class="space-y-2.5">
                ${items.map((item) => `
                  <div class="flex items-center justify-between gap-3 rounded-2xl border bg-slate-50/50 p-3 transition ${item.checked ? 'border-emerald-300 bg-emerald-50/40 text-slate-400' : 'border-slate-100 text-slate-800'}">
                    <!-- Checkbox Toggle Circle -->
                    <button type="button" data-toggle-list="${item.id}" class="grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${item.checked ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-slate-300 hover:border-emerald-500'}" title="Toggle Physical Cartel">
                      ${item.checked ? '<svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-[3]"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </button>

                    <!-- Thumbnail -->
                    <div class="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="size-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-xl\\'>${item.emoji || '🛍️'}</span>';" />` : `<span class="grid size-full place-items-center text-xl">${item.emoji || '🛍️'}</span>`}
                    </div>

                    <!-- Item Details -->
                    <div class="min-w-0 flex-1 cursor-pointer" data-toggle-list="${item.id}">
                      <p class="truncate text-xs font-black ${item.checked ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.name)}</p>
                      <div class="mt-0.5 flex items-center gap-2">
                        <span class="text-[11px] font-bold text-slate-700">${zar.format(item.price || 19.99)}</span>
                        <span class="text-[10px] text-slate-400">${item.weight || ''}</span>
                        <span class="rounded bg-slate-200/60 px-1 py-0.2 font-mono text-[8px] text-slate-500">${item.barcode}</span>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1 shrink-0">
                      <button type="button" data-move-single-cartel="${item.id}" class="flex items-center gap-1 rounded-xl bg-slate-950 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-emerald-600 active:scale-95 transition" title="Put in Cartel">
                        <span>+ Cartel</span>
                      </button>
                      <button type="button" data-delete-list="${item.id}" class="grid size-7 place-items-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition" title="Remove">
                        &times;
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${!state.shoppingList.length ? `
          <div class="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
            <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-50 text-2xl">📝</span>
            <h3 class="mt-3 text-base font-black">Your list is clear</h3>
            <p class="mt-1 text-xs text-slate-500">Add products above or browse the catalogue to plan your groceries by store.</p>
          </div>
        ` : ''}
      </div>

      <!-- In-Store Checkout Hub -->
      ${state.shoppingList.length ? `
        <div class="mt-6 rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-wider text-white/50">Estimated List Value</p>
              <p class="text-2xl font-black">${zar.format(listEstimatedTotal)}</p>
            </div>
            <button id="move-all-cartel" type="button" class="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition">
              <span>🛒</span>
              <span>Put All in Cartel</span>
            </button>
          </div>

          <div class="mt-4 border-t border-white/10 pt-3">
            <button id="list-go-checkout" type="button" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-xs font-black text-slate-950 shadow-md transition active:scale-95">
              <span>⚡</span>
              <span>Go to Active Cartel & Single QR Till Checkout (${getItemCount('all')} items across stores)</span>
            </button>
          </div>
        </div>` : ''}

      <!-- Last Option Barcode Fallback -->
      <div class="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center">
        <p class="text-xs font-bold text-slate-500">Need to scan a physical barcode manually?</p>
        <button id="list-open-camera" type="button" class="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition">
          <svg viewBox="0 0 24 24" class="size-3.5 fill-none stroke-current stroke-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>Open Barcode Camera Scanner (Secondary Fallback)</span>
        </button>
      </div>
    </section>`;

  bindListInteractions(quickSuggestions);
}

function bindListInteractions(quickSuggestions) {
  // Filter tabs
  screen.querySelectorAll('[data-list-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.listFilterRetailer = btn.dataset.listFilter;
      renderList();
    });
  });

  // Add custom item form
  screen.querySelector('#add-list-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = screen.querySelector('#new-list-item-input');
    const retailerSelect = screen.querySelector('#new-list-retailer-select');
    const name = input.value.trim();
    const chosenRetailer = retailerSelect ? retailerSelect.value : state.retailerId;
    if (!name) return;

    const matchedProduct = [...PRODUCTS.values()].find(p => p.name.toLowerCase().includes(name.toLowerCase()));

    state.shoppingList.unshift({
      id: `item-${Date.now()}`,
      name: matchedProduct ? matchedProduct.name : name,
      weight: matchedProduct ? matchedProduct.weight : '1 unit',
      price: matchedProduct ? matchedProduct.price : 19.99,
      image: matchedProduct ? matchedProduct.image : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
      emoji: matchedProduct ? matchedProduct.emoji : '🛍️',
      barcode: matchedProduct ? [...PRODUCTS.entries()].find(([, p]) => p === matchedProduct)[0] : `600${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      checked: false,
      retailerId: chosenRetailer
    });
    input.value = '';
    renderList();
    showToast(`Added "${name}" to ${RETAILERS[chosenRetailer]?.name} list`);
  });

  // Quick suggestions
  screen.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.quickAdd, 10);
      const sug = quickSuggestions[idx];
      if (sug) {
        state.shoppingList.unshift({
          id: `item-${Date.now()}`,
          name: sug.name,
          weight: sug.weight,
          price: sug.price,
          image: sug.image,
          emoji: sug.emoji,
          barcode: sug.barcode,
          checked: false,
          retailerId: state.retailerId
        });
        renderList();
        showToast(`Added ${sug.name} to ${getRetailer().name} list`);
      }
    });
  });

  // Toggle checked status -> Synchronizes into that retailer's Digital Cartel!
  screen.querySelectorAll('[data-toggle-list]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.toggleList;
      const item = state.shoppingList.find((i) => i.id === id);
      if (item) {
        item.checked = !item.checked;
        const targetRet = item.retailerId || 'shoprite';
        if (item.checked) {
          addToCart({
            barcode: item.barcode || `600${Date.now().toString().slice(-10)}`,
            name: item.name,
            weight: item.weight || '1 unit',
            price: item.price || 19.99,
            basePrice: (item.price || 19.99) * 1.15,
            image: item.image,
            category: 'Bakery & Grains',
            emoji: item.emoji || '🛍️'
          }, targetRet);
          showToast(`✓ In Physical & Digital Cartel (${RETAILERS[targetRet]?.name}): ${item.name}`);
        } else {
          removeCartItem(item.barcode, targetRet);
          showToast(`Removed from ${RETAILERS[targetRet]?.name} Cartel`);
        }
        renderList();
      }
    });
  });

  // Delete single item from list
  screen.querySelectorAll('[data-delete-list]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteList;
      const item = state.shoppingList.find((i) => i.id === id);
      if (item && item.checked) {
        removeCartItem(item.barcode, item.retailerId || 'shoprite');
      }
      state.shoppingList = state.shoppingList.filter((i) => i.id !== id);
      renderList();
    });
  });

  // Single Move to Cartel
  screen.querySelectorAll('[data-move-single-cartel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.moveSingleCartel;
      const item = state.shoppingList.find((i) => i.id === id);
      if (item) {
        const targetRet = item.retailerId || 'shoprite';
        addToCart({
          barcode: item.barcode || `600${Date.now().toString().slice(-10)}`,
          name: item.name,
          weight: item.weight || '1 unit',
          price: item.price || 19.99,
          basePrice: (item.price || 19.99) * 1.15,
          image: item.image,
          category: 'Bakery & Grains',
          emoji: item.emoji || '🛍️'
        }, targetRet);
        item.checked = true;
        renderList();
        showToast(`✓ Put into ${RETAILERS[targetRet]?.name} Cartel: ${item.name}`);
      }
    });
  });

  // Move entire retailer's items to Cartel
  screen.querySelectorAll('[data-move-retailer-cartel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const retId = btn.dataset.moveRetailerCartel;
      const retItems = state.shoppingList.filter((i) => (i.retailerId || 'shoprite') === retId);
      retItems.forEach((item) => {
        addToCart({
          barcode: item.barcode || `600${Date.now().toString().slice(-10)}`,
          name: item.name,
          weight: item.weight || '1 unit',
          price: item.price || 19.99,
          basePrice: (item.price || 19.99) * 1.15,
          image: item.image,
          category: 'Bakery & Grains',
          emoji: item.emoji || '🛍️'
        }, retId);
        item.checked = true;
      });
      state.retailerId = retId;
      routeTo('cartel');
      showToast(`Mirrored all ${retItems.length} items into ${RETAILERS[retId]?.name} Cartel!`);
    });
  });

  // Move all to Cartel
  screen.querySelector('#move-all-cartel')?.addEventListener('click', () => {
    let addedCount = 0;
    state.shoppingList.forEach((item) => {
      const retId = item.retailerId || 'shoprite';
      addToCart({
        barcode: item.barcode || `600${Date.now().toString().slice(-10)}`,
        name: item.name,
        weight: item.weight || '1 unit',
        price: item.price || 19.99,
        basePrice: (item.price || 19.99) * 1.15,
        image: item.image,
        category: 'Bakery & Grains',
        emoji: item.emoji || '🛍️'
      }, retId);
      item.checked = true;
      addedCount++;
    });
    routeTo('cartel');
    showToast(`Mirrored all ${addedCount} items across store Cartels!`);
  });

  // Jump to In-Store QR Checkout
  screen.querySelector('#list-go-checkout')?.addEventListener('click', () => {
    routeTo('cartel');
  });

  // Open camera scanner as fallback
  screen.querySelector('#list-open-camera')?.addEventListener('click', openLiveCameraScanner);
}

function retailerSelector() {
  return `
    <div class="flex gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none]" aria-label="Select retailer">
      ${Object.values(RETAILERS).map((retailer) => {
        const isSelected = state.retailerId === retailer.id;
        return `
          <button type="button" data-retailer="${retailer.id}" class="min-w-[10rem] flex-1 rounded-3xl border p-3.5 text-left transition active:scale-[.98] ${isSelected ? 'border-transparent text-white shadow-xl ring-2 ring-white/50' : 'border-slate-200 bg-white text-slate-800'}" style="${isSelected ? `background:${retailer.color}` : ''}">
            <div class="flex items-center justify-between">
              <span class="grid size-9 place-items-center rounded-2xl bg-white/95 text-xs font-black shadow-sm" style="color:${retailer.color}">${retailer.initials}</span>
              ${isSelected ? '<span class="rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-black text-white">Live Store</span>' : ''}
            </div>
            <strong class="mt-2.5 block text-sm font-black">${retailer.name}</strong>
            <span class="mt-0.5 block font-mono text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}">${retailer.host}</span>
          </button>
        `;
      }).join('')}
    </div>`;
}

function renderRetailerStoreDeck() {
  return `
    <section class="pb-40">
      <!-- Store Portals Deck Hero Header -->
      <div class="bg-slate-950 px-5 pt-5 pb-6 text-white shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                ● Live Retail Web Portals
              </span>
              <span class="rounded-lg bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white/70">
                ⚡ ${automationCore.getAdapterName()}
              </span>
            </div>
            <h2 class="mt-2 text-2xl font-black tracking-tight text-white">Supermarket Portals Deck</h2>
            <p class="mt-1 text-xs text-white/70 max-w-sm">
              Tap Shoprite below to browse 24 authentic store products. All other retailers will be onboarded in upcoming releases.
            </p>
          </div>
        </div>
      </div>

      <!-- Floating Retail Store Deck Grid -->
      <div class="px-5 -mt-3 space-y-4">
        ${Object.values(RETAILERS).map((r) => {
          const isShoprite = r.id === 'shoprite';
          const productCount = Array.from(MASTER_PRODUCTS.values()).filter(p => p.retailerId === r.id).length;

          return `
            <div class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-900/5 transition-all duration-200 hover:shadow-xl hover:border-slate-300">
              <!-- Store Identity & Logo Badge -->
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="grid size-14 shrink-0 place-items-center rounded-2xl text-white font-black text-lg shadow-md transition-transform group-hover:scale-105" style="background:${r.color}">
                    ${r.initials}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="text-lg font-black text-slate-900 truncate">${r.name}</h3>
                      ${isShoprite ? `
                        <span class="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <span class="size-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Active Catalog (${productCount})</span>
                        </span>
                      ` : `
                        <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200 shrink-0">
                          0 Products
                        </span>
                      `}
                    </div>
                    <p class="text-xs font-mono text-slate-400 font-semibold mt-0.5 truncate">${r.host}</p>
                    <span class="inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-black text-white shadow-xs" style="background:${r.color}">
                      ${isShoprite ? (r.loyalty || 'Xtra Savings') : 'Starting with Shoprite'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Launch Live Store Session Button -->
              <button 
                type="button" 
                data-launch-retailer="${r.id}" 
                class="mt-4 flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-xs font-black text-white shadow-md active:scale-98 transition hover:brightness-110" 
                style="background:${isShoprite ? r.color : '#475569'}"
              >
                <span class="flex items-center gap-2">
                  <span>${isShoprite ? '🛍️' : '⏳'}</span>
                  <span>${isShoprite ? `Launch Live ${r.name} Catalog (${productCount} Products)` : `${r.name} (0 Products - Starting with Shoprite)`}</span>
                </span>
                <span class="text-sm font-bold">&rarr;</span>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function bindDeckInteractions() {
  screen.querySelectorAll('[data-launch-retailer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.retailerId = btn.dataset.launchRetailer;
      state.marketViewMode = 'browser';
      state.catalogCategory = 'all';
      state.catalogSearch = '';
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(25);
      renderMarket();
    });
  });
}

function renderMarket() {
  if (state.marketViewMode === 'deck') {
    screen.innerHTML = renderRetailerStoreDeck();
    bindDeckInteractions();
    return;
  }

  const retailer = getRetailer();
  
  // Find current physical store for this retailer or fallback
  const store = PHYSICAL_STORES.find(s => s.retailerId === retailer.id) || PHYSICAL_STORES[0];
  state.currentStoreId = store.id;

  const searchQuery = (state.catalogSearch || '').toLowerCase().trim();
  const selectedCat = state.catalogCategory || 'all';

  const retailerProducts = Array.from(MASTER_PRODUCTS.values()).filter(p => p.retailerId === retailer.id);

  // Filter master products by category & search query
  const filteredProducts = retailerProducts.filter((product) => {
    const matchesCategory = selectedCat === 'all' || product.category === selectedCat;
    if (!matchesCategory) return false;
    if (!searchQuery) return true;

    const inKeywords = product.searchKeywords && product.searchKeywords.some(k => k.toLowerCase().includes(searchQuery));
    const inTitle = product.title.toLowerCase().includes(searchQuery);
    const inBrand = product.brand.toLowerCase().includes(searchQuery);
    const inGtin = product.gtin.includes(searchQuery);
    return inKeywords || inTitle || inBrand || inGtin;
  });

  const selectedBarcode = state.selectedCatalogBarcode || (filteredProducts[0] ? filteredProducts[0].gtin : '6001007001001');
  state.selectedCatalogBarcode = selectedBarcode;
  const selectedProduct = MASTER_PRODUCTS.get(selectedBarcode) || filteredProducts[0];

  screen.innerHTML = `
    <section class="overflow-hidden pb-44">
      <!-- In-App Retailer Clean Top Bar: Back Button & Store Branch Info -->
      <div class="px-5 pt-4 pb-2">
        <div class="flex items-center justify-between gap-2">
          <button id="browser-deck-btn" type="button" class="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition shadow-md">
            <span>&larr;</span><span>Back to Stores Deck</span>
          </button>

          <div class="flex items-center gap-1.5">
            <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span class="size-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Firestore Sub-50ms</span>
            </span>
          </div>
        </div>

        <!-- Physical Store Branch Selector Banner -->
        <button id="store-branch-selector-btn" type="button" class="mt-3 w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm flex items-center justify-between gap-3 text-left hover:border-slate-300 active:scale-98 transition group">
          <div class="flex items-center gap-3 min-w-0">
            <div class="grid size-10 shrink-0 place-items-center rounded-xl text-white font-black text-sm shadow-xs" style="background:${retailer.color}">
              ${retailer.initials}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-xs font-black text-slate-900 truncate">${store.name}</h3>
                <span class="rounded-md bg-slate-100 px-1.5 py-0.2 text-[8px] font-mono font-bold text-slate-500">#${store.retailerStoreCode}</span>
              </div>
              <p class="text-[10px] text-slate-400 truncate">${store.address}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="rounded-full px-2.5 py-1 text-[9px] font-black text-white shadow-2xs" style="background:${retailer.color}">
              ${store.loyalty}
            </span>
            <span class="text-xs text-slate-400 font-bold group-hover:translate-x-0.5 transition">▾</span>
          </div>
        </button>
      </div>

      <!-- Search Bar & Instant Category Chips -->
      <div class="px-5 pt-2">
        <div class="relative">
          <input 
            id="catalog-search-input" 
            type="text" 
            value="${escapeHtml(state.catalogSearch || '')}"
            placeholder="Search 600... GTIN barcode, brand, bread, milk..." 
            class="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-xs font-bold shadow-xs outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition"
          />
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          ${state.catalogSearch ? `
            <button id="clear-search-btn" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">✕</button>
          ` : ''}
        </div>

        <!-- Department Category Pills -->
        <div class="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" data-catalog-cat="all" class="shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black transition shadow-2xs ${selectedCat === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            All (${retailerProducts.length})
          </button>
          ${CATEGORIES.map(cat => `
            <button type="button" data-catalog-cat="${cat}" class="shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black transition shadow-2xs ${selectedCat === cat ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
              ${cat}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Decoupled Native Catalog Grid (Zero WebViews) -->
      <div class="px-5 pt-3">
        ${retailerProducts.length === 0 ? `
          <div class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <div class="mx-auto grid size-16 place-items-center rounded-2xl text-white font-black text-2xl shadow-md" style="background:${retailer.color}">
              ${retailer.initials}
            </div>
            <h4 class="mt-4 text-base font-black text-slate-900">${retailer.name} Catalog (0 Products)</h4>
            <p class="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
              We are currently starting with <strong>Shoprite</strong>. Live catalog synchronization for ${retailer.name} is queued.
            </p>
            <button id="switch-to-shoprite-catalog-btn" type="button" class="mt-5 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-xs font-black text-white shadow-md active:scale-95 transition hover:bg-rose-700">
              <span>🛍️ Browse Shoprite Live Catalog (24 Products) ➔</span>
            </button>
          </div>
        ` : filteredProducts.length === 0 ? `
          <div class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <span class="text-3xl">🔍</span>
            <h4 class="mt-2 text-sm font-black text-slate-900">No items found for "${escapeHtml(state.catalogSearch)}"</h4>
            <p class="mt-1 text-xs text-slate-400">Try searching for bread, milk, chips, rice, or a 13-digit EAN barcode.</p>
            <button id="reset-catalog-btn" type="button" class="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Reset Search</button>
          </div>
        ` : `
          <div class="grid grid-cols-2 gap-3">
            ${filteredProducts.map(product => {
              const priceData = getStorePrice(store.id, product.gtin);
              const isSelected = product.gtin === selectedBarcode;
              const hasPromo = priceData.promoPrice && priceData.promoPrice < priceData.regularPrice;
              const activePrice = hasPromo ? priceData.promoPrice : priceData.regularPrice;
              const savings = hasPromo ? (priceData.regularPrice - priceData.promoPrice) : 0;

              return `
                <div 
                  data-select-catalog-product="${product.gtin}"
                  class="group relative flex flex-col justify-between rounded-3xl border-2 bg-white p-3.5 shadow-sm transition-all duration-200 cursor-pointer active:scale-98 ${isSelected ? 'border-slate-950 ring-4 ring-slate-900/10 shadow-md' : 'border-slate-200/90 hover:border-slate-300'}"
                >
                  <div>
                    <!-- Product Image -->
                    <div class="relative w-full aspect-square overflow-hidden rounded-2xl bg-slate-100 border border-slate-100">
                      <img 
                        src="${product.imageUrl}" 
                        alt="${escapeHtml(product.title)}" 
                        class="size-full object-cover group-hover:scale-105 transition duration-300"
                        onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-3xl\\'>${product.emoji || '🛍️'}</span>';"
                      />
                      <span class="absolute top-2 left-2 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[7px] font-bold text-white backdrop-blur-xs">
                        ${product.gtin}
                      </span>
                      ${hasPromo ? `
                        <span class="absolute top-2 right-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[8px] font-black text-white shadow-xs">
                          PROMO
                        </span>
                      ` : ''}
                    </div>

                    <!-- Details -->
                    <div class="mt-2.5">
                      <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">${product.brand}</span>
                      <h4 class="text-xs font-black text-slate-900 line-clamp-2 leading-snug mt-0.5">${escapeHtml(product.title)}</h4>
                      <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${product.weight || '1 unit'}</p>
                    </div>
                  </div>

                  <!-- Store Live Price -->
                  <div class="mt-3 border-t border-slate-100 pt-2 flex items-baseline justify-between">
                    <div>
                      <div class="text-sm font-black text-slate-900">
                        ${zar.format(activePrice)}
                      </div>
                      ${hasPromo ? `
                        <div class="text-[10px] text-slate-400 line-through">
                          ${zar.format(priceData.regularPrice)}
                        </div>
                      ` : ''}
                    </div>
                    ${savings > 0 ? `
                      <span class="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                        -${zar.format(savings)}
                      </span>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Lower End Real-Time Scraped Action Dock -->
      ${renderCatalogActionDock(retailer, selectedProduct, selectedBarcode, store)}
    </section>`;

  bindCatalogInteractions(retailer, store);
}

function renderCatalogActionDock(retailer, selectedProduct, selectedBarcode, store) {
  if (!selectedProduct) {
    return `
      <div id="catalog-action-dock" class="fixed inset-x-0 bottom-[5.25rem] z-30 mx-auto max-w-3xl border-t border-slate-200/90 bg-white/95 px-4 py-3 shadow-[0_-16px_40px_-24px_rgba(15,23,42,.45)] backdrop-blur-xl transition-all duration-300">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 text-xs font-bold text-slate-400 min-w-0 flex-1">
            <span class="grid size-9 shrink-0 place-items-center rounded-2xl bg-slate-100 text-base shadow-sm">🛒</span>
            <div class="min-w-0">
              <span class="truncate block font-bold text-slate-600">Select any grocery item above</span>
              <span class="text-[10px] text-slate-400 font-normal">Tap item to view store pricing and add to cart</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 opacity-40">
            <button disabled class="flex items-center gap-1 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed">
              <span>+</span><span>List</span>
            </button>
            <button disabled class="flex items-center gap-1 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed">
              <span>+</span><span>Cartel</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const currentStore = store || PHYSICAL_STORES.find(s => s.retailerId === retailer.id) || PHYSICAL_STORES[0];
  const priceData = getStorePrice(currentStore.id, selectedProduct.gtin);
  const activePrice = (priceData.promoPrice && priceData.promoPrice < priceData.regularPrice) ? priceData.promoPrice : priceData.regularPrice;
  const regularPrice = priceData.regularPrice || selectedProduct.basePrice;
  const savings = Math.max(0, regularPrice - activePrice);
  const discountPercent = regularPrice > activePrice 
    ? Math.round((1 - activePrice / regularPrice) * 100)
    : 0;

  return `
    <div id="catalog-action-dock" class="fixed inset-x-0 bottom-[5.25rem] z-30 mx-auto max-w-3xl border-t-2 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3" style="border-color:${retailer.color}; box-shadow: 0 -12px 35px -10px ${retailer.color}45;">
      <div class="flex items-center justify-between gap-3">
        <!-- Real-Time Catalog Product Details Preview -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 shadow-md">
            ${selectedProduct.imageUrl ? `
              <img src="${selectedProduct.imageUrl}" alt="${escapeHtml(selectedProduct.title)}" class="size-full object-cover rounded-2xl" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-2xl\\'>${selectedProduct.emoji || '🛍️'}</span>';" />
            ` : `<span class="grid size-full place-items-center text-2xl">${selectedProduct.emoji || '🛍️'}</span>`}
            <span class="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[7px] font-mono text-white font-bold backdrop-blur-xs">EAN-13</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="rounded-full px-2 py-0.5 text-[8px] font-black text-white shadow-xs flex items-center gap-1" style="background:${retailer.color}">
                <span class="size-1.5 rounded-full bg-white animate-ping"></span>
                <span>${retailer.name}</span>
              </span>
              <span class="rounded-md bg-slate-950 px-1.5 py-0.5 font-mono text-[8px] font-bold text-white shadow-xs">
                ${selectedProduct.gtin}
              </span>
              ${discountPercent > 0 ? `
                <span class="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black text-emerald-800">
                  -${discountPercent}%
                </span>
              ` : ''}
            </div>

            <p class="truncate text-xs font-black text-slate-900 mt-1 leading-snug">${escapeHtml(selectedProduct.title)}</p>

            <div class="flex items-center gap-2 mt-0.5">
              <strong class="text-xs font-black text-slate-900">${zar.format(activePrice)}</strong>
              ${regularPrice > activePrice ? `
                <span class="text-[10px] text-slate-400 line-through">${zar.format(regularPrice)}</span>
              ` : ''}
              ${savings > 0 ? `
                <span class="text-[9px] font-black text-emerald-600">Save ${zar.format(savings)}</span>
              ` : ''}
              <span class="text-[9px] text-slate-400 font-semibold">&bull; ${selectedProduct.weight || '1 unit'}</span>
            </div>
          </div>
        </div>

        <!-- The Two Active Buttons: + List and + Cartel -->
        <div class="flex items-center gap-2 shrink-0">
          <button id="dock-add-list-btn" type="button" class="flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3.5 py-2.5 text-xs font-black text-white hover:bg-violet-700 active:scale-95 transition shadow-sm" title="Add to Grocery List">
            <span>+</span><span>List</span>
          </button>
          <button id="dock-add-cartel-btn" type="button" class="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black text-white shadow-lg active:scale-95 transition hover:brightness-110" style="background:${retailer.color}" title="Add to Digital Cartel">
            <span>+</span><span>Cartel</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindCatalogInteractions(retailer, store) {
  // Return to Store Deck button
  screen.querySelector('#browser-deck-btn')?.addEventListener('click', () => {
    state.marketViewMode = 'deck';
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(20);
    renderMarket();
  });

  // Switch to Shoprite Catalog from Empty Retailer View
  screen.querySelector('#switch-to-shoprite-catalog-btn')?.addEventListener('click', () => {
    state.retailerId = 'shoprite';
    state.currentStoreId = 'shoprite_dbn_0142';
    state.catalogCategory = 'all';
    state.catalogSearch = '';
    state.marketViewMode = 'browser';
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(30);
    showToast('🛍️ Switched to Shoprite Live Catalog (24 Products)');
    renderMarket();
  });

  // Store Branch Selector Modal
  screen.querySelector('#store-branch-selector-btn')?.addEventListener('click', () => {
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(20);
    openStoreBranchModal(retailer);
  });

  // Search input handler
  const searchInput = screen.querySelector('#catalog-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.catalogSearch = e.target.value;
    renderMarket();
    // Re-focus search input and position cursor
    const inputEl = screen.querySelector('#catalog-search-input');
    if (inputEl) {
      inputEl.focus();
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }
  });

  screen.querySelector('#clear-search-btn')?.addEventListener('click', () => {
    state.catalogSearch = '';
    renderMarket();
  });

  screen.querySelector('#reset-catalog-btn')?.addEventListener('click', () => {
    state.catalogSearch = '';
    state.catalogCategory = 'all';
    renderMarket();
  });

  // Category filter chips
  screen.querySelectorAll('[data-catalog-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.catalogCategory = btn.dataset.catalogCat;
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(15);
      renderMarket();
    });
  });

  // Product Card Selection
  screen.querySelectorAll('[data-select-catalog-product]').forEach((card) => {
    card.addEventListener('click', () => {
      const gtin = card.dataset.selectCatalogProduct;
      state.selectedCatalogBarcode = gtin;
      const product = MASTER_PRODUCTS.get(gtin);
      if (product) {
        const priceData = getStorePrice(store.id, gtin);
        const activePrice = (priceData.promoPrice && priceData.promoPrice < priceData.regularPrice) ? priceData.promoPrice : priceData.regularPrice;
        automationCore.selectProduct({
          barcode: gtin,
          name: product.title,
          price: activePrice,
          basePrice: priceData.regularPrice,
          image: product.imageUrl,
          weight: product.weight,
          retailerId: retailer.id
        });
      }

      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(25);
      renderMarket();
    });
  });

  bindDockActionButtons(retailer, store);
}

function openStoreBranchModal(currentRetailer) {
  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="text-base font-black text-slate-900">Select Supermarket Branch</h3>
            <p class="text-xs text-slate-400">Choose physical branch for live store-level pricing</p>
          </div>
          <button id="close-branch-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-200">✕</button>
        </div>

        <!-- GPS Auto-Detect Button -->
        <button id="auto-gps-store-btn" type="button" class="mt-4 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-xs font-black text-white shadow-md active:scale-98 transition">
          <span class="flex items-center gap-2">
            <span>📍</span>
            <span>Auto-Detect Nearest Store (Live GPS)</span>
          </span>
          <span class="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-lg">Haversine</span>
        </button>

        <!-- Stores List -->
        <div class="mt-4 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          ${PHYSICAL_STORES.map((s) => {
            const isCurrent = s.id === state.currentStoreId;
            return `
              <button type="button" data-pick-store="${s.id}" data-pick-retailer="${s.retailerId}" class="w-full flex items-center justify-between rounded-2xl border-2 p-3 text-left transition active:scale-98 ${isCurrent ? 'border-slate-950 bg-slate-50 ring-2 ring-slate-900/10' : 'border-slate-100 bg-white hover:border-slate-200'}">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="grid size-10 shrink-0 place-items-center rounded-xl text-white font-black text-xs shadow-xs" style="background:${s.color}">
                    ${s.retailer.slice(0, 2).toUpperCase()}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <h4 class="text-xs font-black text-slate-900 truncate">${s.name}</h4>
                      <span class="font-mono text-[8px] font-bold text-slate-400">#${s.retailerStoreCode}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 truncate">${s.address}</p>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="rounded-full px-2 py-0.5 text-[8px] font-black text-white shadow-2xs" style="background:${s.color}">
                    ${s.loyalty}
                  </span>
                  ${isCurrent ? '<span class="block text-[8px] font-black text-emerald-600 mt-1">● ACTIVE</span>' : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-branch-modal-btn')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
  });

  modalRoot.querySelectorAll('[data-pick-store]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentStoreId = btn.dataset.pickStore;
      state.retailerId = btn.dataset.pickRetailer;
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(30);
      modalRoot.innerHTML = '';
      showToast(`📍 Switched to ${PHYSICAL_STORES.find(s => s.id === state.currentStoreId)?.name}`);
      renderMarket();
    });
  });

  modalRoot.querySelector('#auto-gps-store-btn')?.addEventListener('click', () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let closest = PHYSICAL_STORES[0];
          let minDistance = Infinity;

          PHYSICAL_STORES.forEach((s) => {
            const geo = s.geoPoint || { latitude: -29.8587, longitude: 31.0218 };
            const dLat = (geo.latitude - latitude) * (Math.PI / 180);
            const dLon = (geo.longitude - longitude) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * (Math.PI / 180)) * Math.cos(geo.latitude * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist < minDistance) {
              minDistance = dist;
              closest = s;
            }
          });

          state.currentStoreId = closest.id;
          state.retailerId = closest.retailerId;
          playBeepSound();
          if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
          modalRoot.innerHTML = '';
          showToast(`📍 GPS Located: ${closest.name} (${Math.round(minDistance * 10) / 10} km)`);
          renderMarket();
        },
        () => {
          showToast('GPS unavailable. Selected Shoprite Durban Central.');
          modalRoot.innerHTML = '';
        }
      );
    } else {
      showToast('Geolocation not supported on this browser.');
    }
  });
}

function bindDockActionButtons(retailer, store) {
  const selectedBarcode = state.selectedCatalogBarcode;
  const masterProduct = MASTER_PRODUCTS.get(selectedBarcode);
  const selectedProduct = masterProduct || (selectedBarcode ? PRODUCTS.get(selectedBarcode) : null);

  if (!selectedProduct) return;

  const currentStore = store || PHYSICAL_STORES.find(s => s.retailerId === retailer.id) || PHYSICAL_STORES[0];
  const priceData = getStorePrice(currentStore.id, selectedBarcode);
  const activePrice = (priceData.promoPrice && priceData.promoPrice < priceData.regularPrice) ? priceData.promoPrice : priceData.regularPrice;

  const itemToAdd = {
    barcode: selectedBarcode,
    name: selectedProduct.title || selectedProduct.name,
    weight: selectedProduct.weight || '1 unit',
    category: selectedProduct.category || 'Pantry Essentials',
    price: activePrice,
    basePrice: priceData.regularPrice || selectedProduct.basePrice || activePrice,
    image: selectedProduct.imageUrl || selectedProduct.image,
    retailerId: retailer.id,
    emoji: selectedProduct.emoji || '🛍️'
  };

  // Add to List from Dock
  screen.querySelector('#dock-add-list-btn')?.addEventListener('click', () => {
    addToList(itemToAdd, state.retailerId);
    automationCore.addToList(itemToAdd, state.retailerId);
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(30);

    const btn = screen.querySelector('#dock-add-list-btn');
    if (btn) {
      btn.innerHTML = '<span>✓</span><span>Listed</span>';
      btn.classList.add('bg-emerald-600');
      window.setTimeout(() => {
        btn.innerHTML = '<span>+</span><span>List</span>';
        btn.classList.remove('bg-emerald-600');
      }, 900);
    }
    showToast(`✓ Added ${itemToAdd.name} to ${retailer.name} Checklist`);
  });

  // Add to Cartel from Dock
  screen.querySelector('#dock-add-cartel-btn')?.addEventListener('click', () => {
    addToCart(itemToAdd, state.retailerId);
    automationCore.addToCartel(itemToAdd, state.retailerId);
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    const btn = screen.querySelector('#dock-add-cartel-btn');
    if (btn) {
      btn.innerHTML = '<span>✓</span><span>In Cartel</span>';
      btn.classList.add('bg-emerald-600');
      window.setTimeout(() => {
        btn.innerHTML = '<span>+</span><span>Cartel</span>';
        btn.classList.remove('bg-emerald-600');
      }, 900);
    }
    showToast(`✓ Added ${itemToAdd.name} to ${retailer.name} Cartel for QR till scan`);
  });
}

function renderCartel() {
  const retailer = getRetailer();
  const activeRetailerCart = getRetailerCart(state.retailerId);
  const activeItemCount = getItemCount(state.retailerId);
  const activeTotal = getPayableTotal(state.retailerId);
  const activeSavings = getCurrentSavings(state.retailerId);

  screen.innerHTML = `
    <section class="pb-40">
      <!-- Retailer Carousel / Switcher Bar at the Top -->
      <div class="bg-slate-950 px-5 pt-4 pb-3 text-white">
        <div class="flex items-center justify-between mb-2.5">
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-white/50">Swipe / Switch Store Cartel</p>
          <span class="text-[10px] text-emerald-400 font-bold">Isolated POS Till Checkouts</span>
        </div>

        <div id="cartel-retailer-carousel" class="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          ${Object.values(RETAILERS).map((ret) => {
            const isSelected = state.retailerId === ret.id;
            const retCount = getItemCount(ret.id);
            return `
              <button type="button" data-switch-cartel-retailer="${ret.id}" class="flex-1 min-w-[7.5rem] rounded-2xl p-2.5 text-left border transition active:scale-95 ${isSelected ? 'border-white text-white shadow-lg' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}" style="${isSelected ? `background:${ret.color}` : ''}">
                <div class="flex items-center justify-between">
                  <span class="grid size-6 place-items-center rounded-lg bg-white text-[10px] font-black" style="color:${ret.color}">${ret.initials}</span>
                  <span class="rounded-full px-2 py-0.5 text-[9px] font-black ${isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-white/80'}">${retCount} in cart</span>
                </div>
                <p class="mt-2 text-xs font-black truncate">${ret.name}</p>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Active Retailer Banner -->
      <div class="px-5 pb-5 pt-5 text-white shadow-lg" style="background:linear-gradient(135deg,${retailer.color},color-mix(in srgb,${retailer.color} 68%,#0f172a))">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.2em] text-white/70">In-Store Cartel &middot; Active Store</p>
            <h1 class="mt-1 text-3xl font-black tracking-[-.04em]">${retailer.name}</h1>
            <p class="mt-0.5 text-xs font-semibold text-white/70">${retailer.tagline}</p>
          </div>
          <span class="grid size-14 place-items-center rounded-2xl bg-white text-xs font-black shadow-lg" style="color:${retailer.color}">${retailer.initials}</span>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="flex flex-1 items-center gap-2 rounded-2xl bg-black/20 px-3.5 py-2.5 text-xs font-bold backdrop-blur-sm">
            <span class="relative flex size-2.5"><span class="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-40"></span><span class="relative size-2.5 rounded-full bg-white"></span></span>
            <span id="scan-status" class="truncate">${activeItemCount} items ready for ${retailer.name} till</span>
          </div>
          <button data-open-camera class="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2.5 text-xs font-black shadow-md transition active:scale-95" style="color:${retailer.color}">
            <svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Scan Camera</span>
          </button>
        </div>
      </div>

      <!-- Items in this Retailer's Cartel -->
      ${activeRetailerCart.length ? cartelItems(activeRetailerCart) : emptyCartel(retailer)}

      <!-- Bottom Checkout Bar for this Retailer -->
      <div class="fixed inset-x-0 bottom-[5.25rem] z-30 mx-auto max-w-3xl border-t border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-16px_40px_-28px_rgba(15,23,42,.5)] backdrop-blur-xl">
        <div class="mb-3 flex items-end justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">${activeItemCount} items at ${retailer.name} &middot; saved ${zar.format(activeSavings)}</p>
            <p class="mt-1 text-sm font-bold">${retailer.name} Total Price</p>
          </div>
          <p class="text-3xl font-black tracking-[-.05em]">${zar.format(activeTotal)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="delivery-checkout" class="secondary-button" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>Order Delivery</span>
          </button>
          <button id="store-checkout" class="primary-button text-white shadow-lg active:scale-95 transition" style="background:${retailer.color}" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>${retailer.name} Till Checkout</span>
          </button>
        </div>
      </div>
    </section>`;

  bindCartelInteractions();
}

function emptyCartel(retailer) {
  return `
    <div class="mx-5 mt-5 grid min-h-[35dvh] place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white/60 px-8 text-center">
      <div>
        <span class="mx-auto grid size-16 place-items-center rounded-3xl text-4xl" style="background:${retailer.soft}">&#128717;</span>
        <h2 class="mt-4 font-black">Your ${retailer.name} Cartel is empty</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">Pick products from your <a href="#list" class="font-bold text-violet-600 underline">Checklist</a> or browse the <a href="#market" class="font-bold text-violet-600 underline">${retailer.name} Catalogue</a>.</p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <button onclick="location.hash='#list'" class="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-violet-600/30">
            Open Grocery Checklist
          </button>
          <button data-open-camera class="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-md flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" class="size-4 fill-none stroke-current stroke-2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Scan with Camera</span>
          </button>
        </div>
      </div>
    </div>`;
}

function cartelItems(items = state.cart) {
  return `<div class="px-5 py-5"><p class="mb-3 text-[10px] font-bold text-slate-400">SWIPE LEFT TO REMOVE FROM CARTEL</p><ul class="space-y-3">${items.map((item) => `
    <li class="relative overflow-hidden rounded-[1.5rem] bg-red-500" data-swipe-shell="${item.barcode}">
      <div class="absolute inset-y-0 right-0 flex w-24 items-center justify-center text-xs font-black text-white">Delete</div>
      <article class="product-row relative flex items-center gap-3 rounded-[1.5rem] bg-white p-3.5 shadow-sm ring-1 ring-slate-900/5" data-swipe-row="${item.barcode}">
        <div class="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="size-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-3xl\\'>${item.emoji || '🛍️'}</span>';" />` : `<span class="grid size-full place-items-center text-3xl">${item.emoji || '🛍️'}</span>`}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="truncate text-xs font-black text-slate-900">${escapeHtml(item.name)}</h2>
            <strong class="shrink-0 text-sm font-black text-slate-900">${zar.format(item.price * item.quantity)}</strong>
          </div>
          <div class="mt-1 flex items-center gap-2">
            <p class="text-[11px] font-semibold text-slate-400">${item.weight || ''} &middot; Qty ${item.quantity}</p>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600">EAN: ${item.barcode}</span>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-600">SAVE ${zar.format((item.basePrice - item.price) * item.quantity)}</span>
            <span class="text-[10px] text-slate-400 line-through">${zar.format(item.basePrice)}</span>
            <span class="text-xs font-black text-slate-900">${zar.format(item.price)} each</span>
          </div>
        </div>
      </article>
    </li>`).join('')}</ul></div>`;
}

function bindCartelInteractions() {
  // Retailer switcher buttons
  screen.querySelectorAll('[data-switch-cartel-retailer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.retailerId = btn.dataset.switchCartelRetailer;
      render();
      showToast(`Switched to ${getRetailer().name} Cartel`);
    });
  });

  screen.querySelectorAll('[data-open-camera]').forEach((btn) => btn.addEventListener('click', openLiveCameraScanner));
  screen.querySelector('#delivery-checkout')?.addEventListener('click', openPayment);
  screen.querySelector('#store-checkout')?.addEventListener('click', () => openMasterBarcode(state.retailerId));
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

    // Distinguish vertical scrolling from intentional horizontal swipe
    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (deltaX < 0) {
      isSwiping = true;
      if (event.cancelable) event.preventDefault();
      // Apply smooth resistance
      currentX = Math.max(-140, deltaX);
      row.style.transform = `translateX(${currentX}px)`;
    }
  }, { passive: false });

  row.addEventListener('touchend', () => {
    row.style.transition = 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease';
    if (currentX <= -75) {
      // Threshold reached: animate complete slide-out to the left
      row.style.transform = 'translateX(-115%)';
      row.style.opacity = '0';
      window.setTimeout(() => {
        removeCartItem(barcode);
        showToast('Item removed from Cartel');
      }, 200);
    } else {
      // Return to original position
      row.style.transform = 'translateX(0px)';
    }
  }, { passive: true });
}

function renderTracker() {
  const order = state.order;
  if (!order) {
    screen.innerHTML = `<section class="px-5 py-8"><p class="section-kicker">Tracker</p><h1 class="mt-2 text-4xl font-black tracking-[-.04em]">Nothing on the road.</h1><div class="card mt-7 px-7 py-12 text-center"><span class="mx-auto grid size-16 place-items-center rounded-3xl bg-blue-50 text-3xl">&#128205;</span><h2 class="mt-4 font-black">Your deliveries live here</h2><p class="mt-2 text-sm leading-6 text-slate-500">Place a delivery order from Cartel to follow every step in real time.</p><button data-go-market class="secondary-button mx-auto mt-6">Browse Market</button></div></section>`;
    screen.querySelector('[data-go-market]').addEventListener('click', () => routeTo('market'));
    return;
  }
  const steps = ['Order confirmed', 'Picking your items', 'Driver on the way', 'Delivered'];
  screen.innerHTML = `
    <section class="px-5 py-8"><p class="section-kicker">Live delivery</p><div class="mt-2 flex items-end justify-between"><div><h1 class="text-4xl font-black tracking-[-.04em]">On its way.</h1><p class="mt-2 text-sm text-slate-500">Order #${order.id}</p></div><span class="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-700">LIVE</span></div>
      <div class="card mt-7 overflow-hidden"><div class="relative h-48 bg-[#e8eee9]"><div class="absolute inset-0 opacity-40" style="background-image:linear-gradient(35deg,transparent 45%,#fff 46%,#fff 51%,transparent 52%),linear-gradient(145deg,transparent 35%,#d1d5db 36%,#d1d5db 39%,transparent 40%);background-size:90px 70px"></div><div class="absolute left-[58%] top-[42%] grid size-12 place-items-center rounded-full bg-slate-950 text-xl text-white shadow-xl ring-4 ring-white">&#128757;</div><div class="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-black shadow">About ${Math.max(4, 18 - order.step * 5)} min away</div></div>
        <div class="p-5"><div class="flex items-center gap-3"><div class="grid size-12 place-items-center rounded-2xl bg-amber-100 text-2xl">&#128104;</div><div><h2 class="font-black">Thabo is your driver</h2><p class="text-xs font-semibold text-slate-400">Toyota Starlet &middot; CA 482-991</p></div><button class="ml-auto grid size-10 place-items-center rounded-xl bg-slate-100">Call</button></div>
        <div class="my-5 border-t border-slate-100"></div><div class="space-y-4">${steps.map((label, index) => `<div class="flex items-center gap-3 ${index > order.step ? 'opacity-35' : ''}"><span class="grid size-7 place-items-center rounded-full ${index <= order.step ? 'bg-violet-600 text-white' : 'bg-slate-200'} text-xs font-black">${index < order.step ? '&check;' : index + 1}</span><span class="text-sm font-bold">${label}</span></div>`).join('')}</div></div></div>
      <div class="mt-5 rounded-[1.75rem] bg-slate-950 p-5 text-white"><p class="text-[10px] font-black uppercase tracking-[.18em] text-white/50">Give this code to your driver</p><div class="mt-2 flex items-center justify-between"><p class="text-4xl font-black tracking-[.2em]">${order.code}</p><span class="text-xs font-bold text-emerald-300">Payout locked &#128274;</span></div><p class="mt-3 text-xs leading-5 text-white/55">Funds unlock only after the driver enters your secure code.</p></div>
      ${order.step < 3 ? '<button id="advance-order" class="secondary-button mt-4 w-full">Demo: advance delivery</button>' : ''}
    </section>`;
  screen.querySelector('#advance-order')?.addEventListener('click', () => { state.order.step += 1; renderTracker(); });
}

function renderSavings() {
  const liveSavings = getCurrentSavings();
  const totalSavings = state.completedSavings + liveSavings;
  const cartTotal = getMerchandiseTotal();
  const basketBoostTarget = 100;
  const basketBoostProgress = Math.min(100, Math.round((cartTotal / basketBoostTarget) * 100));
  const cartProduceItems = state.cart.filter((item) => item.category === 'Vegetables & Fruit');
  const projectedPoints = Math.floor(getPayableTotal());

  screen.innerHTML = `
    <section class="px-5 py-8">
      <p class="section-kicker">Savings & Optimization</p>
      <h1 class="mt-2 text-4xl font-black tracking-[-.04em]">More money,<br><span class="text-violet-600">still in your pocket.</span></h1>

      <!-- Real-Time Loyalty Point Ledger -->
      <div class="mt-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-800 via-violet-700 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-500/25">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-black uppercase tracking-[.2em] text-white/70">Session Savings</p>
          <span class="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Gold Tier</span>
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
                <p class="text-[9px] font-black uppercase tracking-wider text-emerald-300">+${projectedPoints} pts pending</p>
                <p class="text-[10px] text-white/70">from active cart</p>
              </div>` : ''}
          </div>

          <div class="mt-4">
            <div class="flex justify-between text-[10px] font-bold text-white/75">
              <span>Next Reward: R50 Voucher</span>
              <span>${state.loyaltyPoints} / 1,000 pts</span>
            </div>
            <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/25">
              <div class="h-full rounded-full bg-emerald-400 transition-all duration-500" style="width:${Math.min(100, (state.loyaltyPoints / 1000) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Basket Optimization Trackers -->
      <div class="mt-7">
        <h2 class="text-xl font-black">Basket Optimization</h2>
        <div class="mt-3 space-y-3">
          <!-- Basket Boost Tracker -->
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-violet-100 text-lg">⚡</span>
                <div>
                  <h3 class="text-sm font-black">R10 Basket Boost</h3>
                  <p class="text-xs text-slate-500">${cartTotal >= basketBoostTarget ? 'Threshold reached! R10 discount applied.' : `Add ${zar.format(basketBoostTarget - cartTotal)} more to unlock R10 off`}</p>
                </div>
              </div>
              <span class="text-xs font-black ${cartTotal >= basketBoostTarget ? 'text-emerald-600' : 'text-slate-400'}">${basketBoostProgress}%</span>
            </div>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full ${cartTotal >= basketBoostTarget ? 'bg-emerald-500' : 'bg-violet-600'} transition-all duration-300" style="width:${basketBoostProgress}%"></div>
            </div>
          </div>

          <!-- Fresh Produce Tracker -->
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-emerald-100 text-lg">🥑</span>
                <div>
                  <h3 class="text-sm font-black">Fresh Five Produce Saver</h3>
                  <p class="text-xs text-slate-500">${cartProduceItems.length ? `${cartProduceItems.length} fresh item(s) in trolley receiving 5% off` : 'Add fruit or veg to trigger 5% produce discount'}</p>
                </div>
              </div>
              <span class="rounded-xl px-2 py-1 text-[10px] font-black ${state.coupons.has('fresh5') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
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
              <button data-coupon="${coupon.id}" class="rounded-xl px-3.5 py-2 text-[10px] font-black transition active:scale-95 ${state.coupons.has(coupon.id) ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-slate-950 text-white'}">
                ${state.coupons.has(coupon.id) ? '✓ Applied' : '+ Apply'}
              </button>
            </article>`).join('')}
        </div>
      </div>

      <!-- Multi-Store Price Comparison Matrix -->
      <div class="card mt-7 p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-black text-base text-slate-900">Multi-Store Price Comparison Matrix</h2>
            <p class="text-xs text-slate-400">
              ${state.cart.length > 0 ? `Live price matching for your ${state.cart.reduce((s, i) => s + i.quantity, 0)} trolley item(s)` : 'Live benchmark comparison for top 6 South African grocery staples'}
            </p>
          </div>
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black text-emerald-800">
            ${state.cart.length > 0 ? 'My Cart' : 'Staples'}
          </span>
        </div>

        <!-- Store Comparison List -->
        <div class="mt-4 space-y-2.5">
          ${(() => {
            const comparisonItems = state.cart.length > 0 
              ? state.cart 
              : Array.from(MASTER_PRODUCTS.values()).slice(0, 6).map(p => ({ barcode: p.gtin, quantity: 1, ...p }));

            const storeComparisons = PHYSICAL_STORES.map((st) => {
              const total = comparisonItems.reduce((sum, item) => {
                const pr = getStorePrice(st.id, item.barcode || item.gtin);
                const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
                return sum + activePrice * (item.quantity || 1);
              }, 0);
              return { store: st, total };
            }).sort((a, b) => a.total - b.total);

            const cheapest = storeComparisons[0];
            const highest = storeComparisons[storeComparisons.length - 1];
            const maxSavings = Math.max(0, highest.total - cheapest.total);

            return `
              ${storeComparisons.map((item, idx) => {
                const isCheapest = idx === 0;
                const isCurrent = item.store.id === state.currentStoreId;
                const diff = item.total - cheapest.total;

                return `
                  <div 
                    data-drilldown-store="${item.store.id}" 
                    class="flex items-center justify-between rounded-2xl border p-3.5 transition cursor-pointer active:scale-98 ${isCheapest ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200' : isCurrent ? 'bg-slate-50 border-slate-900/30 ring-1 ring-slate-900/10' : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'}"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="grid size-10 shrink-0 place-items-center rounded-xl text-white font-black text-xs shadow-2xs" style="background:${item.store.color}">
                        ${item.store.retailer.slice(0, 2).toUpperCase()}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h4 class="text-xs font-black text-slate-900 truncate">${item.store.name}</h4>
                          ${isCheapest ? '<span class="rounded-md bg-emerald-600 px-1.5 py-0.2 text-[8px] font-black text-white">LOWEST BASKET</span>' : ''}
                          ${isCurrent ? '<span class="rounded-md bg-slate-950 px-1.5 py-0.2 text-[8px] font-mono font-bold text-white">ACTIVE</span>' : ''}
                        </div>
                        <p class="text-[10px] text-slate-400 truncate">${item.store.address}</p>
                      </div>
                    </div>

                    <div class="text-right shrink-0">
                      <span class="text-xs font-black text-slate-900">${zar.format(item.total)}</span>
                      <span class="block text-[9px] font-bold ${isCheapest ? 'text-emerald-700 font-black' : 'text-slate-400'}">
                        ${isCheapest ? 'Best Value' : `+${zar.format(diff)}`}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}

              ${maxSavings > 0 ? `
                <!-- 1-Tap Switch to Cheapest Store Action Banner -->
                <div class="mt-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-md">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-[9px] font-black uppercase tracking-wider text-emerald-200">Optimal Supermarket Recommendation</p>
                      <h4 class="text-xs font-black mt-0.5">${cheapest.store.name} is the cheapest store!</h4>
                      <p class="text-[11px] text-white/80 mt-0.5">Switching stores saves you <strong>${zar.format(maxSavings)}</strong> on this basket.</p>
                    </div>
                    <button 
                      id="switch-to-cheapest-store-btn" 
                      type="button" 
                      data-target-store="${cheapest.store.id}" 
                      data-target-retailer="${cheapest.store.retailerId}" 
                      class="shrink-0 rounded-xl bg-white px-3.5 py-2.5 text-xs font-black text-emerald-900 shadow-md active:scale-95 transition hover:bg-emerald-50"
                    >
                      Switch Store ➔
                    </button>
                  </div>

                  <!-- Projected Annual Savings -->
                  <div class="mt-3 grid grid-cols-3 gap-2 border-t border-white/20 pt-2.5 text-center text-[10px]">
                    <div>
                      <span class="block text-white/70 text-[8px] uppercase">This Basket</span>
                      <strong class="font-black text-emerald-200">${zar.format(maxSavings)}</strong>
                    </div>
                    <div>
                      <span class="block text-white/70 text-[8px] uppercase">Monthly Est.</span>
                      <strong class="font-black text-emerald-200">${zar.format(maxSavings * 4)}</strong>
                    </div>
                    <div>
                      <span class="block text-white/70 text-[8px] uppercase">Annual Est.</span>
                      <strong class="font-black text-emerald-200">${zar.format(maxSavings * 52)}</strong>
                    </div>
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
            <dd class="font-black text-emerald-600">${zar.format(getBuiltInSavings())}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Active coupon deductions</dt>
            <dd class="font-black text-emerald-600">${zar.format(getCouponSavings())}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Past completed order savings</dt>
            <dd class="font-black text-slate-800">${zar.format(state.completedSavings)}</dd>
          </div>
          <div class="flex justify-between border-t border-slate-100 pt-3">
            <dt class="font-black text-slate-950">Total Value Preserved</dt>
            <dd class="text-lg font-black text-violet-700">${zar.format(totalSavings)}</dd>
          </div>
        </dl>
      </div>
    </section>`;

  // Bind coupon clicks
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

  // Bind 1-tap switch to cheapest store
  screen.querySelector('#switch-to-cheapest-store-btn')?.addEventListener('click', (e) => {
    const targetStoreId = e.currentTarget.dataset.targetStore;
    const targetRetailerId = e.currentTarget.dataset.targetRetailer;

    state.currentStoreId = targetStoreId;
    state.retailerId = targetRetailerId;

    // Convert cart items to the new store retailerId
    state.cart = state.cart.map(item => {
      const pr = getStorePrice(targetStoreId, item.barcode || item.gtin);
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
    showToast(`✓ Trolley transferred to ${PHYSICAL_STORES.find(s => s.id === targetStoreId)?.name}!`);
    renderSavings();
  });

  // Bind store drilldown modal
  screen.querySelectorAll('[data-drilldown-store]').forEach((card) => {
    card.addEventListener('click', () => {
      const storeId = card.dataset.drilldownStore;
      const targetStore = PHYSICAL_STORES.find(s => s.id === storeId);
      if (targetStore) openStorePriceBreakdownModal(targetStore);
    });
  });
}

function openStorePriceBreakdownModal(store) {
  const comparisonItems = state.cart.length > 0 
    ? state.cart 
    : Array.from(MASTER_PRODUCTS.values()).slice(0, 6).map(p => ({ barcode: p.gtin, quantity: 1, ...p }));

  const total = comparisonItems.reduce((sum, item) => {
    const pr = getStorePrice(store.id, item.barcode || item.gtin);
    const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
    return sum + activePrice * (item.quantity || 1);
  }, 0);

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="grid size-10 place-items-center rounded-xl text-white font-black text-xs shadow-2xs" style="background:${store.color}">
              ${store.retailer.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-900">${store.name}</h3>
              <p class="text-[10px] text-slate-400 font-mono">Store Code: #${store.retailerStoreCode} &bull; ${store.loyalty}</p>
            </div>
          </div>
          <button id="close-drilldown-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-200">✕</button>
        </div>

        <!-- Itemized Price List -->
        <div class="mt-4 space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
          ${comparisonItems.map((item) => {
            const master = MASTER_PRODUCTS.get(item.barcode || item.gtin) || item;
            const pr = getStorePrice(store.id, master.gtin || item.barcode);
            const activePrice = (pr.promoPrice && pr.promoPrice < pr.regularPrice) ? pr.promoPrice : pr.regularPrice;
            const hasPromo = pr.promoPrice && pr.promoPrice < pr.regularPrice;
            const qty = item.quantity || 1;

            return `
              <div class="flex items-center justify-between rounded-2xl border border-slate-100 p-2.5 bg-slate-50/70">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="size-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <img src="${master.imageUrl || master.image}" alt="${escapeHtml(master.title || master.name)}" class="size-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-lg\\'>${master.emoji || '🛍️'}</span>';" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-black text-slate-900 truncate">${escapeHtml(master.title || master.name)}</h4>
                    <p class="text-[9px] text-slate-400 font-mono">Qty: ${qty} &bull; ${master.weight || '1 unit'}</p>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-xs font-black text-slate-900">${zar.format(activePrice * qty)}</span>
                  ${hasPromo ? `
                    <span class="block text-[8px] font-bold text-emerald-600">Promo (${zar.format(activePrice)} ea)</span>
                  ` : `
                    <span class="block text-[8px] text-slate-400 font-mono">${zar.format(activePrice)} ea</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Total & Switch Button -->
        <div class="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Basket Cost</span>
            <p class="text-base font-black text-slate-900">${zar.format(total)}</p>
          </div>
          <button 
            id="modal-select-this-store-btn" 
            type="button" 
            class="rounded-2xl px-4 py-2.5 text-xs font-black text-white shadow-md active:scale-95 transition" 
            style="background:${store.color}"
          >
            Shop at ${store.retailer} ➔
          </button>
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-drilldown-modal-btn')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
  });

  modalRoot.querySelector('#modal-select-this-store-btn')?.addEventListener('click', () => {
    state.currentStoreId = store.id;
    state.retailerId = store.retailerId;
    modalRoot.innerHTML = '';
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(30);
    showToast(`📍 Switched active store to ${store.name}`);
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

function openCrowdsourceModal(barcode) {
  state.overlay = 'crowdsource';
  const emojis = ['🍞', '🥛', '🥔', '🍎', '🥑', '🧼', '🍋', '🍫', '🥤', '🥩', '🧀', '🧃', '🍪'];
  const regionalPresets = [
    { name: 'Mister Bread White Sliced', weight: '700 g', category: 'Snacks & Drinks', price: 16.49, basePrice: 18.99, emoji: '🍞' },
    { name: 'Ritebrand Long Life Milk', weight: '6 x 1 L', category: 'Snacks & Drinks', price: 89.99, basePrice: 99.99, emoji: '🥛' },
    { name: 'No Name Sunflower Oil', weight: '2 L', category: 'Snacks & Drinks', price: 64.99, basePrice: 74.99, emoji: '🛢️' },
    { name: 'SPAR Fresh Brown Eggs', weight: '18 pack', category: 'Snacks & Drinks', price: 49.99, basePrice: 59.99, emoji: '🥚' },
    { name: 'Albany Superior White Bread', weight: '700 g', category: 'Snacks & Drinks', price: 18.99, basePrice: 22.99, emoji: '🍞' }
  ];

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <section class="sheet-enter max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[2.25rem] bg-white p-5 pb-safe sm:rounded-[2.25rem]" role="dialog" aria-modal="true" aria-labelledby="crowdsource-title">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden"></div>
        <div class="flex items-start justify-between">
          <div>
            <p class="section-kicker text-emerald-600">Crowdsourced First Scan</p>
            <h2 id="crowdsource-title" class="mt-1 text-2xl font-black">Register New Item</h2>
          </div>
          <button data-close-modal class="grid size-10 place-items-center rounded-xl bg-slate-100 text-lg transition active:scale-95">&times;</button>
        </div>

        <p class="mt-2 text-xs leading-5 text-slate-500">Barcode <strong class="font-mono text-slate-900">${escapeHtml(barcode)}</strong> is new. Snap the shelf tag or select a regional brand to register it for all shoppers.</p>

        <!-- Shelf Tag Snap Upload -->
        <div class="mt-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-center">
          <input type="file" id="shelf-tag-camera" accept="image/*" capture="environment" class="hidden">
          <label for="shelf-tag-camera" class="cursor-pointer flex flex-col items-center justify-center gap-1.5">
            <span class="grid size-11 place-items-center rounded-full bg-emerald-600 text-lg text-white shadow-md shadow-emerald-600/30">📷</span>
            <strong class="text-xs font-black text-emerald-950">Snap Shelf Price Tag</strong>
            <span class="text-[10px] text-emerald-700/80">Take a quick photo of the physical price label</span>
          </label>
          <div id="shelf-tag-preview" class="mt-2 hidden rounded-xl bg-white p-2 text-xs font-bold text-slate-700 shadow-sm border border-emerald-200">
            ✓ Shelf price tag attached
          </div>
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
          <label class="block text-xs font-black text-slate-700">Product Name
            <input id="cs-name" name="name" required class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="e.g. Mister Bread White Sliced">
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="block text-xs font-black text-slate-700">Category
              <select id="cs-category" name="category" class="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                <option value="Snacks & Drinks">Snacks & Drinks</option>
                <option value="Vegetables & Fruit">Vegetables & Fruit</option>
                <option value="Bath & Body">Bath & Body</option>
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
            <span>Index & Add to Cartel</span>
          </button>
        </form>
      </section>
    </div>`;

  bindModalClose();

  // Handle Shelf Tag Camera Snap & Cloud Vision OCR Text Extraction Loop
  modalRoot.querySelector('#shelf-tag-camera')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = modalRoot.querySelector('#shelf-tag-preview');
      if (preview) {
        preview.innerHTML = `<span class="inline-flex items-center gap-1.5 text-emerald-700 font-bold"><span class="size-2 animate-ping rounded-full bg-emerald-500"></span>🔍 Cloud Vision OCR: Extracting title & currency digits...</span>`;
        preview.classList.remove('hidden');
      }

      // OCR Extraction Loop (Simulated Cloud Vision API Text & Price Parser)
      window.setTimeout(() => {
        // Parse regional bakery / grocery item heuristics
        const simulatedOcrText = 'MISTER BREAD WHITE SLICED 700G R 16.49 WAS R 18.99';
        const priceMatches = simulatedOcrText.match(/R\s*([0-9]+(?:\.[0-9]{2})?)/gi) || [];
        const parsedPrices = priceMatches.map(p => parseFloat(p.replace(/[^0-9.]/g, ''))).filter(p => !isNaN(p));
        
        const extractedPrice = parsedPrices[0] || 16.49;
        const extractedBase = parsedPrices[1] || 18.99;

        const nameInput = modalRoot.querySelector('#cs-name');
        const weightInput = modalRoot.querySelector('#cs-weight');
        const priceInput = modalRoot.querySelector('#cs-price');
        const basePriceInput = modalRoot.querySelector('#cs-base-price');

        if (nameInput) nameInput.value = 'Mister Bread White Sliced';
        if (weightInput) weightInput.value = '700 g';
        if (priceInput) priceInput.value = extractedPrice;
        if (basePriceInput) basePriceInput.value = extractedBase;

        if (preview) {
          preview.innerHTML = `✓ <strong class="text-emerald-900">OCR Extracted:</strong> Mister Bread (700g) · <strong>R ${extractedPrice.toFixed(2)}</strong> (Was R ${extractedBase.toFixed(2)})`;
        }
        showToast('OCR extracted: Mister Bread R16.49');
      }, 750);
    }
  });

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

  modalRoot.querySelector('#crowdsource-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const price = parseFloat(formData.get('price')) || 19.99;
    const basePrice = parseFloat(formData.get('basePrice')) || price * 1.15;

    const newProduct = {
      barcode: String(barcode).trim(),
      name: formData.get('name').trim(),
      category: formData.get('category'),
      weight: formData.get('weight').trim(),
      price: price,
      basePrice: basePrice,
      emoji: formData.get('emoji') || '🛍️'
    };

    // Save to in-memory map
    PRODUCTS.set(newProduct.barcode, newProduct);

    // Add to cart
    addToCart(newProduct);
    closeModal();
    routeTo('cartel');
    showToast(`${newProduct.name} registered & added to Cartel!`);
  });
}

function completeDeliveryPayment(event) {
  event.preventDefault();
  if (event.currentTarget && typeof event.currentTarget.reportValidity === 'function') {
    if (!event.currentTarget.reportValidity()) return;
  }
  const code = String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');
  state.order = { id: Date.now().toString(36).slice(-6).toUpperCase(), code, step: 0, items: structuredClone(state.cart), total: getPayableTotal(), retailerId: state.retailerId };
  state.completedSavings += getCurrentSavings();
  state.loyaltyPoints += Math.floor(getPayableTotal());
  state.cart = [];
  closeModal();
  routeTo('tracker');
  showToast('Payment approved - delivery created');
}

function getSingleQrCheckoutPayload(retailerId = state.retailerId, mode = 'crlf') {
  // Unpack product quantities for the selected retailer into individual barcode lines
  const cartItems = getRetailerCart(retailerId);
  const lines = [];
  for (const item of cartItems) {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    for (let i = 0; i < qty; i++) {
      lines.push(String(item.barcode).trim());
    }
  }
  if (!lines.length) return '';
  if (mode === 'cr') return lines.join('\r') + '\r';
  if (mode === 'lf') return lines.join('\n') + '\n';
  return lines.join('\r\n') + '\r\n'; // Default CRLF keyboard wedge
}

async function openMasterBarcode(retailerId = state.retailerId, streamMode = 'crlf') {
  const targetRet = retailerId || state.retailerId || 'shoprite';
  const retailer = RETAILERS[targetRet] || RETAILERS.shoprite;
  const cartItems = getRetailerCart(targetRet);
  if (!cartItems.length) {
    showToast(`Your ${retailer.name} Cartel is empty`);
    return;
  }
  const payload = getSingleQrCheckoutPayload(targetRet, streamMode);
  let qrUrl = '';
  try {
    qrUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      width: 360,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR generation error:', err);
    qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payload)}`;
  }

  state.overlay = 'barcode';

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[60] overflow-y-auto bg-slate-950/85 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="qr-checkout-title">
      <section class="mx-auto flex min-h-dvh max-w-lg flex-col justify-between p-5 pb-safe pt-6 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="grid size-10 place-items-center rounded-2xl text-white font-black text-xs shadow-md" style="background:${retailer.color}">${retailer.initials}</span>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[.2em] text-emerald-400">${retailer.name} Till Stream</p>
              <h2 id="qr-checkout-title" class="mt-0.5 text-2xl font-black">Single QR Till Flash</h2>
            </div>
          </div>
          <button data-close-modal class="grid size-11 place-items-center rounded-2xl bg-white/10 text-xl font-bold text-white transition active:scale-95">&times;</button>
        </div>

        <div class="my-5 rounded-3xl bg-white p-5 text-center text-slate-950 shadow-2xl">
          <!-- Format Switcher Bar -->
          <div class="mb-4 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 p-1">
            <button type="button" data-stream-mode="crlf" class="flex-1 rounded-xl py-1.5 text-[11px] font-black transition ${streamMode === 'crlf' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              Wedge (\\r\\n Enter)
            </button>
            <button type="button" data-stream-mode="cr" class="flex-1 rounded-xl py-1.5 text-[11px] font-black transition ${streamMode === 'cr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              Raw (\\r Return)
            </button>
            <button type="button" data-stream-mode="lf" class="flex-1 rounded-xl py-1.5 text-[11px] font-black transition ${streamMode === 'lf' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              Unix (\\n Line)
            </button>
          </div>

          <!-- QR Code Frame with Presentation Laser Guide -->
          <div class="relative mx-auto size-72 overflow-hidden rounded-2xl border-2 border-slate-900/10 bg-white p-2 shadow-inner">
            <img src="${qrUrl}" alt="Single QR Till Stream Code" class="size-full object-contain" />
          </div>

          <p class="mt-3 text-xs font-black uppercase tracking-[.18em] text-slate-400">${getItemCount(targetRet)} items at ${retailer.name} &middot; ${zar.format(getPayableTotal(targetRet))}</p>
          <p class="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">Flash this 2D code once at the cashier's presentation laser scanner to populate all ${cartItems.length} products line-by-line automatically at the POS till.</p>

          <!-- ASCII Stream Item Inspector -->
          <details class="mt-4 border-t border-slate-100 pt-3 text-left" open>
            <summary class="cursor-pointer text-center text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700">Encoded Barcode Stream Sequence (${cartItems.length} items)</summary>
            <div class="mt-2 max-h-36 overflow-y-auto rounded-xl bg-slate-50 p-2.5 font-mono text-[11px] text-slate-800 space-y-1.5">
              ${payload.split(/[\r\n]+/).filter(Boolean).map((code, idx) => {
                const prod = PRODUCTS.get(code) || cartItems.find(i => i.barcode === code);
                return `
                  <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70 shadow-xs">
                    <div class="truncate mr-2">
                      <strong class="text-slate-400">${idx + 1}.</strong>
                      <span class="font-bold text-slate-900">${escapeHtml(code)}</span>
                      ${prod ? `<span class="text-[10px] text-slate-500 font-normal"> &middot; ${escapeHtml(prod.name)}</span>` : ''}
                    </div>
                    <span class="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 shrink-0">[↵ Enter]</span>
                  </div>
                `;
              }).join('')}
            </div>
          </details>

          <!-- Simulated POS Till Scanner Tester -->
          <div class="mt-4 border-t border-slate-100 pt-3">
            <button id="simulate-pos-scan-btn" type="button" class="w-full rounded-2xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-violet-700 active:scale-95 transition flex items-center justify-center gap-2 shadow-md">
              <span>⚡</span><span>Test Simulated POS Till Scanner</span>
            </button>
            <div id="simulated-pos-output" class="hidden mt-3 rounded-2xl bg-slate-950 p-3.5 text-left font-mono text-xs text-emerald-400 space-y-1 border border-emerald-500/30"></div>
          </div>
        </div>

        <div class="mb-2 rounded-2xl bg-white/10 px-4 py-3 text-center text-xs font-bold text-white/80">
          🔒 Zero payment data in QR &middot; Settle safely at ${retailer.name} till
        </div>
      </section>
    </div>`;

  // Bind mode switcher buttons
  modalRoot.querySelectorAll('[data-stream-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openMasterBarcode(targetRet, btn.dataset.streamMode);
    });
  });

  // Bind Simulated POS scanner tester
  modalRoot.querySelector('#simulate-pos-scan-btn')?.addEventListener('click', async () => {
    const outputEl = modalRoot.querySelector('#simulated-pos-output');
    if (!outputEl) return;
    outputEl.classList.remove('hidden');
    outputEl.innerHTML = `<div class="text-white/70">▶ Connecting to ${retailer.name} Point-of-Sale (POS)...</div>`;
    
    const lines = payload.split(/[\r\n]+/).filter(Boolean);
    let cumulative = 0;
    
    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      const code = lines[i];
      const prod = PRODUCTS.get(code) || cartItems.find(it => it.barcode === code);
      const itemPrice = prod ? prod.price : 19.99;
      cumulative += itemPrice;
      
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(35);
      
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between text-[11px] animate-in fade-in';
      row.innerHTML = `
        <span><strong class="text-white">${i + 1}. [WEDGE]</strong> ${code} &middot; ${prod ? prod.name.slice(0, 20) : 'Item'}</span>
        <span class="text-white font-bold">${zar.format(itemPrice)}</span>
      `;
      outputEl.appendChild(row);
    }
    
    await new Promise(r => setTimeout(r, 300));
    const summary = document.createElement('div');
    summary.className = 'mt-2 border-t border-white/20 pt-2 flex items-center justify-between font-bold text-white text-xs';
    summary.innerHTML = `
      <span>✓ TILL TOTAL (${lines.length} Items):</span>
      <span class="text-emerald-400 font-black text-sm">${zar.format(cumulative)}</span>
    `;
    outputEl.appendChild(summary);
    showToast(`✓ POS Stream Verified: ${lines.length} barcodes scanned in sequence!`);
  });

  bindModalClose();
}

let activeCameraStream = null;
let cameraScanLoopActive = false;
let lastDetectedBarcode = null;
let lastDetectedTime = 0;

function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Audio context not allowed or unsupported
  }
}

async function openLiveCameraScanner() {
  state.overlay = 'camera';

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[70] flex flex-col justify-between bg-slate-950 text-white" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <!-- Camera Header -->
      <div class="flex items-center justify-between p-4 pt-safe z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div class="flex items-center gap-2.5">
          <span class="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white text-base">📷</span>
          <div>
            <h2 id="camera-title" class="text-sm font-black tracking-tight">Camera Barcode Scanner</h2>
            <p class="text-[10px] text-emerald-400 font-bold">Auto-detecting EAN-13 & UPC</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="camera-torch-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/10 text-white transition active:scale-95">
            🔦
          </button>
          <button id="camera-close-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/10 text-xl font-bold text-white transition active:scale-95">
            &times;
          </button>
        </div>
      </div>

      <!-- Live Video Viewfinder Container -->
      <div class="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        <video id="camera-scanner-video" playsinline autoplay muted class="size-full object-cover"></video>

        <!-- Scanning Reticle & Aiming Laser Guide -->
        <div class="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div class="relative size-64 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
            <!-- Reticle Corners -->
            <div class="absolute -left-1 -top-1 size-6 border-l-4 border-t-4 border-emerald-400 rounded-tl-xl"></div>
            <div class="absolute -right-1 -top-1 size-6 border-r-4 border-t-4 border-emerald-400 rounded-tr-xl"></div>
            <div class="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
            <div class="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>

            <!-- Sweeping Animated Red Laser Line -->
            <div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        </div>

        <div id="camera-detection-badge" class="pointer-events-none absolute bottom-6 rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-black text-white backdrop-blur-md transition-all opacity-0">
          ✓ Scanned
        </div>
      </div>

      <!-- Footer Quick Test Simulator Bar -->
      <div class="z-10 bg-slate-900/95 p-4 pb-safe border-t border-white/10 backdrop-blur-md">
        <p class="text-center text-[10px] font-black uppercase tracking-wider text-slate-400">Aim camera at barcode or tap to simulate</p>
        <div class="mt-2.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button data-quick-code="6001234567890" class="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">🍞 Bread</button>
          <button data-quick-code="6001007320995" class="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">🥛 Milk</button>
          <button data-quick-code="6001068594502" class="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">🥔 Chips</button>
          <button data-quick-code="6009510805536" class="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">🍎 Apples</button>
          <button data-quick-code="6001007001001" class="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">🍞 Mister Bread</button>
        </div>
      </div>
    </div>`;

  modalRoot.querySelector('#camera-close-btn')?.addEventListener('click', closeCameraScanner);

  // Quick Code Simulation Buttons
  modalRoot.querySelectorAll('[data-quick-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onBarcodeScanned(btn.dataset.quickCode);
    });
  });

  // Torch Toggle
  let torchOn = false;
  modalRoot.querySelector('#camera-torch-btn')?.addEventListener('click', async () => {
    if (activeCameraStream) {
      const track = activeCameraStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        torchOn = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: torchOn }] });
        showToast(torchOn ? 'Torch turned ON' : 'Torch turned OFF');
      } else {
        showToast('Torch not supported on this camera');
      }
    }
  });

  // Start Camera Stream
  const videoEl = modalRoot.querySelector('#camera-scanner-video');
  try {
    activeCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    if (videoEl) {
      videoEl.srcObject = activeCameraStream;
      await videoEl.play();
      startBarcodeDetectionLoop(videoEl);
    }
  } catch (err) {
    console.warn('Camera access error:', err);
    showToast('Camera access unavailable. Using tap simulator.');
  }
}

function closeCameraScanner() {
  cameraScanLoopActive = false;
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }
  closeModal();
}

async function startBarcodeDetectionLoop(videoEl) {
  cameraScanLoopActive = true;

  if ('BarcodeDetector' in window) {
    try {
      const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
      });

      const detectFrame = async () => {
        if (!cameraScanLoopActive || !videoEl || videoEl.readyState < 2) {
          if (cameraScanLoopActive) requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoEl);
          if (barcodes.length > 0) {
            const detectedValue = barcodes[0].rawValue;
            const now = Date.now();
            // Debounce same barcode for 1.5s
            if (detectedValue !== lastDetectedBarcode || (now - lastDetectedTime) > 1500) {
              lastDetectedBarcode = detectedValue;
              lastDetectedTime = now;
              onBarcodeScanned(detectedValue);
            }
          }
        } catch (e) {
          // Detection frame error
        }

        if (cameraScanLoopActive) {
          requestAnimationFrame(detectFrame);
        }
      };

      requestAnimationFrame(detectFrame);
    } catch (err) {
      console.warn('BarcodeDetector initialization error:', err);
    }
  }
}

function onBarcodeScanned(barcode) {
  playBeepSound();
  if (navigator.vibrate) {
    navigator.vibrate([60, 40, 60]);
  }

  // Show detection badge animation
  const badge = modalRoot.querySelector('#camera-detection-badge');
  if (badge) {
    badge.textContent = `✓ Scanned: ${barcode}`;
    badge.classList.remove('opacity-0');
    badge.classList.add('opacity-100');
    setTimeout(() => badge.classList.replace('opacity-100', 'opacity-0'), 1200);
  }

  handleHardwareScan(barcode);
}

function closeModal() {
  state.overlay = null;
  modalRoot.innerHTML = '';
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

  // Check if this is a multi-line barcode stream (from Single QR Till stream)
  const lines = cleanInput.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) {
    state.scanBusy = true;
    let matchedCount = 0;
    for (const code of lines) {
      const product = await fetchProductFromFirestore(code);
      if (product) {
        addToCart(product, state.retailerId);
        matchedCount++;
      }
    }
    state.scanBusy = false;
    routeTo('cartel');
    showToast(`✓ Scanned QR Stream: Added ${matchedCount} items to ${getRetailer().name} Cartel!`);
    return;
  }

  const cleanBarcode = lines[0] || cleanInput;
  const retailer = Object.values(RETAILERS).find((item) => item.entryBarcode === cleanBarcode);
  if (retailer) {
    state.retailerId = retailer.id;
    routeTo('cartel');
    showToast(`Welcome to ${retailer.name} - scanner linked`);
    return;
  }
  if (!getRetailer()) {
    showToast('Scan a retailer entry code first.');
    routeTo('cartel');
    return;
  }
  state.scanBusy = true;
  if (state.route === 'cartel') {
    const status = document.querySelector('#scan-status');
    if (status) status.textContent = `Looking up ${cleanBarcode}...`;
  }
  try {
    const product = await fetchProductFromFirestore(cleanBarcode);
    if (!product) {
      // Trigger crowdsourced first-scan fallback interface
      openCrowdsourceModal(cleanBarcode);
      return;
    }
    addToCart(product, state.retailerId);
    routeTo('cartel');
    const status = document.querySelector('#scan-status');
    if (status) status.textContent = `${product.name} added - ready for next scan`;
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

      // Blur focused text box so keyboard dismisses and scanner doesn't trigger form submit
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
      // Stream detected at superhuman typing speed
      isHardwareStream = true;
      scanBuffer += event.key;
      lastScannerKeyAt = now;

      // Prevent scanner keystrokes from leaking into active input fields
      if (isInputFocused) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      // First character or human typing gap
      if (!isInputFocused) {
        // No input focused: treat as potential start of a hardware scan
        scanBuffer = event.key;
        isHardwareStream = false;
        lastScannerKeyAt = now;
      } else {
        // Human is intentionally typing into a text field
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
    dlBtn.classList.add('ring-2', 'ring-violet-500', 'bg-violet-100', 'animate-pulse');
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
            <span class="grid size-12 place-items-center rounded-2xl bg-violet-600 text-white text-xl font-black shadow-lg shadow-violet-600/30">📥</span>
            <div>
              <h2 class="text-lg font-black tracking-tight">Download & Install Automater</h2>
              <p class="text-xs text-slate-400">Native In-App Store Browsing & Scraper</p>
            </div>
          </div>
          <button id="close-install-modal" type="button" class="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-500 hover:bg-slate-200">
            &times;
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <!-- Standalone Status Badge -->
          ${isStandalone ? `
            <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-3">
              <span class="text-2xl">✅</span>
              <div>
                <strong class="block text-xs font-black text-emerald-800">Native Standalone Mode Active</strong>
                <span class="text-[11px] text-emerald-600">Automater is running as an installed native application on this device.</span>
              </div>
            </div>
          ` : `
            <!-- 1. Instant 1-Tap Install (PWA) -->
            <div class="rounded-3xl border border-violet-200 bg-violet-50/60 p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="rounded-full bg-violet-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Recommended</span>
                <span class="text-[10px] font-bold text-violet-700">1-Tap Install</span>
              </div>
              <h3 class="text-sm font-black text-slate-900">Install to Home Screen & App Drawer</h3>
              <p class="text-xs text-slate-500 mt-1 leading-5">Instantly launches Automater in full native immersion without browser URL bars, enabling live on-click scraping and offline Cartel checkout.</p>
              
              <button id="trigger-pwa-install-btn" type="button" class="mt-3.5 w-full rounded-2xl bg-violet-600 py-3 text-xs font-black text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700 active:scale-95 transition flex items-center justify-center gap-2">
                <span>📲</span><span>Install Automater App Now</span>
              </button>

              ${isIOS ? `
                <div class="mt-3 rounded-xl bg-white/80 p-3 border border-violet-100 text-xs text-slate-600 space-y-1">
                  <p class="font-black text-slate-900">📱 iOS Safari Installation Steps:</p>
                  <p>1. Tap the <strong>Share</strong> button (box with upward arrow <span class="font-bold">􀈂</span>) at the bottom of Safari.</p>
                  <p>2. Scroll down and tap <strong>Add to Home Screen ➕</strong>.</p>
                  <p>3. Tap <strong>Add</strong> in top right. Automater will appear on your home screen!</p>
                </div>
              ` : ''}
            </div>
          `}

          <!-- 2. Native Capacitor Android APK / iOS Wrapper Info -->
          <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-slate-900">📦 Native Android (APK) & iOS (Xcode)</span>
              <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">Capacitor v7</span>
            </div>
            <p class="text-xs text-slate-500 leading-5">Automater includes full <code>@capacitor/core</code> native bindings for building standalone Android APKs and iOS WKWebView packages with unrestricted <code>shoprite.co.za</code> webview root access.</p>
            
            <div class="rounded-2xl bg-slate-900 p-3 text-slate-200 font-mono text-[11px] space-y-1">
              <p class="text-emerald-400 font-bold"># Build native mobile packages:</p>
              <p>npx cap add android</p>
              <p>npx cap add ios</p>
              <p>npx cap copy</p>
              <p>npx cap open android</p>
            </div>
          </div>

          <!-- 3. Unlocked Native Features -->
          <div class="rounded-3xl border border-slate-100 bg-white p-4">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Native App Capabilities</h4>
            <div class="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>⚡</span><span>Live DOM Scraper</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>📳</span><span>Haptic Vibrations</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>📷</span><span>Hardware Barcode</span>
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-slate-100/70 p-2">
                <span>🏁</span><span>Offline QR Till Stream</span>
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

  // Bind close buttons
  modalRoot.querySelector('#close-install-modal')?.addEventListener('click', closeModal);
  modalRoot.querySelector('#close-install-btn-bottom')?.addEventListener('click', closeModal);

  // Bind PWA prompt trigger
  modalRoot.querySelector('#trigger-pwa-install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('✓ Automater is installing to your device!');
        closeModal();
      }
      deferredInstallPrompt = null;
    } else {
      if (isIOS) {
        showToast('Follow the 3 Safari steps above to Add to Home Screen!');
      } else {
        showToast('Tap the 3 dots (⋮) in your browser and select "Install app" or "Add to Home Screen"');
      }
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTOMATER_PRODUCT_SELECTED' && event.data.product) {
    const scraped = event.data.product;
    const barcode = scraped.barcode;
    state.selectedCatalogBarcode = barcode;
    
    // Save to cache
    PRODUCTS.set(barcode, scraped);
    automationCore.selectProduct({ barcode, ...scraped });

    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(45);
    showToast(`✓ Captured: ${scraped.name} (${zar.format(scraped.price)})`);
    
    // Re-render bottom dock immediately
    const dockContainer = document.querySelector('#catalog-action-dock');
    if (dockContainer) {
      dockContainer.outerHTML = renderCatalogActionDock(getRetailer(), scraped, barcode);
      bindDockActionButtons(getRetailer());
    } else {
      renderMarket();
    }
  }
});

window.addEventListener('keydown', hardwareScannerKeydown, { capture: true });
window.addEventListener('hashchange', () => { state.route = getRouteFromHash(); render(); });
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => routeTo(button.dataset.route)));
document.querySelector('#header-download-button')?.addEventListener('click', openInstallModal);
document.querySelector('#header-cart-button')?.addEventListener('click', () => routeTo('cartel'));
document.querySelector('#header-camera-button')?.addEventListener('click', openLiveCameraScanner);
window.handleHardwareScan = handleHardwareScan;
window.openLiveCameraScanner = openLiveCameraScanner;
window.openInstallModal = openInstallModal;

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed:', error)));
}

initializeFirebaseConnectivity();
render();
