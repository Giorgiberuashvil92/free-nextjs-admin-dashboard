"use client";
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiGetJson, apiPost, apiPatch, apiDelete } from "@/lib/api";

type CarBrand = {
  _id?: string;
  id?: string;
  name: string;
  models?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type BrandListItem = {
  name: string;
  models: string[];
};

export default function CarBrandsPage() {
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<CarBrand | null>(null);
  const [form, setForm] = useState<{ name: string }>({ name: "" });
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [newModelName, setNewModelName] = useState<Record<string, string>>({});
  const [editingModel, setEditingModel] = useState<{ brandId: string; oldName: string; newName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<any>("/car-brands");
      
      console.log("Car brands API response:", res);
      
      // Handle different response formats:
      // 1. Array of brands
      // 2. Object with success and data array
      // 3. Object with data array
      // 4. Single brand object (wrap in array)
      let data: CarBrand[] = [];
      
      if (Array.isArray(res)) {
        data = res;
      } else if (res && typeof res === 'object') {
        // Check if it's a single brand object (has _id or id and name)
        if (('_id' in res || 'id' in res) && 'name' in res) {
          // Single brand object - wrap in array
          data = [res];
        } else if ('data' in res && Array.isArray(res.data)) {
          // Object with data array
          data = res.data;
        } else if ('success' in res && res.success && 'data' in res && Array.isArray(res.data)) {
          // Object with success and data array
          data = res.data;
        }
      }
      
      console.log("Parsed car brands data:", data);
      
      setBrands(
        (data || []).map((b) => ({
          ...b,
          id: b.id || b._id,
        }))
      );
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setError(message);
      setBrands([]);
      console.error("Error loading car brands:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("გთხოვთ შეიყვანოთ ბრენდის სახელი");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingBrand) {
        const brandId = editingBrand.id || editingBrand._id;
        if (!brandId) {
          setError("ბრენდის ID არ მოიძებნა");
          return;
        }
        await apiPatch(`/car-brands/${brandId}`, { name: form.name.trim() });
      } else {
        await apiPost("/car-brands", { name: form.name.trim() });
      }

      setShowForm(false);
      setEditingBrand(null);
      setForm({ name: "" });
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

  const handleEdit = (brand: CarBrand) => {
    setEditingBrand(brand);
    setForm({ name: brand.name });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ნამდვილად გსურთ ამ ბრენდის წაშლა?")) return;

    setLoading(true);
    setError("");
    try {
      await apiDelete(`/car-brands/${id}`);
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

  const toggleExpand = (brandId: string) => {
    const newExpanded = new Set(expandedBrands);
    if (newExpanded.has(brandId)) {
      newExpanded.delete(brandId);
    } else {
      newExpanded.add(brandId);
    }
    setExpandedBrands(newExpanded);
  };

  const handleAddModel = async (brandId: string) => {
    const modelName = newModelName[brandId]?.trim();
    if (!modelName) {
      setError("გთხოვთ შეიყვანოთ მოდელის სახელი");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost(`/car-brands/${brandId}/models`, { name: modelName });
      setNewModelName({ ...newModelName, [brandId]: "" });
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

  const handleDeleteModel = async (brandId: string, modelName: string) => {
    if (!confirm(`ნამდვილად გსურთ "${modelName}" მოდელის წაშლა?`)) return;

    setLoading(true);
    setError("");
    try {
      await apiDelete(`/car-brands/${brandId}/models/${encodeURIComponent(modelName)}`);
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

  const handleEditModel = (brandId: string, modelName: string) => {
    setEditingModel({ brandId, oldName: modelName, newName: modelName });
  };

  const handleSaveModelEdit = async () => {
    if (!editingModel || !editingModel.newName.trim()) {
      setError("გთხოვთ შეიყვანოთ მოდელის სახელი");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // წავშალოთ ძველი და დავამატოთ ახალი
      await apiDelete(`/car-brands/${editingModel.brandId}/models/${encodeURIComponent(editingModel.oldName)}`);
      await apiPost(`/car-brands/${editingModel.brandId}/models`, { name: editingModel.newName.trim() });
      setEditingModel(null);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            მანქანის ბრენდები
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ბრენდებისა და მოდელების მართვა
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingBrand(null);
            setForm({ name: "" });
          }}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          + ახალი ბრენდი
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingBrand ? "ბრენდის რედაქტირება" : "ახალი ბრენდი"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBrand(null);
                    setForm({ name: "" });
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    ბრენდის სახელი *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    placeholder="მაგ: Toyota, BMW, Mercedes-Benz"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-black text-white rounded disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {loading ? "შენახვა..." : "შენახვა"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingBrand(null);
                      setForm({ name: "" });
                    }}
                    className="flex-1 px-4 py-2 border rounded dark:border-gray-600 dark:text-white"
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
        <div className="text-center py-8 text-gray-500">იტვირთება...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ბრენდი
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მოდელები
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    ბრენდები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                brands.map((brand) => {
                  const brandId = brand.id || brand._id || '';
                  return (
                  <React.Fragment key={brandId}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {brand.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {brand.models?.length || 0} მოდელი
                          </span>
                          <button
                            onClick={() => toggleExpand(brandId)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                          >
                            {expandedBrands.has(brandId) ? "დამალვა" : "ნახვა"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(brand)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            რედაქტირება
                          </button>
                          <button
                            onClick={() => handleDelete(brandId)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          >
                            წაშლა
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedBrands.has(brandId) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 bg-gray-50 dark:bg-gray-900/30">
                          <div className="space-y-4">
                            {/* Models List */}
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                მოდელები:
                              </h3>
                              {brand.models && brand.models.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {brand.models.map((model, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 border rounded dark:border-gray-700"
                                    >
                                      {editingModel?.brandId === brandId && editingModel?.oldName === model ? (
                                        <>
                                          <input
                                            type="text"
                                            value={editingModel.newName}
                                            onChange={(e) =>
                                              editingModel && setEditingModel({ ...editingModel, newName: e.target.value })
                                            }
                                            className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleSaveModelEdit();
                                              } else if (e.key === "Escape") {
                                                setEditingModel(null);
                                              }
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={handleSaveModelEdit}
                                            className="text-green-600 dark:text-green-400 hover:underline text-xs"
                                          >
                                            შენახვა
                                          </button>
                                          <button
                                            onClick={() => setEditingModel(null)}
                                            className="text-gray-600 dark:text-gray-400 hover:underline text-xs"
                                          >
                                            გაუქმება
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-sm text-gray-900 dark:text-white">{model}</span>
                                          <button
                                            onClick={() => handleEditModel(brandId, model)}
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                          >
                                            რედაქტირება
                                          </button>
                                          <button
                                            onClick={() => handleDeleteModel(brandId, model)}
                                            className="text-red-600 dark:text-red-400 hover:underline text-xs"
                                          >
                                            წაშლა
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  მოდელები არ არის დამატებული
                                </p>
                              )}
                            </div>

                            {/* Add Model Form */}
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                ახალი მოდელის დამატება:
                              </h3>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newModelName[brandId] || ""}
                                  onChange={(e) =>
                                    setNewModelName({ ...newModelName, [brandId]: e.target.value })
                                  }
                                  placeholder="მოდელის სახელი"
                                  className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleAddModel(brandId);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleAddModel(brandId)}
                                  disabled={loading}
                                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                                >
                                  დამატება
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
