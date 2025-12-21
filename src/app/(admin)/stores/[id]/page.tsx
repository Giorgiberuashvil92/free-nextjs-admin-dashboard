"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";

type StoreDetail = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  ownerId?: string;
  address?: string;
  phone?: string;
  type?: string;
  location?: string;
  description?: string;
  workingHours?: string;
  images?: string[];
  email?: string;
  website?: string;
  services?: string[];
  specializations?: string[];
  ownerName?: string;
  managerName?: string;
  alternativePhone?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  yearEstablished?: number;
  employeeCount?: number;
  license?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/stores/${id}?t=${Date.now()}`, { 
          cache: "no-store", 
          headers: { 'Cache-Control': 'no-cache' } 
        });
        const json = await res.json();
        // Handle both { data: ... } and direct response formats
        const storeData = json?.data || json;
        setData(storeData);
      } catch (error) {
        console.error("Error loading store:", error);
        alert("მაღაზიის ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
    const onFocus = () => id && load();
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => { 
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus); 
    };
  }, [id]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const updated = await res.json();
      setData(updated?.data || updated);
      setEditing(false);
      alert("წარმატებით შენახულია!");
    } catch (error) {
      console.error("Error saving store:", error);
      alert("შეცდომა შენახვისას");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  const storeName = data.title || data.name || "Unnamed Store";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-2 py-1 border rounded">
            Back
          </button>
          <h1 className="text-2xl font-semibold">{storeName}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
            {data.id || data._id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                className="px-3 py-2 text-sm border rounded"
                onClick={() => {
                  setEditing(false);
                  // Reload data to reset changes
                  window.location.reload();
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded disabled:opacity-60"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button
              className="px-3 py-2 text-sm border rounded"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">კონტაქტი</div>
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500">სახელი</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.name || ""}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">ტელეფონი</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.phone || ""}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">ალტერნატიული ტელეფონი</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.alternativePhone || ""}
                  onChange={(e) => setData({ ...data, alternativePhone: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-medium">სახელი:</span> {data.name || "-"}
              </div>
              <div>
                <span className="font-medium">ტელეფონი:</span>{" "}
                {data.phone ? (
                  <a className="text-blue-600" href={`tel:${data.phone}`}>
                    {data.phone}
                  </a>
                ) : (
                  "-"
                )}
              </div>
              {data.alternativePhone && (
                <div>
                  <span className="font-medium">ალტერნატიული:</span>{" "}
                  <a className="text-blue-600" href={`tel:${data.alternativePhone}`}>
                    {data.alternativePhone}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">მისამართი</div>
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500">ქალაქი</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.location || ""}
                  onChange={(e) => setData({ ...data, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">ზუსტი მისამართი</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.address || ""}
                  onChange={(e) => setData({ ...data, address: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="font-medium">ქალაქი:</span> {data.location || "-"}
              </div>
              <div>
                <span className="font-medium">მისამართი:</span> {data.address || "-"}
              </div>
            </>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">ინფორმაცია</div>
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500">ტიპი</label>
                <select
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.type || ""}
                  onChange={(e) => setData({ ...data, type: e.target.value })}
                >
                  <option value="">აირჩიეთ</option>
                  <option value="ავტონაწილები">ავტონაწილები</option>
                  <option value="სამართ-დასახურებელი">სამართ-დასახურებელი</option>
                  <option value="რემონტი">რემონტი</option>
                  <option value="სხვა">სხვა</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Owner ID</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.ownerId || ""}
                  onChange={(e) => setData({ ...data, ownerId: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {data.type && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
                    {data.type}
                  </span>
                )}
                {data.location && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
                    {data.location}
                  </span>
                )}
              </div>
              <div>
                <span className="font-medium">Owner:</span> {data.ownerId || "-"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">აღწერა</h2>
        {editing ? (
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={data.description || ""}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="მაღაზიის აღწერა..."
          />
        ) : (
          <p className="text-gray-700">{data.description || "აღწერა არ არის დამატებული"}</p>
        )}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold mb-3">დამატებითი ინფორმაცია</h2>
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500">სამუშაო საათები</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.workingHours || ""}
                  onChange={(e) => setData({ ...data, workingHours: e.target.value })}
                  placeholder="მაგ. 09:00-19:00 (ორშ-პარ)"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  type="email"
                  value={data.email || ""}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Website</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.website || ""}
                  onChange={(e) => setData({ ...data, website: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              {data.workingHours && (
                <div>
                  <span className="font-medium">სამუშაო საათები:</span> {data.workingHours}
                </div>
              )}
              {data.email && (
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  <a className="text-blue-600" href={`mailto:${data.email}`}>
                    {data.email}
                  </a>
                </div>
              )}
              {data.website && (
                <div>
                  <span className="font-medium">Website:</span>{" "}
                  <a className="text-blue-600" href={data.website} target="_blank" rel="noopener noreferrer">
                    {data.website}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold mb-3">სოციალური ქსელები</h2>
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500">Facebook</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.facebook || ""}
                  onChange={(e) => setData({ ...data, facebook: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Instagram</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.instagram || ""}
                  onChange={(e) => setData({ ...data, instagram: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">YouTube</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.youtube || ""}
                  onChange={(e) => setData({ ...data, youtube: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              {data.facebook && (
                <div>
                  <span className="font-medium">Facebook:</span>{" "}
                  <a className="text-blue-600" href={data.facebook} target="_blank" rel="noopener noreferrer">
                    {data.facebook}
                  </a>
                </div>
              )}
              {data.instagram && (
                <div>
                  <span className="font-medium">Instagram:</span>{" "}
                  <a className="text-blue-600" href={data.instagram} target="_blank" rel="noopener noreferrer">
                    {data.instagram}
                  </a>
                </div>
              )}
              {data.youtube && (
                <div>
                  <span className="font-medium">YouTube:</span>{" "}
                  <a className="text-blue-600" href={data.youtube} target="_blank" rel="noopener noreferrer">
                    {data.youtube}
                  </a>
                </div>
              )}
              {!data.facebook && !data.instagram && !data.youtube && (
                <div className="text-gray-400 text-sm">სოციალური ქსელები არ არის დამატებული</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">გალერეა</h2>
        </div>
        {editing ? (
          <ImageUpload
            value={data.images || []}
            onChange={(urls) => setData({ ...data, images: urls })}
            maxImages={10}
            folder="stores"
            label="სურათები"
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.images && data.images.length > 0 ? (
              data.images.map((url, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Store ${idx + 1}`}
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">სურათები არ არის დამატებული</div>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">მეტადატა</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">ID:</span> {data.id || data._id || "-"}
          </div>
          <div>
            <span className="text-gray-500">Owner ID:</span> {data.ownerId || "-"}
          </div>
          {data.createdAt && (
            <div>
              <span className="text-gray-500">შექმნილია:</span>{" "}
              {new Date(data.createdAt).toLocaleString()}
            </div>
          )}
          {data.updatedAt && (
            <div>
              <span className="text-gray-500">განახლებულია:</span>{" "}
              {new Date(data.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

