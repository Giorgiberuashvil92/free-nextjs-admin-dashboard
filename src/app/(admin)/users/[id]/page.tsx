"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

type DeviceToken = {
  _id?: string;
  id?: string;
  userId: string;
  token?: string;
  fcmToken?: string;
  deviceToken?: string;
  platform: string;
  provider?: string;
  createdAt?: string;
  updatedAt?: string;
  deviceInfo?: {
    deviceName?: string | null;
    modelName?: string | null;
    brand?: string | null;
    manufacturer?: string | null;
    osName?: string | null;
    osVersion?: string | null;
    deviceType?: string | null;
    totalMemory?: number | null;
    appVersion?: string | null;
    appBuildNumber?: string | null;
    platform?: string | null;
    platformVersion?: string | null;
  };
};

type UserDetail = {
  id?: string;
  _id?: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: string;
  preferences?: any;
  createdAt?: number | string;
  updatedAt?: number | string;
  [key: string]: any; // For any other fields
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/users/${id}?t=${Date.now()}`, { 
          cache: "no-store", 
          headers: { 'Cache-Control': 'no-cache' } 
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const json = await res.json();
        const userData = json?.data || json;
        setUser(userData);
      } catch (e) {
        console.error("Error loading user:", e);
        setError("მომხმარებლის ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoading(false);
      }
    };

    const loadDeviceTokens = async () => {
      setTokensLoading(true);
      try {
        // Use the new notifications/devices endpoint
        const params = new URLSearchParams();
        params.append('userId', id);
        params.append('t', Date.now().toString());
        const res = await fetch(`${API_BASE}/notifications/devices?${params.toString()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (res.ok) {
          const json = await res.json();
          const data = json?.data || json;
          if (Array.isArray(data)) {
            setDeviceTokens(data);
            return;
          }
        } else {
          console.error("Failed to fetch device tokens:", res.status, res.statusText);
        }

        // If no tokens found via API, try to get from user object
        if (user && user.deviceTokens && Array.isArray(user.deviceTokens)) {
          setDeviceTokens(user.deviceTokens);
        } else {
          setDeviceTokens([]);
        }
      } catch (e) {
        console.error("Error loading device tokens:", e);
        setDeviceTokens([]);
      } finally {
        setTokensLoading(false);
      }
    };

    if (id) {
      loadUser();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      const loadDeviceTokens = async () => {
        setTokensLoading(true);
        try {
          const params = new URLSearchParams();
          params.append('userId', id);
          params.append('t', Date.now().toString());
          const res = await fetch(`${API_BASE}/notifications/devices?${params.toString()}`, {
            cache: "no-store",
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (res.ok) {
            const json = await res.json();
            const data = json?.data || json;
            if (Array.isArray(data)) {
              setDeviceTokens(data);
              return;
            }
          }

          // Fallback: check user object
          if (user.deviceTokens && Array.isArray(user.deviceTokens)) {
            setDeviceTokens(user.deviceTokens);
          } else {
            setDeviceTokens([]);
          }
        } catch (e) {
          console.error("Error loading device tokens:", e);
          setDeviceTokens([]);
        } finally {
          setTokensLoading(false);
        }
      };
      loadDeviceTokens();
    }
  }, [user, id]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <div className="text-gray-500 dark:text-gray-400">Loading user data...</div>
        </div>
      </div>
    );
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone || 'User';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-4">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.avatar} 
                alt={userName} 
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" 
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{userName}</h1>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user.id || user._id}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            user.isActive 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {user.isActive ? '✓ Active' : '✗ Inactive'}
          </span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {user.role}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Contact Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">კონტაქტი</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📱</span>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">ტელეფონი</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.phone}</div>
              </div>
            </div>
            {user.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">✉️</span>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                  <a 
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline" 
                    href={`mailto:${user.email}`}
                  >
                    {user.email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role & Status Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">როლი და სტატუსი</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">როლი</div>
              <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {user.role}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">სტატუსი</div>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                user.isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {user.isActive ? '✓ Active' : '✗ Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamps Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">დრო</h3>
          <div className="space-y-3">
            {user.createdAt && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">შექმნილია</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleString('ka-GE')}
                </div>
              </div>
            )}
            {user.updatedAt && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">განახლებულია</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(user.updatedAt).toLocaleString('ka-GE')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {(user.address || user.city || user.country || user.dateOfBirth || user.gender) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">დამატებითი ინფორმაცია</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.address && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">მისამართი</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.address}</div>
              </div>
            )}
            {user.city && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ქალაქი</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.city}</div>
              </div>
            )}
            {user.country && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ქვეყანა</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.country}</div>
              </div>
            )}
            {user.zipCode && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ZIP კოდი</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.zipCode}</div>
              </div>
            )}
            {user.dateOfBirth && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">დაბადების თარიღი</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(user.dateOfBirth).toLocaleDateString('ka-GE')}
                </div>
              </div>
            )}
            {user.gender && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">სქესი</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.gender}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All User Data */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ყველა მონაცემი (JSON)</h2>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(user, null, 2));
              alert('JSON copied to clipboard!');
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Copy JSON
          </button>
        </div>
        <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-xs overflow-auto max-h-96 border border-gray-200 dark:border-gray-700">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      {/* Device Tokens */}
      <div id="tokens" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Tokens</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {deviceTokens.length} {deviceTokens.length === 1 ? 'device' : 'devices'} registered
            </div>
          </div>
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              setTokensLoading(true);
              try {
                const params = new URLSearchParams();
                params.append('userId', id);
                params.append('t', Date.now().toString());
                const res = await fetch(`${API_BASE}/notifications/devices?${params.toString()}`, {
                  cache: "no-store",
                  headers: { 'Cache-Control': 'no-cache' }
                });
                
                if (res.ok) {
                  const json = await res.json();
                  const data = json?.data || json;
                  if (Array.isArray(data)) {
                    setDeviceTokens(data);
                    return;
                  }
                } else {
                  console.error("Failed to refresh device tokens:", res.status, res.statusText);
                }
                
                setDeviceTokens([]);
              } catch (e) {
                console.error("Error refreshing tokens:", e);
                setDeviceTokens([]);
              } finally {
                setTokensLoading(false);
              }
            }}
            disabled={tokensLoading}
          >
            {tokensLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {tokensLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <div className="text-gray-500 dark:text-gray-400">Loading tokens...</div>
          </div>
        ) : deviceTokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📱</div>
            <div className="text-gray-500 dark:text-gray-400 font-medium mb-2">No device tokens found</div>
            <div className="text-sm text-gray-400 dark:text-gray-500">
              This user hasn't registered any devices yet.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Device Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {deviceTokens.map((token, idx) => (
                  <tr key={token._id || token.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {(token._id || token.id || '').toString().substring(0, 8)}...
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        token.platform === 'ios' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : token.platform === 'android'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {token.platform || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        {token.provider || 'expo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {token.deviceInfo ? (
                        <div className="text-xs space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">📱</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {token.deviceInfo.deviceName || token.deviceInfo.modelName || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">🏢</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {token.deviceInfo.brand || token.deviceInfo.manufacturer || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">💻</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {token.deviceInfo.osName || '-'} {token.deviceInfo.osVersion || ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">📦</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              App {token.deviceInfo.appVersion || '-'} {token.deviceInfo.appBuildNumber ? `(${token.deviceInfo.appBuildNumber})` : ''}
                            </span>
                          </div>
                          {token.deviceInfo.totalMemory && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">💾</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {Math.round(token.deviceInfo.totalMemory / 1024 / 1024 / 1024)}GB RAM
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">No device info</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded break-all max-w-xs font-mono text-gray-700 dark:text-gray-300">
                        {token.token || token.fcmToken || token.deviceToken || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {token.createdAt ? new Date(token.createdAt).toLocaleString('ka-GE') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {token.updatedAt ? new Date(token.updatedAt).toLocaleString('ka-GE') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deviceTokens.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Export Tokens</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  const tokensText = deviceTokens.map(t => t.token || t.fcmToken || t.deviceToken).filter(Boolean).join('\n');
                  navigator.clipboard.writeText(tokensText);
                  alert('✓ Tokens copied to clipboard!');
                }}
              >
                📋 Copy All Tokens
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  const dataStr = JSON.stringify(deviceTokens, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `user-${id}-tokens.json`;
                  link.click();
                }}
              >
                💾 Download JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
