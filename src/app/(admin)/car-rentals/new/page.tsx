"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

const CATEGORIES = ["ეკონომი", "კომფორტი", "ლუქსი", "SUV", "მინივენი"];
const LOCATIONS = ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "გორი", "ზუგდიდი", "ფოთი", "სხვა"];
const TRANSMISSIONS = ["მექანიკა", "ავტომატიკა"];
const FUEL_TYPES = ["ბენზინი", "დიზელი", "ჰიბრიდი", "ელექტრო"];

export default function NewCarRentalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    category: "",
    pricePerDay: 0,
    pricePerWeek: 0,
    pricePerMonth: 0,
    images: [] as string[],
    description: "",
    features: [] as string[],
    transmission: "",
    fuelType: "",
    seats: 5,
    location: "",
    address: "",
    phone: "",
    email: "",
    deposit: 100,
    minRentalDays: 1,
    maxRentalDays: 30,
    available: true,
    latitude: "",
    longitude: "",
  });

  const [featureInput, setFeatureInput] = useState("");

  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+995") || phone.startsWith("995")) return phone;
    return "+995" + phone;
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.brand?.trim() || !form.model?.trim() || !form.category || !form.transmission || !form.fuelType || !form.location) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const payload = {
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year,
        category: form.category,
        pricePerDay: Number(form.pricePerDay),
        pricePerWeek: form.pricePerWeek ? Number(form.pricePerWeek) : undefined,
        pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : undefined,
        images: form.images.filter(Boolean),
        description: form.description.trim() || undefined,
        features: form.features.filter(Boolean),
        transmission: form.transmission,
        fuelType: form.fuelType,
        seats: Number(form.seats),
        location: form.location,
        address: form.address.trim() || undefined,
        phone: normalizePhone(form.phone.trim()),
        email: form.email.trim() || undefined,
        deposit: Number(form.deposit),
        minRentalDays: form.minRentalDays ? Number(form.minRentalDays) : undefined,
        maxRentalDays: form.maxRentalDays ? Number(form.maxRentalDays) : undefined,
        available: form.available,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      };

      await apiPost("/car-rental", payload);
      router.push("/car-rentals");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e 
        ? String((e as { message?: string }).message) 
        : "შეცდომა მანქანის დამატებისას";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🚗 ახალი მანქანის დამატება</h1>
        <p className="text-gray-600 mt-1">შეიყვანეთ მანქანის სრული ინფორმაცია</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">ძირითადი ინფორმაცია</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                ბრენდი <span className="text-red-500">*</span>
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
                მოდელი <span className="text-red-500">*</span>
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
                წელი <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                min={2000}
                max={new Date().getFullYear() + 1}
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                ტრანსმისია <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.transmission}
                onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                required
              >
                <option value="">აირჩიეთ ტრანსმისია</option>
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                საწვავის ტიპი <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                required
              >
                <option value="">აირჩიეთ საწვავი</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                ადგილების რაოდენობა <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                min={2}
                max={15}
                required
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
                <span className="text-sm font-medium">ხელმისაწვდომია</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              აღწერა
            </label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="მანქანის დეტალური აღწერა..."
              rows={3}
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">ფასები (GEL)</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                დღეში <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.pricePerDay}
                onChange={(e) => setForm({ ...form, pricePerDay: Number(e.target.value) })}
                min={0}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                კვირაში
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.pricePerWeek || ""}
                onChange={(e) => setForm({ ...form, pricePerWeek: Number(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                თვეში
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.pricePerMonth || ""}
                onChange={(e) => setForm({ ...form, pricePerMonth: Number(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                დეპოზიტი
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.deposit}
                onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                მინ. დღეები
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.minRentalDays || ""}
                onChange={(e) => setForm({ ...form, minRentalDays: Number(e.target.value) || 1 })}
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                მაქს. დღეები
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.maxRentalDays || ""}
                onChange={(e) => setForm({ ...form, maxRentalDays: Number(e.target.value) || 30 })}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">მდებარეობა და კონტაქტი</h2>
          
          <div className="grid grid-cols-2 gap-4">
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
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
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

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                მისამართი
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="ზუსტი მისამართი..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                ელ. ფოსტა
              </label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@gmail.com"
              />
            </div>

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
        </div>

        {/* Features Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">მახასიათებლები</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border rounded px-3 py-2"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="დაამატეთ მახასიათებელი (GPS, Bluetooth, ...)"
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
            />
            <button
              type="button"
              onClick={addFeature}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              დამატება
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.features.map((feature, index) => (
              <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                <span>{feature}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">სურათები</h2>
          <ImageUpload
            value={form.images}
            onChange={(images: string[]) => setForm({ ...form, images })}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded hover:bg-gray-100"
            disabled={loading}
          >
            გაუქმება
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "დამატება..." : "დამატება"}
          </button>
        </div>
      </form>
    </div>
  );
}

