"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

const CATEGORIES = [
  "parts",
  "oils",
  "accessories",
  "interior",
  "tools",
  "electronics",
];

export default function NewEcommerceProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    brand: "",
    sku: "",
    stock: "0",
    inStock: true,
    isActive: true,
    isFeatured: false,
    images: [] as string[],
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.description?.trim() || !form.price || !form.category) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        category: form.category,
        brand: form.brand.trim() || undefined,
        sku: form.sku.trim() || undefined,
        stock: parseInt(form.stock) || 0,
        inStock: form.inStock,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        images: form.images.filter(Boolean),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      await apiPost("/ecommerce-products", payload);
      router.push("/ecommerce-products");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა პროდუქტის დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ახალი პროდუქტი</h1>
        <p className="text-gray-600 mt-1">შეიყვანეთ პროდუქტის ინფორმაცია</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            სახელი <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="მაგ. ძრავის ზეთი 5W-30"
            required
          />
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
            placeholder="პროდუქტის დეტალური აღწერა"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              ფასი (₾) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              ძველი ფასი (₾)
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={form.originalPrice}
              onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              ბრენდი
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="მაგ. Castrol"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              SKU
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="SKU კოდი"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              საწყობი
            </label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            ტეგები (მძიმით გამოყოფილი)
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="მაგ. ზეთი, ძრავი, 5W-30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            ფოტოები
          </label>
          <ImageUpload
            value={form.images}
            onChange={(images) => setForm({ ...form, images })}
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
            />
            <span className="text-sm">საწყობშია</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span className="text-sm">აქტიური</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            />
            <span className="text-sm">გამორჩეული</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "იტვირთება..." : "დამატება"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            გაუქმება
          </button>
        </div>
      </form>
    </div>
  );
}
