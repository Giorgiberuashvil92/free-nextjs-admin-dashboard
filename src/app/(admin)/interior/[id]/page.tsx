"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { AssignStoreOwnerModal } from "@/components/AssignStoreOwnerModal";
import { useModal } from "@/hooks/useModal";

const INTERIOR_TYPES = [
  "ავტომობილის ინტერიერი"
];

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
  status?: 'pending' | 'active' | 'inactive';
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  totalPaid?: number;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentPeriod?: string;
  createdAt?: string;
  updatedAt?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function InteriorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const { isOpen: isAssignModalOpen, openModal: openAssignModal, closeModal: closeAssignModal } = useModal();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/interior/${id}?t=${Date.now()}`, { 
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
  }, [id]);

  const handleAssignOwnerSuccess = () => {
    load(); // Reload store data
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => { 
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus); 
    };
  }, [load]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/interior/${id}`, {
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
          <button onClick={() => router.push('/interior')} className="px-2 py-1 border rounded">
            Back
          </button>
          <h1 className="text-2xl font-semibold">{storeName}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
            {data.id || data._id}
          </span>
          {/* Status Badge */}
          {data.status === 'active' && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
              აქტიური
            </span>
          )}
          {data.status === 'pending' && (
            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium">
              მოლოდინში
            </span>
          )}
          {data.status === 'inactive' && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
              არააქტიური
            </span>
          )}
          {!data.status && (
            <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-medium">
              მოლოდინში
            </span>
          )}
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
              <div>
                <label className="text-xs text-gray-500">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.latitude || ""}
                  onChange={(e) => setData({ ...data, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="41.7151"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={data.longitude || ""}
                  onChange={(e) => setData({ ...data, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="44.8271"
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
              {data.latitude && data.longitude && (
                <div>
                  <span className="font-medium">კოორდინატები:</span> {data.latitude}, {data.longitude}
                </div>
              )}
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
                  {INTERIOR_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
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
              
              {/* Payment Information Inputs */}
              <div className="mt-3 pt-3 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">გადახდის დეტალები</h3>
                <div>
                  <label className="text-xs text-gray-500">გადახდის თანხა (₾)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.paymentAmount || ""}
                    onChange={(e) => setData({ ...data, paymentAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="9.99"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ბოლო გადახდის თარიღი</label>
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.lastPaymentDate ? new Date(data.lastPaymentDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => setData({ ...data, lastPaymentDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">შემდეგი გადახდის თარიღი</label>
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.nextPaymentDate ? new Date(data.nextPaymentDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => setData({ ...data, nextPaymentDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">სულ გადახდილი (₾)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.totalPaid || 0}
                    onChange={(e) => setData({ ...data, totalPaid: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">გადახდის სტატუსი</label>
                  <select
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.paymentStatus || "pending"}
                    onChange={(e) => setData({ ...data, paymentStatus: e.target.value as 'paid' | 'pending' | 'overdue' })}
                  >
                    <option value="pending">მოლოდინში</option>
                    <option value="paid">გადახდილი</option>
                    <option value="overdue">ვადაგასული</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">გადახდის პერიოდი</label>
                  <select
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={data.paymentPeriod || "monthly"}
                    onChange={(e) => setData({ ...data, paymentPeriod: e.target.value as 'monthly' | 'yearly' })}
                  >
                    <option value="monthly">თვიური</option>
                    <option value="yearly">წლიური</option>
                  </select>
                </div>
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
                {/* Status Badge */}
                {data.status === 'active' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-300 font-medium">
                    აქტიური
                  </span>
                )}
                {data.status === 'pending' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-300 font-medium">
                    მოლოდინში
                  </span>
                )}
                {data.status === 'inactive' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 font-medium">
                    არააქტიური
                  </span>
                )}
                {!data.status && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border font-medium">
                    მოლოდინში
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Owner:</span> {data.ownerId || "-"}
                </div>
                <button
                  onClick={openAssignModal}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium px-2 py-1 border border-brand-500 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
                >
                  {data.ownerId ? "შეცვლა" : "მინიჭება"}
                </button>
              </div>
              
              {/* Payment Information in View Mode */}
              <div className="pt-3 border-t mt-3 space-y-2">
                <div className="text-xs text-gray-500 font-medium">გადახდის ინფორმაცია</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">ბოლო გადახდა:</span>
                    <span className="font-medium">
                      {data.lastPaymentDate 
                        ? new Date(data.lastPaymentDate).toLocaleDateString('ka-GE')
                        : "არ არის"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">შემდეგი გადახდა:</span>
                    <span className={`font-medium ${
                      (() => {
                        const nextDate = data.nextPaymentDate 
                          ? new Date(data.nextPaymentDate)
                          : data.createdAt 
                          ? (() => {
                              const created = new Date(data.createdAt);
                              created.setMonth(created.getMonth() + 1);
                              return created;
                            })()
                          : null;
                        if (!nextDate) return '';
                        if (nextDate < new Date()) return 'text-red-600';
                        if (nextDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) return 'text-yellow-600';
                        return '';
                      })()
                    }`}>
                      {data.nextPaymentDate 
                        ? new Date(data.nextPaymentDate).toLocaleDateString('ka-GE')
                        : data.createdAt 
                        ? (() => {
                            const created = new Date(data.createdAt);
                            created.setMonth(created.getMonth() + 1);
                            return created.toLocaleDateString('ka-GE');
                          })()
                        : "არ არის"}
                    </span>
                  </div>
                  {(() => {
                    const nextDate = data.nextPaymentDate 
                      ? new Date(data.nextPaymentDate)
                      : data.createdAt 
                      ? (() => {
                          const created = new Date(data.createdAt);
                          created.setMonth(created.getMonth() + 1);
                          return created;
                        })()
                      : null;
                    if (!nextDate) return null;
                    if (nextDate < new Date()) {
                      return <div className="text-xs text-red-600 font-semibold">⚠️ გადასახდელია</div>;
                    }
                    if (nextDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && nextDate >= new Date()) {
                      return <div className="text-xs text-yellow-600">⚠️ მალე ვადა გავა</div>;
                    }
                    return null;
                  })()}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-gray-500">სულ გადახდილი:</span>
                    <span className="font-semibold">{data.totalPaid || 0} ₾</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">გადახდის სტატუსი:</span>
                    <span>
                      {data.paymentStatus === 'paid' && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                          გადახდილი
                        </span>
                      )}
                      {data.paymentStatus === 'pending' && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                          მოლოდინში
                        </span>
                      )}
                      {data.paymentStatus === 'overdue' && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
                          გადასახდელია
                        </span>
                      )}
                      {!data.paymentStatus && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          მოლოდინში
                        </span>
                      )}
                    </span>
                  </div>
                  {data.paymentAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">გადახდის თანხა:</span>
                      <span className="font-medium">
                        {data.paymentAmount} ₾ {data.paymentPeriod === 'monthly' ? '/თვე' : data.paymentPeriod === 'yearly' ? '/წელი' : ''}
                      </span>
                    </div>
                  )}
                </div>
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
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-500">Owner ID:</span> {data.ownerId || "-"}
            </div>
            <button
              onClick={openAssignModal}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium px-2 py-1 border border-brand-500 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
            >
              {data.ownerId ? "შეცვლა" : "მინიჭება"}
            </button>
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

      {/* Assign Owner Modal */}
      {data && (
        <AssignStoreOwnerModal
          isOpen={isAssignModalOpen}
          onClose={closeAssignModal}
          store={{
            id: data.id || data._id,
            name: data.name,
            title: data.title,
            ownerId: data.ownerId,
          }}
          onSuccess={handleAssignOwnerSuccess}
        />
      )}
    </div>
  );
}

