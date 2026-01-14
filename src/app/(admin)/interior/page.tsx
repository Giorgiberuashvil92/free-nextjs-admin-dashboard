"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiDelete } from "@/lib/api";
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

export default function InteriorListPage() {
  console.log('🚀 [INTERIOR] Component mounted');
  const [rows, setRows] = useState<Store[]>([]);
  const [ownerId, setOwnerId] = useState("");
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
    console.log('🔄 [INTERIOR] load() function called');
    setLoading(true); setErr("");
    try {
      // Use interior endpoint
      const params = new URLSearchParams();
      if (ownerId) {
        params.append('ownerId', ownerId);
      }
      params.append('includeAll', 'true');
      const qs = params.toString() ? `?${params.toString()}` : "";
      const endpoint = `/interior${qs}`;
      console.log('🔍 [INTERIOR] Fetching from:', endpoint);
      const res = await apiGetJson<{ success: boolean; data: Store[] } | Store[]>(endpoint);
      console.log('📦 [INTERIOR] Raw API response:', res);
      const data = Array.isArray(res) ? res : res.data;
      console.log('📊 [INTERIOR] Extracted data:', data);
      console.log('📊 [INTERIOR] Data length:', data?.length || 0);
      const stores = (data || []).map((s)=> ({ ...s, id: s.id || (s as any)._id }));
      console.log('🏪 [INTERIOR] Mapped stores:', stores);
      console.log('🏪 [INTERIOR] Stores count:', stores.length);
      
      // Log store types before filtering
      if (stores.length > 0) {
        console.log('📋 [INTERIOR] Store types found:', stores.map((s: any) => s.type));
      }
      
      // Backend already filters by type, but keep this as a safety check
      const interiorStores = stores.filter((s: any) => s.type === 'ავტომობილის ინტერიერი');
      console.log('✅ [INTERIOR] Filtered interior stores:', interiorStores);
      console.log('✅ [INTERIOR] Interior stores count:', interiorStores.length);
      
      // Load stats for each store
      const storesWithStats = await Promise.all(
        interiorStores.map(async (store) => {
          if (!store.id) return store;
          try {
            const endpoints = [
              `/interior/${store.id}/stats`,
              `/interior/${store.id}/engagement`,
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
                // Continue to next endpoint
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
      console.log('✅ [INTERIOR] Successfully set rows:', storesWithStats.length);
    } catch (e: unknown) {
      console.error('❌ [INTERIOR] Error in load():', e);
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
      setErr(message);
      setRows([]);
    } finally { 
      setLoading(false);
      console.log('🏁 [INTERIOR] load() finished, loading set to false');
    }
  }, [ownerId]);

  const loadEngagement = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoadingEngagement(true);
    try {
      const endpoints = [
        `/interior/${storeId}/engagement`,
        `/interior/${storeId}/likes`,
        `/interior/${storeId}/views`,
        `/interior/${storeId}/calls`,
        `/analytics/store/${storeId}/engagement`,
      ];
      
      let engagementData: StoreEngagement = {};
      
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
          // Continue
        }
      }
      
      if (!engagementData.likes) {
        try {
          const likesRes = await fetch(`${API_BASE}/interior/${storeId}/likes`, { cache: "no-store" });
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            engagementData.likes = Array.isArray(likesData) ? likesData : (likesData.data || likesData.likes || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.views) {
        try {
          const viewsRes = await fetch(`${API_BASE}/interior/${storeId}/views`, { cache: "no-store" });
          if (viewsRes.ok) {
            const viewsData = await viewsRes.json();
            engagementData.views = Array.isArray(viewsData) ? viewsData : (viewsData.data || viewsData.views || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.calls) {
        try {
          const callsRes = await fetch(`${API_BASE}/interior/${storeId}/calls`, { cache: "no-store" });
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
    load();
  };

  const handleDelete = async (store: Store, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!store.id) return;
    
    if (!confirm(`დარწმუნებული ხართ რომ გსურთ "${store.title || store.name}"-ის წაშლა?`)) {
      return;
    }

    try {
      await apiDelete(`/interior/${store.id}`);
      load(); // Reload list
    } catch (error) {
      console.error("Error deleting store:", error);
      alert("მაღაზიის წაშლა ვერ მოხერხდა");
    }
  };

  useEffect(() => { 
    console.log('⚡ [INTERIOR] useEffect triggered, calling load()');
    load(); 
  }, [load]);

  console.log('🎨 [INTERIOR] Rendering component, loading:', loading, 'rows:', rows.length, 'err:', err);

  return (
    <div className="p-6 space-y-6">
      <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px' }}>
        <strong>Debug Info:</strong> Loading: {loading ? 'true' : 'false'}, Rows: {rows.length}, Error: {err || 'none'}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">ავტომობილის ინტერიერი</h1>
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
          <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>
            Apply
          </button>
          <Link className="px-3 py-2 border rounded inline-block" href="/interior/new">
            New interior store
          </Link>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">No interior stores</div>
        ) : (
          rows.map((s) => {
            const img = s.images?.[0];
            const storeName = s.title || s.name || "Unnamed Store";
            return (
              <Link 
                key={s.id} 
                href={`/interior/${s.id}`}
                className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
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
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
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
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{storeName}</h3>
                  {s.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {s.location}
                    </p>
                  )}
                  {s.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {s.phone}
                    </p>
                  )}
                  <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      {s.likesCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {s.viewsCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {s.callsCount || 0}
                    </span>
                  </div>
                  
                  {/* Payment Info */}
                  {(s.paymentStatus || s.nextPaymentDate) && (
                    <div className="pt-2 border-t space-y-1">
                      {s.paymentStatus && (
                        <div className="text-xs">
                          <span className="text-gray-600">სტატუსი: </span>
                          <span className={s.paymentStatus === 'paid' ? 'text-green-600' : s.paymentStatus === 'overdue' ? 'text-red-600' : 'text-yellow-600'}>
                            {s.paymentStatus === 'paid' ? 'გადახდილი' : s.paymentStatus === 'overdue' ? 'გადასახდელია' : 'მოლოდინში'}
                          </span>
                        </div>
                      )}
                      {s.nextPaymentDate && (
                        <div className="text-xs">
                          <span className="text-gray-600">შემდეგი გადახდა: </span>
                          <span className={new Date(s.nextPaymentDate) < new Date() ? 'text-red-600 font-medium' : new Date(s.nextPaymentDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'text-yellow-600' : 'text-gray-700'}>
                            {new Date(s.nextPaymentDate).toLocaleDateString('ka-GE')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewStats(s);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded text-center"
                    >
                      სტატისტიკა
                    </button>
                    <button
                      onClick={(e) => handleAssignOwner(s, e)}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 rounded text-center"
                    >
                      პატრონი
                    </button>
                    <button
                      onClick={(e) => handleDelete(s, e)}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded text-center"
                      title="წაშლა"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Engagement Modal */}
      <Modal isOpen={isOpen} onClose={closeModal}>
        {loadingEngagement ? (
          <div className="p-4 text-center">Loading…</div>
        ) : selectedStore ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{selectedStore.title || selectedStore.name}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{engagement?.likes?.length || 0}</div>
                  <div className="text-sm text-gray-600">Likes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{engagement?.views?.length || 0}</div>
                  <div className="text-sm text-gray-600">Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{engagement?.calls?.length || 0}</div>
                  <div className="text-sm text-gray-600">Calls</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Assign Owner Modal */}
      <AssignStoreOwnerModal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        store={assignOwnerStore || { id: "", name: "", title: "", ownerId: "" } as Store}
        onSuccess={handleAssignOwnerSuccess}
      />
    </div>
  );
}

