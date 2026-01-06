"use client";

import React, { useEffect, useState } from "react";

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
  };
  createdAt: string;
  updatedAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSubscription, setCreatingSubscription] = useState<string | null>(null);
  const [subscriptionsMap, setSubscriptionsMap] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payments
      const response = await fetch(`${API_BASE}/api/payments?limit=200&skip=0&t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const data = await response.json();
      const paymentsData = Array.isArray(data.data) ? data.data : (data.data || []);
      
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
      };
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

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
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">გადახდები</h1>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          განახლება
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">სულ გადახდები</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">სულ თანხა</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalAmount.toFixed(2)}₾</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">წარმატებული</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">მოლოდინში</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  თანხა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  კონტექსტი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  პლანი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  გადახდის თარიღი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    გადახდები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  // Check if subscription actually exists in subscriptions collection
                  const hasSubscription = subscriptionsMap[payment.userId] === true;
                  const canCreateSubscription = !hasSubscription && (payment.status === 'completed' || payment.status === 'success');
                  
                  return (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <a 
                          href={`/users?q=${encodeURIComponent(payment.userId)}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                          title={`View user: ${payment.userId}`}
                        >
                          {payment.userId.substring(0, 20)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {payment.orderId.substring(0, 20)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.amount.toFixed(2)} {payment.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.context}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.metadata?.planName || payment.metadata?.planId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{formatDate(payment.paymentDate)}</div>
                        <div className="text-xs text-gray-400">{formatDateTime(payment.paymentDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canCreateSubscription ? (
                          <button
                            onClick={() => handleCreateSubscription(payment)}
                            disabled={creatingSubscription === payment._id}
                            className={`px-3 py-1 rounded text-xs font-medium ${
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
      </div>
    </div>
  );
}

