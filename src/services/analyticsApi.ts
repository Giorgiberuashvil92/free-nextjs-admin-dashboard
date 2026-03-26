import { apiGetJson } from '@/lib/api';
import { unwrapApiArray, unwrapApiObject } from '@/lib/unwrapApiResponse';

export interface UserInfo {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  isVerified: boolean;
  createdAt?: number;
}

export interface UserEvent {
  id: string;
  eventType: string;
  eventName: string;
  screen: string;
  params: Record<string, any>;
  paramsFormatted?: string;
  timestamp: number;
  date: string;
  dateFormatted?: string;
}

export interface UserEventsResponse {
  userId: string;
  userInfo?: UserInfo;
  events: UserEvent[];
  totalEvents?: number;
  firstEvent?: string;
  lastEvent?: string;
}

export interface AllUsersEventsItem {
  userId: string;
  userInfo?: UserInfo;
  eventsCount: number;
  events: UserEvent[];
  lastActivity: number;
  lastActivityFormatted?: string;
}

function normalizeUserBucket(raw: unknown): AllUsersEventsItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const events = Array.isArray(o.events) ? (o.events as UserEvent[]) : [];
  const uid = String(o.userId ?? '');
  if (!uid && events.length === 0) return null;
  return {
    userId: uid || 'unknown',
    userInfo: o.userInfo as UserInfo | undefined,
    eventsCount: typeof o.eventsCount === 'number' ? o.eventsCount : events.length,
    events,
    lastActivity: typeof o.lastActivity === 'number' ? o.lastActivity : 0,
    lastActivityFormatted: o.lastActivityFormatted as string | undefined,
  };
}

/**
 * Get events for a specific user
 */
export async function getUserEvents(
  userId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'week',
  limit: number = 100
): Promise<UserEventsResponse> {
  const params = new URLSearchParams({
    userId,
    limit: limit.toString(),
  });
  if (period !== 'all') {
    params.set('period', period);
  }

  const raw = await apiGetJson<unknown>(`/analytics/user-events?${params.toString()}`);
  const merged = unwrapApiObject<UserEventsResponse>(
    raw,
    { userId, events: [] } as UserEventsResponse
  );
  const events = Array.isArray(merged.events) ? merged.events : [];
  return {
    ...merged,
    userId: String(merged.userId || userId),
    events,
    totalEvents: merged.totalEvents ?? events.length,
  };
}

/**
 * Get events for all users
 */
export async function getAllUsersEvents(
  period: 'today' | 'week' | 'month' | 'all' = 'week',
  limit?: number
): Promise<AllUsersEventsItem[]> {
  const params = new URLSearchParams();
  if (limit !== undefined && limit > 0) {
    params.append('limit', limit.toString());
  }
  if (period !== 'all') {
    params.append('period', period);
  }

  const queryString = params.toString();
  const url = queryString ? `/analytics/all-users-events?${queryString}` : '/analytics/all-users-events';

  const raw = await apiGetJson<unknown>(url);
  const arr = unwrapApiArray<unknown>(raw);
  const out: AllUsersEventsItem[] = [];
  for (const item of arr) {
    const n = normalizeUserBucket(item);
    if (n) out.push(n);
  }
  return out;
}
