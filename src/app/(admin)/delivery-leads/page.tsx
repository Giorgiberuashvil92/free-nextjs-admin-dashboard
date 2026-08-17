"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetJson, apiPatch } from "@/lib/api";

type DeliveryLead = {
  id?: string;
  _id?: string;
  firstName: string;
  phone: string;
  address: string;
  itemDetails: string;
  productTitle?: string;
  productType?: string;
  items?: Array<{ title?: string; quantity?: number; price?: number }>;
  totalPrice?: number;
  source?: string;
  status?: string;
  adminNote?: string;
  createdAt?: string;
};

const leadId = (lead: DeliveryLead) => String(lead.id || lead._id || "");

export default function DeliveryLeadsPage() {
  const [rows, setRows] = useState<DeliveryLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<{ success: boolean; data: DeliveryLead[] }>(
        "/delivery-leads?limit=100",
      );
      setRows((res.data || []).map((lead) => ({ ...lead, id: lead.id || lead._id })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (lead: DeliveryLead, status: string) => {
    const id = leadId(lead);
    if (!id) return;
    await apiPatch(`/delivery-leads/${id}`, { status });
    await load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">მიტანის მოთხოვნები</h1>
          <p className="mt-1 text-sm text-gray-500">
            აპიდან გამოგზავნილი გამოძახებები და კალათის შეკვეთები.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
          {loading ? "იტვირთება..." : `${rows.length} მოთხოვნა`}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {rows.map((lead) => (
          <div key={leadId(lead)} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleString("ka-GE") : ""}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  {lead.productTitle || "მიტანის მოთხოვნა"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{lead.itemDetails}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {lead.status || "new"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <div className="text-gray-500">მომხმარებელი</div>
                <div className="font-medium text-gray-900">{lead.firstName} · {lead.phone}</div>
              </div>
              <div>
                <div className="text-gray-500">მისამართი</div>
                <div className="font-medium text-gray-900">{lead.address}</div>
              </div>
              <div>
                <div className="text-gray-500">ჯამი</div>
                <div className="font-medium text-gray-900">{Number(lead.totalPrice || 0).toFixed(2)}₾</div>
              </div>
            </div>

            {lead.items?.length ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                {lead.items.map((item, index) => (
                  <div key={`${item.title}-${index}`}>
                    {item.title} x{item.quantity || 1} · {Number(item.price || 0).toFixed(2)}₾
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatus(lead, "processing")}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                დამუშავებაში
              </button>
              <button
                type="button"
                onClick={() => setStatus(lead, "done")}
                className="rounded-lg bg-black px-3 py-2 text-sm text-white"
              >
                დასრულდა
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
          მოთხოვნები ჯერ არ არის
        </div>
      ) : null}
    </div>
  );
}
