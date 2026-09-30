"use client";

import React, { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

interface Subscription {
  _id: string;
  userId: string;
  planId: string;
  planName: string;
  planPrice: number;
  currency: string;
  period: string;
  status: string;
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  orderId?: string;
  totalPaid: number;
  billingCycles: number;
  bogCardToken?: string;
  createdAt: string;
  updatedAt: string;
}

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
      order_status?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface UpcomingPayment {
  subscriptionId: string;
  userId: string;
  planName: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
  timeUntilBilling: string;
  isRejectedPayment?: boolean;
  rejectReason?: string;
}

function SubscriptionsModernView(props: any) {
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [query, setQuery] = useState('');
  const {
    subscriptions, stats, upcomingPayments, loadingUpcoming, fetchUpcomingPayments,
    processingRecurring, handleProcessRecurringPayments, recurringResult, exportToCSV,
    fetchSubscriptionPayments, subscriptionPayments, loadingPayments,
    handleDeleteSubscription, deletingSubscriptionId, rejectedPaymentsMap,
    getStatusBadge, formatDate, formatDateTime,
  } = props;
  const filtered = subscriptions.filter((s: Subscription) => {
    const value = `${s.userId} ${s.planName} ${s.status} ${s.orderId || ''}`.toLowerCase();
    return value.includes(query.toLowerCase());
  });
  const openSubscription = (s: Subscription) => {
    setSelected(s);
    fetchSubscriptionPayments(s);
  };

  return <div className="space-y-5 text-gray-900 dark:text-gray-100">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-500">MARTE BILLING</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">გამოწერები</h1><p className="mt-1 text-sm text-gray-500">პაკეტები, გადახდები და recurring billing ერთ სივრცეში</p></div><div className="flex gap-2"><button onClick={exportToCSV} disabled={!subscriptions.length} className="rounded-xl border px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-40">CSV ექსპორტი</button><button onClick={props.refresh} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">განახლება</button></div></div>
    {props.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{props.error}</div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xs text-gray-500">სულ</p><p className="mt-2 text-2xl font-semibold">{stats.total}</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm"><p className="text-xs text-emerald-700">აქტიური</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.active}</p></div><div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 shadow-sm"><p className="text-xs text-red-700">გაუქმებული</p><p className="mt-2 text-2xl font-semibold text-red-700">{stats.cancelled}</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xs text-gray-500">ვადა გასული</p><p className="mt-2 text-2xl font-semibold">{stats.expired}</p></div><div className="col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm lg:col-span-1"><p className="text-xs text-indigo-700">შემოსავალი</p><p className="mt-2 text-2xl font-semibold text-indigo-700">{stats.totalRevenue.toFixed(2)}₾</p></div></div>

    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap items-end justify-between gap-3"><label className="min-w-[260px] flex-1 text-xs font-medium text-gray-500">ძებნა<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="User ID, პაკეტი, სტატუსი ან Order ID" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-900" /></label><div className="flex gap-2 text-xs text-gray-500"><span className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-700">{filtered.length} გამოწერა</span><span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">{upcomingPayments.length} მოსალოდნელი გადახდა</span></div></div></div>

    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Recurring billing</h2><p className="mt-1 text-xs text-gray-500">მომწიფებული და დაგეგმილი გადახდების დამუშავება</p></div><button onClick={handleProcessRecurringPayments} disabled={processingRecurring} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{processingRecurring ? 'მუშავდება…' : 'გადახდების დამუშავება'}</button></div>{recurringResult && <div className={`mt-4 rounded-xl border p-3 text-sm ${recurringResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{recurringResult.message}{recurringResult.data ? ` · სულ ${recurringResult.data.total}, წარმატებული ${recurringResult.data.success}, წარუმატებელი ${recurringResult.data.failed}` : ''}</div>}</div>

    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700"><div><h2 className="font-semibold">მომავალი გადახდები</h2><p className="mt-1 text-xs text-gray-500">შემდეგი 7 დღე და გადაუხდელი recurring გადასახადები</p></div><button onClick={fetchUpcomingPayments} disabled={loadingUpcoming} className="text-sm text-indigo-600">{loadingUpcoming ? 'იტვირთება…' : 'განახლება'}</button></div>{upcomingPayments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-gray-500">მომავალი გადახდები არ არის</p> : <div className="divide-y dark:divide-gray-700">{upcomingPayments.slice(0, 5).map((p: UpcomingPayment) => <div key={`${p.subscriptionId}-${p.nextBillingDate}`} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm ${p.isRejectedPayment ? 'bg-red-50/70' : ''}`}><div><p className="font-medium">{p.planName}</p><p className="text-xs text-gray-500">{p.userId} · {formatDate(p.nextBillingDate)}</p></div><div className="text-right"><p className="font-semibold">{p.amount} {p.currency}</p><span className={`text-xs ${p.isRejectedPayment ? 'text-red-600' : 'text-amber-600'}`}>{p.isRejectedPayment ? 'გადახდა უარყოფილია' : p.timeUntilBilling}</span></div></div>)}</div>}</div>

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700"><h2 className="font-semibold">ყველა გამოწერა</h2><p className="mt-1 text-xs text-gray-500">დააჭირე „გადახდები“-ს კონკრეტული მომხმარებლის ისტორიის სანახავად</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50/80 dark:bg-gray-900/40"><tr>{['მომხმარებელი','პაკეტი','თანხა','სტატუსი','შემდეგი გადახდა','გადახდილი','მოქმედება'].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr></thead><tbody>{filtered.map((s: Subscription) => { const rejected = rejectedPaymentsMap[s._id] || []; return <tr key={s._id} className={`border-t border-gray-100 hover:bg-indigo-50/30 dark:border-gray-700 ${rejected.length ? 'bg-red-50/50' : ''}`}><td className="px-5 py-3"><a className="font-mono text-xs text-indigo-600 hover:underline" href={`/users?q=${encodeURIComponent(s.userId)}`}>{s.userId}</a>{rejected.length > 0 && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">{rejected.length} rejected</span>}</td><td className="px-5 py-3 font-medium">{s.planName}<span className="ml-2 text-xs font-normal text-gray-400">{s.period}</span></td><td className="px-5 py-3">{s.planPrice} {s.currency}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(s.status)}`}>{s.status}</span></td><td className="px-5 py-3 text-xs text-gray-500">{s.nextBillingDate ? formatDate(s.nextBillingDate) : '—'}</td><td className="px-5 py-3 font-medium">{(s.totalPaid || 0).toFixed(2)} {s.currency}<span className="block text-xs font-normal text-gray-400">{s.billingCycles || 0} ციკლი</span></td><td className="px-5 py-3"><div className="flex gap-2"><button onClick={() => openSubscription(s)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100">გადახდები</button><button onClick={() => void handleDeleteSubscription(s)} disabled={deletingSubscriptionId === s._id} className="rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">{deletingSubscriptionId === s._id ? 'იშლება…' : 'წაშლა'}</button></div></td></tr>; })}{filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">გამოწერები ვერ მოიძებნა</td></tr>}</tbody></table></div></div>

    {selected && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelected(null)}><aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-indigo-500">Payment history</p><h2 className="mt-1 text-xl font-semibold">{selected.planName}</h2><a className="mt-1 block font-mono text-xs text-indigo-600" href={`/users?q=${encodeURIComponent(selected.userId)}`}>{selected.userId}</a></div><button className="text-xl text-gray-400" onClick={() => setSelected(null)}>×</button></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900"><p className="text-xs text-gray-500">სტატუსი</p><p className="mt-1 text-sm font-medium">{selected.status}</p></div><div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900"><p className="text-xs text-gray-500">პაკეტის ფასი</p><p className="mt-1 text-sm font-medium">{selected.planPrice} {selected.currency}</p></div><div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900"><p className="text-xs text-gray-500">სულ გადახდილი</p><p className="mt-1 text-sm font-medium">{(selected.totalPaid || 0).toFixed(2)} {selected.currency}</p></div></div><div className="mt-6">{loadingPayments ? <p className="py-10 text-center text-sm text-gray-500">გადახდები იტვირთება…</p> : subscriptionPayments.length === 0 ? <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-gray-900">გადახდების ისტორია არ მოიძებნა</p> : <div className="divide-y rounded-xl border dark:divide-gray-700">{subscriptionPayments.map((p: Payment) => { const rejectReason = p.codeDescription || p.code || p.metadata?.bogCallbackData?.reject_reason || p.metadata?.bogCallbackData?.order_status; return <div key={p._id} className="px-4 py-3"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{p.description || p.context || 'Subscription payment'}</p><p className="mt-1 text-xs text-gray-500">{formatDateTime(p.paymentDate || p.createdAt)}{p.paymentMethod ? ` · ${p.paymentMethod}` : ''}</p></div><div className="text-right"><p className="font-semibold">{p.amount} {p.currency}</p><span className={`text-xs ${p.status === 'completed' || p.status === 'success' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{p.status}</span></div></div>{p.status === 'rejected' && <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span className="font-medium">რატომ არ ჩამოიჭრა:</span> {rejectReason || 'გადახდის სისტემა მიზეზს არ აბრუნებს'}</div>}</div>; })}</div>}</div></aside></div>}
  </div>;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    cancelled: 0,
    expired: 0,
    totalRevenue: 0,
  });
  const [processingRecurring, setProcessingRecurring] = useState(false);
  const [recurringResult, setRecurringResult] = useState<{
    success: boolean;
    message: string;
    data?: { success: number; failed: number; total: number };
  } | null>(null);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionPayments, setSubscriptionPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<string | null>(null);
  const [rejectedPaymentsMap, setRejectedPaymentsMap] = useState<Record<string, Payment[]>>({});

  useEffect(() => {
    fetchSubscriptions();
    fetchUpcomingPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch rejected payments for all subscriptions
  useEffect(() => {
    if (subscriptions.length > 0) {
      fetchRejectedPaymentsForSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subscriptions from backend
      const response = await fetch(`${API_BASE}/subscriptions?t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions");
      }

      const data = await response.json();
      const subs = Array.isArray(data) ? data : (data.data || []);
      
      setSubscriptions(subs);

      // Calculate stats
      const statsData = {
        total: subs.length,
        active: subs.filter((s: Subscription) => s.status === "active").length,
        cancelled: subs.filter((s: Subscription) => s.status === "cancelled").length,
        expired: subs.filter((s: Subscription) => s.status === "expired").length,
        totalRevenue: subs.reduce((sum: number, s: Subscription) => sum + (s.totalPaid || 0), 0),
      };
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
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
      second: "2-digit",
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("ka-GE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const fetchRejectedPaymentsForSubscriptions = async () => {
    try {
      const rejectedPayments: Record<string, Payment[]> = {};
      
      // Fetch rejected payments for each subscription
      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            const response = await fetch(`${API_BASE}/api/payments/user/${subscription.userId}?t=${Date.now()}`, {
              cache: "no-store",
              headers: { 'Cache-Control': 'no-cache' },
            });
            
            if (response.ok) {
              const data = await response.json();
              const allPayments = (data.data || data || []).filter((p: Payment) => 
                (p.context === 'subscription' || 
                 p.context === 'test_subscription' ||
                 p.metadata?.planId === subscription.planId) &&
                p.isRecurring === true
              );
              
              // Find rejected payments that don't have a completed payment after them
              const rejected = allPayments.filter((p: Payment) => {
                if (p.status !== 'rejected') return false;
                
                // Check if there's a completed payment after this rejected payment
                const rejectedDate = new Date(p.paymentDate).getTime();
                const hasCompletedAfter = allPayments.some((other: Payment) => {
                  if (other.status !== 'completed' && other.status !== 'success') return false;
                  const otherDate = new Date(other.paymentDate).getTime();
                  return otherDate > rejectedDate;
                });
                
                // Only show rejected payment if there's no completed payment after it
                return !hasCompletedAfter;
              });
              
              if (rejected.length > 0) {
                rejectedPayments[subscription._id] = rejected;
              }
            }
          } catch (err) {
            console.error(`Error fetching rejected payments for subscription ${subscription._id}:`, err);
          }
        })
      );
      
      setRejectedPaymentsMap(rejectedPayments);
    } catch (err) {
      console.error("Error fetching rejected payments:", err);
    }
  };

  const fetchSubscriptionPayments = async (subscription: Subscription) => {
    try {
      setLoadingPayments(true);
      setSelectedSubscription(subscription);
      
      const response = await fetch(`${API_BASE}/api/payments/user/${subscription.userId}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const data = await response.json();
      const payments = (data.data || data || []).filter((p: Payment) => 
        p.context === 'subscription' || 
        p.context === 'test_subscription' ||
        p.metadata?.planId === subscription.planId
      );
      
      setSubscriptionPayments(payments);
    } catch (err) {
      console.error("Error fetching subscription payments:", err);
      setSubscriptionPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleDeleteSubscription = async (subscription: Subscription) => {
    const ok = confirm(
      `ნამდვილად გსურთ ამ საბსქრიფშენის წაშლა?\n\nUser ID: ${subscription.userId}\nპლანი: ${subscription.planName}\nსტატუსი: ${subscription.status}\n\nმომხმარებელი აპში Free გახდება.`,
    );
    if (!ok) return;

    setDeletingSubscriptionId(subscription._id);
    try {
      const response = await fetch(`${API_BASE}/subscriptions/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription._id,
          userId: subscription.userId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ საბსქრიფშენი წაიშალა");
        if (selectedSubscription?._id === subscription._id) {
          setSelectedSubscription(null);
          setSubscriptionPayments([]);
        }
        await fetchSubscriptions();
      } else {
        alert(`❌ შეცდომა: ${result.message || result.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error deleting subscription:", err);
      alert(`❌ შეცდომა: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingSubscriptionId(null);
    }
  };

  const handleProcessRecurringPayments = async () => {
    try {
      setProcessingRecurring(true);
      setRecurringResult(null);

      const response = await fetch(`${API_BASE}/api/recurring-payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      setRecurringResult(result);

      // Refresh subscriptions and upcoming payments after processing
      if (result.success) {
        await fetchSubscriptions();
        await fetchUpcomingPayments();
      }
    } catch (error) {
      console.error('Error processing recurring payments:', error);
      setRecurringResult({
        success: false,
        message: error instanceof Error ? error.message : 'შეცდომა მოხდა',
      });
    } finally {
      setProcessingRecurring(false);
    }
  };

  const fetchUpcomingPayments = async () => {
    try {
      setLoadingUpcoming(true);
      const response = await fetch(`${API_BASE}/api/recurring-payments/upcoming?hours=168`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch upcoming payments");
      }

      const data = await response.json();
      let upcoming: UpcomingPayment[] = [];
      
      if (data.success && data.data?.upcoming) {
        upcoming = data.data.upcoming;
      }

      // Add subscriptions with unpaid rejected payments
      const unpaidRejectedPayments: UpcomingPayment[] = [];
      
      for (const subscription of subscriptions) {
        const rejectedPayments = rejectedPaymentsMap[subscription._id] || [];
        
        if (rejectedPayments.length > 0) {
          // Get the latest rejected payment
          const latestRejected = rejectedPayments.sort((a, b) => 
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
          )[0];
          
          // Check if there's a completed payment after this rejected payment
          try {
            const paymentResponse = await fetch(`${API_BASE}/api/payments/user/${subscription.userId}?t=${Date.now()}`, {
              cache: "no-store",
              headers: { 'Cache-Control': 'no-cache' },
            });
            
            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              const allPayments = (paymentData.data || paymentData || []).filter((p: Payment) => 
                (p.context === 'subscription' || 
                 p.context === 'test_subscription' ||
                 p.metadata?.planId === subscription.planId) &&
                p.isRecurring === true
              );
              
              const rejectedDate = new Date(latestRejected.paymentDate).getTime();
              const hasCompletedAfter = allPayments.some((other: Payment) => {
                if (other.status !== 'completed' && other.status !== 'success') return false;
                const otherDate = new Date(other.paymentDate).getTime();
                return otherDate > rejectedDate;
              });
              
              // Only add if there's no completed payment after the rejected one
              if (!hasCompletedAfter) {
                const rejectedDateObj = new Date(latestRejected.paymentDate);
                const now = new Date();
                const timeDiff = rejectedDateObj.getTime() - now.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                
                unpaidRejectedPayments.push({
                  subscriptionId: subscription._id,
                  userId: subscription.userId,
                  planName: subscription.planName,
                  amount: latestRejected.amount,
                  currency: latestRejected.currency,
                  nextBillingDate: latestRejected.paymentDate,
                  timeUntilBilling: daysDiff >= 0 
                    ? `${daysDiff} დღე` 
                    : `${Math.abs(daysDiff)} დღე წარსულში`,
                  isRejectedPayment: true,
                  rejectReason: latestRejected.codeDescription || latestRejected.metadata?.bogCallbackData?.reject_reason || 'Unknown reason',
                });
              }
            }
          } catch (err) {
            console.error(`Error checking payments for subscription ${subscription._id}:`, err);
          }
        }
      }
      
      // Combine upcoming payments with unpaid rejected payments
      setUpcomingPayments([...upcoming, ...unpaidRejectedPayments]);
    } catch (err) {
      console.error("Error fetching upcoming payments:", err);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const csvEscapeCell = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n\r;]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const exportToCSV = () => {
    const headers = [
      "User ID",
      "პლანი",
      "თანხა",
      "ვალუტა",
      "პერიოდი",
      "სტატუსი",
      "დაწყების თარიღი",
      "შემდეგი გადახდა",
      "ციკლები",
      "სულ გადახდილი",
      "Plan ID",
      "Order ID",
      "Rejected გადახდები",
      "Rejected მიზეზი",
      "შექმნის თარიღი",
      "განახლების თარიღი",
    ];

    const rows = subscriptions.map((subscription) => {
      const rejectedPayments = rejectedPaymentsMap[subscription._id] || [];
      const latestRejectedPayment = rejectedPayments.length > 0
        ? rejectedPayments.sort(
            (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
          )[0]
        : null;

      return [
        subscription.userId,
        subscription.planName,
        subscription.planPrice,
        subscription.currency,
        subscription.period,
        subscription.status,
        subscription.startDate || "",
        subscription.nextBillingDate || "",
        subscription.billingCycles,
        subscription.totalPaid.toFixed(2),
        subscription.planId,
        subscription.orderId || "",
        rejectedPayments.length,
        latestRejectedPayment?.codeDescription ||
          latestRejectedPayment?.metadata?.bogCallbackData?.reject_reason ||
          "",
        subscription.createdAt,
        subscription.updatedAt,
      ];
    });

    const csvContent = `\uFEFF${[
      headers.join(";"),
      ...rows.map((row) => row.map(csvEscapeCell).join(";")),
    ].join("\r\n")}`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `subscriptions_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  return <SubscriptionsModernView
    subscriptions={subscriptions}
    stats={stats}
    upcomingPayments={upcomingPayments}
    loadingUpcoming={loadingUpcoming}
    fetchUpcomingPayments={fetchUpcomingPayments}
    processingRecurring={processingRecurring}
    handleProcessRecurringPayments={handleProcessRecurringPayments}
    recurringResult={recurringResult}
    exportToCSV={exportToCSV}
    refresh={fetchSubscriptions}
    error={error}
    fetchSubscriptionPayments={fetchSubscriptionPayments}
    subscriptionPayments={subscriptionPayments}
    loadingPayments={loadingPayments}
    handleDeleteSubscription={handleDeleteSubscription}
    deletingSubscriptionId={deletingSubscriptionId}
    rejectedPaymentsMap={rejectedPaymentsMap}
    getStatusBadge={getStatusBadge}
    formatDate={formatDate}
    formatDateTime={formatDateTime}
  />;

  /* Legacy markup retained below temporarily while the new billing view is verified. */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">საბსქრიფშენები</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={subscriptions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            CSV-ში ექსპორტი
          </button>
          <button
            onClick={fetchSubscriptions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            განახლება
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Recurring Payments Processing */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">რეკურინგ გადახდების დამუშავება</h3>
            <p className="text-sm text-gray-600">
              დაუვლის ყველა subscription-ს და თუ nextBillingDate მოსულია, ჩამოაჭრის თანხას
            </p>
          </div>
          <button
            onClick={handleProcessRecurringPayments}
            disabled={processingRecurring}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              processingRecurring
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {processingRecurring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>მუშავდება...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>გადახდების დამუშავება</span>
              </>
            )}
          </button>
        </div>

        {recurringResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            recurringResult!.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">
                {recurringResult!.success ? '✅' : '❌'}
              </span>
              <span className={`font-semibold ${
                recurringResult!.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {recurringResult!.message}
              </span>
            </div>
            {recurringResult!.data && (
              <div className="mt-2 text-sm text-gray-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-600">სულ</div>
                    <div className="text-lg font-bold text-gray-900">{recurringResult!.data!.total}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">წარმატებული</div>
                    <div className="text-lg font-bold text-green-600">{recurringResult!.data!.success}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">წარუმატებელი</div>
                    <div className="text-lg font-bold text-red-600">{recurringResult!.data!.failed}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Payments */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">მომდინარე გადახდები (7 დღე)</h3>
            <p className="text-sm text-gray-600">
              გადახდები რომლებიც მომდინარე 7 დღის განმავლობაში უნდა ჩამოვაჭრათ ან გადაუხდელი rejected payments-ები
            </p>
          </div>
          <button
            onClick={fetchUpcomingPayments}
            disabled={loadingUpcoming}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loadingUpcoming ? 'იტვირთება...' : 'განახლება'}
          </button>
        </div>

        {loadingUpcoming ? (
          <div className="text-center py-8 text-gray-500">იტვირთება...</div>
        ) : upcomingPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">მომდინარე გადახდები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    პლანი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    თანხა
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    შემდეგი გადახდის თარიღი
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    დარჩენილი დრო
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    სტატუსი
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingPayments.map((payment) => {
                  const nextBillingDate = new Date(payment.nextBillingDate);
                  const now = new Date();
                  const isOverdue = nextBillingDate <= now;
                  
                  return (
                    <tr key={payment.subscriptionId} className={`hover:bg-gray-50 ${isOverdue || payment.isRejectedPayment ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <a 
                          href={`/users?q=${encodeURIComponent(payment.userId)}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono break-all"
                          title={`View user: ${payment.userId}`}
                        >
                          {payment.userId}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.planName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.amount} {payment.currency}
                        {payment.isRejectedPayment && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              ⚠️ გადაუხდელი
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.nextBillingDate)}
                        {payment.isRejectedPayment && isOverdue && (
                          <div className="text-xs text-red-600 mt-1">(წარსულში)</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isOverdue || payment.isRejectedPayment
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isOverdue || payment.isRejectedPayment ? '⏰ ვადა გასული' : payment.timeUntilBilling}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.isRejectedPayment ? (
                          <div className="space-y-1">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              ⚠️ Rejected Payment
                            </span>
                            {payment.rejectReason && (
                              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <div className="font-semibold text-red-800">მიზეზი:</div>
                                <div className="text-red-700 mt-0.5">{payment.rejectReason}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            მომდინარე
                          </span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">სულ</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">აქტიური</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">გაუქმებული</div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">ვადა გასული</div>
          <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">სულ შემოსავალი</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalRevenue.toFixed(2)}₾</div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  პლანი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  თანხა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  პერიოდი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  დაწყების თარიღი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  შემდეგი გადახდა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ციკლები
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სულ გადახდილი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    საბსქრიფშენები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                subscriptions.map((subscription) => {
                  const rejectedPayments = rejectedPaymentsMap[subscription._id] || [];
                  const hasRejectedPayments = rejectedPayments.length > 0;
                  const latestRejectedPayment = rejectedPayments.length > 0 
                    ? rejectedPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]
                    : null;
                  
                  return (
                  <tr key={subscription._id} className={`hover:bg-gray-50 ${hasRejectedPayments ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a 
                        href={`/users?q=${encodeURIComponent(subscription.userId)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono break-all"
                        title={`View user: ${subscription.userId}`}
                      >
                        {subscription.userId}
                      </a>
                      {hasRejectedPayments && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            ⚠️ {rejectedPayments.length} rejected payment{rejectedPayments.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subscription.planName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.planPrice} {subscription.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                          subscription.status
                        )}`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatDate(subscription.startDate)}</div>
                      <div className="text-xs text-gray-400">{formatTime(subscription.startDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription.nextBillingDate ? (
                        <>
                          <div>{formatDate(subscription.nextBillingDate)}</div>
                          <div className="text-xs text-gray-400">{formatTime(subscription.nextBillingDate)}</div>
                        </>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.billingCycles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subscription.totalPaid.toFixed(2)} {subscription.currency}
                      {hasRejectedPayments && latestRejectedPayment && (
                        <div className="mt-1 text-xs text-red-600">
                          <div className="font-semibold">⚠️ გადასახდელი: {latestRejectedPayment.amount} {latestRejectedPayment.currency}</div>
                          {latestRejectedPayment.codeDescription && (
                            <div className="text-red-500 mt-0.5" title={latestRejectedPayment.metadata?.bogCallbackData?.reject_reason || latestRejectedPayment.codeDescription}>
                              მიზეზი: {latestRejectedPayment.codeDescription.length > 50 
                                ? latestRejectedPayment.codeDescription.substring(0, 50) + '...' 
                                : latestRejectedPayment.codeDescription}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => fetchSubscriptionPayments(subscription)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          გადახდები
                        </button>
                        <button
                          onClick={() => void handleDeleteSubscription(subscription)}
                          disabled={deletingSubscriptionId === subscription._id}
                          className={`px-3 py-1 rounded text-xs text-white ${
                            deletingSubscriptionId === subscription._id
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                          title="საბსქრიფშენის წაშლა ბაზიდან"
                        >
                          {deletingSubscriptionId === subscription._id ? "იშლება…" : "🗑️ წაშლა"}
                        </button>
                        {subscription.bogCardToken && subscription.bogCardToken.includes('subscription_') && (
                          <button
                            onClick={async () => {
                              if (!confirm(`ნამდვილად გსურთ ამ subscription-ის bogCardToken-ის განახლება payment-ის მონაცემებიდან?\n\nSubscription ID: ${subscription._id}\nCurrent Token: ${subscription.bogCardToken}`)) {
                                return;
                              }
                              setUpdatingToken(subscription._id);
                              try {
                                const response = await fetch(`${API_BASE}/subscriptions/${subscription._id}/update-token`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                });
                                const result = await response.json();
                                if (result.success) {
                                  alert(`✅ Subscription token წარმატებით განახლდა!\n\nNew Token: ${result.data?.bogCardToken || 'N/A'}`);
                                  await fetchSubscriptions();
                                } else {
                                  alert(`❌ შეცდომა: ${result.message || result.error || 'Unknown error'}`);
                                }
                              } catch (err) {
                                console.error("Error updating token:", err);
                                alert(`❌ შეცდომა: ${err instanceof Error ? err.message : 'Unknown error'}`);
                              } finally {
                                setUpdatingToken(null);
                              }
                            }}
                            disabled={updatingToken === subscription._id}
                            className={`px-3 py-1 rounded text-xs ${
                              updatingToken === subscription._id
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                            title="განაახლოს bogCardToken payment-ის მონაცემებიდან"
                          >
                            {updatingToken === subscription._id ? 'განახლება...' : '🔧 Token განახლება'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Payments Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">გადახდების ისტორია</h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600 break-all">
                      <span className="font-semibold">User ID:</span>{' '}
                      <a 
                        href={`/users?q=${encodeURIComponent(selectedSubscription!.userId)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono break-all"
                        title={`View user: ${selectedSubscription!.userId}`}
                      >
                        {selectedSubscription!.userId}
                      </a>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">პლანი:</span> {selectedSubscription!.planName} | <span className="font-semibold">პერიოდი:</span> {selectedSubscription!.period}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">დაწყება:</span> {formatDateTime(selectedSubscription!.startDate)}
                    </p>
                    {selectedSubscription!.endDate && (
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">დასრულება:</span> {formatDateTime(selectedSubscription!.endDate)}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">შექმნა:</span> {formatDateTime(selectedSubscription!.createdAt)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">განახლება:</span> {formatDateTime(selectedSubscription!.updatedAt)}
                    </p>
                    {selectedSubscription!.bogCardToken && (
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">BOG Token:</span> <span className="font-mono text-xs">{selectedSubscription!.bogCardToken!.substring(0, 30)}...</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubscription(null);
                    setSubscriptionPayments([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingPayments ? (
                <div className="text-center py-8 text-gray-500">იტვირთება...</div>
              ) : subscriptionPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">გადახდები არ მოიძებნა</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          თანხა
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          გადახდის თარიღი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          გადახდის საათი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          სტატუსი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ბარათის ტიპი
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recurring
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Auth Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          შექმნის თარიღი
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subscriptionPayments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                            {payment.orderId.substring(0, 20)}...
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.amount} {payment.currency}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.paymentDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(payment.paymentDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  payment.status === 'completed' || payment.status === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {payment.status}
                              </span>
                              {payment.status === 'rejected' && (
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                  <div className="font-semibold text-red-800">⚠️ გადახდა უარყოფილია</div>
                                  {payment.codeDescription && (
                                    <div className="text-red-700 mt-1">
                                      <span className="font-medium">მიზეზი:</span> {payment.codeDescription}
                                    </div>
                                  )}
                                  {payment.metadata?.bogCallbackData?.reject_reason && (
                                    <div className="text-red-600 mt-1 text-xs">
                                      <span className="font-medium">BOG:</span> {payment.metadata.bogCallbackData.reject_reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {payment.cardType ? (
                              <div>
                                <div className="uppercase">{payment.cardType}</div>
                                {payment.cardExpiryDate && (
                                  <div className="text-xs text-gray-400">{payment.cardExpiryDate}</div>
                                )}
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {payment.isRecurring ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                ✓ Recurring
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                            {payment.transactionId ? payment.transactionId.substring(0, 15) + '...' : "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                            {payment.authCode || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatDate(payment.createdAt)}</div>
                            <div className="text-xs text-gray-400">{formatTime(payment.createdAt)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
