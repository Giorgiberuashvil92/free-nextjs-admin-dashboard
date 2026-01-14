"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch, API_BASE } from "@/lib/api";

type Service = { id: string; name: string; price: number; duration: number; description?: string };
type WorkingDay = { day: string; startTime: string; endTime: string; isWorking: boolean };
type BreakTime = { start: string; end: string; name: string };
type TimeSlotsConfig = { workingDays: WorkingDay[]; interval: number; breakTimes: BreakTime[] };

type CarwashDetail = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isOpen: boolean;
  waitTime?: number;
  category?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  price?: number;
  description?: string;
  detailedServices?: Service[];
  images?: string[];
  timeSlotsConfig?: TimeSlotsConfig;
};

const CLOUDINARY_URL = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_URL || "";
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export default function CarwashDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CarwashDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<CarwashDetail>(`/carwash/locations/${id}?t=${Date.now()}`);
        setData(data);
      } catch (error) {
        console.error('Error loading carwash:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
    const onFocus = () => id && load();
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus); };
  }, [id]);

  const services = useMemo(() => data?.detailedServices || [], [data]);

  if (loading || !data) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-2 py-1 border rounded">Back</button>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border">{data.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm border rounded disabled:opacity-60"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await fetch(`${API_BASE}/carwash/locations/${id}/toggle-open`, { method: 'PATCH' });
                setData((prev) => prev ? { ...prev, isOpen: !prev.isOpen } : prev);
              } finally {
                setSaving(false);
              }
            }}
          >
            {data.isOpen ? 'Set CLOSED' : 'Set OPEN'}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm">Wait (min)</label>
            <input className="w-24 border rounded px-2 py-1" type="number" value={data.waitTime || 0} onChange={(e)=> setData(d=> d ? ({...d, waitTime: Number(e.target.value||0)}) : d)} />
            <button
              className="px-3 py-2 text-sm rounded bg-gray-900 text-white disabled:opacity-60"
              disabled={saving}
              onClick={async ()=>{
                setSaving(true);
                try {
                  await fetch(`${API_BASE}/carwash/locations/${id}/wait-time`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ waitTime: data.waitTime || 0 }) });
                } finally {
                  setSaving(false);
                }
              }}
            >Save</button>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">Contact</div>
          <div><span className="font-medium">Phone:</span> <a className="text-blue-600" href={`tel:${data.phone}`}>{data.phone}</a></div>
          <div><span className="font-medium">Address:</span> {data.address}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-gray-100 border">Category: {data.category || '—'}</span>
            <span className="px-2 py-0.5 rounded bg-gray-100 border">Location: {data.location || '—'}</span>
          </div>
        </div>
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">Rating</div>
          <div className="flex items-center gap-2">
            <div className="text-amber-500">{Array.from({length:5}).map((_,i)=> <span key={i}>{i < Math.round(Number(data.rating||0)) ? '★':'☆'}</span>)}</div>
            <div className="text-sm text-gray-600">{data.rating ?? '-'} ({data.reviews ?? 0})</div>
          </div>
          <div className="text-sm"><span className="font-medium">Base price:</span> ₾{data.price ?? '-'}</div>
        </div>
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-sm text-gray-500">Status</div>
          <div>{data.isOpen ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">OPEN</span> : <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">CLOSED</span>}</div>
          <div className="text-sm text-gray-600">Wait: {data.waitTime ?? 0}m</div>
        </div>
      </div>

      {/* Services */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Services</h2>
          <button className="px-3 py-1.5 text-sm border rounded" onClick={()=> setData(d => d ? ({...d, detailedServices:[...(d.detailedServices||[]), { id: String(Date.now()), name:'New service', price: 0, duration: 30 }]}) : d)}>+ Add</button>
        </div>
        <div className="space-y-3">
          {services.map((s, idx) => (
            <div key={s.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
              <input className="border rounded px-2 py-1" value={s.name} onChange={(e)=> setData(d=> d? ({...d, detailedServices: d.detailedServices?.map((x,i)=> i===idx? {...x, name:e.target.value}:x)}) : d)} />
              <input type="number" className="border rounded px-2 py-1" value={s.price} onChange={(e)=> setData(d=> d? ({...d, detailedServices: d.detailedServices?.map((x,i)=> i===idx? {...x, price:Number(e.target.value||0)}:x)}) : d)} />
              <input type="number" className="border rounded px-2 py-1" value={s.duration} onChange={(e)=> setData(d=> d? ({...d, detailedServices: d.detailedServices?.map((x,i)=> i===idx? {...x, duration:Number(e.target.value||0)}:x)}) : d)} />
              <input className="border rounded px-2 py-1 md:col-span-2" placeholder="Description" value={s.description || ''} onChange={(e)=> setData(d=> d? ({...d, detailedServices: d.detailedServices?.map((x,i)=> i===idx? {...x, description:e.target.value}:x)}) : d)} />
              <div className="md:col-span-5 flex items-center gap-2">
                <button className="text-sm px-2 py-1 border rounded" onClick={()=> setData(d=> d? ({...d, detailedServices: (d.detailedServices||[]).filter((_,i)=> i!==idx)}) : d)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end mt-3">
          <button className="px-3 py-2 text-sm bg-gray-900 text-white rounded disabled:opacity-60" disabled={saving} onClick={async ()=>{
            setSaving(true);
            try{
              await fetch(`${API_BASE}/carwash/locations/${id}/services`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data.detailedServices||[]) });
            }finally{ setSaving(false); }
          }}>Save Services</button>
        </div>
      </div>

      {/* Time Slots Config */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Time Slots Config</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Interval (min)
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={data.timeSlotsConfig?.interval || 30} onChange={(e)=> setData(d=> d? ({...d, timeSlotsConfig:{...d.timeSlotsConfig!, interval: Number(e.target.value||30), workingDays: d.timeSlotsConfig?.workingDays||[], breakTimes: d.timeSlotsConfig?.breakTimes||[]}}):d)} />
          </label>
          <label className="text-sm">Breaks count
            <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={data.timeSlotsConfig?.breakTimes?.length || 0} onChange={(e)=>{
              const n = Number(e.target.value||0);
              setData(d=>{
                if(!d) return d;
                const bt = d.timeSlotsConfig?.breakTimes || [];
                const next = bt.slice(0,n).concat(Array(Math.max(0,n - bt.length)).fill(0).map(()=>({start:'13:00', end:'14:00', name:'Break'})));
                return {...d, timeSlotsConfig:{...d.timeSlotsConfig!, breakTimes: next, workingDays: d.timeSlotsConfig?.workingDays||[], interval: d.timeSlotsConfig?.interval||30}};
              })
            }} />
          </label>
        </div>
        <div className="space-y-2">
          {(data.timeSlotsConfig?.breakTimes||[]).map((b,idx)=> (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1" value={b.name} onChange={(e)=> setData(d=> d? ({...d, timeSlotsConfig:{...d.timeSlotsConfig!, breakTimes:(d.timeSlotsConfig?.breakTimes||[]).map((x,i)=> i===idx? {...x, name:e.target.value}:x)}}):d)} />
              <input className="border rounded px-2 py-1" value={b.start} onChange={(e)=> setData(d=> d? ({...d, timeSlotsConfig:{...d.timeSlotsConfig!, breakTimes:(d.timeSlotsConfig?.breakTimes||[]).map((x,i)=> i===idx? {...x, start:e.target.value}:x)}}):d)} />
              <input className="border rounded px-2 py-1" value={b.end} onChange={(e)=> setData(d=> d? ({...d, timeSlotsConfig:{...d.timeSlotsConfig!, breakTimes:(d.timeSlotsConfig?.breakTimes||[]).map((x,i)=> i===idx? {...x, end:e.target.value}:x)}}):d)} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end">
          <button className="px-3 py-2 text-sm bg-gray-900 text-white rounded disabled:opacity-60" disabled={saving} onClick={async ()=>{
            setSaving(true);
            try{
              await fetch(`${API_BASE}/carwash/locations/${id}/time-slots-config`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data.timeSlotsConfig||{}) });
            }finally{ setSaving(false); }
          }}>Save Config</button>
        </div>
      </div>

      {/* Gallery */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Gallery</h2>
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
                const images = [...(data.images||[]), ...uploaded];
                setData(prev=> prev? ({...prev, images}) : prev);
                await fetch(`${API_BASE}/carwash/locations/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ images }) });
              } finally { setUploading(false); }
            }} />
          </label>
        </div>
        {uploading && <div className="text-sm text-gray-500">Uploading…</div>}
        <div className="flex flex-wrap gap-3">
          {(data.images||[]).map((url,idx)=> (
            <div key={idx} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="carwash" className="w-28 h-28 object-cover rounded border" />
              <button className="absolute -top-2 -right-2 bg-white border rounded-full w-7 h-7 text-sm" onClick={async ()=>{
                const images = (data.images||[]).filter((_,i)=> i!==idx);
                setData(prev=> prev? ({...prev, images}) : prev);
                await fetch(`${API_BASE}/carwash/locations/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ images }) });
              }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


