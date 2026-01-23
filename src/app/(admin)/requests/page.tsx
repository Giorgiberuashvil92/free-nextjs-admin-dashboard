"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiGetJson } from "@/lib/api";

type Vehicle = {
  make?: string;
  model?: string;
  year?: number;
};

type Request = {
  id: string;
  userId: string;
  vehicle?: Vehicle;
  partName?: string;
  brand?: string;
  budgetGEL?: number;
  distanceKm?: number;
  status?: string;
  description?: string;
  urgency?: string;
  service?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
};

type UserRow = {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  requests?: Request[];
};

type RequestWithUser = Request & {
  user: UserRow;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "1000"); // Load many users to get all requests
      params.set("offset", "0");
      
      const res = await apiGetJson<{ 
        success: boolean; 
        data: UserRow[]; 
        total: number; 
        limit: number; 
        offset: number 
      }>(`/users?${params.toString()}`);
      
      // Flatten all requests from all users
      const allRequests: RequestWithUser[] = [];
      (res.data ?? []).forEach((user) => {
        if (user.requests && Array.isArray(user.requests)) {
          user.requests.forEach((request) => {
            allRequests.push({
              ...request,
              user: user,
            });
          });
        }
      });
      
      // Sort by createdAt (newest first)
      allRequests.sort((a, b) => {
        const aTime = typeof a.createdAt === 'string' 
          ? new Date(a.createdAt).getTime() 
          : (a.createdAt || 0);
        const bTime = typeof b.createdAt === 'string' 
          ? new Date(b.createdAt).getTime() 
          : (b.createdAt || 0);
        return bTime - aTime;
      });
      
      setRequests(allRequests);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e 
        ? String((e as { message?: unknown }).message) 
        : "Request failed";
      setErr(message || "Failed to load");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (date?: string | number) => {
    if (!date) return "-";
    try {
      const d = typeof date === 'string' ? new Date(date) : new Date(date);
      return d.toLocaleString('ka-GE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return "-";
    }
  };

  const formatVehicle = (vehicle?: Vehicle) => {
    if (!vehicle) return "-";
    const parts = [];
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    if (vehicle.year) parts.push(String(vehicle.year));
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "active") {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    } else if (statusLower === "fulfilled") {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    } else if (statusLower === "cancelled") {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
  };

  const getUrgencyBadge = (urgency?: string) => {
    const urgencyLower = (urgency || "").toLowerCase();
    if (urgencyLower === "high") {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    } else if (urgencyLower === "medium") {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    } else if (urgencyLower === "low") {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
  };

  const getServiceBadge = (service?: string) => {
    const serviceLower = (service || "").toLowerCase();
    const colors: Record<string, string> = {
      parts: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      mechanic: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      tow: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      rental: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return colors[serviceLower] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter && req.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (serviceFilter && req.service?.toLowerCase() !== serviceFilter.toLowerCase()) {
      return false;
    }
    if (urgencyFilter && req.urgency?.toLowerCase() !== urgencyFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUser = 
        req.user.phone?.toLowerCase().includes(query) ||
        req.user.email?.toLowerCase().includes(query) ||
        req.user.firstName?.toLowerCase().includes(query) ||
        req.user.lastName?.toLowerCase().includes(query);
      const matchesRequest = 
        req.partName?.toLowerCase().includes(query) ||
        req.brand?.toLowerCase().includes(query) ||
        req.description?.toLowerCase().includes(query) ||
        formatVehicle(req.vehicle).toLowerCase().includes(query);
      if (!matchesUser && !matchesRequest) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          მოთხოვნები
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {loading ? "იტვირთება..." : "განახლება"}
        </button>
      </div>

      {err && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {err}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ძიება</div>
          <input
            className="border rounded px-3 py-2 w-64 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="ტელეფონი, ელფოსტა, ნაწილი, ბრენდი..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">სტატუსი</div>
          <select
            className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ყველა</option>
            <option value="active">Active</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">სერვისი</div>
          <select
            className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">ყველა</option>
            <option value="parts">ნაწილები</option>
            <option value="mechanic">მექანიკოსი</option>
            <option value="tow">ევაკუატორი</option>
            <option value="rental">გაქირავება</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">სიურგენტობა</div>
          <select
            className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="">ყველა</option>
            <option value="high">მაღალი</option>
            <option value="medium">საშუალო</option>
            <option value="low">დაბალი</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">სულ მოთხოვნები</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {requests.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status?.toLowerCase() === "active").length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Fulfilled</div>
          <div className="text-2xl font-bold text-blue-600">
            {requests.filter((r) => r.status?.toLowerCase() === "fulfilled").length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">გაფილტრული</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredRequests.length}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          მოთხოვნები არ მოიძებნა
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მომხმარებელი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მანქანა
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ნაწილი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ბრენდი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ბიუჯეტი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მანძილი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  სტატუსი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  სიურგენტობა
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  სერვისი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  აღწერა
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  შექმნის თარიღი
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  განახლების თარიღი
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr
                  key={req.id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {req.user.profileImage && req.user.profileImage.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={req.user.profileImage}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.phone)}&background=6366f1&color=fff&size=128&bold=true`;
                          }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.phone)}&background=6366f1&color=fff&size=128&bold=true`}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {[req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || '-'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {req.user.phone}
                        </div>
                        {req.user.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {req.user.email}
                          </div>
                        )}
                        <a
                          href={`/users/${req.user.id}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          იხილეთ პროფილი
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {formatVehicle(req.vehicle)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {req.partName || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {req.brand || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {req.budgetGEL ? `${req.budgetGEL} ₾` : "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {req.distanceKm ? `${req.distanceKm} კმ` : "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(req.status)}`}
                    >
                      {req.status || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyBadge(req.urgency)}`}
                    >
                      {req.urgency || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getServiceBadge(req.service)}`}
                    >
                      {req.service || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-gray-900 dark:text-white max-w-xs truncate" title={req.description}>
                      {req.description || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(req.createdAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(req.updatedAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
