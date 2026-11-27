/**
 * Automater — Local-First Cellphone Persistent Vault (IndexedDB + Persistent Storage API)
 *
 * Eliminates recurring Cloud Firestore & Cloud Storage read/write expenses by storing:
 *   1. User-scanned / crowdsourced shelf-tag OCR products ('custom_products')
 *   2. Permanent CSE & camera-captured product packshot image Blobs ('packshot_blobs')
 *   3. Local checkout receipts, Nedbank A2A session logs & PIN orders ('local_orders')
 *
 * Follows web-pwa-offline-first architecture:
 *   - Requests navigator.storage.persist() so mobile OSes (iOS 7-day cap / Android cleanup)
 *     never evict cached CSE packshots or scanned barcodes.
 *   - Keeps IndexedDB transactions strictly synchronous/request-only (zero awaited network calls
 *     inside transactions to prevent TRANSACTION_INACTIVE_ERR).
 *   - Stamps every record with _syncStatus, _lastModified, and _localVersion.
 */

const DB_NAME = 'automater_cellphone_vault_v1';
const DB_VERSION = 1;

const STORES = Object.freeze({
  CUSTOM_PRODUCTS: 'custom_products',
  PACKSHOT_BLOBS: 'packshot_blobs',
  LOCAL_ORDERS: 'local_orders'
});

let dbPromise = null;

/**
 * Requests persistent, non-evictable storage on the user's cellphone.
 */
export async function ensurePersistentCellphoneStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { persisted: false, quotaMb: 0, usageMb: 0 };
  }
  try {
    let persisted = false;
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && typeof navigator.storage.persist === 'function') {
      persisted = await navigator.storage.persist();
    }
    let usageMb = 0;
    let quotaMb = 0;
    if (typeof navigator.storage.estimate === 'function') {
      const est = await navigator.storage.estimate();
      usageMb = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
      quotaMb = Math.round(((est.quota || 0) / (1024 * 1024)));
    }
    return { persisted, usageMb, quotaMb };
  } catch (_) {
    return { persisted: false, quotaMb: 0, usageMb: 0 };
  }
}

function openVaultDb() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.CUSTOM_PRODUCTS)) {
          const prodStore = db.createObjectStore(STORES.CUSTOM_PRODUCTS, { keyPath: 'barcode' });
          prodStore.createIndex('by_modified', '_lastModified', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.PACKSHOT_BLOBS)) {
          db.createObjectStore(STORES.PACKSHOT_BLOBS, { keyPath: 'gtin' });
        }
        if (!db.objectStoreNames.contains(STORES.LOCAL_ORDERS)) {
          const orderStore = db.createObjectStore(STORES.LOCAL_ORDERS, { keyPath: 'id' });
          orderStore.createIndex('by_modified', '_lastModified', { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch (_) {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function makeVersionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Saves a cellphone-scanned or crowdsourced product permanently on-device.
 */
export async function saveLocalCustomProduct(product) {
  if (!product || !product.barcode) return null;
  const cleanBarcode = String(product.barcode).trim();
  const record = {
    ...product,
    barcode: cleanBarcode,
    gtin: cleanBarcode,
    indexedVia: product.indexedVia || 'on_device_ocr',
    _syncStatus: 'local_only',
    _lastModified: Date.now(),
    _localVersion: makeVersionId()
  };

  // Fallback mirror in localStorage for instant synchronous boot if needed
  try {
    const lsRaw = localStorage.getItem('automater_custom_products_v1');
    const lsMap = lsRaw ? JSON.parse(lsRaw) : {};
    lsMap[cleanBarcode] = { ...record, localImageDataUrl: record.imageUrl?.startsWith('data:') ? record.imageUrl : undefined };
    localStorage.setItem('automater_custom_products_v1', JSON.stringify(lsMap));
  } catch (_) {}

  const db = await openVaultDb();
  if (!db) return record;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.CUSTOM_PRODUCTS, 'readwrite');
      tx.objectStore(STORES.CUSTOM_PRODUCTS).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => resolve(record);
    } catch (_) {
      resolve(record);
    }
  });
}

/**
 * Loads all locally scanned/crowdsourced products stored on the cellphone.
 */
export async function loadAllLocalCustomProducts() {
  const merged = new Map();

  try {
    const lsRaw = localStorage.getItem('automater_custom_products_v1');
    if (lsRaw) {
      const parsed = JSON.parse(lsRaw);
      for (const [code, item] of Object.entries(parsed || {})) {
        if (item && !item._deletedAt) merged.set(code, item);
      }
    }
  } catch (_) {}

  const db = await openVaultDb();
  if (!db) return Array.from(merged.values());

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.CUSTOM_PRODUCTS, 'readonly');
      const req = tx.objectStore(STORES.CUSTOM_PRODUCTS).getAll();
      req.onsuccess = () => {
        for (const item of req.result || []) {
          if (item && item.barcode && !item._deletedAt) {
            merged.set(item.barcode, item);
          }
        }
        resolve(Array.from(merged.values()));
      };
      req.onerror = () => resolve(Array.from(merged.values()));
    } catch (_) {
      resolve(Array.from(merged.values()));
    }
  });
}

/**
 * Stores a clean #FFFFFF product packshot Blob permanently in IndexedDB by GTIN.
 * Note: Callers must fetch/create the Blob BEFORE calling this so the IDB transaction stays synchronous.
 */
export async function storePackshotBlobForever(gtin, blob, sourceUrl = '') {
  const cleanGtin = String(gtin || '').trim();
  if (!cleanGtin || !blob) return false;
  const db = await openVaultDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.PACKSHOT_BLOBS, 'readwrite');
      tx.objectStore(STORES.PACKSHOT_BLOBS).put({
        gtin: cleanGtin,
        blob,
        sourceUrl,
        savedAt: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

/**
 * Retrieves a permanently cached packshot Object URL from IndexedDB if offline / missing from HTTP cache.
 */
export async function getStoredPackshotObjectUrl(gtin) {
  const cleanGtin = String(gtin || '').trim();
  if (!cleanGtin) return null;
  const db = await openVaultDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.PACKSHOT_BLOBS, 'readonly');
      const req = tx.objectStore(STORES.PACKSHOT_BLOBS).get(cleanGtin);
      req.onsuccess = () => {
        const rec = req.result;
        if (rec?.blob instanceof Blob) {
          resolve(URL.createObjectURL(rec.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Records a local checkout or escrow delivery order on the cellphone ($0 Firestore writes).
 */
export async function saveLocalOrderRecord(order) {
  if (!order || !order.id) return null;
  const record = {
    ...order,
    _syncStatus: 'local_only',
    _lastModified: Date.now(),
    _localVersion: makeVersionId()
  };

  try {
    const lsRaw = localStorage.getItem('automater_local_orders_v1');
    const lsList = lsRaw ? JSON.parse(lsRaw) : [];
    const filtered = Array.isArray(lsList) ? lsList.filter((o) => o && o.id !== record.id) : [];
    filtered.unshift(record);
    localStorage.setItem('automater_local_orders_v1', JSON.stringify(filtered.slice(0, 40)));
  } catch (_) {}

  const db = await openVaultDb();
  if (!db) return record;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.LOCAL_ORDERS, 'readwrite');
      tx.objectStore(STORES.LOCAL_ORDERS).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => resolve(record);
    } catch (_) {
      resolve(record);
    }
  });
}

/**
 * Loads all saved Shoprite POS till receipts & delivery orders from the cellphone vault, newest first.
 */
export async function loadAllLocalOrders() {
  const merged = new Map();

  try {
    const lsRaw = localStorage.getItem('automater_local_orders_v1');
    if (lsRaw) {
      const parsed = JSON.parse(lsRaw);
      if (Array.isArray(parsed)) {
        for (const rec of parsed) {
          if (rec && rec.id) merged.set(rec.id, rec);
        }
      }
    }
  } catch (_) {}

  const db = await openVaultDb();
  if (!db) {
    return Array.from(merged.values()).sort((a, b) => (b.createdAt || b._lastModified || 0) - (a.createdAt || a._lastModified || 0));
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORES.LOCAL_ORDERS, 'readonly');
      const req = tx.objectStore(STORES.LOCAL_ORDERS).getAll();
      req.onsuccess = () => {
        for (const rec of req.result || []) {
          if (rec && rec.id) merged.set(rec.id, rec);
        }
        resolve(
          Array.from(merged.values()).sort((a, b) => (b.createdAt || b._lastModified || 0) - (a.createdAt || a._lastModified || 0))
        );
      };
      req.onerror = () => resolve(Array.from(merged.values()));
    } catch (_) {
      resolve(Array.from(merged.values()));
    }
  });
}
