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

const getGeorgiaOneWeekAgo = (): Date => {
  const today = getGeorgiaTodayStart();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return oneWeekAgo;
};

const getGeorgiaTwoWeeksAgo = (): Date => {
  const today = getGeorgiaTodayStart();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return twoWeeksAgo;
};

const isDateInGeorgiaLastTwoWeeks = (date: Date): boolean => {
  const twoWeeksAgo = getGeorgiaTwoWeeksAgo();
  return date >= twoWeeksAgo;
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

export default function LoginHistoryPage() {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [appVersionStats, setAppVersionStats] = useState<Record<string, number>>({});
  const [appVersionLoginCounts, setAppVersionLoginCounts] = useState<Record<string, number>>({});
  const [todayStats, setTodayStats] = useState<{ logins: number; uniqueUsers: number; versionStats: Record<string, number> }>({ logins: 0, uniqueUsers: 0, versionStats: {} });
  const [yesterdayStats, setYesterdayStats] = useState<{ logins: number; uniqueUsers: number; versionStats: Record<string, number> }>({ logins: 0, uniqueUsers: 0, versionStats: {} });
  const [versionUpdates, setVersionUpdates] = useState<Array<{ userId: string; phone: string; firstName?: string; version: string; updatedAt: Date }>>([]);
  const [firstUsersPerVersion, setFirstUsersPerVersion] = useState<Record<string, { userId: string; phone: string; firstName?: string; firstSeen: Date }>>({});
  const [userVersionHistoryList, setUserVersionHistoryList] = useState<Array<{ userId: string; phone: string; firstName?: string; updates: Array<{ fromVersion: string; toVersion: string; updatedAt: Date }> }>>([]);
  const [lastTwoWeeksUserVersions, setLastTwoWeeksUserVersions] = useState<Array<{ userId: string; phone: string; firstName?: string; versions: Array<{ version: string; loginAt: Date }> }>>([]);
  const [versionUserStats, setVersionUserStats] = useState<Record<string, number>>({});
  const [selectedYesterdayVersion, setSelectedYesterdayVersion] = useState<string | null>(null);
  const [yesterdayVersionUsers, setYesterdayVersionUsers] = useState<Record<string, Array<{ userId: string; phone: string; firstName?: string; updatedTo?: string; updatedAt?: Date }>>>({});
  const [usersWithoutVersion, setUsersWithoutVersion] = useState<Array<{ userId: string; phone: string; firstName?: string; lastVersion?: string; lastLoginAt?: Date }>>([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    stats: false,
    todayYesterday: false,
    versionUpdates: false,
    versionHistory: false,
    lastTwoWeeks: false,
    appVersionAnalytics: false,
    firstUsers: false,
    usersWithoutVersion: false,
  });
  const [filters, setFilters] = useState({
    userId: '',
    phone: '',
    status: '' as 'success' | 'failed' | '',
  });

  const loadLoginHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '1500');
      
      // ბოლო 7 დღის მონაცემებისთვის (საქართველოს დრო)
      const oneWeekAgo = getGeorgiaOneWeekAgo();
      params.append('startDate', oneWeekAgo.toISOString());

      const response = await apiGetJson<{
        success: boolean;
        data: LoginHistory[];
        total: number;
        message: string;
      }>(`/login-history?${params.toString()}`);

      if (response.success && response.data) {
        // Client-side filtering - თუ API არ მხარდება date parameter-ს (საქართველოს დრო)
        const oneWeekAgo = getGeorgiaOneWeekAgo();
        const filteredData = response.data.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return loginDate >= oneWeekAgo;
        });
        
        setLoginHistory(filteredData);
        
        // დალოგვა JSON-ის (ბოლო კვირის მონაცემები)
        console.log('📊 Login History JSON (ბოლო 7 დღე):', JSON.stringify(filteredData, null, 2));
        console.log(`📅 ბოლო კვირაში: ${filteredData.length} ჩანაწერი (სულ: ${response.data.length})`);
        
        // App Version-ების ანალიტიკა
        // Version update history-სთვის გამოვიყენოთ მთელი lifetime მონაცემები
        // სხვა ანალიტიკისთვის - ბოლო კვირის მონაცემები
        const sortedDataForVersionHistory = [...response.data].sort((a, b) => 
          new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
        );
        
        // ბოლო კვირის მონაცემები სხვა ანალიტიკისთვის
        const sortedData = [...filteredData].sort((a, b) => 
          new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
        );
        
        const versionCounts: Record<string, number> = {};
        const uniqueUsersByVersion: Record<string, Set<string>> = {};
        
        // Version update tracking - თითოეული იუზერისთვის version-ების ისტორია
        // გამოვიყენოთ მთელი lifetime მონაცემები version history-სთვის
        const userVersionHistory: Record<string, { version: string; firstSeen: Date; user: LoginHistory }> = {};
        const versionUpdatesList: Array<{ userId: string; phone: string; firstName?: string; version: string; updatedAt: Date }> = [];
        
        // პირველი იუზერები თითოეული version-ისთვის (ვინ "ჩაწერა" ახალი ვერსია)
        const firstUsersByVersion: Record<string, { userId: string; phone: string; firstName?: string; firstSeen: Date }> = {};
        
        // Version update history თითოეული იუზერისთვის (რომელ version-იდან რომელ version-ზე გადავიდა)
        // გამოვიყენოთ მთელი lifetime მონაცემები
        const userVersionUpdateHistory: Record<string, Array<{ fromVersion: string; toVersion: string; updatedAt: Date }>> = {};
        
        // Version history-სთვის გამოვიყენოთ მთელი lifetime მონაცემები
        sortedDataForVersionHistory.forEach((item) => {
          if (item.status === 'success' && item.deviceInfo?.appVersion) {
            const version = item.deviceInfo.appVersion;
            const loginDate = new Date(item.loginAt);
            
            // დავთვალოთ ლოგინები
            versionCounts[version] = (versionCounts[version] || 0) + 1;
            
            // დავთვალოთ უნიკალური იუზერები (მხოლოდ ერთხელ)
            if (!uniqueUsersByVersion[version]) {
              uniqueUsersByVersion[version] = new Set();
            }
            uniqueUsersByVersion[version].add(item.userId);
            
            // პირველი იუზერი თითოეული version-ისთვის (ვინ პირველად "ჩაწერა" ეს version)
            if (!firstUsersByVersion[version] || loginDate < firstUsersByVersion[version].firstSeen) {
              firstUsersByVersion[version] = {
                userId: item.userId,
                phone: item.phone,
                firstName: item.firstName,
                firstSeen: loginDate
              };
            }
            
            // Version update tracking - თუ იუზერმა პირველად გამოიყენა ეს version
            if (!userVersionHistory[item.userId] || userVersionHistory[item.userId].version !== version) {
              // თუ ეს ახალი version-ია, ეს არის განახლება
              if (userVersionHistory[item.userId] && userVersionHistory[item.userId].version !== version) {
                const fromVersion = userVersionHistory[item.userId].version;
                
                versionUpdatesList.push({
                  userId: item.userId,
                  phone: item.phone,
                  firstName: item.firstName,
                  version: version,
                  updatedAt: loginDate
                });
                
                // დავამატოთ version update history-ში
                if (!userVersionUpdateHistory[item.userId]) {
                  userVersionUpdateHistory[item.userId] = [];
                }
                userVersionUpdateHistory[item.userId].push({
                  fromVersion: fromVersion,
                  toVersion: version,
                  updatedAt: loginDate
                });
              } else if (!userVersionHistory[item.userId]) {
                // პირველი version-ი ამ იუზერისთვის
                if (!userVersionUpdateHistory[item.userId]) {
                  userVersionUpdateHistory[item.userId] = [];
                }
                userVersionUpdateHistory[item.userId].push({
                  fromVersion: 'უცნობი',
                  toVersion: version,
                  updatedAt: loginDate
                });
              }
              
              userVersionHistory[item.userId] = {
                version: version,
                firstSeen: loginDate,
                user: item
              };
            }
          }
        });
        
        // გადავაქციოთ userVersionUpdateHistory array-ად UI-სთვის
        // მხოლოდ იმ იუზერებს, რომლებსაც აქვთ firstName (სახელი)
        // გამოვიყენოთ მთელი lifetime მონაცემები firstName-ის მოსაძებნად
        const userVersionHistoryList = Object.entries(userVersionUpdateHistory)
          .map(([userId, updates]) => {
            const firstUser = sortedDataForVersionHistory.find(item => item.userId === userId);
            return {
              userId,
              phone: firstUser?.phone || '',
              firstName: firstUser?.firstName,
              updates: updates.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
            };
          })
          .filter(user => {
            // დავტოვოთ მხოლოდ იმ იუზერები, რომლებსაც აქვთ firstName (სახელი)
            return user.updates.length > 0 && user.firstName && user.firstName.trim() !== '';
          })
          .sort((a, b) => b.updates[b.updates.length - 1].updatedAt.getTime() - a.updates[a.updates.length - 1].updatedAt.getTime());
        
        // გადავაქციოთ Set-ები რიცხვებად
        const uniqueUserCounts: Record<string, number> = {};
        Object.keys(uniqueUsersByVersion).forEach(version => {
          uniqueUserCounts[version] = uniqueUsersByVersion[version].size;
        });
        
        console.log('📱 App Version Statistics:');
        console.log('  Total logins per version:', versionCounts);
        console.log('  Unique users per version (ერთხელ დათვლილი):', uniqueUserCounts);
        console.log('🔄 Version Updates:', versionUpdatesList.length, 'განახლება');
        console.log('  Updates:', versionUpdatesList.map(u => ({
          user: u.firstName || u.phone,
          version: u.version,
          date: u.updatedAt.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })
        })));
        console.log('⭐ პირველი იუზერები თითოეული version-ისთვის (ვინ "ჩაწერა" ახალი ვერსია):');
        Object.entries(firstUsersByVersion).forEach(([version, user]) => {
          console.log(`  ${version}: ${user.firstName || user.phone} (${user.firstSeen.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })})`);
        });
        
        console.log('📊 User Version Update History:');
        userVersionHistoryList.forEach(user => {
          console.log(`  ${user.firstName || user.phone}:`, user.updates.map(u => 
            `${u.fromVersion} -> ${u.toVersion} (${u.updatedAt.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })})`
          ).join(', '));
        });
        
        // ბოლო 2 კვირის შემოსვლების ანალიტიკა - ვინ რომელი version-ით იყო შემოსული
        const twoWeeksAgo = getGeorgiaTwoWeeksAgo();
        const lastTwoWeeksData = response.data.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return loginDate >= twoWeeksAgo && item.status === 'success' && item.deviceInfo?.appVersion;
        });
        
        // თითოეული იუზერის version-ების სია ბოლო 2 კვირაში
        const userVersionsLastTwoWeeks: Record<string, Array<{ version: string; loginAt: Date }>> = {};
        
        lastTwoWeeksData.forEach((item) => {
          const version = item.deviceInfo!.appVersion!;
          const loginDate = new Date(item.loginAt);
          
          if (!userVersionsLastTwoWeeks[item.userId]) {
            userVersionsLastTwoWeeks[item.userId] = [];
          }
          
          // დავამატოთ version, თუ არ არის დუბლირებული ან არის ახალი
          const existingVersion = userVersionsLastTwoWeeks[item.userId].find(v => v.version === version);
          if (!existingVersion) {
            userVersionsLastTwoWeeks[item.userId].push({ version, loginAt: loginDate });
          } else if (loginDate < existingVersion.loginAt) {
            // თუ ეს ადრეა, განვაახლოთ დრო
            existingVersion.loginAt = loginDate;
          }
        });
        
        // გადავაქციოთ array-ად და დავალაგოთ
        const lastTwoWeeksUserVersionsList = Object.entries(userVersionsLastTwoWeeks)
          .map(([userId, versions]) => {
            const firstUser = lastTwoWeeksData.find(item => item.userId === userId);
            return {
              userId,
              phone: firstUser?.phone || '',
              firstName: firstUser?.firstName,
              versions: versions.sort((a, b) => a.loginAt.getTime() - b.loginAt.getTime())
            };
          })
          .filter(user => {
            // დავტოვოთ მხოლოდ იმ იუზერები, რომლებსაც აქვთ firstName
            return user.versions.length > 0 && user.firstName && user.firstName.trim() !== '';
          })
          .sort((a, b) => {
            // დავალაგოთ ბოლო შემოსვლის მიხედვით
            const aLastLogin = a.versions[a.versions.length - 1].loginAt;
            const bLastLogin = b.versions[b.versions.length - 1].loginAt;
            return bLastLogin.getTime() - aLastLogin.getTime();
          });
        
        // სტატისტიკა - რომელი version-ები და რამდენ იუზერს აქვს თითოეული
        const versionUserStats: Record<string, number> = {};
        lastTwoWeeksUserVersionsList.forEach(user => {
          // თითოეული version-ისთვის დავთვალოთ უნიკალური იუზერები
          user.versions.forEach(v => {
            if (!versionUserStats[v.version]) {
              versionUserStats[v.version] = 0;
            }
            versionUserStats[v.version]++;
          });
        });
        
        console.log('📅 ბოლო 2 კვირის შემოსვლები - ვინ რომელი version-ით:');
        lastTwoWeeksUserVersionsList.forEach(user => {
          console.log(`  ${user.firstName}:`, user.versions.map(v => 
            `${v.version} (${v.loginAt.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})`
          ).join(', '));
        });
        console.log('📊 სტატისტიკა - რომელი version-ები და რამდენ იუზერს აქვს:', versionUserStats);
        
        // შევინახოთ state-ში
        setAppVersionStats(uniqueUserCounts);
        setAppVersionLoginCounts(versionCounts);
        setVersionUpdates(versionUpdatesList.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
        setFirstUsersPerVersion(firstUsersByVersion);
        setUserVersionHistoryList(userVersionHistoryList);
        setLastTwoWeeksUserVersions(lastTwoWeeksUserVersionsList);
        setVersionUserStats(versionUserStats);
        
        // იუზერები, რომლებსაც არ გამოუყენებიათ ვერსია 1.0.13
        const targetVersion = '1.0.13';
        const usersWithVersion = new Set<string>();
        const allUsersMap = new Map<string, { userId: string; phone: string; firstName?: string; lastVersion?: string; lastLoginAt?: Date }>();
        
        // ვიპოვოთ ყველა იუზერი, რომელმაც გამოიყენა targetVersion
        response.data.forEach((item) => {
          if (item.status === 'success' && item.deviceInfo?.appVersion === targetVersion) {
            usersWithVersion.add(item.userId);
          }
          
          // შევინახოთ ყველა იუზერის ინფორმაცია
          if (!allUsersMap.has(item.userId)) {
            allUsersMap.set(item.userId, {
              userId: item.userId,
              phone: item.phone,
              firstName: item.firstName,
              lastVersion: item.deviceInfo?.appVersion,
              lastLoginAt: new Date(item.loginAt)
            });
          } else {
            // განვაახლოთ ბოლო version და login time
            const existing = allUsersMap.get(item.userId)!;
            const loginDate = new Date(item.loginAt);
            if (item.deviceInfo?.appVersion && (!existing.lastLoginAt || loginDate > existing.lastLoginAt)) {
              existing.lastVersion = item.deviceInfo.appVersion;
              existing.lastLoginAt = loginDate;
            }
          }
        });
        
        // იპოვნეთ იუზერები, რომლებსაც არ გამოუყენებიათ targetVersion
        const usersWithoutTargetVersion = Array.from(allUsersMap.values())
          .filter(user => !usersWithVersion.has(user.userId))
          .filter(user => user.firstName && user.firstName.trim() !== '') // მხოლოდ სახელის მქონე იუზერები
          .sort((a, b) => {
            // დავალაგოთ ბოლო login-ის მიხედვით (ახლებური პირველად)
            if (a.lastLoginAt && b.lastLoginAt) {
              return b.lastLoginAt.getTime() - a.lastLoginAt.getTime();
            }
            return 0;
          });
        
        console.log(`📋 იუზერები, რომლებსაც არ გამოუყენებიათ ვერსია ${targetVersion}:`, usersWithoutTargetVersion.length);
        setUsersWithoutVersion(usersWithoutTargetVersion);
        
        // დღევანდელი და გუშინდელი მონაცემების გამოთვლა (საქართველოს დრო)
        // დღევანდელი მონაცემები (საქართველოს დრო)
        const todayData = filteredData.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return isDateInGeorgiaToday(loginDate);
        });
        
        const todayUsers = new Set(todayData.map(item => item.userId));
        const todayVersionCounts: Record<string, number> = {};
        todayData.forEach((item) => {
          if (item.status === 'success' && item.deviceInfo?.appVersion) {
            const version = item.deviceInfo.appVersion;
            todayVersionCounts[version] = (todayVersionCounts[version] || 0) + 1;
          }
        });
        
        setTodayStats({
          logins: todayData.length,
          uniqueUsers: todayUsers.size,
          versionStats: todayVersionCounts
        });
        
        // გუშინდელი მონაცემები (საქართველოს დრო)
        const yesterdayData = filteredData.filter((item) => {
          const loginDate = new Date(item.loginAt);
          return isDateInGeorgiaYesterday(loginDate);
        });
        
        const yesterdayUsers = new Set(yesterdayData.map(item => item.userId));
        const yesterdayVersionCounts: Record<string, number> = {};
        yesterdayData.forEach((item) => {
          if (item.status === 'success' && item.deviceInfo?.appVersion) {
            const version = item.deviceInfo.appVersion;
            yesterdayVersionCounts[version] = (yesterdayVersionCounts[version] || 0) + 1;
          }
        });
        
        // გუშინდელი version-ების ანალიტიკა - ვინ განაახლა version
        // დავალაგოთ გუშინდელი მონაცემები დროის მიხედვით
        const sortedYesterdayData = [...yesterdayData].sort((a, b) => 
          new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
        );
        
        // თითოეული version-ისთვის ვინ განაახლა
        const yesterdayVersionUsersMap: Record<string, Array<{ userId: string; phone: string; firstName?: string; updatedTo?: string; updatedAt?: Date }>> = {};
        const userVersionHistoryYesterday: Record<string, string> = {}; // userId -> last version
        
        sortedYesterdayData.forEach((item) => {
          if (item.status === 'success' && item.deviceInfo?.appVersion) {
            const version = item.deviceInfo.appVersion;
            const loginDate = new Date(item.loginAt);
            
            if (!yesterdayVersionUsersMap[version]) {
              yesterdayVersionUsersMap[version] = [];
            }
            
            // თუ იუზერმა განაახლა version
            if (userVersionHistoryYesterday[item.userId] && userVersionHistoryYesterday[item.userId] !== version) {
              const fromVersion = userVersionHistoryYesterday[item.userId];
              // დავამატოთ იმ version-ის სიაში, საიდანაც განაახლა
              const existingUser = yesterdayVersionUsersMap[fromVersion].find(u => u.userId === item.userId);
              if (!existingUser) {
                yesterdayVersionUsersMap[fromVersion].push({
                  userId: item.userId,
                  phone: item.phone,
                  firstName: item.firstName,
                  updatedTo: version,
                  updatedAt: loginDate
                });
              }
            }
            
            // დავამატოთ იმ იუზერები, რომლებმაც გამოიყენეს ეს version
            const existingUser = yesterdayVersionUsersMap[version].find(u => u.userId === item.userId);
            if (!existingUser) {
              yesterdayVersionUsersMap[version].push({
                userId: item.userId,
                phone: item.phone,
                firstName: item.firstName
              });
            }
            
            userVersionHistoryYesterday[item.userId] = version;
          }
        });
        
        setYesterdayStats({
          logins: yesterdayData.length,
          uniqueUsers: yesterdayUsers.size,
          versionStats: yesterdayVersionCounts
        });
        setYesterdayVersionUsers(yesterdayVersionUsersMap);
        
        console.log('📅 დღევანდელი:', {
          logins: todayData.length,
          uniqueUsers: todayUsers.size,
          versions: todayVersionCounts
        });
        console.log('📅 გუშინდელი:', {
          logins: yesterdayData.length,
          uniqueUsers: yesterdayUsers.size,
          versions: yesterdayVersionCounts
        });
      } else {
        setLoginHistory([]);
      }
    } catch (error) {
      console.error('Error loading login history:', error);
      setLoginHistory([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLoginHistory();
  }, [loadLoginHistory]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginHistory.length]); // Recalculate stats when loginHistory changes

  const loadStats = async () => {
    try {
      // Try with limit parameter to get all users
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
      }>(`/login-history/stats?limit=10000`);

      if (response.success && response.data) {
        // If backend doesn't support limit, calculate from loginHistory
        let loginsPerUserToday = response.data.loginsPerUserToday || [];
        
        // If we have less than uniqueUsersToday, calculate from loginHistory
        if (loginsPerUserToday.length < response.data.uniqueUsersToday && loginHistory.length > 0) {
          const todayStart = getGeorgiaTodayStart();
          const tomorrowStart = new Date(todayStart);
          tomorrowStart.setDate(tomorrowStart.getDate() + 1);
          
          const todayLogins = loginHistory.filter(item => {
            const loginDate = new Date(item.loginAt);
            return loginDate >= todayStart && loginDate < tomorrowStart && item.status === 'success';
          });
          
          // Count logins per user
          const userLoginCounts: Record<string, { userId: string; phone: string; firstName?: string; count: number }> = {};
          
          todayLogins.forEach(login => {
            if (!userLoginCounts[login.userId]) {
              userLoginCounts[login.userId] = {
                userId: login.userId,
                phone: login.phone,
                firstName: login.firstName,
                count: 0
              };
            }
            userLoginCounts[login.userId].count++;
          });
          
          // Convert to array and sort by count (descending)
          loginsPerUserToday = Object.values(userLoginCounts).sort((a, b) => b.count - a.count);
        }
        
        setStats({
          ...response.data,
          loginsPerUserToday
        });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">დალოგინების ისტორია</h1>
            <p className="text-gray-600 mt-1">იუზერების დალოგინების დეტალები</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="text-sm font-semibold text-blue-700">📅 ბოლო 7 დღე</div>
            <div className="text-xs text-blue-600">
              {getGeorgiaOneWeekAgo().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })} - {new Date().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-4 mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, stats: !prev.stats }))}
            className="w-full flex items-center justify-between bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">📊 სტატისტიკა</h2>
            <span className="text-gray-500">{collapsedSections.stats ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.stats && (
          <div className="space-y-4">
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
        </div>
      )}

      {/* დღევანდელი და გუშინდელი სტატისტიკა */}
      <div className="mb-6">
        <button
          onClick={() => setCollapsedSections(prev => ({ ...prev, todayYesterday: !prev.todayYesterday }))}
          className="w-full flex items-center justify-between bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition-colors mb-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">📅 დღევანდელი და გუშინდელი</h2>
          <span className="text-gray-500">{collapsedSections.todayYesterday ? '▶' : '▼'}</span>
        </button>
        {!collapsedSections.todayYesterday && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* დღევანდელი */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">📅 დღევანდელი</h2>
            <div className="text-sm text-gray-500">{new Date().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">ლოგინები</div>
              <div className="text-2xl font-bold text-green-600">{todayStats.logins}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">უნიკალური იუზერები</div>
              <div className="text-2xl font-bold text-blue-600">{todayStats.uniqueUsers}</div>
            </div>
          </div>
          
          {Object.keys(todayStats.versionStats).length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">ვერსიები დღეს:</div>
              <div className="space-y-2">
                {Object.entries(todayStats.versionStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([version, count]) => (
                    <div key={version} className="flex items-center justify-between bg-gray-50 rounded p-2">
                      <span className="text-sm font-medium text-gray-700">{version}</span>
                      <span className="text-sm font-bold text-green-600">{count} ლოგინი</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* გუშინდელი */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">📅 გუშინდელი</h2>
            <div className="text-sm text-gray-500">
              {getGeorgiaYesterdayStart().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-gray-600 mb-1">ლოგინები</div>
              <div className="text-2xl font-bold text-orange-600">{yesterdayStats.logins}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">უნიკალური იუზერები</div>
              <div className="text-2xl font-bold text-purple-600">{yesterdayStats.uniqueUsers}</div>
            </div>
          </div>
          
          {Object.keys(yesterdayStats.versionStats).length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">ვერსიები გუშინ:</div>
              <div className="space-y-2">
                {Object.entries(yesterdayStats.versionStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([version, count]) => {
                    const usersWithUpdate = yesterdayVersionUsers[version]?.filter(u => u.updatedTo) || [];
                    return (
                      <button
                        key={version}
                        onClick={() => setSelectedYesterdayVersion(selectedYesterdayVersion === version ? null : version)}
                        className="w-full flex items-center justify-between bg-gray-50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{version}</span>
                          {usersWithUpdate.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                              {usersWithUpdate.length} განახლება
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{count} ლოგინი</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{selectedYesterdayVersion === version ? '▼' : '▶'}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
      </div>

      {/* Modal გუშინდელი version-ის იუზერებისთვის */}
      {selectedYesterdayVersion && yesterdayVersionUsers[selectedYesterdayVersion] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedYesterdayVersion(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Version {selectedYesterdayVersion} - იუზერები
              </h2>
              <button
                onClick={() => setSelectedYesterdayVersion(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-700 dark:text-blue-300">
                სულ: {yesterdayVersionUsers[selectedYesterdayVersion].length} იუზერი
              </div>
            </div>
            
            {/* იუზერები, რომლებმაც განაახლეს version */}
            {yesterdayVersionUsers[selectedYesterdayVersion].filter(u => u.updatedTo).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  🔄 იუზერები, რომლებმაც განაახლეს version:
                </h3>
                <div className="space-y-2">
                  {yesterdayVersionUsers[selectedYesterdayVersion]
                    .filter(u => u.updatedTo)
                    .map((user) => (
                      <div key={user.userId} className="bg-green-50 dark:bg-green-900/20 rounded p-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName || 'უცნობი'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {selectedYesterdayVersion} → {user.updatedTo}
                            </div>
                            {user.updatedAt && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {user.updatedAt.toLocaleString('ka-GE', { 
                                  timeZone: 'Asia/Tbilisi',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* ყველა იუზერი, რომელმაც გამოიყენა ეს version */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                👥 ყველა იუზერი, რომელმაც გამოიყენა {selectedYesterdayVersion}:
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {yesterdayVersionUsers[selectedYesterdayVersion]
                  .filter(u => u.firstName && u.firstName.trim() !== '')
                  .map((user) => (
                    <div key={user.userId} className="bg-gray-50 dark:bg-gray-700 rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>
                      </div>
                      {user.updatedTo && (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">
                          განაახლა → {user.updatedTo}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Version Update History - რომელ version-იდან რომელ version-ზე გადავიდა */}
      {userVersionHistoryList.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, versionHistory: !prev.versionHistory }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">🔄 Version განახლებების ისტორია</h2>
            <span className="text-gray-500">{collapsedSections.versionHistory ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.versionHistory && (
          <div className="p-6 pt-0">
          <p className="text-sm text-gray-600 mb-4">
            თითოეული იუზერის version განახლებების ისტორია - რომელ version-იდან რომელ version-ზე გადავიდა (მთელი ლაივთაიმის მონაცემები)
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    იუზერი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version განახლებები
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userVersionHistoryList.slice(0, 200).map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.firstName || 'უცნობი'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {user.updates.map((update, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded border border-blue-200"
                          >
                            <span className="text-xs font-medium text-gray-600">{update.fromVersion}</span>
                            <span className="text-xs text-gray-400">→</span>
                            <span className="text-xs font-semibold text-blue-700">{update.toVersion}</span>
                            <span className="text-xs text-gray-500 ml-1">
                              ({update.updatedAt.toLocaleString('ka-GE', { 
                                timeZone: 'Asia/Tbilisi',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userVersionHistoryList.length > 200 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                და {userVersionHistoryList.length - 200} სხვა იუზერი...
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {/* ბოლო 2 კვირის შემოსვლები - ვინ რომელი version-ით */}
      {lastTwoWeeksUserVersions.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, lastTwoWeeks: !prev.lastTwoWeeks }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">📅 ბოლო 2 კვირის შემოსვლები</h2>
            <span className="text-gray-500">{collapsedSections.lastTwoWeeks ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.lastTwoWeeks && (
          <div className="p-6 pt-0">
          <p className="text-sm text-gray-600 mb-4">
            თითოეული იუზერის version-ები, რომლებითაც შემოვიდა ბოლო 2 კვირაში
          </p>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm font-semibold text-purple-700">
                სულ იუზერები: {lastTwoWeeksUserVersions.length}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {getGeorgiaTwoWeeksAgo().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })} - {new Date().toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-blue-700 mb-2">
                სტატისტიკა - რომელი version-ები:
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(versionUserStats)
                  .sort((a, b) => {
                    // დავალაგოთ version-ები კლებადობით (უფრო ახალი ვერსიები ზედა)
                    const versionA = a[0].split('.').map(Number);
                    const versionB = b[0].split('.').map(Number);
                    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
                      const numA = versionA[i] || 0;
                      const numB = versionB[i] || 0;
                      if (numB !== numA) return numB - numA;
                    }
                    return b[1] - a[1]; // თუ version-ები ერთნაირია, დავალაგოთ იუზერების რაოდენობით
                  })
                  .map(([version, userCount]) => (
                    <div key={version} className="text-xs text-blue-600 flex items-center justify-between">
                      <span className="font-medium">{version}</span>
                      <span className="font-semibold">{userCount} იუზერი</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    იუზერი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version-ები (რომლებითაც შემოვიდა)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lastTwoWeeksUserVersions.slice(0, 300).map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.firstName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {user.versions.map((versionInfo, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 rounded border border-purple-200"
                          >
                            <span className="text-xs font-semibold text-purple-700">{versionInfo.version}</span>
                            <span className="text-xs text-gray-500">
                              ({versionInfo.loginAt.toLocaleString('ka-GE', { 
                                timeZone: 'Asia/Tbilisi',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lastTwoWeeksUserVersions.length > 300 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                და {lastTwoWeeksUserVersions.length - 300} სხვა იუზერი...
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {/* Version Updates Analytics */}
      {versionUpdates.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, versionUpdates: !prev.versionUpdates }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">🔄 Version განახლებები</h2>
            <span className="text-gray-500">{collapsedSections.versionUpdates ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.versionUpdates && (
          <div className="p-6 pt-0">
          <p className="text-sm text-gray-600 mb-4">
            ვინ განაახლა app version და როდის (ბოლო კვირაში)
          </p>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-blue-700">
              სულ განახლება: {versionUpdates.length} იუზერი
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    იუზერი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ახალი Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    განახლების დრო
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {versionUpdates.slice(0, 100).map((update, index) => (
                  <tr key={`${update.userId}-${update.version}-${update.updatedAt.getTime()}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {update.firstName || 'უცნობი'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {update.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {update.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {update.updatedAt.toLocaleString('ka-GE', { 
                        timeZone: 'Asia/Tbilisi',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {versionUpdates.length > 100 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                და {versionUpdates.length - 100} სხვა განახლება...
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {/* App Version Analytics */}
      {Object.keys(appVersionStats).length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, appVersionAnalytics: !prev.appVersionAnalytics }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">📱 App Version Analytics</h2>
            <span className="text-gray-500">{collapsedSections.appVersionAnalytics ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.appVersionAnalytics && (
          <div className="p-6 pt-0">
          <p className="text-sm text-gray-600 mb-4">
            უნიკალური იუზერების რაოდენობა და ლოგინების სტატისტიკა თითოეული app version-ისთვის
          </p>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">სულ ვერსიები</div>
              <div className="text-3xl font-bold text-blue-600">{Object.keys(appVersionStats).length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">სულ უნიკალური იუზერები</div>
              <div className="text-3xl font-bold text-green-600">
                {Object.values(appVersionStats).reduce((sum, count) => sum + count, 0)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">სულ ლოგინები</div>
              <div className="text-3xl font-bold text-purple-600">
                {Object.values(appVersionLoginCounts).reduce((sum, count) => sum + count, 0)}
              </div>
            </div>
          </div>

          {/* Version Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(appVersionStats)
              .sort((a, b) => {
                // დავალაგოთ version-ები კლებადობით (უფრო ახალი ვერსიები ზედა)
                const versionA = a[0].split('.').map(Number);
                const versionB = b[0].split('.').map(Number);
                for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
                  const numA = versionA[i] || 0;
                  const numB = versionB[i] || 0;
                  if (numB !== numA) return numB - numA;
                }
                return b[1] - a[1]; // თუ version-ები ერთნაირია, დავალაგოთ იუზერების რაოდენობით
              })
              .map(([version, userCount]) => {
                const loginCount = appVersionLoginCounts[version] || 0;
                const totalUsers = Object.values(appVersionStats).reduce((sum, count) => sum + count, 0);
                const percentage = totalUsers > 0 ? ((userCount / totalUsers) * 100).toFixed(1) : '0';
                const maxUsers = Math.max(...Object.values(appVersionStats));
                const firstUser = firstUsersPerVersion[version];
                
                return (
                  <div
                    key={version}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Version</div>
                        <div className="text-xl font-bold text-blue-600">{version}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">იუზერები</div>
                        <div className="text-xl font-bold text-indigo-600">{userCount}</div>
                        <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>ლოგინები: {loginCount}</span>
                          <span>საშუალო: {loginCount > 0 ? (loginCount / userCount).toFixed(1) : '0'}/იუზერი</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(userCount / maxUsers) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* პირველი იუზერი (ვინ &quot;ჩაწერა&quot; ეს version) */}
                      {firstUser && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-xs text-gray-500 mb-1">⭐ პირველი იუზერი:</div>
                          <div className="text-sm font-semibold text-gray-900">{firstUser.firstName || firstUser.phone}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {firstUser.firstSeen.toLocaleString('ka-GE', { 
                              timeZone: 'Asia/Tbilisi',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          
          {/* Most Popular Version */}
          {Object.keys(appVersionStats).length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">🏆 ყველაზე პოპულარული ვერსია</div>
                  <div className="text-2xl font-bold text-green-700">
                    {Object.entries(appVersionStats).sort((a, b) => b[1] - a[1])[0][0]}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {Object.entries(appVersionStats).sort((a, b) => b[1] - a[1])[0][1]} უნიკალური იუზერი
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">📱 ყველაზე ახალი ვერსია</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {Object.keys(appVersionStats).sort((a, b) => {
                      const versionA = a.split('.').map(Number);
                      const versionB = b.split('.').map(Number);
                      for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
                        const numA = versionA[i] || 0;
                        const numB = versionB[i] || 0;
                        if (numB !== numA) return numB - numA;
                      }
                      return 0;
                    })[0]}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {/* პირველი იუზერები თითოეული Version-ისთვის */}
      {Object.keys(firstUsersPerVersion).length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, firstUsers: !prev.firstUsers }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">⭐ პირველი იუზერები (ვინ &quot;ჩაწერა&quot; ახალი ვერსია)</h2>
            <span className="text-gray-500">{collapsedSections.firstUsers ? '▶' : '▼'}</span>
          </button>
          {!collapsedSections.firstUsers && (
          <div className="p-6 pt-0">
          <p className="text-sm text-gray-600 mb-4">
            თითოეული version-ის პირველი იუზერი, რომელმაც გამოიყენა ეს version (1500 ჩანაწერიდან)
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    იუზერი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ტელეფონი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    პირველი გამოყენების დრო
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    უნიკალური იუზერები
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(firstUsersPerVersion)
                  .sort((a, b) => {
                    // დავალაგოთ version-ები კლებადობით
                    const versionA = a[0].split('.').map(Number);
                    const versionB = b[0].split('.').map(Number);
                    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
                      const numA = versionA[i] || 0;
                      const numB = versionB[i] || 0;
                      if (numB !== numA) return numB - numA;
                    }
                    return 0;
                  })
                  .map(([version, user]) => (
                    <tr key={version} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {version}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.firstName || 'უცნობი'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {user.phone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {user.firstSeen.toLocaleString('ka-GE', { 
                          timeZone: 'Asia/Tbilisi',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {appVersionStats[version] || 0} იუზერი
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          </div>
          )}
        </div>
      )}

      {/* იუზერები, რომლებსაც არ გამოუყენებიათ ვერსია 1.0.13 */}
      {usersWithoutVersion.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, usersWithoutVersion: !prev.usersWithoutVersion }))}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-bold text-gray-900">⚠️ იუზერები, რომლებსაც არ გამოუყენებიათ ვერსია 1.0.13</h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                {usersWithoutVersion.length} იუზერი
              </span>
              <span className="text-gray-500">{collapsedSections.usersWithoutVersion ? '▶' : '▼'}</span>
            </div>
          </button>
          {!collapsedSections.usersWithoutVersion && (
          <div className="p-6 pt-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                იუზერები, რომლებსაც არ გამოუყენებიათ ვერსია 1.0.13 (მხოლოდ სახელის მქონე იუზერები)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const phones = usersWithoutVersion.map(u => u.phone).join('\n');
                    const blob = new Blob([phones], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `users-without-version-1.0.13-${new Date().toISOString().split('T')[0]}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  📥 ნომრების ამოღება
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`ნამდვილად გსურთ გაგზავნა SMS ${usersWithoutVersion.length} იუზერს?`)) {
                      return;
                    }
                    
                    setSendingSMS(true);
                    try {
                      const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                        ? '/api/proxy' 
                        : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
                      
                      const phoneNumbers = usersWithoutVersion.map(u => u.phone);
                      const message = 'თქვენ იყენებთ ძველ ვერსიას გთხოვთ განაახლოთ და იხილოთ განახლებული კატეგორიების გვერდი :)';
                      
                      const response = await fetch(`${API_BASE}/sms/bulk-send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: message,
                          phoneNumbers: phoneNumbers,
                          smsno: 1, // ინფორმაციული
                        }),
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                      }
                      
                      const result = await response.json();
                      const sentCount = result.sent || result.success?.sent || phoneNumbers.length;
                      alert(`✅ წარმატებით გაიგზავნა SMS ${sentCount} იუზერს!`);
                    } catch (error) {
                      console.error('Error sending SMS:', error);
                      alert(`❌ შეცდომა: ${error instanceof Error ? error.message : 'SMS-ის გაგზავნა ვერ მოხერხდა'}`);
                    } finally {
                      setSendingSMS(false);
                    }
                  }}
                  disabled={sendingSMS}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {sendingSMS ? '⏳ იგზავნება...' : '📱 SMS გაგზავნა'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      იუზერი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ტელეფონი
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ბოლო ვერსია
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ბოლო დალოგინება
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersWithoutVersion.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.firstName || 'უცნობი'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {user.phone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.lastVersion ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {user.lastVersion}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                            უცნობი
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLoginAt ? (
                          user.lastLoginAt.toLocaleString('ka-GE', {
                            timeZone: 'Asia/Tbilisi',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          'უცნობი'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersWithoutVersion.length > 100 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                და {usersWithoutVersion.length - 100} სხვა იუზერი...
              </div>
            )}
          </div>
          )}
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
