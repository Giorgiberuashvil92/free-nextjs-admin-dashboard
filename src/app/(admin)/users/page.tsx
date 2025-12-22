"use client";
import React, { useEffect, useState } from "react";
import { apiGetJson } from "@/lib/api";

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
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState<string>("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deviceTokensMap, setDeviceTokensMap] = useState<Record<string, DeviceTokenSummary[]>>({});
  const [loadingTokens, setLoadingTokens] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const load = async () => {
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
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to load");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    (async () => {
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
      } catch (e: unknown) {
        const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
        setErr(message || "Failed to load");
        setRows([]); setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, role, active, limit, offset]);

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

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      loadDeviceTokens(userId);
    }
    setExpandedRows(newExpanded);
  };

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
                Send "მადლობა რომ შემოვიდით" push notification to all users
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
                      title: 'მადლობა',
                      body: 'მადლობა რომ შემოგვიერთდით! 🎉',
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
        <button className="px-3 py-2 bg-black text-white rounded" onClick={()=>{ setOffset(0); load(); }} disabled={loading}>Filter</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">User ID</th>
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
            {rows.map((u) => (
              <React.Fragment key={u.id}>
                <tr className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2">
                    <a className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs" href={`/users/${u.id}`}>
                      {u.id.substring(0, 12)}...
                    </a>
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
                    <button
                      onClick={() => handleDelete(u.id, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      🗑️ წაშლა
                    </button>
                  </td>
                </tr>
                {expandedRows.has(u.id) && (
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    <td colSpan={9} className="px-3 py-4">
                      {loadingTokens[u.id] ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Loading devices...</div>
                        </div>
                      ) : deviceTokensMap[u.id] && deviceTokensMap[u.id].length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Device Information:</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {deviceTokensMap[u.id].map((token, idx) => (
                              <div key={token._id || idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
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
                      ) : (
                        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                          No devices found for this user.
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length===0 && (
              <tr>
                <td className="px-3 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
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


