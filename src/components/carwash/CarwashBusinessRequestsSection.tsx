"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetJson } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { CITIES, type CarwashFormState } from "@/components/carwash/carwashAdminTypes";

export type CarwashBusinessRequest = {
  id: string;
  message?: string;
  userId?: string;
  userName?: string;
  phone?: string;
  source?: string;
  createdAt?: string;
};

type FeedbackResponse = {
  success: boolean;
  data: CarwashBusinessRequest[];
  total: number;
};

export type ParsedCarwashRequest = {
  businessName: string;
  contactName: string;
  phone: string;
  city: string;
  address: string;
  note: string;
};

export function parseCarwashBusinessMessage(message?: string): ParsedCarwashRequest {
  const lines = (message || "").split("\n");
  const pick = (prefix: string) => {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };
  return {
    businessName: pick("სამრეცხაო: "),
    contactName: pick("საკონტაქტო: "),
    phone: pick("ტელეფონი: "),
    city: pick("ქალაქი: "),
    address: pick("მისამართი: "),
    note: pick("კომენტარი: "),
  };
}

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("ka-GE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

type Props = {
  onCreateFromRequest: (prefill: Partial<CarwashFormState>, request: CarwashBusinessRequest) => void;
};

export default function CarwashBusinessRequestsSection({ onCreateFromRequest }: Props) {
  const [requests, setRequests] = useState<CarwashBusinessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CarwashBusinessRequest | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGetJson<FeedbackResponse>("/feedback?limit=200&offset=0");
      const list = (res.data ?? [])
        .map((item) => ({
          ...item,
          id: item.id || (item as { _id?: string })._id || "",
        }))
        .filter((item) => item.source === "carwash_business" && item.id);
      list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setRequests(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "განაცხადების ჩატვირთვა ვერ მოხერხდა");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () =>
      requests.map((req) => ({
        req,
        parsed: parseCarwashBusinessMessage(req.message),
      })),
    [requests],
  );

  const handleCreate = (req: CarwashBusinessRequest, parsed: ParsedCarwashRequest) => {
    const city = CITIES.includes(parsed.city) ? parsed.city : "თბილისი";
    const descriptionParts = [
      parsed.note,
      parsed.contactName ? `საკონტაქტო: ${parsed.contactName}` : "",
      req.userId ? `userId: ${req.userId}` : "",
    ].filter(Boolean);

    onCreateFromRequest(
      {
        name: parsed.businessName || req.userName || "",
        phone: parsed.phone || req.phone || "",
        location: city,
        address: parsed.address,
        description: descriptionParts.join("\n"),
        ownerUserId: req.userId || "",
      },
      req,
    );
  };

  const openDetails = (req: CarwashBusinessRequest) => {
    setSelected(req);
    openModal();
  };

  return (
    <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-amber-950">პარტნიორობის განაცხადები</h2>
          <p className="text-sm text-amber-900/70 mt-1">
            აპიდან „ბიზნესი“ ტაბიდან მოსული განაცხადები — აქედან შეგიძლია სამრეცხაოს შექმნა
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm border border-amber-300 rounded-md bg-white hover:bg-amber-50"
        >
          განახლება
        </button>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-amber-900/70 py-4 text-center">იტვირთება...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-amber-900/70 py-4 text-center border border-dashed border-amber-200 rounded-lg bg-white/70">
          ჯერ არ არის ახალი განაცხადი
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-amber-100 rounded-lg">
          <table className="w-full min-w-[760px]">
            <thead className="bg-amber-100/60">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">თარიღი</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">სამრეცხაო</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">საკონტაქტო</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">ტელეფონი</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">ქალაქი</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-amber-950 uppercase">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {rows.map(({ req, parsed }) => (
                <tr key={req.id} className="hover:bg-amber-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {parsed.businessName || req.userName || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{parsed.contactName || req.userName || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{parsed.phone || req.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{parsed.city || "—"}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(req)}
                        className="px-2.5 py-1 border rounded-md hover:bg-gray-50"
                      >
                        ნახვა
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreate(req, parsed)}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        შექმნა
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl p-6 lg:p-8">
        {selected ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">განაცხადის დეტალები</h3>
            <div className="p-4 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap">
              {selected.message || "—"}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">მომხმარებელი</span>
                <p>{selected.userName || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">User ID</span>
                <p className="break-all">{selected.userId || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">ტელეფონი</span>
                <p>{selected.phone || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">თარიღი</span>
                <p>{formatDate(selected.createdAt)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-md">
                დახურვა
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCreate(selected, parseCarwashBusinessMessage(selected.message));
                  closeModal();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                სამრეცხაოს შექმნა
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
