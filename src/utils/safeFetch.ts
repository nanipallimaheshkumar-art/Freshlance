/**
 * Safe JSON fetch and response parsing utilities to prevent JSON parse crashes
 * caused by unexpected HTML responses (e.g., fallback index.html, 502/504 Bad Gateway,
 * or proxy pages).
 */

export async function safeResponseJson<T = any>(
  res: Response,
  fallback: T = {} as T
): Promise<T> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return fallback;
    }
    const text = await res.text();
    if (!text || !text.trim()) {
      return fallback;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return fallback;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export async function safeFetchJson<T = any>(
  url: RequestInfo | URL,
  init?: RequestInit,
  fallback: T = {} as T
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(url, init);
    const data = await safeResponseJson<T>(res, fallback);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: fallback };
  }
}
