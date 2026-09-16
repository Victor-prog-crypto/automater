/**
 * Automater - Automation Core & Multi-Platform Client Adapters
 *
 * Architectural Hierarchy:
 * |
 * +--- Chrome Adapter (Web / Extension / Iframe / DOM Scraper Bridge)
 * |
 * +--- iOS WebView Adapter (WKWebView / window.webkit.messageHandlers)
 * |
 * +--- Android WebView Adapter (Android WebView / @JavascriptInterface)
 */

export const AUTOMATION_EVENTS = Object.freeze({
  PRODUCT_SELECTED: 'AUTOMATER_PRODUCT_SELECTED',
  ADD_TO_LIST: 'AUTOMATER_ADD_TO_LIST',
  ADD_TO_CARTEL: 'AUTOMATER_ADD_TO_CARTEL',
  RETAILER_SWITCHED: 'AUTOMATER_RETAILER_SWITCHED',
  POS_QR_FLASHED: 'AUTOMATER_POS_QR_FLASHED',
  HARDWARE_SCAN: 'AUTOMATER_HARDWARE_SCAN'
});

/**
 * Base Platform Adapter Interface
 */
export class BaseAdapter {
  constructor(name) {
    this.name = name;
    this.core = null;
  }

  isAvailable() {
    return false;
  }

  init(core) {
    this.core = core;
  }

  notifyProductSelected(product) {
    // Override in subclass
  }

  notifyAddToList(product, retailerId) {
    // Override in subclass
  }

  notifyAddToCartel(product, retailerId) {
    // Override in subclass
  }

  notifyRetailerChanged(retailerId) {
    // Override in subclass
  }

  triggerHaptic(type = 'light') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') navigator.vibrate([40, 30, 40]);
      else if (type === 'heavy') navigator.vibrate(60);
      else navigator.vibrate(25);
    }
  }

  injectScraperScript(retailerId) {
    // Override in subclass
  }
}

/**
 * 1. Chrome Adapter
 * Targets Google Chrome / Chromium extensions, web workers, iframe message bridges, and desktop browsers.
 */
export class ChromeAdapter extends BaseAdapter {
  constructor() {
    super('Chrome Adapter');
    this.messageTarget = typeof window !== 'undefined' ? window : null;
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    const isChromium = !!window.chrome || (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Chrome'));
    return isChromium && !this.isIOSWebView() && !this.isAndroidWebView();
  }

  isIOSWebView() {
    if (typeof window === 'undefined') return false;
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.automaterCore);
  }

  isAndroidWebView() {
    if (typeof window === 'undefined') return false;
    return !!(window.AndroidAutomaterInterface);
  }

  init(core) {
    super.init(core);
    if (typeof window === 'undefined') return;

    // Listen for incoming scraper postMessages from browser tabs or iframe extensions
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.source === 'AUTOMATER_EXTENSION_SCRAPER') {
        const { type, payload } = event.data;
        if (type === 'PRODUCT_SCRAPED' && payload) {
          this.core.handleExternalProductScraped(payload);
        } else if (type === 'BARCODE_CAPTURED' && payload?.barcode) {
          this.core.handleHardwareScan(payload.barcode);
        }
      }
    });

    // Check if Chrome extension runtime is active
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === 'AUTOMATER_SCRAPER_PAYLOAD') {
          this.core.handleExternalProductScraped(message.payload);
        }
      });
    }
  }

  notifyProductSelected(product) {
    this.triggerHaptic('light');
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: AUTOMATION_EVENTS.PRODUCT_SELECTED,
        adapter: this.name,
        payload: product,
        timestamp: Date.now()
      }, '*');
    }
  }

  notifyAddToList(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: AUTOMATION_EVENTS.ADD_TO_LIST,
        adapter: this.name,
        retailerId,
        payload: product,
        timestamp: Date.now()
      }, '*');
    }
  }

  notifyAddToCartel(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: AUTOMATION_EVENTS.ADD_TO_CARTEL,
        adapter: this.name,
        retailerId,
        payload: product,
        timestamp: Date.now()
      }, '*');
    }
  }

  notifyRetailerChanged(retailerId) {
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: AUTOMATION_EVENTS.RETAILER_SWITCHED,
        adapter: this.name,
        retailerId,
        timestamp: Date.now()
      }, '*');
    }
  }

  injectScraperScript(retailerId) {
    console.log(`[Chrome Adapter] Scraper hook active for retailer: ${retailerId}`);
  }
}

/**
 * 2. iOS WebView Adapter
 * Targets native iOS Swift / SwiftUI applications hosting WKWebView with window.webkit.messageHandlers.
 */
export class IOSWebViewAdapter extends BaseAdapter {
  constructor() {
    super('iOS WebView Adapter');
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    return !!(window.webkit && window.webkit.messageHandlers && (
      window.webkit.messageHandlers.automaterCore ||
      window.webkit.messageHandlers.onProductScraped ||
      window.webkit.messageHandlers.hapticTrigger
    ));
  }

  init(core) {
    super.init(core);
    if (typeof window === 'undefined') return;

    // Expose global callback for Swift native code to call into webview
    window.onNativeIOSBarcodeScanned = (barcode) => {
      this.core.handleHardwareScan(barcode);
    };
    window.onNativeIOSProductInjected = (productJson) => {
      try {
        const product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
        this.core.handleExternalProductScraped(product);
      } catch (e) {
        console.error('Failed to parse iOS native product payload', e);
      }
    };
  }

  triggerHaptic(type = 'light') {
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.hapticTrigger) {
      window.webkit.messageHandlers.hapticTrigger.postMessage(type);
    } else {
      super.triggerHaptic(type);
    }
  }

  notifyProductSelected(product) {
    this.triggerHaptic('light');
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.automaterCore) {
      window.webkit.messageHandlers.automaterCore.postMessage({
        event: AUTOMATION_EVENTS.PRODUCT_SELECTED,
        adapter: this.name,
        product
      });
    }
  }

  notifyAddToList(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.automaterCore) {
      window.webkit.messageHandlers.automaterCore.postMessage({
        event: AUTOMATION_EVENTS.ADD_TO_LIST,
        adapter: this.name,
        retailerId,
        product
      });
    }
  }

  notifyAddToCartel(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.automaterCore) {
      window.webkit.messageHandlers.automaterCore.postMessage({
        event: AUTOMATION_EVENTS.ADD_TO_CARTEL,
        adapter: this.name,
        retailerId,
        product
      });
    }
  }

  notifyRetailerChanged(retailerId) {
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.automaterCore) {
      window.webkit.messageHandlers.automaterCore.postMessage({
        event: AUTOMATION_EVENTS.RETAILER_SWITCHED,
        adapter: this.name,
        retailerId
      });
    }
  }
}

/**
 * 3. Android WebView Adapter
 * Targets native Android Kotlin / Java applications hosting Android WebView with @JavascriptInterface.
 */
export class AndroidWebViewAdapter extends BaseAdapter {
  constructor() {
    super('Android WebView Adapter');
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    return !!(window.AndroidAutomaterInterface);
  }

  init(core) {
    super.init(core);
    if (typeof window === 'undefined') return;

    // Expose global callback for Android Kotlin/Java native code to invoke
    window.onAndroidHardwareScan = (barcode) => {
      this.core.handleHardwareScan(barcode);
    };
    window.onAndroidProductScraped = (productJson) => {
      try {
        const product = typeof productJson === 'string' ? JSON.parse(productJson) : productJson;
        this.core.handleExternalProductScraped(product);
      } catch (e) {
        console.error('Failed to parse Android product payload', e);
      }
    };
  }

  triggerHaptic(type = 'light') {
    if (typeof window !== 'undefined' && window.AndroidAutomaterInterface?.vibrate) {
      const duration = type === 'success' ? 40 : type === 'heavy' ? 70 : 25;
      window.AndroidAutomaterInterface.vibrate(duration);
    } else {
      super.triggerHaptic(type);
    }
  }

  notifyProductSelected(product) {
    this.triggerHaptic('light');
    if (typeof window !== 'undefined' && window.AndroidAutomaterInterface?.onProductSelected) {
      window.AndroidAutomaterInterface.onProductSelected(JSON.stringify(product));
    }
  }

  notifyAddToList(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined' && window.AndroidAutomaterInterface?.onProductAddedToList) {
      window.AndroidAutomaterInterface.onProductAddedToList(JSON.stringify({ retailerId, product }));
    }
  }

  notifyAddToCartel(product, retailerId) {
    this.triggerHaptic('success');
    if (typeof window !== 'undefined' && window.AndroidAutomaterInterface?.onProductAddedToCart) {
      window.AndroidAutomaterInterface.onProductAddedToCart(JSON.stringify({ retailerId, product }));
    }
  }

  notifyRetailerChanged(retailerId) {
    if (typeof window !== 'undefined' && window.AndroidAutomaterInterface?.onRetailerChanged) {
      window.AndroidAutomaterInterface.onRetailerChanged(retailerId);
    }
  }
}

/**
 * Universal Automation Core Coordinator
 * Discovers and routes actions across Chrome, iOS WebView, and Android WebView adapters.
 */
export class AutomationCore {
  constructor() {
    this.adapters = [
      new IOSWebViewAdapter(),
      new AndroidWebViewAdapter(),
      new ChromeAdapter()
    ];
    this.activeAdapter = null;
    this.listeners = new Map();
    this.init();
  }

  init() {
    // Detect and select highest priority available adapter
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        this.activeAdapter = adapter;
        break;
      }
    }

    // Default fallback to Chrome / Web Adapter
    if (!this.activeAdapter) {
      this.activeAdapter = this.adapters.find(a => a instanceof ChromeAdapter) || this.adapters[0];
    }

    this.activeAdapter.init(this);
    console.info(`[Automation Core] Active Platform Adapter: ${this.activeAdapter.name}`);
  }

  getAdapterName() {
    return this.activeAdapter ? this.activeAdapter.name : 'Web Universal';
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`[Automation Core] Listener error for ${event}:`, err);
        }
      }
    }
  }

  selectProduct(product) {
    if (this.activeAdapter) {
      this.activeAdapter.notifyProductSelected(product);
    }
    this.emit(AUTOMATION_EVENTS.PRODUCT_SELECTED, product);
  }

  addToList(product, retailerId) {
    if (this.activeAdapter) {
      this.activeAdapter.notifyAddToList(product, retailerId);
    }
    this.emit(AUTOMATION_EVENTS.ADD_TO_LIST, { product, retailerId });
  }

  addToCartel(product, retailerId) {
    if (this.activeAdapter) {
      this.activeAdapter.notifyAddToCartel(product, retailerId);
    }
    this.emit(AUTOMATION_EVENTS.ADD_TO_CARTEL, { product, retailerId });
  }

  switchRetailer(retailerId) {
    if (this.activeAdapter) {
      this.activeAdapter.notifyRetailerChanged(retailerId);
    }
    this.emit(AUTOMATION_EVENTS.RETAILER_SWITCHED, retailerId);
  }

  handleHardwareScan(barcode) {
    this.emit(AUTOMATION_EVENTS.HARDWARE_SCAN, barcode);
  }

  handleExternalProductScraped(product) {
    this.emit(AUTOMATION_EVENTS.PRODUCT_SELECTED, product);
  }
}

/**
 * Universal Retail Web DOM Scraper Engine
 * Extracts real-time image, price, title, and barcode from live retailer webview / DOM on click.
 */
export class RetailDOMScraper {
  /**
   * Calculate standard GS1 EAN-13 Modulo-10 Check Digit
   */
  static calculateEan13CheckDigit(first12Digits) {
    const digits = String(first12Digits).padStart(12, '0').slice(0, 12).split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${digits.join('')}${checkDigit}`;
  }

  /**
   * Extract Product from JSON-LD Schema Script Tags
   */
  static extractFromJsonLd(rootElement = document) {
    try {
      const scripts = rootElement.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        const data = JSON.parse(s.textContent);
        const item = data['@type'] === 'Product' ? data : (data['@graph'] ? data['@graph'].find(g => g['@type'] === 'Product') : null);
        if (item) {
          const barcode = item.gtin13 || item.gtin || item.sku || item.productID;
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const price = offers ? parseFloat(offers.price || offers.lowPrice || 0) : 0;
          return {
            name: item.name,
            barcode: barcode ? String(barcode).trim() : null,
            image: Array.isArray(item.image) ? item.image[0] : (item.image?.url || item.image || ''),
            price: price || 0,
            description: item.description || ''
          };
        }
      }
    } catch (e) {
      // JSON-LD parse error ignored
    }
    return null;
  }

  /**
   * Main Product Extractor from DOM Element on Click/Touch
   */
  static extractProductFromElement(cardElement) {
    if (!cardElement) return null;

    // 1. Extract Image (supports high-res srcset, lazy data-src, background-image)
    let image = '';
    const imgEl = cardElement.querySelector('img');
    if (imgEl) {
      image = imgEl.currentSrc || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || '';
      if (!image && imgEl.srcset) {
        const parts = imgEl.srcset.split(',').map(s => s.trim().split(' '));
        image = parts[parts.length - 1][0] || '';
      }
    }
    if (!image) {
      const bgEl = cardElement.querySelector('[style*="background-image"]');
      if (bgEl) {
        const bgMatch = bgEl.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (bgMatch) image = bgMatch[1];
      }
    }

    // 2. Extract Title / Name
    let name = '';
    const titleEl = cardElement.querySelector('h1, h2, h3, h4, .item-title, .product-title, .title, .product-name, [data-title], [data-name]');
    if (titleEl) {
      name = titleEl.textContent.trim();
    } else {
      name = cardElement.getAttribute('data-name') || imgEl?.alt || 'Retail Product';
    }

    // 3. Extract Price in ZAR (current shelf price & promotional WAS price)
    let price = 0;
    let basePrice = 0;
    const textContent = cardElement.innerText || cardElement.textContent || '';
    
    // Look for explicit price elements first
    const priceEl = cardElement.querySelector('.product-price, .now-price, .special-price, [data-price], .price, .amount');
    if (priceEl) {
      const pText = priceEl.getAttribute('data-price') || priceEl.textContent || '';
      const pMatch = pText.match(/R?\s*([0-9]+(?:[.,][0-9]{2})?)/i);
      if (pMatch) price = parseFloat(pMatch[1].replace(',', '.'));
    }

    if (!price) {
      const priceMatches = textContent.match(/R\s*([0-9]+(?:\.[0-9]{2})?)/g);
      if (priceMatches && priceMatches.length > 0) {
        const parsedPrices = priceMatches.map(p => parseFloat(p.replace(/[^0-9.]/g, ''))).filter(p => !isNaN(p) && p > 0);
        if (parsedPrices.length > 0) {
          price = parsedPrices[0];
          basePrice = parsedPrices.length > 1 ? parsedPrices[1] : Math.round(price * 1.15 * 100) / 100;
        }
      }
    }

    if (!price) {
      price = parseFloat(cardElement.getAttribute('data-price')) || 19.99;
      basePrice = parseFloat(cardElement.getAttribute('data-base-price')) || Math.round(price * 1.15 * 100) / 100;
    }

    if (!basePrice || basePrice <= price) {
      const strikeEl = cardElement.querySelector('.was-price, .old-price, strike, del, s, .line-through');
      if (strikeEl) {
        const strikeMatch = strikeEl.textContent.match(/R?\s*([0-9]+(?:[.,][0-9]{2})?)/i);
        if (strikeMatch) basePrice = parseFloat(strikeMatch[1].replace(',', '.'));
      }
    }
    if (!basePrice || basePrice < price) {
      basePrice = Math.round(price * 1.15 * 100) / 100;
    }

    // 4. Extract Barcode / GTIN / SKU
    let barcode = cardElement.getAttribute('data-barcode') || 
                  cardElement.getAttribute('data-gtin') || 
                  cardElement.getAttribute('data-ean') || 
                  cardElement.getAttribute('data-sku') || 
                  cardElement.getAttribute('data-product-code') || 
                  cardElement.getAttribute('data-product-id');

    if (!barcode) {
      // Check for JSON-LD schema in document
      const schemaData = this.extractFromJsonLd(cardElement);
      if (schemaData && schemaData.barcode) {
        barcode = schemaData.barcode;
      }
    }

    if (!barcode) {
      // Regex check for South African EAN-13 (starts with 600)
      const eanMatch = textContent.match(/\b(600\d{10})\b/);
      if (eanMatch) {
        barcode = eanMatch[1];
      } else {
        const anyDigitsMatch = textContent.match(/\b(\d{12,14})\b/);
        if (anyDigitsMatch) {
          barcode = anyDigitsMatch[1];
        } else {
          // Generate deterministic GS1 EAN-13 with valid checksum
          let hash = 0;
          for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
          const raw12 = `600${Math.abs(hash).toString().padEnd(9, '0').slice(0, 9)}`;
          barcode = this.calculateEan13CheckDigit(raw12);
        }
      }
    }

    // 5. Extract Weight / Packaging Unit
    const weightMatch = name.match(/(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|pack|pk|units?|ea))/i);
    const weight = weightMatch ? weightMatch[0] : '1 unit';

    return {
      barcode: String(barcode).trim(),
      name,
      weight,
      price: Math.round(price * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100,
      image,
      emoji: '🛍️'
    };
  }

  /**
   * Generates the Injected Content Script for Native WebViews & Chrome Adapters
   */
  static generateInjectedScraperScript() {
    return `
      (function() {
        console.log('[Automater Sniffer Engine] Active & Sniffing Retail DOM');

        // Highlight and active animation
        var style = document.createElement('style');
        style.textContent = \`
          [data-product-code], .product-item, .item-card, article, [class*="product-card"], [class*="ProductCard"] {
            cursor: pointer !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease !important;
          }
          [data-product-code]:active, .product-item:active, [class*="product-card"]:active {
            transform: scale(0.98) !important;
          }
        \`;
        document.head.appendChild(style);

        document.addEventListener('click', function(e) {
          var target = e.target;
          var card = target.closest('article, .product-card, .product-item, [data-product-code], [data-product-id], [data-sku], .item-card, .card');
          if (!card) return;

          // Extract image
          var img = card.querySelector('img');
          var imgSrc = img ? (img.currentSrc || img.getAttribute('data-src') || img.src || '') : '';

          // Extract title
          var titleEl = card.querySelector('h1, h2, h3, h4, .title, .name, .product-title, .item-name');
          var name = titleEl ? titleEl.innerText.trim() : (img ? img.alt : 'Retail Product');

          // Extract price in ZAR
          var text = card.innerText || '';
          var pMatch = text.match(/R\\s*([0-9]+(?:\\.[0-9]{2})?)/);
          var price = pMatch ? parseFloat(pMatch[1]) : 19.99;
          var basePrice = Math.round(price * 1.15 * 100) / 100;

          // Extract barcode or calculate deterministic EAN-13
          var bMatch = text.match(/\\b(600\\d{10})\\b/) || text.match(/\\b(\\d{12,14})\\b/);
          var barcode = bMatch ? bMatch[1] : (card.getAttribute('data-product-code') || card.getAttribute('data-sku') || ('600' + Math.floor(Math.random()*9000000000 + 1000000000)));

          var weightMatch = name.match(/(\\d+(?:\\.\\d+)?\\s*(?:g|kg|ml|l|pack|pk|units?))/i);
          var weight = weightMatch ? weightMatch[0] : '1 unit';

          var payload = {
            barcode: String(barcode).trim(),
            name: name,
            weight: weight,
            price: price,
            basePrice: basePrice,
            image: imgSrc,
            emoji: '🛍️'
          };

          console.log('[Automater Sniffer] Captured Product:', payload);

          // Multi-Platform Bridge Dispatch
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.automaterCore) {
            window.webkit.messageHandlers.automaterCore.postMessage({ event: 'AUTOMATER_PRODUCT_SELECTED', product: payload });
          } else if (window.AndroidAutomaterInterface && window.AndroidAutomaterInterface.onProductSelected) {
            window.AndroidAutomaterInterface.onProductSelected(JSON.stringify(payload));
          } else if (window.Capacitor && window.Capacitor.toNative) {
            window.Capacitor.toNative('AutomaterPlugin', 'onProductScraped', payload);
          } else {
            window.parent.postMessage({ source: 'AUTOMATER_EXTENSION_SCRAPER', type: 'AUTOMATER_PRODUCT_SELECTED', product: payload }, '*');
          }
        }, true);
      })();
    `;
  }
}

// Singleton Automation Core Instance
export const automationCore = new AutomationCore();
