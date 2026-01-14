"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGetJson, apiPost, apiPatch, apiDelete } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type Evacuator = {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  location?: string;
  address?: string;
  isAvailable?: boolean;
  isOpen?: boolean; // services endpoint-ისთვის
  rating?: number;
  images?: string[];
  latitude?: number;
  longitude?: number;
  description?: string;
  pricePerKm?: number;
  minPrice?: number;
  category?: string;
  status?: string;
};

const LOCATIONS = [
  "თბილისი",
  "ბათუმი",
  "ქუთაისი",
  "რუსთავი",
  "გორი",
  "ზუგდიდი",
  "ფოთი",
  "ახალქალაქი",
  "ოზუგეთი",
  "ტყიბული",
  "სხვა",
];

export default function EvacuatorsAdminPage() {
  const [evacuators, setEvacuators] = useState<Evacuator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [location, setLocation] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Evacuator>>({
    name: "",
    phone: "",
    location: "",
    address: "",
    isAvailable: true,
    images: [],
    latitude: undefined,
    longitude: undefined,
    description: "",
    pricePerKm: undefined,
    minPrice: undefined,
  });

  // Debounced filters
  const [dq, setDq] = useState("");
  const [dlocation, setDlocation] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q);
      setDlocation(location);
    }, 400);
    return () => clearTimeout(t);
  }, [q, location]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("category", "ევაკუატორი"); // ფილტრი მხოლოდ ევაკუატორებისთვის
      if (dq.trim()) params.append("q", dq.trim());
      if (dlocation) params.append("location", dlocation);
      const res = await apiGetJson<{ success: boolean; data: Evacuator[] } | Evacuator[]>(
        `/services${params.toString() ? `?${params.toString()}` : ""}`
      );
      const data = Array.isArray(res) ? res : (res.success ? res.data : []);
      setEvacuators((data || []).map((e) => ({ ...e, id: e.id || (e as any)._id })));
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შეცდომა ევაკუატორების ჩატვირთვისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, dlocation]);

  const filteredCount = useMemo(() => evacuators.length, [evacuators]);

  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+995") || phone.startsWith("995")) return phone;
    return "+995" + phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("სახელი სავალდებულოა");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // services endpoint-ისთვის საჭირო payload სტრუქტურა
      const payload: any = {
        name: form.name?.trim(),
        description: form.description?.trim() || "",
        category: "ევაკუატორი",
        location: form.location?.trim() || "",
        address: form.address?.trim() || "",
        phone: form.phone?.trim() ? normalizePhone(form.phone.trim()) : "",
        images: (form.images || []).filter(Boolean),
        isOpen: form.isAvailable ?? true,
        status: "active",
      };
      
      // დამატებითი ველები (თუ არის)
      if (form.latitude !== undefined) payload.latitude = form.latitude;
      if (form.longitude !== undefined) payload.longitude = form.longitude;
      if (form.pricePerKm) payload.pricePerKm = form.pricePerKm;
      if (form.minPrice) payload.minPrice = form.minPrice;
      
      if (editingId) {
        await apiPatch(`/services/${editingId}`, payload);
      } else {
        // ვცდით /services endpoint-ს create-ის გარეშე
        await apiPost("/services", payload);
      }
      // reset and reload
      setForm({
        name: "",
        phone: "",
        location: "",
        address: "",
        isAvailable: true,
        images: [],
        latitude: undefined,
        longitude: undefined,
        description: "",
        pricePerKm: undefined,
        minPrice: undefined,
      });
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შეცდომა ევაკუატორის დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onEdit = (e: Evacuator) => {
    setShowForm(true);
    setEditingId(e.id || null);
    setForm({
      name: e.name || "",
      phone: e.phone,
      location: e.location,
      address: e.address,
      isAvailable: e.isAvailable ?? e.isOpen ?? true,
      images: e.images || [],
      latitude: e.latitude,
      longitude: e.longitude,
      description: e.description,
      pricePerKm: e.pricePerKm,
      minPrice: e.minPrice,
    });
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("წაიშალოს ჩანაწერი?")) return;
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/services/${id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შეცდომა წაშლისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ევაკუატორების მართვა</h1>
        <p className="text-sm text-gray-500">დაათვალიერეთ, გაფილტრეთ და დაამატეთ ევაკუატორები</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}

      {/* Filters */}
      <div className="border rounded-md p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძებნა (სახელი/ტელეფონი/ლოკაცია)"
          className="px-3 py-2 border rounded-md"
        />
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">ყველა ლოკაცია</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-4 py-2 bg-gray-100 rounded-md border">
            განახლება
          </button>
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
          <h2 className="text-lg font-medium mb-4">
            {editingId ? "ევაკუატორის რედაქტირება" : "ახალი ევაკუატორის დამატება"}
          </h2>
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
                <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                <input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="5XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ლოკაცია</label>
                <select
                  value={form.location || ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">აირჩიეთ</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
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
                    onChange={(e) =>
                      setForm({
                        ...form,
                        latitude: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
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
                    onChange={(e) =>
                      setForm({
                        ...form,
                        longitude: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="44.8271"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ფასი კმ-ზე (₾)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.pricePerKm || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricePerKm: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">მინიმალური ფასი (₾)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.minPrice || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="50"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">აღწერა</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="ევაკუატორის დეტალური აღწერა..."
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">სურათები</label>
                <ImageUpload
                  value={form.images || []}
                  onChange={(urls) => setForm({ ...form, images: urls })}
                  maxImages={5}
                  folder="evacuators"
                  label=""
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
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List - Card Layout */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">იტვირთება...</div>
      ) : evacuators.length === 0 ? (
        <div className="text-center text-gray-500 py-10">ევაკუატორები არ არის</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evacuators.map((e) => {
            const evacuatorId = e.id || e._id;
            const image = e.images?.[0];

            return (
              <div
                key={evacuatorId}
                className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image Section */}
                <div className="relative h-48 bg-gray-100">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={e.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    </div>
                  )}
                  {(e.isAvailable || e.isOpen) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                      ხელმისაწვდომი
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">{e.name || "უსახელო ევაკუატორი"}</h3>
                    {e.location && (
                      <div className="text-sm text-gray-600 mt-1">📍 {e.location}</div>
                    )}
                    {evacuatorId && (
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {evacuatorId.substring(0, 8)}...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {e.phone && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 border">📞 {e.phone}</span>
                    )}
                    {e.pricePerKm && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        ₾{e.pricePerKm}/კმ
                      </span>
                    )}
                    {e.minPrice && (
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                        მინ: ₾{e.minPrice}
                      </span>
                    )}
                  </div>

                  {e.address && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">მისამართი:</span> {e.address}
                    </div>
                  )}

                  {e.description && (
                    <div className="text-xs text-gray-600 line-clamp-2">{e.description}</div>
                  )}

                  {e.rating && (
                    <div className="flex items-center gap-1 text-amber-500 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < Math.round(e.rating || 0) ? "★" : "☆"}</span>
                      ))}
                      <span className="text-gray-600 ml-1">{e.rating}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <button
                      onClick={() => onEdit(e)}
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => onDelete(evacuatorId)}
                      className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
                    >
                      წაშლა
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

