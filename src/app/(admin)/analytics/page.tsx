'use client';

import { useState, useEffect } from 'react';
import { apiGetJson } from '@/lib/api';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalLogins: number;
  loginsToday: number;
  totalBookings: number;
  bookingsToday: number;
  totalServices: number;
  totalParts: number;
  revenue: number;
  revenueToday: number;
  // დამატებითი მეტრიკები
  totalCarwashes?: number;
  totalStores?: number;
  totalDismantlers?: number;
  totalCarRentals?: number;
  totalSubscriptions?: number;
  activeSubscriptions?: number;
  totalPayments?: number;
  paymentsToday?: number;
  averagePayment?: number;
  subscriptionRevenue?: number;
}

interface PaymentStats {
  paymentsByMethod?: Array<{ _id: string; count: number; total: number }>;
  paymentsByContext?: Array<{ _id: string; count: number; total: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Login statistics
      const loginStats = await apiGetJson<{
        success: boolean;
        data: {
          totalLogins: number;
          loginsToday: number;
          uniqueUsers: number;
          uniqueUsersToday: number;
        };
      }>('/login-history/stats').catch(() => ({ success: false, data: null }));

      // Payment statistics
      const paymentStats = await apiGetJson<{
        success: boolean;
        data: {
          totalPayments?: number;
          totalAmount?: number;
          paymentsByMethod?: Array<{ _id: string; count: number; total: number }>;
          paymentsByContext?: Array<{ _id: string; count: number; total: number }>;
        };
      }>('/api/payments/stats').catch(() => ({ success: false, data: null }));

      // Calculate today's payments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = await apiGetJson<any[]>('/api/payments').catch(() => []);
      const paymentsToday = Array.isArray(todayPayments) 
        ? todayPayments.filter((p: any) => {
            const paymentDate = p.paymentDate ? new Date(p.paymentDate) : (p.createdAt ? new Date(p.createdAt) : null);
            return paymentDate && paymentDate >= today;
          }).length
        : 0;
      const revenueToday = Array.isArray(todayPayments)
        ? todayPayments
            .filter((p: any) => {
              const paymentDate = p.paymentDate ? new Date(p.paymentDate) : (p.createdAt ? new Date(p.createdAt) : null);
              return paymentDate && paymentDate >= today && p.status === 'completed';
            })
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : 0;

      // Services count
      const servicesData = await apiGetJson<any[]>('/services/all?limit=1').catch(() => []);
      const carwashesData = await apiGetJson<any[]>('/carwash/locations').catch(() => []);
      const storesData = await apiGetJson<any[]>('/stores').catch(() => []);
      const dismantlersData = await apiGetJson<{ success: boolean; data?: any[] }>('/dismantlers').catch(() => ({ success: false, data: [] }));
      const carRentalsData = await apiGetJson<any[]>('/car-rental').catch(() => []);
      const subscriptionsData = await apiGetJson<{ success: boolean; data?: any[] }>('/api/payments/subscriptions').catch(() => ({ success: false, data: [] }));

      // Calculate counts
      const totalCarwashes = Array.isArray(carwashesData) ? carwashesData.length : 0;
      const totalStores = Array.isArray(storesData) ? storesData.length : 0;
      const totalDismantlers = Array.isArray(dismantlersData?.data) ? dismantlersData.data.length : (Array.isArray(dismantlersData) ? dismantlersData.length : 0);
      const totalCarRentals = Array.isArray(carRentalsData) ? carRentalsData.length : 0;
      const subscriptions = Array.isArray(subscriptionsData?.data) ? subscriptionsData.data : (Array.isArray(subscriptionsData) ? subscriptionsData : []);
      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active').length;

      const analyticsData: AnalyticsData = {
        totalUsers: loginStats.data?.uniqueUsers || 0,
        activeUsers: loginStats.data?.uniqueUsersToday || 0,
        totalLogins: loginStats.data?.totalLogins || 0,
        loginsToday: loginStats.data?.loginsToday || 0,
        totalBookings: 0, // TODO: Add bookings endpoint
        bookingsToday: 0, // TODO: Add bookings endpoint
        totalServices: Array.isArray(servicesData) ? servicesData.length : 0,
        totalParts: 0, // TODO: Add parts count
        revenue: paymentStats.data?.totalAmount || 0,
        revenueToday: revenueToday,
        totalCarwashes,
        totalStores,
        totalDismantlers,
        totalCarRentals,
        totalSubscriptions,
        activeSubscriptions,
        totalPayments: paymentStats.data?.totalPayments || 0,
        paymentsToday: paymentsToday,
        averagePayment: paymentStats.data?.totalPayments && paymentStats.data?.totalAmount 
          ? (paymentStats.data.totalAmount / paymentStats.data.totalPayments) 
          : 0,
        subscriptionRevenue: subscriptions
          .filter((s: any) => s.status === 'active')
          .reduce((sum: number, s: any) => sum + (s.planPrice || 0), 0),
      };

      setAnalytics(analyticsData);
      setPaymentStats({
        paymentsByMethod: paymentStats.data?.paymentsByMethod || [],
        paymentsByContext: paymentStats.data?.paymentsByContext || [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ანალიტიკა</h1>
          <p className="text-gray-600 mt-1">აპლიკაციის სტატისტიკა და მეტრიკები</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                timeRange === range
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'today' ? 'დღეს' : range === 'week' ? 'კვირა' : range === 'month' ? 'თვე' : 'ყველა'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">იტვირთება...</div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">სულ იუზერები</div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.activeUsers} აქტიური დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">დალოგინება</div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">🔐</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalLogins.toLocaleString()}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.loginsToday} დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">ჯავშნები</div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📅</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalBookings.toLocaleString()}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.bookingsToday} დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">შემოსავალი</div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">💰</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.revenue.toFixed(2)}₾</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.revenueToday.toFixed(2)}₾ დღეს
              </div>
            </div>
          </div>

          {/* გადახდების სტატისტიკა */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">სულ გადახდები</div>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 text-xl">💳</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalPayments?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-500 mt-1">
                {analytics.paymentsToday || 0} დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">საშუალო გადახდა</div>
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-teal-600 text-xl">📊</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.averagePayment?.toFixed(2) || '0.00'}₾</div>
              <div className="text-sm text-gray-500 mt-1">
                საშუალო თანხა
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">საბსქრიფშენები</div>
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-pink-600 text-xl">⭐</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalSubscriptions || 0}</div>
              <div className="text-sm text-green-600 mt-1">
                {analytics.activeSubscriptions || 0} აქტიური
              </div>
              {analytics.subscriptionRevenue && analytics.subscriptionRevenue > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  {analytics.subscriptionRevenue.toFixed(2)}₾/თვე
                </div>
              )}
            </div>
          </div>

          {/* სერვისების სტატისტიკა */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">სერვისები</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ სერვისები</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalServices?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 text-sm">სამრეცხაო</span>
                  <span className="text-lg font-semibold text-gray-900">{analytics.totalCarwashes?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">მაღაზიები</span>
                  <span className="text-lg font-semibold text-gray-900">{analytics.totalStores?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">დაშლილები</span>
                  <span className="text-lg font-semibold text-gray-900">{analytics.totalDismantlers?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">მანქანების გაქირავება</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ მანქანები</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalCarRentals?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ნაწილები</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ ნაწილები</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalParts?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">საბსქრიფშენები</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalSubscriptions?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 text-sm">აქტიური</span>
                  <span className="text-lg font-semibold text-green-600">{analytics.activeSubscriptions?.toLocaleString() || 0}</span>
                </div>
                {analytics.subscriptionRevenue && analytics.subscriptionRevenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">შემოსავალი/თვე</span>
                    <span className="text-lg font-semibold text-yellow-600">{analytics.subscriptionRevenue.toFixed(2)}₾</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* გადახდების დეტალები */}
          {paymentStats && ((paymentStats.paymentsByMethod && paymentStats.paymentsByMethod.length > 0) || (paymentStats.paymentsByContext && paymentStats.paymentsByContext.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentStats.paymentsByMethod && paymentStats.paymentsByMethod.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">გადახდები მეთოდის მიხედვით</h3>
                  <div className="space-y-3">
                    {paymentStats.paymentsByMethod.map((method: any) => (
                      <div key={method._id || 'unknown'} className="flex justify-between items-center">
                        <span className="text-gray-600">{method._id || 'უცნობი'}</span>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{method.count || 0}</div>
                          <div className="text-sm text-gray-500">{method.total?.toFixed(2) || '0.00'}₾</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentStats.paymentsByContext && paymentStats.paymentsByContext.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">გადახდები კონტექსტის მიხედვით</h3>
                  <div className="space-y-3">
                    {paymentStats.paymentsByContext.map((context: any) => (
                      <div key={context._id || 'unknown'} className="flex justify-between items-center">
                        <span className="text-gray-600">{context._id || 'უცნობი'}</span>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{context.count || 0}</div>
                          <div className="text-sm text-gray-500">{context.total?.toFixed(2) || '0.00'}₾</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Firebase Analytics Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Firebase Analytics
                </h3>
                <p className="text-gray-600 mb-4">
                  Firebase Analytics ავტომატურად აკრიბებს მონაცემებს აპლიკაციიდან. 
                  ნახე დეტალური ანალიტიკა Firebase Console-ში.
                </p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">ტრეკინგის ივენთები:</span>
                    <ul className="list-disc list-inside text-gray-600 mt-1 ml-4">
                      <li>service_viewed - სერვისის ნახვა</li>
                      <li>service_searched - სერვისის ძიება</li>
                      <li>booking_created - ჯავშნის შექმნა</li>
                      <li>call_initiated - დარეკვა</li>
                      <li>filter_applied - ფილტრაცია</li>
                      <li>login - დალოგინება</li>
                      <li>sign_up - რეგისტრაცია</li>
                    </ul>
                  </div>
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    გადადი Firebase Console-ში
                    <span>→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          ანალიტიკის მონაცემები ვერ მოიძებნა
        </div>
      )}
    </div>
  );
}

