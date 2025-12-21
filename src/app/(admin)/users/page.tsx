"use client";
import { useEffect, useState } from "react";
import { apiGetJson } from "@/lib/api";

type UserRow = {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
  avatar?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: string;
  preferences?: any;
  deviceTokensCount?: number;
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState<string>("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (active) params.set("active", active);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const res = await apiGetJson<{ success: boolean; data: UserRow[]; total: number; limit: number; offset: number }>(`/users?${params.toString()}`);
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to load");
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (role) params.set("role", role);
        if (active) params.set("active", active);
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        const res = await apiGetJson<{ success: boolean; data: UserRow[]; total: number; limit: number; offset: number }>(`/users?${params.toString()}`);
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      } catch (e: unknown) {
        const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
        setErr(message || "Failed to load");
        setRows([]); setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, role, active, limit, offset]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600">Search</div>
          <input className="border rounded px-3 py-2 w-64" placeholder="phone, email, name, id" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-gray-600">Role</div>
          <select className="border rounded px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="">All</option>
            <option value="customer">customer</option>
            <option value="owner">owner</option>
            <option value="manager">manager</option>
            <option value="employee">employee</option>
            <option value="user">user</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Active</div>
          <select className="border rounded px-3 py-2" value={active} onChange={(e)=>setActive(e.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={()=>{ setOffset(0); load(); }} disabled={loading}>Filter</button>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">UserId</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Device Tokens</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2"><a className="text-blue-600 underline" href={`/users/${u.id}`}>{u.id}</a></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {u.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <span>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</span>
                  </div>
                </td>
                <td className="px-3 py-2">{u.phone}</td>
                <td className="px-3 py-2">{u.email || '-'}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <a 
                    className="text-blue-600 underline text-xs" 
                    href={`/users/${u.id}#tokens`}
                  >
                    {u.deviceTokensCount !== undefined ? `${u.deviceTokensCount} token(s)` : 'View'}
                  </a>
                </td>
                <td className="px-3 py-2">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2">{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={9}>{loading? 'Loading...' : 'No users'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-2 border rounded" disabled={!canPrev || loading} onClick={()=> setOffset(Math.max(0, offset - limit))}>Prev</button>
        <button className="px-3 py-2 border rounded" disabled={!canNext || loading} onClick={()=> setOffset(offset + limit)}>Next</button>
        <div className="text-sm text-gray-600">{offset + 1}-{Math.min(offset + limit, total)} / {total}</div>
      </div>
    </div>
  );
}


