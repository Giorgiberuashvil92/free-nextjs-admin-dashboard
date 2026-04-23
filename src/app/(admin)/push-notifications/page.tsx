'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { apiGetJson, API_BASE } from '@/lib/api';
import {
  type ResolvedUserRow,
  resolvedDisplayName,
  resolveUsersInParallel,
} from '@/lib/resolveUserProfile';

/** Types **/
type ConsentStatus = 'granted' | 'denied' | 'blocked' | 'snoozed' | 'never';
type ConsentItem = {
  userId: string;
  phone?: string;
  name?: string;
  status: ConsentStatus;
  platform?: 'ios' | 'android';
  updatedAt?: string;
  tokenPrefix?: string;
  deviceName?: string;
  modelName?: string;
  appVersion?: string;
};
type ConsentSummary = {
  totalUsers: number;
  totalDevices: number;
  granted: number;
  denied: number;
  blocked: number;
  snoozed: number;
  never: number;
};
type ConsentResponse = { summary: ConsentSummary; items: ConsentItem[] };

type SendToType = 'active' | 'role' | 'userIds';
type NotificationType =
  | 'general'
  | 'review'
  | 'carfax'
  | 'subscription_activated'
  | 'garage_reminder'
  | 'chat_message'
  | 'support_chat'
  | 'carwash_booking'
  | 'new_request'
  | 'new_offer'
  | 'parts_request'
  | 'fuel_discount'
  | 'ai_recommendation'
  | 'offer_status'
  | 'radar'
  | 'radar_alert';

type UserStats = { total: number; active: number; byRole: Record<string, number> };
type User = { id: string; phone: string; firstName?: string; lastName?: string; email?: string; role?: string; isActive?: boolean; avatar?: string; profileImage?: string };
type FinesCacheSummary = {
  userId: string;
  total: number;
  active: number;
  unpaidActive: number;
};
type UnpaidUserRow = {
  userId: string;
  unpaidCount: number;
  activeVehicles: number;
};

/** Config **/
const STATUS_LABELS: Record<ConsentStatus, string> = {
  granted: 'ჩართული',
  denied: 'უარი',
  blocked: 'დაბლოკილი (OS)',
  snoozed: 'მოგვიანებით',
  never: 'აღარ მაჩვენო',
};
const STATUS_COLORS: Record<ConsentStatus, string> = {
  granted: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  denied: 'bg-rose-100 text-rose-800 border border-rose-200',
  blocked: 'bg-amber-100 text-amber-800 border border-amber-200',
  snoozed: 'bg-blue-100 text-blue-800 border border-blue-200',
  never: 'bg-gray-100 text-gray-700 border border-gray-200',
};
const STATUS_FILTERS: Array<{ value: ConsentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'ყველა' },
  { value: 'granted', label: 'ჩართული' },
  { value: 'denied', label: 'უარი' },
  { value: 'blocked', label: 'დაბლოკილი (OS)' },
  { value: 'snoozed', label: 'მოგვიანებით' },
  { value: 'never', label: 'აღარ მაჩვენო' },
];

type NotificationTypeConfig = { type: NotificationType; label: string; screen: string; icon: string; description: string };
const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  { type: 'general', label: 'General', screen: 'Notifications', icon: '📢', description: 'ზოგადი შეტყობინება' },
  { type: 'review', label: 'Review Us', screen: 'Review', icon: '⭐', description: 'გადავა Review სქრინზე' },
  { type: 'carfax', label: 'Carfax', screen: 'Carfax', icon: '🚗', description: 'გადავა Carfax სქრინზე' },
  { type: 'subscription_activated', label: 'Subscription Activated', screen: 'Premium', icon: '💎', description: 'გადავა Home-ზე Premium Modal-ით' },
  { type: 'garage_reminder', label: 'Garage Reminder', screen: 'Garage', icon: '⏰', description: 'გადავა Garage სქრინზე' },
  { type: 'chat_message', label: 'Chat Message', screen: 'Chat', icon: '💬', description: 'გადავა Chat სქრინზე' },
  {
    type: 'support_chat',
    label: 'საპორტი (ჩატი)',
    screen: 'support-chat',
    icon: '🛟',
    description:
      'აპში გადავა საპორტის საუბარზე (/support-chat/conversation) — იგივე type/screen რაც pushNavigation / UserContext',
  },
  { type: 'carwash_booking', label: 'Carwash Booking', screen: 'Bookings', icon: '🚿', description: 'გადავა Bookings სქრინზე' },
  { type: 'new_request', label: 'New Request', screen: 'RequestDetails', icon: '🆕', description: 'გადავა Offers/Request სქრინზე' },
  { type: 'new_offer', label: 'New Offer', screen: 'OfferDetails', icon: '💰', description: 'გადავა Offers სქრინზე' },
  {
    type: 'parts_request',
    label: 'ნაწილის მოთხოვნა',
    screen: 'PartsRequests',
    icon: '🔧',
    description: 'გადავა ნაწილის მოთხოვნის გვერდზე (Marte /parts-requests)',
  },
  {
    type: 'fuel_discount',
    label: 'საწვავის ფასდაკლება',
    screen: 'ExclusiveFuelOffer',
    icon: '⛽',
    description: 'გადავა Marte −17 თეთრით ფასდაკლება / exclusive-fuel-offer გვერდზე',
  },
  { type: 'ai_recommendation', label: 'AI Recommendation', screen: 'AIRecommendations', icon: '🤖', description: 'გადავა All Requests სქრინზე' },
  { type: 'offer_status', label: 'Offer Status', screen: 'OfferDetails', icon: '📊', description: 'გადავა Offers სქრინზე' },
  {
    type: 'radar',
    label: 'რადარები',
    screen: 'radars',
    icon: '📡',
    description: 'აპში გადავა რადარების გვერდზე (/radars)',
  },
  {
    type: 'radar_alert',
    label: 'რადარის გაფრთხილება',
    screen: 'radars',
    icon: '🚨',
    description: 'რადარის alert — აპში გადავა /radars გვერდზე',
  },
];

const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

export default function PushNotificationsPage() {
  /** Consent state */
  const [consentData, setConsentData] = useState<ConsentResponse | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConsentStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  /** Broadcast state */
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notificationType, setNotificationType] = useState<NotificationType>('general');
  const [sendToType, setSendToType] = useState<SendToType>('active');
  const [role, setRole] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; total: number; failed?: number } | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [resolvedUsers, setResolvedUsers] = useState<Record<string, ResolvedUserRow>>({});
  const [resolvingUsers, setResolvingUsers] = useState(false);
  const [finesUserId, setFinesUserId] = useState('');
  const [finesLoading, setFinesLoading] = useState(false);
  const [finesCache, setFinesCache] = useState<FinesCacheSummary | null>(null);
  const [finesActionLoading, setFinesActionLoading] = useState(false);
  const [unpaidUsers, setUnpaidUsers] = useState<UnpaidUserRow[]>([]);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [manualTitle, setManualTitle] = useState('🚨 ჯარიმების შეხსენება');
  const [manualBody, setManualBody] = useState('გადაამოწმე ახალი ჯარიმები აპში — შესაძლოა გაქვს გადასახდელი ჩანაწერები.');
  const [deleteSaId, setDeleteSaId] = useState('');

  /** Load consent data */
  const loadConsent = useCallback(async () => {
    try {
      setConsentLoading(true);
      setConsentError(null);
      const res = await apiGetJson<{ success: boolean; data: ConsentResponse }>('/notifications/consent/analytics');
      if (res.success && res.data) setConsentData(res.data);
      else setConsentError('მონაცემები ვერ ჩაიტვირთა');
    } catch (e: any) {
      setConsentError(e?.message || 'შეცდომა');
    } finally {
      setConsentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  /** consent-ის userId → /users — სახელი/ტელეფონი ცხრილში */
  useEffect(() => {
    if (!consentData?.items?.length) return;
    const ids = consentData.items.map((i) => i.userId).filter(Boolean);
    setResolvedUsers({});
    let cancelled = false;
    setResolvingUsers(true);
    (async () => {
      await resolveUsersInParallel(ids, 6, (id, row) => {
        if (cancelled || !row) return;
        setResolvedUsers((prev) => ({ ...prev, [id]: row }));
      });
      if (!cancelled) setResolvingUsers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [consentData]);

  const filteredConsent = useMemo(() => {
    if (!consentData) return [];
    return consentData.items.filter((item) => {
      const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      const q = search.trim().toLowerCase();
      const r = resolvedUsers[item.userId];
      const rName = r ? resolvedDisplayName(r).toLowerCase() : '';
      const rPhone = (r?.phone || '').toLowerCase();
      const rEmail = (r?.email || '').toLowerCase();
      const matchesSearch =
        !q ||
        item.userId.toLowerCase().includes(q) ||
        (item.phone && item.phone.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        rName.includes(q) ||
        rPhone.includes(q) ||
        rEmail.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [consentData, statusFilter, search, resolvedUsers]);

  /** Load user stats */
  const loadUserStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [allUsersRes, activeUsersRes] = await Promise.all([
        apiGetJson<{ success: boolean; total: number; data: any[] }>('/users?limit=1'),
        apiGetJson<{ success: boolean; total: number; data: any[] }>('/users?active=true&limit=1'),
      ]);
      const total = allUsersRes.total || 0;
      const active = activeUsersRes.total || 0;
      const roles = ['user', 'customer', 'partner', 'owner', 'admin'];
      const byRole: Record<string, number> = {};
      await Promise.all(
        roles.map(async (r) => {
          try {
            const res = await apiGetJson<{ success: boolean; total: number }>(`/users?role=${r}&limit=1`);
            byRole[r] = res.total || 0;
          } catch {
            byRole[r] = 0;
          }
        })
      );
      setUserStats({ total, active, byRole });
    } catch (error) {
      console.error('Error loading user stats:', error);
      setUserStats({ total: 0, active: 0, byRole: {} });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  /** User search */
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setUserSearchResults([]);
        setShowUserDropdown(false);
        return;
      }
      try {
        setSearchingUsers(true);
        const res = await apiGetJson<{ success: boolean; data: User[]; total: number }>(
          `/users?q=${encodeURIComponent(query)}&limit=10`
        );
        const users = res.data || [];
        setUserSearchResults(users.filter((u) => !selectedUsers.some((s) => s.id === u.id)));
        setShowUserDropdown(true);
      } catch (error) {
        console.error('Error searching users:', error);
        setUserSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    },
    [selectedUsers]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery) searchUsers(userSearchQuery);
      else {
        setUserSearchResults([]);
        setShowUserDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, searchUsers]);

  /** Helpers */
  const addUser = (user: User) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
      setUserSearchQuery('');
      setShowUserDropdown(false);
    }
  };
  const removeUser = (userId: string) => setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  const getTargetCount = (): number => {
    if (!userStats) return 0;
    if (sendToType === 'active') return userStats.active;
    if (sendToType === 'role' && role) {
      const roleCount = userStats.byRole[role] || 0;
      return activeOnly ? Math.min(roleCount, userStats.active) : roleCount;
    }
    if (sendToType === 'userIds') return selectedUsers.length;
    return 0;
  };

  /** Send broadcast */
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert('გთხოვთ შეიყვანოთ title და body');
      return;
    }
    if (sendToType === 'role' && !role) {
      alert('გთხოვთ აირჩიოთ role');
      return;
    }
    if (sendToType === 'userIds' && selectedUsers.length === 0) {
      alert('გთხოვთ აირჩიოთ მინიმუმ ერთი user');
      return;
    }

    const targetCount = getTargetCount();
    let confirmMessage = `ნამდვილად გსურთ გაგზავნა?\n\nTitle: ${title}\nBody: ${body}\n\n`;
    if (sendToType === 'role') confirmMessage += `მიმღები: Role "${role}"${activeOnly ? ' (მხოლოდ active)' : ''} (${targetCount} მომხმარებელი)`;
    else if (sendToType === 'active') confirmMessage += `მიმღები: მხოლოდ active (${targetCount})`;
    else if (sendToType === 'userIds') {
      const names = selectedUsers.slice(0, 3).map((u) => (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.phone || u.id)).join(', ');
      confirmMessage += `მიმღები: ${selectedUsers.length} user${selectedUsers.length > 3 ? '...' : ''} (${names}${selectedUsers.length > 3 ? '...' : ''})`;
    }
    if (!confirm(confirmMessage)) return;

    setSending(true);
    setLastResult(null);
    try {
      const typeConfig = NOTIFICATION_TYPES.find((t) => t.type === notificationType) || NOTIFICATION_TYPES[0];
      const requestBody: any = {
        title: title.trim(),
        body: body.trim(),
        data: { type: typeConfig.type, screen: typeConfig.screen, timestamp: new Date().toISOString() },
      };
      if (sendToType === 'active') requestBody.active = true;
      if (sendToType === 'role') {
        requestBody.role = role;
        if (activeOnly) requestBody.active = true;
      }
      if (sendToType === 'userIds') requestBody.userIds = selectedUsers.map((u) => u.id);

      const res = await fetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      const result = await res.json();
      const sent = result.sent ?? 0;
      const failed = result.failed ?? 0;
      setLastResult({ sent, total: sent + failed, failed });
      alert(result.message || (failed > 0 ? `${sent} მივიდა, ${failed} ვერ მივიდა` : `${sent} მივიდა`));

      setTitle('');
      setBody('');
      setNotificationType('general');
      setSendToType('active');
      setRole('');
      setActiveOnly(false);
      setSelectedUsers([]);
      setUserSearchQuery('');
      loadUserStats();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert(`❌ შეცდომა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleLoadFinesCache = async () => {
    const uid = finesUserId.trim();
    if (!uid) {
      alert('შეიყვანე userId');
      return;
    }
    setFinesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/fines/cache/${encodeURIComponent(uid)}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      const data = await res.json();
      setFinesCache({
        userId: String(data.userId || uid),
        total: Number(data.total || 0),
        active: Number(data.active || 0),
        unpaidActive: Number(data.unpaidActive || 0),
      });
    } catch (error) {
      console.error('Error loading fines cache:', error);
      alert(`❌ fines cache ვერ ჩაიტვირთა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFinesLoading(false);
    }
  };

  const handleSendFinesPushNow = async () => {
    setFinesActionLoading(true);
    try {
      const uid = finesUserId.trim();
      const body = uid ? { userId: uid } : {};
      const res = await fetch(`${API_BASE}/fines/reminders/send-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      const result = await res.json();
      alert(`✅ ხელით გაგზავნა შესრულდა: users=${result.usersProcessed ?? 0}, pushes=${result.pushes ?? 0}`);
      if (uid) {
        handleLoadFinesCache();
      }
    } catch (error) {
      console.error('Error sending fines push manually:', error);
      alert(`❌ fines push ვერ გაეშვა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFinesActionLoading(false);
    }
  };

  const loadUnpaidUsersFromCache = async () => {
    const res = await fetch(`${API_BASE}/fines/cache/unpaid-users`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error: ${res.status}`);
    }
    const data = await res.json();
    setUnpaidUsers(Array.isArray(data.users) ? data.users : []);
  };

  const handleSyncAllAndLoadUnpaid = async () => {
    setSyncAllLoading(true);
    try {
      const res = await fetch(`${API_BASE}/fines/cache/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      await loadUnpaidUsersFromCache();
    } catch (error) {
      console.error('Error syncing fines cache:', error);
      alert(`❌ fines cache sync ვერ შესრულდა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  const handleSendOneTextToAllUnpaid = async () => {
    if (!manualTitle.trim() || !manualBody.trim()) {
      alert('შეავსე title და ტექსტი');
      return;
    }
    if (unpaidUsers.length === 0) {
      alert('ჯერ გააკეთე "ჯარიმების ნახვა (ყველა)"');
      return;
    }
    if (!confirm(`გაიგზავნოს ერთიანი ტექსტი ${unpaidUsers.length} იუზერზე?`)) return;

    setFinesActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/fines/reminders/send-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          body: manualBody.trim(),
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      const result = await res.json();
      alert(`✅ გაიგზავნა: ${result.sent ?? 0}/${result.targets ?? 0}`);
    } catch (error) {
      console.error('Error sending custom fines push:', error);
      alert(`❌ custom fines push ვერ გაიგზავნა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFinesActionLoading(false);
    }
  };

  const handleDeleteVehicleBySaId = async () => {
    const id = Number(deleteSaId);
    if (!Number.isFinite(id) || id <= 0) {
      alert('შეიყვანე სწორი SA ID');
      return;
    }
    if (!confirm(`ნამდვილად გსურს SA ID ${id}-ის წაშლა?`)) return;
    setFinesActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/fines/vehicles/sa/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error: ${res.status}`);
      }
      const result = await res.json();
      alert(
        `✅ შესრულდა\nSA delete: ${result.saDeleted ? 'კი' : 'არა'}\nDB deactivated: ${result.dbDeactivated}\nSubs cancelled: ${result.subscriptionsCancelled}`,
      );
      setDeleteSaId('');
      await handleSyncAllAndLoadUnpaid();
    } catch (error) {
      console.error('Error deleting vehicle by SA ID:', error);
      alert(`❌ წაშლა ვერ შესრულდა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFinesActionLoading(false);
    }
  };

  /** Render helpers */
  const SummaryCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );

  /** UI */
  return (
    <div className="p-6 space-y-10">
      {/* Consent Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Push ნებართვები (consent)</h1>
            <p className="text-gray-600 mt-1">
              ვინ ჩართო/დაბლოკა/უარი თქვა. წყარო: /notifications/consent, /notifications/register-device.
            </p>
          </div>
          <button onClick={loadConsent} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm">
            განახლება
          </button>
        </div>

        {consentLoading ? (
          <div className="text-gray-600">იტვირთება...</div>
        ) : consentError || !consentData ? (
          <div className="space-y-2">
            <p className="text-red-600">{consentError || 'მონაცემები არ არის'}</p>
            <button onClick={loadConsent} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm">
              განახლება
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SummaryCard label="სულ იუზერი" value={consentData.summary.totalUsers} color="text-gray-900" />
              <SummaryCard label="სულ მოწყობილობა" value={consentData.summary.totalDevices} color="text-gray-900" />
              <SummaryCard label="ჩართული" value={consentData.summary.granted} color="text-emerald-600" />
              <SummaryCard label="დაბლოკილი (OS)" value={consentData.summary.blocked} color="text-amber-600" />
              <SummaryCard label="უარი" value={consentData.summary.denied} color="text-rose-600" />
              <SummaryCard label="snoozed/never" value={consentData.summary.snoozed + consentData.summary.never} color="text-gray-600" />
            </div>

            <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  {STATUS_FILTERS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value as ConsentStatus | 'all')}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        statusFilter === opt.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ძებნა userId/ტელ/სახელი..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                  <span>ნაჩვენებია {filteredConsent.length} ჩანაწერი</span>
                  {resolvingUsers ? (
                    <span className="text-blue-600 text-xs">იუზერების მონაცემები იტვირთება…</span>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600 text-left">
                      <th className="py-2 pr-4">სტატუსი</th>
                      <th className="py-2 pr-4">userId</th>
                      <th className="py-2 pr-4">ტელ.</th>
                      <th className="py-2 pr-4">სახელი</th>
                      <th className="py-2 pr-4">როლი (API)</th>
                      <th className="py-2 pr-4">პლატფორმა</th>
                      <th className="py-2 pr-4">მოწყობილობა</th>
                      <th className="py-2 pr-4">აპ ვერსია</th>
                      <th className="py-2 pr-4">ბოლო განახლება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsent.length === 0 && (
                      <tr>
                        <td className="py-3 text-center text-gray-500" colSpan={9}>
                          ჩანაწერები ვერ მოიძებნა
                        </td>
                      </tr>
                    )}
                    {filteredConsent.map((item) => (
                      <tr key={`${item.userId}-${item.tokenPrefix ?? item.updatedAt}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs max-w-[200px]">
                          <div className="break-all">{item.userId}</div>
                        </td>
                        <td className="py-2 pr-4">
                          {item.phone || resolvedUsers[item.userId]?.phone || (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {item.name ||
                            resolvedDisplayName(resolvedUsers[item.userId] || {}) ||
                            (resolvingUsers && !resolvedUsers[item.userId] ? (
                              <span className="text-gray-400 text-xs">იტვირთება…</span>
                            ) : (
                              '—'
                            ))}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-700">{resolvedUsers[item.userId]?.role || '—'}</td>
                        <td className="py-2 pr-4">{item.platform || '—'}</td>
                        <td className="py-2 pr-4 text-gray-700">
                          {item.deviceName || item.modelName || '—'}
                          {item.tokenPrefix ? <span className="ml-2 text-xs text-gray-400">({item.tokenPrefix}…)</span> : null}
                        </td>
                        <td className="py-2 pr-4">{item.appVersion || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{formatDate(item.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Fines cache + manual trigger */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🚨 Fines cache / Manual trigger</h2>
          <p className="text-gray-600 text-sm mt-1">
            შეამოწმე კონკრეტული იუზერის ჯარიმების cache და ხელით გაუშვი fines reminder push (ერთი user ან ყველა).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <input
            type="text"
            value={finesUserId}
            onChange={(e) => setFinesUserId(e.target.value)}
            placeholder="userId (არასავალდებულოა ხელით push-ზე)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleLoadFinesCache}
            disabled={finesLoading}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm disabled:opacity-50"
          >
            {finesLoading ? 'იტვირთება...' : 'Cache ნახვა'}
          </button>
          <button
            type="button"
            onClick={handleSendFinesPushNow}
            disabled={finesActionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {finesActionLoading ? 'იგზავნება...' : 'Fines Push Now'}
          </button>
        </div>

        {finesCache ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500">userId</div>
              <div className="text-sm font-semibold break-all">{finesCache.userId}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500">total cached</div>
              <div className="text-xl font-bold">{finesCache.total}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500">active</div>
              <div className="text-xl font-bold">{finesCache.active}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500">unpaid active</div>
              <div className="text-xl font-bold text-red-600">{finesCache.unpaidActive}</div>
            </div>
          </div>
        ) : null}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">ყველა unpaid იუზერი (cache-იდან)</h3>
            <button
              type="button"
              onClick={handleSyncAllAndLoadUnpaid}
              disabled={syncAllLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50"
            >
              {syncAllLoading ? 'იტვირთება...' : 'ჯარიმების ნახვა (ყველა)'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            იუზერები: <b>{unpaidUsers.length}</b>
          </div>

          {unpaidUsers.length > 0 ? (
            <div className="max-h-56 overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 px-3">userId</th>
                    <th className="py-2 px-3">unpaid</th>
                    <th className="py-2 px-3">აქტიური მანქანა</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidUsers.map((u) => (
                    <tr key={u.userId} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono text-xs break-all">{u.userId}</td>
                      <td className="py-2 px-3 font-semibold text-red-600">{u.unpaidCount}</td>
                      <td className="py-2 px-3">{u.activeVehicles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Push სათაური"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={manualBody}
              onChange={(e) => setManualBody(e.target.value)}
              placeholder="ერთიანი ტექსტი ყველა unpaid იუზერზე"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSendOneTextToAllUnpaid}
              disabled={finesActionLoading || unpaidUsers.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              {finesActionLoading ? 'იგზავნება...' : `1 ტექსტის გაგზავნა ყველასთან (${unpaidUsers.length})`}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              type="number"
              value={deleteSaId}
              onChange={(e) => setDeleteSaId(e.target.value)}
              placeholder="SA ID წასაშლელად (მაგ: 840800)"
              className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleDeleteVehicleBySaId}
              disabled={finesActionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
            >
              {finesActionLoading ? 'იგზავნება...' : 'SA ID-ით წაშლა'}
            </button>
          </div>
        </div>
      </section>

      {/* Broadcast section */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-xl max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📢 Push Notifications</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">გაგზავნეთ push notification-ები მომხმარებლებს</p>
          </div>
          <button
            onClick={loadUserStats}
            disabled={loadingStats}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <span className={loadingStats ? 'animate-spin' : ''}>🔄</span>
            <span>განახლება</span>
          </button>
        </div>

        {/* Stats cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 animate-pulse">
                <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : userStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">სულ მომხმარებლები</div>
              <div className="text-3xl font-bold">{userStats.total.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">აქტიური</div>
              <div className="text-3xl font-bold">{userStats.active.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">მიმღებები (არჩეული)</div>
              <div className="text-3xl font-bold">{getTargetCount().toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">ბოლო გაგზავნა</div>
              <div className="text-3xl font-bold">
                {lastResult ? (lastResult.failed ? `${lastResult.sent} / ${lastResult.total}` : `${lastResult.sent}`) : '-'}
              </div>
            </div>
          </div>
        ) : null}

        {/* Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <span className="text-lg">📝</span>
                <span>Title *</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="მაგ: 🚀 ახალი შეთავაზება!"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={sending}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <span className="text-lg">🎯</span>
                <span>Notification Type (სქრინი)</span>
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={sending}
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.label} - {t.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <span className="text-lg">💬</span>
              <span>Body *</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="მაგ: ახალი შეთავაზება! მიიღეთ 50% ფასდაკლება..."
              rows={5}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
              disabled={sending}
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{body.length} სიმბოლო</span>
              {body.length > 150 && <span className="text-orange-500">⚠️ რეკომენდებულია 100-150 სიმბოლო</span>}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <span className="text-lg">👥</span>
              <span>გაგზავნა ვისთვის *</span>
              {userStats && <span className="text-xs font-normal text-blue-600 dark:text-blue-400 ml-auto">({getTargetCount()} მომხმარებელი)</span>}
            </label>
            <select
              value={sendToType}
              onChange={(e) => {
                setSendToType(e.target.value as SendToType);
                setRole('');
                setActiveOnly(false);
                setSelectedUsers([]);
                setUserSearchQuery('');
                setShowUserDropdown(false);
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={sending}
            >
              <option value="active">მხოლოდ Active User-ებს ({userStats?.active || 0})</option>
              <option value="role">კონკრეტული Role-ის User-ებს</option>
              <option value="userIds">კონკრეტული User-ები (არჩევით)</option>
            </select>
          </div>

          {sendToType === 'role' && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span className="text-lg">👤</span>
                  <span>Role *</span>
                  {role && userStats && (
                    <span className="text-xs font-normal text-purple-600 dark:text-purple-400 ml-auto">
                      ({userStats.byRole[role] || 0} მომხმარებელი)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['user', 'customer', 'partner', 'owner', 'admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      disabled={sending}
                      className={`px-4 py-3 rounded-lg font-medium transition-all ${
                        role === r
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg scale-105'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
                      }`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                      {userStats && <span className="block text-xs mt-1 opacity-75">{userStats.byRole[r] || 0}</span>}
                    </button>
                  ))}
                </div>
              </div>
              {role && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeOnly}
                      onChange={(e) => setActiveOnly(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={sending}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">მხოლოდ Active User-ები</span>
                      {activeOnly && userStats && (
                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          გაიგზავნება {Math.min(userStats.byRole[role] || 0, userStats.active)} მომხმარებელს
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {sendToType === 'active' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-green-800 dark:text-green-200">გაიგზავნება მხოლოდ active (isActive: true) user-ებს</div>
              {userStats && <div className="text-xs text-green-600 dark:text-green-400 mt-1">სულ {userStats.active} აქტიური მომხმარებელი</div>}
            </div>
          )}

          {sendToType === 'userIds' && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border-2 border-pink-200 dark:border-pink-800">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span className="text-lg">🔍</span>
                  <span>იუზერების ძიება და არჩევა *</span>
                  {selectedUsers.length > 0 && (
                    <span className="text-xs font-normal text-pink-600 dark:text-pink-400 ml-auto">({selectedUsers.length} არჩეული)</span>
                  )}
                </label>
                <div className="relative user-search-container">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (userSearchQuery && userSearchResults.length > 0) setShowUserDropdown(true);
                    }}
                    placeholder="ძიება სახელით, ტელეფონით ან ID-ით..."
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    disabled={sending}
                  />
                  {searchingUsers && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                    </div>
                  )}
                  {showUserDropdown && userSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addUser(user)}
                          className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-left transition-colors"
                        >
                          {user.profileImage || user.avatar ? (
                            <img src={user.profileImage || user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold">
                              {(user.firstName?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.phone || user.id}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.phone} {user.email && `• ${user.email}`}
                            </div>
                            {user.role && <div className="text-xs text-pink-600 dark:text-pink-400 mt-1">{user.role}</div>}
                          </div>
                          <span className="text-pink-500">+</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUsers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">არჩეული იუზერები:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-pink-200 dark:border-pink-700 rounded-lg px-3 py-2"
                        >
                          {user.profileImage || user.avatar ? (
                            <img src={user.profileImage || user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-semibold">
                              {(user.firstName?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.phone || user.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUser(user.id)}
                            disabled={sending}
                            className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedUsers.length === 0 && !userSearchQuery && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">შეიყვანეთ მინიმუმ 2 სიმბოლო იუზერების ძიებისთვის</div>
                )}
              </div>
            </div>
          )}

          {lastResult && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-5">
              <div className="text-lg font-semibold text-green-800 dark:text-green-200 mb-1">ბოლო გაგზავნა</div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {lastResult.failed != null && lastResult.failed > 0
                  ? `${lastResult.sent.toLocaleString()} მივიდა, ${lastResult.failed.toLocaleString()} ვერ მივიდა`
                  : `${lastResult.sent.toLocaleString()} მივიდა`}
              </div>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={
              sending ||
              !title.trim() ||
              !body.trim() ||
              (sendToType === 'role' && !role) ||
              (sendToType === 'userIds' && selectedUsers.length === 0)
            }
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none text-lg"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>იგზავნება...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>📢</span>
                <span>
                  გაგზავნა{' '}
                  {sendToType === 'active'
                    ? 'Active User-ებს'
                    : sendToType === 'role'
                    ? `${role} Role-ის User-ებს`
                    : `${selectedUsers.length} კონკრეტულ User-ს`}
                </span>
                {userStats && <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">({getTargetCount()} მომხმარებელი)</span>}
              </span>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
