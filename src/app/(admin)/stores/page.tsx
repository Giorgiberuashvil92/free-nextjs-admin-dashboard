"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetJson } from "@/lib/api";

type Store = { 
  id?: string; 
  _id?: string; 
  name?: string; 
  title?: string;
  ownerId?: string; 
  address?: string; 
  phone?: string; 
  images?: string[];
  type?: string;
  location?: string;
  createdAt?: string 
};

export default function StoresListPage() {
  const [rows, setRows] = useState<Store[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
      const res = await apiGetJson<{ success: boolean; data: Store[] } | Store[]>(`/stores${qs}`);
      const data = Array.isArray(res) ? res : res.data;
      setRows((data || []).map((s)=> ({ ...s, id: s.id || (s as any)._id })));
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
      setErr(message);
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">მაღაზიები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "Loading…" : `${rows.length} results`}
          </span>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <div className="text-sm text-gray-600">Filter by OwnerId</div>
            <input 
              className="border rounded px-3 py-2 w-64" 
              placeholder="ownerId" 
              value={ownerId} 
              onChange={(e)=>setOwnerId(e.target.value)} 
            />
          </div>
          <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>
            Apply
          </button>
          <Link className="px-3 py-2 border rounded inline-block" href="/stores/new">
            New store
          </Link>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">No stores</div>
        ) : (
          rows.map((s) => {
            const img = s.images?.[0];
            const storeName = s.title || s.name || "Unnamed Store";
            return (
              <Link 
                key={s.id} 
                href={`/stores/${s.id}`}
                className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 bg-gray-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={img} 
                      alt={storeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {s.type && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {s.type}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{storeName}</h3>
                  {s.location && (
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {s.location}
                    </div>
                  )}
                  {s.address && (
                    <div className="text-sm text-gray-500 mb-2">{s.address}</div>
                  )}
                  {s.phone && (
                    <div className="text-sm text-gray-600 mb-2">{s.phone}</div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-400">
                      {s.images?.length || 0} სურათი
                    </div>
                    <div className="text-xs text-gray-400">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}


