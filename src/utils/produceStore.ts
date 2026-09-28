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
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'x-admin-key': '132908',
  };
  try {
    const token =
      (typeof localStorage !== 'undefined' && localStorage.getItem('freshlane_session_token')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('freshlane_session_token')) ||
      '';
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

// Update price for today by sending an API request directly to backend database
export async function updateDailyPrice(
  id: string,
  newPrice: number
): Promise<{ success: boolean; catalog: ProduceItem[]; error?: string }> {
  const rounded = Math.max(1, Math.round(newPrice));
  
  // Send API request (PUT or POST) directly to save new price to backend database
  const res = await updateRemoteProduct(id, { price: rounded, pricePerKg: rounded });
  const latest = getProduceCatalog();
  return {
    success: res.success,
    catalog: latest,
    error: res.error,
  };
}

// Toggle availability for today with cloud database sync
export async function toggleDailyAvailability(id: string, isAvailable?: boolean): Promise<{ success: boolean; catalog: ProduceItem[]; error?: string }> {
  const catalog = getProduceCatalog();
  const currentItem = catalog.find((p) => p.id === id);
  const nextVal = isAvailable !== undefined ? isAvailable : !(currentItem?.isAvailableToday ?? true);

  const res = await updateRemoteProduct(id, { isAvailableToday: nextVal });
  return {
    success: res.success,
    catalog: getProduceCatalog(),
    error: res.error,
  };
}

// Add new fruit or vegetable available today with cloud database sync
export async function addDailyProduce(item: ProduceItem): Promise<{ success: boolean; catalog: ProduceItem[]; error?: string }> {
  const res = await createRemoteProduct(item);
  return {
    success: res.success,
    catalog: getProduceCatalog(),
    error: res.error,
  };
}

// Remove or delete produce item with cloud database sync
export async function deleteProduceItem(id: string): Promise<{ success: boolean; catalog: ProduceItem[]; error?: string }> {
  const res = await deleteRemoteProduct(id);
  return {
    success: res.success,
    catalog: getProduceCatalog(),
    error: res.error,
  };
}

// Update stock in kg / bundles
export async function updateStock(id: string, newStock: number): Promise<{ success: boolean; catalog: ProduceItem[]; error?: string }> {
  const rounded = Math.max(0, Math.round(newStock));
  const res = await updateRemoteProduct(id, { inStockKg: rounded });
  return {
    success: res.success,
    catalog: getProduceCatalog(),
    error: res.error,
  };
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
 * Dynamically fetches the fresh produce catalog directly from GET /api/products with cache-busting.
 * Completely bypasses any stale browser/proxy caches to ensure live prices are shown.
 */
export async function fetchRemoteCatalog(forceBypassCache = true): Promise<ProduceItem[]> {
  try {
    const cacheBuster = `_t=${Date.now()}&_r=${Math.random().toString(36).substring(2, 8)}`;
    const endpoint = `/api/products?${cacheBuster}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (res.ok) {
      const data = await safeResponseJson(res, null);
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        const newVer = typeof data.version === 'number' ? data.version : currentLocalVersion + 1;
        saveCatalog(data.products, newVer, true);
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Could not load remote product catalog:', err);
  }
  return getProduceCatalog();
}

/**
 * Clears local product cache and requests backend cache purge, returning fresh products.
 */
export async function clearProductCache(): Promise<ProduceItem[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(VERSION_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(VERSION_KEY);
    }
  } catch {}

  // Request backend cache clear
  try {
    const base = getApiBase();
    const endpoint = base ? `${base}/api/products/cache/clear` : `/api/products/cache/clear`;
    await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('Backend cache clear notice:', err);
  }

  return await fetchRemoteCatalog(true);
}

/**
 * Checks lightweight version endpoint. If changed, triggers full fresh catalog fetch.
 */
export async function checkCatalogVersionAndSync(): Promise<boolean> {
  try {
    const base = getApiBase();
    const cacheBuster = `_t=${Date.now()}&_r=${Math.random().toString(36).substring(2, 8)}`;
    const endpoint = base ? `${base}/api/products/version?${cacheBuster}` : `/api/products/version?${cacheBuster}`;
    const res = await fetch(endpoint, {
      method: 'GET',
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
          await fetchRemoteCatalog(true);
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
 * Updates a product via PUT or POST /api/admin/products/:id directly in the backend database
 */
export async function updateRemoteProduct(
  id: string,
  updates: Partial<ProduceItem>,
  sessionToken?: string
): Promise<{ success: boolean; product?: ProduceItem; broadcasted?: boolean; error?: string }> {
  try {
    const payload = {
      ...updates,
      id,
      adminSecret: '132908',
    };
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    // 1. Try PUT request to save new price/details directly to backend database
    let res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    // 2. If PUT fails or is rejected, fallback to POST request
    if (!res.ok) {
      res = await fetch(`/api/admin/products/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    // 3. Fallback to /api/products/:id if needed
    if (!res.ok) {
      res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        res = await fetch(`/api/products/${id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }
    }

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success && data?.product) {
      const catalog = getProduceCatalog();
      const updated = catalog.map((p) => (p.id === id ? { ...p, ...data.product } : p));
      saveCatalog(updated, data.version || currentLocalVersion + 1, true);
      return { success: true, product: data.product, broadcasted: Boolean(data.broadcasted) };
    }

    return { success: false, error: data?.error || `Failed to update product in database (HTTP ${res.status})` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to backend database' };
  }
}

/**
 * Creates a new product directly in the backend database
 */
export async function createRemoteProduct(
  item: ProduceItem,
  sessionToken?: string
): Promise<{ success: boolean; product?: ProduceItem; error?: string }> {
  try {
    const payload = {
      ...item,
      adminSecret: '132908',
    };
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    let res = await fetch('/api/admin/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success && data?.product) {
      const catalog = getProduceCatalog();
      const existingIdx = catalog.findIndex((p) => p.id === data.product.id);
      const updated = existingIdx >= 0
        ? catalog.map((p) => (p.id === data.product.id ? data.product : p))
        : [data.product, ...catalog];
      saveCatalog(updated, data.version || currentLocalVersion + 1, true);
      return { success: true, product: data.product };
    }
    return { success: false, error: data?.error || `Failed to create product in database (HTTP ${res.status})` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product in database' };
  }
}

/**
 * Deletes a product directly from the backend database
 */
export async function deleteRemoteProduct(
  id: string,
  sessionToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = getAuthHeaders();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      headers['x-session-token'] = sessionToken;
    }

    let res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ adminSecret: '132908' }),
    });

    if (!res.ok) {
      res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ adminSecret: '132908' }),
      });
    }

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success) {
      const catalog = getProduceCatalog();
      const updated = catalog.filter((item) => item.id !== id);
      saveCatalog(updated, data.version || currentLocalVersion + 1, true);
      return { success: true };
    }
    return { success: false, error: data?.error || `Failed to delete product from database (HTTP ${res.status})` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product from database' };
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
        } else if (payload && (payload.type === 'PRODUCT_UPDATED' || payload.type === 'PRODUCT_CREATED' || payload.type === 'PRODUCT_DELETED')) {
          fetchRemoteCatalog(true);
        }
      } catch (err) {
        console.warn('[ProduceStream] Failed to parse SSE message:', err);
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        catalogEventSource = null;
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (!catalogEventSource) setupCatalogEventSource();
        }, 3000);
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

  // 1. Initial direct fresh fetch when application opens
  fetchRemoteCatalog(true);

  // 2. Real-time sub-second SSE connection
  setupCatalogEventSource();

  // 3. Fallback poll every 3 seconds for active devices to ensure real-time dynamic pricing
  syncIntervalId = setInterval(() => {
    checkCatalogVersionAndSync();
  }, 3000);

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
