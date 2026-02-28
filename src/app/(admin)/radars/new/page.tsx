"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";

const RADAR_TYPES = [
  { value: 'fixed', label: 'ფიქსირებული რადარი' },
  { value: 'mobile', label: 'მობილური რადარი' },
  { value: 'average_speed', label: 'საშუალო სიჩქარის რადარი' },
];

export default function NewRadarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    latitude: "",
    longitude: "",
    type: "fixed" as 'fixed' | 'mobile' | 'average_speed',
    speedLimit: "60",
    address: "",
    direction: "",
    description: "",
    isActive: true,
  });

  // Load coordinates from URL query params if available
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      setForm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.latitude || !form.longitude || !form.type) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი (კოორდინატები, ტიპი)");
      return;
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError("კოორდინატები უნდა იყოს რიცხვები");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("კოორდინატები არასწორია");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        latitude: lat,
        longitude: lng,
        type: form.type,
        speedLimit: form.speedLimit ? parseInt(form.speedLimit) : undefined,
        address: form.address.trim() || undefined,
        direction: form.direction.trim() || undefined,
        description: form.description.trim() || undefined,
        isActive: form.isActive,
        fineCount: 0,
      };

      await apiPost("/radars", payload);
      router.push("/radars");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e 
        ? String((e as { message?: string }).message) 
        : "შეცდომა რადარის დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ახალი რადარი</h1>
        <p className="text-gray-600 mt-1">შეიყვანეთ რადარის ინფორმაცია</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              განედი (Latitude) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              className="w-full border rounded px-3 py-2"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="მაგ. 41.7151"
              required
            />
            <p className="text-xs text-gray-500 mt-1">თბილისი: 41.7151</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              გრძედი (Longitude) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              className="w-full border rounded px-3 py-2"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="მაგ. 44.8271"
              required
            />
            <p className="text-xs text-gray-500 mt-1">თბილისი: 44.8271</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            რადარის ტიპი <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            required
          >
            {RADAR_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            სიჩქარის ლიმიტი (კმ/სთ)
          </label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={form.speedLimit}
            onChange={(e) => setForm({ ...form, speedLimit: e.target.value })}
            placeholder="60"
            min="0"
            max="200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            მისამართი
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="მაგ. ვაზიანის გზატკეცილი, თბილისი"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            მიმართულება
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            placeholder="მაგ. თბილისი-რუსთავი"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            აღწერა
          </label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="რადარის დეტალური აღწერა..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700 font-medium cursor-pointer">
            აქტიური რადარი
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
