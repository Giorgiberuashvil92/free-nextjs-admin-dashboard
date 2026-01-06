"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiPatch } from "@/lib/api";

type DeviceTokenSummary = {
  _id?: string;
  platform?: string;
  deviceInfo?: {
    deviceName?: string | null;
    modelName?: string | null;
    brand?: string | null;
    osName?: string | null;
    osVersion?: string | null;
  };
};

type UserRow = {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: string;
  preferences?: any;
  deviceTokensCount?: number;
  ownedCarwashes?: string[];
  ownedStores?: string[];
  ownedDismantlers?: string[];
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState<string>("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deviceTokensMap, setDeviceTokensMap] = useState<Record<string, DeviceTokenSummary[]>>({});
  const [loadingTokens, setLoadingTokens] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [userPayments, setUserPayments] = useState<Record<string, any[]>>({});
  const [userSubscriptions, setUserSubscriptions] = useState<Record<string, any>>({});
  const [userLoginHistory, setUserLoginHistory] = useState<Record<string, any[]>>({});
  const [loadingUserData, setLoadingUserData] = useState<Record<string, boolean>>({});
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ role: '', isActive: true });

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (active) params.set("active", active);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const res = await apiGetJson<{ success: boolean; data: UserRow[]; total: number; limit: number; offset: number }>(`/users?${params.toString()}`);
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
      
      // Load subscriptions for all users
      const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? '/api/proxy' 
        : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
      
      // Also load all subscriptions to match by userId
      let allSubscriptions: any[] = [];
      try {
        const allSubsRes = await fetch(`${API_BASE}/subscriptions?t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (allSubsRes.ok) {
          const allSubsData = await allSubsRes.json();
          allSubscriptions = Array.isArray(allSubsData) ? allSubsData : (allSubsData.data || []);
        }
      } catch (e) {
        console.error("Error loading all subscriptions:", e);
      }

      // Match subscriptions to users by userId
      const subscriptionsMap: Record<string, any> = {};
      allSubscriptions.forEach((sub: any) => {
        if (sub.userId) {
          subscriptionsMap[sub.userId] = sub;
        }
      });

      // Add all matched subscriptions to state
      const matchedSubscriptions: Record<string, any> = {};
      (res.data ?? []).forEach((user) => {
        // Try to find subscription by userId
        if (subscriptionsMap[user.id]) {
          matchedSubscriptions[user.id] = subscriptionsMap[user.id];
        }
      });
      
      // Update state with matched subscriptions
      if (Object.keys(matchedSubscriptions).length > 0) {
        setUserSubscriptions(prev => ({ ...prev, ...matchedSubscriptions }));
      }

      // Also try direct API calls for each user (as fallback)
      const subscriptionPromises = (res.data ?? []).map(async (user) => {
        try {
          // Skip if already matched
          if (matchedSubscriptions[user.id]) {
            return;
          }

          // Fallback to direct API call
          const subRes = await fetch(`${API_BASE}/api/payments/subscription/user/${user.id}/status`);
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData.success && subData.data) {
              setUserSubscriptions(prev => ({ ...prev, [user.id]: subData.data }));
            }
          }
        } catch (e) {
          // Ignore errors for individual subscriptions
        }
      });
      
      await Promise.all(subscriptionPromises);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to load");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, role, active, limit, offset]);

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`ნამდვილად გსურთ ${userName || userId} user-ის წაშლა?`)) {
      return;
    }

    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? '/api/proxy' 
        : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
      
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      alert('✅ User წარმატებით წაიშალა!');
      load(); // Reload the list
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`❌ შეცდომა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({ role: user.role, isActive: user.isActive });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setLoading(true);
    setErr("");
    try {
      await apiPatch(`/users/${editingUser.id}`, {
        role: editForm.role,
        isActive: editForm.isActive,
      });
      alert('✅ მომხმარებელი წარმატებით განახლდა!');
      setEditingUser(null);
      await load();
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to update");
      alert(`❌ შეცდომა: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const loadDeviceTokens = async (userId: string) => {
    if (deviceTokensMap[userId] || loadingTokens[userId]) return;
    
    setLoadingTokens(prev => ({ ...prev, [userId]: true }));
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? '/api/proxy' 
        : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
      
      const params = new URLSearchParams();
      params.append('userId', userId);
      params.append('t', Date.now().toString());
      const res = await fetch(`${API_BASE}/notifications/devices?${params.toString()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        if (Array.isArray(data)) {
          setDeviceTokensMap(prev => ({ ...prev, [userId]: data }));
        }
      }
    } catch (e) {
      console.error("Error loading device tokens:", e);
    } finally {
      setLoadingTokens(prev => ({ ...prev, [userId]: false }));
    }
  };

  const loadUserData = async (userId: string) => {
    if (loadingUserData[userId]) return;
    
    setLoadingUserData(prev => ({ ...prev, [userId]: true }));
    try {
      const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? '/api/proxy' 
        : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");

      // Load payments
      try {
        const paymentsRes = await fetch(`${API_BASE}/api/payments/user/${userId}`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setUserPayments(prev => ({ ...prev, [userId]: paymentsData.data || [] }));
        }
      } catch (e) {
        console.error("Error loading payments:", e);
      }

      // Load subscription
      try {
        const subRes = await fetch(`${API_BASE}/api/payments/subscription/user/${userId}/status`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.success && subData.data) {
            setUserSubscriptions(prev => ({ ...prev, [userId]: subData.data }));
          }
        }
      } catch (e) {
        console.error("Error loading subscription:", e);
      }

      // Load login history
      try {
        const loginRes = await fetch(`${API_BASE}/login-history/user/${userId}?limit=10`);
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          setUserLoginHistory(prev => ({ ...prev, [userId]: loginData.data || [] }));
        }
      } catch (e) {
        console.error("Error loading login history:", e);
      }
    } finally {
      setLoadingUserData(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      loadDeviceTokens(userId);
      loadUserData(userId);
    }
    setExpandedRows(newExpanded);
  };

  // Filter rows by subscription plan if filter is set
  const filteredRows = subscriptionPlan 
    ? rows.filter(u => {
        const sub = userSubscriptions[u.id];
        if (!sub) return subscriptionPlan === 'free';
        const planId = (sub.planId || '').toLowerCase();
        const planName = (sub.planName || '').toLowerCase();
        if (subscriptionPlan === 'premium') {
          return planId.includes('premium') || planName.includes('premium');
        }
        if (subscriptionPlan === 'basic') {
          return planId.includes('basic') || planName.includes('basic');
        }
        return false;
      })
    : rows;

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  // Calculate device statistics from all users
  const deviceStats = {
    total: 0,
    ios: 0,
    android: 0,
    usersWithTokens: 0,
  };
  
  // Count from loaded device tokens
  Object.values(deviceTokensMap).forEach(tokens => {
    tokens.forEach(token => {
      deviceStats.total++;
      if (token.platform === 'ios') {
        deviceStats.ios++;
      } else if (token.platform === 'android') {
        deviceStats.android++;
      }
    });
  });

  // Count users with tokens and add uncounted tokens
  rows.forEach(user => {
    if (user.deviceTokensCount && user.deviceTokensCount > 0) {
      deviceStats.usersWithTokens++;
      
      if (!deviceTokensMap[user.id]) {
        // We don't know the platform breakdown for unloaded tokens,
        // but we can add to total
        const alreadyCounted = deviceTokensMap[user.id]?.length || 0;
        const uncounted = user.deviceTokensCount - alreadyCounted;
        if (uncounted > 0) {
          deviceStats.total += uncounted;
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Export All Tokens & Broadcast Button */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Export Tokens */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Export All Device Tokens</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Download all device tokens as JSON for Firebase push notifications
              </p>
            </div>
            <button
            onClick={async () => {
              try {
                const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                  ? '/api/proxy' 
                  : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
                
                // Fetch all device tokens
                const res = await fetch(`${API_BASE}/notifications/devices?t=${Date.now()}`, {
                  cache: "no-store",
                  headers: { 'Cache-Control': 'no-cache' }
                });
                
                if (!res.ok) {
                  throw new Error(`Failed to fetch tokens: ${res.status}`);
                }
                
                const json = await res.json();
                const allTokens = json?.data || json || [];
                
                // Extract only tokens - simple array for Firebase
                const tokens = allTokens
                  .map((token: any) => token.token || token.fcmToken || token.deviceToken)
                  .filter(Boolean);
                
                // Simple JSON with just tokens array
                const firebaseFormat = tokens;
                
                // Download JSON
                const dataStr = JSON.stringify(firebaseFormat, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `all-device-tokens-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                
                alert(`✅ Successfully exported ${allTokens.length} device tokens!`);
              } catch (error) {
                console.error("Error exporting tokens:", error);
                alert(`❌ Error exporting tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              📥 Export All Tokens (JSON)
            </button>
          </div>
        </div>

        {/* Broadcast Notification */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Send Welcome Notification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send &quot;მადლობა რომ შემოვიდით&quot; push notification to all users
              </p>
            </div>
            <button
              onClick={async () => {
                if (!confirm('ნამდვილად გსურთ ყველა user-ს გაუგზავნოთ push notification?')) {
                  return;
                }
                
                try {
                  const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                    ? '/api/proxy' 
                    : (process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app");
                  
                  const res = await fetch(`${API_BASE}/notifications/broadcast`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: 'გილოცავთ ! ',
                      body: 'გილოცავთ ახალ წელს! 🎉',
                      data: {
                        type: 'welcome',
                        timestamp: new Date().toISOString(),
                      },
                    }),
                  });
                  
                  if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.message || `HTTP error! status: ${res.status}`);
                  }
                  
                  const result = await res.json();
                  alert(`✅ Successfully sent notification to ${result.sent || result.total || 0} devices!`);
                } catch (error) {
                  console.error("Error sending broadcast:", error);
                  alert(`❌ Error sending notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              📢 Send to All Users
            </button>
          </div>
        </div>
      </div>

      {/* Device Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Users with Tokens</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{deviceStats.usersWithTokens}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">out of {rows.length} users</div>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Devices</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{deviceStats.total}</div>
            </div>
            <div className="text-3xl">📱</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">iOS Devices</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{deviceStats.ios}</div>
              {deviceStats.total > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {Math.round((deviceStats.ios / deviceStats.total) * 100)}%
                </div>
              )}
            </div>
            <div className="text-3xl">🍎</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Android Devices</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{deviceStats.android}</div>
              {deviceStats.total > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {Math.round((deviceStats.android / deviceStats.total) * 100)}%
                </div>
              )}
            </div>
            <div className="text-3xl">🤖</div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              მომხმარებლის რედაქტირება
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  მომხმარებელი
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {[editingUser.firstName, editingUser.lastName].filter(Boolean).join(' ') || editingUser.phone}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="customer">customer</option>
                  <option value="owner">owner</option>
                  <option value="manager">manager</option>
                  <option value="employee">employee</option>
                  <option value="user">user</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                {loading ? "შენახვა..." : "შენახვა"}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border rounded dark:border-gray-600 dark:text-white"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600">Search</div>
          <input className="border rounded px-3 py-2 w-64" placeholder="phone, email, name, id" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-gray-600">Role</div>
          <select className="border rounded px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="">All</option>
            <option value="customer">customer</option>
            <option value="owner">owner</option>
            <option value="manager">manager</option>
            <option value="employee">employee</option>
            <option value="user">user</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Active</div>
          <select className="border rounded px-3 py-2" value={active} onChange={(e)=>setActive(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">საბსქრიფშენი</div>
          <select className="border rounded px-3 py-2" value={subscriptionPlan} onChange={(e)=>setSubscriptionPlan(e.target.value)}>
            <option value="">ყველა</option>
            <option value="premium">Premium</option>
            <option value="basic">Basic</option>
            <option value="free">Free</option>
          </select>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={()=>{ setOffset(0); load(); }} disabled={loading}>Filter</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">User ID</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">საბსქრიფშენი</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Phone</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Devices</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Updated</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((u) => (
              <React.Fragment key={u.id}>
                <tr className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2">
                    <a className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs" href={`/users/${u.id}`}>
                      {u.id.substring(0, 20)}...
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      // Try to find subscription by userId match (not just by user.id key)
                      const subscription = userSubscriptions[u.id] || 
                        Object.values(userSubscriptions).find((sub: any) => sub?.userId === u.id);
                      
                      if (subscription) {
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              subscription.planId === 'premium' || subscription.planName?.toLowerCase().includes('premium')
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : subscription.planId === 'basic' || subscription.planName?.toLowerCase().includes('basic')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {subscription.planName || subscription.planId || 'N/A'}
                            </span>
                            {subscription.userId && subscription.userId !== u.id && (
                              <span className="text-xs text-red-600 dark:text-red-400" title={`Subscription userId: ${subscription.userId}, User id: ${u.id}`}>
                                ⚠️ ID mismatch
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                          Free
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {[u.firstName, u.lastName].filter(Boolean).join(' ').charAt(0).toUpperCase() || u.phone.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.phone}</td>
                  <td className="px-3 py-2 text-xs">{u.email || '-'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      u.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {u.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(u.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline text-xs font-medium flex items-center gap-1"
                        disabled={loadingTokens[u.id]}
                      >
                        <span>{expandedRows.has(u.id) ? '▼' : '▶'}</span>
                        <span>
                          {loadingTokens[u.id] 
                            ? 'Loading...' 
                            : u.deviceTokensCount !== undefined 
                              ? `${u.deviceTokensCount} device(s)` 
                              : 'View'}
                        </span>
                      </button>
                      <a 
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs" 
                        href={`/users/${u.id}#tokens`}
                        title="View details"
                      >
                        🔗
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {u.createdAt ? (
                      <div className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{new Date(u.createdAt).toLocaleDateString('ka-GE')}</div>
                        <div className="text-gray-500 dark:text-gray-400">{new Date(u.createdAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {u.updatedAt ? (
                      <div className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{new Date(u.updatedAt).toLocaleDateString('ka-GE')}</div>
                        <div className="text-gray-500 dark:text-gray-400">{new Date(u.updatedAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        ✏️ რედაქტირება
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        🗑️ წაშლა
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(u.id) && (
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    <td colSpan={10} className="px-3 py-4">
                      {loadingTokens[u.id] || loadingUserData[u.id] ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">იტვირთება...</div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* User Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Subscription Card */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">საბსქრიფშენი</div>
                              {userSubscriptions[u.id] ? (
                                <div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {userSubscriptions[u.id].planName || userSubscriptions[u.id].planId || 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span className={`px-2 py-0.5 rounded ${
                                      userSubscriptions[u.id].status === 'active' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                      {userSubscriptions[u.id].status || 'N/A'}
                                    </span>
                                  </div>
                                  {userSubscriptions[u.id].planPrice && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {userSubscriptions[u.id].planPrice}₾/{userSubscriptions[u.id].period || 'თვე'}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">საბსქრიფშენი არ არის</div>
                              )}
                            </div>

                            {/* Payments Summary */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">გადახდები</div>
                              {userPayments[u.id] && userPayments[u.id].length > 0 ? (
                                <div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {userPayments[u.id].length}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    სულ: {userPayments[u.id].reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toFixed(2)}₾
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">გადახდები არ არის</div>
                              )}
                            </div>

                            {/* Login History */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ბოლო დალოგინება</div>
                              {userLoginHistory[u.id] && userLoginHistory[u.id].length > 0 ? (
                                <div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {new Date(userLoginHistory[u.id][0].loginAt).toLocaleDateString('ka-GE')}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {userLoginHistory[u.id].length} ჩანაწერი
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">ისტორია არ არის</div>
                              )}
                            </div>

                            {/* Owned Services */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">სერვისები</div>
                              <div className="text-xs space-y-1">
                                {u.ownedCarwashes && u.ownedCarwashes.length > 0 && (
                                  <div>სამრეცხაო: {u.ownedCarwashes.length}</div>
                                )}
                                {u.ownedStores && u.ownedStores.length > 0 && (
                                  <div>მაღაზია: {u.ownedStores.length}</div>
                                )}
                                {u.ownedDismantlers && u.ownedDismantlers.length > 0 && (
                                  <div>დაშლილი: {u.ownedDismantlers.length}</div>
                                )}
                                {(!u.ownedCarwashes || u.ownedCarwashes.length === 0) && 
                                 (!u.ownedStores || u.ownedStores.length === 0) && 
                                 (!u.ownedDismantlers || u.ownedDismantlers.length === 0) && (
                                  <div className="text-gray-500 dark:text-gray-400">სერვისები არ არის</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Tabs for detailed info */}
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="space-y-4">
                              {/* Devices */}
                              {deviceTokensMap[u.id] && deviceTokensMap[u.id].length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📱 მოწყობილობები:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {deviceTokensMap[u.id].map((token, idx) => (
                                      <div key={token._id || idx} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            token.platform === 'ios' 
                                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                                              : token.platform === 'android'
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                          }`}>
                                            {token.platform || 'unknown'}
                                          </span>
                                        </div>
                                        {token.deviceInfo ? (
                                          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                            <div><strong>Device:</strong> {token.deviceInfo.deviceName || token.deviceInfo.modelName || '-'}</div>
                                            {token.deviceInfo.brand && <div><strong>Brand:</strong> {token.deviceInfo.brand}</div>}
                                            {(token.deviceInfo.osName || token.deviceInfo.osVersion) && (
                                              <div><strong>OS:</strong> {token.deviceInfo.osName || '-'} {token.deviceInfo.osVersion || ''}</div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400 dark:text-gray-500 italic">No device info</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Payments */}
                              {userPayments[u.id] && userPayments[u.id].length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">💳 გადახდები ({userPayments[u.id].length}):</div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead className="bg-gray-100 dark:bg-gray-900">
                                        <tr>
                                          <th className="px-2 py-1 text-left">თარიღი</th>
                                          <th className="px-2 py-1 text-left">თანხა</th>
                                          <th className="px-2 py-1 text-left">მეთოდი</th>
                                          <th className="px-2 py-1 text-left">სტატუსი</th>
                                          <th className="px-2 py-1 text-left">კონტექსტი</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {userPayments[u.id].slice(0, 5).map((payment: any, idx: number) => (
                                          <tr key={payment._id || idx} className="border-t">
                                            <td className="px-2 py-1">
                                              {payment.paymentDate 
                                                ? new Date(payment.paymentDate).toLocaleDateString('ka-GE')
                                                : payment.createdAt 
                                                ? new Date(payment.createdAt).toLocaleDateString('ka-GE')
                                                : '-'}
                                            </td>
                                            <td className="px-2 py-1 font-semibold">{payment.amount?.toFixed(2) || '0.00'}₾</td>
                                            <td className="px-2 py-1">{payment.paymentMethod || '-'}</td>
                                            <td className="px-2 py-1">
                                              <span className={`px-2 py-0.5 rounded text-xs ${
                                                payment.status === 'completed' 
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                              }`}>
                                                {payment.status || '-'}
                                              </span>
                                            </td>
                                            <td className="px-2 py-1">{payment.context || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {userPayments[u.id].length > 5 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                        და {userPayments[u.id].length - 5} სხვა...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Login History */}
                              {userLoginHistory[u.id] && userLoginHistory[u.id].length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🔐 Login ისტორია ({userLoginHistory[u.id].length}):</div>
                                  <div className="space-y-2">
                                    {userLoginHistory[u.id].slice(0, 5).map((login: any, idx: number) => (
                                      <div key={login._id || idx} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-600 dark:text-gray-400">
                                            {login.loginAt ? new Date(login.loginAt).toLocaleString('ka-GE') : '-'}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded ${
                                            login.status === 'success' 
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                          }`}>
                                            {login.status || '-'}
                                          </span>
                                        </div>
                                        {login.ipAddress && (
                                          <div className="text-gray-500 dark:text-gray-500 mt-1">IP: {login.ipAddress}</div>
                                        )}
                                      </div>
                                    ))}
                                    {userLoginHistory[u.id].length > 5 && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        და {userLoginHistory[u.id].length - 5} სხვა...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredRows.length===0 && (
              <tr>
                <td className="px-3 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={10}>
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                      <div>Loading users...</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-4xl">👤</div>
                      <div className="font-medium">No users found</div>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 border rounded" disabled={!canPrev || loading} onClick={()=> setOffset(Math.max(0, offset - limit))}>Prev</button>
        <button className="px-3 py-2 border rounded" disabled={!canNext || loading} onClick={()=> setOffset(offset + limit)}>Next</button>
        <div className="text-sm text-gray-600">{offset + 1}-{Math.min(offset + limit, total)} / {total}</div>
      </div>
    </div>
  );
}


