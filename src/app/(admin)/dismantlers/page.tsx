"use client";

import { useEffect, useState } from "react";
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
};

const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "ახალქალაქი", "ოზურგეთი", "ტყიბული", "სხვა"];

export default function DismantlersAdminPage() {
  const [dismantlers, setDismantlers] = useState<Dismantler[]>([]);
  const [loading, setLoading] = useState(false);
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
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: Dismantler[] } | Dismantler[]>(`/dismantlers`);
      const data = Array.isArray(res) ? res : res.data;
      setDismantlers((data || []).map((d) => ({ ...d, id: d.id || (d as any)._id })));
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setError(message);
      setDismantlers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
              <div key={d.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="cover" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">სურათი არ არის</div>
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

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      className="flex-1 text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                      onClick={() => handleEdit(d)}
                    >
                      რედაქტირება
                    </button>
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
    </div>
  );
}

