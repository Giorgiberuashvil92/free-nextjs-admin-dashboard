import { apiGetJson } from '@/lib/api';

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

/**
 * Get events for a specific user
 * @param userId - User ID (required)
 * @param period - Time period: 'today' | 'week' | 'month' (default: 'week')
 * @param limit - Events limit (default: 100)
 */
export async function getUserEvents(
  userId: string,
  period: 'today' | 'week' | 'month' = 'week',
  limit: number = 100
): Promise<UserEventsResponse> {
  const params = new URLSearchParams({
    userId,
    period,
    limit: limit.toString(),
  });

  const response = await apiGetJson<UserEventsResponse>(`/analytics/user-events?${params.toString()}`);
  return response || { userId, events: [] };
}

/**
 * Get events for all users
 * @param period - Time period: 'today' | 'week' | 'month' | 'all' (default: 'week')
 * @param limit - Total events limit (default: 500, use 0 or undefined for no limit)
 */
export async function getAllUsersEvents(
  period: 'today' | 'week' | 'month' | 'all' = 'week',
  limit?: number
): Promise<AllUsersEventsItem[]> {
  const params = new URLSearchParams();
  
  // თუ limit არის მითითებული და 0-ზე მეტია, ვამატებთ limit პარამეტრს
  // თუ limit არ არის მითითებული ან 0-ია, limit პარამეტრს არ ვამატებთ (API-ს ყველა მონაცემი დააბრუნებს)
  if (limit !== undefined && limit > 0) {
    params.append('limit', limit.toString());
  }
  
  // თუ period არის 'all', არ ვამატებთ period პარამეტრს
  if (period !== 'all') {
    params.append('period', period);
  }

  const queryString = params.toString();
  const url = queryString 
    ? `/analytics/all-users-events?${queryString}`
    : '/analytics/all-users-events';
    
  const response = await apiGetJson<AllUsersEventsItem[]>(url);
  return Array.isArray(response) ? response : [];
}
