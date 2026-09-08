import { ProduceItem } from '../types';
import { PRODUCE_ITEMS } from '../data/produceData';
import { safeResponseJson } from './safeFetch';

const STORAGE_KEY = 'freshlane_produce_catalog_v2';
const EVENT_NAME = 'freshlane_produce_updated';

// Initialize or retrieve catalog
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

// Save catalog and notify listeners
function saveCatalog(items: ProduceItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
  } catch (err) {
    console.error('Error saving produce catalog:', err);
  }
}

// Update price for today
export function updateDailyPrice(id: string, newPrice: number): ProduceItem[] {
  const catalog = getProduceCatalog();
  const updated = catalog.map((item) =>
    item.id === id ? { ...item, price: Math.max(1, Math.round(newPrice)) } : item
  );
  saveCatalog(updated);
  return updated;
}

// Toggle availability for today
export function toggleDailyAvailability(id: string, isAvailable?: boolean): ProduceItem[] {
  const catalog = getProduceCatalog();
  const updated = catalog.map((item) => {
    if (item.id === id) {
      const nextVal = isAvailable !== undefined ? isAvailable : !(item.isAvailableToday ?? true);
      return { ...item, isAvailableToday: nextVal };
    }
    return item;
  });
  saveCatalog(updated);
  return updated;
}

// Add new fruit or vegetable available today
export function addDailyProduce(item: ProduceItem): ProduceItem[] {
  const catalog = getProduceCatalog();
  // Check if exists
  const existingIdx = catalog.findIndex((p) => p.id === item.id);
  let updated: ProduceItem[];
  if (existingIdx >= 0) {
    updated = catalog.map((p) => (p.id === item.id ? item : p));
  } else {
    updated = [item, ...catalog];
  }
  saveCatalog(updated);
  return updated;
}

// Remove or delete produce item
export function deleteProduceItem(id: string): ProduceItem[] {
  const catalog = getProduceCatalog();
  const updated = catalog.filter((item) => item.id !== id);
  saveCatalog(updated);
  return updated;
}

// Update stock in kg / bundles
export function updateStock(id: string, newStock: number): ProduceItem[] {
  const catalog = getProduceCatalog();
  const updated = catalog.map((item) =>
    item.id === id ? { ...item, inStockKg: Math.max(0, Math.round(newStock)) } : item
  );
  saveCatalog(updated);
  return updated;
}

// Reset catalog to initial defaults
export function resetCatalogToDefault(): ProduceItem[] {
  saveCatalog(PRODUCE_ITEMS);
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
 * Dynamically fetches the fresh produce catalog from GET /api/products with cache-busting
 */
export async function fetchRemoteCatalog(): Promise<ProduceItem[]> {
  try {
    const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
    const endpoint = cfUrl ? `${cfUrl}/api/products?_t=${Date.now()}` : `/api/products?_t=${Date.now()}`;
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
        saveCatalog(data.products);
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Could not load remote product catalog:', err);
  }
  return getProduceCatalog();
}

/**
 * Updates a product via PUT /api/admin/products/:id directly in the backend database
 */
export async function updateRemoteProduct(
  id: string,
  updates: Partial<ProduceItem>,
  sessionToken?: string
): Promise<{ success: boolean; product?: ProduceItem; error?: string }> {
  try {
    const cfUrl = typeof window !== 'undefined' ? (localStorage.getItem('freshlane_cloudflare_url') || '').trim().replace(/\/$/, '') : '';
    const endpoint = cfUrl ? `${cfUrl}/api/admin/products/${id}` : `/api/admin/products/${id}`;
    const token = sessionToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('freshlane_session_token') || '' : '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-session-token'] = token;
    }

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    const data: any = await safeResponseJson(res, { success: false, error: 'Server connection failed' });
    if (res.ok && data?.success && data?.product) {
      // Synchronize in local store and notify subscribers
      const catalog = getProduceCatalog();
      const updated = catalog.map((p) => (p.id === id ? { ...p, ...data.product } : p));
      saveCatalog(updated);
      return { success: true, product: data.product };
    }

    return { success: false, error: data?.error || 'Failed to update product' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product' };
  }
}

