"use client";

import { useEffect, useState } from "react";
import { apiGetJson, apiPost, apiPatch, apiDelete } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type Service = {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  category?: string;
  location?: string;
  address?: string;
  phone?: string;
  price?: string | number;
  rating?: number;
  reviews?: number;
  images?: string[];
  avatar?: string;
  services?: string[];
  features?: string;
  isOpen?: boolean;
  waitTime?: string;
  workingHours?: string;
  status?: string;
  createdAt?: string;
  latitude?: number;
  longitude?: number;
};

// Fallback კატეგორიები
const DEFAULT_CATEGORIES = ["ავტოსერვისი", "სამრეცხაო", "დეტეილინგი", "სხვა"];
const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "ახალქალაქი", "ოზურგეთი", "ტყიბული", "სხვა"];
const STATUSES = ["active", "inactive", "pending"];
const AVAILABLE_SERVICES = [
  "ძრავის შეკეთება",
  "ტრანსმისიის შეკეთება",
  "ფარების შეკეთება",
  "საბურავების შეცვლა",
  "ბლოკ-ფარების შეკეთება",
  "ინტერიერის შეკეთება",
  "ელექტრონიკის შეკეთება",
  "ჰიდრავლიკის შეკეთება",
  "საბურავების დაბალანსება",
  "საწვავის სისტემის შეკეთება",
  "გაგრილების სისტემის შეკეთება",
  "საბრეიკო სისტემის შეკეთება",
  "საბურავების შეკეთება",
  "სხვა"
];

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    address: "",
    phone: "",
    price: "",
    rating: "",
    reviews: "",
    images: [] as string[],
    avatar: "",
    services: [] as string[],
    features: "",
    isOpen: true,
    waitTime: "",
    workingHours: "",
    status: "active",
    latitude: "",
    longitude: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: Service[] } | Service[]>(`/services`);
      const data = Array.isArray(res) ? res : (res.success ? res.data : []);
      setServices((data || []).map((s) => ({ ...s, id: s.id || (s as any)._id })));
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setError(message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    try {
      const res = await apiGetJson<{ success: boolean; data: any[] }>("/categories");
      const allCategories = res.success ? res.data : [];
      // Find service categories or categories with 'service' in serviceTypes
      const serviceCategories = allCategories.filter(
        (cat: any) => cat.serviceTypes?.includes("service") || cat.nameEn?.toLowerCase().includes("service")
      );
      
      if (serviceCategories.length > 0) {
        // Use category names from API
        setCategories(serviceCategories.map((cat: any) => cat.name));
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
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category || "ავტოსერვისი",
        location: form.location.trim(),
        address: form.address.trim(),
        phone: normalizePhone(form.phone.trim()),
        images: form.images,
        isOpen: form.isOpen,
        status: form.status,
      };

      if (form.price) payload.price = form.price;
      if (form.rating) payload.rating = parseFloat(form.rating);
      if (form.reviews) payload.reviews = parseInt(form.reviews);
      if (form.avatar) payload.avatar = form.avatar;
      if (form.services && form.services.length > 0) payload.services = form.services;
      if (form.features) payload.features = form.features;
      if (form.waitTime) payload.waitTime = form.waitTime;
      if (form.workingHours) payload.workingHours = form.workingHours;
      if (form.latitude) payload.latitude = parseFloat(form.latitude);
      if (form.longitude) payload.longitude = parseFloat(form.longitude);

      if (editingId) {
        await apiPatch(`/services/${editingId}`, payload);
      } else {
        await apiPost("/services/create", payload);
      }

      setShowForm(false);
      setEditingId(null);
      setForm({
        name: "",
        description: "",
        category: "",
        location: "",
        address: "",
        phone: "",
        price: "",
        rating: "",
        reviews: "",
        images: [],
        avatar: "",
        services: [] as string[],
        features: "",
        isOpen: true,
        waitTime: "",
        workingHours: "",
        status: "active",
        latitude: "",
        longitude: "",
      });
      load();
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Save failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id || "");
    setForm({
      name: service.name || "",
      description: service.description || "",
      category: service.category || "",
      location: service.location || "",
      address: service.address || "",
      phone: service.phone || "",
      price: service.price?.toString() || "",
      rating: service.rating?.toString() || "",
      reviews: service.reviews?.toString() || "",
      images: service.images || [],
      avatar: service.avatar || "",
      services: service.services || [],
      features: service.features || "",
      isOpen: service.isOpen ?? true,
      waitTime: service.waitTime || "",
      workingHours: service.workingHours || "",
      status: service.status || "active",
      latitude: service.latitude?.toString() || "",
      longitude: service.longitude?.toString() || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) return;
    setLoading(true);
    try {
      await apiDelete(`/services/${id}`);
      load();
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Delete failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">სერვისები</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({
              name: "",
              description: "",
              category: "",
              location: "",
              address: "",
              phone: "",
              price: "",
              rating: "",
              reviews: "",
              images: [],
              avatar: "",
              services: [] as string[],
              features: "",
              isOpen: true,
              waitTime: "",
              workingHours: "",
              status: "active",
              latitude: "",
              longitude: "",
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + ახალი სერვისი
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "რედაქტირება" : "ახალი სერვისი"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  სახელი <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="სერვისის სახელი"
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
                  ლოკაცია <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                >
                  <option value="">აირჩიეთ ლოკაცია</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  მისამართი <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="სრული მისამართი"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border rounded px-3 py-2"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="41.7151"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border rounded px-3 py-2"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="44.8271"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ტელეფონი <span className="text-red-500">*</span>
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
                  ფასი
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="მაგ. 50₾"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  რეიტინგი
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="0-5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  მიმოხილვები
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={form.reviews}
                  onChange={(e) => setForm({ ...form, reviews: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  სერვისები
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                  {AVAILABLE_SERVICES.map((service) => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.services.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, services: [...form.services, service] });
                          } else {
                            setForm({ ...form, services: form.services.filter(s => s !== service) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
                {form.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.services.map((service) => (
                      <span
                        key={service}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ფუნქციები
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="ფუნქციები"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  მოლოდინის დრო
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.waitTime}
                  onChange={(e) => setForm({ ...form, waitTime: e.target.value })}
                  placeholder="მაგ. 15 წუთი"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  სამუშაო საათები
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.workingHours}
                  onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                  placeholder="მაგ. 09:00 - 18:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  სტატუსი
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isOpen"
                  checked={form.isOpen}
                  onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isOpen" className="text-sm font-medium">
                  ღიაა
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                აღწერა <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="სერვისის აღწერა"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Avatar URL
              </label>
              <input
                type="url"
                className="w-full border rounded px-3 py-2"
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                სურათები
              </label>
              <ImageUpload
                value={form.images}
                onChange={(urls) => setForm({ ...form, images: urls })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                {loading ? "შენახვა..." : editingId ? "განახლება" : "დამატება"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border rounded"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showForm ? (
        <div className="text-center py-8">იტვირთება...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          სერვისები არ არის
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {service.images && service.images.length > 0 ? (
                <img
                  src={service.images[0]}
                  alt={service.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">სურათი არ არის</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    service.status === 'active' ? 'bg-green-100 text-green-800' :
                    service.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {service.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{service.category}</p>
                <p className="text-sm text-gray-500 mb-2">
                  <span className="font-medium">ლოკაცია:</span> {service.location}
                </p>
                {service.address && (
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">მისამართი:</span> {service.address}
                  </p>
                )}
                {service.phone && (
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">ტელეფონი:</span> {service.phone}
                  </p>
                )}
                {service.price && (
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    ფასი: {service.price}
                  </p>
                )}
                {service.rating && (
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">რეიტინგი:</span> {service.rating} ⭐
                  </p>
                )}
                {service.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
            )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(service)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    რედაქტირება
                  </button>
                  <button
                    onClick={() => handleDelete(service.id || "")}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    წაშლა
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
      )}
    </div>
  );
}
