"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGetJson, apiPut } from "@/lib/api";

const RADAR_TYPES = [
  { value: 'fixed', label: 'ფიქსირებული რადარი' },
  { value: 'mobile', label: 'მობილური რადარი' },
  { value: 'average_speed', label: 'საშუალო სიჩქარის რადარი' },
];

type Radar = {
  _id?: string;
  id?: string;
  latitude: number;
  longitude: number;
  type: 'fixed' | 'mobile' | 'average_speed';
  speedLimit?: number;
  address?: string;
  direction?: string;
  description?: string;
  isActive: boolean;
  fineCount?: number;
};

export default function EditRadarPage() {
  const router = useRouter();
  const params = useParams();
  const radarId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    latitude: "",
    longitude: "",
    type: "fixed" as 'fixed' | 'mobile' | 'average_speed',
    speedLimit: "",
    address: "",
    direction: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    const loadRadar = async () => {
      try {
        setLoadingRadar(true);
        const res = await apiGetJson<{ success: boolean; data: Radar } | Radar>(`/radars/${radarId}`);
        const radar: Radar = 'success' in res && res.success ? (res as { success: boolean; data: Radar }).data : res as Radar;
        
        setForm({
          latitude: radar.latitude?.toString() || "",
          longitude: radar.longitude?.toString() || "",
          type: radar.type || "fixed",
          speedLimit: radar.speedLimit?.toString() || "",
          address: radar.address || "",
          direction: radar.direction || "",
          description: radar.description || "",
          isActive: radar.isActive !== undefined ? radar.isActive : true,
        });
      } catch (e: any) {
        console.error("Error loading radar:", e);
        setError("რადარის ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoadingRadar(false);
      }
    };

    if (radarId) {
      loadRadar();
    }
  }, [radarId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.latitude || !form.longitude || !form.type) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError("კოორდინატები უნდა იყოს რიცხვები");
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
      };

      await apiPut(`/radars/${radarId}`, payload);
      router.push("/radars");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e 
        ? String((e as { message?: string }).message) 
        : "შეცდომა რადარის განახლებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRadar) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">იტვირთება...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">რადარის რედაქტირება</h1>
        <p className="text-gray-600 mt-1">განაახლეთ რადარის ინფორმაცია</p>
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
              required
            />
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
              required
            />
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
            {loading ? "იტვირთება..." : "განახლება"}
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
