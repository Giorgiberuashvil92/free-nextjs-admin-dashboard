"use client";
import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, apiGetJson } from "@/lib/api";

type Category = {
  _id?: string;
  id?: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
  image: string;
  isActive: boolean;
  order: number;
  parentId?: string;
  serviceTypes: string[];
  popularity: number;
  viewCount: number;
  clickCount: number;
  createdAt?: string;
  updatedAt?: string;
};

const COMMON_ICONS = [
  "water",
  "construct",
  "storefront",
  "build",
  "cog",
  "car",
  "shield-checkmark",
  "key",
  "car-sport",
  "settings",
  "flash",
  "disc",
  "thermometer",
  "location",
  "star",
  "grid",
];

const COMMON_SERVICE_TYPES = [
  "carwash",
  "mechanic",
  "store",
  "dismantler",
  "part",
  "parking",
  "insurance",
  "rental",
];

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<Partial<Category>>({
    name: "",
    nameEn: "",
    description: "",
    icon: "grid",
    color: "#6366F1",
    image: "",
    isActive: true,
    order: 0,
    parentId: "",
    serviceTypes: [],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: Category[] }>(
        "/categories"
      );
      const data = res.success ? res.data : [];
      setCategories(
        (data || []).map((c) => ({
          ...c,
          id: c.id || c._id,
        }))
      );
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setError(message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.nameEn?.trim() || !form.description?.trim()) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const categoryData = {
        ...form,
        order: form.order || 0,
        serviceTypes: form.serviceTypes || [],
        parentId: form.parentId?.trim() || undefined,
        image: form.image?.trim() || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400",
      };

      if (editingCategory) {
        await apiPatch(`/categories/${editingCategory.id}`, categoryData);
      } else {
        await apiPost("/categories", categoryData);
      }

      setShowForm(false);
      setEditingCategory(null);
      setForm({
        name: "",
        nameEn: "",
        description: "",
        icon: "grid",
        color: "#6366F1",
        image: "",
        isActive: true,
        order: 0,
        parentId: "",
        serviceTypes: [],
      });
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      nameEn: category.nameEn,
      description: category.description,
      icon: category.icon,
      color: category.color,
      image: category.image,
      isActive: category.isActive,
      order: category.order,
      parentId: category.parentId || "",
      serviceTypes: category.serviceTypes || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ ამ კატეგორიის წაშლა?")) return;

    setLoading(true);
    setError("");
    try {
      await apiDelete(`/categories/${id}`);
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    setLoading(true);
    setError("");
    try {
      await apiPatch(`/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceType = (type: string) => {
    const current = form.serviceTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setForm({ ...form, serviceTypes: updated });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">კატეგორიები</h1>
          <p className="text-sm text-gray-500">
            დინამიური კატეგორიების მართვა
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCategory(null);
            setForm({
              name: "",
              nameEn: "",
              description: "",
              icon: "grid",
              color: "#6366F1",
              image: "",
              isActive: true,
              order: 0,
              parentId: "",
              serviceTypes: [],
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + ახალი კატეგორია
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {editingCategory ? "კატეგორიის რედაქტირება" : "ახალი კატეგორია"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      სახელი (ქართული) *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      სახელი (ინგლისური) *
                    </label>
                    <input
                      type="text"
                      value={form.nameEn}
                      onChange={(e) =>
                        setForm({ ...form, nameEn: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    აღწერა *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">იკონა</label>
                    <select
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      {COMMON_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ფერი</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) =>
                          setForm({ ...form, color: e.target.value })
                        }
                        className="w-16 h-10 border rounded"
                      />
                      <input
                        type="text"
                        value={form.color}
                        onChange={(e) =>
                          setForm({ ...form, color: e.target.value })
                        }
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="#6366F1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    სურათის URL
                  </label>
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      მშობელი კატეგორია (ID)
                    </label>
                    <input
                      type="text"
                      value={form.parentId}
                      onChange={(e) =>
                        setForm({ ...form, parentId: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                      placeholder="არასავალდებულო"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">რიგი</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) =>
                        setForm({ ...form, order: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    სერვისის ტიპები
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SERVICE_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 px-3 py-1 border rounded cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.serviceTypes?.includes(type) || false}
                          onChange={() => toggleServiceType(type)}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  <label htmlFor="isActive" className="text-sm">
                    აქტიური
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "იტვირთება..." : "შენახვა"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategory(null);
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    გაუქმება
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading && !showForm ? (
        <div className="text-center py-8">იტვირთება...</div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">სახელი</th>
                <th className="px-3 py-2 text-left">იკონა</th>
                <th className="px-3 py-2 text-left">ფერი</th>
                <th className="px-3 py-2 text-left">სერვისის ტიპები</th>
                <th className="px-3 py-2 text-left">რიგი</th>
                <th className="px-3 py-2 text-left">სტატუსი</th>
                <th className="px-3 py-2 text-left">პოპულარობა</th>
                <th className="px-3 py-2 text-left">მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.nameEn}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-lg">{c.icon}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: c.color }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.serviceTypes?.map((type) => (
                        <span
                          key={type}
                          className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.order}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        c.isActive
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {c.isActive ? "აქტიური" : "არააქტიური"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">
                      <div>ნახვები: {c.viewCount || 0}</div>
                      <div>დაწკაპუნებები: {c.clickCount || 0}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        {c.isActive ? "👁️" : "👁️‍🗨️"}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                    კატეგორიები არ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

