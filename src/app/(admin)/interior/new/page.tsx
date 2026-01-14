"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "ახალქალაქი", "ოზურგეთი", "ტყიბული", "სხვა"];

const INTERIOR_TYPES = ["ავტომობილის ინტერიერი"];

export default function NewInteriorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    title: "",
    type: "ავტომობილის ინტერიერი", // Default type
    location: "",
    address: "",
    description: "",
    workingHours: "",
    ownerId: "",
    images: [] as string[],
    latitude: "",
    longitude: "",
  });

  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+995") || phone.startsWith("995")) return phone;
    return "+995" + phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        phone: normalizePhone(form.phone),
        title: form.title,
        type: form.type, // Use selected type from form
        location: form.location,
        address: form.address,
        description: form.description,
        workingHours: form.workingHours || undefined,
        ownerId: form.ownerId || undefined,
        images: form.images,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      };

      const result = await apiPost("/interior", payload) as { success?: boolean; message?: string };
      if (result.success) {
        router.push("/interior");
      } else {
        setError(result.message || "შეცდომა მოხდა");
      }
    } catch (err: any) {
      setError(err?.message || "შეცდომა მოხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ახალი ინტერიერის მაღაზია</h1>
        <p className="text-gray-600 mt-1">შეიყვანეთ ინტერიერის მაღაზიის ინფორმაცია</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            კონტაქტი (სახელი) <span className="text-red-500">*</span>
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
            მაღაზიის სახელი <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="მაგ. Premium Interior"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            მაღაზიის ტიპი <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          >
            {INTERIOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
            მისამართი <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="მაგ. რუსთაველის გამზირი 12"
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
            placeholder="მაღაზიის აღწერა"
            required
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
            Owner ID
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            placeholder="მაღაზიის მფლობელის ID"
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

        <ImageUpload
          value={form.images}
          onChange={(urls) => setForm({ ...form, images: urls })}
          maxImages={5}
          folder="stores"
          label="სურათები"
        />

        <div className="flex gap-3">
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

