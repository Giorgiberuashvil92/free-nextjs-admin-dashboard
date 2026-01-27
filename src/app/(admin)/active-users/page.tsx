'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiGetJson, API_BASE } from '@/lib/api';

interface LoginHistory {
  _id?: string;
  id?: string;
  userId: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  loginAt: string;
  status: 'success' | 'failed';
}

interface ActiveUser {
  userId: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  loginCount: number;
  lastLogin: string;
  role?: string;
}

export default function ActiveUsersPage() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { firstName?: string; lastName?: string; phone?: string; role?: string }>>({});

  useEffect(() => {
    const loadActiveUsers = async () => {
      try {
        setLoading(true);
        setError('');
        
        // ვიღებთ login-history-დან ყველა შემოსვლას
        const params = new URLSearchParams();
        params.append('limit', '50000'); // დიდი limit რომ ყველა მონაცემი მოვიღოთ
        params.append('status', 'success'); // მხოლოდ წარმატებული შემოსვლები
        
        const response = await apiGetJson<{
          success: boolean;
          data: LoginHistory[];
          total: number;
        }>(`/login-history?${params.toString()}`);
        
        if (response.success && response.data) {
          // ვქმნით Map-ს userId-ს მიხედვით
          const usersMap = new Map<string, ActiveUser>();
          
          response.data.forEach((login) => {
            if (!usersMap.has(login.userId)) {
              usersMap.set(login.userId, {
                userId: login.userId,
                phone: login.phone,
                firstName: login.firstName,
                lastName: login.lastName,
                loginCount: 0,
                lastLogin: login.loginAt,
              });
            }
            
            const user = usersMap.get(login.userId)!;
            user.loginCount++;
            
            // ვანახლებთ ბოლო შემოსვლის თარიღს
            const loginDate = new Date(login.loginAt).getTime();
            const lastLoginDate = new Date(user.lastLogin).getTime();
            if (loginDate > lastLoginDate) {
              user.lastLogin = login.loginAt;
            }
          });
          
          // ვალაგებთ loginCount-ის მიხედვით (ყველაზე მეტი შემოსვლა პირველად)
          const sorted = Array.from(usersMap.values()).sort((a, b) => b.loginCount - a.loginCount);
          
          setActiveUsers(sorted);
          console.log(`სულ დატვირთულია ${sorted.length} იუზერი`);
          
          // ვიტვირთავთ იუზერების დეტალურ ინფორმაციას (სახელები, როლი) - 50-50-ით ფეიჯინგით
          const uniqueUserIds = Array.from(new Set(sorted.map(u => u.userId))).filter((id): id is string => Boolean(id));
          const missingUserIds = uniqueUserIds.filter(id => !userInfoMap[id]);
          
          if (missingUserIds.length > 0) {
            const batchSize = 50;
            let currentBatch = 0;
            
            const loadBatch = async () => {
              const start = currentBatch * batchSize;
              const end = Math.min(start + batchSize, missingUserIds.length);
              const batch = missingUserIds.slice(start, end);
              
              if (batch.length === 0) return;
              
              const userInfoEntries: [string, { firstName?: string; lastName?: string; phone?: string; role?: string }][] = [];
              
              // პარალელურად ვტვირთავთ batch-ის ყველა იუზერს
              const promises = batch.map(async (userId) => {
                try {
                  const userRes = await apiGetJson<{ firstName?: string; lastName?: string; phone?: string; role?: string } | { success: boolean; data: { firstName?: string; lastName?: string; phone?: string; role?: string } }>(
                    `/users/${encodeURIComponent(userId)}`
                  );
                  
                  const userData = Array.isArray(userRes) 
                    ? userRes[0]
                    : ((userRes as any).success ? (userRes as { success: boolean; data: { firstName?: string; lastName?: string; phone?: string; role?: string } }).data : userRes);
                  
                  if (userData && (userData.firstName || userData.lastName || userData.phone || userData.role)) {
                    console.log(`Loaded user info for ${userId}:`, { firstName: userData.firstName, lastName: userData.lastName, role: userData.role });
                    return [userId, {
                      firstName: userData.firstName,
                      lastName: userData.lastName,
                      phone: userData.phone,
                      role: userData.role
                    }] as [string, { firstName?: string; lastName?: string; phone?: string; role?: string }];
                  }
                } catch (e) {
                  console.error(`Error loading user info for ${userId}:`, e);
                }
                return null;
              });
              
              const results = await Promise.all(promises);
              const validEntries = results.filter((entry): entry is [string, { firstName?: string; lastName?: string; phone?: string; role?: string }] => entry !== null);
              userInfoEntries.push(...validEntries);
              
              if (userInfoEntries.length > 0) {
                console.log(`Updating userInfoMap with ${userInfoEntries.length} entries from batch ${currentBatch + 1}`);
                setUserInfoMap(prev => {
                  const updated = { ...prev, ...Object.fromEntries(userInfoEntries) };
                  console.log(`userInfoMap updated, total keys: ${Object.keys(updated).length}`);
                  return updated;
                });
              }
              
              // თუ კიდევ არის მონაცემები, ვტვირთავთ შემდეგ batch-ს
              currentBatch++;
              if (end < missingUserIds.length) {
                // მცირე დაყოვნება batch-ებს შორის
                setTimeout(loadBatch, 100);
              }
            };
            
            // ვიწყებთ პირველი batch-ის ჩატვირთვას
            loadBatch();
          }
        } else {
          setActiveUsers([]);
        }
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e 
          ? String((e as { message?: unknown }).message) 
          : 'Failed to load active users';
        setError(message);
        setActiveUsers([]);
        console.error('Error loading active users:', e);
      } finally {
        setLoading(false);
      }
    };

    loadActiveUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ვანახლებთ activeUsers-ს, როცა userInfoMap იცვლება
  useEffect(() => {
    if (Object.keys(userInfoMap).length > 0) {
      setActiveUsers(prevUsers => {
        const updated = prevUsers.map(user => {
          const info = userInfoMap[user.userId];
          if (info) {
            return {
              ...user,
              firstName: info.firstName || user.firstName,
              lastName: info.lastName || user.lastName,
              phone: info.phone || user.phone,
              role: info.role || user.role
            };
          }
          return user;
        });
        return updated;
      });
    }
  }, [userInfoMap]);

  // ფილტრაცია და ძიება
  const filteredUsers = useMemo(() => {
    let filtered = activeUsers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const userName = user.firstName 
          ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName).toLowerCase()
          : '';
        const phone = user.phone?.toLowerCase() || '';
        const userId = user.userId.toLowerCase();
        return userName.includes(query) || phone.includes(query) || userId.includes(query);
      });
    }

    return filtered;
  }, [activeUsers, searchQuery]);

  // პაგინაცია
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery]);

  const formatDate = (dateString: string | number) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString * 1000);
      return date.toLocaleString('ka-GE', {
        timeZone: 'Asia/Tbilisi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateString.toString();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">ყველაზე აქტიური იუზერები</h1>
        
        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">ძიება</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="სახელი, ტელეფონი ან ID..."
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* Items per page */}
            <div>
              <label className="block text-sm font-medium mb-2">გვერდზე</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Stats */}
      {!loading && activeUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400">სულ იუზერები</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeUsers.length}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400">სულ შემოსვლები</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeUsers.reduce((sum, user) => sum + user.loginCount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
              <div className="text-sm text-gray-600 dark:text-gray-400">საშუალო შემოსვლა/იუზერი</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {activeUsers.length > 0 
                  ? Math.round(activeUsers.reduce((sum, user) => sum + user.loginCount, 0) / activeUsers.length)
                  : 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="text-center py-8">იტვირთება...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'იუზერები არ მოიძებნა' : 'მონაცემები არ მოიძებნა'}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-900">
                  <th className="text-left p-3">რანგი</th>
                  <th className="text-left p-3">იუზერი</th>
                  <th className="text-left p-3">ტელეფონი</th>
                  <th className="text-left p-3">როლი</th>
                  <th className="text-left p-3">შემოსვლების რაოდენობა</th>
                  <th className="text-left p-3">ბოლო შემოსვლა</th>
                  <th className="text-left p-3">მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  const userName = user.firstName 
                    ? (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName)
                    : (user.phone || user.userId);
                  
                  const userImage = user.phone 
                    ? `/images/user/user-${(user.phone.charCodeAt(user.phone.length - 1) % 38) + 1}.jpg`
                    : null;

                  return (
                    <tr key={user.userId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          globalIndex === 0 ? 'bg-yellow-500' : 
                          globalIndex === 1 ? 'bg-gray-400' : 
                          globalIndex === 2 ? 'bg-amber-600' : 
                          'bg-brand-500'
                        }`}>
                          {globalIndex + 1}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {userImage ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                              <Image
                                src={userImage}
                                alt={userName}
                                width={40}
                                height={40}
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {userName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.userId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-900 dark:text-white">
                          {user.phone || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {user.role || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {user.loginCount.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(user.lastLogin)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/user-events?userId=${user.userId}`}
                          className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-sm"
                        >
                          ნახვა →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                გვერდი {currentPage} {totalPages}-დან ({filteredUsers.length} იუზერი)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  წინა
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  შემდეგი
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
