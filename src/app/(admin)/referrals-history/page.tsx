'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGetJson } from '@/lib/api';

interface ReferralHistoryItem {
  referralId: string;
  inviterId: string;
  inviterName: string;
  inviterReferralCode?: string;
  inviteeId: string;
  inviteeName: string;
  appliedAt: number;
  appliedAtFormatted: string;
  subscriptionEnabled: boolean;
  rewardsGranted: boolean;
  createdAt: string;
  updatedAt: string;
  daysSinceApplied: number;
}

interface ReferralsSummary {
  totalReferrals: number;
  totalInviters: number;
  totalInvitees: number;
  subscriptionsEnabled: number;
  rewardsGranted: number;
  pendingRewards: number;
}

interface ReferralsHistoryResponse {
  data?: ReferralHistoryItem[];
  history?: ReferralHistoryItem[];
  summary?: ReferralsSummary;
}

export default function ReferralsHistoryPage() {
  const [referrals, setReferrals] = useState<ReferralHistoryItem[]>([]);
  const [summary, setSummary] = useState<ReferralsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { firstName?: string; lastName?: string; phone?: string }>>({});

  const loadReferralsHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiGetJson<ReferralHistoryItem[] | ReferralsHistoryResponse | { success: boolean; data: ReferralHistoryItem[]; summary?: ReferralsSummary }>(
        '/referrals/history/all'
      );
      
      // Extract referrals data
      let referralsData: ReferralHistoryItem[] = [];
      let summaryData: ReferralsSummary | null = null;
      
      if (Array.isArray(response)) {
        referralsData = response as ReferralHistoryItem[];
      } else if (response && typeof response === 'object') {
        const resp = response as any;
        
        // Check if it has history property (new format)
        if ('history' in resp && Array.isArray(resp.history)) {
          referralsData = resp.history as ReferralHistoryItem[];
        }
        // Check if it has data property (old format)
        else if ('data' in resp && Array.isArray(resp.data)) {
          referralsData = resp.data as ReferralHistoryItem[];
        }
        
        // Check if it has summary property
        if ('summary' in resp && resp.summary) {
          summaryData = resp.summary as ReferralsSummary;
        }
      }
      
      console.log('Loaded referrals:', referralsData.length, 'Summary:', summaryData);
      
      setReferrals(referralsData);
      
      // Set summary if available
      if (summaryData) {
        setSummary(summaryData);
      }
      
      // Load user info for inviters and invitees (optional, since we already have names)
      const uniqueUserIds = new Set<string>();
      referralsData.forEach(ref => {
        if (ref.inviterId) uniqueUserIds.add(ref.inviterId);
        if (ref.inviteeId) uniqueUserIds.add(ref.inviteeId);
      });
      
      const userIdsArray = Array.from(uniqueUserIds).filter(id => !userInfoMap[id]);
      
      if (userIdsArray.length > 0) {
        loadUserInfoBatch(userIdsArray);
      }
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e 
        ? String((e as { message?: unknown }).message) 
        : 'Failed to load referrals history';
      setError(message);
      setReferrals([]);
      console.error('Error loading referrals history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferralsHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserInfoBatch = async (userIds: string[]) => {
    const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? '/api/proxy' 
      : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");

    const batchSize = 20;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          try {
            const res = await fetch(`${API_BASE}/users/${userId}?t=${Date.now()}`, {
              cache: "no-store",
              headers: { 'Cache-Control': 'no-cache' },
            });
            
            if (res.ok) {
              const data = await res.json();
              const user = data?.data || data;
              setUserInfoMap(prev => ({
                ...prev,
                [userId]: {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  phone: user.phone,
                },
              }));
            }
          } catch (e) {
            console.error(`Error loading user ${userId}:`, e);
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  // Filter referrals
  const filteredReferrals = useMemo(() => {
    let filtered = referrals;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ref => {
        if (statusFilter === 'active') {
          return ref.subscriptionEnabled === true;
        }
        if (statusFilter === 'completed') {
          return ref.rewardsGranted === true;
        }
        return false;
      });
    }
    
    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ref => {
        const inviterName = (ref.inviterName || '').toLowerCase();
        const inviteeName = (ref.inviteeName || '').toLowerCase();
        const inviterCode = (ref.inviterReferralCode || '').toLowerCase();
        
        return (
          inviterName.includes(query) ||
          inviteeName.includes(query) ||
          ref.inviterId.toLowerCase().includes(query) ||
          ref.inviteeId.toLowerCase().includes(query) ||
          inviterCode.includes(query) ||
          ref.referralId.toLowerCase().includes(query)
        );
      });
    }
    
    // Sort by appliedAt (newest first)
    return filtered.sort((a, b) => {
      return b.appliedAt - a.appliedAt;
    });
  }, [referrals, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredReferrals.slice(start, end);
  }, [filteredReferrals, currentPage, itemsPerPage]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ka-GE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getUserDisplayName = (name: string, userId: string) => {
    if (name && name !== userId) return name;
    return userId.substring(0, 20) + '...';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎁 რეფერალების ისტორია</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">ყველა რეფერალის ისტორია და სტატისტიკა</p>
        </div>
        <button
          onClick={loadReferralsHistory}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>განახლება</span>
        </button>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎁</span>
              </div>
            </div>
            <div className="text-sm opacity-90 mb-1">სულ რეფერალები</div>
            <div className="text-3xl font-bold">
              {summary?.totalReferrals !== undefined 
                ? summary.totalReferrals.toLocaleString() 
                : referrals.length.toLocaleString()}
            </div>
          </div>
        
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
          <div className="text-sm opacity-90 mb-1">რეფერერები</div>
          <div className="text-3xl font-bold">
            {summary?.totalInviters !== undefined 
              ? summary.totalInviters.toLocaleString() 
              : new Set(referrals.map(r => r.inviterId)).size.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
          <div className="text-sm opacity-90 mb-1">ინვაიტები</div>
          <div className="text-3xl font-bold">
            {summary?.totalInvitees !== undefined 
              ? summary.totalInvitees.toLocaleString() 
              : new Set(referrals.map(r => r.inviteeId)).size.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
          </div>
          <div className="text-sm opacity-90 mb-1">საბსქრიფშენები</div>
          <div className="text-3xl font-bold">
            {summary?.subscriptionsEnabled !== undefined 
              ? summary.subscriptionsEnabled.toLocaleString() 
              : referrals.filter(r => r.subscriptionEnabled).length.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <div className="text-sm opacity-90 mb-1">გაცემული ჯილდოები</div>
          <div className="text-3xl font-bold">
            {summary?.rewardsGranted !== undefined 
              ? summary.rewardsGranted.toLocaleString() 
              : referrals.filter(r => r.rewardsGranted).length.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <div className="text-sm opacity-90 mb-1">მოლოდინში</div>
          <div className="text-3xl font-bold">
            {summary?.pendingRewards !== undefined 
              ? summary.pendingRewards.toLocaleString() 
              : referrals.filter(r => !r.rewardsGranted && !r.subscriptionEnabled).length.toLocaleString()}
          </div>
        </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ძიება
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ძიება სახელით, ტელეფონით, ID-ით..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              სტატუსი
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ყველა</option>
              <option value="active">აქტიური</option>
              <option value="completed">დასრულებული</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ელემენტები გვერდზე
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">იტვირთება...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              რეფერალები არ არის
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              ჯერ არ არის რეფერალების ისტორია
            </p>
          </div>
        ) : paginatedReferrals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              რეფერალები არ მოიძებნა
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              ფილტრაციის პარამეტრების შეცვლა სცადეთ
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              ფილტრების გასუფთავება
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      რეფერერი (ვინ გააგზავნა)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      ინვაიტი (ვინ მიიღო)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      კოდი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      სტატუსი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      გამოყენების თარიღი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      დღეები გასული
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedReferrals.map((referral, index) => (
                    <tr
                      key={referral.referralId || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <a
                            href={`/users/${referral.inviterId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                          >
                            {referral.inviterId.substring(0, 20)}...
                          </a>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {getUserDisplayName(referral.inviterName, referral.inviterId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <a
                            href={`/users/${referral.inviteeId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                          >
                            {referral.inviteeId.substring(0, 20)}...
                          </a>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {getUserDisplayName(referral.inviteeName, referral.inviteeId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {referral.inviterReferralCode ? (
                          <span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
                            {referral.inviterReferralCode}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {referral.rewardsGranted && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              ✅ ჯილდო გაცემულია
                            </span>
                          )}
                          {referral.subscriptionEnabled && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              📱 საბსქრიფშენი
                            </span>
                          )}
                          {!referral.rewardsGranted && !referral.subscriptionEnabled && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              ⏳ მოლოდინში
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {referral.appliedAtFormatted || formatDate(referral.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span>{referral.daysSinceApplied} დღე</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(referral.updatedAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  გვერდი {currentPage} / {totalPages} (სულ {filteredReferrals.length} რეფერალი)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    წინა
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    შემდეგი
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
