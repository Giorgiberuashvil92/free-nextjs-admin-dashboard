"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, apiDelete, apiGetJson, apiPatch, apiPost } from "@/lib/api";

type StoreLite = {
  id: string;
  title?: string;
  name?: string;
};

type SpecialOffer = {
  id: string;
  storeId: string;
  title?: string;
  description?: string;
  oldPrice: string;
  newPrice: string;
  discount: string;
  image?: string;
  isActive: boolean;
};

type OfferForm = {
  storeId: string;
  title: string;
  subtitle: string;
  partnerName: string;
  description: string;
  category: "fuel" | "fines" | "services" | "insurance" | "parts" | "other";
  route: string;
  icon: string;
  badge: string;
  featuredOnHome: boolean;
  iconColor: string;
  iconBg: string;
  logoSvg: string;
  oldPrice: string;
  newPrice: string;
  discount: string;
  image: string;
  isActive: boolean;
};

type PremiumMeta = {
  subtitle?: string;
  partnerName?: string;
  category?: OfferForm["category"];
  route?: string;
  icon?: string;
  badge?: string;
  featuredOnHome?: boolean;
  iconColor?: string;
  iconBg?: string;
  logoSvg?: string;
};

const PREMIUM_META_START = "[premium_meta]";
const PREMIUM_META_END = "[/premium_meta]";

const CATEGORY_OPTIONS: Array<{ value: OfferForm["category"]; label: string }> = [
  { value: "fuel", label: "საწვავი" },
  { value: "fines", label: "ჯარიმები" },
  { value: "services", label: "სერვისები" },
  { value: "insurance", label: "დაზღვევა" },
  { value: "parts", label: "ნაწილები" },
  { value: "other", label: "სხვა" },
];

function parsePremiumMeta(raw?: string): { meta: PremiumMeta; description: string } {
  if (!raw) return { meta: {}, description: "" };
  const trimmed = raw.trim();
  if (!trimmed.startsWith(PREMIUM_META_START)) {
    return { meta: {}, description: raw };
  }
  const endIdx = trimmed.indexOf(PREMIUM_META_END);
  if (endIdx < 0) return { meta: {}, description: raw };

  const jsonPart = trimmed.slice(PREMIUM_META_START.length, endIdx).trim();
  const rest = trimmed.slice(endIdx + PREMIUM_META_END.length).trim();
  try {
    const meta = JSON.parse(jsonPart) as PremiumMeta;
    return { meta: meta || {}, description: rest };
  } catch {
    return { meta: {}, description: raw };
  }
}

function buildPremiumMetaDescription(form: OfferForm): string {
  const meta: PremiumMeta = {
    subtitle: form.subtitle || undefined,
    partnerName: form.partnerName || undefined,
    category: form.category || "other",
    route: form.route || undefined,
    icon: form.icon || undefined,
    badge: form.badge || undefined,
    featuredOnHome: form.featuredOnHome,
    iconColor: form.iconColor || undefined,
    iconBg: form.iconBg || undefined,
    logoSvg: form.logoSvg || undefined,
  };
  return `${PREMIUM_META_START}${JSON.stringify(meta)}${PREMIUM_META_END}\n${form.description || ""}`.trim();
}

const EMPTY_FORM: OfferForm = {
  storeId: "",
  title: "",
  subtitle: "",
  partnerName: "",
  description: "",
  category: "other",
  route: "",
  icon: "sparkles",
  badge: "",
  featuredOnHome: true,
  iconColor: "",
  iconBg: "",
  logoSvg: "",
  oldPrice: "",
  newPrice: "",
  discount: "",
  image: "",
  isActive: true,
};

export default function OffersAdminPage() {
  const [stores, setStores] = useState<StoreLite[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const storesRes = await apiGetJson<any>("/stores?limit=500");
      const storesList = Array.isArray(storesRes)
        ? storesRes
        : Array.isArray(storesRes?.data)
          ? storesRes.data
          : [];
      setStores(storesList);

      const offersRes = await fetch(`${API_BASE}/special-offers?activeOnly=false`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const offersJson = await offersRes.json().catch(() => ({}));
      if (!offersRes.ok) {
        throw new Error(offersJson?.message || "ოფერების წამოღება ვერ მოხერხდა");
      }
      setOffers(Array.isArray(offersJson?.data) ? offersJson.data : []);
    } catch (e: any) {
      setError(e?.message || "მონაცემების წამოღება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredOffers = useMemo(() => {
    let list = offers;
    if (selectedStore !== "all") {
      list = list.filter((o) => o.storeId === selectedStore);
    }
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((o) =>
      [o.title, o.description, o.oldPrice, o.newPrice, o.discount, o.storeId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [offers, query, selectedStore]);

  const storeName = (storeId: string) => {
    const s = stores.find((x) => x.id === storeId);
    return s?.title || s?.name || storeId;
  };

  const resetForm = () => {
    setEditingOffer(null);
    setForm(EMPTY_FORM);
  };

  const onEdit = (offer: SpecialOffer) => {
    const { meta, description } = parsePremiumMeta(offer.description || "");
    setEditingOffer(offer);
    setForm({
      storeId: offer.storeId || "",
      title: offer.title || "",
      subtitle: meta.subtitle || "",
      partnerName: meta.partnerName || "",
      description,
      category: meta.category || "other",
      route: meta.route || "",
      icon: meta.icon || "sparkles",
      badge: meta.badge || "",
      featuredOnHome: meta.featuredOnHome ?? true,
      iconColor: meta.iconColor || "",
      iconBg: meta.iconBg || "",
      logoSvg: meta.logoSvg || "",
      oldPrice: offer.oldPrice || "",
      newPrice: offer.newPrice || "",
      discount: offer.discount || "",
      image: offer.image || "",
      isActive: offer.isActive,
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId || !form.oldPrice || !form.newPrice || !form.discount) {
      setError("store, oldPrice, newPrice და discount სავალდებულოა");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        storeId: form.storeId,
        title: form.title || undefined,
        description: buildPremiumMetaDescription(form),
        oldPrice: form.oldPrice,
        newPrice: form.newPrice,
        discount: form.discount,
        image: form.image || undefined,
        isActive: form.isActive,
      };
      if (editingOffer?.id) {
        await apiPatch(`/special-offers/${editingOffer.id}`, payload);
      } else {
        await apiPost("/special-offers", payload);
      }
      await loadData();
      resetForm();
    } catch (e: any) {
      setError(e?.message || "ოფერის შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (offer: SpecialOffer) => {
    try {
      await apiPatch(`/special-offers/${offer.id}/toggle-active`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "აქტივობის შეცვლა ვერ მოხერხდა");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("დარწმუნებული ხარ, რომ გინდა ოფერის წაშლა?")) return;
    try {
      await apiDelete(`/special-offers/${id}`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "ოფერის წაშლა ვერ მოხერხდა");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Premium შეთავაზებების მართვა</h1>
        <p className="text-sm text-gray-500">მობაილის Premium შეთავაზებები — დამატება, დამალვა/გამოჩენა, პარტნიორების მართვა</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <form onSubmit={onSubmit} className="rounded-md border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{editingOffer ? "ოფერის რედაქტირება" : "ახალი ოფერი"}</h2>
          {editingOffer ? (
            <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded border">
              გაუქმება
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={form.storeId}
            onChange={(e) => setForm((p) => ({ ...p, storeId: e.target.value }))}
            className="border rounded-md px-3 py-2"
            required
          >
            <option value="">აირჩიე მაღაზია</option>
            {stores.map((s, idx) => (
              <option key={`${s.id || s.title || s.name || "store"}-${idx}`} value={s.id}>
                {s.title || s.name || s.id}
              </option>
            ))}
          </select>
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as OfferForm["category"] }))}
            className="border rounded-md px-3 py-2"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={form.partnerName}
            onChange={(e) => setForm((p) => ({ ...p, partnerName: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="პარტნიორი (მაგ. Portal)"
          />
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="სათაური (მაგ. საწვავი)"
          />
          <input
            value={form.subtitle}
            onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="ქვესათაური (მაგ. −17 თთ ლიტრზე)"
          />
          <input
            value={form.route}
            onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="Route (მაგ. /exclusive-fuel-offer)"
          />
          <input
            value={form.icon}
            onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="Ionicon (მაგ. flame)"
          />
          <input
            value={form.badge}
            onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="ბეჯი (მაგ. HOT / LIVE)"
          />
          <input
            value={form.oldPrice}
            onChange={(e) => setForm((p) => ({ ...p, oldPrice: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="ძველი ფასი"
            required
          />
          <input
            value={form.newPrice}
            onChange={(e) => setForm((p) => ({ ...p, newPrice: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="ახალი ფასი"
            required
          />
          <input
            value={form.discount}
            onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="ფასდაკლება %"
            required
          />
          <input
            value={form.image}
            onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="სურათის URL"
          />
          <input
            value={form.iconColor}
            onChange={(e) => setForm((p) => ({ ...p, iconColor: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="icon ფერი (მაგ. #C2410C)"
          />
          <input
            value={form.iconBg}
            onChange={(e) => setForm((p) => ({ ...p, iconBg: e.target.value }))}
            className="border rounded-md px-3 py-2"
            placeholder="icon ფონური ფერი (მაგ. #FFEDD5)"
          />
        </div>

        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="border rounded-md px-3 py-2 w-full min-h-24"
          placeholder="აღწერა (ბარათის ტექსტი)"
        />

        <textarea
          value={form.logoSvg}
          onChange={(e) => setForm((p) => ({ ...p, logoSvg: e.target.value }))}
          className="border rounded-md px-3 py-2 w-full min-h-24"
          placeholder="SVG ლოგო (არასავალდებულო)"
        />

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            აქტიური
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featuredOnHome}
              onChange={(e) => setForm((p) => ({ ...p, featuredOnHome: e.target.checked }))}
            />
            მთავარ გვერდზე გამოჩნდეს
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? "ინახება..." : editingOffer ? "განახლება" : "დამატება"}
          </button>
        </div>
      </form>

      <div className="rounded-md border p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h2 className="font-medium">ოფერების სია ({filteredOffers.length})</h2>
          <div className="flex gap-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">ყველა მაღაზია</option>
              {stores.map((s, idx) => (
                <option key={`${s.id || s.title || s.name || "store-filter"}-${idx}`} value={s.id}>
                  {s.title || s.name || s.id}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border rounded-md px-3 py-2"
              placeholder="ძიება..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">იტვირთება...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">ოფერები ვერ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">მაღაზია</th>
                  <th className="px-3 py-2 text-left">სათაური</th>
                  <th className="px-3 py-2 text-left">ფასები</th>
                  <th className="px-3 py-2 text-left">სტატუსი</th>
                  <th className="px-3 py-2 text-left">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2">{storeName(o.storeId)}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        const { meta, description } = parsePremiumMeta(o.description || "");
                        return (
                          <>
                            <div className="font-medium">{o.title || "—"}</div>
                            <div className="text-xs text-gray-500">{description || ""}</div>
                            <div className="text-xs text-gray-400">
                              {meta.partnerName || "Partner"} · {meta.category || "other"} · {meta.route || "/premium-offers"}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        {o.oldPrice} ₾ → {o.newPrice} ₾
                      </div>
                      <div className="text-xs text-gray-500">discount: {o.discount}%</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          o.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {o.isActive ? "აქტიური" : "არააქტიური"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(o)} className="text-blue-600 hover:underline">
                          რედაქტირება
                        </button>
                        <button onClick={() => onToggle(o)} className="text-amber-600 hover:underline">
                          {o.isActive ? "დამალვა" : "გამოჩენა"}
                        </button>
                        <button onClick={() => onDelete(o.id)} className="text-red-600 hover:underline">
                          წაშლა
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

