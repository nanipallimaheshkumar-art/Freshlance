import { ProduceItem } from '../types';
import { PRODUCE_ITEMS } from '../data/produceData';
import { safeResponseJson } from './safeFetch';

const STORAGE_KEY = 'freshlane_produce_catalog_v2';
const VERSION_KEY = 'freshlane_produce_catalog_version';
const EVENT_NAME = 'freshlane_produce_updated';
const BROADCAST_CHANNEL_NAME = 'freshlane_produce_sync';

// Cross-tab broadcast channel for zero-latency local synchronization
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

let currentLocalVersion = 1;
try {
  if (typeof localStorage !== 'undefined') {
    const savedVer = localStorage.getItem(VERSION_KEY);
    if (savedVer) currentLocalVersion = parseInt(savedVer, 10) || 1;
  }
} catch {}

// Initialize or retrieve local cached catalog
export function getProduceCatalog(): ProduceItem[] {
  if (typeof window === 'undefined') return PRODUCE_ITEMS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCE_ITEMS));
      return PRODUCE_ITEMS;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading produce catalog:', err);
  }
  return PRODUCE_ITEMS;
}

// Save catalog and notify all local listeners + other open tabs
function saveCatalog(items: ProduceItem[], version?: number, broadcast = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (version !== undefined) {
      currentLocalVersion = version;
      localStorage.setItem(VERSION_KEY, String(version));
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));

    if (broadcast && broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CATALOG_SYNC',
        version: currentLocalVersion,
        items,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.error('Error saving produce catalog:', err);
  }
}

// Listen for cross-tab broadcasts
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'CATALOG_SYNC' && Array.isArray(event.data.items)) {
      saveCatalog(event.data.items, event.data.version, false);
    }
  };
}

// Fallback storage event listener for cross-window sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: parsed }));
        }
      } catch {}
    }
  });
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'x-admin-key': '132908',
  };
  try {
    const token = localStorage.getItem('freshlane_session_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }
  } catch {}
  return headers;
}

function getApiBase(): string {
  try {
    const cfUrl = (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '');
    return cfUrl;
  } catch {
    return '';
  }
}

// Update price for today with instant local update + automatic cloud database sync
export function updateDailyPrice(id: string, newPrice: number): ProduceItem[] {
  const rounded = Math.max(1, Math.round(newPrice));
  const catalog = getProduceCatalog();
  const updated = catalog.map((item) =>
    item.id === id ? { ...item, price: rounded, pricePerKg: rounded } : item
  );
  saveCatalog(updated, currentLocalVersion + 1);

  // Sync to remote server asynchronously
  updateRemoteProduct(id, { price: rounded, pricePerKg: rounded }).catch((err) => {
    console.warn('Failed to sync price update to remote server:', err);
  });

  return updated;
}

// Toggle availability for today with instant local update + automatic cloud database sync
export function toggleDailyAvailability(id: string, isAvailable?: boolean): ProduceItem[] {
  const catalog = getProduceCatalog();
  let nextVal = true;
  const updated = catalog.map((item) => {
    if (item.id === id) {
      nextVal = isAvailable !== undefined ? isAvailable : !(item.isAvailableToday ?? true);
      return { ...item, isAvailableToday: nextVal };
    }
    return item;
  });
  saveCatalog(updated, currentLocalVersion + 1);

  // Sync to remote server
  updateRemoteProduct(id, { isAvailableToday: nextVal }).catch((err) => {
    console.warn('Failed to sync availability to remote server:', err);
  });

  return updated;
}

// Add new fruit or vegetable available today with cloud database sync
export function addDailyProduce(item: ProduceItem): ProduceItem[] {
  const catalog = getProduceCatalog();
  const existingIdx = catalog.findIndex((p) => p.id === item.id);
  let updated: ProduceItem[];
  if (existingIdx >= 0) {
    updated = catalog.map((p) => (p.id === item.id ? item : p));
  } else {
    updated = [item, ...catalog];
  }
  saveCatalog(updated, currentLocalVersion + 1);

  // Sync to remote server
  createRemoteProduct(item).catch((err) => {
    console.warn('Failed to sync new product to remote server:', err);
  });

  return updated;
}

// Remove or delete produce item with cloud database sync
export function deleteProduceItem(id: string): ProduceItem[] {
  const catalog = getProduceCatalog();
  const updated = catalog.filter((item) => item.id !== id);
  saveCatalog(updated, currentLocalVersion + 1);

  // Sync to remote server
  deleteRemoteProduct(id).catch((err) => {
    console.warn('Failed to sync product deletion to remote server:', err);
  });

  return updated;
}

// Update stock in kg / bundles
export function updateStock(id: string, newStock: number): ProduceItem[] {
  const rounded = Math.max(0, Math.round(newStock));
  const catalog = getProduceCatalog();
  const updated = catalog.map((item) =>
    item.id === id ? { ...item, inStockKg: rounded } : item
  );
  saveCatalog(updated, currentLocalVersion + 1);

  // Sync to remote server
  updateRemoteProduct(id, { inStockKg: rounded }).catch((err) => {
    console.warn('Failed to sync stock to remote server:', err);
  });

  return updated;
}

// Reset catalog to initial defaults
export function resetCatalogToDefault(): ProduceItem[] {
  saveCatalog(PRODUCE_ITEMS, 1);
  return PRODUCE_ITEMS;
}

// Subscribe to catalog changes
export function subscribeProduceCatalog(callback: (items: ProduceItem[]) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<ProduceItem[]>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getProduceCatalog());
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

/**
 * Dynamically fetches the fresh produce catalog from GET /api/products with cache-busting.
 * Ensures inactive devices opening the app or active devices refreshing get the exact latest menu & prices.
 */
export async function fetchRemoteCatalog(): Promise<ProduceItem[]> {
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/products?_t=${Date.now()}` : `/api/products?_t=${Date.now()}`;
    const res = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (res.ok) {
      const data = await safeResponseJson(res, null);
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        const newVer = typeof data.version === 'number' ? data.version : currentLocalVersion;
        saveCatalog(data.products, newVer);
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Could not load remote product catalog:', err);
  }
  return getProduceCatalog();
}

/**
 * Checks lightweight version endpoint. If changed, triggers full catalog fetch.
 */
export async function checkCatalogVersionAndSync(): Promise<boolean> {
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/products/version?_t=${Date.now()}` : `/api/products/version?_t=${Date.now()}`;
    const res = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (res.ok) {
      const data = await safeResponseJson(res, null);
      if (data && typeof data.version === 'number') {
        if (data.version !== currentLocalVersion) {
          await fetchRemoteCatalog();
          return true;
        }
      }
    }
  } catch {
    // Network or server offline; ignore
  }
  return false;
}

/**
 * Updates a product via PUT /api/admin/products/:id directly in the backend database
 */
export async function updateRemoteProduct(
  id: string,
  updates: Partial<ProduceItem>,
  sessionToken?: string
): Promise<{ success: boolean; product?: ProduceItem; broadcasted?: boolean; error?: string }> {
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/admin/products/${id}` : `/api/admin/products/${id}`;
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success && data?.product) {
      const catalog = getProduceCatalog();
      const updated = catalog.map((p) => (p.id === id ? { ...p, ...data.product } : p));
      saveCatalog(updated, data.version || currentLocalVersion + 1, true);
      return { success: true, product: data.product, broadcasted: Boolean(data.broadcasted) };
    }

    return { success: false, error: data?.error || 'Failed to update product' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product' };
  }
}

/**
 * Creates a new product in the remote backend database
 */
export async function createRemoteProduct(
  item: ProduceItem,
  sessionToken?: string
): Promise<{ success: boolean; product?: ProduceItem; error?: string }> {
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/admin/products` : `/api/admin/products`;
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success && data?.product) {
      return { success: true, product: data.product };
    }
    return { success: false, error: data?.error || 'Failed to create product' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product' };
  }
}

/**
 * Deletes a product from the remote backend database
 */
export async function deleteRemoteProduct(
  id: string,
  sessionToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/admin/products/${id}` : `/api/admin/products/${id}`;
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers,
    });

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success) {
      return { success: true };
    }
    return { success: false, error: data?.error || 'Failed to delete product' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product' };
  }
}

/**
 * Global Real-Time Sync Coordinator:
 * - Real-Time Server-Sent Events (SSE) stream for instant sub-second price/stock updates
 * - Multi-Tab BroadcastChannel & Storage Event synchronization
 * - Active devices: polls version every 4 seconds as a fallback
 * - Inactive devices: immediately refreshes when user wakes phone, unlocks screen, or switches to tab (visibilitychange / focus)
 * - Connection restoration: immediately refreshes when device comes online
 */
let syncIntervalId: any = null;
let isSyncInitialized = false;
let catalogEventSource: EventSource | null = null;

function setupCatalogEventSource() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (catalogEventSource) {
    try {
      catalogEventSource.close();
    } catch {}
    catalogEventSource = null;
  }

  try {
    const base = getApiBase();
    const streamUrl = base ? `${base}/api/products/stream` : '/api/products/stream';
    const es = new EventSource(streamUrl);
    catalogEventSource = es;

    es.onmessage = (event) => {
      try {
        if (!event.data || event.data.trim() === '' || event.data.startsWith(':')) return;
        const payload = JSON.parse(event.data);
        if (payload && Array.isArray(payload.catalog) && payload.catalog.length > 0) {
          const newVer = typeof payload.version === 'number' ? payload.version : currentLocalVersion + 1;
          saveCatalog(payload.catalog, newVer, true);
        } else if (payload && payload.product) {
          const existing = getProduceCatalog();
          const updated = existing.map((p) => (p.id === payload.product.id ? { ...p, ...payload.product } : p));
          const newVer = typeof payload.version === 'number' ? payload.version : currentLocalVersion + 1;
          saveCatalog(updated, newVer, true);
        }
      } catch (err) {
        console.warn('[ProduceStream] Failed to parse SSE message:', err);
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        catalogEventSource = null;
      }
    };
  } catch (err) {
    console.warn('[ProduceStream] EventSource initialization notice:', err);
  }
}

export function initCatalogSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isSyncInitialized) return () => {};
  isSyncInitialized = true;

  // 1. Initial fetch when application opens
  fetchRemoteCatalog();

  // 2. Real-time sub-second SSE connection
  setupCatalogEventSource();

  // 3. Fallback poll every 4 seconds for active devices
  syncIntervalId = setInterval(() => {
    checkCatalogVersionAndSync();
  }, 4000);

  // 4. When an inactive device re-opens / user returns to tab
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchRemoteCatalog();
      if (!catalogEventSource || catalogEventSource.readyState === EventSource.CLOSED) {
        setupCatalogEventSource();
      }
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 5. When window/app gains focus
  const handleFocus = () => {
    fetchRemoteCatalog();
    if (!catalogEventSource || catalogEventSource.readyState === EventSource.CLOSED) {
      setupCatalogEventSource();
    }
  };
  window.addEventListener('focus', handleFocus);

  // 6. When internet reconnects
  const handleOnline = () => {
    fetchRemoteCatalog();
    setupCatalogEventSource();
  };
  window.addEventListener('online', handleOnline);

  return () => {
    if (syncIntervalId) clearInterval(syncIntervalId);
    if (catalogEventSource) {
      try {
        catalogEventSource.close();
      } catch {}
      catalogEventSource = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
    isSyncInitialized = false;
  };
}
