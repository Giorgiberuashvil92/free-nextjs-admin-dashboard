"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { unwrapApiArray } from "@/lib/unwrapApiResponse";
import ImageUpload from "@/components/ImageUpload";
import {
  buildCarwashPayload,
  carwashToForm,
  CATEGORIES,
  CITIES,
  emptyCarwashForm,
  linkCarwashOwner,
  type CarwashFormState,
  type CarwashRow,
} from "@/components/carwash/carwashAdminTypes";

export default function CarwashesPage() {
  const [items, setItems] = useState<CarwashRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CarwashRow | null>(null);
  const [form, setForm] = useState<CarwashFormState>(emptyCarwashForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await apiGet<unknown>(`/carwash/locations?t=${Date.now()}`);
      const list = unwrapApiArray<CarwashRow>(raw).map((row) => ({
        ...row,
        id: row.id || row._id || "",
      }));
      setItems(list.filter((r) => r.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ჩატვირთვა ვერ მოხერხდა");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((c) => {
      if (city && c.location !== city) return false;
      if (!term) return true;
      return [c.name, c.address, c.phone, c.category, c.location].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [items, q, city]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCarwashForm());
    setShowForm(true);
    setOk("");
    setError("");
  };

  const openEdit = (row: CarwashRow) => {
    setEditing(row);
    setForm(carwashToForm(row));
    setShowForm(true);
    setOk("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setError("სახელი და მისამართი სავალდებულოა");
      return;
    }

    setSaving(true);
    setError("");
    setOk("");
    try {
      const payload = buildCarwashPayload(form, editing?.detailedServices);

      if (editing?.id) {
        await apiPatch(`/carwash/locations/${editing.id}`, {
          ...payload,
          updatedAt: Date.now(),
        });
        if (form.ownerUserId.trim()) {
          try {
            await linkCarwashOwner(editing.id, form.ownerUserId.trim());
          } catch {
            setOk("სამრეცხაო განახლდა, მაგრამ owner-ის მიბმა ვერ მოხერხდა");
            await load();
            setSaving(false);
            return;
          }
        }
        setOk("სამრეცხაო განახლდა");
      } else {
        const created = await apiPost<CarwashRow>("/carwash/locations", payload);
        const newId = created?.id || (created as { _id?: string })?._id;
        if (form.ownerUserId.trim() && newId) {
          try {
            await linkCarwashOwner(String(newId), form.ownerUserId.trim());
          } catch {
            setOk("სამრეცხაო შეიქმნა, მაგრამ owner-ის მიბმა ვერ მოხერხდა");
            setShowForm(false);
            await load();
            setSaving(false);
            return;
          }
        }
        setOk("სამრეცხაო დაემატა");
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyCarwashForm());
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CarwashRow) => {
    if (!confirm(`წავშალოთ „${row.name}"?`)) return;
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/carwash/locations/${row.id}`);
      setOk("წაიშალა");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "წაშლა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ავტოსამრეცხაოები</h1>
        <p className="text-sm text-gray-500">დამატება, რედაქტირება და owner-ის მიბმა</p>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
      ) : null}
      {ok ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm">{ok}</div>
      ) : null}

      <div className="border rounded-md p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძებნა (სახელი, მისამართი, ტელეფონი)"
          className="px-3 py-2 border rounded-md"
        />
        <select value={city} onChange={(e) => setCity(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="">ყველა ქალაქი</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 md:col-span-2">
          <button type="button" onClick={() => void load()} className="px-4 py-2 bg-gray-100 rounded-md border">
            განახლება
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + ახალი სამრეცხაო
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="border rounded-md p-4 space-y-4 bg-white">
          <h2 className="text-lg font-medium">{editing ? "რედაქტირება" : "ახალი სამრეცხაო"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">სახელი *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="AutoSpa Premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ტელეფონი</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="5XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ქალაქი</label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">მისამართი *</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="კახეთის გზატკეცილი 48"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">კატეგორია</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">სამუშაო საათები</label>
                <input
                  value={form.workingHours}
                  onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="09:00 - 21:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">საწყისი ფასი (₾)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Owner User ID</label>
                <input
                  value={form.ownerUserId}
                  onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="იუზერის ID (არასავალდებულო)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">აღწერა</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                  placeholder="მოკლე აღწერა..."
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">ძირითადი სერვისი</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                  placeholder="სერვისის სახელი"
                />
                <input
                  type="number"
                  value={form.servicePrice}
                  onChange={(e) => setForm({ ...form, servicePrice: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                  placeholder="ფასი ₾"
                />
                <input
                  type="number"
                  value={form.serviceDuration}
                  onChange={(e) => setForm({ ...form, serviceDuration: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                  placeholder="ხანგრძლივობა (წთ)"
                />
              </div>
            </div>

            <ImageUpload
              value={form.images}
              onChange={(urls) => setForm({ ...form, images: urls })}
              maxImages={8}
              folder="carwashes"
              label="სურათები"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isOpen}
                onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
              />
              ღიაა (აპში ჩანს როგორც ღია)
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white rounded-md disabled:opacity-60"
              >
                {saving ? "ინახება..." : editing ? "შენახვა" : "დამატება"}
              </button>
              <button
                type="button"
                className="px-4 py-2 border rounded-md"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">იტვირთება...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">სამრეცხაოები არ არის</div>
        ) : (
          filtered.map((c) => {
            const img = c.images?.[0];
            return (
              <div key={c.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={c.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    სურათი არ არის
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{c.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.location} · {c.category} · {c.phone}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        c.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {c.isOpen ? "ღია" : "დაკეტილი"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100">₾{c.price ?? "—"}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100">
                      სერვისები: {c.detailedServices?.length ?? 0}
                    </span>
                    {c.ownerId && c.ownerId !== "admin" ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">owner: {c.ownerId.slice(0, 8)}…</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                      onClick={() => openEdit(c)}
                    >
                      რედაქტირება
                    </button>
                    <Link href={`/carwashes/${c.id}`} className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">
                      დეტალები
                    </Link>
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
                      onClick={() => void handleDelete(c)}
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
