'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://marte-backend-production.up.railway.app';

function getClientApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '/api/proxy';
  }
  return BACKEND_URL;
}

interface SubscriptionRow {
  userId: string;
  status: string;
}

interface ActiveVehicleSA {
  id: number;
  vehicleNumber: string;
  techPassportNumber: string;
  addDate?: string;
}

interface SaRegistrationWithOwner {
  saVehicleId: number;
  userId: string;
  vehicleNumber: string;
  techPassportNumber: string;
  addDate?: string;
  owner?: { firstName?: string; lastName?: string } | null;
}

interface RegisteredVehicleWithOwner {
  _id: string;
  userId: string;
  vehicleNumber: string;
  techPassportNumber: string;
  saVehicleId: number;
  addDate?: string;
  isActive: boolean;
  mediaFile: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

function normalizePlate(s: string): string {
  return (s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface AdminDashboardResponse {
  active: ActiveVehicleSA[];
  vehicles: RegisteredVehicleWithOwner[];
  saRegistrations: SaRegistrationWithOwner[];
}

/** პრემიუმად ჩავთვლით აქტიურ საბსქრიფშენს (იგივე ლოგიკა რაც საბსქრიფშენების გვერდზე) */
function isPremiumSubscriptionStatus(status: string): boolean {
  const s = (status || '').toLowerCase().trim();
  return s === 'active' || s === 'trial' || s === 'trialing';
}

export default function FinesVehiclesPage() {
  const [vehicles, setVehicles] = useState<RegisteredVehicleWithOwner[]>([]);
  const [activeSA, setActiveSA] = useState<ActiveVehicleSA[]>([]);
  const [saRegistrations, setSaRegistrations] = useState<SaRegistrationWithOwner[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  /** ნაგულისხმევად: მხოლოდ არა-პრემიუმი + ჯარიმების მონიტორინგი ჩართული (isActive) */
  const [showNonPremiumMonitoredOnly, setShowNonPremiumMonitoredOnly] =
    useState(true);

  const premiumUserIds = useMemo(() => {
    return new Set(
      subscriptions
        .filter((sub) => isPremiumSubscriptionStatus(sub.status))
        .map((sub) => sub.userId)
        .filter(Boolean),
    );
  }, [subscriptions]);

  const nonPremiumMonitoredStats = useMemo(() => {
    const list = vehicles.filter(
      (v) => v.isActive && !premiumUserIds.has(v.userId),
    );
    const userIds = new Set(list.map((v) => v.userId).filter(Boolean));
    return { vehicles: list.length, users: userIds.size };
  }, [vehicles, premiumUserIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const base = getClientApiBase();
      const [data, subRes] = await Promise.all([
        apiGet<AdminDashboardResponse>('/fines/vehicles/admin-dashboard'),
        fetch(`${base}/subscriptions?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ]);

      setVehicles(Array.isArray(data?.vehicles) ? data.vehicles : []);
      setActiveSA(Array.isArray(data?.active) ? data.active : []);
      setSaRegistrations(Array.isArray(data?.saRegistrations) ? data.saRegistrations : []);

      if (subRes.ok) {
        const raw = await subRes.json();
        const subs: SubscriptionRow[] = Array.isArray(raw)
          ? raw
          : (raw?.data || []);
        setSubscriptions(
          subs.map((s) => ({
            userId: String(s.userId ?? ''),
            status: String(s.status ?? ''),
          })),
        );
      } else {
        setSubscriptions([]);
        console.warn('Subscriptions fetch failed:', subRes.status);
      }
    } catch (e: unknown) {
      console.error('Error loading fines admin data:', e);
      setError(
        (e as Error)?.message ||
          'მონაცემების ჩატვირთვა ვერ მოხერხდა',
      );
      setVehicles([]);
      setActiveSA([]);
      setSaRegistrations([]);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, [load]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ka-GE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (showNonPremiumMonitoredOnly) {
      if (!vehicle.isActive) return false;
      if (premiumUserIds.has(vehicle.userId)) return false;
    }
    const searchLower = searchTerm.toLowerCase();
    const ownerName = [vehicle.owner?.firstName, vehicle.owner?.lastName]
      .filter(Boolean)
      .join(' ');
    return (
      (vehicle.vehicleNumber || '').toLowerCase().includes(searchLower) ||
      (vehicle.techPassportNumber || '').toLowerCase().includes(searchLower) ||
      (vehicle.userId || '').toLowerCase().includes(searchLower) ||
      (vehicle.owner?.phone || '').toLowerCase().includes(searchLower) ||
      (ownerName || '').toLowerCase().includes(searchLower) ||
      (vehicle.owner?.email || '').toLowerCase().includes(searchLower)
    );
  });

  const getWhoAddedForSaVehicle = (saVehicleId: number): SaRegistrationWithOwner | null =>
    saRegistrations.find((r) => r.saVehicleId === saVehicleId) ?? null;

  if (loading && activeSA.length === 0 && vehicles.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">იტვირთება...</div>
        </div>
      </div>
    );
  }

  if (error && vehicles.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          ხელახლა ცდა
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            🚨 საპატრულო ჯარიმები - დარეგისტრირებული მანქანები (ბაზა + მფლობელი)
          </h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading
              ? 'იტვირთება...'
              : `${filteredVehicles.length} მანქანა`}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none border rounded-md px-3 py-2 bg-amber-50 border-amber-200">
            <input
              type="checkbox"
              checked={showNonPremiumMonitoredOnly}
              onChange={(e) => setShowNonPremiumMonitoredOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>
              მხოლოდ <strong>არა-პრემიუმი</strong> + ჯარიმების მონიტორინგი ჩართული
            </span>
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ძიება: ნომერი, ტექ. პასპორტი, ტელეფონი, მფლობელი..."
            className="border rounded-md px-3 py-2 text-base w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 განახლება
          </button>
        </div>
      </div>

      {/* SA აქტივი + ვის დაამატა */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          📋 SA აქტივი (სახელმწიფოს სისტემაში რეგისტრირებული) — ვის დაამატა (ბაზიდან)
        </h2>
        {error && (
          <div className="mb-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm">
            {error}
            <button type="button" onClick={load} className="ml-2 underline">ხელახლა ცდა</button>
          </div>
        )}
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SA ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">სახელმწიფო ნომერი</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ტექ. პასპორტი</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SA-ში დამატების თარიღი</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ვის დაამატა (ბაზიდან)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">იტვირთება...</td>
                </tr>
              ) : activeSA.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">SA აქტივში ჩანაწერი არ არის</td>
                </tr>
              ) : (
                activeSA.map((a) => {
                  const reg = getWhoAddedForSaVehicle(a.id);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{a.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{a.vehicleNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{a.techPassportNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(a.addDate || '')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reg ? (
                          (reg.owner?.firstName || reg.owner?.lastName) ? (
                            <span className="font-medium text-gray-900">
                              {[reg.owner.firstName, reg.owner.lastName].filter(Boolean).join(' ')}
                            </span>
                          ) : (
                            <span className="font-mono text-gray-700">{reg.userId}</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">სულ დარეგისტრირებული (ბაზა)</div>
          <div className="text-2xl font-bold text-gray-900">
            {vehicles.length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">ნაპოვნი შედეგი</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredVehicles.length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">ბოლო განახლება</div>
          <div className="text-sm font-medium text-gray-700">
            {new Date().toLocaleTimeString('ka-GE')}
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SA ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                სახელმწიფო ნომერი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ტექ. პასპორტი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                მფლობელი (ტელეფონი / სახელი)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                დამატების თარიღი
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVehicles.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {searchTerm
                    ? 'ძიების შედეგი არ მოიძებნა'
                    : 'დარეგისტრირებული მანქანები არ არის'}
                </td>
              </tr>
            ) : (
              filteredVehicles.map((vehicle) => (
                <tr
                  key={vehicle._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {vehicle.saVehicleId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {vehicle.vehicleNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {vehicle.techPassportNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {vehicle.owner ? (
                        <>
                          <span className="font-medium">{vehicle.owner.phone}</span>
                          {(vehicle.owner.firstName || vehicle.owner.lastName) && (
                            <span className="block text-gray-500 text-xs mt-0.5">
                              {[vehicle.owner.firstName, vehicle.owner.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                          )}
                          {vehicle.owner.email && (
                            <span className="block text-gray-400 text-xs">
                              {vehicle.owner.email}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">
                          userId: {vehicle.userId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {formatDate(vehicle.addDate || vehicle.createdAt)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
