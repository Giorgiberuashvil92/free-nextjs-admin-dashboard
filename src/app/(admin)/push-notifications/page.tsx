'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api';
import { apiGetJson } from '@/lib/api';

type SendToType = 'all' | 'role' | 'active' | 'userIds';

type NotificationType = 
  | 'general'
  | 'review'
  | 'carfax'
  | 'subscription_activated'
  | 'garage_reminder'
  | 'chat_message'
  | 'carwash_booking'
  | 'new_request'
  | 'new_offer'
  | 'ai_recommendation'
  | 'offer_status';

interface NotificationTypeConfig {
  type: NotificationType;
  label: string;
  screen: string;
  icon: string;
  description: string;
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    type: 'general',
    label: 'General',
    screen: 'Notifications',
    icon: '📢',
    description: 'ზოგადი შეტყობინება',
  },
  {
    type: 'review',
    label: 'Review Us',
    screen: 'Review',
    icon: '⭐',
    description: 'გადავა Review სქრინზე',
  },
  {
    type: 'carfax',
    label: 'Carfax',
    screen: 'Carfax',
    icon: '🚗',
    description: 'გადავა Carfax სქრინზე',
  },
  {
    type: 'subscription_activated',
    label: 'Subscription Activated',
    screen: 'Premium',
    icon: '💎',
    description: 'გადავა Home-ზე Premium Modal-ით',
  },
  {
    type: 'garage_reminder',
    label: 'Garage Reminder',
    screen: 'Garage',
    icon: '⏰',
    description: 'გადავა Garage სქრინზე',
  },
  {
    type: 'chat_message',
    label: 'Chat Message',
    screen: 'Chat',
    icon: '💬',
    description: 'გადავა Chat სქრინზე',
  },
  {
    type: 'carwash_booking',
    label: 'Carwash Booking',
    screen: 'Bookings',
    icon: '🚿',
    description: 'გადავა Bookings სქრინზე',
  },
  {
    type: 'new_request',
    label: 'New Request',
    screen: 'RequestDetails',
    icon: '🆕',
    description: 'გადავა Offers/Request სქრინზე',
  },
  {
    type: 'new_offer',
    label: 'New Offer',
    screen: 'OfferDetails',
    icon: '💰',
    description: 'გადავა Offers სქრინზე',
  },
  {
    type: 'ai_recommendation',
    label: 'AI Recommendation',
    screen: 'AIRecommendations',
    icon: '🤖',
    description: 'გადავა All Requests სქრინზე',
  },
  {
    type: 'offer_status',
    label: 'Offer Status',
    screen: 'OfferDetails',
    icon: '📊',
    description: 'გადავა Offers სქრინზე',
  },
];

interface UserStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
}

interface User {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  avatar?: string;
  profileImage?: string;
}

export default function PushNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notificationType, setNotificationType] = useState<NotificationType>('general');
  const [sendToType, setSendToType] = useState<SendToType>('active');
  const [role, setRole] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; total: number } | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    loadUserStats();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-search-container')) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserDropdown]);

  const loadUserStats = async () => {
    try {
      setLoadingStats(true);
      const [allUsersRes, activeUsersRes] = await Promise.all([
        apiGetJson<{ success: boolean; total: number; data: any[] }>('/users?limit=1'),
        apiGetJson<{ success: boolean; total: number; data: any[] }>('/users?active=true&limit=1'),
      ]);

      const total = allUsersRes.total || 0;
      const active = activeUsersRes.total || 0;

      // Load users by role
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
  };

  const searchUsers = useCallback(async (query: string) => {
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
      // Filter out already selected users
      setUserSearchResults((prevResults) => {
        const filteredUsers = users.filter(
          (user) => !selectedUsers.some((selected) => selected.id === user.id)
        );
        return filteredUsers;
      });
      setShowUserDropdown(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, [selectedUsers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      } else {
        setUserSearchResults([]);
        setShowUserDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, searchUsers]);

  const addUser = (user: User) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      setUserSearchQuery('');
      setShowUserDropdown(false);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const getTargetCount = (): number => {
    if (!userStats) return 0;
    
    if (sendToType === 'active') {
      return userStats.active;
    } else if (sendToType === 'role' && role) {
      const roleCount = userStats.byRole[role] || 0;
      return activeOnly ? Math.min(roleCount, userStats.active) : roleCount;
    } else if (sendToType === 'userIds') {
      return selectedUsers.length;
    }
    return 0;
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert('გთხოვთ შეიყვანოთ title და body');
      return;
    }

    // Validation based on sendToType
    if (sendToType === 'role' && !role) {
      alert('გთხოვთ აირჩიოთ role');
      return;
    }

    if (sendToType === 'userIds' && selectedUsers.length === 0) {
      alert('გთხოვთ აირჩიოთ მინიმუმ ერთი user');
      return;
    }

    const targetCount = getTargetCount();
    let confirmMessage = `ნამდვილად გსურთ გაგზავნა push notification?\n\nTitle: ${title}\nBody: ${body}\n\n`;
    
    if (sendToType === 'role') {
      confirmMessage += `მიმღები: Role "${role}"${activeOnly ? ' (მხოლოდ active)' : ''} (${targetCount} მომხმარებელი)`;
    } else if (sendToType === 'active') {
      confirmMessage += `მიმღები: მხოლოდ active user-ები (${targetCount} მომხმარებელი)`;
    } else if (sendToType === 'userIds') {
      const userNames = selectedUsers.slice(0, 3).map(u => 
        u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.phone
      ).join(', ');
      confirmMessage += `მიმღები: ${selectedUsers.length} კონკრეტული user${selectedUsers.length > 3 ? '...' : ''} (${userNames}${selectedUsers.length > 3 ? '...' : ''})`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      // Get notification type config
      const typeConfig = NOTIFICATION_TYPES.find(t => t.type === notificationType) || NOTIFICATION_TYPES[0];
      
      const requestBody: any = {
        title: title.trim(),
        body: body.trim(),
        data: {
          type: typeConfig.type,
          screen: typeConfig.screen,
          timestamp: new Date().toISOString(),
        },
      };

      // Add filters based on sendToType
      if (sendToType === 'all') {
        requestBody.broadcastToAll = true;
      } else if (sendToType === 'role') {
        requestBody.role = role;
        if (activeOnly) {
          requestBody.active = true;
        }
      } else if (sendToType === 'active') {
        requestBody.active = true;
      } else if (sendToType === 'userIds') {
        requestBody.userIds = selectedUsers.map(u => u.id);
      }

      const res = await fetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      const sent = result.sent ?? result.total ?? 0;
      const failed = result.failed ?? 0;
      setLastResult({ sent, total: sent + failed || sent });

      if (failed > 0) {
        alert(`✅ გაიგზავნა ${sent} მოწყობილობაზე, ვერ გაიგზავნა: ${failed}`);
      } else {
        alert(`✅ წარმატებით გაიგზავნა ${sent} მოწყობილობაზე!`);
      }
      
      setTitle('');
      setBody('');
      setNotificationType('general');
      setSendToType('all');
      setRole('');
      setActiveOnly(false);
      setSelectedUsers([]);
      setUserSearchQuery('');
      // Reload stats
      loadUserStats();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert(`❌ შეცდომა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📢 Push Notifications</h1>
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

      {/* Stats Cards */}
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div className="text-sm opacity-90 mb-1">სულ მომხმარებლები</div>
            <div className="text-3xl font-bold">{userStats.total.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <div className="text-sm opacity-90 mb-1">აქტიური მომხმარებლები</div>
            <div className="text-3xl font-bold">{userStats.active.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <div className="text-sm opacity-90 mb-1">მიმღებები</div>
            <div className="text-3xl font-bold">{getTargetCount().toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
            </div>
            <div className="text-sm opacity-90 mb-1">ბოლო გაგზავნა</div>
            <div className="text-3xl font-bold">
              {lastResult ? `${lastResult.sent}/${lastResult.total}` : '-'}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Form Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-xl max-w-4xl mx-auto backdrop-blur-sm">
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
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.icon} {type.label} - {type.description}
                  </option>
                ))}
              </select>
              {notificationType !== 'general' && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
                    <div className="text-xs text-blue-800 dark:text-blue-300">
                      <div className="font-semibold mb-1">
                        {NOTIFICATION_TYPES.find(t => t.type === notificationType)?.label}
                      </div>
                      <div>
                        გადავა: <span className="font-mono font-semibold">
                          /{NOTIFICATION_TYPES.find(t => t.type === notificationType)?.screen.toLowerCase() || 'notifications'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <span className="text-lg">💬</span>
              <span>Body (შინაარსი) *</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="მაგ: ახალი შეთავაზება! მიიღეთ 50% ფასდაკლება..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
              disabled={sending}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {body.length} სიმბოლო
              </div>
              {body.length > 150 && (
                <div className="text-xs text-orange-500">
                  ⚠️ რეკომენდებულია 100-150 სიმბოლო
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <span className="text-lg">👥</span>
              <span>გაგზავნა ვისთვის *</span>
              {userStats && (
                <span className="text-xs font-normal text-blue-600 dark:text-blue-400 ml-auto">
                  ({getTargetCount()} მომხმარებელი)
                </span>
              )}
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
              <option value="role">კონკრეტული Role-ის მქონე User-ებს</option>
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
                      {userStats && (
                        <span className="block text-xs mt-1 opacity-75">
                          {userStats.byRole[r] || 0}
                        </span>
                      )}
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        მხოლოდ Active User-ები
                      </span>
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
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                    გაიგზავნება მხოლოდ active (isActive: true) user-ებს
                  </div>
                  {userStats && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      სულ {userStats.active} აქტიური მომხმარებელი
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {sendToType === 'userIds' && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border-2 border-pink-200 dark:border-pink-800">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span className="text-lg">🔍</span>
                  <span>იუზერების ძიება და არჩევა *</span>
                  {selectedUsers.length > 0 && (
                    <span className="text-xs font-normal text-pink-600 dark:text-pink-400 ml-auto">
                      ({selectedUsers.length} არჩეული)
                    </span>
                  )}
                </label>
                
                {/* Search Input */}
                <div className="relative user-search-container">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (userSearchQuery && userSearchResults.length > 0) {
                        setShowUserDropdown(true);
                      }
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
                  
                  {/* Dropdown Results */}
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
                            <img
                              src={user.profileImage || user.avatar}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-semibold">
                              {(user.firstName?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.firstName || user.phone || user.id}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.phone} {user.email && `• ${user.email}`}
                            </div>
                            {user.role && (
                              <div className="text-xs text-pink-600 dark:text-pink-400 mt-1">
                                {user.role}
                              </div>
                            )}
                          </div>
                          <span className="text-pink-500">+</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      არჩეული იუზერები:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-pink-200 dark:border-pink-700 rounded-lg px-3 py-2"
                        >
                          {user.profileImage || user.avatar ? (
                            <img
                              src={user.profileImage || user.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-semibold">
                              {(user.firstName?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.firstName || user.phone || user.id}
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    შეიყვანეთ მინიმუმ 2 სიმბოლო იუზერების ძიებისთვის
                  </div>
                )}
              </div>
            </div>
          )}

          {lastResult && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                    ბოლო გაგზავნა წარმატებულია!
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {lastResult.sent.toLocaleString()} / {lastResult.total.toLocaleString()} მოწყობილობა
                  </div>
                </div>
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
                {userStats && (
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                    ({getTargetCount()} მომხმარებელი)
                  </span>
                )}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6 max-w-4xl mx-auto shadow-lg">
        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          <span>რჩევები წარმატებული notification-ისთვის:</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <span className="text-xl">📝</span>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">Title</div>
              <div className="text-xs text-amber-800 dark:text-amber-300">უნდა იყოს მოკლე და მიმზიდველი</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <span className="text-xl">💬</span>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">Body</div>
              <div className="text-xs text-amber-800 dark:text-amber-300">რეკომენდებულია 100-150 სიმბოლო</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <span className="text-xl">😊</span>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">Emoji</div>
              <div className="text-xs text-amber-800 dark:text-amber-300">გამოიყენეთ emoji-ები მიმზიდველობისთვის</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <span className="text-xl">✅</span>
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">შემოწმება</div>
              <div className="text-xs text-amber-800 dark:text-amber-300">გაგზავნამდე ყოველთვის შეამოწმეთ შინაარსი</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
