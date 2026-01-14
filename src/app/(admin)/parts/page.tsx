"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetJson, apiPost, apiDelete } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type Part = {
  id?: string;
  _id?: string;
  title?: string;
  category?: string;
  condition?: string;
  price?: string;
  brand?: string;
  model?: string;
  location?: string;
  phone?: string;
  seller?: string;
  createdAt?: string;
  images?: string[];
  description?: string;
  partNumber?: string;
  warranty?: string;
  isNegotiable?: boolean;
};

// Fallback კატეგორიები
const DEFAULT_CATEGORIES = ["ძრავა", "ტრანსმისია", "ფარები", "საბურავები", "ბლოკ-ფარები", "ინტერიერი", "ელექტრონიკა", "სხვა"];
const CONDITIONS = ["ახალი", "ძალიან კარგი", "კარგი", "დამაკმაყოფილებელი"];
const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "ახალქალაქი", "ოზურგეთი", "ტყიბული", "სხვა"];

export default function PartsAdminPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    brand: "",
    model: "",
    year: "",
    title: "",
    category: "",
    condition: "",
    price: "",
    location: "",
    description: "",
    partNumber: "",
    warranty: "",
    isNegotiable: false,
    images: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: Part[] } | Part[]>(`/parts`);
      const data = Array.isArray(res) ? res : res.data;
      setParts((data || []).map((p) => ({ ...p, id: p.id || (p as any)._id })));
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setError(message);
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    load();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await apiGetJson<{ success: boolean; data: any[] }>("/categories");
      const allCategories = res.success ? res.data : [];
      // Find parts category or categories with 'part' in serviceTypes
      const partsCategories = allCategories.filter(
        (cat: any) => cat.serviceTypes?.includes("part") || cat.nameEn?.toLowerCase().includes("part")
      );
      
      if (partsCategories.length > 0) {
        // Use category names from API
        setCategories(partsCategories.map((cat: any) => cat.name));
      }
    } catch (e) {
      // Keep default categories on error
      console.error("Error loading categories:", e);
    }
  };

  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+995") || phone.startsWith("995")) return phone;
    return "+995" + phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.title?.trim() || !form.category || !form.condition || !form.price?.trim() || !form.location) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
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
        year: form.year ? parseInt(form.year) : 0,
        title: form.title.trim(),
        category: form.category,
        condition: form.condition,
        price: form.price.trim(),
        location: form.location,
        description: form.description.trim() || undefined,
        seller: form.name.trim(),
        partNumber: form.partNumber.trim() || undefined,
        warranty: form.warranty.trim() || undefined,
        isNegotiable: form.isNegotiable,
        images: form.images.filter(Boolean),
      };
      await apiPost("/parts", payload);
      setForm({
        name: "",
        phone: "",
        brand: "",
        model: "",
        year: "",
        title: "",
        category: "",
        condition: "",
        price: "",
        location: "",
        description: "",
        partNumber: "",
        warranty: "",
        isNegotiable: false,
        images: [],
      });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა ნაწილის დამატებისას";
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
          <h1 className="text-2xl font-bold">ნაწილები</h1>
          <p className="text-gray-600 mt-1">ნაწილების მართვა</p>
        </div>
        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "დახურვა" : "ახალი ნაწილი"}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {showForm && (
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">ახალი ნაწილი</h2>
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
                  მანქანის ბრენდი <span className="text-red-500">*</span>
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
                  მანქანის მოდელი <span className="text-red-500">*</span>
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
                  მანქანის წელი <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="მაგ. 2018"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ნაწილის დასახელება <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="მაგ. წინა ფარა"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  კატეგორია <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">აირჩიეთ კატეგორია</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  მდგომარეობა <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  required
                >
                  <option value="">აირჩიეთ მდგომარეობა</option>
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ფასი (ლარი) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="მაგ. 150"
                  required
                />
              </div>

              <div>
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

              <div>
                <label className="block text-sm font-medium mb-1">
                  ნაწილის ნომერი
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.partNumber}
                  onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                  placeholder="მაგ. ABC123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  გარანტია
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.warranty}
                  onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                  placeholder="მაგ. 6 თვე"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isNegotiable}
                  onChange={(e) => setForm({ ...form, isNegotiable: e.target.checked })}
                />
                <span className="text-sm">ფასი შეთანხმებით</span>
              </label>
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
                placeholder="ნაწილის დეტალური აღწერა..."
                required
              />
            </div>

            <ImageUpload
              value={form.images}
              onChange={(urls) => setForm({ ...form, images: urls })}
              maxImages={5}
              folder="parts"
              label="სურათები"
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

      {loading ? (
        <div className="text-center text-gray-500 py-10">იტვირთება...</div>
      ) : parts.length === 0 ? (
        <div className="text-center text-gray-500 py-10">ნაწილები არ არის</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parts.map((p) => {
            const partImage = p.images?.[0];
            const partId = p.id || p._id;
            
            return (
              <div key={partId} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Image Section */}
                <div className="relative h-48 bg-gray-100">
                  {partImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={partImage} 
                      alt={p.title || "ნაწილი"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {p.isNegotiable && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                      შეთანხმებით
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold truncate flex-1">{p.title || 'უსახელო ნაწილი'}</h3>
                      {p.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ml-2">
                          {p.category}
                        </span>
            )}
                    </div>
                    {(p.brand || p.model) && (
                      <div className="text-sm text-gray-600">
                        {p.brand || ''} {p.model ? `/ ${p.model}` : ''}
                      </div>
            )}
                    {partId && (
                      <div className="text-xs text-gray-500 mt-1">
                        ID: <a className="text-blue-600 underline" href={`/parts/${partId}`} target="_blank" rel="noopener noreferrer">{partId.substring(0, 8)}...</a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">ფასი:</span>
                      <span className="font-semibold text-lg text-green-600">{p.price ? `₾${p.price}` : '—'}</span>
                    </div>
                    {p.condition && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {p.condition}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {p.location && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 border">
                        📍 {p.location}
                      </span>
                    )}
                    {p.phone && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 border">
                        📞 {p.phone}
                      </span>
                    )}
                    {p.seller && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 border">
                        👤 {p.seller}
                      </span>
                    )}
                  </div>

                  {p.partNumber && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">ნაწილის ნომერი:</span> {p.partNumber}
                    </div>
                  )}

                  {p.warranty && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">გარანტია:</span> {p.warranty}
                    </div>
                  )}

                  {p.description && (
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {p.description}
                    </div>
                  )}

                  {p.createdAt && (
                    <div className="text-xs text-gray-500 border-t pt-2">
                      დამატებული: {new Date(p.createdAt).toLocaleDateString('ka-GE')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <a 
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" 
                      href={`/parts/${partId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      გახსნა
                    </a>
                    <button
                      onClick={async () => {
                        if (!confirm(`დარწმუნებული ხართ რომ გსურთ ამ ნაწილის წაშლა? (ID: ${partId})`)) return;
                        try {
                          await apiDelete(`/parts/${partId}`);
                          await load();
                        } catch (e: unknown) {
                          const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'წაშლა ვერ მოხერხდა';
                          alert(`წაშლა ვერ მოხერხდა: ${message}`);
                        }
                      }}
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

