"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiPatch, apiDelete } from "@/lib/api";

type EcommerceProduct = {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  category: string;
  brand?: string;
  sku?: string;
  stock?: number;
  inStock?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  views?: number;
  sales?: number;
  createdAt?: string;
  updatedAt?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function EcommerceProductsPage() {
  const [rows, setRows] = useState<EcommerceProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (showOnlyActive) {
        params.append('isActive', 'true');
      }
      if (showOnlyFeatured) {
        params.append('isFeatured', 'true');
      }
      params.append('limit', '100');
      
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiGetJson<{ success: boolean; data: EcommerceProduct[] } | EcommerceProduct[]>(`/ecommerce-products${qs}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      const products = (data || []).map((p) => ({ ...p, id: p.id || (p as any)._id }));
      setRows(products);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setErr(error.message || 'პროდუქტების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, showOnlyActive, showOnlyFeatured]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ პროდუქტის წაშლა?')) {
      return;
    }
    try {
      await apiDelete(`/ecommerce-products/${id}`);
      load();
    } catch (error: any) {
      alert(error.message || 'პროდუქტის წაშლა ვერ მოხერხდა');
    }
  };

  const handleToggleActive = async (product: EcommerceProduct) => {
    try {
      await apiPatch(`/ecommerce-products/${product.id}`, {
        isActive: !product.isActive,
      });
      load();
    } catch (error: any) {
      alert(error.message || 'პროდუქტის განახლება ვერ მოხერხდა');
    }
  };

  const handleToggleFeatured = async (product: EcommerceProduct) => {
    try {
      await apiPatch(`/ecommerce-products/${product.id}`, {
        isFeatured: !product.isFeatured,
      });
      load();
    } catch (error: any) {
      alert(error.message || 'პროდუქტის განახლება ვერ მოხერხდა');
    }
  };

  const categories = Array.from(new Set(rows.map(p => p.category).filter(Boolean)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Ecommerce Shop - პროდუქტები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "Loading…" : `${rows.length} results`}
          </span>
        </div>
        <Link className="px-3 py-2 bg-black text-white rounded inline-block" href="/ecommerce-products/new">
          ახალი პროდუქტი
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600 mb-1">ძიება</div>
          <input
            className="border rounded px-3 py-2 w-64"
            placeholder="ძიება..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">კატეგორია</div>
          <select
            className="border rounded px-3 py-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">ყველა</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showOnlyActive"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showOnlyActive" className="text-sm text-gray-700 font-medium cursor-pointer">
            მხოლოდ აქტიური
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showOnlyFeatured"
            checked={showOnlyFeatured}
            onChange={(e) => setShowOnlyFeatured(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showOnlyFeatured" className="text-sm text-gray-700 font-medium cursor-pointer">
            მხოლოდ გამორჩეული
          </label>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4">იტვირთება...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg">პროდუქტები არ მოიძებნა</p>
          </div>
        ) : (
          rows.map((p) => {
            const img = p.images?.[0];
            const discount = p.originalPrice && p.originalPrice > p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            
            return (
              <div
                key={p.id}
                className={`group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                  p.isFeatured 
                    ? 'ring-2 ring-yellow-400 ring-opacity-50 shadow-xl' 
                    : 'border border-gray-100'
                }`}
              >
                {/* Image Section */}
                <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Overlay gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                    {p.isFeatured && (
                      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg backdrop-blur-sm">
                        ⭐ გამორჩეული
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg backdrop-blur-sm animate-pulse">
                        -{discount}%
                      </div>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm ${
                      p.isActive 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                    }`}>
                      {p.isActive ? '✓ აქტიური' : '✗ არააქტიური'}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 space-y-3">
                  {/* Category & Brand */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.category && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {p.category}
                      </span>
                    )}
                    {p.brand && (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        {p.brand}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-gray-900">{p.price}₾</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-sm text-gray-400 line-through">{p.originalPrice}₾</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="font-medium">{p.stock || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="font-medium">{p.sales || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="font-medium">{p.views || 0}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3">
                    <Link
                      href={`/ecommerce-products/${p.id}`}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg text-center"
                    >
                      რედაქტირება
                    </Link>
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                        p.isActive
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                      }`}
                      title={p.isActive ? 'დეაქტივაცია' : 'აქტივაცია'}
                    >
                      {p.isActive ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() => handleToggleFeatured(p)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                        p.isFeatured
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white hover:from-yellow-500 hover:to-yellow-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600'
                      }`}
                      title={p.isFeatured ? 'გამორჩეულიდან ამოღება' : 'გამორჩეულად მონიშვნა'}
                    >
                      ⭐
                    </button>
                    <button
                      onClick={() => handleDelete(p.id!)}
                      className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      title="წაშლა"
                    >
                      🗑
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
