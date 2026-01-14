"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

type Mechanic = {
  id?: string;
  name: string;
  specialty: string;
  location?: string;
  phone?: string;
  address?: string;
  rating?: number;
  isAvailable?: boolean;
  avatar?: string;
  services?: string[];
  latitude?: number;
  longitude?: number;
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

type MechanicEngagement = {
  likes?: EngagementUser[];
  views?: EngagementUser[];
  calls?: EngagementUser[];
};

const SPECIALTIES = [
  "ძრავი",
  "შემუშავება",
  "ელექტრო",
  "გადაცემა",
  "დიაგნოსტიკა",
  "ზოგადი",
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function MechanicsAdminPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [engagement, setEngagement] = useState<MechanicEngagement | null>(null);
  const [loadingEngagement, setLoadingEngagement] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Mechanic>>({
    name: "",
    specialty: "",
    location: "",
    phone: "",
    address: "",
    isAvailable: true,
    services: [],
    avatar: "",
    latitude: undefined,
    longitude: undefined,
  });

  // Debounced filters
  const [dq, setDq] = useState("");
  const [dspecialty, setDspecialty] = useState("");
  const [dlocation, setDlocation] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q);
      setDspecialty(specialty);
      setDlocation(location);
    }, 400);
    return () => clearTimeout(t);
  }, [q, specialty, location]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dq.trim()) params.append("q", dq.trim());
      if (dspecialty) params.append("specialty", dspecialty);
      if (dlocation) params.append("location", dlocation);
      const data = await apiGet<Mechanic[]>(`/mechanics${params.toString() ? `?${params.toString()}` : ""}`);
      const mechanicsList = data || [];
      
      // ჩატვირთე სტატისტიკა თითოეული მექანიკოსისთვის
      const mechanicsWithStats = await Promise.all(
        mechanicsList.map(async (mechanic) => {
          if (!mechanic.id) return mechanic;
          try {
            const endpoints = [
              `/mechanics/${mechanic.id}/stats`,
              `/mechanics/${mechanic.id}/engagement`,
              `/analytics/mechanic/${mechanic.id}`,
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
                // გავაგრძელოთ
              }
            }
            
            return {
              ...mechanic,
              likesCount: stats.likesCount || stats.likes || 0,
              viewsCount: stats.viewsCount || stats.views || 0,
              callsCount: stats.callsCount || stats.calls || 0,
            };
          } catch (e) {
            return mechanic;
          }
        })
      );
      
      setMechanics(mechanicsWithStats);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა მექანიკოსების ჩატვირთვისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dq, dspecialty, dlocation]);

  const loadEngagement = useCallback(async (mechanicId: string) => {
    if (!mechanicId) return;
    setLoadingEngagement(true);
    try {
      const endpoints = [
        `/mechanics/${mechanicId}/engagement`,
        `/mechanics/${mechanicId}/likes`,
        `/mechanics/${mechanicId}/views`,
        `/mechanics/${mechanicId}/calls`,
        `/analytics/mechanic/${mechanicId}/engagement`,
      ];
      
      let engagementData: MechanicEngagement = {};
      
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
      
      if (!engagementData.likes) {
        try {
          const likesRes = await fetch(`${API_BASE}/mechanics/${mechanicId}/likes`, { cache: "no-store" });
          if (likesRes.ok) {
            const likesData = await likesRes.json();
            engagementData.likes = Array.isArray(likesData) ? likesData : (likesData.data || likesData.likes || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.views) {
        try {
          const viewsRes = await fetch(`${API_BASE}/mechanics/${mechanicId}/views`, { cache: "no-store" });
          if (viewsRes.ok) {
            const viewsData = await viewsRes.json();
            engagementData.views = Array.isArray(viewsData) ? viewsData : (viewsData.data || viewsData.views || []);
          }
        } catch (e) {}
      }
      
      if (!engagementData.calls) {
        try {
          const callsRes = await fetch(`${API_BASE}/mechanics/${mechanicId}/calls`, { cache: "no-store" });
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

  const handleViewStats = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setEngagement(null);
    openModal();
    if (mechanic.id) {
      loadEngagement(mechanic.id);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, dspecialty, dlocation]);

  const filteredCount = useMemo(() => mechanics.length, [mechanics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.specialty?.trim()) {
      setError("სახელი და სპეციალობა სავალდებულოა");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name?.trim(),
        specialty: form.specialty?.trim(),
        location: form.location?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        isAvailable: form.isAvailable ?? true,
        services: (form.services || []).filter(Boolean),
        avatar: form.avatar?.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      if (editingId) {
        await apiPatch(`/mechanics/${editingId}`, payload);
      } else {
        await apiPost("/mechanics", payload);
      }
      // reset and reload
      setForm({
        name: "",
        specialty: "",
        location: "",
        phone: "",
        address: "",
        isAvailable: true,
        services: [],
        avatar: "",
        latitude: undefined,
        longitude: undefined,
      });
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა მექანიკოსის დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onEdit = (m: Mechanic) => {
    setShowForm(true);
    setEditingId(m.id || null);
    setForm({
      name: m.name,
      specialty: m.specialty,
      location: m.location,
      phone: m.phone,
      address: m.address,
      isAvailable: m.isAvailable,
      services: m.services || [],
      avatar: m.avatar,
      latitude: m.latitude,
      longitude: m.longitude,
    });
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("წაიშალოს ჩანაწერი?")) return;
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/mechanics/${id}`);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა წაშლისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">მექანიკოსების მართვა</h1>
        <p className="text-sm text-gray-500">დაათვალიერეთ, გაფილტრეთ და დაამატეთ მექანიკოსები</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="border rounded-md p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძებნა (სახელი/სპეციალობა/ლოკაცია)"
          className="px-3 py-2 border rounded-md"
        />
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">ყველა სპეციალობა</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="ლოკაცია (მაგ: თბილისი)"
          className="px-3 py-2 border rounded-md"
        />
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-4 py-2 bg-gray-100 rounded-md border">განახლება</button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showForm ? "დახურვა" : "+ დამატება"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="border rounded-md p-4">
          <h2 className="text-lg font-medium mb-4">{editingId ? "მექანიკოსის რედაქტირება" : "ახალი მექანიკოსის დამატება"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">სახელი *</label>
                <input
                  required
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="მაგ: გიორგი პაპაშვილი"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">სპეციალობა *</label>
                <select
                  required
                  value={form.specialty || ""}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">აირჩიეთ</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ლოკაცია</label>
                <input
                  value={form.location || ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="მაგ: თბილისი"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                <input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="5XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">მისამართი</label>
                <input
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="ქუჩა, ნომერი"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude || ""}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="41.7151"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude || ""}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="44.8271"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Avatar URL</label>
                <input
                  value={form.avatar || ""}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">სერვისები (მძიმით გამოყოფილი)</label>
                <input
                  value={(form.services || []).join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      services: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="ძრავის შეკეთება, დიაგნოსტიკა"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isAvailable"
                  type="checkbox"
                  checked={!!form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                />
                <label htmlFor="isAvailable" className="text-sm">ხელმისაწვდომია</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "ინახება..." : editingId ? "განახლება" : "დამატება"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-medium">მექანიკოსები ({filteredCount})</h2>
          {loading && <span className="text-sm text-gray-500">იტვირთება...</span>}
        </div>
        {mechanics.length === 0 ? (
          <div className="p-6 text-center text-gray-500">ჩანაწერი არ მოიძებნა</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">სახელი</th>
                <th className="px-4 py-2 text-left">სპეციალობა</th>
                <th className="px-4 py-2 text-left">ლოკაცია</th>
                <th className="px-4 py-2 text-left">ტელეფონი</th>
                <th className="px-4 py-2 text-left">სტატუსი</th>
                <th className="px-4 py-2 text-left">სტატისტიკა</th>
                <th className="px-4 py-2 text-left">მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {mechanics.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2 font-medium flex items-center gap-2">
                    {m.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded bg-gray-200 inline-block" />
                    )}
                    {m.id ? (
                      <Link href={`/mechanics/${m.id}`} className="text-blue-600 hover:underline">
                        {m.name}
                      </Link>
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className="px-4 py-2">{m.specialty}</td>
                  <td className="px-4 py-2">{m.location || "-"}</td>
                  <td className="px-4 py-2">{m.phone || "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded ${m.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {m.isAvailable ? "ხელმისაწვდომი" : "დაკავებული"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-red-500">
                        <span>❤️</span>
                        <span>{m.likesCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-500">
                        <span>👁️</span>
                        <span>{m.viewsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-500">
                        <span>📞</span>
                        <span>{m.callsCount || 0}</span>
                      </div>
                      <button
                        onClick={() => handleViewStats(m)}
                        className="ml-2 text-brand-500 hover:text-brand-600 text-xs font-medium"
                      >
                        დეტალები
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => onEdit(m)} className="text-blue-600 hover:text-blue-800">რედაქტირება</button>
                      <button onClick={() => onDelete(m.id)} className="text-red-600 hover:text-red-800">წაშლა</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* სტატისტიკის მოდალი */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-4xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {selectedMechanic?.name || "მექანიკოსის"} სტატისტიკა
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ლაიქები, ნახვები და დარეკვის ღილაკის დაჭერები
            </p>
          </div>

          {selectedMechanic && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-600 dark:text-red-400 mb-1">ლაიქები</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {selectedMechanic.likesCount || 0}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">ნახვები</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {selectedMechanic.viewsCount || 0}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">დარეკვები</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {selectedMechanic.callsCount || 0}
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


