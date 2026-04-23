'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiGetJson } from '@/lib/api';

interface Reminder {
  id: string;
  title: string;
  type: string;
  priority: string;
  reminderDate: string;
  isCompleted: boolean;
  isUrgent: boolean;
}

interface FuelEntry {
  id: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalPrice: number;
  mileage: number;
}

interface Car {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  imageUri?: string;
  lastService?: string;
  nextService?: string;
  mileage?: number;
  color?: string;
  vin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  reminders?: {
    list: Reminder[];
    stats: {
      total: number;
      completed: number;
      pending: number;
      urgent: number;
      upcoming: number;
    };
  };
  fuelEntries?: {
    list: FuelEntry[];
    stats: {
      totalEntries: number;
      lastEntry: FuelEntry | null;
      totalLiters: number;
      totalSpent: number;
    };
  };
}

export default function GarageCarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCar, setExpandedCar] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetJson<{
        success: boolean;
        data: Car[];
        count: number;
      }>('/garage/cars/all');
      const data = res.data || [];
      setCars(data);
    } catch (e: any) {
      console.error('Error loading cars:', e);
      setError('მანქანების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, [load]);

  const filteredCars = cars.filter((car) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      car.make?.toLowerCase().includes(search) ||
      car.model?.toLowerCase().includes(search) ||
      car.plateNumber?.toLowerCase().includes(search) ||
      car.user?.firstName?.toLowerCase().includes(search) ||
      car.user?.lastName?.toLowerCase().includes(search) ||
      car.user?.phone?.includes(search)
    );
  });

  const toggleExpand = (carId: string) => {
    setExpandedCar(expandedCar === carId ? null : carId);
  };

  const analytics = useMemo(() => {
    const uniqueUsers = new Set(
      cars.map((car) => car.user?.id).filter(Boolean) as string[],
    );
    const carsWithUser = cars.filter((car) => !!car.user);
    const activeCars = cars.filter((car) => car.isActive).length;
    const inactiveCars = cars.length - activeCars;
    const carsWithoutUser = cars.length - carsWithUser.length;

    const totalFuelSpent = cars.reduce(
      (sum, car) => sum + (car.fuelEntries?.stats.totalSpent || 0),
      0,
    );
    const totalFuelLiters = cars.reduce(
      (sum, car) => sum + (car.fuelEntries?.stats.totalLiters || 0),
      0,
    );
    const totalFuelEntries = cars.reduce(
      (sum, car) => sum + (car.fuelEntries?.stats.totalEntries || 0),
      0,
    );
    const avgFuelPrice =
      totalFuelLiters > 0 ? totalFuelSpent / totalFuelLiters : 0;

    const totalReminders = cars.reduce(
      (sum, car) => sum + (car.reminders?.stats.total || 0),
      0,
    );
    const completedReminders = cars.reduce(
      (sum, car) => sum + (car.reminders?.stats.completed || 0),
      0,
    );
    const pendingReminders = cars.reduce(
      (sum, car) => sum + (car.reminders?.stats.pending || 0),
      0,
    );
    const urgentReminders = cars.reduce(
      (sum, car) => sum + (car.reminders?.stats.urgent || 0),
      0,
    );
    const reminderCompletionRate =
      totalReminders > 0 ? (completedReminders / totalReminders) * 100 : 0;

    const avgMileage =
      cars.filter((car) => typeof car.mileage === 'number').reduce((sum, car) => sum + (car.mileage || 0), 0) /
      Math.max(
        1,
        cars.filter((car) => typeof car.mileage === 'number').length,
      );

    const makeCounts = cars.reduce<Record<string, number>>((acc, car) => {
      const key = (car.make || 'უცნობი').trim() || 'უცნობი';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topMakes = Object.entries(makeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const userStatsMap = cars.reduce<
      Record<
        string,
        {
          userId: string;
          name: string;
          phone: string;
          cars: number;
          reminders: number;
          urgentReminders: number;
          fuelSpent: number;
        }
      >
    >((acc, car) => {
      if (!car.user?.id) return acc;
      const id = car.user.id;
      const name =
        `${car.user.firstName || ''} ${car.user.lastName || ''}`.trim() ||
        'უცნობი იუზერი';
      if (!acc[id]) {
        acc[id] = {
          userId: id,
          name,
          phone: car.user.phone || '—',
          cars: 0,
          reminders: 0,
          urgentReminders: 0,
          fuelSpent: 0,
        };
      }
      acc[id].cars += 1;
      acc[id].reminders += car.reminders?.stats.total || 0;
      acc[id].urgentReminders += car.reminders?.stats.urgent || 0;
      acc[id].fuelSpent += car.fuelEntries?.stats.totalSpent || 0;
      return acc;
    }, {});

    const topUsers = Object.values(userStatsMap)
      .sort((a, b) => b.cars - a.cars || b.fuelSpent - a.fuelSpent)
      .slice(0, 10);

    return {
      uniqueUsers: uniqueUsers.size,
      carsWithUser: carsWithUser.length,
      carsWithoutUser,
      activeCars,
      inactiveCars,
      totalFuelSpent,
      totalFuelLiters,
      totalFuelEntries,
      avgFuelPrice,
      totalReminders,
      completedReminders,
      pendingReminders,
      urgentReminders,
      reminderCompletionRate,
      avgMileage,
      topMakes,
      topUsers,
    };
  }, [cars]);

  const usersDetailed = useMemo(() => {
    const map = filteredCars.reduce<
      Record<
        string,
        {
          userId: string;
          name: string;
          phone: string;
          email: string;
          cars: Car[];
          reminders: Array<
            Reminder & { carId: string; carLabel: string; plateNumber: string }
          >;
          fuelEntries: Array<
            FuelEntry & { carId: string; carLabel: string; plateNumber: string }
          >;
        }
      >
    >((acc, car) => {
      const userId = car.user?.id || car.userId || '';
      if (!userId) return acc;
      const name =
        `${car.user?.firstName || ''} ${car.user?.lastName || ''}`.trim() ||
        'უცნობი იუზერი';

      if (!acc[userId]) {
        acc[userId] = {
          userId,
          name,
          phone: car.user?.phone || '—',
          email: car.user?.email || '—',
          cars: [],
          reminders: [],
          fuelEntries: [],
        };
      }

      acc[userId].cars.push(car);

      const carLabel = `${car.make || '—'} ${car.model || ''}`.trim();
      const plateNumber = car.plateNumber || '—';
      (car.reminders?.list || []).forEach((r) => {
        acc[userId].reminders.push({
          ...r,
          carId: car.id,
          carLabel,
          plateNumber,
        });
      });
      (car.fuelEntries?.list || []).forEach((f) => {
        acc[userId].fuelEntries.push({
          ...f,
          carId: car.id,
          carLabel,
          plateNumber,
        });
      });

      return acc;
    }, {});

    return Object.values(map)
      .map((u) => {
        const urgentReminders = u.reminders.filter((r) => r.isUrgent).length;
        const pendingReminders = u.reminders.filter((r) => !r.isCompleted).length;
        const completedReminders = u.reminders.filter((r) => r.isCompleted).length;
        const totalFuelSpent = u.fuelEntries.reduce(
          (sum, f) => sum + (f.totalPrice || 0),
          0,
        );
        const totalFuelLiters = u.fuelEntries.reduce(
          (sum, f) => sum + (f.liters || 0),
          0,
        );
        const lastFuelDate =
          u.fuelEntries.length > 0
            ? [...u.fuelEntries].sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )[0]?.date
            : null;

        return {
          ...u,
          urgentReminders,
          pendingReminders,
          completedReminders,
          totalFuelSpent,
          totalFuelLiters,
          lastFuelDate,
        };
      })
      .sort(
        (a, b) =>
          b.cars.length - a.cars.length ||
          b.totalFuelSpent - a.totalFuelSpent ||
          b.reminders.length - a.reminders.length,
      );
  }, [filteredCars]);

  const toggleUserExpand = (userId: string) => {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const totalStats = {
    totalCars: cars.length,
    totalReminders: cars.reduce((sum, car) => sum + (car.reminders?.stats.total || 0), 0),
    pendingReminders: cars.reduce((sum, car) => sum + (car.reminders?.stats.pending || 0), 0),
    urgentReminders: cars.reduce((sum, car) => sum + (car.reminders?.stats.urgent || 0), 0),
    totalFuelEntries: cars.reduce((sum, car) => sum + (car.fuelEntries?.stats.totalEntries || 0), 0),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🚗 იუზერების მანქანები</h1>
        <p className="text-gray-600">სულ: {cars.length} მანქანა</p>
      </div>

      {/* სტატისტიკა */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">სულ მანქანები</div>
          <div className="text-2xl font-bold">{totalStats.totalCars}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">სულ შეხსენებები</div>
          <div className="text-2xl font-bold">{totalStats.totalReminders}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">მომლოდინი</div>
          <div className="text-2xl font-bold text-yellow-600">
            {totalStats.pendingReminders}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">გადაუდებელი</div>
          <div className="text-2xl font-bold text-red-600">
            {totalStats.urgentReminders}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">საწვავის ჩანაწერები</div>
          <div className="text-2xl font-bold">{totalStats.totalFuelEntries}</div>
        </div>
      </div>

      {/* ანალიტიკა */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500 mb-1">იუზერის დაფარვა</div>
          <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
          <div className="text-xs text-gray-600 mt-2">
            იუზერით: {analytics.carsWithUser} | გარეშე: {analytics.carsWithoutUser}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500 mb-1">სტატუსები</div>
          <div className="text-2xl font-bold">{analytics.activeCars}</div>
          <div className="text-xs text-gray-600 mt-2">
            აქტიური | არააქტიური: {analytics.inactiveCars}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500 mb-1">საშ. გარბენი</div>
          <div className="text-2xl font-bold">
            {Number.isFinite(analytics.avgMileage)
              ? analytics.avgMileage.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              : 0}{' '}
            კმ
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3">⛽ Fuel ანალიზი</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">სულ დახარჯული</div>
              <div className="font-bold text-lg">
                {analytics.totalFuelSpent.toFixed(2)} ₾
              </div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">სულ ლიტრები</div>
              <div className="font-bold text-lg">
                {analytics.totalFuelLiters.toFixed(1)} ლ
              </div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">ჩანაწერები</div>
              <div className="font-bold text-lg">{analytics.totalFuelEntries}</div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">საშ. ფასი / ლიტრი</div>
              <div className="font-bold text-lg">
                {analytics.avgFuelPrice.toFixed(2)} ₾
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3">🔔 Reminder ანალიზი</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">სულ შეხსენება</div>
              <div className="font-bold text-lg">{analytics.totalReminders}</div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">დასრულებული</div>
              <div className="font-bold text-lg">{analytics.completedReminders}</div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">მომლოდინი</div>
              <div className="font-bold text-lg">{analytics.pendingReminders}</div>
            </div>
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-gray-500">გადაუდებელი</div>
              <div className="font-bold text-lg text-red-600">
                {analytics.urgentReminders}
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            შესრულების მაჩვენებელი:{' '}
            <span className="font-semibold">
              {analytics.reminderCompletionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3">🏷️ Top ბრენდები</h3>
          {analytics.topMakes.length === 0 ? (
            <div className="text-sm text-gray-500">მონაცემი არ არის</div>
          ) : (
            <div className="space-y-2">
              {analytics.topMakes.map(([make, count]) => (
                <div
                  key={make}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0"
                >
                  <span className="font-medium">{make}</span>
                  <span className="text-gray-600">{count} მანქანა</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold mb-3">👤 Top იუზერები (ანალიზისთვის)</h3>
          {analytics.topUsers.length === 0 ? (
            <div className="text-sm text-gray-500">მონაცემი არ არის</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-2">იუზერი</th>
                    <th className="text-left px-2 py-2">მანქანები</th>
                    <th className="text-left px-2 py-2">შეხსენ.</th>
                    <th className="text-left px-2 py-2">გადაუდ.</th>
                    <th className="text-left px-2 py-2">Fuel ₾</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topUsers.map((u) => (
                    <tr key={u.userId} className="border-t">
                      <td className="px-2 py-2">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.phone}</div>
                      </td>
                      <td className="px-2 py-2">{u.cars}</td>
                      <td className="px-2 py-2">{u.reminders}</td>
                      <td className="px-2 py-2 text-red-600">{u.urgentReminders}</td>
                      <td className="px-2 py-2">{u.fuelSpent.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ძიება */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ძიება მანქანის, ნომრის, იუზერის მიხედვით..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* იუზერების დეტალური ხედვა */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">👤 იუზერების დეტალური ანალიზი</h2>
        {usersDetailed.length === 0 ? (
          <div className="bg-white rounded-lg border p-4 text-sm text-gray-500">
            იუზერები ვერ მოიძებნა
          </div>
        ) : (
          <div className="space-y-4">
            {usersDetailed.map((u) => (
              <div key={u.userId} className="bg-white border rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{u.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        ტელ: {u.phone}
                        {u.email !== '—' ? ` | ${u.email}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleUserExpand(u.userId)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                    >
                      {expandedUser === u.userId ? 'დეტალების დამალვა' : 'ყველა დეტალის ნახვა'}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">მანქანები</div>
                      <div className="font-bold">{u.cars.length}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Reminders</div>
                      <div className="font-bold">{u.reminders.length}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">მომლოდინი</div>
                      <div className="font-bold">{u.pendingReminders}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">გადაუდებელი</div>
                      <div className="font-bold text-red-600">{u.urgentReminders}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Fuel ლიტრი</div>
                      <div className="font-bold">{u.totalFuelLiters.toFixed(1)} ლ</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Fuel ხარჯი</div>
                      <div className="font-bold">{u.totalFuelSpent.toFixed(2)} ₾</div>
                    </div>
                  </div>
                </div>

                {expandedUser === u.userId && (
                  <div className="p-4 bg-gray-50 space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">მანქანები ({u.cars.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm bg-white border rounded">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left border-b">მანქანა</th>
                              <th className="px-3 py-2 text-left border-b">ნომერი</th>
                              <th className="px-3 py-2 text-left border-b">წელი</th>
                              <th className="px-3 py-2 text-left border-b">გარბენი</th>
                              <th className="px-3 py-2 text-left border-b">სტატუსი</th>
                            </tr>
                          </thead>
                          <tbody>
                            {u.cars.map((car) => (
                              <tr key={car.id} className="border-b">
                                <td className="px-3 py-2">
                                  {car.make || '—'} {car.model || ''}
                                </td>
                                <td className="px-3 py-2">{car.plateNumber || '—'}</td>
                                <td className="px-3 py-2">{car.year || '—'}</td>
                                <td className="px-3 py-2">
                                  {car.mileage ? `${car.mileage.toLocaleString()} კმ` : '—'}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      car.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {car.isActive ? 'აქტიური' : 'არააქტიური'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">
                        ყველა reminder ({u.reminders.length})
                      </h3>
                      {u.reminders.length === 0 ? (
                        <div className="text-sm text-gray-500">Reminder-ები არ არის</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm bg-white border rounded">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left border-b">სათაური</th>
                                <th className="px-3 py-2 text-left border-b">მანქანა</th>
                                <th className="px-3 py-2 text-left border-b">ნომერი</th>
                                <th className="px-3 py-2 text-left border-b">თარიღი</th>
                                <th className="px-3 py-2 text-left border-b">სტატუსი</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...u.reminders]
                                .sort(
                                  (a, b) =>
                                    new Date(b.reminderDate).getTime() -
                                    new Date(a.reminderDate).getTime(),
                                )
                                .map((r) => (
                                  <tr key={r.id} className="border-b">
                                    <td className="px-3 py-2">{r.title}</td>
                                    <td className="px-3 py-2">{r.carLabel}</td>
                                    <td className="px-3 py-2">{r.plateNumber}</td>
                                    <td className="px-3 py-2">
                                      {new Date(r.reminderDate).toLocaleDateString('ka-GE')}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={`text-xs px-2 py-1 rounded ${
                                            r.isCompleted
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-yellow-100 text-yellow-700'
                                          }`}
                                        >
                                          {r.isCompleted ? 'დასრულებული' : 'მომლოდინი'}
                                        </span>
                                        {r.isUrgent && (
                                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                                            გადაუდებელი
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">
                        ყველა fuel ჩანაწერი ({u.fuelEntries.length})
                      </h3>
                      {u.fuelEntries.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          Fuel ჩანაწერები არ არის
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm bg-white border rounded">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left border-b">თარიღი</th>
                                <th className="px-3 py-2 text-left border-b">მანქანა</th>
                                <th className="px-3 py-2 text-left border-b">ნომერი</th>
                                <th className="px-3 py-2 text-left border-b">ლიტრი</th>
                                <th className="px-3 py-2 text-left border-b">ფასი/ლ</th>
                                <th className="px-3 py-2 text-left border-b">სულ</th>
                                <th className="px-3 py-2 text-left border-b">გარბენი</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...u.fuelEntries]
                                .sort(
                                  (a, b) =>
                                    new Date(b.date).getTime() -
                                    new Date(a.date).getTime(),
                                )
                                .map((f) => (
                                  <tr key={f.id} className="border-b">
                                    <td className="px-3 py-2">
                                      {new Date(f.date).toLocaleDateString('ka-GE')}
                                    </td>
                                    <td className="px-3 py-2">{f.carLabel}</td>
                                    <td className="px-3 py-2">{f.plateNumber}</td>
                                    <td className="px-3 py-2">{f.liters} ლ</td>
                                    <td className="px-3 py-2">
                                      {f.pricePerLiter.toFixed(2)} ₾
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                      {f.totalPrice.toFixed(2)} ₾
                                    </td>
                                    <td className="px-3 py-2">
                                      {f.mileage.toLocaleString()} კმ
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* მანქანების სია */}
      <div className="space-y-4">
        {filteredCars.map((car) => (
          <div
            key={car.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border"
          >
            {/* მთავარი ინფორმაცია */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {car.imageUri && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={car.imageUri}
                      alt={`${car.make} ${car.model}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-bold">
                        {car.make || '—'} {car.model || ''}
                      </h3>
                      {car.year && (
                        <span className="text-sm text-gray-500">({car.year})</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">ნომერი:</span>{' '}
                        <span className="font-medium">{car.plateNumber || '—'}</span>
                      </div>
                      {car.color && (
                        <div>
                          <span className="text-gray-500">ფერი:</span>{' '}
                          <span className="font-medium">{car.color}</span>
                        </div>
                      )}
                      {car.mileage && (
                        <div>
                          <span className="text-gray-500">გარბენი:</span>{' '}
                          <span className="font-medium">
                            {car.mileage.toLocaleString()} კმ
                          </span>
                        </div>
                      )}
                      {car.vin && (
                        <div>
                          <span className="text-gray-500">VIN:</span>{' '}
                          <span className="font-medium font-mono text-xs">
                            {car.vin}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(car.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {expandedCar === car.id ? 'დამალვა' : 'დეტალები'}
                </button>
              </div>

              {/* იუზერის ინფორმაცია */}
              {car.user && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">იუზერი:</span>{' '}
                      <span className="font-medium">
                        {car.user.firstName || ''} {car.user.lastName || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">ტელეფონი:</span>{' '}
                      <a 
                        href={`tel:${car.user.phone}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {car.user.phone}
                      </a>
                    </div>
                    {car.user.email && (
                      <div>
                        <span className="text-gray-500">Email:</span>{' '}
                        <a 
                          href={`mailto:${car.user.email}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {car.user.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* სტატისტიკა */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <div className="text-xs text-gray-600">შეხსენებები</div>
                  <div className="text-lg font-bold">
                    {car.reminders?.stats.total || 0} ({car.reminders?.stats.pending || 0}{' '}
                    მომლოდინი)
                  </div>
                  {(car.reminders?.stats.urgent || 0) > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                      ⚠️ {car?.reminders?.stats.urgent} გადაუდებელი
                    </div>
                  )}
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-100">
                  <div className="text-xs text-gray-600">საწვავის ჩანაწერები</div>
                  <div className="text-lg font-bold">
                    {car.fuelEntries?.stats.totalEntries || 0}
                  </div>
                  {car.fuelEntries?.stats.lastEntry && (
                    <div className="text-xs text-gray-600 mt-1">
                      ბოლო: {new Date(car.fuelEntries.stats.lastEntry.date).toLocaleDateString('ka-GE')}
                    </div>
                  )}
                </div>
                <div className="bg-purple-50 p-3 rounded border border-purple-100">
                  <div className="text-xs text-gray-600">სულ ლიტრები</div>
                  <div className="text-lg font-bold">
                    {(car.fuelEntries?.stats.totalLiters || 0).toFixed(1)} ლ
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                  <div className="text-xs text-gray-600">სულ დახარჯული</div>
                  <div className="text-lg font-bold">
                    {(car.fuelEntries?.stats.totalSpent || 0).toFixed(2)} ₾
                  </div>
                </div>
              </div>
            </div>

            {/* დეტალური ინფორმაცია */}
            {expandedCar === car.id && (
              <div className="p-4 bg-gray-50">
                {/* შეხსენებები */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">შეხსენებები</h4>
                  {car.reminders && car.reminders.list.length > 0 ? (
                    <div className="space-y-2">
                      {car.reminders.list.map((reminder) => (
                        <div
                          key={reminder.id}
                          className={`p-3 rounded border-l-4 ${
                            reminder.isUrgent
                              ? 'bg-red-50 border-red-500'
                              : reminder.isCompleted
                                ? 'bg-gray-50 border-gray-300'
                                : 'bg-yellow-50 border-yellow-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{reminder.title}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                ტიპი: {reminder.type} | პრიორიტეტი:{' '}
                                {reminder.priority}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                თარიღი:{' '}
                                {new Date(reminder.reminderDate).toLocaleDateString(
                                  'ka-GE',
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {reminder.isCompleted && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  დასრულებული
                                </span>
                              )}
                              {reminder.isUrgent && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  გადაუდებელი
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      შეხსენებები არ არის
                    </div>
                  )}
                </div>

                {/* საწვავის ჩანაწერები */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">
                    საწვავის ჩანაწერები
                  </h4>
                  {car.fuelEntries && car.fuelEntries.list.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm bg-white border rounded">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left border-b">თარიღი</th>
                            <th className="px-3 py-2 text-left border-b">ლიტრები</th>
                            <th className="px-3 py-2 text-left border-b">ფასი/ლ</th>
                            <th className="px-3 py-2 text-left border-b">სულ</th>
                            <th className="px-3 py-2 text-left border-b">გარბენი</th>
                          </tr>
                        </thead>
                        <tbody>
                          {car.fuelEntries.list.slice(0, 10).map((entry) => (
                            <tr key={entry.id} className="border-b">
                              <td className="px-3 py-2">
                                {new Date(entry.date).toLocaleDateString('ka-GE')}
                              </td>
                              <td className="px-3 py-2">{entry.liters} ლ</td>
                              <td className="px-3 py-2">
                                {entry.pricePerLiter.toFixed(2)} ₾
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {entry.totalPrice.toFixed(2)} ₾
                              </td>
                              <td className="px-3 py-2">
                                {entry.mileage.toLocaleString()} კმ
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {car.fuelEntries.list.length > 10 && (
                        <div className="text-sm text-gray-500 mt-2">
                          და სხვა {car.fuelEntries.list.length - 10} ჩანაწერი...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      საწვავის ჩანაწერები არ არის
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCars.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm
            ? 'ძიების შედეგები ვერ მოიძებნა'
            : 'მანქანები ვერ მოიძებნა'}
        </div>
      )}
    </div>
  );
}

