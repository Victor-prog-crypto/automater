import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { automationCore, AUTOMATION_EVENTS, RetailDOMScraper } from './automation-core.js';

const ROUTES = Object.freeze(['market', 'trolley', 'cartel', 'tracker', 'savings']);
const SCANNER_KEY_GAP_MS = 30;
const MIN_BARCODE_LENGTH = 6;

const RETAILERS = Object.freeze({
  shoprite: { id: 'shoprite', name: 'Shoprite', url: 'https://www.shoprite.co.za', host: 'shoprite.co.za', tagline: 'Low prices you can trust', loyalty: 'Xtra Savings', entryBarcode: '9000000000001', color: '#e11d2e', soft: '#fff1f2', initials: 'S', accent: 'from-red-600 to-rose-700', logoUrl: '/logos/shoprite.svg' },
  checkers: { id: 'checkers', name: 'Checkers', url: 'https://www.checkers.co.za', host: 'checkers.co.za', tagline: 'Better and better', loyalty: 'Sixty60 / Xtra', entryBarcode: '9000000000004', color: '#004831', soft: '#ecfdf5', initials: 'C', accent: 'from-emerald-800 to-teal-900', logoUrl: '/logos/checkers.svg' },
  pnp: { id: 'pnp', name: 'Pick n Pay', url: 'https://www.pnp.co.za', host: 'pnp.co.za', tagline: 'Fresh choices, smart prices', loyalty: 'Smart Shopper', entryBarcode: '9000000000002', color: '#005baa', soft: '#eff6ff', initials: 'PnP', accent: 'from-blue-600 to-indigo-800', logoUrl: '/logos/pnp.svg' },
  spar: { id: 'spar', name: 'SPAR', url: 'https://www.spar.co.za', host: 'spar.co.za', tagline: 'Good for you', loyalty: 'SPAR Rewards', entryBarcode: '9000000000003', color: '#138a42', soft: '#f0fdf4', initials: 'SPAR', accent: 'from-emerald-600 to-green-700', logoUrl: '/logos/spar.svg' },
  woolworths: { id: 'woolworths', name: 'Woolworths', url: 'https://www.woolworths.co.za', host: 'woolworths.co.za', tagline: 'The difference', loyalty: 'WRewards', entryBarcode: '9000000000005', color: '#18181b', soft: '#fafafa', initials: 'WW', accent: 'from-zinc-900 to-neutral-950', logoUrl: '/logos/woolworths.svg' },
  boxer: { id: 'boxer', name: 'Boxer', url: 'https://www.boxer.co.za', host: 'boxer.co.za', tagline: 'Never pay more than the Boxer price', loyalty: 'Boxer Club', entryBarcode: '9000000000006', color: '#ea580c', soft: '#fff7ed', initials: 'BXR', accent: 'from-orange-600 to-amber-700', logoUrl: '/logos/boxer.svg' }
});

const MASTER_PRODUCTS = new Map([
  ['6001007001001', {
    gtin: '6001007001001',
    retailerId: 'shoprite',
    title: "Albany Superior Thick Slices White Bread 700g",
    brand: "Albany",
    imageUrl: '/products/6001007001001.jpg',
    category: "Bakery & Fresh Produce",
    weight: "700 g",
    basePrice: 19.99,
    promoPrice: 16.99,
    emoji: '🍞',
    isHouseBrand: false,
    searchKeywords: ["albany", "bread", "white", "sliced", "superior", "bakery", "toast"]
  }],
  ['6001007001018', {
    gtin: '6001007001018',
    retailerId: 'shoprite',
    title: "Albany Superior Sliced Brown Bread 700g",
    brand: "Albany",
    imageUrl: '/products/6001007001018.jpg',
    category: "Bakery & Fresh Produce",
    weight: "700 g",
    basePrice: 18.49,
    promoPrice: 15.99,
    emoji: '🍞',
    isHouseBrand: false,
    searchKeywords: ["albany", "bread", "brown", "sliced", "superior", "bakery", "toast"]
  }],
  ['6001007002070', {
    gtin: '6001007002070',
    retailerId: 'shoprite',
    title: "Mister Bread White Sliced Bread 700g",
    brand: "Mister Bread",
    imageUrl: '/products/6001007002070.svg',
    category: "Bakery & Fresh Produce",
    weight: "700 g",
    basePrice: 16.49,
    promoPrice: 13.99,
    emoji: '🍞',
    isHouseBrand: true,
    searchKeywords: ["mister bread", "bread", "white", "sliced", "shoprite", "bakery", "budget"]
  }],
  ['6001007002087', {
    gtin: '6001007002087',
    retailerId: 'shoprite',
    title: "Mister Bread Brown Sliced Bread 700g",
    brand: "Mister Bread",
    imageUrl: '/products/6001007002087.svg',
    category: "Bakery & Fresh Produce",
    weight: "700 g",
    basePrice: 15.49,
    promoPrice: 12.99,
    emoji: '🍞',
    isHouseBrand: true,
    searchKeywords: ["mister bread", "bread", "brown", "sliced", "shoprite", "bakery", "budget"]
  }],
  ['6009510805536', {
    gtin: '6009510805536',
    retailerId: 'shoprite',
    title: "Class 1 Crisp Red Gala Sweet Apples 1.5kg Bag",
    brand: "Fresh Produce",
    imageUrl: '/products/6009510805536.jpg',
    category: "Bakery & Fresh Produce",
    weight: "1.5 kg",
    basePrice: 33.5,
    promoPrice: 27.99,
    emoji: '🍎',
    isHouseBrand: false,
    searchKeywords: ["apples", "gala", "red", "fruit", "fresh produce", "sweet", "crisp"]
  }],
  ['6001571002022', {
    gtin: '6001571002022',
    retailerId: 'shoprite',
    title: "Ripe & Ready Creamy Hass Avocados 4pk",
    brand: "Fresh Produce",
    imageUrl: '/products/6001571002022.jpg',
    category: "Bakery & Fresh Produce",
    weight: "4 pk",
    basePrice: 49.99,
    promoPrice: 39.99,
    emoji: '🥑',
    isHouseBrand: false,
    searchKeywords: ["avocado", "avo", "hass", "fresh produce", "fruit", "ripe"]
  }],
  ['6001007002124', {
    gtin: '6001007002124',
    retailerId: 'shoprite',
    title: "Shoprite Farm Fresh Washed Potatoes 2kg Bag",
    brand: "Shoprite Fresh",
    imageUrl: '/products/6001007002124.svg',
    category: "Bakery & Fresh Produce",
    weight: "2 kg",
    basePrice: 29.99,
    promoPrice: 24.99,
    emoji: '🥔',
    isHouseBrand: true,
    searchKeywords: ["potatoes", "washed", "farm fresh", "vegetables", "produce", "shoprite"]
  }],
  ['6001007002131', {
    gtin: '6001007002131',
    retailerId: 'shoprite',
    title: "Shoprite Fresh Class 1 Brown Onions 2kg Bag",
    brand: "Shoprite Fresh",
    imageUrl: '/products/6001007002131.svg',
    category: "Bakery & Fresh Produce",
    weight: "2 kg",
    basePrice: 27.99,
    promoPrice: 21.99,
    emoji: '🧅',
    isHouseBrand: true,
    searchKeywords: ["onions", "brown onions", "vegetables", "produce", "shoprite", "cooking"]
  }],
  ['6001299000270', {
    gtin: '6001299000270',
    retailerId: 'shoprite',
    title: "Clover Full Cream Fresh Milk 2L",
    brand: "Clover",
    imageUrl: '/products/6001299000270.jpg',
    category: "Dairy, Eggs & Fridge",
    weight: "2 L",
    basePrice: 39.99,
    promoPrice: 33.99,
    emoji: '🥛',
    isHouseBrand: false,
    searchKeywords: ["clover", "milk", "fresh", "full cream", "dairy", "2l"]
  }],
  ['6001299000287', {
    gtin: '6001299000287',
    retailerId: 'shoprite',
    title: "Clover 2% Low Fat Fresh Milk 2L",
    brand: "Clover",
    imageUrl: '/products/6001299000287.jpg',
    category: "Dairy, Eggs & Fridge",
    weight: "2 L",
    basePrice: 39.99,
    promoPrice: 33.99,
    emoji: '🥛',
    isHouseBrand: false,
    searchKeywords: ["clover", "milk", "low fat", "fresh", "dairy", "2l"]
  }],
  ['6001007002001', {
    gtin: '6001007002001',
    retailerId: 'shoprite',
    title: "Ritebrand Long Life Full Cream Milk 6 x 1L",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002001.svg',
    category: "Dairy, Eggs & Fridge",
    weight: "6 x 1 L",
    basePrice: 99.99,
    promoPrice: 84.99,
    emoji: '🥛',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "uht", "long life", "milk", "full cream", "dairy", "shoprite", "case"]
  }],
  ['6001007002063', {
    gtin: '6001007002063',
    retailerId: 'shoprite',
    title: "Ritebrand Large Fresh Eggs 18 Pack",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002063.svg',
    category: "Dairy, Eggs & Fridge",
    weight: "18 pack",
    basePrice: 54.99,
    promoPrice: 46.99,
    emoji: '🥚',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "eggs", "large", "fresh eggs", "breakfast", "shoprite", "dairy"]
  }],
  ['6001087009874', {
    gtin: '6001087009874',
    retailerId: 'shoprite',
    title: "Rama Original 70% Fat Spread 500g Tub",
    brand: "Rama",
    imageUrl: '/products/6001087009874.jpg',
    category: "Dairy, Eggs & Fridge",
    weight: "500 g",
    basePrice: 26.99,
    promoPrice: 21.99,
    emoji: '🧈',
    isHouseBrand: false,
    searchKeywords: ["rama", "margarine", "butter", "spread", "dairy", "fat spread"]
  }],
  ['6009510806120', {
    gtin: '6009510806120',
    retailerId: 'shoprite',
    title: "First Choice Long Life Full Cream UHT Milk 1L",
    brand: "First Choice",
    imageUrl: '/products/6009510806120.jpg',
    category: "Dairy, Eggs & Fridge",
    weight: "1 L",
    basePrice: 23.99,
    promoPrice: 18.99,
    emoji: '🥛',
    isHouseBrand: false,
    searchKeywords: ["first choice", "uht", "long life", "milk", "full cream", "dairy", "1l"]
  }],
  ['6001007002343', {
    gtin: '6001007002343',
    retailerId: 'shoprite',
    title: "White Star Super Maize Meal 2.5kg",
    brand: "White Star",
    imageUrl: '/products/6001007002343.jpg',
    category: "Pantry Staples & Grains",
    weight: "2.5 kg",
    basePrice: 37.99,
    promoPrice: 31.99,
    emoji: '🌽',
    isHouseBrand: false,
    searchKeywords: ["white star", "maize", "meal", "pap", "super maize", "grains", "2.5kg"]
  }],
  ['6001007000127', {
    gtin: '6001007000127',
    retailerId: 'shoprite',
    title: "Tastic Long Grain Parboiled Rice 2kg",
    brand: "Tastic",
    imageUrl: '/products/6001007000127.jpg',
    category: "Pantry Staples & Grains",
    weight: "2 kg",
    basePrice: 44.99,
    promoPrice: 37.99,
    emoji: '🍚',
    isHouseBrand: false,
    searchKeywords: ["tastic", "rice", "long grain", "parboiled", "pantry", "grains", "2kg"]
  }],
  ['6001007002018', {
    gtin: '6001007002018',
    retailerId: 'shoprite',
    title: "Ritebrand Pure Sunflower Cooking Oil 2L",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002018.svg',
    category: "Pantry Staples & Grains",
    weight: "2 L",
    basePrice: 64.99,
    promoPrice: 56.99,
    emoji: '🛢️',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "oil", "sunflower oil", "cooking oil", "pantry", "shoprite", "2l"]
  }],
  ['6001007002025', {
    gtin: '6001007002025',
    retailerId: 'shoprite',
    title: "Ritebrand Parboiled Rice 2kg",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002025.svg',
    category: "Pantry Staples & Grains",
    weight: "2 kg",
    basePrice: 36.99,
    promoPrice: 29.99,
    emoji: '🍚',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "rice", "parboiled", "pantry", "shoprite", "grains", "2kg"]
  }],
  ['6001007002032', {
    gtin: '6001007002032',
    retailerId: 'shoprite',
    title: "Ritebrand White Sugar 2.5kg",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002032.svg',
    category: "Pantry Staples & Grains",
    weight: "2.5 kg",
    basePrice: 49.99,
    promoPrice: 43.99,
    emoji: '🍬',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "sugar", "white sugar", "baking", "sweetener", "shoprite"]
  }],
  ['6001007000899', {
    gtin: '6001007000899',
    retailerId: 'shoprite',
    title: "Koo Baked Beans in Tomato Sauce 410g",
    brand: "Koo",
    imageUrl: '/products/6001007000899.jpg',
    category: "Pantry Staples & Grains",
    weight: "410 g",
    basePrice: 18.49,
    promoPrice: 14.99,
    emoji: '🥫',
    isHouseBrand: false,
    searchKeywords: ["koo", "baked beans", "beans", "tomato sauce", "tin", "canned", "pantry"]
  }],
  ['6001007002056', {
    gtin: '6001007002056',
    retailerId: 'shoprite',
    title: "Ritebrand Baked Beans in Tomato Sauce 410g",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002056.svg',
    category: "Pantry Staples & Grains",
    weight: "410 g",
    basePrice: 12.99,
    promoPrice: 10.99,
    emoji: '🥫',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "baked beans", "beans", "canned", "pantry", "shoprite", "budget"]
  }],
  ['6001007002094', {
    gtin: '6001007002094',
    retailerId: 'shoprite',
    title: "Pot O' Gold Choice Grade Whole Kernel Sweetcorn 410g",
    brand: "Pot O' Gold",
    imageUrl: '/products/6001007002094.svg',
    category: "Pantry Staples & Grains",
    weight: "410 g",
    basePrice: 18.99,
    promoPrice: 14.99,
    emoji: '🌽',
    isHouseBrand: true,
    searchKeywords: ["pot o gold", "sweetcorn", "corn", "canned", "vegetables", "shoprite"]
  }],
  ['6001053000027', {
    gtin: '6001053000027',
    retailerId: 'shoprite',
    title: "Lucky Star Pilchards in Tomato Sauce 400g",
    brand: "Lucky Star",
    imageUrl: '/products/6001053000027.jpg',
    category: "Pantry Staples & Grains",
    weight: "400 g",
    basePrice: 28.99,
    promoPrice: 23.99,
    emoji: '🐟',
    isHouseBrand: false,
    searchKeywords: ["lucky star", "pilchards", "fish", "tomato sauce", "tin", "canned", "pantry"]
  }],
  ['6001053001208', {
    gtin: '6001053001208',
    retailerId: 'shoprite',
    title: "Lucky Star Shredded Tuna in Oil 170g",
    brand: "Lucky Star",
    imageUrl: '/products/6001053001208.jpg',
    category: "Pantry Staples & Grains",
    weight: "170 g",
    basePrice: 29.99,
    promoPrice: 24.99,
    emoji: '🐟',
    isHouseBrand: false,
    searchKeywords: ["lucky star", "tuna", "shredded", "fish", "canned", "pantry"]
  }],
  ['6001007005436', {
    gtin: '6001007005436',
    retailerId: 'shoprite',
    title: "All Gold Tomato Sauce 700ml Bottle",
    brand: "All Gold",
    imageUrl: '/products/6001007005436.jpg',
    category: "Pantry Staples & Grains",
    weight: "700 ml",
    basePrice: 41.99,
    promoPrice: 34.99,
    emoji: '🍅',
    isHouseBrand: false,
    searchKeywords: ["all gold", "tomato", "sauce", "ketchup", "pantry", "bottle"]
  }],
  ['6001007004323', {
    gtin: '6001007004323',
    retailerId: 'shoprite',
    title: "Black Cat Crunchy Peanut Butter 400g Jar",
    brand: "Black Cat",
    imageUrl: '/products/6001007004323.jpg',
    category: "Pantry Staples & Grains",
    weight: "400 g",
    basePrice: 45.99,
    promoPrice: 38.99,
    emoji: '🥜',
    isHouseBrand: false,
    searchKeywords: ["black cat", "peanut butter", "crunchy", "spread", "pantry"]
  }],
  ['6001007003210', {
    gtin: '6001007003210',
    retailerId: 'shoprite',
    title: "Golden Cloud Cake Wheat Flour 2.5kg Bag",
    brand: "Golden Cloud",
    imageUrl: '/products/6001007003210.jpg',
    category: "Pantry Staples & Grains",
    weight: "2.5 kg",
    basePrice: 42.99,
    promoPrice: 36.99,
    emoji: '🌾',
    isHouseBrand: false,
    searchKeywords: ["golden cloud", "flour", "cake flour", "wheat", "baking", "pantry"]
  }],
  ['6001008000140', {
    gtin: '6001008000140',
    retailerId: 'shoprite',
    title: "Goldi Frozen Mixed Chicken Portions 2kg Bag",
    brand: "Goldi",
    imageUrl: '/products/6001008000140.jpg',
    category: "Pantry Staples & Grains",
    weight: "2 kg",
    basePrice: 99.99,
    promoPrice: 84.99,
    emoji: '🍗',
    isHouseBrand: false,
    searchKeywords: ["goldi", "chicken", "frozen", "poultry", "meat", "portions", "2kg"]
  }],
  ['6001007000301', {
    gtin: '6001007000301',
    retailerId: 'shoprite',
    title: "Fatti's & Moni's Macaroni Pasta 500g",
    brand: "Fatti's & Moni's",
    imageUrl: '/products/6001007000301.jpg',
    category: "Pantry Staples & Grains",
    weight: "500 g",
    basePrice: 21.99,
    promoPrice: 16.99,
    emoji: '🍝',
    isHouseBrand: false,
    searchKeywords: ["fattis", "monis", "macaroni", "pasta", "pantry", "dinner"]
  }],
  ['6001007006211', {
    gtin: '6001007006211',
    retailerId: 'shoprite',
    title: "Jungle Oats The Energy Champion 1kg Box",
    brand: "Jungle Oats",
    imageUrl: '/products/6001007006211.jpg',
    category: "Pantry Staples & Grains",
    weight: "1 kg",
    basePrice: 45.99,
    promoPrice: 37.99,
    emoji: '🥣',
    isHouseBrand: false,
    searchKeywords: ["jungle oats", "oats", "porridge", "breakfast", "energy", "grains"]
  }],
  ['6001007007553', {
    gtin: '6001007007553',
    retailerId: 'shoprite',
    title: "Crosse & Blackwell Tangy Mayonnaise 750g Bottle",
    brand: "Crosse & Blackwell",
    imageUrl: '/products/6001007007553.jpg',
    category: "Pantry Staples & Grains",
    weight: "750 g",
    basePrice: 46.99,
    promoPrice: 39.99,
    emoji: '🥗',
    isHouseBrand: false,
    searchKeywords: ["crosse blackwell", "mayo", "mayonnaise", "tangy", "condiment", "pantry"]
  }],
  ['6001068594504', {
    gtin: '6001068594504',
    retailerId: 'shoprite',
    title: "Simba Smoked Beef Flavoured Potato Chips 120g",
    brand: "Simba",
    imageUrl: '/products/6001068594504.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "120 g",
    basePrice: 22.49,
    promoPrice: 18.99,
    emoji: '🥔',
    isHouseBrand: false,
    searchKeywords: ["simba", "chips", "crisps", "smoked beef", "snacks", "potato", "treats"]
  }],
  ['6001068001002', {
    gtin: '6001068001002',
    retailerId: 'shoprite',
    title: "Nescaf\u00e9 Ricoffy Instant Coffee 750g Tin",
    brand: "Ricoffy",
    imageUrl: '/products/6001068001002.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "750 g",
    basePrice: 69.99,
    promoPrice: 57.99,
    emoji: '☕',
    isHouseBrand: false,
    searchKeywords: ["nescafe", "ricoffy", "coffee", "instant", "hot beverages", "tin", "warm"]
  }],
  ['6001007008871', {
    gtin: '6001007008871',
    retailerId: 'shoprite',
    title: "Bakers Blue Label Marie Biscuits 200g",
    brand: "Bakers",
    imageUrl: '/products/6001007008871.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "200 g",
    basePrice: 19.99,
    promoPrice: 15.99,
    emoji: '🍪',
    isHouseBrand: false,
    searchKeywords: ["bakers", "marie", "biscuits", "blue label", "tea biscuits", "snacks"]
  }],
  ['5449000000996', {
    gtin: '5449000000996',
    retailerId: 'shoprite',
    title: "Coca-Cola Original Taste Less Sugar 2L Bottle",
    brand: "Coca-Cola",
    imageUrl: '/products/5449000000996.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "2 L",
    basePrice: 29.99,
    promoPrice: 24.99,
    emoji: '🥤',
    isHouseBrand: false,
    searchKeywords: ["coca cola", "coke", "soft drink", "soda", "beverages", "2l"]
  }],
  ['6001056000109', {
    gtin: '6001056000109',
    retailerId: 'shoprite',
    title: "Five Roses Ceylon Blend Tagged Teabags 102s",
    brand: "Five Roses",
    imageUrl: '/products/6001056000109.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "102 bags",
    basePrice: 59.99,
    promoPrice: 49.99,
    emoji: '🫖',
    isHouseBrand: false,
    searchKeywords: ["five roses", "tea", "ceylon", "teabags", "hot beverages", "warm"]
  }],
  ['6001007001407', {
    gtin: '6001007001407',
    retailerId: 'shoprite',
    title: "Bakers Choice Assorted Biscuits 200g",
    brand: "Bakers",
    imageUrl: '/products/6001007001407.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "200 g",
    basePrice: 36.99,
    promoPrice: 29.99,
    emoji: '🍪',
    isHouseBrand: false,
    searchKeywords: ["bakers", "choice assorted", "biscuits", "cookies", "snacks", "treats"]
  }],
  ['6001299001444', {
    gtin: '6001299001444',
    retailerId: 'shoprite',
    title: "Clover Tropika Orange Flavoured Dairy Fruit Mix 2L",
    brand: "Tropika",
    imageUrl: '/products/6001299001444.jpg',
    category: "Drinks, Coffee & Snacks",
    weight: "2 L",
    basePrice: 38.99,
    promoPrice: 31.99,
    emoji: '🍹',
    isHouseBrand: false,
    searchKeywords: ["tropika", "clover", "orange", "fruit mix", "dairy juice", "beverages", "2l"]
  }],
  ['6001007002100', {
    gtin: '6001007002100',
    retailerId: 'shoprite',
    title: "Ritebrand Rooibos Tagless Teabags 80s",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002100.svg',
    category: "Drinks, Coffee & Snacks",
    weight: "80 bags",
    basePrice: 29.99,
    promoPrice: 23.99,
    emoji: '🫖',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "rooibos", "tea", "tagless", "shoprite", "beverages"]
  }],
  ['6001007002117', {
    gtin: '6001007002117',
    retailerId: 'shoprite',
    title: "Ritebrand 100% Apple Fruit Juice Blend 1L",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002117.svg',
    category: "Drinks, Coffee & Snacks",
    weight: "1 L",
    basePrice: 19.99,
    promoPrice: 15.99,
    emoji: '🧃',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "juice", "apple juice", "fruit juice", "shoprite", "drinks"]
  }],
  ['6001087002134', {
    gtin: '6001087002134',
    retailerId: 'shoprite',
    title: "Sunlight Regular Dishwashing Liquid 750ml",
    brand: "Sunlight",
    imageUrl: '/products/6001087002134.jpg',
    category: "Household & Personal Care",
    weight: "750 ml",
    basePrice: 36.99,
    promoPrice: 28.99,
    emoji: '🧴',
    isHouseBrand: false,
    searchKeywords: ["sunlight", "dishwashing", "liquid", "clean", "household", "green", "dishes"]
  }],
  ['6001087006781', {
    gtin: '6001087006781',
    retailerId: 'shoprite',
    title: "Omo Auto Concentrated Washing Powder 2kg",
    brand: "Omo",
    imageUrl: '/products/6001087006781.jpg',
    category: "Household & Personal Care",
    weight: "2 kg",
    basePrice: 92.99,
    promoPrice: 76.99,
    emoji: '🧺',
    isHouseBrand: false,
    searchKeywords: ["omo", "washing powder", "auto", "laundry", "clean", "household", "detergent"]
  }],
  ['6001087004565', {
    gtin: '6001087004565',
    retailerId: 'shoprite',
    title: "Dettol Hygiene Soap Original 175g",
    brand: "Dettol",
    imageUrl: '/products/6001087004565.jpg',
    category: "Household & Personal Care",
    weight: "175 g",
    basePrice: 18.99,
    promoPrice: 13.99,
    emoji: '🧼',
    isHouseBrand: false,
    searchKeywords: ["dettol", "soap", "hygiene", "original", "bath", "personal care", "wash"]
  }],
  ['6001087007788', {
    gtin: '6001087007788',
    retailerId: 'shoprite',
    title: "Colgate Triple Action Fluoride Toothpaste 100ml",
    brand: "Colgate",
    imageUrl: '/products/6001087007788.jpg',
    category: "Household & Personal Care",
    weight: "100 ml",
    basePrice: 22.99,
    promoPrice: 17.99,
    emoji: '🪥',
    isHouseBrand: false,
    searchKeywords: ["colgate", "toothpaste", "triple action", "dental", "personal care", "hygiene"]
  }],
  ['6001087005111', {
    gtin: '6001087005111',
    retailerId: 'shoprite',
    title: "Domestos Thick Bleach Original 750ml",
    brand: "Domestos",
    imageUrl: '/products/6001087005111.jpg',
    category: "Household & Personal Care",
    weight: "750 ml",
    basePrice: 39.99,
    promoPrice: 32.99,
    emoji: '🧴',
    isHouseBrand: false,
    searchKeywords: ["domestos", "bleach", "thick", "cleaning", "household", "disinfectant"]
  }],
  ['6001087003346', {
    gtin: '6001087003346',
    retailerId: 'shoprite',
    title: "Handy Andy Multi-Purpose Cleaner Ammonia 750ml",
    brand: "Handy Andy",
    imageUrl: '/products/6001087003346.jpg',
    category: "Household & Personal Care",
    weight: "750 ml",
    basePrice: 37.99,
    promoPrice: 29.99,
    emoji: '✨',
    isHouseBrand: false,
    searchKeywords: ["handy andy", "cleaner", "ammonia", "surface", "household", "shine"]
  }],
  ['6001087008129', {
    gtin: '6001087008129',
    retailerId: 'shoprite',
    title: "Shield MotionSense Antiperspirant Roll-On 50ml",
    brand: "Shield",
    imageUrl: '/products/6001087008129.jpg',
    category: "Household & Personal Care",
    weight: "50 ml",
    basePrice: 32.99,
    promoPrice: 26.99,
    emoji: '⚡',
    isHouseBrand: false,
    searchKeywords: ["shield", "roll on", "deodorant", "motionsense", "personal care", "fresh"]
  }],
  ['6001007002049', {
    gtin: '6001007002049',
    retailerId: 'shoprite',
    title: "Ritebrand Thick Bleach Regular 750ml",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002049.svg',
    category: "Household & Personal Care",
    weight: "750 ml",
    basePrice: 24.99,
    promoPrice: 18.99,
    emoji: '🧴',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "bleach", "thick bleach", "cleaning", "household", "shoprite"]
  }],
  ['6001007002148', {
    gtin: '6001007002148',
    retailerId: 'shoprite',
    title: "Ritebrand Toilet Paper 2-Ply 9 Rolls",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002148.svg',
    category: "Household & Personal Care",
    weight: "9 rolls",
    basePrice: 59.99,
    promoPrice: 49.99,
    emoji: '🧻',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "toilet paper", "2 ply", "bathroom", "household", "shoprite"]
  }],
  ['6001007002155', {
    gtin: '6001007002155',
    retailerId: 'shoprite',
    title: "Ritebrand Washing Powder All-in-One 2kg",
    brand: "Ritebrand",
    imageUrl: '/products/6001007002155.svg',
    category: "Household & Personal Care",
    weight: "2 kg",
    basePrice: 49.99,
    promoPrice: 39.99,
    emoji: '🧺',
    isHouseBrand: true,
    searchKeywords: ["ritebrand", "washing powder", "laundry", "clean", "household", "shoprite"]
  }]
]);

// Initialize active in-memory products from master catalog
const PRODUCTS = new Map(MASTER_PRODUCTS);

// South African Pricing Zones:
// - In regular towns, promotions & pricing apply uniformly across all branches of the same retailer in that town.
// - In big metropolitan cities, promotions & pricing apply across a specific city area / section rather than an individual store branch.
const PRICING_ZONES = [
  // Towns (town-wide sales & pricing across all branches of each retailer)
  { id: 'polokwane', kind: 'town', name: 'Polokwane', province: 'Limpopo', scopeLabel: 'Town-wide pricing', anchorHub: 'Polokwane Town Retailers', lat: -23.9045, lon: 29.4689, zoneMult: 0.99 },
  { id: 'mbombela', kind: 'town', name: 'Mbombela (Nelspruit)', province: 'Mpumalanga', scopeLabel: 'Town-wide pricing', anchorHub: 'Mbombela Town Retailers', lat: -25.4753, lon: 30.9694, zoneMult: 1.0 },
  { id: 'pietermaritzburg', kind: 'town', name: 'Pietermaritzburg', province: 'KwaZulu-Natal', scopeLabel: 'Town-wide pricing', anchorHub: 'Pietermaritzburg Town Retailers', lat: -29.6006, lon: 30.3794, zoneMult: 0.99 },
  { id: 'bloemfontein', kind: 'town', name: 'Bloemfontein', province: 'Free State', scopeLabel: 'Town-wide pricing', anchorHub: 'Bloemfontein Town Retailers', lat: -29.0852, lon: 26.1596, zoneMult: 0.99 },
  { id: 'stellenbosch', kind: 'town', name: 'Stellenbosch', province: 'Western Cape', scopeLabel: 'Town-wide pricing', anchorHub: 'Stellenbosch Town Retailers', lat: -33.9321, lon: 18.8602, zoneMult: 1.01 },
  { id: 'richards_bay', kind: 'town', name: 'Richards Bay', province: 'KwaZulu-Natal', scopeLabel: 'Town-wide pricing', anchorHub: 'Richards Bay Town Retailers', lat: -28.7807, lon: 32.0383, zoneMult: 1.0 },
  { id: 'rustenburg', kind: 'town', name: 'Rustenburg', province: 'North West', scopeLabel: 'Town-wide pricing', anchorHub: 'Rustenburg Town Retailers', lat: -25.6676, lon: 27.2421, zoneMult: 0.99 },
  { id: 'george', kind: 'town', name: 'George', province: 'Western Cape', scopeLabel: 'Town-wide pricing', anchorHub: 'George Town Retailers', lat: -33.9630, lon: 22.4617, zoneMult: 1.0 },

  // Big City Sections / Areas (metro section pricing where sales apply by city area)
  { id: 'jhb_north', kind: 'metro', city: 'Johannesburg', section: 'Sandton, Rosebank & North', name: 'Johannesburg · Sandton & North', province: 'Gauteng', scopeLabel: 'City-area pricing', anchorHub: 'Sandton / Rosebank Area', lat: -26.1076, lon: 28.0567, zoneMult: 1.02 },
  { id: 'jhb_south_soweto', kind: 'metro', city: 'Johannesburg', section: 'Soweto, Southgate & CBD', name: 'Johannesburg · Soweto & South', province: 'Gauteng', scopeLabel: 'City-area pricing', anchorHub: 'Soweto / Southgate Area', lat: -26.2485, lon: 27.8540, zoneMult: 0.98 },
  { id: 'pta_east_central', kind: 'metro', city: 'Pretoria', section: 'Hatfield, Menlyn & Centurion', name: 'Pretoria · Hatfield & East', province: 'Gauteng', scopeLabel: 'City-area pricing', anchorHub: 'Hatfield / Menlyn Area', lat: -25.7479, lon: 28.2293, zoneMult: 1.01 },
  { id: 'dbn_central', kind: 'metro', city: 'Durban', section: 'Central, Berea & Harbour', name: 'Durban · Central & Berea', province: 'KwaZulu-Natal', scopeLabel: 'City-area pricing', anchorHub: 'Durban Central / Berea Area', lat: -29.8587, lon: 31.0218, zoneMult: 0.99 },
  { id: 'dbn_north_umhlanga', kind: 'metro', city: 'Durban', section: 'Umhlanga, Gateway & Phoenix', name: 'Durban · Umhlanga & North', province: 'KwaZulu-Natal', scopeLabel: 'City-area pricing', anchorHub: 'Umhlanga / North Coast Area', lat: -29.7257, lon: 31.0664, zoneMult: 1.01 },
  { id: 'cpt_central', kind: 'metro', city: 'Cape Town', section: 'City Bowl, Sea Point & Woodstock', name: 'Cape Town · City Bowl & Atlantic', province: 'Western Cape', scopeLabel: 'City-area pricing', anchorHub: 'City Bowl / Gardens Area', lat: -33.9249, lon: 18.4241, zoneMult: 1.02 },
  { id: 'cpt_north_flats', kind: 'metro', city: 'Cape Town', section: 'Bellville, Parow & Cape Flats', name: 'Cape Town · Bellville & Cape Flats', province: 'Western Cape', scopeLabel: 'City-area pricing', anchorHub: 'Bellville / Mitchells Plain Area', lat: -33.9000, lon: 18.6290, zoneMult: 0.98 }
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

function getActiveZone() {
  return PRICING_ZONES.find(z => z.id === state.pricingZoneId) || PRICING_ZONES[0];
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
  if (unit === 'kg') {
    return `${zar.format(price / val)} / kg`;
  } else if (unit === 'g') {
    return `${zar.format(price / (val / 1000))} / kg`;
  } else if (unit === 'l' || unit === 'litre' || unit === 'litres') {
    return `${zar.format(price / val)} / L`;
  } else if (unit === 'ml') {
    return `${zar.format(price / (val / 1000))} / L`;
  }
  return null;
}

function getZonePrice(zoneId, retailerId, gtin) {
  const safeZoneId = zoneId || 'polokwane';
  const safeRetId = retailerId || 'shoprite';
  const compositeKey = `${safeZoneId}_${safeRetId}_${gtin}`;
  if (STORE_PRICES.has(compositeKey)) {
    return STORE_PRICES.get(compositeKey);
  }
  const master = MASTER_PRODUCTS.get(gtin);
  if (!master) return { regularPrice: 19.99, promoPrice: 16.99, inStock: true };

  const zone = PRICING_ZONES.find(z => z.id === safeZoneId) || PRICING_ZONES[0];
  const factors = STORE_PRICE_FACTORS[safeRetId] || { regMult: 1.0, promoMult: 1.0 };
  const zMult = zone.zoneMult || 1.0;

  // Calculate authentic rounded South African retail prices (.99 or .49)
  const calcReg = Math.round((master.basePrice * factors.regMult * zMult) * 2) / 2 - 0.01;
  const calcPromo = master.promoPrice ? (Math.round((master.promoPrice * factors.promoMult * zMult) * 2) / 2 - 0.01) : null;

  const priceObj = {
    zoneId: safeZoneId,
    retailerId: safeRetId,
    gtin,
    regularPrice: Math.max(1.99, calcReg),
    promoPrice: calcPromo ? Math.max(1.49, calcPromo) : null,
    inStock: true,
    lastUpdatedAt: Date.now()
  };
  STORE_PRICES.set(compositeKey, priceObj);
  return priceObj;
}

function getRetailerProducts(retailerId) {
  return Array.from(MASTER_PRODUCTS.values()).filter(p => {
    // Ritebrand, Mister Bread, Pot O' Gold are Shoprite exclusive house brands
    if (retailerId !== 'shoprite' && p.isHouseBrand) {
      return false;
    }
    if (retailerId === 'woolworths' && ['Goldi', 'First Choice'].includes(p.brand)) {
      return false;
    }
    return true;
  });
}

const CATEGORIES = [
  { id: 'Bakery & Fresh Produce', label: 'Bakery & Fresh', emoji: '🥖' },
  { id: 'Dairy, Eggs & Fridge', label: 'Dairy & Fridge', emoji: '🥛' },
  { id: 'Pantry Staples & Grains', label: 'Pantry Staples', emoji: '🥫' },
  { id: 'Drinks, Coffee & Snacks', label: 'Drinks & Snacks', emoji: '🥤' },
  { id: 'Household & Personal Care', label: 'Household & Care', emoji: '🧼' }
];

const COUPONS = [
  { id: 'basket10', label: 'R10 Basket Boost', detail: 'R10 off when your basket reaches R100', tone: 'from-slate-800 to-slate-950' },
  { id: 'fresh5', label: 'Fresh Five', detail: '5% off all fruit and vegetables', tone: 'from-[#234e3b] to-[#1a3a2c]' }
];

const state = {
  route: getRouteFromHash(),
  pricingZoneId: 'polokwane',
  gpsStatus: 'idle',
  detectedDistanceKm: null,
  retailerId: 'shoprite',
  globalSearchOpen: false,
  globalSearchQuery: '',
  selectedCatalogBarcode: '6001007001001',
  catalogSearch: '',
  catalogCategory: 'all',
  catalogViewMode: 'grid',
  houseBrandOnly: false,
  catalogSort: 'default',
  cart: [],
  displayedCartTotal: 0,
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

async function fetchProductFromFirestore(barcode) {
  await Promise.resolve();
  const product = PRODUCTS.get(String(barcode));
  return product ? { barcode: String(barcode), ...product } : null;
}

function getRouteFromHash() {
  const candidate = location.hash.slice(1);
  if (candidate === 'list') return 'trolley';
  return ROUTES.includes(candidate) ? candidate : 'market';
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
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function getRetailer() {
  return state.retailerId ? RETAILERS[state.retailerId] : RETAILERS.shoprite;
}

function getItemPricingForRetailer(item, retailerId = state.retailerId) {
  const gtin = item.barcode || item.gtin;
  if (gtin && MASTER_PRODUCTS.has(gtin)) {
    const zp = getZonePrice(state.pricingZoneId, retailerId, gtin);
    const hasPromo = Boolean(zp.promoPrice && zp.promoPrice < zp.regularPrice);
    const activePrice = hasPromo ? zp.promoPrice : zp.regularPrice;
    return { activePrice, regularPrice: zp.regularPrice, hasPromo };
  }
  const factor = (STORE_PRICE_FACTORS[retailerId]?.regMult) || 1.0;
  const baseUnit = item.rawPrice || item.price || 19.99;
  const activePrice = Math.max(1.49, Math.round((baseUnit * factor) * 2) / 2 - 0.01);
  const regularPrice = Math.max(activePrice, Math.round((activePrice * 1.12) * 2) / 2 - 0.01);
  return { activePrice, regularPrice, hasPromo: regularPrice > activePrice };
}

// Unified Trolley re-priced dynamically for whichever retailer is selected
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
    total += getRetailerCart(retailerId).filter((item) => item.category === 'Bakery & Fresh Produce' || item.category === 'Vegetables & Fruit').reduce((sum, item) => sum + item.price * item.quantity * 0.05, 0);
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
  const barcode = String(product.barcode || product.gtin);
  const normalizedName = product.name || product.title || 'Grocery Item';
  const normalizedImage = product.image || product.imageUrl || '';
  const { activePrice, regularPrice } = getItemPricingForRetailer({ ...product, barcode }, targetRetailer);

  const existing = state.cart.find((item) => item.barcode === barcode);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      ...product,
      barcode,
      name: normalizedName,
      image: normalizedImage,
      rawPrice: product.price || product.promoPrice || product.basePrice || activePrice,
      price: activePrice,
      basePrice: regularPrice,
      checkedInStore: false,
      quantity: 1,
      retailerId: targetRetailer
    });
  }
  updateCartBadge();
  if (!options.silent) {
    triggerFloatingTrolleyNotice({ ...product, name: normalizedName, image: normalizedImage }, targetRetailer, 1);
  }
}

function removeCartItem(barcode) {
  state.cart = state.cart.filter((item) => item.barcode !== String(barcode));
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
  const q = (state.globalSearchQuery || '').trim().toLowerCase();
  const matches = q
    ? Array.from(MASTER_PRODUCTS.values()).filter((p) => {
        const kw = p.searchKeywords && p.searchKeywords.some((k) => k.toLowerCase().includes(q));
        return kw || p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.gtin.includes(q);
      }).slice(0, 8)
    : Array.from(MASTER_PRODUCTS.values()).slice(0, 5);

  globalSearchDrawer.innerHTML = `
    <div class="rounded-2xl border border-stone-200 bg-white p-2.5 shadow-lg">
      <div class="relative flex items-center gap-2">
        <span class="pl-2 text-sm text-slate-400">🔍</span>
        <input
          id="global-header-search-input"
          type="text"
          value="${escapeHtml(state.globalSearchQuery)}"
          placeholder="Search products across Market & Trolley (e.g. Milk, Bread, Rice, 600...)..."
          class="h-9 flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none"
        />
        ${state.globalSearchQuery ? `<button id="clear-global-search" type="button" class="rounded-lg px-2 py-1 text-[10px] font-black text-slate-400 hover:text-slate-700">Clear</button>` : ''}
        <button id="close-global-search" type="button" class="rounded-xl bg-stone-100 px-2.5 py-1 text-[10px] font-black text-slate-600 hover:bg-stone-200">Done</button>
      </div>

      <div class="mt-2 max-h-64 space-y-1.5 overflow-y-auto border-t border-stone-100 pt-2">
        <p class="px-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400">${q ? `Matching Products (${matches.length})` : 'Quick Add Popular Staples'}</p>
        ${matches.length ? matches.map((p) => {
          const zp = getZonePrice(state.pricingZoneId, state.retailerId, p.gtin);
          const price = (zp.promoPrice && zp.promoPrice < zp.regularPrice) ? zp.promoPrice : zp.regularPrice;
          const inCart = state.cart.find((c) => c.barcode === p.gtin);
          return `
            <div class="flex items-center justify-between gap-2.5 rounded-xl bg-stone-50/80 p-2 hover:bg-stone-100/80 transition">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="size-9 shrink-0 rounded-lg bg-white border border-stone-200/70 p-0.5 flex items-center justify-center overflow-hidden">
                  <img src="${p.imageUrl}" alt="" class="max-h-full max-w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-base\\'>${p.emoji || '🛍️'}</span>';" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-black text-slate-900">${escapeHtml(p.title)}</p>
                  <p class="text-[10px] font-semibold text-slate-500">${p.weight} &middot; <strong class="text-slate-800">${zar.format(price)}</strong></p>
                </div>
              </div>
              <button type="button" data-global-search-add="${p.gtin}" class="shrink-0 rounded-xl bg-[#234e3b] px-3 py-1.5 text-[10px] font-black text-white shadow-2xs hover:bg-[#1b3d2e] active:scale-95 transition">
                ${inCart ? `🛒 ${inCart.quantity} (+1)` : '+ Trolley'}
              </button>
            </div>
          `;
        }).join('') : `
          <div class="flex items-center justify-between rounded-xl bg-stone-50 p-2.5 text-xs">
            <span class="text-slate-500">Add custom item "<strong>${escapeHtml(state.globalSearchQuery)}</strong>"?</span>
            <button id="global-add-custom-btn" type="button" class="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white">+ Add to Trolley</button>
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
      const prod = MASTER_PRODUCTS.get(gtin);
      if (!prod) return;
      addToCart({
        barcode: prod.gtin,
        name: prod.title,
        weight: prod.weight,
        category: prod.category,
        image: prod.imageUrl,
        emoji: prod.emoji
      }, state.retailerId);
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate(25);
      render();
      renderGlobalSearchDrawer(false);
    });
  });

  globalSearchDrawer.querySelector('#global-add-custom-btn')?.addEventListener('click', () => {
    const customName = state.globalSearchQuery.trim();
    if (!customName) return;
    addToCart({
      barcode: `600${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: customName,
      weight: '1 unit',
      category: 'Pantry Staples & Grains',
      price: 19.99,
      basePrice: 22.99,
      emoji: '🛍️'
    }, state.retailerId);
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
  } else if (state.route === 'market') {
    headerSubtitle.textContent = `Open Market · ${zone.kind === 'town' ? zone.name : zone.city}`;
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
// NATIVE MARKET CATALOG (ZERO WEBVIEWS, BASH-STYLE)
// ==========================================

const SA_STAPLE_BARGAINS = [
  { gtin: '6001007002343', name: 'White Star Super Maize 2.5kg', store: 'Boxer', price: 31.99, tag: 'Lowest Maize' },
  { gtin: '6001299000270', name: 'Clover Full Cream Milk 2L', store: 'Shoprite', price: 33.99, tag: 'Best Milk Deal' },
  { gtin: '6001007001001', name: 'Albany Superior White Bread 700g', store: 'Shoprite', price: 16.99, tag: 'Lowest Bread' },
  { gtin: '6001068594504', name: 'Simba Smoked Beef Chips 120g', store: 'Shoprite', price: 18.99, tag: 'Best Snacks' },
  { gtin: '6001087002134', name: 'Sunlight Liquid 750ml', store: 'Boxer', price: 28.99, tag: 'Top Cleaning' }
];


function renderProductCard(product, zone) {
  const priceData = getZonePrice(zone.id, state.retailerId, product.gtin);
  const hasPromo = priceData.promoPrice && priceData.promoPrice < priceData.regularPrice;
  const activePrice = hasPromo ? priceData.promoPrice : priceData.regularPrice;
  const savings = hasPromo ? (priceData.regularPrice - priceData.promoPrice) : 0;
  const unitPrice = formatUnitPrice(activePrice, product.weight);

  const inCartItem = state.cart.find((i) => i.barcode === product.gtin);
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  return `
    <div class="group relative flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-3 shadow-2xs transition-all duration-200 hover:border-stone-300 hover:shadow-sm">
      <div>
        <!-- Product Packshot Container with Direct 1-Tap Trolley Control -->
        <div class="relative w-full aspect-square overflow-hidden rounded-2xl bg-white border border-stone-100 p-2 pb-10 flex items-center justify-center">
          <img 
            src="${product.imageUrl}" 
            alt="${escapeHtml(product.title)}" 
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
                <button type="button" data-card-dec-trolley="${product.gtin}" class="grid size-6 place-items-center rounded-lg bg-white/15 text-xs font-black hover:bg-white/25 active:scale-90 transition">&minus;</button>
                <span class="text-[10px] font-black tabular-nums">🛒 ${inCartQty} in Trolley</span>
                <button type="button" data-card-add-trolley="${product.gtin}" class="grid size-6 place-items-center rounded-lg bg-white text-xs font-black text-[#234e3b] hover:bg-stone-100 active:scale-90 transition">+</button>
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
            <span class="shrink-0 rounded bg-stone-100 px-1.5 py-0.2 text-[8px] font-bold text-slate-500">${escapeHtml(product.category.split(' ')[0])}</span>
          </div>
          <h4 class="text-xs font-black text-slate-900 line-clamp-2 leading-snug mt-0.5">${escapeHtml(product.title)}</h4>
          <div class="flex items-center justify-between mt-0.5">
            <p class="text-[10px] text-slate-400 font-semibold">${product.weight || '1 unit'}</p>
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
  const searchQuery = (state.catalogSearch || '').toLowerCase().trim();
  const selectedCat = state.catalogCategory || 'all';
  const allProducts = Array.from(MASTER_PRODUCTS.values());

  let filteredProducts = allProducts.filter((product) => {
    const matchesCategory = selectedCat === 'all' || product.category === selectedCat;
    if (!matchesCategory) return false;
    if (!searchQuery) return true;

    const inKeywords = product.searchKeywords && product.searchKeywords.some(k => k.toLowerCase().includes(searchQuery));
    const inTitle = product.title.toLowerCase().includes(searchQuery);
    const inBrand = product.brand.toLowerCase().includes(searchQuery);
    const inGtin = product.gtin.includes(searchQuery);
    return inKeywords || inTitle || inBrand || inGtin;
  });

  if (state.catalogSort === 'price-asc') {
    filteredProducts.sort((a, b) => {
      const pA = getZonePrice(zone.id, state.retailerId, a.gtin);
      const pB = getZonePrice(zone.id, state.retailerId, b.gtin);
      return (pA.promoPrice || pA.regularPrice) - (pB.promoPrice || pB.regularPrice);
    });
  } else if (state.catalogSort === 'savings-desc') {
    filteredProducts.sort((a, b) => {
      const pA = getZonePrice(zone.id, state.retailerId, a.gtin);
      const pB = getZonePrice(zone.id, state.retailerId, b.gtin);
      const savA = (pA.promoPrice && pA.promoPrice < pA.regularPrice) ? (pA.regularPrice - pA.promoPrice) : 0;
      const savB = (pB.promoPrice && pB.promoPrice < pB.regularPrice) ? (pB.regularPrice - pB.promoPrice) : 0;
      return savB - savA;
    });
  } else if (state.catalogSort === 'name-asc') {
    filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
  }

  const totalItemsInCart = getItemCount();

  screen.innerHTML = `
    <section class="overflow-hidden pb-28">
      <!-- Open Grocery Market Top Header (Softly Blended, Retailer-Agnostic) -->
      <div class="px-5 pt-4 pb-3 border-b border-stone-200/60" style="background: linear-gradient(180deg, #eff4f0 0%, #f8faf8 58%, #fafaf9 100%)">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-[9.5px] font-black uppercase tracking-widest text-[#3b5e4c]/80">Central Grocery Catalog</p>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Open Market</h1>
          </div>
          ${totalItemsInCart > 0 ? `
            <button id="market-compare-cta" type="button" class="flex items-center gap-1.5 rounded-2xl bg-[#234e3b] px-3.5 py-2 text-[11px] font-black text-white shadow-xs hover:bg-[#1b3d2e] active:scale-95 transition">
              <span>⚖️</span>
              <span>Compare ${totalItemsInCart} in Trolley ➔</span>
            </button>
          ` : `
            <span class="rounded-2xl bg-[#e7efe9] px-3 py-1.5 text-[10px] font-black text-[#234e3b]">
              ${allProducts.length} Staples
            </span>
          `}
        </div>

        <!-- Town / City Area Pricing Zone Bar -->
        <button id="open-zone-selector-btn" type="button" class="mt-3 w-full rounded-2xl border border-[#d6e3da] bg-white/85 px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-3 text-left hover:bg-white hover:border-[#bed3c5] active:scale-99 transition">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-[#eaf2ec] text-sm text-[#234e3b]">📍</span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-black text-slate-900 truncate">${escapeHtml(zone.name)}</span>
                <span class="rounded-md bg-[#eaf2ec] px-1.5 py-0.2 text-[8.5px] font-bold text-[#2b5440]">
                  ${zone.kind === 'town' ? 'Town-wide pricing' : 'City-area pricing'}
                </span>
                ${state.detectedDistanceKm !== null ? `<span class="text-[8.5px] font-mono font-bold text-slate-400">${state.detectedDistanceKm} km</span>` : ''}
              </div>
              <p class="text-[10px] text-slate-500 truncate mt-0.5">
                Pick items freely — compare total across all 6 retailers inside your Trolley
              </p>
            </div>
          </div>
          <span class="shrink-0 rounded-xl bg-stone-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
            ${zone.kind === 'town' ? 'Town ▾' : 'Area ▾'}
          </span>
        </button>
      </div>

      <!-- Softly Blended SA Staples Deal Ticker -->
      <div class="px-5 pt-2.5">
        <div class="rounded-2xl bg-[#eef3ef]/90 border border-[#d6e3da] p-2 shadow-2xs flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
            <span class="shrink-0 rounded-lg bg-[#2b5440]/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#234e3b]">
              Popular
            </span>
            ${SA_STAPLE_BARGAINS.map(b => `
              <button 
                type="button" 
                data-staple-search="${b.name.split(' ')[0]}"
                class="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/90 border border-stone-200/70 px-2.5 py-1 text-[9.5px] font-bold text-slate-700 hover:bg-white transition active:scale-95"
              >
                <span>${b.name.split(' ').slice(0, 2).join(' ')}</span>
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
            <span class="font-bold text-slate-700">Showing results for "<strong>${escapeHtml(state.catalogSearch)}</strong>"</span>
            <button id="clear-search-btn" type="button" class="rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-2xs">Clear ✕</button>
          </div>
        ` : ''}

        <!-- 5 Core Circular Department Icons -->
        <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" data-catalog-cat="all" class="flex flex-col items-center shrink-0 group">
            <div class="size-13 rounded-2xl grid place-items-center text-xl transition shadow-2xs ${selectedCat === 'all' ? 'bg-slate-900 text-white scale-105 ring-2 ring-slate-900/15' : 'bg-white text-slate-700 border border-stone-200/90 hover:border-slate-400'}">
              🛍️
            </div>
            <span class="mt-1 text-[9.5px] font-black truncate max-w-[4.8rem] text-center ${selectedCat === 'all' ? 'text-slate-900' : 'text-slate-500'}">All (${allProducts.length})</span>
          </button>
          ${CATEGORIES.map(cat => {
            const isCatActive = selectedCat === cat.id;
            const count = allProducts.filter(p => p.category === cat.id).length;
            return `
              <button type="button" data-catalog-cat="${cat.id}" class="flex flex-col items-center shrink-0 group">
                <div class="size-13 rounded-2xl grid place-items-center text-xl transition shadow-2xs ${isCatActive ? 'bg-slate-900 text-white scale-105 ring-2 ring-slate-900/15' : 'bg-white text-slate-700 border border-stone-200/90 hover:border-slate-400'}">
                  ${cat.emoji}
                </div>
                <span class="mt-1 text-[9.5px] font-black truncate max-w-[4.8rem] text-center ${isCatActive ? 'text-slate-900' : 'text-slate-500'}">${cat.label.split(' ')[0]} (${count})</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Shared Top Brand Filter Chips -->
        <div class="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span class="shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Brands:</span>
          ${['White Star', 'Albany', 'Clover', 'Tastic', 'Koo', 'Sunlight', 'Rama', 'All Gold'].map(b => {
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
            <span>Departments</span>
          </button>
        </div>
      </div>

      <!-- Product Catalog Grid / Aisle Sections -->
      <div class="px-5 pt-3">
        ${filteredProducts.length === 0 ? `
          <div class="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-2xs">
            <span class="text-3xl">🔍</span>
            <h4 class="mt-2 text-sm font-black text-slate-900">No items found for "${escapeHtml(state.catalogSearch)}"</h4>
            <p class="mt-1 text-xs text-slate-400">Try searching for White Star, bread, milk, chips, rice, or tap the top search button.</p>
            <button id="reset-catalog-btn" type="button" class="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">Reset Search</button>
          </div>
        ` : (state.catalogViewMode === 'aisles' && selectedCat === 'all' && !searchQuery) ? `
          <div class="space-y-5">
            ${CATEGORIES.map(cat => {
              const deptProducts = filteredProducts.filter(p => p.category === cat.id);
              if (!deptProducts.length) return '';
              return `
                <div class="rounded-3xl bg-stone-100/70 p-3.5 border border-stone-200/80 shadow-2xs">
                  <div class="flex items-center justify-between pb-2.5 border-b border-stone-200">
                    <div class="flex items-center gap-2">
                      <span class="grid size-8 place-items-center rounded-xl bg-white text-base shadow-2xs">${cat.emoji}</span>
                      <div>
                        <h3 class="text-xs font-black text-slate-900">${cat.id}</h3>
                        <p class="text-[9.5px] text-slate-400 font-bold">${deptProducts.length} items in this department</p>
                      </div>
                    </div>
                    <button type="button" data-catalog-cat="${cat.id}" class="rounded-lg bg-white px-2.5 py-1 text-[9.5px] font-black text-slate-800 border border-stone-200 hover:border-slate-400 active:scale-95 transition">
                      Filter Aisle ▾
                    </button>
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-3">
                    ${deptProducts.map(product => renderProductCard(product, zone)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="grid grid-cols-2 gap-3">
            ${filteredProducts.map(product => renderProductCard(product, zone)).join('')}
          </div>
        `}
      </div>
    </section>`;

  bindCatalogInteractions(zone);
}

function bindCatalogInteractions(zone) {
  screen.querySelector('#market-compare-cta')?.addEventListener('click', () => routeTo('trolley'));

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
    openCategoryManagerModal(zone);
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

  // 1-Tap Add to Trolley directly on Product Image
  screen.querySelectorAll('[data-card-add-trolley]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const gtin = btn.dataset.cardAddTrolley;
      const product = MASTER_PRODUCTS.get(gtin);
      if (!product) return;

      addToCart({
        barcode: gtin,
        name: product.title,
        weight: product.weight || '1 unit',
        category: product.category || 'Pantry Staples & Grains',
        image: product.imageUrl,
        emoji: product.emoji || '🛍️'
      }, state.retailerId);
      automationCore.addToCartel({ barcode: gtin, name: product.title }, state.retailerId);
      playBeepSound();
      if (navigator.vibrate) navigator.vibrate([35, 20, 35]);
      renderMarket();
    });
  });

  // 1-Tap Decrement right on Product Image
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
        updateCartBadge();
        renderMarket();
      }
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
      const { zone, distanceKm } = findClosestZone(latitude, longitude);
      state.pricingZoneId = zone.id;
      state.detectedDistanceKm = distanceKm;
      state.gpsStatus = 'matched';
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

function openCategoryManagerModal(zone) {
  const allProducts = Array.from(MASTER_PRODUCTS.values());

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[2.25rem] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5">
        <div class="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 class="text-base font-black text-slate-900">Market Departments</h3>
            <p class="text-xs text-slate-400">Browse ${allProducts.length} grocery staples by aisle</p>
          </div>
          <button id="close-cat-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-stone-100 text-xs font-bold text-slate-500 hover:bg-stone-200">✕</button>
        </div>

        <div class="mt-4 space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          <button type="button" data-pick-dept="all" class="w-full flex items-center justify-between rounded-2xl border-2 p-3 text-left transition active:scale-98 ${state.catalogCategory === 'all' ? 'border-slate-900 bg-stone-50' : 'border-stone-100 bg-white hover:border-stone-200'}">
            <div class="flex items-center gap-3">
              <span class="grid size-11 place-items-center rounded-2xl bg-slate-900 text-white text-xl shadow-2xs">🛍️</span>
              <div>
                <h4 class="text-xs font-black text-slate-900">All Market Departments</h4>
                <p class="text-[10px] text-slate-400">Complete catalog of ${allProducts.length} grocery items</p>
              </div>
            </div>
            <span class="rounded-full bg-stone-200 px-2.5 py-0.5 text-[9px] font-black text-slate-700">${allProducts.length} items</span>
          </button>

          ${CATEGORIES.map(cat => {
            const items = allProducts.filter(p => p.category === cat.id);
            const minPrice = items.length ? Math.min(...items.map(p => {
              const pd = getZonePrice(zone.id, state.retailerId, p.gtin);
              return pd.promoPrice || pd.regularPrice;
            })) : 0;
            const isSelected = state.catalogCategory === cat.id;

            return `
              <button type="button" data-pick-dept="${cat.id}" class="w-full flex items-center justify-between rounded-2xl border-2 p-3 text-left transition active:scale-98 ${isSelected ? 'border-slate-900 bg-stone-50' : 'border-stone-100 bg-white hover:border-stone-200'}">
                <div class="flex items-center gap-3">
                  <span class="grid size-11 place-items-center rounded-2xl bg-stone-100 text-xl shadow-2xs">${cat.emoji}</span>
                  <div>
                    <h4 class="text-xs font-black text-slate-900">${cat.id}</h4>
                    <p class="text-[10px] text-slate-400 font-bold">${items.length} items &bull; From ${zar.format(minPrice)}</p>
                  </div>
                </div>
                <span class="rounded-full bg-[#edf3ee] px-2 py-0.5 text-[8.5px] font-black text-[#234e3b]">Browse Aisle</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#close-cat-modal-btn')?.addEventListener('click', () => { modalRoot.innerHTML = ''; });
  modalRoot.querySelectorAll('[data-pick-dept]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.catalogCategory = btn.dataset.pickDept;
      modalRoot.innerHTML = '';
      playBeepSound();
      renderMarket();
    });
  });
}

function openPricingZoneModal() {
  state.overlay = 'pricing-zone';
  const currentZone = getActiveZone();
  const townZones = PRICING_ZONES.filter((z) => z.kind === 'town');
  const metroZones = PRICING_ZONES.filter((z) => z.kind === 'metro');

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in">
      <div class="relative max-h-[86vh] w-full max-w-lg overflow-hidden rounded-[2.25rem] bg-stone-50 p-6 shadow-2xl border border-stone-200/90">
        <div class="flex items-center justify-between pb-3 border-b border-stone-200/80">
          <div>
            <h3 class="text-base font-black text-slate-900">Select Town or City Area</h3>
            <p class="text-xs text-slate-500">Retailer sales apply town-wide, or by area in big cities</p>
          </div>
          <button id="close-zone-modal-btn" type="button" class="grid size-8 place-items-center rounded-xl bg-stone-200/80 text-xs font-bold text-slate-600 hover:bg-stone-300/70">✕</button>
        </div>

        <button id="auto-gps-zone-btn" type="button" class="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#234e3b] px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-[#1b3d2e] active:scale-98 transition">
          <span class="flex items-center gap-2">
            <span>📍</span>
            <span>Match Live Location to Closest Town / Area</span>
          </span>
          <span class="text-[9.5px] font-bold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-lg">Live GPS</span>
        </button>

        <div class="mt-4 space-y-4 max-h-[54vh] overflow-y-auto pr-1">
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">🏘️ Towns (Shared across all town branches)</p>
            <div class="grid grid-cols-2 gap-2">
              ${townZones.map((z) => {
                const isCurrent = z.id === currentZone.id;
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
                const isCurrent = z.id === currentZone.id;
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

  modalRoot.querySelectorAll('[data-pick-zone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.pricingZoneId = btn.dataset.pickZone;
      state.detectedDistanceKm = null;
      state.gpsStatus = 'manual';
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
// MERGED UNIFIED TROLLEY + ENGAGED THEMED STORE COMPARISON BAROMETER
// ==========================================

function renderCartel() {
  const retailer = getRetailer();
  const theme = RETAILER_THEMES[retailer.id] || RETAILER_THEMES.shoprite;
  const zone = getActiveZone();
  const activeRetailerCart = getRetailerCart(state.retailerId);
  const activeItemCount = getItemCount();
  const activeTotal = getPayableTotal(state.retailerId);
  const activeSavings = getCurrentSavings(state.retailerId);
  const comparison = calculateTrolleyComparison();
  const cheapestStore = comparison.cheapest;
  const isCheapestSelected = cheapestStore && cheapestStore.retailerId === retailer.id;
  const switchPotential = cheapestStore ? Math.max(0, Math.round((activeTotal - cheapestStore.total) * 100) / 100) : 0;

  screen.innerHTML = `
    <section class="pb-44">
      <!-- Integrated Retailer-Themed Store Comparison Barometer Hero -->
      <div class="relative overflow-hidden rounded-b-[2.25rem] px-5 pb-6 pt-4 text-white shadow-xl transition-all duration-300" style="background: ${theme.heroGradient}">
        <!-- Top Utility Row -->
        <div class="flex items-center justify-between gap-2">
          <button id="trolley-back-market-btn" type="button" class="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md hover:bg-white/25 active:scale-95 transition">
            <span>←</span><span>Market</span>
          </button>
          <button id="trolley-zone-btn" type="button" class="inline-flex items-center gap-1 rounded-xl bg-black/25 px-2.5 py-1.5 text-[10px] font-bold text-white/90 backdrop-blur-md hover:bg-black/35 transition">
            <span>📍</span><span>${escapeHtml(zone.name)} ▾</span>
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

        <!-- Engaged 6-Store Comparison Barometer Integrated Into Hero -->
        ${activeRetailerCart.length > 0 ? `
          <div class="mt-5 rounded-3xl p-3.5 backdrop-blur-md border border-white/15" style="background: ${theme.barometerBg}">
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
                <span class="text-[10px] font-bold text-emerald-200">Best store active · Max spread ${zar.format(comparison.maxSavings)}</span>
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

      <!-- Bottom Checkout Bar (User Chooses Delivery or Single-Code Till Checkout) -->
      <div class="fixed inset-x-0 bottom-[5rem] z-30 mx-auto max-w-3xl border-t border-stone-200 bg-white/95 px-5 py-3 shadow-[0_-16px_40px_-28px_rgba(15,23,42,.4)] backdrop-blur-xl">
        <div class="mb-2.5 flex items-end justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">${activeItemCount} item${activeItemCount === 1 ? '' : 's'} under ${retailer.name} &middot; saved ${zar.format(activeSavings)}</p>
            <p class="mt-0.5 text-xs font-bold text-slate-600">${retailer.name} Checkout Total</p>
          </div>
          <p class="text-2xl font-black tracking-tight tabular-nums" style="color:${retailer.color}">${zar.format(activeTotal)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="delivery-checkout" class="secondary-button min-h-12 text-xs" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>🚚 Order Delivery</span>
          </button>
          <button id="store-checkout" class="primary-button min-h-12 text-xs text-white shadow-md active:scale-95 transition" style="background:${retailer.color}" ${activeRetailerCart.length ? '' : 'disabled'}>
            <span>🏪 ${retailer.name} Till Checkout</span>
          </button>
        </div>
      </div>
    </section>`;

  bindCartelInteractions();
}

function emptyCartel(retailer) {
  const quickStaples = Array.from(MASTER_PRODUCTS.values()).slice(0, 4);
  return `
    <div class="mx-5 mt-5 rounded-[2rem] border border-dashed border-stone-300 bg-white/80 p-6 text-center">
      <span class="mx-auto grid size-14 place-items-center rounded-2xl text-3xl" style="background:${retailer.soft}">&#128722;</span>
      <h2 class="mt-3 text-base font-black text-slate-900">Your Trolley is empty</h2>
      <p class="mt-1 text-xs leading-5 text-slate-500">Add groceries from the Open Market or tap below to start comparing all 6 retailers live.</p>

      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <button data-go-market-empty class="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm">
          Browse Open Market
        </button>
        <button data-open-camera class="rounded-xl bg-[#234e3b] px-4 py-2.5 text-xs font-black text-white shadow-sm flex items-center gap-1.5">
          <span>📷 Scan Barcode</span>
        </button>
      </div>

      <div class="mt-5 border-t border-stone-200/70 pt-4 text-left">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Quick Add Staples to Test Comparison</p>
        <div class="mt-2.5 grid grid-cols-2 gap-2">
          ${quickStaples.map((p) => `
            <button type="button" data-empty-quick-add="${p.gtin}" class="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-2 text-left hover:bg-white transition active:scale-95">
              <img src="${p.imageUrl}" alt="" class="size-8 rounded-lg object-contain bg-white p-0.5 border border-stone-100" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[10.5px] font-black text-slate-800">${escapeHtml(p.title.split(' ').slice(0, 2).join(' '))}</p>
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
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-700">${retailer.name} Priced List</h2>
        </div>
        <span class="rounded-full px-2.5 py-0.5 text-[10px] font-black" style="background:${theme.pillBg}; color:${theme.pillText}">
          ${checkedCount}/${items.length} picked &middot; Swipe left to remove
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
              >
                ${item.checkedInStore ? '<svg viewBox="0 0 24 24" class="size-3.5 fill-none stroke-current stroke-[3]"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </button>

              <div class="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-stone-50 border border-stone-100 p-1 flex items-center justify-center">
                ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'grid size-full place-items-center text-2xl\\'>${item.emoji || '🛍️'}</span>';" />` : `<span class="grid size-full place-items-center text-2xl">${item.emoji || '🛍️'}</span>`}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="truncate text-xs font-black ${item.checkedInStore ? 'line-through text-slate-400' : 'text-slate-900'}">${escapeHtml(item.name)}</h3>
                  <strong class="shrink-0 text-sm font-black text-slate-900 tabular-nums">${zar.format(item.price * item.quantity)}</strong>
                </div>

                <div class="mt-1 flex items-center justify-between gap-2">
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
                    <button type="button" data-cart-qty-dec="${item.barcode}" class="grid size-6 place-items-center rounded-lg bg-stone-100 text-xs font-black text-slate-700 hover:bg-stone-200">&minus;</button>
                    <span class="min-w-5 text-center text-xs font-black text-slate-900 tabular-nums">${item.quantity}</span>
                    <button type="button" data-cart-qty-inc="${item.barcode}" class="grid size-6 place-items-center rounded-lg text-xs font-black text-white" style="background:${retailer.color}">+</button>
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

  screen.querySelectorAll('[data-empty-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prod = MASTER_PRODUCTS.get(btn.dataset.emptyQuickAdd);
      if (!prod) return;
      addToCart({
        barcode: prod.gtin,
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

  // Tap any retailer in Store Comparison Barometer -> Reprices entire list under that retailer & switches theme!
  screen.querySelectorAll('[data-switch-cartel-retailer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const retId = btn.dataset.switchCartelRetailer;
      if (!RETAILERS[retId]) return;
      state.retailerId = retId;
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

    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

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
  if (!order) {
    screen.innerHTML = `<section class="px-5 py-8"><p class="section-kicker">Tracker</p><h1 class="mt-2 text-4xl font-black tracking-[-.04em]">Nothing on the road.</h1><div class="card mt-7 px-7 py-12 text-center"><span class="mx-auto grid size-16 place-items-center rounded-3xl bg-stone-100 text-3xl">&#128205;</span><h2 class="mt-4 font-black">Your deliveries live here</h2><p class="mt-2 text-sm leading-6 text-slate-500">Place a delivery order from your top-right Trolley to follow every step in real time.</p><button data-go-market class="secondary-button mx-auto mt-6">Browse Market</button></div></section>`;
    screen.querySelector('[data-go-market]').addEventListener('click', () => routeTo('market'));
    return;
  }
  const steps = ['Order confirmed', 'Picking your items', 'Driver on the way', 'Delivered'];
  screen.innerHTML = `
    <section class="px-5 py-8"><p class="section-kicker">Live delivery</p><div class="mt-2 flex items-end justify-between"><div><h1 class="text-4xl font-black tracking-[-.04em]">On its way.</h1><p class="mt-2 text-sm text-slate-500">Order #${order.id}</p></div><span class="rounded-full bg-[#edf3ee] px-3 py-1.5 text-[10px] font-black text-[#234e3b]">LIVE</span></div>
      <div class="card mt-7 overflow-hidden"><div class="relative h-48 bg-[#e8eee9]"><div class="absolute inset-0 opacity-40" style="background-image:linear-gradient(35deg,transparent 45%,#fff 46%,#fff 51%,transparent 52%),linear-gradient(145deg,transparent 35%,#d1d5db 36%,#d1d5db 39%,transparent 40%);background-size:90px 70px"></div><div class="absolute left-[58%] top-[42%] grid size-12 place-items-center rounded-full bg-slate-950 text-xl text-white shadow-xl ring-4 ring-white">&#128757;</div><div class="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] font-black shadow">About ${Math.max(4, 18 - order.step * 5)} min away</div></div>
        <div class="p-5"><div class="flex items-center gap-3"><div class="grid size-12 place-items-center rounded-2xl bg-amber-100 text-2xl">&#128104;</div><div><h2 class="font-black">Thabo is your driver</h2><p class="text-xs font-semibold text-slate-400">Toyota Starlet &middot; CA 482-991</p></div><button class="ml-auto grid size-10 place-items-center rounded-xl bg-stone-100">Call</button></div>
        <div class="my-5 border-t border-stone-100"></div><div class="space-y-4">${steps.map((label, index) => `<div class="flex items-center gap-3 ${index > order.step ? 'opacity-35' : ''}"><span class="grid size-7 place-items-center rounded-full ${index <= order.step ? 'bg-[#234e3b] text-white' : 'bg-stone-200'} text-xs font-black">${index < order.step ? '&check;' : index + 1}</span><span class="text-sm font-bold">${label}</span></div>`).join('')}</div></div></div>
      <div class="mt-5 rounded-[1.75rem] bg-slate-950 p-5 text-white"><p class="text-[10px] font-black uppercase tracking-[.18em] text-white/50">Give this code to your driver</p><div class="mt-2 flex items-center justify-between"><p class="text-4xl font-black tracking-[.2em]">${order.code}</p><span class="text-xs font-bold text-[#b7e2cb]">Payout locked &#128274;</span></div><p class="mt-3 text-xs leading-5 text-white/55">Funds unlock only after the driver enters your secure code.</p></div>
      ${order.step < 3 ? '<button id="advance-order" class="secondary-button mt-4 w-full">Demo: advance delivery</button>' : ''}
    </section>`;
  screen.querySelector('#advance-order')?.addEventListener('click', () => { state.order.step += 1; renderTracker(); });
}

function renderSavings() {
  const zone = getActiveZone();
  const liveSavings = getCurrentSavings();
  const totalSavings = state.completedSavings + liveSavings;
  const cartTotal = getMerchandiseTotal();
  const basketBoostTarget = 100;
  const basketBoostProgress = Math.min(100, Math.round((cartTotal / basketBoostTarget) * 100));
  const cartProduceItems = state.cart.filter((item) => item.category === 'Bakery & Fresh Produce' || item.category === 'Vegetables & Fruit');
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

function isValidEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

function openMasterBarcode(retailerId = state.retailerId, stepIndex = 0) {
  const targetRet = retailerId || state.retailerId || 'shoprite';
  const retailer = RETAILERS[targetRet] || RETAILERS.shoprite;
  const theme = RETAILER_THEMES[targetRet] || RETAILER_THEMES.shoprite;
  const cartItems = getRetailerCart(targetRet);
  if (!cartItems.length) {
    showToast(`Your ${retailer.name} Trolley is empty`);
    return;
  }

  const safeIdx = Math.max(0, Math.min(cartItems.length - 1, Number(stepIndex) || 0));
  const currentItem = cartItems[safeIdx];
  const isLast = safeIdx >= cartItems.length - 1;
  const progressPct = Math.round(((safeIdx + 1) / cartItems.length) * 100);
  const codeStr = String(currentItem.barcode).trim();

  state.overlay = 'barcode';

  modalRoot.innerHTML = `
    <div class="modal-enter fixed inset-0 z-[60] overflow-y-auto bg-slate-950/90 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="till-checkout-title">
      <section class="mx-auto flex min-h-dvh max-w-lg flex-col justify-between p-5 pb-safe pt-5 text-white">
        <!-- Header & Upper Next-Product Controls -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="grid size-10 shrink-0 place-items-center rounded-2xl bg-white p-1 shadow-md overflow-hidden">
                <img src="${retailer.logoUrl}" alt="${retailer.name}" class="h-full w-full object-contain" onerror="this.parentElement.style.background='${retailer.color}';this.parentElement.innerHTML='<span class=\\'font-black text-white text-xs\\'>${retailer.initials}</span>';" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[.18em] text-white/70">${retailer.name} Till Scanner</p>
                <h2 id="till-checkout-title" class="text-lg font-black">Product ${safeIdx + 1} of ${cartItems.length}</h2>
              </div>
            </div>
            <button data-close-modal class="grid size-10 place-items-center rounded-2xl bg-white/10 text-xl font-bold text-white transition active:scale-95">&times;</button>
          </div>

          <!-- Progress Bar -->
          <div class="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div class="h-full rounded-full transition-all duration-300" style="width:${progressPct}%; background:${retailer.color}"></div>
          </div>

          <!-- UPPER BUTTON BAR TO CHANGE TO NEXT PRODUCT -->
          <div class="mt-3.5 flex items-center gap-2">
            <button
              id="till-prev-btn"
              type="button"
              ${safeIdx === 0 ? 'disabled' : ''}
              class="rounded-2xl bg-white/12 px-4 py-3.5 text-xs font-black text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>

            <button
              id="till-upper-next-btn"
              type="button"
              class="flex-1 rounded-2xl py-3.5 px-4 text-sm font-black text-white shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
              style="background: ${isLast ? '#16a34a' : retailer.color}"
            >
              <span>${isLast ? `✓ Finish Checkout (${cartItems.length}/${cartItems.length})` : `Next Product (${safeIdx + 2} of ${cartItems.length}) ➔`}</span>
            </button>
          </div>
        </div>

        <!-- Single Product Scannable Barcode Card -->
        <div class="my-5 rounded-[2rem] bg-white p-5 text-center text-slate-950 shadow-2xl">
          <div class="flex items-center gap-3 rounded-2xl bg-stone-50 p-3 border border-stone-200/80 text-left">
            <div class="size-14 shrink-0 overflow-hidden rounded-xl bg-white border border-stone-200/70 p-1 flex items-center justify-center">
              ${currentItem.image ? `<img src="${currentItem.image}" alt="" class="max-h-full max-w-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-2xl\\'>${currentItem.emoji || '🛍️'}</span>';" />` : `<span class="text-2xl">${currentItem.emoji || '🛍️'}</span>`}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="rounded-md px-2 py-0.5 text-[9px] font-black uppercase" style="background:${theme.pillBg}; color:${theme.pillText}">
                  Item ${safeIdx + 1} of ${cartItems.length}
                </span>
                <span class="rounded-lg bg-slate-900 px-2.5 py-0.5 text-[11px] font-black text-white">
                  Qty &times;${currentItem.quantity}
                </span>
              </div>
              <h3 class="mt-1 truncate text-sm font-black text-slate-900">${escapeHtml(currentItem.name)}</h3>
              <p class="text-xs font-bold text-slate-500">${currentItem.weight || '1 unit'} &middot; <strong class="text-slate-900">${zar.format(currentItem.price * currentItem.quantity)}</strong></p>
            </div>
          </div>

          <!-- Crisp 1D Scannable Barcode for This Single Product -->
          <div class="mt-4 rounded-2xl border-2 border-slate-900/10 bg-white px-3 py-5 shadow-inner flex flex-col items-center justify-center">
            <svg id="till-single-barcode" class="w-full max-w-[300px] h-auto"></svg>
            ${currentItem.quantity > 1 ? `
              <p class="mt-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-900">
                Scan ${currentItem.quantity} times (or tell cashier &times;${currentItem.quantity})
              </p>
            ` : `
              <p class="mt-2 text-[11px] font-bold text-slate-400">Present barcode to cashier scanner, then tap Next above</p>
            `}
          </div>

          <!-- Step Dots / Quick Jump -->
          <div class="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
            ${cartItems.map((it, idx) => `
              <button
                type="button"
                data-till-jump="${idx}"
                class="h-7 min-w-7 rounded-lg px-2 text-[10px] font-black transition ${idx === safeIdx ? 'bg-slate-900 text-white shadow-xs' : idx < safeIdx ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-slate-500 hover:bg-stone-200'}"
              >
                ${idx < safeIdx ? '✓' : idx + 1}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Footer Total Summary -->
        <div class="rounded-2xl bg-white/10 px-4 py-3 flex items-center justify-between text-xs font-bold text-white/90">
          <span>${retailer.name} Basket Total (${getItemCount()} units)</span>
          <strong class="text-base font-black text-white tabular-nums">${zar.format(getPayableTotal(targetRet))}</strong>
        </div>
      </section>
    </div>`;

  // Render crisp 1D barcode for the single active product
  const barcodeSvg = modalRoot.querySelector('#till-single-barcode');
  if (barcodeSvg) {
    try {
      JsBarcode(barcodeSvg, codeStr, {
        format: isValidEan13(codeStr) ? 'EAN13' : 'CODE128',
        lineColor: '#020617',
        background: '#ffffff',
        width: 2.3,
        height: 98,
        displayValue: true,
        fontSize: 16,
        fontOptions: 'bold',
        margin: 8
      });
    } catch {
      JsBarcode(barcodeSvg, codeStr, {
        format: 'CODE128',
        lineColor: '#020617',
        background: '#ffffff',
        width: 2.1,
        height: 98,
        displayValue: true,
        fontSize: 15,
        margin: 8
      });
    }
  }

  modalRoot.querySelector('#till-prev-btn')?.addEventListener('click', () => {
    if (safeIdx > 0) {
      playBeepSound();
      openMasterBarcode(targetRet, safeIdx - 1);
    }
  });

  modalRoot.querySelector('#till-upper-next-btn')?.addEventListener('click', () => {
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(25);
    if (!isLast) {
      openMasterBarcode(targetRet, safeIdx + 1);
    } else {
      state.completedSavings += getCurrentSavings(targetRet);
      state.loyaltyPoints += Math.floor(getPayableTotal(targetRet));
      state.cart = [];
      closeModal();
      updateCartBadge();
      render();
      showToast(`✓ ${retailer.name} Till Checkout completed!`);
    }
  });

  modalRoot.querySelectorAll('[data-till-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openMasterBarcode(targetRet, parseInt(btn.dataset.tillJump, 10));
    });
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

function bindModalClose() {
  modalRoot.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
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
        addToCart(product, state.retailerId, { silent: true });
        matchedCount++;
      }
    }
    state.scanBusy = false;
    if (matchedCount > 0) {
      triggerFloatingTrolleyNotice({ name: `${matchedCount} scanned items`, emoji: '📷' }, state.retailerId, matchedCount);
    }
    routeTo('trolley');
    showToast(`✓ Scanned QR Stream: Added ${matchedCount} items to ${getRetailer().name} Trolley!`);
    return;
  }

  const cleanBarcode = lines[0] || cleanInput;
  const retailer = Object.values(RETAILERS).find((item) => item.entryBarcode === cleanBarcode);
  if (retailer) {
    state.retailerId = retailer.id;
    routeTo('trolley');
    showToast(`Welcome to ${retailer.name} - scanner linked`);
    return;
  }
  if (!getRetailer()) {
    showToast('Scan a retailer entry code first.');
    routeTo('trolley');
    return;
  }
  state.scanBusy = true;
  if (state.route === 'trolley' || state.route === 'cartel') {
    const status = document.querySelector('#scan-status');
    if (status) status.textContent = `Looking up ${cleanBarcode}...`;
  }
  try {
    const product = await fetchProductFromFirestore(cleanBarcode);
    if (!product) {
      openCrowdsourceModal(cleanBarcode);
      return;
    }
    addToCart(product, state.retailerId);
    if (state.overlay === 'camera') closeCameraScanner();
    if (state.route === 'trolley' || state.route === 'cartel') {
      renderCartel();
      const status = document.querySelector('#scan-status');
      if (status) status.textContent = `${product.name || product.title} added - ready for next scan`;
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
    PRODUCTS.set(barcode, scraped);
    automationCore.selectProduct({ barcode, ...scraped });

    addToCart(scraped, state.retailerId);
    playBeepSound();
    if (navigator.vibrate) navigator.vibrate(45);
    if (state.route === 'market') renderMarket();
  }
});

window.addEventListener('keydown', hardwareScannerKeydown, { capture: true });
window.addEventListener('hashchange', () => { state.route = getRouteFromHash(); render(); });
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => routeTo(button.dataset.route)));
document.querySelector('#header-search-button')?.addEventListener('click', () => toggleGlobalSearchDrawer());
document.querySelector('#header-cart-button')?.addEventListener('click', () => routeTo('trolley'));
document.querySelector('#header-camera-button')?.addEventListener('click', openLiveCameraScanner);
window.handleHardwareScan = handleHardwareScan;
window.openLiveCameraScanner = openLiveCameraScanner;

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed:', error)));
}

initializeFirebaseConnectivity();
render();
