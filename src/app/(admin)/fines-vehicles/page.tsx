'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

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

export default function FinesVehiclesPage() {
  const [vehicles, setVehicles] = useState<RegisteredVehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<RegisteredVehicleWithOwner[]>(
        '/fines/vehicles/registered-with-owners',
      );
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('Error loading registered vehicles:', e);
      setError(
        (e as Error)?.message ||
          'დარეგისტრირებული მანქანების ჩატვირთვა ვერ მოხერხდა',
      );
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">იტვირთება...</div>
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="flex items-center gap-3">
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
