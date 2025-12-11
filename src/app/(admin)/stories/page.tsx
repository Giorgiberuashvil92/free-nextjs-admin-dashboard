"use client";
import { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiDelete } from "@/lib/api";

type Story = { id: string; authorId?: string; authorName?: string; category?: string; highlight?: boolean; createdAt?: number; viewsCount?: number };

export default function AdminStoriesPage() {
  const [rows, setRows] = useState<Story[]>([]);
  const [category, setCategory] = useState("");
  const [highlight, setHighlight] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (highlight) params.set("highlight", highlight);
      const res = await apiGetJson<{ success: boolean; data: Story[] } | Story[]>(`/stories${params.toString() ? `?${params.toString()}` : ""}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      setRows(data as Story[]);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
      setErr(message);
      setRows([]);
    } finally { setLoading(false); }
  }, [category, highlight]);

  const handleDelete = async (id: string) => {
    if (!confirm(`დარწმუნებული ხართ რომ გსურთ ამ სთორის წაშლა? (ID: ${id})`)) return;
    try {
      await apiDelete(`/stories/${id}`);
      await load(); // refresh list
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Delete failed';
      alert(`წაშლა ვერ მოხერხდა: ${message}`);
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Stories</h1>
        <p className="text-sm text-gray-500">Manage highlights for the main page</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600">Category</div>
          <select className="border rounded px-3 py-2" value={category} onChange={(e)=>setCategory(e.target.value)}>
            <option value="">All</option>
            <option value="my-car">my-car</option>
            <option value="friends">friends</option>
            <option value="services">services</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Highlight</div>
          <select className="border rounded px-3 py-2" value={highlight} onChange={(e)=>setHighlight(e.target.value)}>
            <option value="">All</option>
            <option value="true">Only highlights</option>
            <option value="false">Non-highlights</option>
          </select>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>Apply</button>
        <a className="px-3 py-2 border rounded" href="/stories/new">New story</a>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Author</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Highlight</th>
              <th className="px-3 py-2 text-left">Views</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={7}>Loading...</td></tr>
            )}
            {!loading && rows.length===0 && (
              <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={7}>No stories</td></tr>
            )}
            {rows.map((s)=> (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2"><a className="text-blue-600 underline" href={`/stories/${s.id}`}>{s.id}</a></td>
                <td className="px-3 py-2">{s.authorName || s.authorId || '-'}</td>
                <td className="px-3 py-2">{s.category || '-'}</td>
                <td className="px-3 py-2">{s.highlight ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{s.viewsCount ?? 0}</td>
                <td className="px-3 py-2">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


