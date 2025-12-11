"use client";
import { useEffect, useState } from "react";
import { apiGetJson } from "@/lib/api";

type Store = { id?: string; _id?: string; name?: string; ownerId?: string; address?: string; phone?: string; createdAt?: string };

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
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600">Filter by OwnerId</div>
          <input className="border rounded px-3 py-2 w-64" placeholder="ownerId" value={ownerId} onChange={(e)=>setOwnerId(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>Apply</button>
        <a className="px-3 py-2 border rounded" href="/stores/new">New store</a>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={6}>Loading...</td></tr>
            )}
            {!loading && rows.length===0 && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={6}>No stores</td></tr>
            )}
            {rows.map((s)=> (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2"><a className="text-blue-600 underline" href={`/stores/${s.id}`}>{s.id}</a></td>
                <td className="px-3 py-2">{s.name || '-'}</td>
                <td className="px-3 py-2">{s.ownerId || '-'}</td>
                <td className="px-3 py-2">{s.address || '-'}</td>
                <td className="px-3 py-2">{(s as any).phone || '-'}</td>
                <td className="px-3 py-2">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


