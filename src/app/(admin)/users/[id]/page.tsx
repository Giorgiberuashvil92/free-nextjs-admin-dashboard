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
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone || 'User';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-2 py-1 border rounded">
            Back
          </button>
          <div className="flex items-center gap-3">
            {user.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={userName} className="w-12 h-12 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-semibold">{userName}</h1>
              <div className="text-sm text-gray-500">{user.id || user._id}</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">კონტაქტი</div>
          <div><span className="font-medium">ტელეფონი:</span> {user.phone}</div>
          {user.email && (
            <div>
              <span className="font-medium">Email:</span>{" "}
              <a className="text-blue-600" href={`mailto:${user.email}`}>
                {user.email}
              </a>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">როლი და სტატუსი</div>
          <div>
            <span className="font-medium">როლი:</span>{" "}
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
              {user.role}
            </span>
          </div>
          <div>
            <span className="font-medium">სტატუსი:</span>{" "}
            <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">დრო</div>
          {user.createdAt && (
            <div>
              <span className="font-medium">შექმნილია:</span>{" "}
              {new Date(user.createdAt).toLocaleString()}
            </div>
          )}
          {user.updatedAt && (
            <div>
              <span className="font-medium">განახლებულია:</span>{" "}
              {new Date(user.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      {(user.address || user.city || user.country || user.dateOfBirth || user.gender) && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">დამატებითი ინფორმაცია</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {user.address && (
              <div>
                <span className="text-gray-500">მისამართი:</span> {user.address}
              </div>
            )}
            {user.city && (
              <div>
                <span className="text-gray-500">ქალაქი:</span> {user.city}
              </div>
            )}
            {user.country && (
              <div>
                <span className="text-gray-500">ქვეყანა:</span> {user.country}
              </div>
            )}
            {user.zipCode && (
              <div>
                <span className="text-gray-500">ZIP:</span> {user.zipCode}
              </div>
            )}
            {user.dateOfBirth && (
              <div>
                <span className="text-gray-500">დაბადების თარიღი:</span>{" "}
                {new Date(user.dateOfBirth).toLocaleDateString()}
              </div>
            )}
            {user.gender && (
              <div>
                <span className="text-gray-500">სქესი:</span> {user.gender}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All User Data */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">ყველა მონაცემი (JSON)</h2>
        <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      {/* Device Tokens */}
      <div id="tokens" className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Device Tokens ({deviceTokens.length})</h2>
          <button
            className="px-3 py-1.5 text-sm border rounded"
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
          <div className="text-center text-gray-500 py-4">Loading tokens...</div>
        ) : deviceTokens.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Device tokens არ მოიძებნა. შეამოწმეთ API endpoint-ები.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Platform</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Token</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {deviceTokens.map((token, idx) => (
                  <tr key={token._id || token.id || idx} className="border-t">
                    <td className="px-3 py-2">
                      <code className="text-xs text-gray-600">
                        {(token._id || token.id || '').toString().substring(0, 8)}...
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        token.platform === 'ios' ? 'bg-blue-100 text-blue-700' :
                        token.platform === 'android' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {token.platform || 'unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                        {token.provider || 'expo'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs bg-gray-50 px-2 py-1 rounded break-all max-w-md">
                        {token.token || token.fcmToken || token.deviceToken || '-'}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      {token.createdAt ? new Date(token.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {token.updatedAt ? new Date(token.updatedAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deviceTokens.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium mb-2">Export Tokens:</div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-sm border rounded bg-white"
                onClick={() => {
                  const tokensText = deviceTokens.map(t => t.token || t.fcmToken || t.deviceToken).filter(Boolean).join('\n');
                  navigator.clipboard.writeText(tokensText);
                  alert('Tokens copied to clipboard!');
                }}
              >
                Copy All Tokens
              </button>
              <button
                className="px-3 py-1.5 text-sm border rounded bg-white"
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
                Download JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
