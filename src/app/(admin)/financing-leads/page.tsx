"use client";
import React, { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  userId: string;
  requestId: string;
  amount: number;
  phone: string;
  merchantPhone: string;
  downPayment?: number | null;
  termMonths?: number | null;
  personalId?: string | null;
  note?: string;
  createdAt: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

export default function FinancingLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, { name: string; phone?: string }>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/financing/leads?limit=200`, { cache: "no-store" });
        const data = await res.json();
        // Handle both array response and { data: [...] } format
        const leadsData = Array.isArray(data) ? data : (data?.data || []);
        setLeads(leadsData);
      } catch (error) {
        console.error("Error loading financing leads:", error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((l) =>
      [l.phone, l.merchantPhone, l.requestId, l.userId, String(l.amount), l.note || "", l.personalId || ""]
        .some((v) => v?.toString().toLowerCase().includes(term))
    );
  }, [q, leads]);

  useEffect(() => {
    // Fetch missing users for display (name by userId)
    const unique = Array.from(new Set(filtered.map((l) => l.userId))).filter((id) => !!id);
    const missing = unique.filter((id) => !userMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: [string, { name: string; phone?: string }][] = [];
      const usersApiBase = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? '/api/proxy' 
        : BACKEND_URL;
      for (const id of missing) {
        try {
          const res = await fetch(`${usersApiBase}/users/${encodeURIComponent(id)}`, { cache: "no-store" });
          if (!res.ok) continue;
          const json = await res.json();
          const u = json?.data || {};
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.phone || id;
          entries.push([id, { name, phone: u.phone }]);
        } catch {
          // ignore per-user fetch error
        }
      }
      if (!cancelled && entries.length) {
        setUserMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered, userMap]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Financing Leads</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? 'Loading…' : `${filtered.length} results`}
          </span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search phone, requestId, userId, amount…"
          className="border rounded-md px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-hidden border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>No leads</td>
              </tr>
            ) : (
              filtered.map((l) => (
                <>
                  <tr key={l.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{userMap[l.userId]?.name || l.userId}</span>
                    <span className="text-xs text-gray-500">({l.userId})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">received</span>
                  </div>
                </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{l.requestId}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(l.requestId)}
                          className="text-xs text-blue-600 hover:underline"
                          title="Copy requestId"
                        >
                          copy
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">₾{l.amount}</span>
                    </td>
                    <td className="px-3 py-2">
                      <a href={`tel:${l.phone}`} className="text-blue-600 hover:underline">{l.phone}</a>
                    </td>
                  <td className="px-3 py-2">
                    {l.merchantPhone ? (
                      <a href={`tel:${l.merchantPhone}`} className="text-blue-600 hover:underline">{l.merchantPhone}</a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                      >
                        {expandedId === l.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === l.id && (
                    <tr className="bg-white">
                      <td className="px-3 py-4" colSpan={7}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="p-3 rounded border">
                            <div className="text-xs text-gray-500">Term (months)</div>
                            <div className="font-medium">{l.termMonths ?? '-'}</div>
                          </div>
                          <div className="p-3 rounded border">
                            <div className="text-xs text-gray-500">Down payment</div>
                            <div className="font-medium">{l.downPayment ?? '-'}</div>
                          </div>
                          <div className="p-3 rounded border">
                            <div className="text-xs text-gray-500">Personal ID</div>
                            <div className="font-medium">{l.personalId ?? '-'}</div>
                          </div>
                          <div className="p-3 rounded border sm:col-span-2 lg:col-span-3">
                            <div className="text-xs text-gray-500">Note</div>
                            <div className="font-medium break-words">{l.note || '-'}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


