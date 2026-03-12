"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiGetJson, apiPost, apiDelete, apiPatch } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type Dismantler = {
  id?: string;
  _id?: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  name?: string;
  phone?: string;
  location?: string;
  description?: string;
  photos?: string[];
  createdAt?: string;
  isVip?: boolean;
};

type DismantlerStats = {
  likesCount: number;
  viewsCount: number;
  callsCount: number;
};

type EngagementItem = {
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  timestamp: number;
};

type EngagementData = {
  likes: EngagementItem[];
  views: EngagementItem[];
  calls: EngagementItem[];
};

const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "ახალქალაქი", "ოზურგეთი", "ტყიბული", "სხვა"];
const PAGE_SIZE = 20;

export default function DismantlersAdminPage() {
  const [dismantlers, setDismantlers] = useState<Dismantler[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Dismantler | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    brand: "",
    model: "",
    yearFrom: "",
    yearTo: "",
    location: "",
    description: "",
    photos: [] as string[],
    isVip: false,
  });

  // Stats and Engagement
  const [stats, setStats] = useState<Record<string, DismantlerStats>>({});
  const [engagement, setEngagement] = useState<Record<string, EngagementData>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});
  const [showEngagementModal, setShowEngagementModal] = useState<string | null>(null);
  const [engagementTab, setEngagementTab] = useState<'views' | 'likes' | 'calls'>('views');
  const loadingStatsRef = useRef<Set<string>>(new Set());

  const loadStats = useCallback(async (dismantlerId: string) => {
    // შევამოწმოთ ref-ით რომ არ იტვირთოს ორჯერ
    if (loadingStatsRef.current.has(dismantlerId)) return;
    
    loadingStatsRef.current.add(dismantlerId);
    setLoadingStats(prev => ({ ...prev, [dismantlerId]: true }));
    
    try {
      const res = await apiGetJson<{ success: boolean; data: DismantlerStats }>(`/dismantlers/${dismantlerId}/stats`);
      if (res.success && res.data) {
        setStats(prev => ({ ...prev, [dismantlerId]: res.data }));
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoadingStats(prev => ({ ...prev, [dismantlerId]: false }));
      loadingStatsRef.current.delete(dismantlerId);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPage(1);
    setHasMore(true);
    try {
      const res = await apiGetJson<{ success: boolean; data: Dismantler[] } | Dismantler[]>(
        `/dismantlers?page=1&limit=${PAGE_SIZE}`
      );
      const data = Array.isArray(res) ? res : (res as { data?: Dismantler[] }).data;
      const dismantlersList = (data || []).map((d) => ({ ...d, id: d.id || (d as any)._id }));
      setDismantlers(dismantlersList);
      setHasMore(dismantlersList.length >= PAGE_SIZE);

      dismantlersList.forEach((d) => {
        if (d.id) loadStats(d.id);
      });
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setError(message);
      setDismantlers([]);
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    const nextPage = page + 1;
    try {
      const res = await apiGetJson<{ success: boolean; data: Dismantler[] } | Dismantler[]>(
        `/dismantlers?page=${nextPage}&limit=${PAGE_SIZE}`
      );
      const data = Array.isArray(res) ? res : (res as { data?: Dismantler[] }).data;
      const nextList = (data || []).map((d) => ({ ...d, id: d.id || (d as any)._id }));
      setDismantlers((prev) => [...prev, ...nextList]);
      setPage(nextPage);
      setHasMore(nextList.length >= PAGE_SIZE);
      nextList.forEach((d) => {
        if (d.id) loadStats(d.id);
      });
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadStats, loadingMore, hasMore, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEngagement = async (dismantlerId: string) => {
    if (engagement[dismantlerId]) return;
    
    setLoadingStats(prev => ({ ...prev, [dismantlerId]: true }));
    try {
      const res = await apiGetJson<{ success: boolean; data: EngagementData }>(`/dismantlers/${dismantlerId}/engagement`);
      if (res.success && res.data) {
        setEngagement(prev => ({ ...prev, [dismantlerId]: res.data }));
      }
    } catch (e) {
      console.error('Failed to load engagement:', e);
    } finally {
      setLoadingStats(prev => ({ ...prev, [dismantlerId]: false }));
    }
  };

  const handleViewEngagement = async (dismantlerId: string) => {
    setShowEngagementModal(dismantlerId);
    await loadEngagement(dismantlerId);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ka-GE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+995") || phone.startsWith("995")) return phone;
    return "+995" + phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.brand?.trim() || !form.model?.trim() || !form.yearFrom?.trim() || !form.yearTo?.trim() || !form.location) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }
    if (parseInt(form.yearFrom) > parseInt(form.yearTo)) {
      setError("წლიდან არ შეიძლება იყოს უფრო დიდი ვიდრე წლამდე");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone: normalizePhone(form.phone.trim()),
        brand: form.brand.trim(),
        model: form.model.trim(),
        yearFrom: parseInt(form.yearFrom),
        yearTo: parseInt(form.yearTo),
        location: form.location,
        description: form.description.trim() || undefined,
        photos: form.photos.filter(Boolean),
        isVip: form.isVip || false,
      };
      if (editing?.id) {
        await apiPatch(`/dismantlers/${editing.id}`, payload);
      } else {
        await apiPost("/dismantlers", payload);
      }
      setForm({
        name: "",
        phone: "",
        brand: "",
        model: "",
        yearFrom: "",
        yearTo: "",
        location: "",
        description: "",
        photos: [],
        isVip: false,
      });
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : editing ? "შეცდომა დაშლილის რედაქტირებისას" : "შეცდომა დაშლილების დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dismantler: Dismantler) => {
    setEditing(dismantler);
    setForm({
      name: dismantler.name || "",
      phone: dismantler.phone || "",
      brand: dismantler.brand || "",
      model: dismantler.model || "",
      yearFrom: String(dismantler.yearFrom || ""),
      yearTo: String(dismantler.yearTo || ""),
      location: dismantler.location || "",
      description: dismantler.description || "",
      photos: dismantler.photos || [],
      isVip: dismantler.isVip || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ამ დაშლილის წაშლა?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/dismantlers/${id}`);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა დაშლილის წაშლისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">დაშლილები</h1>
          <p className="text-gray-600 mt-1">დაშლილების განცხადებების მართვა</p>
        </div>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => {
            setEditing(null);
            setForm({
              name: "",
              phone: "",
              brand: "",
              model: "",
              yearFrom: "",
              yearTo: "",
              location: "",
              description: "",
              photos: [],
              isVip: false,
            });
            setShowForm(!showForm);
          }}
        >
          {showForm ? "დახურვა" : "ახალი დაშლილი"}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {showForm && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">{editing ? "დაშლილის რედაქტირება" : "ახალი დაშლილების განცხადება"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  გამყიდველის სახელი <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="მაგ. ნიკა მელაძე"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ტელეფონის ნომერი <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+995 XXX XXX XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ბრენდი <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="მაგ. Toyota"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  მოდელი <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="მაგ. Camry"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  წლიდან <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={form.yearFrom}
                  onChange={(e) => setForm({ ...form, yearFrom: e.target.value })}
                  placeholder="მაგ. 2015"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  წლამდე <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={form.yearTo}
                  onChange={(e) => setForm({ ...form, yearTo: e.target.value })}
                  placeholder="მაგ. 2020"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  ქალაქი <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                >
                  <option value="">აირჩიეთ ქალაქი</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                აღწერა <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="მანქანის მდგომარეობა, რა ნაწილები გაყიდვაშია..."
                required
              />
            </div>

            <ImageUpload
              value={form.photos}
              onChange={(urls) => setForm({ ...form, photos: urls })}
              maxImages={5}
              folder="dismantlers"
              label="ფოტოები"
            />

            {/* VIP Checkbox */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={form.isVip}
                    onChange={(e) => setForm({ ...form, isVip: e.target.checked })}
                    className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <span className="text-base font-semibold text-gray-900">
                      VIP სტატუსი
                    </span>
                  </div>
                </label>
                {form.isVip && (
                  <span className="px-3 py-1 bg-yellow-600 text-white text-sm font-bold rounded-full">
                    VIP აქტიურია
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "შენახვა..." : "დამატება"}
              </button>
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setForm({
                    name: "",
                    phone: "",
                    brand: "",
                    model: "",
                    yearFrom: "",
                    yearTo: "",
                    location: "",
                    description: "",
                    photos: [],
                    isVip: false,
                  });
                }}
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">იტვირთება...</div>
        ) : dismantlers.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">დაშლილები არ არის</div>
        ) : (
          dismantlers.map((d) => {
            const img = d.photos?.[0];
            return (
              <div key={d.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow relative">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="cover" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">სურათი არ არის</div>
                )}
                {/* VIP Badge */}
                {d.isVip && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg z-10">
                    ⭐ VIP
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{d.name || "-"}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {d.brand || "-"} {d.model ? `/ ${d.model}` : ""}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{d.location || "-"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100 border">
                      წლები: {d.yearFrom || "-"} - {d.yearTo || "-"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 border">
                      ტელ: {d.phone || "-"}
                    </span>
                  </div>

                  {d.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{d.description}</p>
                  )}

                  {d.createdAt && (
                    <div className="text-xs text-gray-500">
                      შექმნილია: {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  )}

                  {/* Stats */}
                  {d.id && (
                    <div className="pt-2 border-t">
                      {loadingStats[d.id] ? (
                        <div className="text-xs text-gray-500">იტვირთება...</div>
                      ) : stats[d.id] ? (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            👁️ {stats[d.id].viewsCount}
                          </span>
                          <span className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                            ❤️ {stats[d.id].likesCount}
                          </span>
                          <span className="px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                            📞 {stats[d.id].callsCount}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">სტატისტიკა არ არის</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {d.id && (
                      <button
                        className="flex-1 text-sm px-3 py-1.5 border rounded hover:bg-blue-50 text-blue-600"
                        onClick={() => handleViewEngagement(d.id!)}
                      >
                        Engagement
                      </button>
                    )}
                    <button
                      className="flex-1 text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                      onClick={() => handleEdit(d)}
                    >
                      რედაქტირება
                    </button>
                    {d.id && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!d.id) return;
                          try {
                            const newVipStatus = !d.isVip;
                            await apiPatch(`/dismantlers/${d.id}`, { isVip: newVipStatus });
                            setDismantlers(dismantlers.map(dismantler => 
                              dismantler.id === d.id ? { ...dismantler, isVip: newVipStatus } : dismantler
                            ));
                          } catch (error) {
                            console.error('Error updating VIP status:', error);
                            alert('VIP სტატუსის შეცვლა ვერ მოხერხდა');
                          }
                        }}
                        className={`flex-1 text-sm px-3 py-1.5 border rounded font-medium transition-colors ${
                          d.isVip
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                        }`}
                      >
                        {d.isVip ? '⭐ VIP' : 'VIP'}
                      </button>
                    )}
                    <button
                      className="flex-1 text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(d.id!)}
                      disabled={loading}
                    >
                      წაშლა
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && dismantlers.length > 0 && hasMore && (
        <div className="flex justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? "იტვირთება..." : "მეტის ჩატვირთვა"}
          </button>
        </div>
      )}

      {/* Engagement Modal */}
      {showEngagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Engagement - {dismantlers.find(d => d.id === showEngagementModal)?.name || showEngagementModal}
              </h2>
              <button
                onClick={() => {
                  setShowEngagementModal(null);
                  setEngagementTab('views');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b flex">
              <button
                onClick={() => setEngagementTab('views')}
                className={`px-6 py-3 font-medium ${
                  engagementTab === 'views'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Views ({engagement[showEngagementModal]?.views?.length || 0})
              </button>
              <button
                onClick={() => setEngagementTab('likes')}
                className={`px-6 py-3 font-medium ${
                  engagementTab === 'likes'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Likes ({engagement[showEngagementModal]?.likes?.length || 0})
              </button>
              <button
                onClick={() => setEngagementTab('calls')}
                className={`px-6 py-3 font-medium ${
                  engagementTab === 'calls'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calls ({engagement[showEngagementModal]?.calls?.length || 0})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingStats[showEngagementModal] ? (
                <div className="text-center py-8 text-gray-500">იტვირთება...</div>
              ) : !engagement[showEngagementModal] ? (
                <div className="text-center py-8 text-gray-500">მონაცემები არ მოიძებნა</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">მომხმარებელი ID</th>
                        <th className="text-left p-3">სახელი</th>
                        <th className="text-left p-3">ტელეფონი</th>
                        <th className="text-left p-3">ელ. ფოსტა</th>
                        <th className="text-left p-3">დრო</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(engagement[showEngagementModal]?.[engagementTab] || []).map((item, index) => (
                        <tr key={`${item.userId}-${item.timestamp}-${index}`} className="border-b hover:bg-gray-50">
                          <td className="p-3">{item.userId}</td>
                          <td className="p-3">{item.userName || '-'}</td>
                          <td className="p-3">{item.userPhone || '-'}</td>
                          <td className="p-3">{item.userEmail || '-'}</td>
                          <td className="p-3">{formatDate(item.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!engagement[showEngagementModal]?.[engagementTab] || engagement[showEngagementModal][engagementTab].length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      {engagementTab === 'views' && 'Views არ არის'}
                      {engagementTab === 'likes' && 'Likes არ არის'}
                      {engagementTab === 'calls' && 'Calls არ არის'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

