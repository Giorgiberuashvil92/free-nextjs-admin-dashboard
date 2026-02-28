"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { apiGetJson, apiPatch } from "@/lib/api";

const CATEGORIES = [
  "parts",
  "oils",
  "accessories",
  "interior",
  "tools",
  "electronics",
];

type ProductDetail = {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  category: string;
  brand?: string;
  sku?: string;
  stock?: number;
  inStock?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  views?: number;
  sales?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function EcommerceProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
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

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiGetJson<{ success: boolean; data: ProductDetail } | ProductDetail>(`/ecommerce-products/${id}`);
      const productData = (res as any)?.data || res;
      setData(productData);
      setForm({
        title: productData.title || "",
        description: productData.description || "",
        price: productData.price?.toString() || "",
        originalPrice: productData.originalPrice?.toString() || "",
        category: productData.category || "",
        brand: productData.brand || "",
        sku: productData.sku || "",
        stock: productData.stock?.toString() || "0",
        inStock: productData.inStock !== false,
        isActive: productData.isActive !== false,
        isFeatured: productData.isFeatured || false,
        images: productData.images || [],
        tags: productData.tags?.join(', ') || "",
      });
    } catch (error) {
      console.error("Error loading product:", error);
      alert("პროდუქტის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
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
      await apiPatch(`/ecommerce-products/${id}`, payload);
      setEditing(false);
      load();
    } catch (error: any) {
      alert(error.message || "პროდუქტის განახლება ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-6">იტვირთება...</div>;
  }

  if (!data) {
    return <div className="p-6">პროდუქტი ვერ მოიძებნა</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-gray-600 mt-1">პროდუქტის დეტალები</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "იტვირთება..." : "შენახვა"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  load();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                გაუქმება
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              რედაქტირება
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              სახელი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">ძირითადი ინფორმაცია</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">სახელი:</span> {data.title}</div>
                <div><span className="font-medium">კატეგორია:</span> {data.category}</div>
                {data.brand && <div><span className="font-medium">ბრენდი:</span> {data.brand}</div>}
                {data.sku && <div><span className="font-medium">SKU:</span> {data.sku}</div>}
                <div><span className="font-medium">ფასი:</span> {data.price}₾</div>
                {data.originalPrice && (
                  <div>
                    <span className="font-medium">ძველი ფასი:</span> {data.originalPrice}₾
                    {data.originalPrice > data.price && (
                      <span className="ml-2 text-green-600">
                        (-{Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">სტატისტიკა</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">საწყობი:</span> {data.stock || 0}</div>
                <div><span className="font-medium">გაყიდვები:</span> {data.sales || 0}</div>
                <div><span className="font-medium">ნახვები:</span> {data.views || 0}</div>
                <div>
                  <span className="font-medium">სტატუსი:</span>{" "}
                  {data.isActive ? (
                    <span className="text-green-600">აქტიური</span>
                  ) : (
                    <span className="text-red-600">არააქტიური</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">გამორჩეული:</span>{" "}
                  {data.isFeatured ? <span className="text-yellow-600">⭐ დიახ</span> : "არა"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">აღწერა</h3>
            <p className="text-sm text-gray-700">{data.description}</p>
          </div>

          {data.tags && data.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">ტეგები</h3>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.images && data.images.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">ფოტოები</h3>
              <div className="grid grid-cols-3 gap-4">
                {data.images.map((img, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={img}
                    alt={`${data.title} ${idx + 1}`}
                    className="w-full h-48 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
