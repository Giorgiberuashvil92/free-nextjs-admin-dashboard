"use client";
import React, { useEffect, useMemo, useState } from "react";

type Carwash = {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  isOpen?: boolean;
  waitTime?: number;
  category?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  price?: number;
  detailedServices?: { id: string; name: string; price: number; duration: number; description?: string }[];
  images?: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function CarwashesPage() {
  const [items, setItems] = useState<Carwash[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editing, setEditing] = useState<Carwash | null>(null);
  const [form, setForm] = useState<Partial<Carwash> & { images?: string[] }>({ name: "", address: "", phone: "", isOpen: true, waitTime: 0, images: [] });
  const [uploading, setUploading] = useState(false);

  const CLOUDINARY_URL = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_URL || "";
  const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/carwash/locations?t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        const list: Carwash[] = Array.isArray(data) ? data : data?.data || [];
        setItems(list);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const onFocus = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => [c.name, c.address, c.phone, String(c.waitTime || "")].some((v: string | number | undefined) => v?.toString().toLowerCase().includes(term)));
  }, [q, items]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Carwashes</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">{loading ? "Loading…" : `${filtered.length} results`}</span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, address, phone…"
          className="border rounded-md px-3 py-2 text-base w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cards Grid - more lively, visual design */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-10">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-10">No carwashes</div>
        ) : (
          filtered.map((c) => {
            const img = c.images?.[0];
            const stars = Math.round(Number(c.rating || 0));
            return (
              <div key={c._id || c.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="cover" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{c.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{c.category || '—'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{c.location || '—'}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{c.address}</div>
                    </div>
                    <div className="text-right">
                      {c.isOpen ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">OPEN</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">CLOSED</span>
                      )}
                      <div className="mt-1 text-xs text-gray-500">Wait: {c.waitTime ?? 0}m</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-amber-500 text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < stars ? '★' : '☆'}</span>
                    ))}
                    <span className="text-gray-600 ml-1">{c.rating ?? '-'} ({c.reviews ?? 0})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100 border">Price: ₾{c.price ?? '-'}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 border">Phone: {c.phone}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 border">Services: {c.detailedServices?.length ?? 0}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                      onClick={() => {
                        setEditing(c);
                        setForm({ ...c, images: c.images || [] });
                        setIsOpenModal(true);
                      }}
                    >
                      Edit
                    </button>
                      <a className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" href={`/carwashes/${c.id || c._id}`}>Open</a>
                    <div className="flex items-center gap-2">
                      <a className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" href={`tel:${c.phone}`}>Call</a>
                      <button
                        className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm('Delete this carwash?')) return;
                          await fetch(`${API_BASE}/carwash/locations/${c.id || c._id}`, { method: 'DELETE' });
                          setItems((prev) => prev.filter((x) => (x.id || x._id) !== (c.id || c._id)));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Button */}
      <div className="mt-4">
        <button
          onClick={() => { setEditing(null); setForm({ name: "", address: "", phone: "", isOpen: true, waitTime: 0, images: [] }); setIsOpenModal(true); }}
          className="px-4 py-2 text-base rounded border hover:bg-gray-50"
        >
          + Add Carwash
        </button>
      </div>

      {/* Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl">{editing ? 'Edit Carwash' : 'New Carwash'}</h2>
              <button className="text-base" onClick={() => setIsOpenModal(false)}>Close</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-base">Name
                <input className="mt-1 w-full border rounded px-3 py-2" value={form.name || ''} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} />
              </label>
              <label className="text-base">Address
                <input className="mt-1 w-full border rounded px-3 py-2" value={form.address || ''} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))} />
              </label>
              <label className="text-base">Phone
                <input className="mt-1 w-full border rounded px-3 py-2" value={form.phone || ''} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))} />
              </label>
              <div className="flex items-center gap-3">
                <label className="text-base flex items-center gap-2">
                  <input type="checkbox" checked={!!form.isOpen} onChange={(e)=>setForm(f=>({...f,isOpen:e.target.checked}))} /> Open
                </label>
                <label className="text-base">Wait Time (min)
                  <input type="number" className="ml-2 w-28 border rounded px-3 py-2" value={typeof form.waitTime === 'number' ? form.waitTime : 0} onChange={(e)=>setForm(f=>({...f,waitTime: Number(e.target.value||0)}))} />
                </label>
              </div>

              {/* Images */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium">Images</span>
                  <label className="text-sm px-3 py-1.5 border rounded cursor-pointer">
                    Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={async (e)=>{
                      const files = Array.from(e.target.files||[]);
                      if (!files.length || !CLOUDINARY_URL || !CLOUDINARY_PRESET) return;
                      setUploading(true);
                      try {
                        const uploaded: string[] = [];
                        for (const file of files) {
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('upload_preset', CLOUDINARY_PRESET);
                          const r = await fetch(CLOUDINARY_URL, { method:'POST', body: fd });
                          const j = await r.json();
                          if (j?.secure_url) uploaded.push(j.secure_url as string);
                        }
                        setForm(f=>({...f, images:[...(f.images||[]), ...uploaded]}));
                      } finally {
                        setUploading(false);
                      }
                    }} />
                  </label>
                </div>
                {uploading && <div className="text-sm text-gray-500 mt-1">Uploading…</div>}
                <div className="mt-2 flex flex-wrap gap-3">
                  {(form.images||[]).map((url,idx)=> (
                    <div key={idx} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="carwash" className="w-24 h-24 object-cover rounded border" />
                      <button className="absolute -top-2 -right-2 bg-white border rounded-full w-7 h-7 text-sm" onClick={()=>setForm(f=>({...f,images:(f.images||[]).filter((_,i)=>i!==idx)}))}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button className="px-4 py-2 text-base border rounded" onClick={()=>setIsOpenModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 text-base rounded bg-gray-900 text-white"
                onClick={async ()=>{
                  const payload: Partial<Carwash> & { id: string; images?: string[] } = {
                    id: editing?.id || editing?._id || `cw_${Date.now()}`,
                    name: form.name,
                    address: form.address,
                    phone: form.phone,
                    isOpen: !!form.isOpen,
                    // Backend schema expects many extra fields; we send minimum and let backend defaults/validators handle or adjust as needed
                    images: form.images || [],
                  };
                  if (editing) {
                    await fetch(`${API_BASE}/carwash/locations/${editing.id || editing._id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                    setItems(prev=>prev.map(x=> (x.id||x._id) === (editing.id||editing._id) ? { ...x, ...payload } : x));
                  } else {
                    await fetch(`${API_BASE}/carwash/locations`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                    setItems(prev=>[{...payload}, ...prev]);
                  }
                  setIsOpenModal(false);
                }}
              >
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


