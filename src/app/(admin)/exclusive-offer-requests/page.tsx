"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiGetJson } from "@/lib/api";

type Row = {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  personalId?: string;
  phone?: string;
  email?: string;
  userId?: string;
  source?: string;
  createdAt?: string;
};

type ListResponse = {
  success: boolean;
  data: Row[];
  total: number;
  limit: number;
  offset: number;
};

export default function ExclusiveOfferRequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const res = await apiGetJson<ListResponse>(
        `/exclusive-offer-requests?${params.toString()}`,
      );
      if (res.success) {
        const normalized = (res.data ?? []).map((r) => ({
          ...r,
          id: r.id || r._id,
        }));
        setRows(normalized);
        setTotal(res.total ?? 0);
      } else {
        setError("ჩატვირთვა ვერ მოხერხდა");
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შეცდომა";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (s?: string) => {
    if (!s) return "—";
    try {
      return new Intl.DateTimeFormat("ka-GE", {
        timeZone: "Asia/Tbilisi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(s));
    } catch {
      return s;
    }
  };

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ექსკლუზიური შეთავაზება (განაცხადები)</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Marte — ექსკლუზიური საწვავის შეთავაზება — მომხმარებლების მონაცემები
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          type="button"
          onClick={() => load()}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
        >
          განახლება
        </button>
        <div className="text-sm text-gray-500">სულ: {total}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left p-3 font-medium">თარიღი</th>
              <th className="text-left p-3 font-medium">სახელი / გვარი</th>
              <th className="text-left p-3 font-medium">პირადი №</th>
              <th className="text-left p-3 font-medium">ტელეფონი</th>
              <th className="text-left p-3 font-medium">ელ. ფოსტა</th>
              <th className="text-left p-3 font-medium">userId</th>
              <th className="text-left p-3 font-medium">წყარო</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  იტვირთება...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  ჩანაწერები არ არის
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id || r._id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="p-3 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="p-3">
                    {(r.firstName || "") + " " + (r.lastName || "")}
                  </td>
                  <td className="p-3 font-mono">{r.personalId || "—"}</td>
                  <td className="p-3 font-mono">{r.phone || "—"}</td>
                  <td className="p-3 break-all">{r.email || "—"}</td>
                  <td className="p-3 font-mono text-xs break-all max-w-[120px]">
                    {r.userId || "—"}
                  </td>
                  <td className="p-3 text-xs">{r.source || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 text-sm"
        >
          წინა
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setOffset((o) => o + limit)}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 text-sm"
        >
          შემდეგი
        </button>
      </div>
    </div>
  );
}
