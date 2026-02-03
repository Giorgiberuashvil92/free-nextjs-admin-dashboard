"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { apiGetJson } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { AssignStoreOwnerModal } from "@/components/AssignStoreOwnerModal";

type Store = { 
  id?: string; 
  _id?: string; 
  name?: string; 
  title?: string;
  ownerId?: string; 
  address?: string; 
  phone?: string; 
  images?: string[];
  type?: string;
  location?: string;
  status?: 'pending' | 'active' | 'inactive';
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  totalPaid?: number;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentPeriod?: string;
  createdAt?: string;
  likesCount?: number;
  viewsCount?: number;
  callsCount?: number;
  isVip?: boolean;
};

type EngagementUser = {
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  timestamp?: string;
};

type StoreEngagement = {
  likes?: EngagementUser[];
  views?: EngagementUser[];
  calls?: EngagementUser[];
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function StoresListPage() {
  const [rows, setRows] = useState<Store[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [showOnlyVip, setShowOnlyVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [engagement, setEngagement] = useState<StoreEngagement | null>(null);
  const [loadingEngagement, setLoadingEngagement] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  
  // Assign Owner Modal
  const [assignOwnerStore, setAssignOwnerStore] = useState<Store | null>(null);
  const { isOpen: isAssignModalOpen, openModal: openAssignModal, closeModal: closeAssignModal } = useModal();

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (ownerId) {
        params.append('ownerId', ownerId);
      }
      params.append('includeAll', 'true'); 
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiGetJson<{ success: boolean; data: Store[] } | Store[]>(`/stores${qs}`);
      console.log('🔍 API Response:', res);
      const data = Array.isArray(res) ? res : res.data;
      console.log('📦 Parsed Data:', data);
      const stores = (data || []).map((s)=> ({ ...s, id: s.id || (s as any)._id }));
      console.log('🏪 Stores after mapping:', stores);
      console.log('⭐ VIP Stores:', stores.filter(s => s.isVip));
      console.log('🏬 Type "მაღაზია" stores:', stores.filter(s => s.type === 'მაღაზია'));
      
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          if (!store.id) return store;
          try {
            // ვცდით სხვადასხვა endpoint-ებს
            const endpoints = [
              `/stores/${store.id}/stats`,
              `/stores/${store.id}/engagement`,
              `/analytics/store/${store.id}`,
            ];
            
            let stats: any = {};
            for (const endpoint of endpoints) {
              try {
                const statsRes = await fetch(`${API_BASE}${endpoint}`, {
                  headers: { "Content-Type": "application/json" },
                  cache: "no-store",
                });
                if (statsRes.ok) {
                  const statsData = await statsRes.json();
                  stats = statsData.data || statsData || {};
                  if (stats.likesCount !== undefined || stats.viewsCount !== undefined) break;
                }
              } catch (e) {
                // გავაგრძელოთ შემდეგ endpoint-ზე
              }
            }
            
            return {
              ...store,
              likesCount: stats.likesCount || stats.likes || 0,
              viewsCount: stats.viewsCount || stats.views || 0,
              callsCount: stats.callsCount || stats.calls || 0,
            };
          } catch (e) {
            return store;
          }
        })
      );
      
      setRows(storesWithStats);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
      setErr(message);
      setRows([]);
    } finally { setLoading(false); }
  }, [ownerId]);

  const loadEngagement = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoadingEngagement(true);
    try {
      const endpoints = [
        `/stores/${storeId}/engagement`,
        `/stores/${storeId}/likes`,
        `/stores/${storeId}/views`,
        `/stores/${storeId}/calls`,
        `/analytics/store/${storeId}/engagement`,
      ];
      
      let engagementData: StoreEngagement = {};
      
      // ვცდით სხვადასხვა endpoint-ებს
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const result = data.data || data;
            if (result.likes || result.views || result.calls) {
              engagementData = result;
              break;
            }
          }
        } catch (e) {
          // გავაგრძელოთ
        }
      }
      
      // თუ ცალ-ცალკე endpoint-ები არის
      if (!engagementData.likes) {
        try {
          const likesRes = await fetch(`${API_BASE}/stores/${storeId}/likes`, { cache: "no-store" });
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            engagementData.likes = Array.isArray(likesData) ? likesData : (likesData.data || likesData.likes || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.views) {
        try {
          const viewsRes = await fetch(`${API_BASE}/stores/${storeId}/views`, { cache: "no-store" });
          if (viewsRes.ok) {
            const viewsData = await viewsRes.json();
            engagementData.views = Array.isArray(viewsData) ? viewsData : (viewsData.data || viewsData.views || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.calls) {
        try {
          const callsRes = await fetch(`${API_BASE}/stores/${storeId}/calls`, { cache: "no-store" });
          if (callsRes.ok) {
            const callsData = await callsRes.json();
            engagementData.calls = Array.isArray(callsData) ? callsData : (callsData.data || callsData.calls || []);
          }
        } catch (e) {}
      }
      
      setEngagement(engagementData);
    } catch (e) {
      console.error("Error loading engagement:", e);
      setEngagement({});
    } finally {
      setLoadingEngagement(false);
    }
  }, []);

  const handleViewStats = (store: Store) => {
    setSelectedStore(store);
    setEngagement(null);
    openModal();
    if (store.id) {
      loadEngagement(store.id);
    }
  };

  const handleAssignOwner = (store: Store, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAssignOwnerStore(store);
    openAssignModal();
  };

  const handleAssignOwnerSuccess = () => {
    load(); // Reload stores list
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">მაღაზიები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "Loading…" : `${rows.length} results`}
          </span>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <div className="text-sm text-gray-600">Filter by OwnerId</div>
            <input 
              className="border rounded px-3 py-2 w-64" 
              placeholder="ownerId" 
              value={ownerId} 
              onChange={(e)=>setOwnerId(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyVip"
              checked={showOnlyVip}
              onChange={(e) => setShowOnlyVip(e.target.checked)}
              className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
            />
            <label htmlFor="showOnlyVip" className="text-sm text-gray-700 font-medium cursor-pointer">
              ⭐ მხოლოდ VIP
            </label>
          </div>
          <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>
            Apply
          </button>
          <Link className="px-3 py-2 border rounded inline-block" href="/stores/new">
            New store
          </Link>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading…</div>
        ) : (() => {
          // Filter and sort: VIP first, then filter by showOnlyVip
          let filteredRows = rows;
          if (showOnlyVip) {
            filteredRows = rows.filter(s => s.isVip === true);
          }
          // Sort: VIP first
          filteredRows = [...filteredRows].sort((a, b) => {
            if (a.isVip && !b.isVip) return -1;
            if (!a.isVip && b.isVip) return 1;
            return 0;
          });
          
          if (filteredRows.length === 0) {
            return <div className="col-span-full text-center text-gray-500 py-10">No stores</div>;
          }
          
          return filteredRows.map((s) => {
            const img = s.images?.[0];
            const storeName = s.title || s.name || "Unnamed Store";
            return (
              <Link 
                key={s.id} 
                href={`/stores/${s.id}`}
                className={`border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${
                  s.isVip ? 'border-yellow-400 border-2 shadow-lg ring-2 ring-yellow-200' : ''
                }`}
              >
                <div className="relative h-48 bg-gray-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={img} 
                      alt={storeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {s.type && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {s.type}
                    </div>
                  )}
                  {/* VIP Badge */}
                  {s.isVip && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg z-10">
                      ⭐ VIP
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                    {s.status === 'active' && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                        აქტიური
                      </span>
                    )}
                    {s.status === 'pending' && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium">
                        მოლოდინში
                      </span>
                    )}
                    {s.status === 'inactive' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                        არააქტიური
                      </span>
                    )}
                    {!s.status && (
                      <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-medium">
                        მოლოდინში
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{storeName}</h3>
                  {s.location && (
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {s.location}
                    </div>
                  )}
                  {s.address && (
                    <div className="text-sm text-gray-500 mb-2">{s.address}</div>
                  )}
                  {s.phone && (
                    <div className="text-sm text-gray-600 mb-2">{s.phone}</div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-400">
                      {s.images?.length || 0} სურათი
                    </div>
                    <div className="text-xs text-gray-400">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                  
                  {/* სტატისტიკა */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-red-500">
                        <span>❤️</span>
                        <span>{s.likesCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-500">
                        <span>👁️</span>
                        <span>{s.viewsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <span>📞</span>
                        <span>{s.callsCount || 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewStats(s);
                      }}
                      className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                    >
                      დეტალები
                    </button>
                  </div>
                  
                  {/* Status Change Buttons */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">სტატუსი:</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (s.status === 'pending' || !s.status) return;
                          try {
                            const res = await fetch(`${API_BASE}/stores/${s.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'pending' }),
                            });
                            if (res.ok) {
                              setRows(rows.map(store => 
                                store.id === s.id ? { ...store, status: 'pending' } : store
                              ));
                            } else {
                              alert('სტატუსის შეცვლა ვერ მოხერხდა');
                            }
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('სტატუსის შეცვლა ვერ მოხერხდა');
                          }
                        }}
                        className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
                          s.status === 'pending' || !s.status
                            ? 'bg-yellow-500 text-white'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        მოლოდინში
                      </button>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (s.status === 'active') return;
                          try {
                            const res = await fetch(`${API_BASE}/stores/${s.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'active' }),
                            });
                            if (res.ok) {
                              setRows(rows.map(store => 
                                store.id === s.id ? { ...store, status: 'active' } : store
                              ));
                            } else {
                              alert('სტატუსის შეცვლა ვერ მოხერხდა');
                            }
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('სტატუსის შეცვლა ვერ მოხერხდა');
                          }
                        }}
                        className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
                          s.status === 'active'
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        აქტიური
                      </button>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (s.status === 'inactive') return;
                          try {
                            const res = await fetch(`${API_BASE}/stores/${s.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'inactive' }),
                            });
                            if (res.ok) {
                              setRows(rows.map(store => 
                                store.id === s.id ? { ...store, status: 'inactive' } : store
                              ));
                            } else {
                              alert('სტატუსის შეცვლა ვერ მოხერხდა');
                            }
                          } catch (error) {
                            console.error('Error updating status:', error);
                            alert('სტატუსის შეცვლა ვერ მოხერხდა');
                          }
                        }}
                        className={`flex-1 text-xs px-2 py-1.5 rounded font-medium transition-colors ${
                          s.status === 'inactive'
                            ? 'bg-red-500 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        არააქტიური
                      </button>
                    </div>
                  </div>

                  {/* VIP Toggle - გადახდის ინფორმაციის ზემოთ, ყველა მაღაზიისთვის */}
                  {(
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">VIP სტატუსი:</span>
                          <span className={`ml-2 font-semibold ${s.isVip ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {s.isVip ? '⭐ VIP' : 'არ არის VIP'}
                          </span>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!s.id) return;
                            
                            const newVipStatus = !s.isVip;
                            // Optimistic update
                            setRows(rows.map(store => 
                              store.id === s.id ? { ...store, isVip: newVipStatus } : store
                            ));
                            
                            try {
                              const res = await fetch(`${API_BASE}/stores/${s.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isVip: newVipStatus }),
                              });
                              
                              if (res.ok) {
                                const updated = await res.json();
                                // Update with server response
                                setRows(rows.map(store => 
                                  store.id === s.id ? { ...store, isVip: updated?.data?.isVip ?? newVipStatus } : store
                                ));
                              } else {
                                // Revert on error
                                setRows(rows.map(store => 
                                  store.id === s.id ? { ...store, isVip: s.isVip } : store
                                ));
                                const errorData = await res.json().catch(() => ({}));
                                alert(errorData.message || 'VIP სტატუსის შეცვლა ვერ მოხერხდა');
                              }
                            } catch (error) {
                              // Revert on error
                              setRows(rows.map(store => 
                                store.id === s.id ? { ...store, isVip: s.isVip } : store
                              ));
                              console.error('Error updating VIP status:', error);
                              alert('VIP სტატუსის შეცვლა ვერ მოხერხდა');
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                            s.isVip
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          {s.isVip ? 'VIP-ის მოხსნა' : 'VIP-ად დანიშვნა'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment Information */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">გადახდის ინფორმაცია:</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">ბოლო გადახდა:</span>
                        <span className="font-medium">
                          {s.lastPaymentDate 
                            ? new Date(s.lastPaymentDate).toLocaleDateString('ka-GE')
                            : "არ არის"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">შემდეგი გადახდა:</span>
                        <span className={`font-medium ${
                          (() => {
                            const nextDate = s.nextPaymentDate 
                              ? new Date(s.nextPaymentDate)
                              : s.createdAt 
                              ? (() => {
                                  const created = new Date(s.createdAt);
                                  created.setMonth(created.getMonth() + 1);
                                  return created;
                                })()
                              : null;
                            if (!nextDate) return '';
                            if (nextDate < new Date()) return 'text-red-600';
                            if (nextDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) return 'text-yellow-600';
                            return '';
                          })()
                        }`}>
                          {s.nextPaymentDate 
                            ? new Date(s.nextPaymentDate).toLocaleDateString('ka-GE')
                            : s.createdAt 
                            ? (() => {
                                const created = new Date(s.createdAt);
                                created.setMonth(created.getMonth() + 1);
                                return created.toLocaleDateString('ka-GE');
                              })()
                            : "არ არის"}
                        </span>
                      </div>
                      {(() => {
                        const nextDate = s.nextPaymentDate 
                          ? new Date(s.nextPaymentDate)
                          : s.createdAt 
                          ? (() => {
                              const created = new Date(s.createdAt);
                              created.setMonth(created.getMonth() + 1);
                              return created;
                            })()
                          : null;
                        if (!nextDate) return null;
                        if (nextDate < new Date()) {
                          return <div className="text-xs text-red-600 font-semibold">⚠️ გადასახდელია</div>;
                        }
                        if (nextDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && nextDate >= new Date()) {
                          return <div className="text-xs text-yellow-600">⚠️ მალე ვადა გავა</div>;
                        }
                        return null;
                      })()}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-gray-500">სულ გადახდილი:</span>
                        <span className="font-semibold">{s.totalPaid || 0} ₾</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">გადახდის სტატუსი:</span>
                        <span>
                          {s.paymentStatus === 'paid' && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                              გადახდილი
                            </span>
                          )}
                          {s.paymentStatus === 'pending' && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                              მოლოდინში
                            </span>
                          )}
                          {s.paymentStatus === 'overdue' && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
                              ვადაგასული
                            </span>
                          )}
                          {!s.paymentStatus && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                              მოლოდინში
                            </span>
                          )}
                        </span>
                      </div>
                      {s.paymentAmount && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">გადახდის თანხა:</span>
                          <span className="font-medium">
                            {s.paymentAmount} ₾ {s.paymentPeriod === 'monthly' ? '/თვე' : s.paymentPeriod === 'yearly' ? '/წელი' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Info & Assign Button */}
                  <div className="mt-3 pt-3 border-t">
                    {s.ownerId ? (
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">პატრონი:</span> {s.ownerId}
                        </div>
                        <button
                          onClick={(e) => handleAssignOwner(s, e)}
                          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                        >
                          შეცვლა
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleAssignOwner(s, e)}
                        className="w-full text-xs text-brand-500 hover:text-brand-600 font-medium py-1"
                      >
                        + პატრონის მინიჭება
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          });
        })()}
      </div>

      {/* Assign Owner Modal */}
      {assignOwnerStore && (
        <AssignStoreOwnerModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            closeAssignModal();
            setAssignOwnerStore(null);
          }}
          store={assignOwnerStore}
          onSuccess={handleAssignOwnerSuccess}
        />
      )}

      {/* სტატისტიკის მოდალი */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-4xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {selectedStore?.title || selectedStore?.name || "მაღაზიის"} სტატისტიკა
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ლაიქები, ნახვები და დარეკვის ღილაკის დაჭერები
            </p>
          </div>

          {selectedStore && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-600 dark:text-red-400 mb-1">ლაიქები</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {selectedStore.likesCount || 0}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">ნახვები</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {selectedStore.viewsCount || 0}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">დარეკვები</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {selectedStore.callsCount || 0}
                </div>
              </div>
            </div>
          )}

          {loadingEngagement ? (
            <div className="text-center py-8 text-gray-500">იტვირთება...</div>
          ) : engagement ? (
            <div className="space-y-6">
              {/* ლაიქები */}
              {engagement.likes && engagement.likes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    ვინ დაალაიქა ({engagement.likes.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {engagement.likes.map((like, idx) => (
                      <div
                        key={`${like.userId}-${idx}`}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {like.userName || like.userId?.slice(0, 8) || "უცნობი"}
                        </div>
                        {like.userPhone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {like.userPhone}
                          </div>
                        )}
                        {like.userEmail && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {like.userEmail}
                          </div>
                        )}
                        {like.timestamp && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(like.timestamp).toLocaleString("ka-GE")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ნახვები */}
              {engagement.views && engagement.views.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    ვინ ნახა ({engagement.views.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {engagement.views.map((view, idx) => (
                      <div
                        key={`${view.userId}-${idx}`}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {view.userName || view.userId?.slice(0, 8) || "უცნობი"}
                        </div>
                        {view.userPhone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {view.userPhone}
                          </div>
                        )}
                        {view.userEmail && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {view.userEmail}
                          </div>
                        )}
                        {view.timestamp && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(view.timestamp).toLocaleString("ka-GE")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* დარეკვები */}
              {engagement.calls && engagement.calls.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    ვინ დააჭირა დარეკვის ღილაკს ({engagement.calls.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {engagement.calls.map((call, idx) => (
                      <div
                        key={`${call.userId}-${idx}`}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {call.userName || call.userId?.slice(0, 8) || "უცნობი"}
                        </div>
                        {call.userPhone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {call.userPhone}
                          </div>
                        )}
                        {call.userEmail && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {call.userEmail}
                          </div>
                        )}
                        {call.timestamp && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(call.timestamp).toLocaleString("ka-GE")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!engagement.likes || engagement.likes.length === 0) &&
                (!engagement.views || engagement.views.length === 0) &&
                (!engagement.calls || engagement.calls.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    სტატისტიკა არ მოიძებნა
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              სტატისტიკა არ მოიძებნა
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              დახურვა
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


