const BACKEND_URL = "https://marte-backend-production.up.railway.app";
// Use proxy in development to avoid CORS issues
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  const json = (await res.json().catch(() => ({}))) as unknown;
  const unwrapped = (json as any)?.data ?? json; // eslint-disable-line @typescript-eslint/no-explicit-any
  return unwrapped as T;
}

export async function apiGet<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  return handle<T>(res);
}

// Return full JSON without unwrapping `data` (useful when meta fields are needed)
export async function apiGetJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const text = typeof json === 'string' ? json : JSON.stringify(json as object);
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  return json as T;
}

export async function apiPost<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    ...init,
  });
  return handle<T>(res);
}

export { API_BASE };

export async function apiPut<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    ...init,
  });
  return handle<T>(res);
}

export async function apiPatch<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
    ...init,
  });
  return handle<T>(res);
}

export async function apiDelete<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  return handle<T>(res);
}


