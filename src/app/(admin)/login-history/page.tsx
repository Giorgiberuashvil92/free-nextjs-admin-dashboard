'use client';

import { useState, useEffect } from 'react';
import { apiGetJson } from '@/lib/api';

interface LoginHistory {
  id: string;
  userId: string;
  phone: string;
  email?: string;
  firstName?: string;
  loginAt: string;
  deviceInfo?: {
    platform?: string;
    deviceName?: string;
    modelName?: string;
    osVersion?: string;
    appVersion?: string;
  };
  status: 'success' | 'failed';
  createdAt: string;
}

export default function LoginHistoryPage() {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    userId: '',
    phone: '',
    status: '' as 'success' | 'failed' | '',
  });

  useEffect(() => {
    loadLoginHistory();
    loadStats();
  }, [filters]);

  const loadLoginHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '100');

      const response = await apiGetJson<{
        success: boolean;
        data: LoginHistory[];
        total: number;
        message: string;
      }>(`/login-history?${params.toString()}`);

      if (response.success && response.data) {
        setLoginHistory(response.data);
      } else {
        setLoginHistory([]);
      }
    } catch (error) {
      console.error('Error loading login history:', error);
      setLoginHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiGetJson<{
        success: boolean;
        data: {
          totalLogins: number;
          uniqueUsers: number;
          successfulLogins: number;
          failedLogins: number;
          loginsToday: number;
          uniqueUsersToday: number;
          loginsPerUserToday: Array<{
            userId: string;
            phone: string;
            firstName?: string;
            count: number;
          }>;
        };
        message: string;
      }>('/login-history/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ka-GE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">დალოგინების ისტორია</h1>
        <p className="text-gray-600 mt-1">იუზერების დალოგინების დეტალები</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">სულ დალოგინება</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalLogins}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">უნიკალური იუზერები</div>
              <div className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">წარმატებული</div>
              <div className="text-2xl font-bold text-green-600">{stats.successfulLogins}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">წარუმატებელი</div>
              <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
            </div>
          </div>
          
          {/* Today's Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">დღეს</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">დღეს დალოგინება</div>
                <div className="text-2xl font-bold text-blue-600">{stats.loginsToday || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">დღეს აქტიური იუზერები</div>
                <div className="text-2xl font-bold text-blue-600">{stats.uniqueUsersToday || 0}</div>
              </div>
            </div>
            
            {/* Top Users Today */}
            {stats.loginsPerUserToday && stats.loginsPerUserToday.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">დღეს ყველაზე აქტიური იუზერები</h3>
                <div className="space-y-2">
                  {stats.loginsPerUserToday.map((user: any, index: number) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}.
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName || 'უცნობი'}
                          </div>
                          <div className="text-xs text-gray-500">{user.phone}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {user.count} {user.count === 1 ? 'ჯერ' : 'ჯერ'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="User ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ტელეფონი
            </label>
            <input
              type="text"
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ტელეფონი"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              სტატუსი
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as 'success' | 'failed' | '',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">ყველა</option>
              <option value="success">წარმატებული</option>
              <option value="failed">წარუმატებელი</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">იტვირთება...</div>
        ) : loginHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            დალოგინების ისტორია ვერ მოიძებნა
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    სახელი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    დრო
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    მოწყობილობა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    სტატუსი
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loginHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.firstName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.loginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.deviceInfo?.platform || '-'}
                      {item.deviceInfo?.deviceName && (
                        <span className="ml-1 text-xs">
                          ({item.deviceInfo.deviceName})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status === 'success' ? 'წარმატებული' : 'წარუმატებელი'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

