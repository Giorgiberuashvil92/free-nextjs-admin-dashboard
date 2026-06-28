"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import {
  unwrapList,
  type EvPromoRequestRow,
} from "@/components/ev-charging/evChargingTypes";

export default function EvPromoCodesPage() {
  const [promoRequests, setPromoRequests] = useState<EvPromoRequestRow[]>([]);
  const [promoFilter, setPromoFilter] = useState<"pending" | "assigned" | "all">("pending");
  const [promoInputs, setPromoInputs] = useState<Record<string, string>>({});
  const [assigningPromoId, setAssigningPromoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadPromoRequests = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = promoFilter === "all" ? "" : `?status=${promoFilter}`;
      const res = await apiGet<unknown>(`/ev-charging/promo-code/requests${q}`);
      setPromoRequests(unwrapList<EvPromoRequestRow>(res));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "პრომო მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
      setPromoRequests([]);
    } finally {
      setLoading(false);
    }
  }, [promoFilter]);

  useEffect(() => {
    void loadPromoRequests();
  }, [loadPromoRequests]);

  const stats = useMemo(() => {
    const pending = promoRequests.filter((r) => r.status === "pending").length;
    const assigned = promoRequests.filter((r) => r.status === "assigned").length;
    return { pending, assigned, total: promoRequests.length };
  }, [promoRequests]);

  const assignPromoCode = async (request: EvPromoRequestRow) => {
    const code = (promoInputs[request.id] ?? "").trim();
    if (!code) {
      setErr("პრომო კოდი შეიყვანეთ");
      return;
    }
    setAssigningPromoId(request.id);
    setErr(null);
    setOk(null);
    try {
      await apiPatch(`/ev-charging/promo-code/requests/${request.id}`, {
        promoCode: code,
        websiteUrl: request.websiteUrl || "https://evpower.ge",
      });
      setOk(`პრომო კოდი მიენიჭა: ${request.userName || request.userId}`);
      setPromoInputs((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      await loadPromoRequests();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "მინიჭება ვერ მოხერხდა");
    } finally {
      setAssigningPromoId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EV პრომო კოდები</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Premium მომხმარებლები EV დამტენის გვერდზე «პრომო კოდის გენერირება»-ს რომ დააჭერენ, მოთხოვნა აქ გამოჩნდება.
            ჩაწერე კოდი და დააჭირე «მინიჭება» — აპში user-ს გამოუჩნდება კოდი.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPromoRequests()}
          disabled={loading}
          className="px-4 py-2 rounded-lg border text-sm shrink-0"
        >
          განახლება
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="სულ (ფილტრი)" value={String(stats.total)} />
        <StatCard label="მოლოდინში" value={String(stats.pending)} highlight="amber" />
        <StatCard label="მინიჭებული" value={String(stats.assigned)} highlight="green" />
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="ok">{ok}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
          value={promoFilter}
          onChange={(e) => setPromoFilter(e.target.value as "pending" | "assigned" | "all")}
        >
          <option value="pending">მოლოდინში</option>
          <option value="assigned">მინიჭებული</option>
          <option value="all">ყველა</option>
        </select>
      </div>

      <div className="rounded-2xl border dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-900">
        {loading ? (
          <div className="p-12 text-center text-gray-500">იტვირთება…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="p-3 text-left">User ID</th>
                <th className="p-3 text-left">სახელი / ტელ.</th>
                <th className="p-3 text-left">სტატუსი</th>
                <th className="p-3 text-left">მოთხოვნის დრო</th>
                <th className="p-3 text-left">პრომო კოდი</th>
                <th className="p-3 text-left">მოქმედება</th>
              </tr>
            </thead>
            <tbody>
              {promoRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    მოთხოვნები არ არის
                  </td>
                </tr>
              ) : (
                promoRequests.map((req) => (
                  <tr key={req.id} className="border-t dark:border-gray-800 align-top">
                    <td className="p-3">
                      <a
                        className="text-blue-600 font-mono text-xs hover:underline"
                        href={`/users?q=${encodeURIComponent(req.userId)}`}
                      >
                        {req.userId}
                      </a>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{req.userName || "—"}</div>
                      <div className="text-xs text-gray-500 font-mono">{req.userPhone || "—"}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          req.status === "assigned"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {req.status === "assigned" ? "მინიჭებული" : "მოლოდინში"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {req.requestedAt
                        ? new Date(req.requestedAt).toLocaleString("ka-GE")
                        : "—"}
                      {req.assignedAt ? (
                        <div className="text-green-600 mt-1">
                          მინიჭ.: {new Date(req.assignedAt).toLocaleString("ka-GE")}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {req.status === "assigned" ? (
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {req.promoCode}
                        </span>
                      ) : (
                        <input
                          className="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 font-mono text-sm"
                          placeholder="EVP-123456"
                          value={promoInputs[req.id] ?? ""}
                          onChange={(e) =>
                            setPromoInputs((prev) => ({
                              ...prev,
                              [req.id]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </td>
                    <td className="p-3">
                      {req.status === "pending" ? (
                        <button
                          type="button"
                          disabled={assigningPromoId === req.id}
                          onClick={() => void assignPromoCode(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {assigningPromoId === req.id ? "ინახება…" : "მინიჭება"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "amber" | "green";
}) {
  const valueClass =
    highlight === "amber"
      ? "text-amber-600"
      : highlight === "green"
        ? "text-emerald-600"
        : "text-gray-900 dark:text-white";

  return (
    <div className="rounded-xl border dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-2xl mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg p-3 text-sm ${
        tone === "error"
          ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          : "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
      }`}
    >
      {children}
    </div>
  );
}
