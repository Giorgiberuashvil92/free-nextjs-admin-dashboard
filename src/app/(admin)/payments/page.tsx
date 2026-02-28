"use client";

import React, { useEffect, useState, useMemo } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

interface Payment {
  _id: string;
  userId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  context: string;
  description: string;
  paymentDate: string;
  paymentToken?: string;
  isRecurring?: boolean;
  recurringPaymentId?: string;
  transactionId?: string;
  payerIdentifier?: string;
  cardType?: string;
  cardExpiryDate?: string;
  authCode?: string;
  code?: string;
  codeDescription?: string;
  parentOrderId?: string;
  externalOrderId?: string;
  metadata?: {
    planId?: string;
    planName?: string;
    planPrice?: string;
    planCurrency?: string;
    planPeriod?: string;
    bogCallbackData?: {
      reject_reason?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  firstName?: string;
  lastName?: string;
  phone?: string;
  name: string;
}

// Recurring Payment Row Component
function RecurringPaymentRow({ 
  payment, 
  userName, 
  userInfo,
  fetchHistory,
  loading,
  formatDateTime,
  getStatusBadge
}: { 
  payment: Payment; 
  userName: string;
  userInfo?: UserInfo;
  fetchHistory: (recurringPaymentId: string, userId: string) => Promise<Payment[]>;
  loading: boolean;
  formatDateTime: (dateString?: string) => string;
  getStatusBadge: (status: string) => string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    if (!payment.recurringPaymentId) return;

    setLoadingHistory(true);
    try {
      // Fetch history only for this specific user
      const historyData = await fetchHistory(payment.recurringPaymentId, payment.userId);
      setHistory(historyData);
      setShowHistory(true);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Get latest payment status
  const latestPayment = history.length > 0 ? history[0] : payment;
  const isSuccessful = latestPayment.status === 'completed' || latestPayment.status === 'success';
  const isFailed = latestPayment.status === 'failed';
  const isRejected = latestPayment.status === 'rejected';

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex flex-col">
            {userInfo ? (
              <>
                <a 
                  href={`/users?q=${encodeURIComponent(payment.userId)}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  title={`View user: ${payment.userId}`}
                >
                  {userName}
                </a>
                <span className="text-xs text-gray-500 font-mono mt-1">
                  {payment.userId.substring(0, 20)}...
                </span>
              </>
            ) : (
              <a 
                href={`/users?q=${encodeURIComponent(payment.userId)}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                title={`View user: ${payment.userId}`}
              >
                {payment.userId.substring(0, 20)}...
              </a>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
          {payment.recurringPaymentId || '-'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {payment.amount.toFixed(2)} {payment.currency}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
          {payment.paymentDate ? formatDateTime(payment.paymentDate) : formatDateTime(payment.createdAt)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(latestPayment.status)}`}>
              {latestPayment.status}
            </span>
            {isRejected && (
              <span className="text-xs text-orange-600 font-medium">
                ⚠️ ფული არ ჩამოეჭრა - საკმარისი თანხა არ იყო
              </span>
            )}
            {history.length > 0 && (
              <span className="text-xs text-gray-500">
                {history.length} გადახდა ისტორიაში
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm">
          <button
            onClick={handleShowHistory}
            disabled={loadingHistory || !payment.recurringPaymentId}
            className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingHistory ? 'იტვირთება...' : showHistory ? 'ისტორიის დამალვა' : 'ისტორიის ნახვა'}
          </button>
        </td>
      </tr>
      {showHistory && history.length > 0 && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2">🔄 Recurring Payment ისტორია:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">თარიღი</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">თანხა</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">სტატუსი</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Order ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((h) => (
                      <tr key={h._id} className={
                        h.status === 'failed' ? 'bg-red-50' : 
                        h.status === 'rejected' ? 'bg-orange-50' : 
                        h.status === 'completed' || h.status === 'success' ? 'bg-green-50' : ''
                      }>
                        <td className="px-3 py-2 text-xs text-gray-900">
                          {formatDateTime(h.paymentDate || h.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">
                          {h.amount.toFixed(2)} {h.currency}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusBadge(h.status)}`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-700">
                          {h.orderId.substring(0, 20)}...
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-700">
                          {h.transactionId || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSubscription, setCreatingSubscription] = useState<string | null>(null);
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, boolean>>({});
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUserAnalytics, setSelectedUserAnalytics] = useState<{
    userId: string;
    paymentCount: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    payments: Payment[];
  } | null>(null);
  const [showUserAnalyticsModal, setShowUserAnalyticsModal] = useState(false);
  const [recurringPayments, setRecurringPayments] = useState<Payment[]>([]);
  const [recurringPaymentsLoading, setRecurringPaymentsLoading] = useState(false);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showUnknownUsers, setShowUnknownUsers] = useState<boolean>(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  // Load user names for payments
  useEffect(() => {
    if (payments.length === 0) return;

    const uniqueUserIds = Array.from(new Set(
      payments
        .map(p => p.userId)
        .filter(id => id && id !== 'UNKNOWN_USER' && !userMap[id])
    ));

    if (uniqueUserIds.length === 0) return;

    let cancelled = false;
    const loadUserNames = async () => {
      const batchSize = 20;
      const newUserMap: Record<string, UserInfo> = {};

      for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
        if (cancelled) break;

        const batch = uniqueUserIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (userId) => {
            try {
              const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}?t=${Date.now()}`, {
                cache: "no-store",
                headers: { 'Cache-Control': 'no-cache' },
              });
              
              if (res.ok) {
                const data = await res.json();
                const user = data?.data || data;
                const firstName = user.firstName || '';
                const lastName = user.lastName || '';
                const name = [firstName, lastName].filter(Boolean).join(' ') || user.phone || userId;
                
                newUserMap[userId] = {
                  firstName,
                  lastName,
                  phone: user.phone,
                  name,
                };
              }
            } catch (e) {
              console.error(`Error loading user ${userId}:`, e);
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < uniqueUserIds.length && !cancelled) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!cancelled) {
        setUserMap(prev => ({ ...prev, ...newUserMap }));
      }
    };

    loadUserNames();
    return () => {
      cancelled = true;
    };
  }, [payments, userMap]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payments
      const response = await fetch(`${API_BASE}/api/payments?limit=1000&skip=0&t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const data = await response.json();
      const paymentsData = Array.isArray(data.data) ? data.data : (data.data || []);
      
      // 🔍 Debug: Log payments data
      console.log('📊 Payments Data:', {
        total: paymentsData.length,
        sample: paymentsData.slice(0, 3),
        allPayments: paymentsData
      });
      
      setPayments(paymentsData);

      // Fetch subscriptions to check which users have subscriptions
      try {
        const subsResponse = await fetch(`${API_BASE}/subscriptions?t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        
        if (subsResponse.ok) {
          const subsData = await subsResponse.json();
          const subscriptions = Array.isArray(subsData) ? subsData : (subsData.data || []);
          
          // Create map of userId -> has subscription
          const subsMap: Record<string, boolean> = {};
          subscriptions.forEach((sub: any) => {
            if (sub.userId) {
              subsMap[sub.userId] = true;
            }
          });
          
          setSubscriptionsMap(subsMap);
        }
      } catch (e) {
        console.error("Error fetching subscriptions:", e);
      }

      // Calculate stats
      const statsData = {
        total: paymentsData.length,
        totalAmount: paymentsData.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0),
        completed: paymentsData.filter((p: Payment) => p.status === 'completed' || p.status === 'success').length,
        pending: paymentsData.filter((p: Payment) => p.status === 'pending').length,
        rejected: paymentsData.filter((p: Payment) => p.status === 'rejected').length,
      };
      setStats(statsData);

      // Fetch recurring payments separately
      const recurring = paymentsData.filter((p: Payment) => p.isRecurring || p.recurringPaymentId);
      setRecurringPayments(recurring);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recurring payment history for a specific recurringPaymentId and userId
  const fetchRecurringPaymentHistory = async (recurringPaymentId: string, userId: string) => {
    try {
      setRecurringPaymentsLoading(true);
      const response = await fetch(`${API_BASE}/api/payments?recurringPaymentId=${encodeURIComponent(recurringPaymentId)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      let history: Payment[] = [];
      
      if (response.ok) {
        const data = await response.json();
        history = Array.isArray(data.data) ? data.data : (data.data || []);
      } else {
        // Fallback: filter from existing payments
        history = payments.filter(p => p.recurringPaymentId === recurringPaymentId);
      }

      // Filter by userId - მხოლოდ კონკრეტული user-ის payments
      history = history.filter(p => p.userId === userId);
      
      // Sort by date (newest first)
      history.sort((a: Payment, b: Payment) => {
        const dateA = new Date(a.paymentDate || a.createdAt).getTime();
        const dateB = new Date(b.paymentDate || b.createdAt).getTime();
        return dateB - dateA;
      });

      return history;
    } catch (err) {
      console.error("Error fetching recurring payment history:", err);
      // Fallback: filter from existing payments by userId
      return payments.filter(p => p.recurringPaymentId === recurringPaymentId && p.userId === userId);
    } finally {
      setRecurringPaymentsLoading(false);
    }
  };

  // Filtered and searched payments
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => 
        p.userId.toLowerCase().includes(query) ||
        p.orderId.toLowerCase().includes(query) ||
        p.transactionId?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.metadata?.planName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (statusFilter === "success") {
          return p.status === 'completed' || p.status === 'success';
        }
        return p.status === statusFilter;
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((p) => {
        const paymentDate = p.paymentDate ? new Date(p.paymentDate) : (p.createdAt ? new Date(p.createdAt) : null);
        if (!paymentDate) return false;

        switch (dateFilter) {
          case "today":
            return paymentDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return paymentDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return paymentDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [payments, searchQuery, statusFilter, dateFilter]);

  // Paginated payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const handleCreateSubscription = async (payment: Payment) => {
    if (!confirm(`ნამდვილად გსურთ ამ payment-იდან subscription-ის შექმნა?\n\nUser ID: ${payment.userId}\nAmount: ${payment.amount} ${payment.currency}\nPlan: ${payment.metadata?.planName || payment.metadata?.planId || 'N/A'}`)) {
      return;
    }

    setCreatingSubscription(payment._id);
    try {
      const response = await fetch(`${API_BASE}/api/payments/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment._id }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Subscription წარმატებით შეიქმნა!\n\nPlan: ${result.data?.planName || 'N/A'}\nUser ID: ${result.data?.userId || payment.userId}`);
        // Update subscriptions map immediately
        const userId = result.data?.userId || payment.userId;
        if (userId) {
          setSubscriptionsMap(prev => ({ ...prev, [userId]: true }));
        }
        await fetchPayments(); // Refresh payments
      } else {
        alert(`❌ შეცდომა: ${result.message || result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      alert(`❌ შეცდომა: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreatingSubscription(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      success: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      rejected: "bg-orange-100 text-orange-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Calculate user analytics
  const userAnalytics = useMemo(() => {
    const userStats: Record<string, {
      userId: string;
      paymentCount: number;
      totalAmount: number;
      successfulPayments: number;
      failedPayments: number;
      payments: Payment[];
    }> = {};

    // 🔍 Debug: Check for problematic userIds
    const problematicPayments: Payment[] = [];
    const userIdVariations: Record<string, number> = {};

    payments.forEach((payment) => {
      // Normalize userId - handle null, undefined, empty, "unknown", etc.
      let normalizedUserId = payment.userId;
      
      if (!normalizedUserId || 
          normalizedUserId === 'null' || 
          normalizedUserId === 'undefined' || 
          normalizedUserId === 'unknown' ||
          normalizedUserId.trim() === '' ||
          normalizedUserId.toLowerCase() === 'unknown') {
        normalizedUserId = 'UNKNOWN_USER';
        problematicPayments.push(payment);
      }

      // Track userId variations
      const originalUserId = payment.userId || 'null/undefined';
      userIdVariations[originalUserId] = (userIdVariations[originalUserId] || 0) + 1;

      if (!userStats[normalizedUserId]) {
        userStats[normalizedUserId] = {
          userId: normalizedUserId,
          paymentCount: 0,
          totalAmount: 0,
          successfulPayments: 0,
          failedPayments: 0,
          payments: [],
        };
      }

      userStats[normalizedUserId].paymentCount++;
      userStats[normalizedUserId].totalAmount += payment.amount || 0;
      userStats[normalizedUserId].payments.push(payment);

      if (payment.status === 'completed' || payment.status === 'success') {
        userStats[normalizedUserId].successfulPayments++;
      } else if (payment.status === 'failed') {
        userStats[normalizedUserId].failedPayments++;
      } else if (payment.status === 'rejected') {
        userStats[normalizedUserId].failedPayments++;
      }
    });

    // 🔍 Debug: Log problematic payments and userId variations
    if (problematicPayments.length > 0) {
      console.warn('⚠️ Problematic Payments (no userId or unknown):', {
        count: problematicPayments.length,
        payments: problematicPayments,
        sample: problematicPayments.slice(0, 5)
      });
    }

    console.log('🔍 UserId Variations:', {
      totalVariations: Object.keys(userIdVariations).length,
      variations: userIdVariations,
      topVariations: Object.entries(userIdVariations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
    });

    // Convert to array and sort by payment count
    let sortedUsers = Object.values(userStats).sort((a, b) => b.paymentCount - a.paymentCount);

    // 🔍 Debug: Log user analytics
    console.log('👥 User Analytics:', {
      totalUsers: sortedUsers.length,
      topUsers: sortedUsers.slice(0, 10),
      unknownUsers: sortedUsers.filter(u => u.userId === 'UNKNOWN_USER'),
      allUsers: sortedUsers
    });

    return sortedUsers;
  }, [payments]);

  // Filter user analytics based on showUnknownUsers
  const filteredUserAnalytics = useMemo(() => {
    if (showUnknownUsers) {
      return userAnalytics;
    }
    return userAnalytics.filter(user => user.userId !== 'UNKNOWN_USER');
  }, [userAnalytics, showUnknownUsers]);

  const exportToCSV = () => {
    const headers = ['User ID', 'Order ID', 'Amount', 'Currency', 'Status', 'Context', 'Plan', 'Payment Date', 'Transaction ID'];
    const rows = filteredPayments.map(p => [
      p.userId,
      p.orderId,
      p.amount,
      p.currency,
      p.status,
      p.context,
      p.metadata?.planName || p.metadata?.planId || '-',
      p.paymentDate || p.createdAt,
      p.transactionId || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">გადახდები</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            CSV-ში ექსპორტი
          </button>
          <button
            onClick={fetchPayments}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            განახლება
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">სულ გადახდები</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">სულ თანხა</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalAmount.toFixed(2)}₾</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">წარმატებული</div>
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">მოლოდინში</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">უარყოფილი</div>
          <div className="text-3xl font-bold text-orange-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Recurring Payments Section */}
      {recurringPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-purple-50 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">🔄 Recurring Payments - რეკურენტული გადახდები</h2>
            <p className="text-sm text-gray-600 mt-1">
              სულ {recurringPayments.length} recurring payment
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recurring ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    თანხა
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ბოლო გადახდა
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    სტატუსი
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    მოქმედებები
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recurringPayments.map((payment) => {
                  const userInfo = userMap[payment.userId];
                  const userName = userInfo?.name || payment.userId;
                  
                  return (
                    <RecurringPaymentRow
                      key={payment._id}
                      payment={payment}
                      userName={userName}
                      userInfo={userInfo}
                      fetchHistory={fetchRecurringPaymentHistory}
                      loading={recurringPaymentsLoading}
                      formatDateTime={formatDateTime}
                      getStatusBadge={getStatusBadge}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Analytics Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">👥 User Analytics - ვინ რამდენჯერ გადაიხადა</h2>
              <p className="text-sm text-gray-600 mt-1">
                სულ {filteredUserAnalytics.length} unique user-ი
                {userAnalytics.filter(u => u.userId === 'UNKNOWN_USER').length > 0 && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    ({userAnalytics.filter(u => u.userId === 'UNKNOWN_USER')[0]?.paymentCount || 0} გადახდა unknown user-ისგან)
                  </span>
                )}
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnknownUsers}
                onChange={(e) => setShowUnknownUsers(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">გამოჩნდეს Unknown Users</span>
            </label>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  გადახდების რაოდენობა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  წარმატებული
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ჩავარდნილი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სულ თანხა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUserAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    მონაცემები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredUserAnalytics.map((user, index) => {
                  const isUnknown = user.userId === 'UNKNOWN_USER';
                  const userInfo = userMap[user.userId];
                  const userName = userInfo?.name || user.userId;
                  
                  return (
                    <tr key={user.userId} className={`hover:bg-gray-50 transition-colors ${isUnknown ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isUnknown ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                            ⚠️ UNKNOWN
                          </span>
                          <span className="text-gray-500 italic font-mono">
                            (userId არ არის მითითებული)
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {userInfo ? (
                            <>
                              <a 
                                href={`/users?q=${encodeURIComponent(user.userId)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                title={`View user: ${user.userId}`}
                              >
                                {userName}
                              </a>
                              <span className="text-xs text-gray-500 font-mono mt-1">
                                {user.userId.length > 24 ? `${user.userId.substring(0, 24)}...` : user.userId}
                              </span>
                            </>
                          ) : (
                            <a 
                              href={`/users?q=${encodeURIComponent(user.userId)}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                              title={`View user: ${user.userId}`}
                            >
                              {user.userId.length > 24 ? `${user.userId.substring(0, 24)}...` : user.userId}
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold text-lg">{user.paymentCount}</span>
                      <span className="text-gray-500 ml-1">გადახდა</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {user.successfulPayments}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.failedPayments > 0 ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {user.failedPayments}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.totalAmount.toFixed(2)}₾
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedUserAnalytics(user);
                          setShowUserAnalyticsModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        დეტალები
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ძიება
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="User ID, Order ID, Transaction ID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              სტატუსი
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ყველა</option>
              <option value="success">წარმატებული</option>
              <option value="pending">მოლოდინში</option>
              <option value="failed">ჩავარდნილი</option>
              <option value="rejected">უარყოფილი</option>
              <option value="cancelled">გაუქმებული</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              თარიღი
            </label>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ყველა</option>
              <option value="today">დღეს</option>
              <option value="week">ბოლო კვირა</option>
              <option value="month">ბოლო თვე</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          ნაჩვენებია {paginatedPayments.length} / {filteredPayments.length} გადახდა
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  თანხა
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სტატუსი
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  კონტექსტი
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  პლანი
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  გადახდის თარიღი
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    გადახდები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => {
                  // Check if subscription actually exists in subscriptions collection
                  const hasSubscription = subscriptionsMap[payment.userId] === true;
                  const canCreateSubscription = !hasSubscription && (payment.status === 'completed' || payment.status === 'success');
                  const userInfo = userMap[payment.userId];
                  const userName = userInfo?.name || payment.userId;
                  
                  const isRejectedPayment = payment.status === 'rejected';
                  
                  return (
                    <tr 
                      key={payment._id} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        isRejectedPayment ? 'bg-orange-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowPaymentModal(true);
                      }}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          {userInfo ? (
                            <>
                              <a 
                                href={`/users?q=${encodeURIComponent(payment.userId)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                                title={`View user: ${payment.userId}`}
                              >
                                {userName}
                              </a>
                              <span className="text-xs text-gray-500 font-mono mt-1">
                                {payment.userId.substring(0, 20)}...
                              </span>
                            </>
                          ) : (
                            <a 
                              href={`/users?q=${encodeURIComponent(payment.userId)}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                              onClick={(e) => e.stopPropagation()}
                              title={`View user: ${payment.userId}`}
                            >
                              {payment.userId.substring(0, 20)}...
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        <span title={payment.orderId}>
                          {payment.orderId.substring(0, 20)}...
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                              payment.status
                            )}`}
                          >
                            {payment.status}
                          </span>
                          {isRejectedPayment && (
                            <span className="text-xs text-orange-600 font-medium">
                              ⚠️ ფული არ ჩამოეჭრა
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.context}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.metadata?.planName || payment.metadata?.planId || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{formatDate(payment.paymentDate)}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(payment.paymentDate)}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                        {canCreateSubscription ? (
                          <button
                            onClick={() => handleCreateSubscription(payment)}
                            disabled={creatingSubscription === payment._id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              creatingSubscription === payment._id
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {creatingSubscription === payment._id ? 'შექმნა...' : 'საბსქრიფშენად გადატანა'}
                          </button>
                        ) : hasSubscription ? (
                          <span className="text-xs text-gray-400">უკვე subscription-ია</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                წინა
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                შემდეგი
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  გვერდი <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    წინა
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    შემდეგი
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {showPaymentModal && selectedPayment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">გადახდის დეტალები</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">მომხმარებელი</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userMap[selectedPayment.userId] && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">სახელი</label>
                        <p className="text-base font-medium text-gray-900">
                          {userMap[selectedPayment.userId].name}
                        </p>
                      </div>
                      {userMap[selectedPayment.userId].phone && (
                        <div>
                          <label className="text-sm text-gray-600">ტელეფონი</label>
                          <p className="text-base font-medium text-gray-900">
                            {userMap[selectedPayment.userId].phone}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="text-sm text-gray-600">User ID</label>
                    <p className="text-base font-mono text-gray-900">
                      <a 
                        href={`/users?q=${encodeURIComponent(selectedPayment.userId)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {selectedPayment.userId}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">თანხა</label>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedPayment.amount.toFixed(2)} {selectedPayment.currency}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">სტატუსი</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusBadge(selectedPayment.status)}`}>
                      {selectedPayment.status}
                    </span>
                  </p>
                  {selectedPayment.status === 'rejected' && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ გადახდა უარყოფილია - ფული არ ჩამოეჭრა
                      </p>
                      {selectedPayment.codeDescription && (
                        <p className="text-xs text-orange-700 mt-1">
                          მიზეზი: {selectedPayment.codeDescription}
                        </p>
                      )}
                      {selectedPayment.metadata?.bogCallbackData?.reject_reason && (
                        <p className="text-xs text-orange-700 mt-1">
                          BOG მიზეზი: {selectedPayment.metadata.bogCallbackData.reject_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Order ID</label>
                  <p className="text-base font-mono text-gray-900">{selectedPayment.orderId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Transaction ID</label>
                  <p className="text-base font-mono text-gray-900">
                    {selectedPayment.transactionId || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">გადახდის მეთოდი</label>
                  <p className="text-base text-gray-900">{selectedPayment.paymentMethod || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">კონტექსტი</label>
                  <p className="text-base text-gray-900">{selectedPayment.context || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">გადახდის თარიღი</label>
                  <p className="text-base text-gray-900">
                    {formatDateTime(selectedPayment.paymentDate || selectedPayment.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">შექმნის თარიღი</label>
                  <p className="text-base text-gray-900">
                    {formatDateTime(selectedPayment.createdAt)}
                  </p>
                </div>
              </div>

              {/* Plan Info */}
              {selectedPayment.metadata && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">პლანის ინფორმაცია</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPayment.metadata.planName && (
                      <div>
                        <label className="text-sm text-gray-600">პლანის სახელი</label>
                        <p className="text-base font-medium text-gray-900">
                          {selectedPayment.metadata.planName}
                        </p>
                      </div>
                    )}
                    {selectedPayment.metadata.planId && (
                      <div>
                        <label className="text-sm text-gray-600">პლანის ID</label>
                        <p className="text-base font-mono text-gray-900">
                          {selectedPayment.metadata.planId}
                        </p>
                      </div>
                    )}
                    {selectedPayment.metadata.planPrice && (
                      <div>
                        <label className="text-sm text-gray-600">ფასი</label>
                        <p className="text-base text-gray-900">
                          {selectedPayment.metadata.planPrice} {selectedPayment.metadata.planCurrency || '₾'}
                        </p>
                      </div>
                    )}
                    {selectedPayment.metadata.planPeriod && (
                      <div>
                        <label className="text-sm text-gray-600">პერიოდი</label>
                        <p className="text-base text-gray-900">
                          {selectedPayment.metadata.planPeriod}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPayment.description && (
                  <div>
                    <label className="text-sm text-gray-600">აღწერა</label>
                    <p className="text-base text-gray-900 mt-1">{selectedPayment.description}</p>
                  </div>
                )}
                {selectedPayment.isRecurring && (
                  <div>
                    <label className="text-sm text-gray-600">რეკურენტული</label>
                    <p className="text-base text-gray-900">კი</p>
                  </div>
                )}
                {selectedPayment.recurringPaymentId && (
                  <div>
                    <label className="text-sm text-gray-600">Recurring Payment ID</label>
                    <p className="text-base font-mono text-gray-900">
                      {selectedPayment.recurringPaymentId}
                    </p>
                  </div>
                )}
                {selectedPayment.cardType && (
                  <div>
                    <label className="text-sm text-gray-600">ბარათის ტიპი</label>
                    <p className="text-base text-gray-900">{selectedPayment.cardType}</p>
                  </div>
                )}
                {selectedPayment.cardExpiryDate && (
                  <div>
                    <label className="text-sm text-gray-600">ბარათის ვადა</label>
                    <p className="text-base text-gray-900">{selectedPayment.cardExpiryDate}</p>
                  </div>
                )}
                {selectedPayment.authCode && (
                  <div>
                    <label className="text-sm text-gray-600">Auth Code</label>
                    <p className="text-base font-mono text-gray-900">{selectedPayment.authCode}</p>
                  </div>
                )}
                {selectedPayment.code && (
                  <div>
                    <label className="text-sm text-gray-600">Code</label>
                    <p className="text-base font-mono text-gray-900">{selectedPayment.code}</p>
                  </div>
                )}
                {selectedPayment.codeDescription && (
                  <div>
                    <label className="text-sm text-gray-600">Code Description</label>
                    <p className="text-base text-gray-900">{selectedPayment.codeDescription}</p>
                  </div>
                )}
                {selectedPayment.payerIdentifier && (
                  <div>
                    <label className="text-sm text-gray-600">Payer Identifier</label>
                    <p className="text-base font-mono text-gray-900">
                      {selectedPayment.payerIdentifier}
                    </p>
                  </div>
                )}
                {selectedPayment.parentOrderId && (
                  <div>
                    <label className="text-sm text-gray-600">Parent Order ID</label>
                    <p className="text-base font-mono text-gray-900">
                      {selectedPayment.parentOrderId}
                    </p>
                  </div>
                )}
                {selectedPayment.externalOrderId && (
                  <div>
                    <label className="text-sm text-gray-600">External Order ID</label>
                    <p className="text-base font-mono text-gray-900">
                      {selectedPayment.externalOrderId}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                {subscriptionsMap[selectedPayment.userId] !== true && 
                 (selectedPayment.status === 'completed' || selectedPayment.status === 'success') && (
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      handleCreateSubscription(selectedPayment);
                    }}
                    disabled={creatingSubscription === selectedPayment._id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      creatingSubscription === selectedPayment._id
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {creatingSubscription === selectedPayment._id 
                      ? 'შექმნა...' 
                      : 'საბსქრიფშენად გადატანა'}
                  </button>
                )}
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  დახურვა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Detail Modal */}
      {showUserAnalyticsModal && selectedUserAnalytics && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUserAnalyticsModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">👤 User Analytics - დეტალები</h2>
              <button
                onClick={() => setShowUserAnalyticsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">მომხმარებელი</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userMap[selectedUserAnalytics.userId] && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">სახელი</label>
                        <p className="text-base font-medium text-gray-900">
                          {userMap[selectedUserAnalytics.userId].name}
                        </p>
                      </div>
                      {userMap[selectedUserAnalytics.userId].phone && (
                        <div>
                          <label className="text-sm text-gray-600">ტელეფონი</label>
                          <p className="text-base font-medium text-gray-900">
                            {userMap[selectedUserAnalytics.userId].phone}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="text-sm text-gray-600">User ID</label>
                    <p className="text-base font-mono text-gray-900">
                      <a 
                        href={`/users?q=${encodeURIComponent(selectedUserAnalytics.userId)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {selectedUserAnalytics.userId}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">სულ გადახდები</div>
                  <div className="text-3xl font-bold text-blue-600">{selectedUserAnalytics.paymentCount}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">წარმატებული</div>
                  <div className="text-3xl font-bold text-green-600">{selectedUserAnalytics.successfulPayments}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-gray-600 mb-1">ჩავარდნილი</div>
                  <div className="text-3xl font-bold text-red-600">{selectedUserAnalytics.failedPayments}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">სულ თანხა</div>
                  <div className="text-3xl font-bold text-purple-600">{selectedUserAnalytics.totalAmount.toFixed(2)}₾</div>
                </div>
              </div>

              {/* Payments List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">გადახდების ისტორია</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          თარიღი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          თანხა
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          სტატუსი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          კონტექსტი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          მოქმედებები
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedUserAnalytics.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            გადახდები არ მოიძებნა
                          </td>
                        </tr>
                      ) : (
                        selectedUserAnalytics.payments
                          .sort((a, b) => {
                            const dateA = new Date(a.paymentDate || a.createdAt).getTime();
                            const dateB = new Date(b.paymentDate || b.createdAt).getTime();
                            return dateB - dateA;
                          })
                          .map((payment) => (
                            <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDateTime(payment.paymentDate || payment.createdAt)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {payment.amount.toFixed(2)} {payment.currency}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                                {payment.orderId.substring(0, 20)}...
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.context || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => {
                                    setShowUserAnalyticsModal(false);
                                    setSelectedPayment(payment);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                  დეტალები
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <a
                  href={`/users?q=${encodeURIComponent(selectedUserAnalytics.userId)}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  User-ის გვერდზე გადასვლა
                </a>
                <button
                  onClick={() => setShowUserAnalyticsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  დახურვა
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
