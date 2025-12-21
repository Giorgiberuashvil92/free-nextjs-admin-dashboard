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
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // This would fetch from your analytics endpoint
      // For now, we'll use login history stats
      const loginStats = await apiGetJson<{
        success: boolean;
        data: {
          totalLogins: number;
          loginsToday: number;
          uniqueUsers: number;
          uniqueUsersToday: number;
        };
      }>('/login-history/stats');

      // Mock data for other metrics (you can add real endpoints later)
      const mockData: AnalyticsData = {
        totalUsers: loginStats.data?.uniqueUsers || 0,
        activeUsers: loginStats.data?.uniqueUsersToday || 0,
        totalLogins: loginStats.data?.totalLogins || 0,
        loginsToday: loginStats.data?.loginsToday || 0,
        totalBookings: 0, // Add endpoint later
        bookingsToday: 0, // Add endpoint later
        totalServices: 0, // Add endpoint later
        totalParts: 0, // Add endpoint later
        revenue: 0, // Add endpoint later
        revenueToday: 0, // Add endpoint later
      };

      setAnalytics(mockData);
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">სულ იუზერები</div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.activeUsers} აქტიური დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">დალოგინება</div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">🔐</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalLogins}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.loginsToday} დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">ჯავშნები</div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📅</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalBookings}</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.bookingsToday} დღეს
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">შემოსავალი</div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">💰</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{analytics.revenue}₾</div>
              <div className="text-sm text-green-600 mt-1">
                +{analytics.revenueToday}₾ დღეს
              </div>
            </div>
          </div>

          {/* Firebase Analytics Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">სერვისები</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ სერვისები</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalServices}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ნაწილები</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">სულ ნაწილები</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics.totalParts}</span>
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

