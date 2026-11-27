/**
 * Automater — Queue-Elimination Core UI & Hardware Engines
 *
 * Pillar 1: Shoprite SA Store Locator (Zero-cost 80-store local GPS Haversine + Exact Deals)
 * Pillar 2: Continuous Phone Barcode Scanner (Native BarcodeDetector + @zxing/browser fallback + Haptic Vibration)
 * Pillar 3: Sequential 1-by-1 Till Barcode Renderer with Top Volume Button (Volume Up) Advancement
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  SA_PROVINCES,
  SHOPRITE_SA_STORES,
  SA_GPS_TEST_LOCATIONS,
  SHOPRITE_PROVINCE_HUBS,
  getShopriteStoresSortedByDistance,
  formatDistanceLabel,
  isValidGs1Ean13,
  isValidGs1Ean8
} from './shoprite-stores-sa.js';
import {
  formatPosBarcodeDigits,
  isTemplateZeroScaleBarcode,
  encodeShopriteScaleBarcodeForTill,
  calculateSaVatBreakdown,
  isSaZeroRatedVatItem,
  loadXtraSavingsCard,
  saveXtraSavingsCard,
  generateDemoXtraSavingsCardNumber
} from './shoprite-pos-engine.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[ch]);
}

/**
 * Renders a crisp, POS-laser-ready 1D barcode into an <svg> element using JsBarcode.
 * Uses standard GS1 EAN-13 (13 digits) or GS1 EAN-8 (8 digits) when the Modulo-10 check digit
 * is valid, and seamlessly falls back to CODE128 so no SKU ever fails to scan at the till.
 */
export function renderTill1DBarcodeSvg(svgElement, rawCode, { height = 126 } = {}) {
  if (!svgElement) return;
  const clean = String(rawCode || '').trim();
  const useEan13 = isValidGs1Ean13(clean);
  const useEan8 = !useEan13 && isValidGs1Ean8(clean);
  const format = useEan13 ? 'EAN13' : useEan8 ? 'EAN8' : 'CODE128';

  try {
    JsBarcode(svgElement, clean, {
      format,
      lineColor: '#000000',
      background: '#ffffff',
      width: useEan13 || useEan8 ? 2.6 : 2.1,
      height,
      displayValue: true,
      font: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontOptions: 'bold',
      fontSize: 18,
      textMargin: 6,
      marginLeft: 20,
      marginRight: 18,
      marginTop: 10,
      marginBottom: 10
    });
  } catch (err) {
    // Ultimate fallback to CODE128
    JsBarcode(svgElement, clean || '6001253010178', {
      format: 'CODE128',
      lineColor: '#000000',
      background: '#ffffff',
      width: 2.0,
      height: Math.max(80, height - 6),
      displayValue: true,
      fontSize: 16,
      marginLeft: 18,
      marginRight: 18,
      marginTop: 10,
      marginBottom: 10
    });
  }
  svgElement.setAttribute('shape-rendering', 'crispEdges');
}

/**
 * Helper to mount and open a native <dialog> modal inside #modal-root
 * following modern-web-guidance (showModal(), native top-layer, clean close lifecycle).
 */
export function mountModalDialog(modalRoot, innerHtml, { dialogClass = '', onClose = null, closedBy = 'any' } = {}) {
  const existingDialog = modalRoot.querySelector('dialog');
  if (existingDialog) {
    try {
      if (existingDialog.open) existingDialog.close();
    } catch (_) {}
    existingDialog.remove();
  }

  modalRoot.innerHTML = `
    <dialog id="automater-active-dialog" ${closedBy ? `closedby="${closedBy}"` : ''} class="m-0 h-dvh w-screen max-w-none bg-transparent p-0 text-slate-950 backdrop:bg-slate-950/75 backdrop:backdrop-blur-md ${dialogClass}">
      ${innerHtml}
    </dialog>
  `;
  const dialog = modalRoot.querySelector('#automater-active-dialog');
  if (!dialog) return null;

  // Fallback light-dismiss where <dialog closedby="any"> is unsupported (e.g. Safari)
  if (closedBy === 'any' && !('closedBy' in HTMLDialogElement.prototype)) {
    let pressedBackdrop = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === dialog;
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedBackdrop && e.target === dialog) {
        dialog.close();
      }
      pressedBackdrop = false;
    });
  }

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    if (typeof onClose === 'function') onClose();
    if (dialog.parentNode === modalRoot) {
      dialog.remove();
    }
  }, { once: true });

  dialog.showModal();
  return dialog;
}

// ============================================================================
// PILLAR 1: SHOPRITE SA STORE LOCATOR & CLOSEST STORE CHECK-IN MODAL
// ============================================================================

export function openShopriteStoreLocator({
  modalRoot,
  state,
  onSelectStore,
  playBeep,
  showToast,
  autoRequestGps = false
}) {
  let selectedProvince = 'all';
  let searchQuery = '';
  let locatingGps = false;
  let gpsErrorMsg = '';

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="flex min-h-dvh items-end justify-center sm:items-center sm:p-4">
        <div class="sheet-enter flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2.25rem] bg-white shadow-2xl sm:rounded-[2.25rem]" aria-labelledby="locator-dialog-title">
          <!-- Header -->
          <div class="border-b border-slate-100 bg-gradient-to-r from-[#e11d2e] to-rose-700 px-5 pb-4 pt-5 text-white">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-widest text-white">
                  📍 Step 1 · Shoprite Store Check-In
                </span>
                <h2 id="locator-dialog-title" class="mt-1.5 text-xl font-black tracking-tight">Which Shoprite are you in?</h2>
                <p class="mt-0.5 text-xs text-white/85">Share your location to find the closest store across SA &amp; unlock exact branch deals.</p>
              </div>
              <button id="locator-close-btn" type="button" class="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-base font-black text-white hover:bg-white/25 active:scale-95 transition" aria-label="Close store selector">✕</button>
            </div>

            <!-- Primary GPS Ask Location Button -->
            <button id="locator-ask-gps-btn" type="button" class="mt-3.5 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-slate-950 shadow-lg transition hover:bg-rose-50 active:scale-[.985]">
              <span class="flex items-center gap-2.5">
                <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-base text-white shadow-sm">📍</span>
                <span>
                  <strong id="locator-gps-btn-title" class="block text-xs font-black text-slate-950">Use My Current Location</strong>
                  <span id="locator-gps-btn-sub" class="block text-[10.5px] font-semibold text-slate-500">Zero-cost offline match across ${SHOPRITE_SA_STORES.length} SA Shoprite stores</span>
                </span>
              </span>
              <span class="rounded-xl bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">Find Closest</span>
            </button>
          </div>

          <!-- Search & Province Filter Bar -->
          <div class="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <div class="relative">
              <input
                id="locator-search-input"
                type="search"
                autocomplete="off"
                placeholder="Search suburb, mall, town or code (e.g. Soweto, Bellville, Umlazi, Polokwane)..."
                class="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-[#e11d2e] focus:ring-2 focus:ring-red-100"
              />
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            </div>

            <!-- 9 SA Province Chips -->
            <div id="locator-province-rail" class="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"></div>

            <!-- Quick City GPS Test Pills (helpful indoors or on desktop) -->
            <details class="mt-2 text-[10px]">
              <summary class="cursor-pointer font-bold text-slate-400 hover:text-slate-600">Testing indoors or on desktop? Simulate SA GPS coordinates ▾</summary>
              <div class="mt-1.5 flex flex-wrap gap-1">
                ${SA_GPS_TEST_LOCATIONS.map((loc, idx) => `
                  <button type="button" data-sim-gps="${idx}" class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9.5px] font-bold text-slate-700 hover:border-[#e11d2e] hover:text-[#e11d2e] active:scale-95 transition">
                    📍 ${escapeHtml(loc.label)}
                  </button>
                `).join('')}
              </div>
            </details>
          </div>

          <!-- Dynamic Closest Store + Filtered Branches List -->
          <div id="locator-results-list" class="flex-1 space-y-2.5 overflow-y-auto px-5 py-4 pb-safe"></div>
        </div>
      </div>
    `,
    { closedBy: 'any' }
  );

  if (!dialog) return;

  const listContainer = dialog.querySelector('#locator-results-list');
  const provinceRail = dialog.querySelector('#locator-province-rail');
  const searchInput = dialog.querySelector('#locator-search-input');
  const gpsBtnTitle = dialog.querySelector('#locator-gps-btn-title');
  const gpsBtnSub = dialog.querySelector('#locator-gps-btn-sub');

  function renderProvinceRail() {
    provinceRail.innerHTML = SA_PROVINCES.map((prov) => {
      const active = selectedProvince === prov.code;
      const count = prov.code === 'all'
        ? SHOPRITE_SA_STORES.length
        : SHOPRITE_SA_STORES.filter((s) => s.provinceCode === prov.code).length;
      return `
        <button
          type="button"
          data-prov-code="${prov.code}"
          class="shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-black transition active:scale-95 ${
            active
              ? 'bg-slate-950 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
          }"
        >
          ${escapeHtml(prov.short)} (${count})
        </button>
      `;
    }).join('');

    provinceRail.querySelectorAll('[data-prov-code]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedProvince = btn.dataset.provCode;
        renderProvinceRail();
        renderStoreList();
      });
    });
  }

  function renderStoreList() {
    const coords = state.userCoords;
    let stores = coords
      ? getShopriteStoresSortedByDistance(coords.latitude, coords.longitude, SHOPRITE_SA_STORES)
      : [...SHOPRITE_SA_STORES];

    const q = searchQuery.trim().toLowerCase();
    const closestOverall = coords ? stores[0] : null;

    const filtered = stores.filter((s) => {
      if (selectedProvince !== 'all' && s.provinceCode !== selectedProvince) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.suburb.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.provinceName.toLowerCase().includes(q) ||
        s.retailerStoreCode.includes(q)
      );
    });

    if (gpsErrorMsg) {
      gpsBtnSub.textContent = gpsErrorMsg;
    } else if (coords && closestOverall) {
      gpsBtnTitle.textContent = `Location Active · Closest is ${closestOverall.distanceLabel}`;
      gpsBtnSub.textContent = `${closestOverall.name} (#${closestOverall.retailerStoreCode}) — tap your store below`;
    }

    if (!filtered.length) {
      listContainer.innerHTML = `
        <div class="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <p class="text-sm font-black text-slate-800">No Shoprite branch matched "${escapeHtml(searchQuery)}"</p>
          <p class="mt-1 text-xs text-slate-500">Try searching by city, township, mall, or tap "All SA".</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map((s, idx) => {
      const isClosest = Boolean(coords && closestOverall && s.id === closestOverall.id && idx === 0);
      const isCurrent = s.id === state.currentStoreId && state.storeConfirmed;

      return `
        <button
          type="button"
          data-choose-shoprite="${s.id}"
          class="w-full rounded-2xl border-2 p-3.5 text-left transition active:scale-[.985] ${
            isClosest
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
              : isCurrent
              ? 'border-[#e11d2e] bg-rose-50/40 ring-2 ring-red-500/15'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }"
        >
          <div class="flex items-start justify-between gap-2.5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                ${isClosest ? `
                  <span class="rounded-md bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-2xs">
                    🎯 Closest Store · ${escapeHtml(s.distanceLabel)}
                  </span>
                ` : s.distanceLabel ? `
                  <span class="rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    📍 ${escapeHtml(s.distanceLabel)}
                  </span>
                ` : ''}
                <span class="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-black text-[#e11d2e]">
                  ${escapeHtml(s.provinceCode)} · #${escapeHtml(s.retailerStoreCode)}
                </span>
                ${isCurrent ? `
                  <span class="rounded bg-slate-950 px-1.5 py-0.5 text-[9px] font-black text-emerald-400">
                    ✓ CHECKED IN
                  </span>
                ` : ''}
              </div>

              <h3 class="mt-1.5 text-sm font-black text-slate-950 leading-snug">${escapeHtml(s.name)}</h3>
              <p class="mt-0.5 text-[11px] font-medium text-slate-500">${escapeHtml(s.address)}</p>

              <div class="mt-2 flex items-center gap-1.5 rounded-xl bg-rose-50/90 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-900 border border-rose-200/70">
                <span>🏷️</span>
                <span class="truncate">${escapeHtml(s.dealBanner)}</span>
              </div>
            </div>

            <span class="shrink-0 self-center rounded-xl px-3 py-2 text-[10.5px] font-black text-white shadow-sm ${
              isClosest ? 'bg-emerald-600' : 'bg-[#e11d2e]'
            }">
              Select ➔
            </span>
          </div>
        </button>
      `;
    }).join('');

    listContainer.querySelectorAll('[data-choose-shoprite]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosenId = btn.dataset.chooseShoprite;
        const chosenStore = SHOPRITE_SA_STORES.find((st) => st.id === chosenId);
        if (chosenStore) {
          onSelectStore(chosenStore);
          dialog.close();
        }
      });
    });
  }

  function applyCoordinates(latitude, longitude, label = '') {
    locatingGps = false;
    gpsErrorMsg = '';
    state.userCoords = { latitude, longitude, updatedAt: Date.now() };
    selectedProvince = 'all';
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    playBeep?.();
    renderProvinceRail();
    renderStoreList();
    listContainer.scrollTo({ top: 0, behavior: 'smooth' });
    const nearest = getShopriteStoresSortedByDistance(latitude, longitude, SHOPRITE_SA_STORES)[0];
    if (nearest) {
      showToast?.(`📍 Closest Shoprite: ${nearest.name} (${nearest.distanceLabel}) — tap to view exact deals!`);
    }
  }

  function requestLiveUserLocation() {
    if (locatingGps) return;
    if (!('geolocation' in navigator)) {
      gpsErrorMsg = 'Geolocation unsupported on this device — search your suburb below.';
      renderStoreList();
      return;
    }
    locatingGps = true;
    gpsBtnTitle.textContent = 'Locating your nearest Shoprite...';
    gpsBtnSub.textContent = 'Reading GPS coordinates...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        locatingGps = false;
        gpsErrorMsg = err?.code === 1
          ? 'Location permission declined — search your town/suburb below or pick a test city.'
          : 'GPS signal weak indoors — search your Shoprite branch below.';
        gpsBtnTitle.textContent = 'Retry Current Location';
        renderStoreList();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  dialog.querySelector('#locator-close-btn')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('#locator-ask-gps-btn')?.addEventListener('click', requestLiveUserLocation);

  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderStoreList();
  });

  dialog.querySelectorAll('[data-sim-gps]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.simGps);
      const preset = SA_GPS_TEST_LOCATIONS[idx];
      if (preset) {
        applyCoordinates(preset.latitude, preset.longitude, preset.label);
      }
    });
  });

  renderProvinceRail();
  renderStoreList();

  if (autoRequestGps) {
    requestLiveUserLocation();
  }
}

// ============================================================================
// PILLAR 2: CONTINUOUS PHONE-AS-A-SCANNER WITH HAPTIC VIBRATION + INLINE SEARCH
// ============================================================================

export async function openContinuousPhoneScanner({
  modalRoot,
  state,
  activeStore,
  zar,
  searchCatalogProducts,
  onBarcodeDetected,
  onQuickAddProduct,
  onChangeCartQty,
  getRetailerCart,
  getPayableTotal,
  onOpenTillCheckout,
  onGoToTrolley,
  onOpenShelfTagOcr,
  onOpenScalePlu,
  showToast
}) {
  let activeStream = null;
  let scanLoopRunning = true;
  let zxingControls = null;
  let lastCode = '';
  let lastCodeAt = 0;
  let lastAddedItem = null;

  const quickSimProducts = [
    { code: '6001253010178', label: '🍞 Albany Bread 700g' },
    { code: '6001001271110', label: '🥛 Ritebrand Milk 1L' },
    { code: '2337240074996', label: '🌭 Weighed Boerewors R74.99' },
    { code: '6001707771105', label: '🌽 White Star 2.5kg' },
    { code: '6001231000191', label: '🍚 Tastic Rice 2kg' },
    { code: '5449000061768', label: '🥤 Coke Zero 2.25L' },
    { code: '60070715', label: '🥚 Eggs 18pk (EAN-8)' }
  ];

  const cleanupCamera = () => {
    scanLoopRunning = false;
    if (zxingControls && typeof zxingControls.stop === 'function') {
      try { zxingControls.stop(); } catch (_) {}
      zxingControls = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
    if (state.overlay === 'camera') {
      state.overlay = null;
    }
  };

  state.overlay = 'camera';

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="flex h-dvh w-screen flex-col justify-between bg-slate-950 text-white" aria-labelledby="scanner-dialog-title">
        <!-- Top Scanner Bar -->
        <div class="z-20 bg-gradient-to-b from-black/90 via-black/75 to-transparent px-4 pb-3 pt-4 pt-safe">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-black text-base shadow-md">📷</span>
              <div class="min-w-0">
                <h2 id="scanner-dialog-title" class="truncate text-sm font-black tracking-tight">Phone Trolley Scanner</h2>
                <p id="scanner-engine-status" class="truncate text-[10px] font-bold text-emerald-400">
                  📍 ${escapeHtml(activeStore.name)} · Vibrates on add
                </p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              ${typeof onOpenScalePlu === 'function' ? `
                <button id="scanner-scale-plu-btn" type="button" class="flex h-10 items-center gap-1 rounded-xl border border-amber-400/40 bg-amber-500/20 px-2.5 text-[11px] font-black text-amber-200 hover:bg-amber-500/30 active:scale-95 transition" title="Add loose produce, bakery rolls, or hot deli item">
                  <span>⚖️</span><span>PLU</span>
                </button>
              ` : ''}
              <button id="scanner-tag-ocr-btn" type="button" class="flex h-10 items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-2.5 text-[11px] font-black text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition" title="Read shelf price tag locally on phone ($0 Cloud Vision)">
                <span>🏷️</span><span>Tag OCR</span>
              </button>
              <button id="scanner-torch-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/10 text-base text-white hover:bg-white/20 active:scale-95 transition" aria-label="Toggle flashlight">🔦</button>
              <button id="scanner-close-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/15 text-lg font-black text-white hover:bg-white/25 active:scale-95 transition" aria-label="Close scanner">✕</button>
            </div>
          </div>

          <!-- Inline Quick Search inside Scanner (for wet/crumpled barcodes) -->
          <div class="relative mt-3">
            <input
              id="scanner-inline-search"
              type="search"
              autocomplete="off"
              placeholder="Barcode smudged? Type product name or 600... barcode here"
              class="h-10 w-full rounded-xl border border-white/20 bg-white/10 pl-9 pr-3 text-xs font-bold text-white placeholder:text-white/50 backdrop-blur-md outline-none focus:border-emerald-400 focus:bg-slate-900/95"
            />
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/60">🔍</span>
            <div id="scanner-inline-results" class="absolute inset-x-0 top-11 z-30 hidden max-h-60 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/98 p-2 shadow-2xl"></div>
          </div>
        </div>

        <!-- Camera Viewfinder -->
        <div class="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
          <video id="camera-scanner-video" playsinline autoplay muted class="size-full object-cover"></video>

          <!-- Aiming Reticle -->
          <div id="scanner-reticle-box" class="pointer-events-none absolute inset-0 grid place-items-center p-6 transition-transform duration-150">
            <div id="scanner-reticle-frame" class="relative h-64 w-72 max-w-[82vw] rounded-3xl border-2 border-emerald-400/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] transition-colors duration-200">
              <div class="absolute -left-1 -top-1 size-6 rounded-tl-xl border-l-4 border-t-4 border-emerald-400"></div>
              <div class="absolute -right-1 -top-1 size-6 rounded-tr-xl border-r-4 border-t-4 border-emerald-400"></div>
              <div class="absolute -bottom-1 -left-1 size-6 rounded-bl-xl border-b-4 border-l-4 border-emerald-400"></div>
              <div class="absolute -bottom-1 -right-1 size-6 rounded-br-xl border-b-4 border-r-4 border-emerald-400"></div>
              <div class="scanner-laser absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444]"></div>
            </div>
          </div>

          <!-- Haptic Vibration Confirmation Pill -->
          <div id="scanner-haptic-pill" class="pointer-events-none absolute top-4 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-black text-slate-950 opacity-0 shadow-xl transition-all duration-200">
            📳 Vibrated · Added to Trolley!
          </div>
        </div>

        <!-- Bottom Live Trolley HUD & Quick Test Bar -->
        <div class="z-20 border-t border-white/10 bg-slate-900/98 px-4 pb-4 pt-3 pb-safe backdrop-blur-xl">
          <!-- Last Added Item Live Card -->
          <div id="scanner-last-item-slot" class="mb-2.5"></div>

          <!-- Demo / Simulator Barcodes -->
          <div>
            <p class="text-[9.5px] font-black uppercase tracking-wider text-slate-400">Point camera at product barcode — or tap to test instant scan + vibrate:</p>
            <div class="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              ${quickSimProducts.map((p) => `
                <button type="button" data-sim-scan="${p.code}" class="shrink-0 rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 hover:text-slate-950 active:scale-95 transition">
                  ${p.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Live Trolley Summary & Go to Till CTA -->
          <div id="scanner-footer-summary" class="mt-2.5"></div>
        </div>
      </div>
    `,
    { closedBy: 'closerequest', onClose: cleanupCamera }
  );

  if (!dialog) return;

  const reticleFrame = dialog.querySelector('#scanner-reticle-frame');
  const hapticPill = dialog.querySelector('#scanner-haptic-pill');
  const lastItemSlot = dialog.querySelector('#scanner-last-item-slot');
  const footerSummary = dialog.querySelector('#scanner-footer-summary');
  const engineStatus = dialog.querySelector('#scanner-engine-status');
  const inlineSearch = dialog.querySelector('#scanner-inline-search');
  const inlineResults = dialog.querySelector('#scanner-inline-results');

  function flashReticleAndPill(message) {
    if (reticleFrame) {
      reticleFrame.classList.remove('border-emerald-400/85');
      reticleFrame.classList.add('border-lime-300', 'scale-105', 'bg-emerald-400/15');
      setTimeout(() => {
        reticleFrame.classList.remove('border-lime-300', 'scale-105', 'bg-emerald-400/15');
        reticleFrame.classList.add('border-emerald-400/85');
      }, 280);
    }
    if (hapticPill) {
      hapticPill.textContent = message;
      hapticPill.classList.remove('opacity-0');
      hapticPill.classList.add('opacity-100');
      clearTimeout(flashReticleAndPill.timer);
      flashReticleAndPill.timer = setTimeout(() => {
        hapticPill.classList.replace('opacity-100', 'opacity-0');
      }, 1300);
    }
  }

  function renderScannerHud() {
    const cart = getRetailerCart('shoprite');
    const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);
    const totalPayable = getPayableTotal('shoprite');

    if (lastAddedItem) {
      const liveCartRow = cart.find((c) => c.barcode === lastAddedItem.barcode);
      const qty = liveCartRow ? liveCartRow.quantity : 0;
      lastItemSlot.innerHTML = qty > 0 ? `
        <div class="haptic-pulse flex items-center justify-between gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/50 p-2.5">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="rounded bg-emerald-500 px-1.5 py-0.5 text-[8.5px] font-black text-slate-950">✓ IN TROLLEY</span>
              <span class="font-mono text-[9.5px] text-emerald-300">${escapeHtml(lastAddedItem.barcode)}</span>
            </div>
            <p class="mt-0.5 truncate text-xs font-black text-white">${escapeHtml(lastAddedItem.name)}</p>
            <p class="text-[10.5px] font-bold text-emerald-300">${zar.format(lastAddedItem.price)} each</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5 rounded-xl bg-black/40 p-1">
            <button type="button" data-scanner-qty="-1" class="grid size-7 place-items-center rounded-lg bg-white/10 text-sm font-black text-white active:scale-90">−</button>
            <span class="min-w-6 text-center text-xs font-black text-white">${qty}</span>
            <button type="button" data-scanner-qty="1" class="grid size-7 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-slate-950 active:scale-90">+</button>
          </div>
        </div>
      ` : '';

      lastItemSlot.querySelectorAll('[data-scanner-qty]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.dataset.scannerQty);
          onChangeCartQty(lastAddedItem.barcode, delta);
          renderScannerHud();
        });
      });
    } else {
      lastItemSlot.innerHTML = '';
    }

    footerSummary.innerHTML = `
      <div class="flex items-center gap-2">
        <button id="scanner-view-trolley-btn" type="button" class="flex-1 rounded-2xl bg-white/10 px-3 py-3 text-xs font-black text-white hover:bg-white/15 active:scale-98 transition">
          🛒 Trolley (${totalUnits}) · ${zar.format(totalPayable)}
        </button>
        <button id="scanner-go-till-btn" type="button" ${totalUnits === 0 ? 'disabled' : ''} class="flex-1 rounded-2xl bg-[#e11d2e] px-3 py-3 text-xs font-black text-white shadow-lg shadow-red-600/30 disabled:opacity-40 active:scale-98 transition">
          ⚡ At Till: Scan 1-by-1 ➔
        </button>
      </div>
    `;

    footerSummary.querySelector('#scanner-view-trolley-btn')?.addEventListener('click', () => {
      dialog.close();
      onGoToTrolley();
    });

    footerSummary.querySelector('#scanner-go-till-btn')?.addEventListener('click', () => {
      dialog.close();
      onOpenTillCheckout();
    });
  }

  async function triggerScannedCode(rawBarcode) {
    const code = String(rawBarcode || '').trim();
    if (!code) return;
    const added = await onBarcodeDetected(code);
    if (added) {
      lastAddedItem = added;
      flashReticleAndPill(`📳 +1 ${added.name.slice(0, 22)} (${zar.format(added.price)})`);
      renderScannerHud();
    } else {
      // Unknown barcode opens crowdsource modal, so close camera cleanly first
      dialog.close();
    }
  }

  // Bind close & sim buttons
  dialog.querySelector('#scanner-close-btn')?.addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-sim-scan]').forEach((btn) => {
    btn.addEventListener('click', () => triggerScannedCode(btn.dataset.simScan));
  });

  // Inline search inside scanner
  inlineSearch?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (!q) {
      inlineResults.classList.add('hidden');
      inlineResults.innerHTML = '';
      return;
    }
    const matches = searchCatalogProducts(q).slice(0, 6);
    inlineResults.classList.remove('hidden');
    if (!matches.length) {
      inlineResults.innerHTML = `<p class="p-2 text-xs text-slate-400">No match for "${escapeHtml(q)}"</p>`;
      return;
    }
    inlineResults.innerHTML = matches.map((m) => `
      <button type="button" data-inline-pick="${m.gtin}" class="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-white/10 active:scale-98 transition">
        <div class="min-w-0">
          <p class="truncate text-xs font-black text-white">${escapeHtml(m.emoji || '🛍️')} ${escapeHtml(m.title)}</p>
          <p class="text-[10px] text-emerald-400 font-bold">${zar.format(m.deal.activePrice)} · ${escapeHtml(m.deal.aisle)}</p>
        </div>
        <span class="shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-slate-950">+ Add</span>
      </button>
    `).join('');

    inlineResults.querySelectorAll('[data-inline-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gtin = btn.dataset.inlinePick;
        const added = onQuickAddProduct(gtin);
        if (added) {
          lastAddedItem = added;
          inlineSearch.value = '';
          inlineResults.classList.add('hidden');
          flashReticleAndPill(`📳 +1 ${added.name.slice(0, 22)}`);
          renderScannerHud();
        }
      });
    });
  });

  // Torch button
  let torchActive = false;
  dialog.querySelector('#scanner-torch-btn')?.addEventListener('click', async () => {
    const track = activeStream?.getVideoTracks?.()[0];
    const caps = track?.getCapabilities ? track.getCapabilities() : {};
    if (caps.torch) {
      torchActive = !torchActive;
      await track.applyConstraints({ advanced: [{ torch: torchActive }] });
      showToast?.(torchActive ? '🔦 Torch ON' : '🔦 Torch OFF');
    } else {
      showToast?.('Torch not available on this camera');
    }
  });

  // Loose Produce / Bakery / Hot Deli PLU Picker button inside scanner
  dialog.querySelector('#scanner-scale-plu-btn')?.addEventListener('click', () => {
    dialog.close();
    if (typeof onOpenScalePlu === 'function') {
      onOpenScalePlu();
    }
  });

  // On-Device Shelf Price Tag OCR capture button (captures live camera frame directly on phone)
  dialog.querySelector('#scanner-tag-ocr-btn')?.addEventListener('click', () => {
    const v = dialog.querySelector('#camera-scanner-video');
    if (v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = v.videoWidth;
      snapCanvas.height = v.videoHeight;
      const ctx = snapCanvas.getContext('2d');
      ctx.drawImage(v, 0, 0, snapCanvas.width, snapCanvas.height);
      snapCanvas.toBlob((blob) => {
        dialog.close();
        if (typeof onOpenShelfTagOcr === 'function') {
          onOpenShelfTagOcr(blob);
        }
      }, 'image/jpeg', 0.92);
    } else {
      dialog.close();
      if (typeof onOpenShelfTagOcr === 'function') {
        onOpenShelfTagOcr(null);
      }
    }
  });

  renderScannerHud();

  // Start Rear Camera + Barcode Detection (Native BarcodeDetector OR @zxing/browser fallback)
  const videoEl = dialog.querySelector('#camera-scanner-video');
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    if (!scanLoopRunning || !videoEl) {
      cleanupCamera();
      return;
    }

    videoEl.srcObject = activeStream;
    await videoEl.play();

    if ('BarcodeDetector' in window) {
      engineStatus.textContent = `📍 ${activeStore.name} · Hardware BarcodeDetector Live`;
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
      });
      const detectTick = async () => {
        if (!scanLoopRunning) return;
        if (videoEl.readyState >= 2) {
          try {
            const codes = await detector.detect(videoEl);
            if (codes.length > 0 && codes[0].rawValue) {
              const raw = String(codes[0].rawValue).trim();
              const now = Date.now();
              if (raw !== lastCode || now - lastCodeAt > 1600) {
                lastCode = raw;
                lastCodeAt = now;
                await triggerScannedCode(raw);
              }
            }
          } catch (_) {}
        }
        if (scanLoopRunning) requestAnimationFrame(detectTick);
      };
      requestAnimationFrame(detectTick);
    } else {
      // Lazy-load @zxing/browser for iOS Safari / Firefox / Windows Chrome!
      engineStatus.textContent = `📍 ${activeStore.name} · ZXing Optical Scanner Live`;
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (!scanLoopRunning) return;
      const reader = new BrowserMultiFormatReader();
      zxingControls = await reader.decodeFromStream(activeStream, videoEl, (result) => {
        if (!scanLoopRunning || !result) return;
        const raw = String(result.getText() || '').trim();
        const now = Date.now();
        if (raw && (raw !== lastCode || now - lastCodeAt > 1600)) {
          lastCode = raw;
          lastCodeAt = now;
          triggerScannedCode(raw);
        }
      });
    }
  } catch (err) {
    if (engineStatus) {
      engineStatus.textContent = `Camera permission unavailable · Use search bar or test pills below`;
    }
  }
}

// ============================================================================
// PILLAR 3: AT THE TILL — SEQUENTIAL 1-BY-1 BARCODE DECK + TOP VOLUME BUTTON
// ============================================================================

export async function openSequentialTillCheckout({
  modalRoot,
  state,
  retailer,
  activeStore,
  cartItems,
  zar,
  payableTotal,
  totalSavings,
  automationCore,
  playAdvanceSound,
  onVoidCartItem,
  onCompleteCheckout,
  initialIndex = 0,
  showToast
}) {
  if (!cartItems || !cartItems.length) {
    showToast?.('Your trolley is empty — scan or search items first!');
    return;
  }

  const isShoprite = !retailer || retailer.id === 'shoprite';

  // Mutable working copy so shopper can void an item right at the till if needed
  let activeItems = cartItems.map((item) => {
    const rawCode = String(item.barcode || '').trim();
    const tillCode = isTemplateZeroScaleBarcode(rawCode)
      ? encodeShopriteScaleBarcodeForTill(rawCode, item.price)
      : rawCode;
    return {
      ...item,
      origBarcode: rawCode,
      barcode: tillCode,
      quantity: Math.max(1, Math.floor(item.quantity || 1))
    };
  });

  let xtraCard = isShoprite ? loadXtraSavingsCard() : null;
  let viewMode = 'one-by-one'; // 'one-by-one' | 'grouped-sku' | 'bulk-qr' | 'xtra-link'
  let previousScanMode = 'one-by-one';
  let soundMuted = false;
  let scanDeck = [];
  let currentIndex = Math.max(0, Number(initialIndex) || 0);
  let lastAdvanceAt = 0;
  let lastTriggerLabel = 'Ready — Scan First Barcode';
  let wakeLockSentinel = null;

  function computeTotals() {
    const livePayable = activeItems.reduce((s, it) => s + (Number(it.price) || 0) * it.quantity, 0);
    const liveRegular = activeItems.reduce((s, it) => s + (Number(it.basePrice || it.price) || 0) * it.quantity, 0);
    const liveSavings = Math.max(0, Number((liveRegular - livePayable).toFixed(2)));
    const totalGroceryUnits = activeItems.reduce((s, it) => s + it.quantity, 0);
    return {
      livePayable: Number(livePayable.toFixed(2)),
      liveSavings,
      totalGroceryUnits
    };
  }

  function rebuildScanDeck() {
    const nextDeck = [];
    if (xtraCard && xtraCard.cardNumber) {
      nextDeck.push({
        isLoyaltyCard: true,
        barcode: String(xtraCard.cardNumber).trim(),
        origBarcode: String(xtraCard.cardNumber).trim(),
        sku: 'XTRA-SAVINGS',
        name: 'Shoprite Xtra Savings Card',
        category: 'Loyalty',
        weight: 'Scan FIRST to unlock all branch deals',
        price: 0,
        basePrice: 0,
        image: '/logos/shoprite.svg',
        emoji: '💳',
        unitIndex: 1,
        unitCount: 1,
        lineTotal: 0
      });
    }

    const grouped = viewMode === 'grouped-sku' || (viewMode === 'xtra-link' && previousScanMode === 'grouped-sku');
    activeItems.forEach((item) => {
      const qty = Math.max(1, Math.floor(item.quantity || 1));
      if (grouped) {
        nextDeck.push({
          isLoyaltyCard: false,
          barcode: item.barcode,
          origBarcode: item.origBarcode,
          sku: item.sku || '',
          category: item.category || '',
          subCategory: item.subCategory || '',
          name: item.name,
          weight: item.weight || '1 unit',
          price: Number(item.price) || 0,
          basePrice: Number(item.basePrice || item.price) || 0,
          lineTotal: Number(((Number(item.price) || 0) * qty).toFixed(2)),
          image: item.image || '',
          emoji: item.emoji || '🛍️',
          unitIndex: 1,
          unitCount: qty,
          isGroupedMode: true
        });
      } else {
        for (let u = 1; u <= qty; u++) {
          nextDeck.push({
            isLoyaltyCard: false,
            barcode: item.barcode,
            origBarcode: item.origBarcode,
            sku: item.sku || '',
            category: item.category || '',
            subCategory: item.subCategory || '',
            name: item.name,
            weight: item.weight || '1 unit',
            price: Number(item.price) || 0,
            basePrice: Number(item.basePrice || item.price) || 0,
            lineTotal: Number(item.price) || 0,
            image: item.image || '',
            emoji: item.emoji || '🛍️',
            unitIndex: u,
            unitCount: qty,
            isGroupedMode: false
          });
        }
      }
    });

    scanDeck = nextDeck;
    if (currentIndex > scanDeck.length) {
      currentIndex = scanDeck.length;
    }
  }

  rebuildScanDeck();
  if (xtraCard?.cardNumber) {
    lastTriggerLabel = '💳 Scan Xtra Savings Card #1 first';
  }

  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      } catch (_) {}
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && state.overlay === 'till-checkout') {
      acquireWakeLock();
    }
  };

  // Acquire Screen Wake Lock + Native Android 100% Brightness & Hardware Volume-Up Hook
  automationCore.setTillCheckoutActive(true);
  await acquireWakeLock();
  document.addEventListener('visibilitychange', onVisibilityChange);

  state.overlay = 'till-checkout';

  const playTillTone = (isFinished) => {
    if (!soundMuted) {
      playAdvanceSound?.(isFinished);
    }
  };

  const cleanupTillMode = () => {
    automationCore.setTillCheckoutActive(false);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
    window.removeEventListener('keydown', onTillKeyDown, true);
    window.removeEventListener('automater:volume-up', onNativeVolumeUp);
    window.removeEventListener('automater:volume-down', onNativeVolumeDown);
    delete window.onAutomaterVolumeUp;
    delete window.onAutomaterVolumeDown;
    if (state.overlay === 'till-checkout') {
      state.overlay = null;
    }
  };

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="flex min-h-dvh w-screen flex-col justify-between bg-slate-950 text-white select-none" aria-labelledby="till-dialog-title">
        <div id="till-deck-root" class="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-4 pb-5 pt-3.5 pt-safe pb-safe"></div>
      </div>
    `,
    { closedBy: 'closerequest', onClose: cleanupTillMode }
  );

  if (!dialog) {
    cleanupTillMode();
    return;
  }

  const deckRoot = dialog.querySelector('#till-deck-root');

  function stepBarcode(delta, triggerSource = 'button') {
    const now = performance.now();
    // 110ms debounce prevents accidental double-fire from hardware switch bounce
    if (now - lastAdvanceAt < 110) return;
    lastAdvanceAt = now;

    if (viewMode === 'bulk-qr' || viewMode === 'xtra-link') {
      viewMode = previousScanMode;
      rebuildScanDeck();
    }

    if (delta > 0) {
      if (currentIndex < scanDeck.length) {
        const justScannedNum = currentIndex + 1;
        currentIndex += 1;
        const isFinished = currentIndex >= scanDeck.length;
        automationCore.vibrateTillStep(isFinished);
        playTillTone(isFinished);
        lastTriggerLabel = isFinished
          ? `✓ Scanned Final Barcode #${justScannedNum}!`
          : `✓ #${justScannedNum} Scanned (${triggerSource}) · Showing #${currentIndex + 1}`;
        renderDeck(true);
      }
    } else if (delta < 0) {
      if (currentIndex > 0) {
        currentIndex -= 1;
        automationCore.vibrateTillStep(false);
        playTillTone(false);
        lastTriggerLabel = `↩ Stepped back to Barcode #${currentIndex + 1}`;
        renderDeck(true);
      }
    }
  }

  function skipRemainingUnitsOfCurrentSku() {
    if (currentIndex >= scanDeck.length) return;
    const currentBarcode = scanDeck[currentIndex].barcode;
    let nextIdx = currentIndex + 1;
    while (nextIdx < scanDeck.length && scanDeck[nextIdx].barcode === currentBarcode) {
      nextIdx++;
    }
    currentIndex = nextIdx;
    const isFinished = currentIndex >= scanDeck.length;
    automationCore.vibrateTillStep(isFinished);
    playTillTone(isFinished);
    lastTriggerLabel = isFinished
      ? '✓ Skipped remaining SKU units · All Done!'
      : `⏭ Skipped SKU · Showing Barcode #${currentIndex + 1}`;
    renderDeck(true);
  }

  function switchScanMode(nextMode) {
    if (nextMode === viewMode) return;
    if (nextMode === 'one-by-one' || nextMode === 'grouped-sku') {
      previousScanMode = nextMode;
      viewMode = nextMode;
      currentIndex = 0;
      rebuildScanDeck();
      lastTriggerLabel = nextMode === 'grouped-sku'
        ? 'Grouped Mode — Tell cashier ×Qty per item'
        : '1-by-1 Mode — Press Top Volume (+) per beep';
      renderDeck(true);
      return;
    }
    viewMode = nextMode;
    renderDeck(false);
  }

  function onTillKeyDown(event) {
    if (state.overlay !== 'till-checkout') return;
    if (event.target?.tagName === 'INPUT') return;
    const key = event.key || '';
    const code = event.code || '';
    const kc = event.keyCode || 0;

    // TOP VOLUME BUTTON (Volume Up) + Desktop/HID Next keys
    const isVolumeUp =
      key === 'AudioVolumeUp' ||
      key === 'VolumeUp' ||
      code === 'VolumeUp' ||
      kc === 24 ||
      kc === 175;

    const isDesktopNext =
      key === 'ArrowRight' ||
      key === 'ArrowUp' ||
      key === 'PageUp' ||
      (key === ' ' && document.activeElement?.tagName !== 'BUTTON');

    if (isVolumeUp || isDesktopNext) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        stepBarcode(1, isVolumeUp ? 'Top Volume +' : 'Key');
      }
      return;
    }

    // BOTTOM VOLUME BUTTON (Volume Down) + Desktop Prev keys
    const isVolumeDown =
      key === 'AudioVolumeDown' ||
      key === 'VolumeDown' ||
      code === 'VolumeDown' ||
      kc === 25 ||
      kc === 174 ||
      key === 'ArrowLeft' ||
      key === 'ArrowDown';

    if (isVolumeDown) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        stepBarcode(-1, 'Volume −');
      }
    }
  }

  function onNativeVolumeUp() {
    stepBarcode(1, 'Top Volume +');
  }

  function onNativeVolumeDown() {
    stepBarcode(-1, 'Bottom Volume −');
  }

  window.addEventListener('keydown', onTillKeyDown, true);
  window.addEventListener('automater:volume-up', onNativeVolumeUp);
  window.addEventListener('automater:volume-down', onNativeVolumeDown);
  window.onAutomaterVolumeUp = onNativeVolumeUp;
  window.onAutomaterVolumeDown = onNativeVolumeDown;

  function renderModeSwitcherHtml() {
    const activeTab = viewMode === 'xtra-link' ? previousScanMode : viewMode;
    return `
      <div class="mt-2.5 grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-1">
        <button type="button" data-till-mode="one-by-one" class="rounded-xl py-1.5 text-[10.5px] font-black transition ${activeTab === 'one-by-one' ? 'bg-white text-slate-950 shadow' : 'text-white/75 hover:text-white'}">
          1-by-1 (Vol +)
        </button>
        <button type="button" data-till-mode="grouped-sku" class="rounded-xl py-1.5 text-[10.5px] font-black transition ${activeTab === 'grouped-sku' ? 'bg-white text-slate-950 shadow' : 'text-white/75 hover:text-white'}">
          Grouped ×Qty
        </button>
        <button type="button" data-till-mode="bulk-qr" class="rounded-xl py-1.5 text-[10.5px] font-black transition ${activeTab === 'bulk-qr' ? 'bg-white text-slate-950 shadow' : 'text-white/75 hover:text-white'}">
          2D Bulk QR
        </button>
      </div>
    `;
  }

  function renderXtraLinkDrawer() {
    deckRoot.innerHTML = `
      <div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-rose-400">Shoprite POS Loyalty</p>
            <h2 id="till-dialog-title" class="text-xl font-black">Xtra Savings Card at Till</h2>
          </div>
          <button id="till-xtra-back-btn" type="button" class="rounded-xl bg-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/25">← Back</button>
        </div>

        <div class="mt-4 rounded-3xl bg-white p-5 text-slate-950 shadow-2xl space-y-3.5">
          <div class="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-950">
            💳 Link your <strong>Xtra Savings</strong> card number once — it automatically becomes <strong>Barcode #1</strong> at the Shoprite till so all branch specials unlock!
          </div>

          <form id="till-inline-xtra-form" class="space-y-3">
            <label class="block text-xs font-black text-slate-700">
              Card Barcode Digits (8–16 digits)
              <input
                id="till-xtra-digits-input"
                type="text"
                inputmode="numeric"
                required
                minlength="8"
                maxlength="20"
                value="${escapeHtml(xtraCard?.cardNumber || '')}"
                placeholder="e.g. 6009880451292"
                class="mt-1.5 h-12 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 font-mono text-sm font-black text-slate-950 outline-none focus:border-[#e11d2e] focus:bg-white"
              />
            </label>

            <div class="flex gap-2">
              <button id="till-xtra-demo-btn" type="button" class="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-black text-[#e11d2e] hover:bg-rose-100">
                ⚡ Use Demo Xtra Card
              </button>
              ${xtraCard ? `
                <button id="till-xtra-clear-btn" type="button" class="rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600">
                  Unlink
                </button>
              ` : ''}
            </div>

            <button type="submit" class="w-full rounded-2xl bg-[#e11d2e] py-3.5 text-sm font-black text-white shadow-lg shadow-red-600/25 hover:bg-red-700">
              ✓ Save &amp; Prepend to Till Deck
            </button>
          </form>
        </div>
      </div>
      <div></div>
    `;

    deckRoot.querySelector('#till-xtra-back-btn')?.addEventListener('click', () => {
      viewMode = previousScanMode;
      renderDeck(false);
    });
    deckRoot.querySelector('#till-xtra-demo-btn')?.addEventListener('click', () => {
      const inp = deckRoot.querySelector('#till-xtra-digits-input');
      if (inp) inp.value = generateDemoXtraSavingsCardNumber();
    });
    deckRoot.querySelector('#till-xtra-clear-btn')?.addEventListener('click', () => {
      saveXtraSavingsCard('');
      xtraCard = null;
      viewMode = previousScanMode;
      currentIndex = 0;
      rebuildScanDeck();
      showToast?.('Unlinked Xtra Savings card');
      renderDeck(true);
    });
    deckRoot.querySelector('#till-inline-xtra-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const digits = (deckRoot.querySelector('#till-xtra-digits-input')?.value || '').replace(/\D/g, '');
      if (digits.length < 8) {
        showToast?.('Enter at least 8 digits');
        return;
      }
      xtraCard = saveXtraSavingsCard(digits);
      viewMode = previousScanMode;
      currentIndex = 0;
      rebuildScanDeck();
      lastTriggerLabel = '💳 Scan Xtra Savings Card #1 first!';
      showToast?.('💳 Xtra Savings Card added as Barcode #1!');
      renderDeck(true);
    });
  }

  async function renderBulkQrFallback() {
    const { livePayable, totalGroceryUnits } = computeTotals();
    const lines = [];
    if (xtraCard?.cardNumber) lines.push(xtraCard.cardNumber);
    activeItems.forEach((it) => {
      for (let i = 0; i < it.quantity; i++) lines.push(it.barcode);
    });
    const payload = lines.join('\r\n') + '\r\n';
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        width: 320,
        margin: 2
      });
    } catch (_) {}

    deckRoot.innerHTML = `
      <div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">${escapeHtml(activeStore.name)}</p>
            <h2 id="till-dialog-title" class="text-xl font-black">2D Bulk QR Stream</h2>
          </div>
          <button id="till-close-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/10 text-lg font-black text-white" aria-label="Exit till mode">✕</button>
        </div>

        ${renderModeSwitcherHtml()}

        <div class="mt-4 rounded-3xl bg-white p-5 text-center text-slate-950 shadow-2xl">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Bulk Till QR" class="mx-auto size-64 object-contain" />` : ''}
          <p class="mt-3 text-xs font-black text-slate-800">${totalGroceryUnits} grocery units${xtraCard ? ' + Xtra Card' : ''} · ${zar.format(livePayable)}</p>
          <p class="mt-1 text-[11px] text-slate-500">For 2D optical presentation scanners. For standard Shoprite 1D laser scanners, use <strong>1-by-1</strong> or <strong>Grouped ×Qty</strong>.</p>
        </div>
      </div>

      <button type="button" data-till-mode="one-by-one" class="mt-4 w-full rounded-2xl bg-[#e11d2e] py-3.5 text-xs font-black text-white shadow-lg">
        ← Back to 1-by-1 Barcode Mode (Top Volume Button)
      </button>
    `;

    deckRoot.querySelector('#till-close-btn')?.addEventListener('click', () => dialog.close());
    deckRoot.querySelectorAll('[data-till-mode]').forEach((btn) => {
      btn.addEventListener('click', () => switchScanMode(btn.dataset.tillMode));
    });
  }

  function renderDeck(animateFlip = false) {
    if (viewMode === 'xtra-link') {
      renderXtraLinkDrawer();
      return;
    }
    if (viewMode === 'bulk-qr') {
      renderBulkQrFallback();
      return;
    }

    const { livePayable, liveSavings, totalGroceryUnits } = computeTotals();
    const total = scanDeck.length;
    const isCompleted = currentIndex >= total;
    const scannedSubtotal = scanDeck
      .slice(0, currentIndex)
      .reduce((sum, s) => sum + (s.lineTotal || 0), 0);

    if (isCompleted) {
      const vat = calculateSaVatBreakdown(activeItems, livePayable);
      deckRoot.innerHTML = `
        <div class="overflow-y-auto pr-0.5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">✓ Shoprite POS Scan Complete</p>
              <h2 id="till-dialog-title" class="text-xl font-black">${escapeHtml(retailer.name)} Till Summary</h2>
            </div>
            <button id="till-close-btn" type="button" class="grid size-10 place-items-center rounded-xl bg-white/10 text-lg font-black text-white" aria-label="Close till checkout">✕</button>
          </div>

          <div class="barcode-card-flip mt-3.5 rounded-[2rem] bg-white p-5 text-center text-slate-950 shadow-2xl">
            <div class="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl">🎉</div>
            <h3 class="mt-2 text-lg font-black text-slate-950">All ${totalGroceryUnits} Grocery Units Scanned!</h3>
            <p class="mt-0.5 text-[11px] font-semibold text-slate-500">${escapeHtml(activeStore.name)} (#${escapeHtml(activeStore.retailerStoreCode)})</p>

            <div class="mt-3.5 rounded-2xl bg-slate-50 p-3.5 text-left space-y-1.5 border border-slate-200/80">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-500">Products Ringed Up</span>
                <strong class="font-black text-slate-950">${totalGroceryUnits} units (${activeItems.length} SKUs)</strong>
              </div>
              <div class="flex justify-between text-xs">
                <span class="font-bold text-slate-500">Xtra Savings Discount</span>
                <strong class="font-black text-emerald-600">−${zar.format(liveSavings)}</strong>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-dashed border-slate-200">
                <span>* Zero-Rated Basic Food (0% VAT)</span>
                <span class="font-bold text-slate-700">${zar.format(vat.zeroRatedTotal)}</span>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500">
                <span>15% SARS VAT Included</span>
                <span class="font-bold text-slate-700">${zar.format(vat.vatAmount15)}</span>
              </div>
              <div class="flex justify-between border-t border-slate-200 pt-2 text-base">
                <span class="font-black text-slate-900">Expected Till Total</span>
                <strong class="font-black text-[#e11d2e]">${zar.format(livePayable)}</strong>
              </div>
            </div>

            ${!xtraCard ? `
              <div class="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-left text-[11px] font-bold text-amber-950">
                <span>💳 Swipe your physical <strong>Xtra Savings</strong> card before paying!</span>
                <button id="till-done-link-xtra" type="button" class="shrink-0 rounded-lg bg-[#e11d2e] px-2.5 py-1 text-[10px] font-black text-white">Link Card</button>
              </div>
            ` : `
              <div class="mt-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] font-black text-emerald-800">
                ✓ Xtra Savings Card (${escapeHtml(formatPosBarcodeDigits(xtraCard.cardNumber))}) Scanned
              </div>
            `}

            <!-- Optional Cashier Till Variance Check -->
            <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 text-left">
              <label class="flex items-center justify-between gap-2 text-[10.5px] font-black text-slate-600">
                <span>Verify Cashier Screen Total (Optional):</span>
                <input id="till-cashier-verify-input" type="number" step="0.01" placeholder="${livePayable.toFixed(2)}" class="h-8 w-28 rounded-lg border border-slate-300 bg-white px-2 text-right font-mono text-xs font-black text-slate-950 outline-none focus:border-[#e11d2e]" />
              </label>
              <p id="till-variance-status" class="mt-1 text-[10.5px] font-bold text-slate-500 hidden"></p>
            </div>

            <!-- Re-scan individual item if cashier missed a beep -->
            <details class="mt-3 text-left">
              <summary class="cursor-pointer text-center text-[11px] font-black text-slate-500 hover:text-slate-800">Cashier missed a beep? Tap any barcode to re-show ▾</summary>
              <div class="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl bg-slate-100 p-2">
                ${scanDeck.map((s, idx) => `
                  <button type="button" data-jump-scan="${idx}" class="flex w-full items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-800 hover:bg-rose-50">
                    <span class="truncate">${idx + 1}. ${escapeHtml(s.name)} ${!s.isGroupedMode && s.unitCount > 1 ? `(${s.unitIndex}/${s.unitCount})` : s.isGroupedMode && s.unitCount > 1 ? `(×${s.unitCount})` : ''}</span>
                    <span class="shrink-0 font-mono text-[10px] text-[#e11d2e]">Re-scan ➔</span>
                  </button>
                `).join('')}
              </div>
            </details>
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <button id="till-finish-clear-btn" type="button" class="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[.985] transition">
            ✓ Paid at Till — Save Digital Slip &amp; Clear Trolley
          </button>
          <button id="till-step-back-from-done" type="button" class="w-full rounded-2xl bg-white/10 py-2.5 text-xs font-black text-white hover:bg-white/15 active:scale-98 transition">
            ← Back to Barcode #${total} (Bottom Volume −)
          </button>
        </div>
      `;

      deckRoot.querySelector('#till-close-btn')?.addEventListener('click', () => dialog.close());
      deckRoot.querySelector('#till-step-back-from-done')?.addEventListener('click', () => stepBarcode(-1, 'Back'));
      deckRoot.querySelector('#till-done-link-xtra')?.addEventListener('click', () => {
        viewMode = 'xtra-link';
        renderDeck(false);
      });

      const verifyInput = deckRoot.querySelector('#till-cashier-verify-input');
      const verifyStatus = deckRoot.querySelector('#till-variance-status');
      verifyInput?.addEventListener('input', () => {
        const val = parseFloat(verifyInput.value);
        if (!Number.isFinite(val) || !verifyStatus) {
          verifyStatus?.classList.add('hidden');
          return;
        }
        verifyStatus.classList.remove('hidden');
        const diff = Number((val - livePayable).toFixed(2));
        if (Math.abs(diff) <= 0.05) {
          verifyStatus.className = 'mt-1 text-[10.5px] font-black text-emerald-700';
          verifyStatus.textContent = '✓ Exact match with Shoprite POS till!';
        } else if (diff > 0) {
          verifyStatus.className = 'mt-1 text-[10.5px] font-black text-red-600';
          verifyStatus.textContent = `⚠️ Till is +${zar.format(diff)} higher — check Xtra Savings card or promo tag!`;
        } else {
          verifyStatus.className = 'mt-1 text-[10.5px] font-black text-emerald-700';
          verifyStatus.textContent = `🎉 Extra in-store markdown! Till is ${zar.format(Math.abs(diff))} cheaper!`;
        }
      });

      deckRoot.querySelectorAll('[data-jump-scan]').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentIndex = Number(btn.dataset.jumpScan);
          lastTriggerLabel = `↺ Re-scanning Barcode #${currentIndex + 1}`;
          renderDeck(true);
        });
      });

      deckRoot.querySelector('#till-finish-clear-btn')?.addEventListener('click', () => {
        onCompleteCheckout({
          items: activeItems.map((it) => ({
            barcode: it.barcode,
            origBarcode: it.origBarcode,
            name: it.name,
            weight: it.weight,
            price: it.price,
            basePrice: it.basePrice,
            quantity: it.quantity,
            category: it.category,
            emoji: it.emoji,
            image: it.image
          })),
          payableTotal: livePayable,
          totalSavings: liveSavings,
          xtraCardNumber: xtraCard?.cardNumber || null,
          scannedUnits: totalGroceryUnits
        });
        dialog.close();
      });
      return;
    }

    const current = scanDeck[currentIndex];
    const nextUp = scanDeck[currentIndex + 1] || null;
    const liveProgressPct = Math.round(((currentIndex + 1) / total) * 100);
    const isZeroVat = !current.isLoyaltyCard && isSaZeroRatedVatItem(current);

    deckRoot.innerHTML = `
      <!-- Top Header, Xtra Card Button, Mute & Mode Switcher -->
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-[10px] font-black uppercase tracking-widest text-emerald-400">
              ${escapeHtml(activeStore.name)} (#${escapeHtml(activeStore.retailerStoreCode)})
            </p>
            <h2 id="till-dialog-title" class="text-lg font-black tracking-tight">
              Barcode <span class="text-emerald-400">${currentIndex + 1}</span> of ${total}
            </h2>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            ${isShoprite ? `
              <button id="till-xtra-pill-btn" type="button" class="rounded-xl px-2.5 py-1.5 text-[10px] font-black transition ${xtraCard ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40' : 'bg-[#e11d2e] text-white shadow'}" title="Link or edit Shoprite Xtra Savings Card">
                ${xtraCard ? '💳 Xtra ✓' : '💳 + Xtra'}
              </button>
            ` : ''}
            <button id="till-mute-btn" type="button" class="grid size-9 place-items-center rounded-xl bg-white/10 text-sm text-white hover:bg-white/20" aria-label="${soundMuted ? 'Unmute till beep' : 'Mute till beep'}">
              ${soundMuted ? '🔇' : '🔊'}
            </button>
            <button id="till-close-btn" type="button" class="grid size-9 place-items-center rounded-xl bg-white/10 text-base font-black text-white hover:bg-white/20" aria-label="Exit till mode">✕</button>
          </div>
        </div>

        <!-- Running Till Subtotal & Progress Bar -->
        <div class="mt-1.5 flex items-center justify-between text-[10.5px] font-bold text-white/75">
          <span>Running Till Ring-Up: <strong class="font-mono text-white">${zar.format(scannedSubtotal + (current.lineTotal || 0))}</strong></span>
          <span>Basket Total: <strong class="font-mono text-emerald-300">${zar.format(livePayable)}</strong></span>
        </div>
        <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-200" style="width:${liveProgressPct}%"></div>
        </div>

        ${renderModeSwitcherHtml()}

        <!-- Upper Next-Product Controls + Physical Top Volume Guidance -->
        <div class="mt-2 flex items-center gap-2">
          <button
            id="till-upper-prev-btn"
            type="button"
            ${currentIndex === 0 ? 'disabled' : ''}
            class="rounded-xl bg-white/12 px-3 py-2 text-[11px] font-black text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            id="till-upper-next-btn"
            type="button"
            class="flex-1 rounded-xl py-2 px-3 text-xs font-black text-white shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
            style="background: ${currentIndex + 1 === total ? '#16a34a' : (retailer?.color || '#e11d2e')}"
          >
            <span>${currentIndex + 1 === total ? `✓ Finish Checkout (${total}/${total})` : `Next Barcode (${currentIndex + 2}/${total}) · or Press Vol + ➔`}</span>
          </button>
        </div>
      </div>

      <!-- High-Brightness Pure White 1D Laser Barcode Card -->
      <div id="till-barcode-card" class="${animateFlip ? 'barcode-card-flip' : ''} my-2.5 cursor-pointer rounded-[2rem] bg-white p-4 sm:p-5 text-slate-950 shadow-2xl ${current.isLoyaltyCard ? 'ring-4 ring-[#e11d2e]' : 'ring-4 ring-white/25'}" title="Tap, swipe left, or press Top Volume (+) for next barcode">
        ${current.isLoyaltyCard ? `
          <div class="-mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-3 rounded-t-[1.75rem] bg-gradient-to-r from-[#e11d2e] to-rose-700 px-4 py-2.5 text-left text-white">
            <p class="text-[9.5px] font-black uppercase tracking-widest text-white/85">Step 1 · Loyalty Discount Unlock</p>
            <p class="text-sm font-black">💳 Scan Xtra Savings Card First</p>
          </div>
        ` : `
          <!-- Product Header inside White Card -->
          <div class="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
            <div class="flex min-w-0 items-center gap-2.5">
              <div class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1">
                ${current.image
                  ? `<img src="${current.image}" alt="${escapeHtml(current.name)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'text-2xl\\'>${current.emoji}</span>';" />`
                  : `<span class="text-2xl">${current.emoji}</span>`}
              </div>
              <div class="min-w-0 text-left">
                <div class="flex flex-wrap items-center gap-1">
                  <span class="rounded-md bg-slate-950 px-1.5 py-0.5 text-[9px] font-black text-white">
                    BARCODE ${currentIndex + 1}/${total}
                  </span>
                  ${current.isGroupedMode && current.unitCount > 1 ? `
                    <span class="rounded-md bg-[#e11d2e] px-2 py-0.5 text-[9.5px] font-black text-white animate-pulse">
                      TELL CASHIER: QTY × ${current.unitCount}
                    </span>
                  ` : !current.isGroupedMode && current.unitCount > 1 ? `
                    <span class="rounded-md bg-[#e11d2e] px-1.5 py-0.5 text-[9px] font-black text-white">
                      UNIT ${current.unitIndex} OF ${current.unitCount}
                    </span>
                  ` : ''}
                  ${isZeroVat ? `<span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[8.5px] font-black text-emerald-800">0% VAT</span>` : ''}
                </div>
                <h3 class="mt-1 truncate text-sm font-black text-slate-950">${escapeHtml(current.name)}</h3>
                <p class="text-[11px] font-bold text-slate-500">
                  ${escapeHtml(current.weight)} · <strong class="text-slate-950">${current.isGroupedMode && current.unitCount > 1 ? `${current.unitCount} × ${zar.format(current.price)} = ${zar.format(current.lineTotal)}` : zar.format(current.price)}</strong>
                </p>
              </div>
            </div>
            ${activeItems.length > 1 ? `
              <button id="till-void-sku-btn" type="button" class="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9.5px] font-black text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Remove item from trolley at till">
                Void
              </button>
            ` : ''}
          </div>
        `}

        <!-- Crisp SVG 1D EAN-13 / EAN-8 / CODE128 Barcode with GS1 Quiet Zones -->
        <div class="my-2.5 flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-1.5">
          <svg id="till-active-barcode-svg" class="w-full max-w-[330px] h-auto"></svg>
          <div class="mt-1 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span class="font-mono font-black text-slate-800">${escapeHtml(formatPosBarcodeDigits(current.barcode))}</span>
            ${current.sku ? `<span>· #${escapeHtml(current.sku)}</span>` : ''}
          </div>
        </div>

        <!-- Live Step Status Strip -->
        <div class="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-1.5 text-[10.5px] font-black text-emerald-900 border border-emerald-200">
          <span class="truncate">${escapeHtml(lastTriggerLabel)}</span>
          <span class="shrink-0 font-mono text-[9.5px] text-emerald-700">100% Bright</span>
        </div>

        <!-- Step Dots / Quick Jump Pills -->
        ${total <= 18 ? `
          <div class="mt-2.5 flex items-center justify-center gap-1 flex-wrap">
            ${scanDeck.map((st, idx) => `
              <button
                type="button"
                data-till-jump="${idx}"
                class="h-6 min-w-6 rounded-lg px-1.5 text-[9.5px] font-black transition ${idx === currentIndex ? 'bg-slate-950 text-white shadow-xs' : idx < currentIndex ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"
                title="${escapeHtml(st.name)}"
              >
                ${st.isLoyaltyCard ? '💳' : idx < currentIndex ? '✓' : idx + 1}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Bottom Cashier Controls + Up Next Preview -->
      <div class="space-y-2">
        ${!current.isGroupedMode && !current.isLoyaltyCard && current.unitCount > 1 && current.unitIndex < current.unitCount ? `
          <button id="till-skip-sku-btn" type="button" class="w-full rounded-xl border border-amber-400/30 bg-amber-500/15 py-2 text-[10.5px] font-black text-amber-200 hover:bg-amber-500/25 active:scale-98 transition">
            Cashier typed Qty ×${current.unitCount} on till? Skip remaining ${current.unitCount - current.unitIndex} unit(s) ⏭
          </button>
        ` : ''}

        <div class="flex items-center gap-2">
          <button
            id="till-prev-btn"
            type="button"
            ${currentIndex === 0 ? 'disabled' : ''}
            class="rounded-2xl bg-white/10 px-4 py-3.5 text-xs font-black text-white hover:bg-white/20 disabled:opacity-30 active:scale-95 transition"
          >
            ← Prev
          </button>

          <button
            id="till-next-btn"
            type="button"
            class="flex-1 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[.985] transition"
          >
            ${currentIndex + 1 === total ? '✓ Last Barcode Scanned · Finish ➔' : `🔊 Next Barcode (${currentIndex + 2}/${total}) ➔`}
          </button>
        </div>

        <div class="flex items-center justify-between text-[11px] text-white/65 px-1">
          <span class="truncate">
            ${nextUp
              ? `Up next: <strong class="text-white">${escapeHtml(nextUp.name)}</strong> ${!nextUp.isGroupedMode && nextUp.unitCount > 1 ? `(${nextUp.unitIndex}/${nextUp.unitCount})` : nextUp.isGroupedMode && nextUp.unitCount > 1 ? `(×${nextUp.unitCount})` : ''}`
              : `<strong class="text-emerald-300">Final barcode in deck!</strong>`}
          </span>
          <span class="shrink-0 ml-2 font-mono text-[10px] text-white/50">Swipe ⇄</span>
        </div>
      </div>
    `;

    // Render crisp vector 1D barcode immediately
    const svgEl = deckRoot.querySelector('#till-active-barcode-svg');
    renderTill1DBarcodeSvg(svgEl, current.barcode);

    // Bind header & mode buttons
    deckRoot.querySelector('#till-close-btn')?.addEventListener('click', () => dialog.close());
    deckRoot.querySelector('#till-mute-btn')?.addEventListener('click', () => {
      soundMuted = !soundMuted;
      renderDeck(false);
    });
    deckRoot.querySelector('#till-xtra-pill-btn')?.addEventListener('click', () => {
      viewMode = 'xtra-link';
      renderDeck(false);
    });
    deckRoot.querySelectorAll('[data-till-mode]').forEach((btn) => {
      btn.addEventListener('click', () => switchScanMode(btn.dataset.tillMode));
    });

    // Bind Void SKU button
    deckRoot.querySelector('#till-void-sku-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeItems.length <= 1) return;
      const targetOrig = current.origBarcode;
      activeItems = activeItems.filter((it) => it.origBarcode !== targetOrig && it.barcode !== current.barcode);
      onVoidCartItem?.(targetOrig);
      rebuildScanDeck();
      if (currentIndex >= scanDeck.length) currentIndex = Math.max(0, scanDeck.length - 1);
      lastTriggerLabel = `🗑️ Voided ${current.name.slice(0, 18)}`;
      showToast?.(`Removed ${current.name} from Till Deck`);
      renderDeck(true);
    });

    // Bind Card Tap + Horizontal Touch Swipe (Left = Next, Right = Prev)
    const cardEl = deckRoot.querySelector('#till-barcode-card');
    let touchStartX = null;
    let touchStartY = null;
    cardEl?.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    cardEl?.addEventListener('touchend', (e) => {
      if (touchStartX == null || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) stepBarcode(1, 'Swipe');
        else stepBarcode(-1, 'Swipe Back');
      }
    }, { passive: true });

    cardEl?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      stepBarcode(1, 'Card Tap');
    });

    deckRoot.querySelector('#till-prev-btn')?.addEventListener('click', () => stepBarcode(-1, 'Prev Button'));
    deckRoot.querySelector('#till-next-btn')?.addEventListener('click', () => stepBarcode(1, 'Tap Next'));
    deckRoot.querySelector('#till-upper-prev-btn')?.addEventListener('click', () => stepBarcode(-1, 'Upper Prev'));
    deckRoot.querySelector('#till-upper-next-btn')?.addEventListener('click', () => stepBarcode(1, 'Upper Next'));
    deckRoot.querySelector('#till-skip-sku-btn')?.addEventListener('click', skipRemainingUnitsOfCurrentSku);
    deckRoot.querySelectorAll('[data-till-jump]').forEach((jumpBtn) => {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(jumpBtn.dataset.tillJump, 10);
        if (Number.isFinite(idx) && idx >= 0 && idx < scanDeck.length) {
          currentIndex = idx;
          lastTriggerLabel = `↳ Jumped to Barcode #${idx + 1}`;
          renderDeck(true);
        }
      });
    });
  }

  renderDeck(true);
}

// ============================================================================
// PRODUCT DETAILS, GS1 BARCODE & 9-PROVINCE REGIONAL PRICE SHEET (<dialog>)
// ============================================================================
export function openProductQuickViewModal({
  modalRoot,
  state,
  product,
  activeStore,
  zar,
  getStorePrice,
  onAddToTrolley,
  onChangeQty,
  onAddToList,
  getCartQty
}) {
  if (!product || !modalRoot) return;
  const barcode = product.barcode || product.gtin || '';
  const priceMeta = getStorePrice(product, activeStore.id);
  const activeProvCode = String(activeStore?.provinceCode || activeStore?.regionCode || 'GP').toUpperCase();
  const provOrder = ['GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'];

  const regionalRows = provOrder.map((code) => {
    const hub = SHOPRITE_PROVINCE_HUBS[code] || { code, name: code, dc: 'Regional Hub' };
    const rp = product.regionalPrices?.[code];
    const promo = rp ? Number(rp.promo ?? rp.regular) : priceMeta.activePrice;
    const regular = rp ? Number(rp.regular ?? promo) : priceMeta.regularPrice;
    return {
      code,
      name: hub.name,
      dc: hub.dc,
      promo,
      regular,
      isCurrent: code === activeProvCode
    };
  });

  const minProvPrice = Math.min(...regionalRows.map((r) => r.promo));

  state.overlay = 'product-detail';

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="mx-auto flex h-dvh w-full max-w-xl flex-col justify-end sm:justify-center sm:p-4" aria-labelledby="prod-sheet-title">
        <div class="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-white shadow-2xl border border-slate-200">
          <!-- Header Strip -->
          <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
            <div class="flex items-center gap-2 min-w-0">
              <span class="rounded-lg bg-[#e11d2e] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                ${escapeHtml(priceMeta.dealBadge || `${activeProvCode} XTRA SAVINGS`)}
              </span>
              <span class="truncate text-[11px] font-bold text-slate-500">
                ${escapeHtml(priceMeta.aisle || product.category)}
              </span>
            </div>
            <button id="prod-sheet-close" type="button" class="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200/80 text-sm font-black text-slate-700 hover:bg-slate-300 active:scale-95 transition" aria-label="Close product details">✕</button>
          </div>

          <!-- Scrollable Body -->
          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <!-- Hero Packshot + Core Product Info -->
            <div class="flex flex-col sm:flex-row items-center gap-4">
              <div class="relative flex size-40 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <img
                  src="${escapeHtml(product.imageUrl || `/products/${barcode}.jpg`)}"
                  alt="${escapeHtml(product.name || product.title)}"
                  width="160"
                  height="160"
                  class="max-h-36 w-auto object-contain"
                />
                ${priceMeta.hasPromo && priceMeta.savingsPct > 0 ? `
                  <span class="absolute left-2 top-2 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                    SAVE ${priceMeta.savingsPct}%
                  </span>
                ` : ''}
              </div>

              <div class="min-w-0 flex-1 text-center sm:text-left">
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  <span class="text-[#e11d2e]">${escapeHtml(product.brand || 'Shoprite')}</span>
                  <span>·</span>
                  <span>${escapeHtml(product.subCategory || product.category)}</span>
                  ${product.sku ? `<span>· SKU #${escapeHtml(product.sku)}</span>` : ''}
                </div>
                <h2 id="prod-sheet-title" class="mt-1 text-base font-black leading-snug text-slate-950">
                  ${escapeHtml(product.name || product.title)}
                </h2>
                <p class="mt-0.5 text-xs font-bold text-slate-500">${escapeHtml(product.weight || '1 unit')}</p>

                <!-- Active Store Exact Regional Price Box -->
                <div class="mt-3 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 via-white to-amber-50/60 p-3 text-left">
                  <div class="flex items-baseline justify-between gap-2">
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-wider text-[#e11d2e]">
                        📍 ${escapeHtml(activeStore.name)} (${activeProvCode})
                      </p>
                      <div class="mt-0.5 flex items-baseline gap-2">
                        <span class="text-2xl font-black tracking-tight text-slate-950">${zar.format(priceMeta.activePrice)}</span>
                        ${priceMeta.hasPromo ? `
                          <span class="text-xs font-bold text-slate-400 line-through">${zar.format(priceMeta.regularPrice)}</span>
                        ` : ''}
                      </div>
                    </div>
                    ${priceMeta.hasPromo ? `
                      <span class="rounded-xl bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                        Save ${zar.format(priceMeta.savings)}
                      </span>
                    ` : ''}
                  </div>
                  <p class="mt-1 text-[10.5px] font-semibold text-slate-600">
                    ${escapeHtml(priceMeta.dealType)} · Hub: ${escapeHtml(priceMeta.distributionHub || 'Shoprite DC')}
                  </p>
                </div>
              </div>
            </div>

            ${product.description ? `
              <p class="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 border border-slate-100">
                ${escapeHtml(product.description)}
              </p>
            ` : ''}

            <!-- 9-Province Specific Regional Price Matrix -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <div>
                  <h3 class="text-xs font-black uppercase tracking-wider text-slate-900">9-Province Shoprite Regional Prices</h3>
                  <p class="text-[10.5px] font-semibold text-slate-500">Live Xtra Savings leaflet & regional distribution hub pricing</p>
                </div>
                <span class="rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">ZAR</span>
              </div>

              <div class="grid grid-cols-3 gap-1.5">
                ${regionalRows.map((row) => {
                  const isCheapest = row.promo <= minProvPrice + 0.01;
                  return `
                    <div class="rounded-xl border px-2.5 py-2 transition ${
                      row.isCurrent
                        ? 'border-[#e11d2e] bg-red-50/90 ring-1 ring-[#e11d2e]/30'
                        : isCheapest
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-slate-200/80 bg-white'
                    }">
                      <div class="flex items-center justify-between gap-1">
                        <span class="text-[10px] font-black ${row.isCurrent ? 'text-[#e11d2e]' : 'text-slate-700'}">
                          ${escapeHtml(row.code)}${row.isCurrent ? ' · HERE' : ''}
                        </span>
                        ${isCheapest ? '<span class="text-[9px] font-black text-emerald-700">LOW</span>' : ''}
                      </div>
                      <p class="mt-0.5 text-xs font-black text-slate-950">${zar.format(row.promo)}</p>
                      <p class="truncate text-[9.5px] font-semibold text-slate-400">${escapeHtml(row.name)}</p>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Verified Physical GS1 Barcode Preview -->
            <div class="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 px-1 mb-1">
                <span>Verified GS1 Till Barcode (${isValidGs1Ean8(barcode) ? 'EAN-8' : 'EAN-13'})${isSaZeroRatedVatItem(product) ? ' · 0% VAT' : ''}</span>
                <span class="font-mono text-slate-700">${escapeHtml(isTemplateZeroScaleBarcode(barcode) ? encodeShopriteScaleBarcodeForTill(barcode, priceMeta.activePrice) : barcode)}</span>
              </div>
              <div class="flex justify-center">
                <svg id="prod-sheet-barcode-svg" class="w-full max-w-[260px] h-auto"></svg>
              </div>
            </div>
          </div>

          <!-- Sticky Action Footer -->
          <div id="prod-sheet-footer" class="border-t border-slate-200 bg-white px-4 py-3 pb-safe flex items-center gap-2.5"></div>
        </div>
      </div>
    `,
    {
      closedBy: 'any',
      onClose: () => {
        if (state.overlay === 'product-detail') state.overlay = null;
      }
    }
  );

  if (!dialog) return;

  const barcodeSvg = dialog.querySelector('#prod-sheet-barcode-svg');
  const displayTillBarcode = isTemplateZeroScaleBarcode(barcode)
    ? encodeShopriteScaleBarcodeForTill(barcode, priceMeta.activePrice)
    : barcode;
  renderTill1DBarcodeSvg(barcodeSvg, displayTillBarcode, { height: 68 });

  dialog.querySelector('#prod-sheet-close')?.addEventListener('click', () => dialog.close());

  function renderFooterActions() {
    const footer = dialog.querySelector('#prod-sheet-footer');
    if (!footer) return;
    const qty = getCartQty(barcode);

    footer.innerHTML = `
      <button
        id="prod-sheet-list-btn"
        type="button"
        class="rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-3.5 text-xs font-black text-slate-800 hover:bg-slate-200 active:scale-95 transition"
      >
        📝 + List
      </button>

      ${qty > 0 ? `
        <div class="flex flex-1 items-center justify-between rounded-2xl bg-slate-950 px-3 py-2 text-white shadow-lg">
          <button id="prod-sheet-dec" type="button" class="grid size-9 place-items-center rounded-xl bg-white/15 text-base font-black hover:bg-white/25 active:scale-95 transition" aria-label="Decrease quantity">−</button>
          <div class="text-center">
            <p class="text-xs font-black">${qty} in Trolley</p>
            <p class="text-[10px] font-bold text-emerald-400">${zar.format(priceMeta.activePrice * qty)} total</p>
          </div>
          <button id="prod-sheet-inc" type="button" class="grid size-9 place-items-center rounded-xl bg-emerald-500 text-base font-black text-slate-950 hover:bg-emerald-400 active:scale-95 transition" aria-label="Increase quantity">+</button>
        </div>
      ` : `
        <button
          id="prod-sheet-add-btn"
          type="button"
          class="flex-1 rounded-2xl bg-[#e11d2e] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-600/25 hover:bg-red-700 active:scale-[.985] transition"
        >
          🛒 Put in Trolley · ${zar.format(priceMeta.activePrice)}
        </button>
      `}
    `;

    footer.querySelector('#prod-sheet-list-btn')?.addEventListener('click', () => {
      onAddToList(product);
    });
    footer.querySelector('#prod-sheet-add-btn')?.addEventListener('click', () => {
      onAddToTrolley(barcode);
      renderFooterActions();
    });
    footer.querySelector('#prod-sheet-dec')?.addEventListener('click', () => {
      onChangeQty(barcode, -1);
      renderFooterActions();
    });
    footer.querySelector('#prod-sheet-inc')?.addEventListener('click', () => {
      onChangeQty(barcode, 1);
      renderFooterActions();
    });
  }

  renderFooterActions();
}

// ============================================================================
// ALL RETAIL-PAR SUPERMARKET DEPARTMENTS DIRECTORY MODAL (<dialog>)
// ============================================================================
export function openAllDepartmentsModal({
  modalRoot,
  state,
  departments,
  products,
  activeCategory,
  onSelectDepartment
}) {
  if (!modalRoot) return;
  state.overlay = 'departments';

  const counts = new Map();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }

  const dialog = mountModalDialog(
    modalRoot,
    `
      <div class="mx-auto flex h-dvh w-full max-w-2xl flex-col justify-end sm:justify-center sm:p-4" aria-labelledby="aisles-modal-title">
        <div class="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-white shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">Shoprite Supermarket Layout</p>
              <h2 id="aisles-modal-title" class="text-base font-black">Browse All ${departments.length} Retail Aisles (${products.length} Products)</h2>
            </div>
            <button id="aisles-modal-close" type="button" class="grid size-9 place-items-center rounded-full bg-white/15 text-sm font-black text-white hover:bg-white/25 active:scale-95 transition" aria-label="Close aisles directory">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <button
              type="button"
              data-pick-dept="all"
              class="mb-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                activeCategory === 'all'
                  ? 'border-[#e11d2e] bg-red-50/90 text-slate-950 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900'
              }"
            >
              <div class="flex items-center gap-3">
                <span class="grid size-10 place-items-center rounded-xl bg-[#e11d2e] text-lg text-white shadow-sm">🏬</span>
                <div>
                  <p class="text-sm font-black">All Shoprite Departments</p>
                  <p class="text-[11px] font-semibold text-slate-500">View complete store catalogue across all ${departments.length} aisles</p>
                </div>
              </div>
              <span class="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">${products.length}</span>
            </button>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              ${departments.map((dept) => {
                const count = counts.get(dept.id) || 0;
                const isSelected = activeCategory === dept.id;
                return `
                  <button
                    type="button"
                    data-pick-dept="${escapeHtml(dept.id)}"
                    class="flex items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[.99] ${
                      isSelected
                        ? 'border-[#e11d2e] bg-red-50/80 ring-1 ring-[#e11d2e]/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }"
                  >
                    <span class="grid size-11 shrink-0 place-items-center rounded-2xl text-2xl shadow-xs" style="background:${escapeHtml(dept.softBg || '#f8fafc')}; border: 1px solid ${escapeHtml(dept.color || '#cbd5e1')}30">
                      ${dept.emoji}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-1">
                        <p class="truncate text-xs font-black text-slate-950">${escapeHtml(dept.id)}</p>
                        <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-black text-slate-700">${count}</span>
                      </div>
                      <p class="text-[10px] font-extrabold uppercase tracking-wider mt-0.5" style="color:${escapeHtml(dept.color || '#475569')}">
                        ${escapeHtml(dept.aisle || '')}
                      </p>
                      <p class="mt-1 line-clamp-1 text-[10.5px] font-medium text-slate-500">
                        ${escapeHtml((dept.subCategories || []).join(' · '))}
                      </p>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `,
    {
      closedBy: 'any',
      onClose: () => {
        if (state.overlay === 'departments') state.overlay = null;
      }
    }
  );

  if (!dialog) return;
  dialog.querySelector('#aisles-modal-close')?.addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('[data-pick-dept]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const deptId = btn.dataset.pickDept || 'all';
      dialog.close();
      onSelectDepartment(deptId);
    });
  });
}
