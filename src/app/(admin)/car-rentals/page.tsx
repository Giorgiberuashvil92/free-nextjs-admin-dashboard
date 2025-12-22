"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CarRental = {
  _id?: string;
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  category?: string;
  pricePerDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  images?: string[];
  transmission?: string;
  fuelType?: string;
  seats?: number;
  location?: string;
  available?: boolean;
  rating?: number;
  reviews?: number;
  totalBookings?: number;
  views?: number;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function CarRentalsPage() {
  const [items, setItems] = useState<CarRental[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // დინამიური კატეგორიები
  const categories = ["all", ...availableCategories];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ჩატვირთე filters
        const filtersRes = await fetch(`${API_BASE}/car-rental/filters`, {
          cache: "no-store",
        });
        if (filtersRes.ok) {
          const filtersData = await filtersRes.json();
          setAvailableCategories(filtersData.categories || []);
        }

        // ჩატვირთე მანქანები
        const res = await fetch(`${API_BASE}/car-rental?limit=100&sortBy=date&order=desc&t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        const list: CarRental[] = Array.isArray(data) ? data : data?.data || [];
        setItems(list);
      } catch (err) {
        console.error('Error loading car rentals:', err);
        setItems([]);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('დარწმუნებული ხართ რომ გსურთ წაშლა?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/car-rental/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setItems(items.filter(c => (c._id || c.id) !== id));
        alert('მანქანა წარმატებით წაიშალა');
      } else {
        alert('წაშლა ვერ მოხერხდა');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      alert('წაშლა ვერ მოხერხდა');
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let result = items;
    
    // Filter by search term
    if (term) {
      result = result.filter((c) => 
        [c.brand, c.model, String(c.year), c.location, c.category].some(
          (v: string | number | undefined) => v?.toString().toLowerCase().includes(term)
        )
      );
    }
    
    // Filter by category
    if (categoryFilter !== "all") {
      result = result.filter(c => c.category === categoryFilter);
    }
    
    return result;
  }, [q, items, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter(c => c.available).length,
      totalBookings: items.reduce((sum, c) => sum + (c.totalBookings || 0), 0),
      avgPrice: items.length > 0 
        ? Math.round(items.reduce((sum, c) => sum + (c.pricePerDay || 0), 0) / items.length)
        : 0,
    };
  }, [items]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">🚗 Car Rentals</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "Loading…" : `${filtered.length} results`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brand, model, location…"
            className="border rounded-md px-3 py-2 text-base w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Link 
            href="/car-rentals/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add New Car
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Cars</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Available</div>
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalBookings}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Avg Price/Day</div>
          <div className="text-2xl font-bold text-purple-600">{stats.avgPrice}₾</div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-md transition-colors ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">No cars found</div>
        ) : (
          filtered.map((car) => {
            const img = car.images?.[0];
            const stars = Math.round(Number(car.rating || 0));
            const carId = car._id || car.id;
            
            return (
              <div 
                key={carId} 
                className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="cover" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                    {car.brand?.charAt(0)}{car.model?.charAt(0)}
                  </div>
                )}
                
                <div className="p-4">
                  {/* Title & Category */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {car.brand} {car.model}
                      </h3>
                      <p className="text-sm text-gray-500">{car.year}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {car.category}
                    </span>
                  </div>

                  {/* Specs */}
                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>⚙️</span>
                      <span>{car.transmission}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>⛽</span>
                      <span>{car.fuelType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span>{car.seats}</span>
                    </div>
                  </div>

                  {/* Location & Rating */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">📍 {car.location}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < stars ? "text-yellow-400" : "text-gray-300"}>
                          ★
                        </span>
                      ))}
                      <span className="text-sm text-gray-600 ml-1">({car.reviews || 0})</span>
                    </div>
                  </div>

                  {/* Price & Stats */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">{car.pricePerDay}₾</span>
                      <span className="text-sm text-gray-500">/day</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {car.totalBookings || 0} bookings
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      car.available 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {car.available ? '✓ Available' : '✗ Unavailable'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {car.views || 0} views
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/car-rentals/${carId}`}
                      className="flex-1 bg-blue-600 text-white text-center py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => carId && handleDelete(carId)}
                      className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

