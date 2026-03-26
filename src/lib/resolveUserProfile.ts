import { apiGetJson } from "@/lib/api";

export type ResolvedUserRow = {
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
};

function unwrapSingleUser(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object") return null;
  const o = res as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return o;
}

function pickResolved(u: Record<string, unknown>): ResolvedUserRow {
  return {
    phone: typeof u.phone === "string" ? u.phone : undefined,
    firstName: typeof u.firstName === "string" ? u.firstName : undefined,
    lastName: typeof u.lastName === "string" ? u.lastName : undefined,
    role: typeof u.role === "string" ? u.role : undefined,
    email: typeof u.email === "string" ? u.email : undefined,
  };
}

export function resolvedDisplayName(r: ResolvedUserRow): string {
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
}

/** ერთი userId → Users API (ჯერ /users/:id, შემდეგ q=) */
export async function fetchUserProfileById(userId: string): Promise<ResolvedUserRow | null> {
  if (!userId || userId.length < 10) return null;
  try {
    const res = await apiGetJson<unknown>(`/users/${userId}`);
    const u = unwrapSingleUser(res);
    if (u) {
      const id = String(u.id ?? u._id ?? "");
      if (id === userId) return pickResolved(u);
    }
  } catch {
    /* 404 */
  }
  try {
    const res = await apiGetJson<{ success?: boolean; data?: unknown[] } | unknown[]>(
      `/users?q=${encodeURIComponent(userId)}&limit=40`
    );
    const list: unknown[] = Array.isArray(res) ? res : Array.isArray((res as { data?: unknown[] })?.data) ? (res as { data: unknown[] }).data : [];
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const u = row as Record<string, unknown>;
      if (String(u.id ?? u._id ?? "") === userId) return pickResolved(u);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function resolveUsersInParallel(
  userIds: string[],
  concurrency: number,
  onEach: (id: string, row: ResolvedUserRow | null) => void
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const cursor = { n: 0 };
  const worker = async () => {
    for (;;) {
      const idx = cursor.n++;
      if (idx >= unique.length) break;
      const id = unique[idx]!;
      const row = await fetchUserProfileById(id);
      onEach(id, row);
    }
  };
  const workers = Math.min(Math.max(1, concurrency), Math.max(1, unique.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

/** რადარის/სხვა ობიექტიდან Mongo userId-ის ძებნა (ბექის სხვადასხვა ველის სახელით) */
export function extractUserIdFromRecord(r: Record<string, unknown>): string | undefined {
  const keys = [
    "userId",
    "user_id",
    "createdBy",
    "created_by",
    "reportedBy",
    "reported_by",
    "submittedBy",
    "submitted_by",
    "addedBy",
    "added_by",
  ];
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) return v;
  }
  return undefined;
}
