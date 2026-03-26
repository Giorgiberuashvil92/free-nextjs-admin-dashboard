/**
 * იგივე ლოგიკა რაც news-feed-ზე: პასუხი შეიძლება იყოს მასივი ან { data: T[] } / { success, data }.
 * apiGetJson არ აშლის `data`-ს — აქ ვაერთიანებთ.
 */

export function unwrapApiArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && raw !== null) {
    const d = (raw as { data?: unknown }).data;
    if (Array.isArray(d)) return d as T[];
    if (d && typeof d === "object" && !Array.isArray(d)) {
      const items = (d as { items?: unknown }).items;
      if (Array.isArray(items)) return items as T[];
    }
  }
  return [];
}

/** ობიექტი: პირდაპირ ან { data: { ... } } */
export function unwrapApiObject<T extends object>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return { ...fallback, ...(inner as T) };
  }
  return { ...fallback, ...(o as T) };
}

/** სტატისტიკის ენდპოინტები: { data: { totalLogins } } ან პირდაპირ ობიექტი */
export function unwrapStatsPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as Record<string, unknown>;
  return o as Record<string, unknown>;
}
