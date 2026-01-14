'use client';

import { useState, useEffect } from 'react';
import { apiGetJson } from '@/lib/api';

interface DashboardStats {
  users: {
    total: number;
    activeToday: number;
    newThisWeek: number;
  };
  services: {
    total: number;
    mechanics: number;
    carwashes: number;
    carRentals: number;
    stores: number;
  };
  activity: {
    totalLogins: number;
    loginsToday: number;
    stories: number;
  };
  smsBalance?: {
    balance: number;
    overdraft: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Fetch all data with error handling for each
      const [usersRes, loginStatsRes, mechanicsRes, carwashesRes, carRentalsRes, storesRes, storiesRes, smsBalanceRes] = await Promise.allSettled([
        apiGetJson<{ success: boolean; total: number }>('/users?limit=1'),
        apiGetJson<{ success: boolean; data: { totalLogins: number; loginsToday: number; uniqueUsers: number; uniqueUsersToday: number } }>('/login-history/stats'),
        apiGetJson<{ success: boolean; total: number }>('/mechanics?limit=1'),
        apiGetJson<{ success: boolean; data: any[] }>('/carwash/locations'),
        apiGetJson<{ success: boolean; data: any[] }>('/car-rental'),
        apiGetJson<{ success: boolean; total: number }>('/stores?limit=1'),
        apiGetJson<{ success: boolean; data: any[] }>('/stories'),
        fetch('/api/sms-balance').then(res => res.json()).catch(() => null),
      ]);

      const dashboardStats: DashboardStats = {
        users: {
          total: usersRes.status === 'fulfilled' ? (usersRes.value.total || 0) : 0,
          activeToday: loginStatsRes.status === 'fulfilled' ? (loginStatsRes.value.data?.uniqueUsersToday || 0) : 0,
          newThisWeek: 0,
        },
        services: {
          total: 
            (mechanicsRes.status === 'fulfilled' ? (mechanicsRes.value.total || 0) : 0) +
            (carwashesRes.status === 'fulfilled' ? (carwashesRes.value.data?.length || 0) : 0) +
            (carRentalsRes.status === 'fulfilled' ? (carRentalsRes.value.data?.length || 0) : 0) +
            (storesRes.status === 'fulfilled' ? (storesRes.value.total || 0) : 0),
          mechanics: mechanicsRes.status === 'fulfilled' ? (mechanicsRes.value.total || 0) : 0,
          carwashes: carwashesRes.status === 'fulfilled' ? (carwashesRes.value.data?.length || 0) : 0,
          carRentals: carRentalsRes.status === 'fulfilled' ? (carRentalsRes.value.data?.length || 0) : 0,
          stores: storesRes.status === 'fulfilled' ? (storesRes.value.total || 0) : 0,
        },
        activity: {
          totalLogins: loginStatsRes.status === 'fulfilled' ? (loginStatsRes.value.data?.totalLogins || 0) : 0,
          loginsToday: loginStatsRes.status === 'fulfilled' ? (loginStatsRes.value.data?.loginsToday || 0) : 0,
          stories: storiesRes.status === 'fulfilled' ? (storiesRes.value.data?.length || 0) : 0,
        },
        smsBalance: smsBalanceRes.status === 'fulfilled' && smsBalanceRes.value?.success
          ? {
              balance: smsBalanceRes.value.balance || 0,
              overdraft: smsBalanceRes.value.overdraft || 0,
            }
          : undefined,
      };

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">იტვირთება...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">მონაცემები ვერ ჩაიტვირთა</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">მთავარი</h1>
          <p className="text-gray-600 mt-1">აპლიკაციის მთავარი სტატისტიკა და მიმოხილვა</p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span>🔄</span>
          <span>განახლება</span>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Users Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80 mb-1">მომხმარებლები</div>
              <div className="text-3xl font-bold">{stats.users.total}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded">
              {stats.users.activeToday} აქტიური დღეს
            </span>
          </div>
        </div>

        {/* Services Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80 mb-1">სერვისები</div>
              <div className="text-3xl font-bold">{stats.services.total}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="bg-white/10 px-2 py-1 rounded">🔨 {stats.services.mechanics}</div>
            <div className="bg-white/10 px-2 py-1 rounded">🧼 {stats.services.carwashes}</div>
            <div className="bg-white/10 px-2 py-1 rounded">🚗 {stats.services.carRentals}</div>
            <div className="bg-white/10 px-2 py-1 rounded">🏪 {stats.services.stores}</div>
          </div>
        </div>

        {/* Logins Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80 mb-1">დალოგინება</div>
              <div className="text-3xl font-bold">{stats.activity.totalLogins}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded">
              {stats.activity.loginsToday} დღეს
            </span>
          </div>
        </div>

        {/* Stories Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80 mb-1">სტორიები</div>
              <div className="text-3xl font-bold">{stats.activity.stories}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded">
              აქტიური სტორიები
            </span>
          </div>
        </div>

        {/* SMS Balance Card */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80 mb-1">SMS ბალანსი</div>
              <div className="text-3xl font-bold">
                {stats.smsBalance ? `${stats.smsBalance.balance.toFixed(2)} ₾` : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {stats.smsBalance ? (
              <span className="bg-white/20 px-2 py-1 rounded">
                {stats.smsBalance.balance < 10 ? '⚠️ დაბალი ბალანსი' : '✅ აქტიური'}
              </span>
            ) : (
              <span className="bg-white/20 px-2 py-1 rounded text-xs opacity-70">
                ვერ ჩაიტვირთა
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">სერვისების განაწილება</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🔨</span>
              <div>
                <div className="text-sm text-gray-600">მექანიკოსები</div>
                <div className="text-2xl font-bold text-gray-900">{stats.services.mechanics}</div>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${(stats.services.mechanics / stats.services.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🧼</span>
              <div>
                <div className="text-sm text-gray-600">ავტოსამრეცხაო</div>
                <div className="text-2xl font-bold text-gray-900">{stats.services.carwashes}</div>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all" 
                style={{ width: `${(stats.services.carwashes / stats.services.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🚗</span>
              <div>
                <div className="text-sm text-gray-600">გაქირავება</div>
                <div className="text-2xl font-bold text-gray-900">{stats.services.carRentals}</div>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all" 
                style={{ width: `${(stats.services.carRentals / stats.services.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏪</span>
              <div>
                <div className="text-sm text-gray-600">მაღაზიები</div>
                <div className="text-2xl font-bold text-gray-900">{stats.services.stores}</div>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all" 
                style={{ width: `${(stats.services.stores / stats.services.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl">⚡</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">სისტემის სტატუსი</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Backend</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">მუშაობს</span>
                </div>
              </div>
              <div>
                <div className="text-gray-600">მონაცემთა ბაზა</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">დაკავშირებულია</span>
                </div>
              </div>
              <div>
                <div className="text-gray-600">API</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">აქტიური</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a href="/users" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">მომხმარებლები</div>
              <div className="text-sm text-gray-600">მართე მომხმარებლები</div>
            </div>
          </div>
        </a>

        <a href="/car-rentals" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚗</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">მანქანები</div>
              <div className="text-sm text-gray-600">გაქირავების მართვა</div>
            </div>
          </div>
        </a>

        <a href="/stories" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-orange-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">სტორიები</div>
              <div className="text-sm text-gray-600">სტორიების მართვა</div>
            </div>
          </div>
        </a>

        <a href="/mechanics" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔨</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">მექანიკოსები</div>
              <div className="text-sm text-gray-600">მექანიკოსების მართვა</div>
            </div>
          </div>
        </a>

        <a href="/carwashes" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-cyan-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧼</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">ავტოსამრეცხაოები</div>
              <div className="text-sm text-gray-600">სამრეცხაოების მართვა</div>
            </div>
          </div>
        </a>

        <a href="/analytics" className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-pink-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">ანალიტიკა</div>
              <div className="text-sm text-gray-600">დეტალური სტატისტიკა</div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
