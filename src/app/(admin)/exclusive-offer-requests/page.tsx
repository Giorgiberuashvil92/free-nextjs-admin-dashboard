"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiGetJson, apiPatch } from "@/lib/api";

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
  adminNote?: string;
  called?: boolean;
};

type ListResponse = {
  success: boolean;
  data: Row[];
  total: number;
  limit: number;
  offset: number;
  stats?: {
    uniqueUsersToday: number;
    uniqueUsersYesterday: number;
    /** უნიკალური პირადი № — ყველა დროის ბაზაში */
    uniqueUsersAllTime: number;
  };
};

/** იგივე პირადი №-ის ყველა ჩანაწერი ერთად ინახება (დარეკვა / შენიშვნა). */
function syncKey(r: Row): string {
  const pid = (r.personalId ?? "").trim().replace(/\s/g, "");
  if (pid) return `pid:${pid}`;
  return `id:${String(r.id || r._id || "")}`;
}

/** ქრონოლოგიურად (ახალი ზევით); იგივე წამზე სტაბილურობისთვის — personalId. */
function sortRowsForDisplay(list: Row[]): Row[] {
  return [...list].sort((a, b) => {
    const ta = new Date(parseCreatedAt(a.createdAt) ?? 0).getTime();
    const tb = new Date(parseCreatedAt(b.createdAt) ?? 0).getTime();
    if (tb !== ta) return tb - ta;
    const pa = (a.personalId ?? "").trim().replace(/\s/g, "") || "\uffff";
    const pb = (b.personalId ?? "").trim().replace(/\s/g, "") || "\uffff";
    return pa.localeCompare(pb);
  });
}

function parseCreatedAt(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }
  if (typeof raw === "object" && raw !== null && "$date" in raw) {
    const d = (raw as { $date?: string | number }).$date;
    if (typeof d === "string" || typeof d === "number") return String(d);
  }
  return undefined;
}

export default function ExclusiveOfferRequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** გასაღები = syncKey — იგივე პირადი №-ის სტრიქონები ერთ ტექსტს იზიარებენ */
  const [noteDraftBySync, setNoteDraftBySync] = useState<Record<string, string>>(
    {},
  );
  const [savingCalled, setSavingCalled] = useState<Record<string, boolean>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<ListResponse["stats"]>(undefined);

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
        setRows(sortRowsForDisplay(normalized));
        setTotal(res.total ?? 0);
        setStats(res.stats);
        setNoteDraftBySync({});
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

  const formatDate = (s?: unknown) => {
    const iso = parseCreatedAt(s);
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat("ka-GE", {
        timeZone: "Asia/Tbilisi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const rowId = (r: Row) => String(r.id || r._id || "");

  const setCalled = async (r: Row, next: boolean) => {
    const id = rowId(r);
    if (!id) return;
    const key = syncKey(r);
    setSavingCalled((s) => ({ ...s, [key]: true }));
    setError("");
    try {
      await apiPatch(`/exclusive-offer-requests/${id}`, { called: next });
      setRows((list) =>
        sortRowsForDisplay(
          list.map((x) => (syncKey(x) === key ? { ...x, called: next } : x)),
        ),
      );
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შენახვა ვერ მოხერხდა";
      setError(msg);
    } finally {
      setSavingCalled((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  };

  const saveAdminNote = async (r: Row) => {
    const id = rowId(r);
    if (!id) return;
    const key = syncKey(r);
    const text = noteDraftBySync[key] ?? r.adminNote ?? "";
    setSavingNote((s) => ({ ...s, [key]: true }));
    setError("");
    try {
      await apiPatch(`/exclusive-offer-requests/${id}`, { adminNote: text });
      setRows((list) =>
        sortRowsForDisplay(
          list.map((x) => (syncKey(x) === key ? { ...x, adminNote: text } : x)),
        ),
      );
      setNoteDraftBySync((d) => {
        const n = { ...d };
        delete n[key];
        return n;
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "შენახვა ვერ მოხერხდა";
      setError(msg);
    } finally {
      setSavingNote((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
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
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          მთელი სტრიქონი მწვანეა თუ «დავრეკეთ» მონიშნულია, წითელი — თუ ჯერ არ დაგირეკავთ. სია დალაგებულია გაგზავნის დროით (ახალი ზევით, თბილისის დროით ჩვენება). იგივე პირადი ნომრის განაცხადებზე დარეკვა/შენიშვნა ერთად ინახება.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">უნიკალური განმცხადებელი — დღეს</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {stats.uniqueUsersToday}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">პირადი № (დღის მიხედვით, Asia/Tbilisi)</div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">უნიკალური განმცხადებელი — გუშინ</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {stats.uniqueUsersYesterday}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              უნიკალური პირადი № — სულ (ყველა დრო)
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {stats.uniqueUsersAllTime ?? "—"}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              განსხვავებული პირადი ნომერი ბაზაში; გაგზავნების სულ:{" "}
              <span className="tabular-nums font-medium text-gray-600 dark:text-gray-300">
                {total}
              </span>
            </div>
          </div>
        </div>
      )}

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
        <div className="text-sm text-gray-500">
          სულ (ყველა დრო): <span className="tabular-nums font-medium">{total}</span>
        </div>
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
              <th className="text-left p-3 font-medium whitespace-nowrap">დარეკვა</th>
              <th className="text-left p-3 font-medium min-w-[200px]">შენიშვნა</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  იტვირთება...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  ჩანაწერები არ არის
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const id = rowId(r);
                const sk = syncKey(r);
                const called = Boolean(r.called);
                const noteValue =
                  noteDraftBySync[sk] !== undefined
                    ? noteDraftBySync[sk]
                    : (r.adminNote ?? "");
                return (
                  <tr
                    key={id}
                    className={`border-t align-top transition-colors ${
                      called
                        ? "border-emerald-300/90 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/55"
                        : "border-rose-300/90 bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50"
                    }`}
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
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
                          <input
                            type="checkbox"
                            checked={called}
                            disabled={Boolean(savingCalled[sk])}
                            onChange={(e) => setCalled(r, e.target.checked)}
                          />
                          <span className="whitespace-nowrap">დავრეკეთ</span>
                        </label>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1.5 max-w-[280px]">
                        <textarea
                          className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs min-h-[56px] resize-y"
                          rows={2}
                          placeholder="შენიშვნა ადმინისთვის..."
                          value={noteValue}
                          onChange={(e) =>
                            setNoteDraftBySync((d) => ({
                              ...d,
                              [sk]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          disabled={Boolean(savingNote[sk])}
                          onClick={() => saveAdminNote(r)}
                          className="self-start px-2.5 py-1 rounded-md bg-gray-800 text-white text-xs disabled:opacity-50"
                        >
                          {savingNote[sk] ? "…" : "შენახვა"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
