'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGetJson, API_BASE } from '@/lib/api';

interface CarFAXUser {
  userId: string;
  totalReports: number;
  usage: {
    totalLimit: number;
    used: number;
    remaining: number;
  };
  firstReportDate: string;
  lastReportDate: string;
}

interface UserInfo {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export default function CarFAXUsersPage() {
  const [users, setUsers] = useState<CarFAXUser[]>([]);
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadCarFAXUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiGetJson<CarFAXUser[]>(`/carfax/users`);
      
      const carfaxUsers: CarFAXUser[] = Array.isArray(response) 
        ? response 
        : (response && typeof response === 'object' && 'data' in response 
          ? ((response as { data?: CarFAXUser[] }).data || []) 
          : []);
      
      setUsers(carfaxUsers);
      
      // Load user info for each userId
      const uniqueUserIds = Array.from(new Set(carfaxUsers.map((u: CarFAXUser) => u.userId))).filter((id): id is string => Boolean(id));
      const missingUserIds = uniqueUserIds.filter((id: string) => !userInfoMap[id]);
      
      if (missingUserIds.length > 0) {
        const userInfoEntries: [string, UserInfo][] = [];
        
        for (const userId of missingUserIds) {
          try {
            const userRes = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (userRes.ok) {
              const userJson = await userRes.json();
              const userData = (userJson?.data || userJson) as UserInfo;
              userInfoEntries.push([userId, {
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone
              }]);
            }
          } catch (e) {
            console.error(`Error loading user info for ${userId}:`, e);
          }
        }
        
        if (userInfoEntries.length > 0) {
          setUserInfoMap(prev => ({ ...prev, ...Object.fromEntries(userInfoEntries) }));
        }
      }
    } catch (err) {
      console.error('Error loading CarFAX users:', err);
      setError(err instanceof Error ? err.message : 'მონაცემების ჩატვირთვა ვერ მოხერხდა');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userInfoMap]);

  useEffect(() => {
    loadCarFAXUsers();
  }, [loadCarFAXUsers]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ka-GE', {
      timeZone: 'Asia/Tbilisi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredUsers = users.filter((user) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const userInfo = userInfoMap[user.userId];
    const fullName = userInfo 
      ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ').toLowerCase()
      : '';
    const phone = userInfo?.phone?.toLowerCase() || '';
    
    return (
      user.userId.toLowerCase().includes(term) ||
      user.totalReports.toString().includes(term) ||
      fullName.includes(term) ||
      phone.includes(term)
    );
  });

  const totalStats = {
    totalUsers: users.length,
    totalReports: users.reduce((sum, user) => sum + user.totalReports, 0),
    totalUsed: users.reduce((sum, user) => sum + user.usage.used, 0),
    totalLimit: users.reduce((sum, user) => sum + user.usage.totalLimit, 0),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CarFAX მოთხოვნები</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">მომხმარებლები, რომლებიც აკეთებენ CarFAX მოთხოვნებს</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">სულ მომხმარებლები</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalUsers}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">სულ Report-ები</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStats.totalReports}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">გამოყენებული</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalStats.totalUsed}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">სულ ლიმიტი</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalStats.totalLimit}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="ძიება სახელით, ტელეფონით, User ID-ით ან Report-ების რაოდენობით..."
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">იტვირთება...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            CarFAX მომხმარებლები ვერ მოიძებნა
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    მომხმარებელი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Report-ების რაოდენობა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    გამოყენება
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    პირველი Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ბოლო Report
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => {
                  const usagePercentage = user.usage.totalLimit > 0 
                    ? (user.usage.used / user.usage.totalLimit) * 100 
                    : 0;
                  
                  const userInfo = userInfoMap[user.userId];
                  const fullName = userInfo 
                    ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') 
                    : null;
                  
                  return (
                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {fullName || userInfo?.phone || user.userId}
                        </div>
                        {fullName && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {userInfo?.phone && <span>{userInfo.phone}</span>}
                            {userInfo?.phone && <span className="mx-1">•</span>}
                            <span>{user.userId}</span>
                          </div>
                        )}
                        {!fullName && userInfo?.phone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.userId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {user.totalReports}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[100px]">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <span>{user.usage.used} / {user.usage.totalLimit}</span>
                              <span>{user.usage.remaining} დარჩენილი</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  usagePercentage >= 90
                                    ? 'bg-red-500'
                                    : usagePercentage >= 70
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.firstReportDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastReportDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
