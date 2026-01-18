'use client';

import { useState, useEffect, useCallback } from 'react';
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

