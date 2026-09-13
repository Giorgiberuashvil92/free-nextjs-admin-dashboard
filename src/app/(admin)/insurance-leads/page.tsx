"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetJson, apiPatch } from "@/lib/api";

type InsuranceLead = {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  personalId?: string;
  phone?: string;
  email?: string;
  userId?: string;
  productType?: "motor" | "mtpl" | "mtpl_premium" | string;
  planKey?: string;
  planLabel?: string;
  priceMonthly?: number;
  priceYearly?: number;
  carInfo?: string;
  source?: string;
  adminNote?: string;
  called?: boolean;
  createdAt?: string;
};

type ListResponse = {
  success: boolean;
  data: InsuranceLead[];
  total: number;
  limit: number;
  offset: number;
};

const productLabels: Record<string, string> = {
  motor: "ავტოდაზღვევა",
  mtpl: "MTPL",
  mtpl_premium: "MTPL Premium",
};

const leadId = (lead: InsuranceLead) => String(lead.id || lead._id || "");

function formatDate(raw?: string) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function InsuranceLeadsPage() {
  const [rows, setRows] = useState<InsuranceLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<ListResponse>("/insurance-leads?limit=200");
      if (!res.success) {
        setError("ჩატვირთვა ვერ მოხერხდა");
        return;
      }
      setRows((res.data || []).map((lead) => ({ ...lead, id: lead.id || lead._id })));
      setTotal(res.total || 0);
      setNoteDrafts({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((lead) =>
      [
        lead.firstName,
        lead.lastName,
        lead.phone,
        lead.email,
        lead.personalId,
        lead.userId,
        lead.productType,
        lead.planLabel,
        lead.carInfo,
        lead.adminNote,
      ].some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }, [query, rows]);

  const setCalled = async (lead: InsuranceLead, called: boolean) => {
    const id = leadId(lead);
    if (!id) return;
    setSaving((prev) => ({ ...prev, [`called:${id}`]: true }));
    setError("");
    try {
      await apiPatch(`/insurance-leads/${id}`, { called });
      setRows((list) => list.map((item) => (leadId(item) === id ? { ...item, called } : item)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving((prev) => {
        const next = { ...prev };
        delete next[`called:${id}`];
        return next;
      });
    }
  };

  const saveNote = async (lead: InsuranceLead) => {
    const id = leadId(lead);
    if (!id) return;
    const adminNote = noteDrafts[id] ?? lead.adminNote ?? "";
    setSaving((prev) => ({ ...prev, [`note:${id}`]: true }));
    setError("");
    try {
      await apiPatch(`/insurance-leads/${id}`, { adminNote });
      setRows((list) => list.map((item) => (leadId(item) === id ? { ...item, adminNote } : item)));
      setNoteDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving((prev) => {
        const next = { ...prev };
        delete next[`note:${id}`];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">დაზღვევის მოთხოვნები</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Marte აპიდან გამოგზავნილი ავტოდაზღვევის განაცხადები.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ძებნა: სახელი, ტელეფონი, პროდუქტი..."
            className="w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
          >
            განახლება
          </button>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {loading ? "იტვირთება..." : `${filteredRows.length}/${total} მოთხოვნა`}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3">თარიღი</th>
              <th className="px-4 py-3">კონტაქტი</th>
              <th className="px-4 py-3">პროდუქტი</th>
              <th className="px-4 py-3">ფასი</th>
              <th className="px-4 py-3">სტატუსი</th>
              <th className="px-4 py-3">შენიშვნა</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  იტვირთება...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  მოთხოვნები ჯერ არ არის
                </td>
              </tr>
            ) : (
              filteredRows.map((lead) => {
                const id = leadId(lead);
                const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
                const calledSaving = saving[`called:${id}`];
                const noteSaving = saving[`note:${id}`];

                return (
                  <tr key={id} className={lead.called ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{fullName || "უცნობი"}</div>
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                          {lead.phone}
                        </a>
                      ) : (
                        <div className="text-gray-400">ტელეფონი არ არის</div>
                      )}
                      {lead.email ? <div className="text-xs text-gray-500">{lead.email}</div> : null}
                      {lead.userId ? <div className="text-xs text-gray-400">userId: {lead.userId}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {productLabels[String(lead.productType || "")] || lead.productType || "-"}
                      </div>
                      <div className="max-w-xs text-xs text-gray-500">{lead.planLabel || lead.planKey || "-"}</div>
                      {lead.carInfo ? <div className="mt-1 text-xs text-gray-500">{lead.carInfo}</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-200">
                      {lead.priceMonthly ? `${lead.priceMonthly}₾/თვე` : "-"}
                      {lead.priceYearly ? <div className="text-xs text-gray-500">{lead.priceYearly}₾/წელი</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={calledSaving}
                        onClick={() => setCalled(lead, !lead.called)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${
                          lead.called
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        } disabled:opacity-60`}
                      >
                        {calledSaving ? "ინახება..." : lead.called ? "დარეკილია" : "დასარეკია"}
                      </button>
                    </td>
                    <td className="min-w-72 px-4 py-3">
                      <textarea
                        value={noteDrafts[id] ?? lead.adminNote ?? ""}
                        onChange={(event) =>
                          setNoteDrafts((prev) => ({ ...prev, [id]: event.target.value }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
                        placeholder="Admin note..."
                      />
                      <button
                        type="button"
                        disabled={noteSaving}
                        onClick={() => saveNote(lead)}
                        className="mt-2 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
                      >
                        {noteSaving ? "ინახება..." : "შენახვა"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
