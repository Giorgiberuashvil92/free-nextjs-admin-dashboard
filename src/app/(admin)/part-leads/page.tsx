"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetJson, apiPatch } from "@/lib/api";

type PartLeadStatus = "new" | "contacted" | "closed";

type PartLead = {
  id?: string;
  _id?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  partId?: string;
  partTitle?: string;
  partPrice?: string;
  partBrand?: string;
  partModel?: string;
  partCategory?: string;
  partLocation?: string;
  partImage?: string;
  note?: string;
  source?: string;
  status?: PartLeadStatus | string;
  createdAt?: string;
};

const STATUS_OPTIONS: Array<{ value: "all" | PartLeadStatus; label: string }> = [
  { value: "all", label: "ყველა" },
  { value: "new", label: "ახალი" },
  { value: "contacted", label: "დაკავშირებული" },
  { value: "closed", label: "დახურული" },
];

const STATUS_LABELS: Record<PartLeadStatus, string> = {
  new: "ახალი",
  contacted: "დაკავშირებული",
  closed: "დახურული",
};

const leadId = (lead: PartLead) => String(lead.id || lead._id || "");

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ka-GE");
}

function formatPhone(phone?: string): string {
  const digits = clean(phone).replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("5")) {
    return `+995 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith("995")) {
    const local = digits.slice(3);
    return `+995 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return clean(phone);
}

function phoneHref(phone?: string): string {
  const digits = clean(phone).replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("5")) return `tel:+995${digits}`;
  if (digits.length === 12 && digits.startsWith("995")) return `tel:+${digits}`;
  return phone ? `tel:${phone}` : "";
}

function statusClass(status?: string): string {
  if (status === "contacted") return "bg-indigo-50 text-indigo-700";
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

export default function PartLeadsPage() {
  const [rows, setRows] = useState<PartLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | PartLeadStatus>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: PartLead[] }>(
        "/part-leads?limit=100",
      );
      setRows((res.data || []).map((lead) => ({ ...lead, id: lead.id || lead._id })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ნაწილების მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((lead) => lead.status === "new").length,
      contacted: rows.filter((lead) => lead.status === "contacted").length,
      closed: rows.filter((lead) => lead.status === "closed").length,
    }),
    [rows],
  );

  const visibleRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((lead) => lead.status === statusFilter)),
    [rows, statusFilter],
  );

  const setStatus = async (lead: PartLead, status: PartLeadStatus) => {
    const id = leadId(lead);
    if (!id) return;
    await apiPatch(`/part-leads/${id}/status`, { status });
    await load();
  };

  const copy = async (value?: string) => {
    const text = clean(value);
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ნაწილების მოთხოვნები</h1>
          <p className="mt-1 text-sm text-gray-500">
            აპიდან შემოსული “მინდა ნაწილი” მოთხოვნები კონკრეტულ პროდუქტებზე.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          განახლება
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">ჩანს</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {loading ? "..." : totals.all}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">ახალი</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">{totals.new}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">დაკავშირებული</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-700">{totals.contacted}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">დახურული</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">{totals.closed}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              statusFilter === option.value
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {visibleRows.map((lead) => {
          const id = leadId(lead);
          const phone = formatPhone(lead.userPhone);
          const callUrl = phoneHref(lead.userPhone);
          const status = (lead.status || "new") as PartLeadStatus;

          return (
            <div key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 gap-4">
                  {lead.partImage ? (
                    <img
                      src={lead.partImage}
                      alt={lead.partTitle || "part"}
                      className="h-24 w-28 shrink-0 rounded-xl border border-gray-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                      ფოტო
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">{formatDate(lead.createdAt)}</div>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900">
                      {lead.partTitle || "ნაწილის მოთხოვნა"}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      {lead.partBrand ? <span className="rounded-full bg-gray-100 px-2 py-1">{lead.partBrand}</span> : null}
                      {lead.partModel ? <span className="rounded-full bg-gray-100 px-2 py-1">{lead.partModel}</span> : null}
                      {lead.partCategory ? <span className="rounded-full bg-gray-100 px-2 py-1">{lead.partCategory}</span> : null}
                      {lead.partLocation ? <span className="rounded-full bg-gray-100 px-2 py-1">{lead.partLocation}</span> : null}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass(status)}`}>
                  {STATUS_LABELS[status] || status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <div className="text-gray-500">მომხმარებელი</div>
                  <div className="font-medium text-gray-900">{lead.userName || "მომხმარებელი"}</div>
                </div>
                <div>
                  <div className="text-gray-500">ნომერი</div>
                  <div className="font-medium text-gray-900">{phone || "არ ჩანს"}</div>
                </div>
                <div>
                  <div className="text-gray-500">ფასი</div>
                  <div className="font-medium text-gray-900">{lead.partPrice || "არ არის"}</div>
                </div>
                <div>
                  <div className="text-gray-500">User ID</div>
                  <button
                    type="button"
                    onClick={() => copy(lead.userId)}
                    className="max-w-full truncate font-mono text-xs text-gray-900 hover:text-indigo-700"
                  >
                    {lead.userId || "N/A"}
                  </button>
                </div>
              </div>

              {lead.note ? (
                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  {lead.note}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {callUrl ? (
                  <a
                    href={callUrl}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    დარეკვა
                  </a>
                ) : null}
                {phone ? (
                  <button
                    type="button"
                    onClick={() => copy(lead.userPhone)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    ნომრის კოპირება
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => copy(id)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  Lead ID
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(lead, "contacted")}
                  className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
                >
                  დაკავშირებულია
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(lead, "closed")}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                >
                  დაიხურა
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
          მოთხოვნები ჯერ არ არის
        </div>
      ) : null}
    </div>
  );
}
