'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGetJson } from '@/lib/api';

// Helper functions საქართველოს დროს (Asia/Tbilisi, UTC+4)
const getGeorgiaTodayStart = (): Date => {
  const now = new Date();
  // Get current time in Georgia timezone
  const georgiaTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Tbilisi' });
  const georgiaDate = new Date(georgiaTimeStr);
  
  // Set to start of day in Georgia timezone
  const year = georgiaDate.getFullYear();
  const month = georgiaDate.getMonth();
  const day = georgiaDate.getDate();
  
  // Create date in Georgia timezone at 00:00:00
  const georgiaMidnight = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+04:00`);
  
  return georgiaMidnight;
};

const getGeorgiaYesterdayStart = (): Date => {
  const today = getGeorgiaTodayStart();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

const isDateInGeorgiaToday = (date: Date): boolean => {
  const todayStart = getGeorgiaTodayStart();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return date >= todayStart && date < tomorrowStart;
};

const isDateInGeorgiaYesterday = (date: Date): boolean => {
  const yesterdayStart = getGeorgiaYesterdayStart();
  const todayStart = getGeorgiaTodayStart();
  return date >= yesterdayStart && date < todayStart;
};

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

interface UniqueUser {
  userId: string;
  phone: string;
  firstName?: string;
  logins: LoginHistory[];
  loginCount: number;
}

interface DayStats {
  date: Date;
  dateString: string;
  logins: number;
  uniqueUsers: number;
  successfulLogins: number;
  failedLogins: number;
}

export default function TodayLoginsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | 'week'>('today');
  const [todayLogins, setTodayLogins] = useState<LoginHistory[]>([]);
  const [yesterdayLogins, setYesterdayLogins] = useState<LoginHistory[]>([]);
  const [weekLogins, setWeekLogins] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<{ logins: number; uniqueUsers: number; successfulLogins: number; failedLogins: number }>({
    logins: 0,
    uniqueUsers: 0,
    successfulLogins: 0,
    failedLogins: 0
  });
  const [yesterdayStats, setYesterdayStats] = useState<{ logins: number; uniqueUsers: number; successfulLogins: number; failedLogins: number }>({
    logins: 0,
    uniqueUsers: 0,
    successfulLogins: 0,
    failedLogins: 0
  });
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const [todayUniqueUsers, setTodayUniqueUsers] = useState<UniqueUser[]>([]);
  const [yesterdayUniqueUsers, setYesterdayUniqueUsers] = useState<UniqueUser[]>([]);
  const [showUniqueUsersModal, setShowUniqueUsersModal] = useState(false);
  const [showAllLoginsModal, setShowAllLoginsModal] = useState(false);
  const [selectedUserLogins, setSelectedUserLogins] = useState<LoginHistory[]>([]);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [filters, setFilters] = useState({
    userId: '',
    phone: '',
    status: '' as 'success' | 'failed' | '',
  });

  const getGeorgiaWeekStart = (): Date => {
    const today = getGeorgiaTodayStart();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6); // ბოლო 7 დღე (დღეს ჩათვლით)
    return weekStart;
  };

  const getDayStart = (date: Date): Date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+04:00`);
  };

  const isDateInDay = (date: Date, targetDate: Date): boolean => {
    const dayStart = getDayStart(targetDate);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    return date >= dayStart && date < nextDayStart;
  };

  const loadLogins = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '10000'); // გავზარდოთ limit 1 კვირისთვის
      
      // ბოლო 7 დღის მონაცემებისთვის
      const weekStart = getGeorgiaWeekStart();
      params.append('startDate', weekStart.toISOString());

      const response = await apiGetJson<{
        success: boolean;
        data: LoginHistory[];
        total: number;
        message: string;
      }>(`/login-history?${params.toString()}`);

      if (response.success && response.data) {
        // დღევანდელი შესვლები
        const todayData = response.data.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return isDateInGeorgiaToday(loginDate);
        });
        
        // გუშინდელი შესვლები
        const yesterdayData = response.data.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return isDateInGeorgiaYesterday(loginDate);
        });
        
        // დავალაგოთ ბოლო შესვლები პირველად
        const sortedTodayData = [...todayData].sort((a, b) => 
          new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
        );
        
        const sortedYesterdayData = [...yesterdayData].sort((a, b) => 
          new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
        );
        
        setTodayLogins(sortedTodayData);
        setYesterdayLogins(sortedYesterdayData);
        
        // დღევანდელი უნიკალური იუზერები
        const todayUniqueUsersMap = new Map<string, UniqueUser>();
        sortedTodayData.forEach((login) => {
          if (!todayUniqueUsersMap.has(login.userId)) {
            todayUniqueUsersMap.set(login.userId, {
              userId: login.userId,
              phone: login.phone,
              firstName: login.firstName,
              logins: [],
              loginCount: 0
            });
          }
          const user = todayUniqueUsersMap.get(login.userId)!;
          user.logins.push(login);
          user.loginCount++;
        });
        const todayUniqueUsersList = Array.from(todayUniqueUsersMap.values()).sort((a, b) => 
          b.loginCount - a.loginCount
        );
        setTodayUniqueUsers(todayUniqueUsersList);
        
        // დღევანდელი სტატისტიკა
        const todayUniqueUsersSet = new Set(sortedTodayData.map(item => item.userId));
        const todaySuccessfulLogins = sortedTodayData.filter(item => item.status === 'success').length;
        const todayFailedLogins = sortedTodayData.filter(item => item.status === 'failed').length;
        
        setTodayStats({
          logins: sortedTodayData.length,
          uniqueUsers: todayUniqueUsersSet.size,
          successfulLogins: todaySuccessfulLogins,
          failedLogins: todayFailedLogins
        });
        
        // გუშინდელი უნიკალური იუზერები
        const yesterdayUniqueUsersMap = new Map<string, UniqueUser>();
        sortedYesterdayData.forEach((login) => {
          if (!yesterdayUniqueUsersMap.has(login.userId)) {
            yesterdayUniqueUsersMap.set(login.userId, {
              userId: login.userId,
              phone: login.phone,
              firstName: login.firstName,
              logins: [],
              loginCount: 0
            });
          }
          const user = yesterdayUniqueUsersMap.get(login.userId)!;
          user.logins.push(login);
          user.loginCount++;
        });
        const yesterdayUniqueUsersList = Array.from(yesterdayUniqueUsersMap.values()).sort((a, b) => 
          b.loginCount - a.loginCount
        );
        setYesterdayUniqueUsers(yesterdayUniqueUsersList);
        
        // გუშინდელი სტატისტიკა
        const yesterdayUniqueUsersSet = new Set(sortedYesterdayData.map(item => item.userId));
        const yesterdaySuccessfulLogins = sortedYesterdayData.filter(item => item.status === 'success').length;
        const yesterdayFailedLogins = sortedYesterdayData.filter(item => item.status === 'failed').length;
        
        setYesterdayStats({
          logins: sortedYesterdayData.length,
          uniqueUsers: yesterdayUniqueUsersSet.size,
          successfulLogins: yesterdaySuccessfulLogins,
          failedLogins: yesterdayFailedLogins
        });

        // 1 კვირის სტატისტიკა
        const weekStart = getGeorgiaWeekStart();
        const weekData = response.data.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return loginDate >= weekStart;
        });
        setWeekLogins(weekData);

        // ყოველდღე სტატისტიკა
        const dailyStats: DayStats[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(getGeorgiaTodayStart());
          date.setDate(date.getDate() - i);
          const dayStart = getDayStart(date);
          const nextDayStart = new Date(dayStart);
          nextDayStart.setDate(nextDayStart.getDate() + 1);

          const dayData = weekData.filter((item) => {
            const loginDate = new Date(item.loginAt);
            return loginDate >= dayStart && loginDate < nextDayStart;
          });

          const uniqueUsersSet = new Set(dayData.map(item => item.userId));
          const successfulLogins = dayData.filter(item => item.status === 'success').length;
          const failedLogins = dayData.filter(item => item.status === 'failed').length;

          dailyStats.push({
            date: date,
            dateString: date.toLocaleDateString('ka-GE', { 
              timeZone: 'Asia/Tbilisi',
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }),
            logins: dayData.length,
            uniqueUsers: uniqueUsersSet.size,
            successfulLogins: successfulLogins,
            failedLogins: failedLogins
          });
        }
        setWeekStats(dailyStats);
      } else {
        setTodayLogins([]);
        setYesterdayLogins([]);
        setWeekLogins([]);
        setWeekStats([]);
      }
      } catch (error) {
        console.error('Error loading logins:', error);
        setTodayLogins([]);
        setYesterdayLogins([]);
        setWeekLogins([]);
        setWeekStats([]);
      } finally {
        setLoading(false);
      }
    }, [filters]);

  useEffect(() => {
    loadLogins();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLogins();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadLogins]);

  // Close modals when tab changes
  useEffect(() => {
    setShowUniqueUsersModal(false);
    setShowAllLoginsModal(false);
    setSelectedUserLogins([]);
    setSelectedUserName('');
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ka-GE', {
      timeZone: 'Asia/Tbilisi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const currentLogins = activeTab === 'today' ? todayLogins : yesterdayLogins;
  const currentStats = activeTab === 'today' ? todayStats : yesterdayStats;
  const currentUniqueUsers = activeTab === 'today' ? todayUniqueUsers : yesterdayUniqueUsers;

  const handleUniqueUsersClick = () => {
    setShowUniqueUsersModal(true);
  };

  const handleAllLoginsClick = () => {
    setShowAllLoginsModal(true);
  };

  const handleUserClick = (user: UniqueUser) => {
    setSelectedUserLogins(user.logins);
    setSelectedUserName(user.firstName || user.phone || user.userId);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">დღევანდელი და გუშინდელი შესვლები</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">დღეს და გუშინ შემოსული იუზერების სია</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              📅 {activeTab === 'today' ? 'დღეს' : activeTab === 'yesterday' ? 'გუშინ' : '1 კვირა'}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {activeTab === 'today' 
                ? new Date().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })
                : activeTab === 'yesterday'
                ? getGeorgiaYesterdayStart().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })
                : `${getGeorgiaWeekStart().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })} - ${new Date().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })}`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📅 დღევანდელი ({todayStats.logins})
            </button>
            <button
              onClick={() => setActiveTab('yesterday')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'yesterday'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📅 გუშინდელი ({yesterdayStats.logins})
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'week'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📅 1 კვირა ({weekStats.reduce((sum, day) => sum + day.uniqueUsers, 0)})
            </button>
          </nav>
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab !== 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">სულ შესვლა</div>
            <button
              onClick={handleAllLoginsClick}
              className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              {currentStats.logins}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">უნიკალური იუზერები</div>
            <button
              onClick={handleUniqueUsersClick}
              className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
            >
              {currentStats.uniqueUsers}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">წარმატებული</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{currentStats.successfulLogins}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">წარუმატებელი</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{currentStats.failedLogins}</div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📅 ბოლო 7 დღის სტატისტიკა
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      დღე
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      უნიკალური იუზერები
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      სულ შესვლა
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      წარმატებული
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      წარუმატებელი
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {weekStats.map((day, index) => {
                    const isToday = index === weekStats.length - 1;
                    const isYesterday = index === weekStats.length - 2;
                    return (
                      <tr 
                        key={day.dateString} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {day.dateString}
                          {isToday && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(დღეს)</span>}
                          {isYesterday && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(გუშინ)</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {day.uniqueUsers}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {day.logins}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {day.successfulLogins}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {day.failedLogins}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {weekStats.length > 0 && (
                    <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        სულ
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {weekStats.reduce((sum, day) => sum + day.uniqueUsers, 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        {weekStats.reduce((sum, day) => sum + day.logins, 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                        {weekStats.reduce((sum, day) => sum + day.successfulLogins, 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                        {weekStats.reduce((sum, day) => sum + day.failedLogins, 0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="User ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ტელეფონი
            </label>
            <input
              type="text"
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="ტელეფონი"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">ყველა</option>
              <option value="success">წარმატებული</option>
              <option value="failed">წარუმატებელი</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table - უნიკალური იუზერები */}
      {activeTab !== 'week' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">იტვირთება...</div>
          ) : currentUniqueUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {activeTab === 'today' ? 'დღევანდელი' : 'გუშინდელი'} უნიკალური იუზერები ვერ მოიძებნა
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    სახელი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ბოლო შესვლა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    შესვლების რაოდენობა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    მოწყობილობა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    App Version
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentUniqueUsers.map((user) => {
                  // ბოლო შესვლა (ყველაზე ახალი)
                  const lastLogin = user.logins.sort((a, b) => 
                    new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
                  )[0];
                  
                  return (
                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.userId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.firstName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(lastLogin.loginAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {user.loginCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {lastLogin.deviceInfo?.platform || '-'}
                        {lastLogin.deviceInfo?.deviceName && (
                          <span className="ml-1 text-xs">
                            ({lastLogin.deviceInfo.deviceName})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {lastLogin.deviceInfo?.appVersion ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            {lastLogin.deviceInfo.appVersion}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {/* Unique Users Modal */}
      {showUniqueUsersModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowUniqueUsersModal(false);
            setSelectedUserLogins([]);
            setSelectedUserName('');
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                უნიკალური იუზერები - {activeTab === 'today' ? 'დღევანდელი' : 'გუშინდელი'} ({currentUniqueUsers.length})
              </h2>
              <button
                onClick={() => {
                  setShowUniqueUsersModal(false);
                  setSelectedUserLogins([]);
                  setSelectedUserName('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedUserLogins.length === 0 ? (
              <div className="space-y-2">
                {currentUniqueUsers.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleUserClick(user)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {user.firstName || 'უცნობი'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.phone} • {user.userId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {user.loginCount} {user.loginCount === 1 ? 'შესვლა' : 'შესვლა'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {
                    setSelectedUserLogins([]);
                    setSelectedUserName('');
                  }}
                  className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2"
                >
                  ← უკან
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {selectedUserName} - შესვლების ლოგი ({selectedUserLogins.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          დრო
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          მოწყობილობა
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          App Version
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          სტატუსი
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedUserLogins.map((login) => (
                        <tr key={login.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(login.loginAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {login.deviceInfo?.platform || '-'}
                            {login.deviceInfo?.deviceName && (
                              <span className="ml-1 text-xs">
                                ({login.deviceInfo.deviceName})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {login.deviceInfo?.appVersion ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                                {login.deviceInfo.appVersion}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                login.status === 'success'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              }`}
                            >
                              {login.status === 'success' ? 'წარმატებული' : 'წარუმატებელი'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Logins Modal */}
      {showAllLoginsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowAllLoginsModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ყველა შესვლა - {activeTab === 'today' ? 'დღევანდელი' : 'გუშინდელი'} ({currentLogins.length})
              </h2>
              <button
                onClick={() => setShowAllLoginsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      სახელი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ტელეფონი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      დრო
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      მოწყობილობა
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      App Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      სტატუსი
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentLogins.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.userId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.firstName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.phone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(item.loginAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.deviceInfo?.platform || '-'}
                        {item.deviceInfo?.deviceName && (
                          <span className="ml-1 text-xs">
                            ({item.deviceInfo.deviceName})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.deviceInfo?.appVersion ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            {item.deviceInfo.appVersion}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.status === 'success'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
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
          </div>
        </div>
      )}
    </div>
  );
}
