"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiPost } from "@/lib/api";
import { getUserEvents, type UserEventsResponse } from "@/services/analyticsApi";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

type Vehicle = {
  make?: string;
  model?: string;
  year?: number;
};

type RequestResponse = {
  id?: string;
  responderId?: string;
  responderName?: string;
  responderPhone?: string;
  responderEmail?: string;
  message?: string;
  price?: number;
  timestamp?: string | number;
};

type Offer = {
  id: string;
  reqId: string;
  providerName?: string;
  priceGEL?: number;
  etaMin?: number;
  distanceKm?: number;
  status?: string;
  userId?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  [key: string]: any; // For any additional fields
};

type Request = {
  id: string;
  _id?: string;
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
  responses?: RequestResponse[];
  messages?: RequestResponse[];
  offers?: Offer[];
  // Backend-ში პირდაპირ არის ეს ველები
  userName?: string;
  userPhone?: string;
  offersCount?: number;
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
  const [loadingResponses, setLoadingResponses] = useState<Record<string, boolean>>({});
  const [userEvents, setUserEvents] = useState<Record<string, UserEventsResponse>>({});
  const [loadingUserEvents, setLoadingUserEvents] = useState<Record<string, boolean>>({});
  const [expandedUserEvents, setExpandedUserEvents] = useState<Record<string, boolean>>({});
  const [offerUsers, setOfferUsers] = useState<Record<string, { firstName?: string; lastName?: string; phone?: string }>>({});
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);
  const offersModal = useModal();

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // Try direct requests endpoint first
      try {
        const requestsRes = await apiGetJson<Request[] | { success: boolean; data: Request[] }>(`/requests`);
        
        // Handle both array and wrapped response formats
        const requestsArray = Array.isArray(requestsRes) 
          ? requestsRes 
          : (requestsRes.success ? requestsRes.data : []);
        
        if (requestsArray && requestsArray.length > 0) {
          // Convert to RequestWithUser format
          const requestsWithUser: RequestWithUser[] = requestsArray.map((req) => {
            const requestId = req.id || req._id || '';
            return {
              ...req,
              id: requestId,
              // Create user object from userName and userPhone if available
              user: {
                id: req.userId,
                phone: req.userPhone || '',
                firstName: req.userName?.split(' ')[0] || '',
                lastName: req.userName?.split(' ').slice(1).join(' ') || '',
                email: undefined,
                profileImage: undefined,
              },
            };
          });
          
          // Sort by createdAt (newest first)
          requestsWithUser.sort((a, b) => {
            const aTime = typeof a.createdAt === 'string' 
              ? new Date(a.createdAt).getTime() 
              : (a.createdAt || 0);
            const bTime = typeof b.createdAt === 'string' 
              ? new Date(b.createdAt).getTime() 
              : (b.createdAt || 0);
            return bTime - aTime;
          });
          
          setRequests(requestsWithUser);
          return;
        }
      } catch (e) {
        console.log('Direct /requests endpoint not available, trying /users', e);
      }

      // Fallback to users endpoint
      const params = new URLSearchParams();
      params.set("limit", "1000");
      params.set("offset", "0");
      
      const res = await apiGetJson<{ 
        success: boolean; 
        data: UserRow[]; 
        total: number; 
        limit: number; 
        offset: number 
      } | UserRow[]>(`/users?${params.toString()}`);
      
      // Handle both response formats
      const users = Array.isArray(res) ? res : (res.success ? res.data : []);
      
      console.log('Loaded users:', users.length);
      
      // Flatten all requests from all users
      const allRequests: RequestWithUser[] = [];
      (users ?? []).forEach((user) => {
        if (user.requests && Array.isArray(user.requests)) {
          console.log(`User ${user.id} has ${user.requests.length} requests`);
          user.requests.forEach((request) => {
            const requestId = request.id || (request as any)._id || '';
            allRequests.push({
              ...request,
              id: requestId,
              user: user,
            });
          });
        }
      });
      
      console.log('Total requests found:', allRequests.length);
      
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
      
      if (allRequests.length === 0) {
        setErr("მოთხოვნები არ მოიძებნა. შეამოწმეთ, რომ users-ებს აქვთ requests ველი.");
      }
    } catch (e: unknown) {
      console.error('Error loading requests:', e);
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

  // Refresh responses, messages, and offers for a specific request
  const refreshRequestData = useCallback(async (requestId: string) => {
    setLoadingResponses(prev => ({ ...prev, [requestId]: true }));
    try {
      // Try to get responses
      try {
        const responsesRes = await apiGetJson<{ success: boolean; data: RequestResponse[] } | RequestResponse[]>(
          `/requests/${requestId}/responses`
        );
        const responsesData = Array.isArray(responsesRes) 
          ? responsesRes 
          : (responsesRes.success ? (responsesRes as { success: boolean; data: RequestResponse[] }).data : []);
        
        if (responsesData && responsesData.length > 0) {
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { ...req, responses: responsesData }
              : req
          ));
        }
      } catch (e) {
        console.error('Failed to load responses:', e);
      }

      // Try to get offers from dedicated endpoint
      try {
        const offersRes = await apiGetJson<Offer[] | { success: boolean; data: Offer[] }>(
          `/requests/${requestId}/offers`
        );
        const offersData = Array.isArray(offersRes) 
          ? offersRes 
          : (offersRes.success ? (offersRes as { success: boolean; data: Offer[] }).data : []);
        if (offersData && offersData.length > 0) {
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { ...req, offers: offersData }
              : req
          ));

          // Load user info for each offer
          offersData.forEach(async (offer) => {
            if (offer.userId) {
              // Check if user info already loaded using functional update
              setOfferUsers(prev => {
                if (prev[offer.userId!]) return prev; // Already loaded
                
                // Load user info asynchronously
                (async () => {
                  try {
                    const userRes = await apiGetJson<{ firstName?: string; lastName?: string; phone?: string } | { success: boolean; data: { firstName?: string; lastName?: string; phone?: string } }>(
                      `/users/${offer.userId}`
                    );
                    const userData = Array.isArray(userRes) 
                      ? userRes[0]
                      : ((userRes as any).success ? (userRes as { success: boolean; data: { firstName?: string; lastName?: string; phone?: string } }).data : userRes);
                    if (userData && (userData.firstName || userData.lastName || userData.phone)) {
                      setOfferUsers(prevState => ({
                        ...prevState,
                        [offer.userId!]: {
                          firstName: userData.firstName,
                          lastName: userData.lastName,
                          phone: userData.phone,
                        }
                      }));
                    }
                  } catch (e) {
                    console.error(`Failed to load user info for ${offer.userId}:`, e);
                  }
                })();
                
                return prev;
              });
            }
          });
        } else {
          // Clear offers if no offers found
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { ...req, offers: [] }
              : req
          ));
        }
      } catch (e) {
        console.error('Failed to load offers:', e);
        // Clear offers on error
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, offers: [] }
            : req
        ));
      }

      // Try to get messages
      try {
        const messagesRes = await apiGetJson<{ success: boolean; data: RequestResponse[] } | RequestResponse[]>(
          `/requests/${requestId}/messages`
        );
        const messagesData = Array.isArray(messagesRes) 
          ? messagesRes 
          : (messagesRes.success ? (messagesRes as { success: boolean; data: RequestResponse[] }).data : []);
        if (messagesData && messagesData.length > 0) {
          setRequests(prev => prev.map(req => 
            req.id === requestId 
              ? { ...req, messages: messagesData }
              : req
          ));
        }
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    } finally {
      setLoadingResponses(prev => ({ ...prev, [requestId]: false }));
    }
  }, []);

  // Auto-load offers for all requests after requests are loaded
  useEffect(() => {
    if (requests.length > 0) {
      // Load offers for all requests automatically (only if not already loaded and has offersCount > 0)
      const requestsToLoad = requests.filter(req => 
        req.id && 
        !req.offers && 
        req.offersCount && 
        req.offersCount > 0 &&
        !loadingResponses[req.id]
      );
      
      requestsToLoad.forEach((req, index) => {
        // Stagger requests to avoid overwhelming the API
        setTimeout(() => {
          refreshRequestData(req.id);
        }, index * 200); // 200ms delay between each request
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests.length]); // Only trigger when requests array length changes

  // Load user events for a specific user
  const loadUserEvents = useCallback(async (userId: string) => {
    if (userEvents[userId]) return; // Already loaded
    
    setLoadingUserEvents(prev => ({ ...prev, [userId]: true }));
    try {
      const eventsData = await getUserEvents(userId, 'month', 100);
      setUserEvents(prev => ({ ...prev, [userId]: eventsData }));
    } catch (e) {
      console.error('Failed to load user events:', e);
    } finally {
      setLoadingUserEvents(prev => ({ ...prev, [userId]: false }));
    }
  }, [userEvents]);

  const toggleUserEvents = useCallback((userId: string) => {
    setExpandedUserEvents(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
    
    // Load events if not already loaded
    if (!userEvents[userId] && !loadingUserEvents[userId]) {
      loadUserEvents(userId);
    }
  }, [userEvents, loadingUserEvents, loadUserEvents]);

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div className="text-sm text-gray-600 dark:text-gray-400">სულ შეთავაზებები</div>
          <div className="text-2xl font-bold text-purple-600">
            {requests.reduce((sum, r) => sum + (r.offersCount || 0), 0)}
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
                  შეთავაზებები
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  პასუხები/შეტყობინებები
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მომხმარებლის Events
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
                    <div className="flex items-center gap-2">
                      {(req.offers && req.offers.length > 0) || (req.offersCount && req.offersCount > 0) ? (
                        <button
                          onClick={() => {
                            setSelectedOffers(req.offers || []);
                            offersModal.openModal();
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:underline text-xs font-medium"
                        >
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            (req.offers?.length || req.offersCount || 0) > 0 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {req.offers?.length || req.offersCount || 0}
                          </span>
                        </button>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`}>
                          {req.offersCount || 0}
                        </span>
                      )}
                      <button
                        onClick={() => refreshRequestData(req.id)}
                        disabled={loadingResponses[req.id]}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
                        title="შეთავაზებების განახლება"
                      >
                        {loadingResponses[req.id] ? '⏳' : '🔄'}
                      </button>
                    </div>
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
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {(req.responses && req.responses.length > 0) || (req.messages && req.messages.length > 0) ? (
                        <details className="cursor-pointer flex-1">
                          <summary className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                            ნახვა ({(req.responses?.length || 0) + (req.messages?.length || 0)})
                          </summary>
                        <div className="mt-2 space-y-2 max-w-md">
                          {/* Responses */}
                          {req.responses && req.responses.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                პასუხები:
                              </div>
                              {req.responses.map((response, idx) => (
                                <div
                                  key={response.id || idx}
                                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 mb-2"
                                >
                                  <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                    {response.responderName || response.responderPhone || 'უცნობი მომხმარებელი'}
                                  </div>
                                  {response.responderPhone && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      📞 {response.responderPhone}
                                    </div>
                                  )}
                                  {response.responderEmail && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      ✉️ {response.responderEmail}
                                    </div>
                                  )}
                                  {response.message && (
                                    <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                      💬 {response.message}
                                    </div>
                                  )}
                                  {response.price && (
                                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                                      💰 ფასი: {response.price} ₾
                                    </div>
                                  )}
                                  {response.timestamp && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      🕐 {formatDate(response.timestamp)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Messages */}
                          {req.messages && req.messages.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                შეტყობინებები:
                              </div>
                              {req.messages.map((message, idx) => (
                                <div
                                  key={message.id || idx}
                                  className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 mb-2"
                                >
                                  <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                    {message.responderName || message.responderPhone || 'უცნობი მომხმარებელი'}
                                  </div>
                                  {message.responderPhone && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      📞 {message.responderPhone}
                                    </div>
                                  )}
                                  {message.responderEmail && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      ✉️ {message.responderEmail}
                                    </div>
                                  )}
                                  {message.message && (
                                    <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                      💬 {message.message}
                                    </div>
                                  )}
                                  {message.timestamp && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      🕐 {formatDate(message.timestamp)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      <button
                        onClick={() => refreshRequestData(req.id)}
                        disabled={loadingResponses[req.id]}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                        title="განახლება"
                      >
                        {loadingResponses[req.id] ? '⏳' : '🔄'}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleUserEvents(req.user.id)}
                        disabled={loadingUserEvents[req.user.id]}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                        title="მომხმარებლის Events"
                      >
                        {loadingUserEvents[req.user.id] ? '⏳' : expandedUserEvents[req.user.id] ? '📊 ▲' : '📊 ▼'}
                      </button>
                      {userEvents[req.user.id] && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({userEvents[req.user.id].events?.length || 0})
                        </span>
                      )}
                    </div>
                    {expandedUserEvents[req.user.id] && userEvents[req.user.id] && (
                      <div className="mt-2 max-w-md max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-900">
                        {userEvents[req.user.id].events && userEvents[req.user.id].events.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Events ({userEvents[req.user.id].events.length}):
                            </div>
                            {userEvents[req.user.id].events.slice(0, 10).map((event, idx) => (
                              <div
                                key={event.id || idx}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs"
                              >
                                <div className="font-medium text-gray-900 dark:text-white mb-1">
                                  {event.eventName}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400">
                                  <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs mr-1">
                                    {event.eventType}
                                  </span>
                                  {event.screen}
                                </div>
                                <div className="text-gray-500 dark:text-gray-500 mt-1">
                                  {formatDate(event.timestamp)}
                                </div>
                              </div>
                            ))}
                            {userEvents[req.user.id].events.length > 10 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                                და {userEvents[req.user.id].events.length - 10} მეტი...
                                <a
                                  href={`/user-events?userId=${req.user.id}`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                                >
                                  ყველას ნახვა
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Events არ მოიძებნა
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Offers Modal */}
      <Modal
        isOpen={offersModal.isOpen}
        onClose={offersModal.closeModal}
        className="max-w-3xl p-6 lg:p-8"
      >
        <h4 className="font-semibold text-gray-800 mb-6 text-xl dark:text-white/90">
          შეთავაზებები ({selectedOffers.length})
        </h4>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {selectedOffers.length > 0 ? (
            selectedOffers.map((offer, idx) => (
              <div
                key={offer.id || idx}
                className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-medium text-gray-900 dark:text-white text-base">
                    {offer.providerName || 'უცნობი მომწოდებელი'}
                  </div>
                  {offer.status && (
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      offer.status === 'accepted' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : offer.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {offer.status}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {offer.userId && (
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">მომხმარებელი:</span>{' '}
                      {offerUsers[offer.userId]?.firstName || offerUsers[offer.userId]?.lastName 
                        ? `${offerUsers[offer.userId].firstName || ''} ${offerUsers[offer.userId].lastName || ''}`.trim() || offer.userId
                        : offer.userId}
                      {offerUsers[offer.userId]?.phone && (
                        <span className="ml-2">({offerUsers[offer.userId].phone})</span>
                      )}
                    </div>
                  )}
                  
                  {offer.priceGEL !== undefined && offer.priceGEL !== null && (
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      <span className="font-medium text-gray-600 dark:text-gray-400">ფასი:</span> {offer.priceGEL} ₾
                    </div>
                  )}
                  
                  {offer.etaMin !== undefined && offer.etaMin !== null && (
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">ETA:</span> {offer.etaMin} წუთი
                    </div>
                  )}
                  
                  {offer.distanceKm !== undefined && offer.distanceKm !== null && (
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">მანძილი:</span> {offer.distanceKm} კმ
                    </div>
                  )}
                  
                  {offer.createdAt && (
                    <div className="text-gray-500 dark:text-gray-500">
                      <span className="font-medium">თარიღი:</span> {formatDate(offer.createdAt)}
                    </div>
                  )}
                  
                  {offer.id && (
                    <div className="text-gray-500 dark:text-gray-500 text-xs">
                      <span className="font-medium">ID:</span> {offer.id}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              შეთავაზებები არ მოიძებნა
            </div>
          )}
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={offersModal.closeModal}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            დახურვა
          </button>
        </div>
      </Modal>
    </div>
  );
}
