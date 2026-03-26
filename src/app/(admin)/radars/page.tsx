"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetJson } from "@/lib/api";
import type { RadarRow } from "@/components/radars/RadarsLeafletMap";
import {
  type ResolvedUserRow,
  extractUserIdFromRecord,
  resolvedDisplayName,
  resolveUsersInParallel,
} from "@/lib/resolveUserProfile";

const RadarsLeafletMap = dynamic(() => import("@/components/radars/RadarsLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[min(420px,50vh)] w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center text-gray-500 text-sm">
      რუკა იტვირთება…
    </div>
  ),
});

/** API-დან — დამატებითი ველები userId-ისთვის */
export type RadarApiRow = RadarRow & Record<string, unknown>;

function normalizeRadarsResponse(raw: unknown): RadarApiRow[] {
  if (Array.isArray(raw)) return raw as RadarApiRow[];
  if (raw && typeof raw === "object" && "data" in raw) {
    const d = (raw as { data: unknown }).data;
    if (Array.isArray(d)) return d as RadarApiRow[];
  }
  return [];
}

export default function RadarsAdminPage() {
  const [radars, setRadars] = useState<RadarApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [resolvedUsers, setResolvedUsers] = useState<Record<string, ResolvedUserRow>>({});
  const [resolvingUsers, setResolvingUsers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const json = await apiGetJson<unknown>("/radars");
      setRadars(normalizeRadarsResponse(json));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ჩატვირთვა ვერ მოხერხდა";
      setErr(msg);
      setRadars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** რადარის ჩანაწერში თუ არის userId → Users API */
  useEffect(() => {
    if (!radars.length) return;
    const ids = radars.map((r) => extractUserIdFromRecord(r)).filter((x): x is string => Boolean(x));
    if (ids.length === 0) {
      setResolvedUsers({});
      setResolvingUsers(false);
      return;
    }
    setResolvedUsers({});
    let cancelled = false;
    setResolvingUsers(true);
    (async () => {
      await resolveUsersInParallel(ids, 6, (id, row) => {
        if (cancelled || !row) return;
        setResolvedUsers((prev) => ({ ...prev, [id]: row }));
      });
      if (!cancelled) setResolvingUsers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [radars]);

  const filtered = useMemo(() => {
    let list = radars;
    if (typeFilter) {
      list = list.filter((r) => (r.type || "") === typeFilter);
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => {
      const id = String(r._id || r.id || "");
      const addr = (r.address || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const uid = extractUserIdFromRecord(r);
      const ru = uid ? resolvedUsers[uid] : undefined;
      const rName = ru ? resolvedDisplayName(ru).toLowerCase() : "";
      const rPhone = (ru?.phone || "").toLowerCase();
      return (
        id.toLowerCase().includes(s) ||
        addr.includes(s) ||
        desc.includes(s) ||
        String(r.latitude).includes(s) ||
        String(r.longitude).includes(s) ||
        (uid && uid.toLowerCase().includes(s)) ||
        rName.includes(s) ||
        rPhone.includes(s)
      );
    });
  }, [radars, q, typeFilter, resolvedUsers]);

  const stats = useMemo(() => {
    const total = radars.length;
    const active = radars.filter((r) => r.isActive !== false).length;
    const fixed = radars.filter((r) => r.type === "fixed").length;
    const mobile = radars.filter((r) => r.type === "mobile").length;
    const avg = radars.filter((r) => r.type === "average_speed").length;
    const fines = radars.reduce((a, r) => a + (typeof r.fineCount === "number" ? r.fineCount : 0), 0);
    const withUser = radars.filter((r) => Boolean(extractUserIdFromRecord(r))).length;
    return { total, active, fixed, mobile, avg, fines, withUser };
  }, [radars]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">რადარები</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            სია <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /radars</code>. სვეტი{" "}
            <strong>რადარის ID</strong> — ეს არის რადარის დოკუმენტის იდენტიფიკატორი (MongoDB / OSM-სინთეზირებული), არა
            მომხმარებლის. თუ ბექი ინახავს <code className="text-xs">userId</code> ველს, ქვემოთ გამოჩნდება იუზერის სახელი და
            ტელეფონი.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          განახლება
        </button>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-4 text-red-800 dark:text-red-200 text-sm">
          <strong>შეცდომა:</strong> {err}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "სულ რადარი", value: stats.total },
          { label: "აქტიური", value: stats.active },
          { label: "ფიქსირებული", value: stats.fixed },
          { label: "მობილური", value: stats.mobile },
          { label: "საშუალო სიჩქარე", value: stats.avg },
          { label: "ჯარიმები (ჯამი)", value: stats.fines },
          { label: "იუზერით (API)", value: stats.withUser },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">რუკა (OpenStreetMap)</h2>
        <p className="text-xs text-gray-500 mb-2">
          რუკაზე მაქს. 1500 მარკერი. ფილტრით შეგიძლიათ დააპატაროთ სია.
        </p>
        <RadarsLeafletMap radars={filtered as RadarRow[]} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძებნა რადარის ID / იუზერის ID / სახელი / ტელ / მისამართი..."
          className="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="">ყველა ტიპი</option>
          <option value="fixed">ფიქსირებული</option>
          <option value="mobile">მობილური</option>
          <option value="average_speed">საშუალო სიჩქარე</option>
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">ნაჩვენები: {filtered.length}</span>
        {resolvingUsers ? (
          <span className="text-blue-600 text-xs">იუზერების მონაცემები იტვირთება…</span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">იტვირთება…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                <th className="px-3 py-2">რადარის ID</th>
                <th className="px-3 py-2">იუზერის ID</th>
                <th className="px-3 py-2">იუზერი (სახელი)</th>
                <th className="px-3 py-2">იუზერის ტელ.</th>
                <th className="px-3 py-2">როლი</th>
                <th className="px-3 py-2">კოორდინატები</th>
                <th className="px-3 py-2">ტიპი</th>
                <th className="px-3 py-2">ლიმიტი</th>
                <th className="px-3 py-2">ჯარიმები</th>
                <th className="px-3 py-2">აქტიური</th>
                <th className="px-3 py-2">წყარო</th>
                <th className="px-3 py-2">რუკა</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                    ჩანაწერები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const radarId = String(r._id || r.id || i);
                  const lat = r.latitude;
                  const lng = r.longitude;
                  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                  const userId = extractUserIdFromRecord(r);
                  const uProf = userId ? resolvedUsers[userId] : undefined;
                  const name =
                    resolvedDisplayName(uProf || {}) ||
                    (resolvingUsers && userId && !uProf ? "იტვირთება…" : null);
                  return (
                    <tr
                      key={radarId}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-3 py-2 font-mono text-xs max-w-[140px] break-all" title={radarId}>
                        {radarId}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs max-w-[120px] break-all">
                        {userId ? (
                          <Link
                            href={`/users?q=${encodeURIComponent(userId)}`}
                            className="text-blue-600 hover:underline"
                          >
                            {userId}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{name || "—"}</td>
                      <td className="px-3 py-2">{uProf?.phone || "—"}</td>
                      <td className="px-3 py-2 text-xs">{uProf?.role || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                        {lat?.toFixed?.(5)}, {lng?.toFixed?.(5)}
                      </td>
                      <td className="px-3 py-2">{r.type || "—"}</td>
                      <td className="px-3 py-2">{r.speedLimit ?? "—"}</td>
                      <td className="px-3 py-2">{r.fineCount ?? "—"}</td>
                      <td className="px-3 py-2">{r.isActive === false ? "არა" : "კი"}</td>
                      <td className="px-3 py-2 text-xs max-w-[100px] truncate" title={r.source}>
                        {r.source || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Google Maps
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
