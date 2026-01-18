"use client";
import React, { useEffect, useMemo, useState } from "react";

type User = {
  id?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Car = {
  id?: string;
  _id?: string;
  userId?: string;
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  imageUri?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: User | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function GaragePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/garage/cars/all?t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        const response = await res.json();
        // Response has structure: { success, message, data: [...], count }
        const list: Car[] = Array.isArray(response) ? response : response?.data || [];
        setCars(list);
      } catch (err) {
        console.error('Error loading garage cars:', err);
        setCars([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    const onFocus = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cars;
    return cars.filter((car) => 
      [
        car.make,
        car.model,
        String(car.year),
        car.plateNumber,
        car.userId,
        car.user?.firstName,
        car.user?.lastName,
        car.user?.phone,
        car.user?.email,
      ].some((v: string | number | undefined) => 
        v?.toString().toLowerCase().includes(term)
      )
    );
  }, [q, cars]);

  const stats = useMemo(() => {
    return {
      total: cars.length,
      withUsers: cars.filter(c => c.user).length,
      withoutUsers: cars.filter(c => !c.user).length,
    };
  }, [cars]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">🚗 გარაჟი - მანქანები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "იტვირთება..." : `${filtered.length} შედეგი`}
          </span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძიება: ბრენდი, მოდელი, იუზერი, ტელეფონი..."
          className="border rounded-md px-3 py-2 text-base w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">სულ მანქანა</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">იუზერით</div>
          <div className="text-2xl font-bold text-green-600">{stats.withUsers}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">იუზერის გარეშე</div>
          <div className="text-2xl font-bold text-orange-600">{stats.withoutUsers}</div>
        </div>
      </div>

      {/* Cars Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 py-10">იტვირთება...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-10">მანქანები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">სურათი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">მანქანა</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">წელი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ნომერი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">იუზერი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ტელეფონი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ელფოსტა</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((car) => {
                  const carId = car.id || car._id;
                  const user = car.user;
                  
                  return (
                    <tr key={carId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {car.imageUri ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={car.imageUri} 
                            alt={`${car.make} ${car.model}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {car.make || '—'} {car.model || ''}
                        </div>
                        {car.userId && (
                          <div className="text-xs text-gray-400 mt-1">ID: {car.userId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {car.year || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {car.plateNumber || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {user ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {user.firstName || ''} {user.lastName ? user.lastName : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.phone ? (
                          <a 
                            href={`tel:${user.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.phone}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.email ? (
                          <a 
                            href={`mailto:${user.email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.email}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {car.isActive !== undefined ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            car.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {car.isActive ? 'აქტიური' : 'არააქტიური'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
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
    </div>
  );
}

