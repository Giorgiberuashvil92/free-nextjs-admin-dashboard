"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import { apiDelete, apiGetJson, apiPatch, apiPost } from "@/lib/api";

type DeliveryProduct = {
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
  specifications?: Record<string, unknown>;
  tags?: string[];
};

const DELIVERY_CATEGORIES = [
  { value: "parts", label: "ნაწილები" },
  { value: "oils", label: "ზეთები" },
  { value: "tires", label: "საბურავები" },
  { value: "accessories", label: "აქსესუარები" },
  { value: "battery", label: "აკუმულატორი" },
  { value: "chemicals", label: "ავტოქიმია" },
];

const emptyForm = {
  title: "",
  description: "",
  price: "",
  originalPrice: "",
  category: "parts",
  brand: "",
  sku: "",
  stock: "0",
  deliveryEta: "35-45 წთ",
  inStock: true,
  isActive: true,
  isFeatured: true,
  images: [] as string[],
};

const productId = (product: DeliveryProduct) => String(product.id || product._id || "");
const categoryLabel = (value?: string) =>
  DELIVERY_CATEGORIES.find((category) => category.value === value)?.label || value || "-";

export default function DeliveryProductsPage() {
  const [rows, setRows] = useState<DeliveryProduct[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: DeliveryProduct[] } | DeliveryProduct[]>(
        "/ecommerce-products?limit=200",
      );
      const data = Array.isArray(res) ? res : res.data || [];
      const deliveryProducts = data
        .map((product) => ({ ...product, id: product.id || product._id }))
        .filter((product) =>
          DELIVERY_CATEGORIES.some((category) => category.value === product.category),
        );
      setRows(deliveryProducts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "პროდუქტების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((product) =>
      `${product.title} ${product.brand || ""} ${product.category}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const startEdit = (product: DeliveryProduct) => {
    setEditingId(productId(product));
    setForm({
      title: product.title || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      originalPrice: product.originalPrice != null ? String(product.originalPrice) : "",
      category: product.category || "parts",
      brand: product.brand || "",
      sku: product.sku || "",
      stock: product.stock != null ? String(product.stock) : "0",
      deliveryEta: String(product.specifications?.deliveryEta || "35-45 წთ"),
      inStock: product.inStock !== false,
      isActive: product.isActive !== false,
      isFeatured: Boolean(product.isFeatured),
      images: product.images || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.category) {
      setError("შეავსე სახელი, აღწერა, ფასი და კატეგორია");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        category: form.category,
        brand: form.brand.trim() || undefined,
        sku: form.sku.trim() || undefined,
        stock: Number(form.stock) || 0,
        inStock: form.inStock,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        images: form.images.filter(Boolean),
        tags: ["delivery", form.category],
        specifications: {
          deliveryEta: form.deliveryEta.trim() || "35-45 წთ",
        },
      };

      if (editingId) {
        await apiPatch(`/ecommerce-products/${editingId}`, payload);
      } else {
        await apiPost("/ecommerce-products", payload);
      }

      resetForm();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "პროდუქტის შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: DeliveryProduct) => {
    const id = productId(product);
    if (!id || !confirm("წავშალოთ ეს პროდუქტი?")) return;
    await apiDelete(`/ecommerce-products/${id}`);
    await load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">მიტანის პროდუქტები</h1>
          <p className="mt-1 text-sm text-gray-500">
            აქ დამატებული პროდუქტები გამოჩნდება აპის “ავტო მიტანა” გვერდზე.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
          {loading ? "იტვირთება..." : `${rows.length} პროდუქტი`}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? "პროდუქტის რედაქტირება" : "ახალი პროდუქტი"}
          </h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-lg border px-3 py-2 text-sm">
              გაუქმება
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-gray-700">
            სახელი
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Shell Helix Ultra 5W-30 4L"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            კატეგორია
            <select
              className="w-full rounded-lg border px-3 py-2 font-normal"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {DELIVERY_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            ფასი
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="132.00"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            ძველი ფასი
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              type="number"
              step="0.01"
              value={form.originalPrice}
              onChange={(event) => setForm({ ...form, originalPrice: event.target.value })}
              placeholder="150.00"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            ბრენდი
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              value={form.brand}
              onChange={(event) => setForm({ ...form, brand: event.target.value })}
              placeholder="Shell"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            მიტანის დრო
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              value={form.deliveryEta}
              onChange={(event) => setForm({ ...form, deliveryEta: event.target.value })}
              placeholder="35-45 წთ"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            SKU
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            საწყობი
            <input
              className="w-full rounded-lg border px-3 py-2 font-normal"
              type="number"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1 text-sm font-medium text-gray-700">
          აღწერა
          <textarea
            className="w-full rounded-lg border px-3 py-2 font-normal"
            rows={4}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="პროდუქტის მოკლე აღწერა"
          />
        </label>

        <div className="mt-4">
          <div className="mb-1 text-sm font-medium text-gray-700">ფოტოები</div>
          <ImageUpload
            value={form.images}
            onChange={(images) => setForm({ ...form, images })}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(event) => setForm({ ...form, inStock: event.target.checked })}
            />
            საწყობშია
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            აქტიური
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
            />
            რჩეული მიტანა
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "ინახება..." : editingId ? "განახლება" : "დამატება"}
        </button>
      </form>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">სია</h2>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm md:w-72"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ძებნა..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((product) => {
            const id = productId(product);
            const img = product.images?.[0];
            return (
              <div key={id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="h-44 bg-gray-50">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={product.title} className="h-full w-full object-contain p-3" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      ფოტო არ არის
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="text-xs text-blue-600">{categoryLabel(product.category)}</div>
                    <h3 className="line-clamp-2 font-semibold text-gray-900">{product.title}</h3>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-900">{Number(product.price || 0).toFixed(2)}₾</span>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                      {String(product.specifications?.deliveryEta || "35-45 წთ")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(product)}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    >
                      რედაქტირება
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(product)}
                      className="rounded-lg border border-red-100 px-3 py-2 text-sm text-red-600"
                    >
                      წაშლა
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">პროდუქტები ჯერ არ არის</div>
        ) : null}
      </div>
    </div>
  );
}
