"use client";

import { useEffect, useState } from "react";
import { apiGetJson, apiPost } from "@/lib/api";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await apiPost("/dismantlers", payload);
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
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა დაშლილების დამატებისას";
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
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "დახურვა" : "ახალი დაშლილი"}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {showForm && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">ახალი დაშლილების განცხადება</h2>
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
                onClick={() => setShowForm(false)}
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">გამყიდველი</th>
              <th className="px-3 py-2 text-left">ბრენდი/მოდელი</th>
              <th className="px-3 py-2 text-left">წლები</th>
              <th className="px-3 py-2 text-left">ქალაქი</th>
              <th className="px-3 py-2 text-left">ტელეფონი</th>
              <th className="px-3 py-2 text-left">შექმნილია</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={7}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && dismantlers.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={7}>
                  No dismantlers
                </td>
              </tr>
            )}
            {dismantlers.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2">
                  <a className="text-blue-600 underline" href={`/dismantlers/${d.id}`}>
                    {d.id?.substring(0, 8)}...
                  </a>
                </td>
                <td className="px-3 py-2">{d.name || "-"}</td>
                <td className="px-3 py-2">
                  {d.brand || "-"} {d.model ? `/ ${d.model}` : ""}
                </td>
                <td className="px-3 py-2">
                  {d.yearFrom || "-"} - {d.yearTo || "-"}
                </td>
                <td className="px-3 py-2">{d.location || "-"}</td>
                <td className="px-3 py-2">{d.phone || "-"}</td>
                <td className="px-3 py-2">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

