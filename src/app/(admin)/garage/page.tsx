"use client";
import React, { useEffect, useMemo, useState } from "react";

type User = {
  id?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Car = {
  id?: string;
  _id?: string;
  userId?: string;
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  imageUri?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: User | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;

const PUSH_SCREEN_BY_TYPE: Record<string, string> = {
  general: "Notifications",
  fuel_discount: "ExclusiveFuelOffer",
  new_offer: "OfferDetails",
  garage_reminder: "Garage",
};

function applyOfferTemplate(template: string, car: Car, user: User): string {
  const firstName = (user.firstName || "").trim();
  const lastName = (user.lastName || "").trim();
  const patron = firstName || "მომხმარებელო";
  const map: Record<string, string> = {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || patron,
    patronName: patron,
    make: (car.make || "").trim(),
    model: (car.model || "").trim(),
    brand: (car.make || "").trim(),
    year: car.year != null ? String(car.year) : "",
    plateNumber: (car.plateNumber || "").trim(),
  };
  let out = template;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

export default function GaragePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [campaignTitleTpl, setCampaignTitleTpl] = useState("შეთავაზება {{make}}-ის მფლობელებს");
  const [campaignBodyTpl, setCampaignBodyTpl] = useState(
    "გამარჯობა {{patronName}}, გვინდა გაგიზიაროთ სპეციალური შეთავაზება შენს {{make}} {{model}}-ზე.",
  );
  const [pushType, setPushType] = useState<keyof typeof PUSH_SCREEN_BY_TYPE>("fuel_discount");
  const [excludePremium, setExcludePremium] = useState(false);
  const [campaignSending, setCampaignSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/garage/cars/all?t=${Date.now()}`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' },
        });
        const response = await res.json();
        // Response has structure: { success, message, data: [...], count }
        const list: Car[] = Array.isArray(response) ? response : response?.data || [];
        setCars(list);
      } catch (err) {
        console.error('Error loading garage cars:', err);
        setCars([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    const onFocus = () => load();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cars;
    return cars.filter((car) => 
      [
        car.make,
        car.model,
        String(car.year),
        car.plateNumber,
        car.userId,
        car.user?.firstName,
        car.user?.lastName,
        car.user?.phone,
        car.user?.email,
      ].some((v: string | number | undefined) => 
        v?.toString().toLowerCase().includes(term)
      )
    );
  }, [q, cars]);

  const stats = useMemo(() => {
    return {
      total: cars.length,
      withUsers: cars.filter(c => c.user).length,
      withoutUsers: cars.filter(c => !c.user).length,
    };
  }, [cars]);

  const uniqueMakes = useMemo(() => {
    const s = new Set<string>();
    cars.forEach((c) => {
      const m = (c.make || "").trim();
      if (m) s.add(m);
    });
    return [...s].sort((a, b) => a.localeCompare(b, "ka"));
  }, [cars]);

  const selectedBrandsLower = useMemo(
    () => new Set(selectedBrands.map((b) => b.trim().toLowerCase()).filter(Boolean)),
    [selectedBrands],
  );

  /** უნიკალური იუზერი + ერთი მანქანა (არჩეული ბრენდიდან პირველი შესაბამისი) — ტექსტის ცვლადებისთვის */
  const campaignRecipients = useMemo(() => {
    if (selectedBrandsLower.size === 0) return [] as Array<{ userId: string; car: Car; user: User }>;
    const byUser = new Map<string, { car: Car; user: User }>();
    for (const car of filtered) {
      const mk = (car.make || "").trim().toLowerCase();
      if (!mk || !selectedBrandsLower.has(mk)) continue;
      const uid = (car.userId || "").trim();
      const u = car.user;
      if (!uid || !u) continue;
      if (!byUser.has(uid)) byUser.set(uid, { car, user: u });
    }
    return [...byUser.entries()].map(([userId, { car, user }]) => ({ userId, car, user }));
  }, [filtered, selectedBrandsLower]);

  const toggleBrand = (make: string) => {
    setSelectedBrands((prev) => {
      const m = make.trim();
      if (!m) return prev;
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      return [...prev, m];
    });
  };

  const sendBrandCampaign = async () => {
    if (selectedBrands.length === 0) {
      alert("აირჩიე მინიმუმ ერთი ბრენდი (მაგ. Toyota, BMW).");
      return;
    }
    if (!campaignTitleTpl.trim() || !campaignBodyTpl.trim()) {
      alert("შეიყვანე შაბლონის სათაური და ტექსტი.");
      return;
    }
    if (campaignRecipients.length === 0) {
      alert("არჩეული ბრენდით იუზერი ვერ მოიძებნა (ან ძიების შედეგი ცარიელია).");
      return;
    }
    const sample = campaignRecipients
      .slice(0, 2)
      .map((r) => `${r.user.firstName || r.userId}: "${applyOfferTemplate(campaignBodyTpl, r.car, r.user).slice(0, 80)}…"`)
      .join("\n");
    if (
      !confirm(
        `გაგზავნა ${campaignRecipients.length} იუზერზე პერსონალიზებული push?\n\nნიმუში:\n${sample}\n\nტიპი: ${pushType}`,
      )
    )
      return;

    setCampaignSending(true);
    try {
      const screen = PUSH_SCREEN_BY_TYPE[pushType] || "Notifications";
      const items = campaignRecipients.map((r) => ({
        userId: r.userId,
        title: applyOfferTemplate(campaignTitleTpl, r.car, r.user),
        body: applyOfferTemplate(campaignBodyTpl, r.car, r.user),
      }));
      const res = await fetch(`${API_BASE}/notifications/broadcast-personalized`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          excludePremium,
          data: {
            type: pushType,
            screen,
            source: "admin_garage_campaign",
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`);
      }
      alert((json as { message?: string }).message || "გაგზავნილია");
    } catch (e) {
      console.error(e);
      alert(`შეცდომა: ${e instanceof Error ? e.message : "უცნობი"}`);
    } finally {
      setCampaignSending(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">🚗 გარაჟი - მანქანები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "იტვირთება..." : `${filtered.length} შედეგი`}
          </span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძიება: ბრენდი, მოდელი, იუზერი, ტელეფონი..."
          className="border rounded-md px-3 py-2 text-base w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">სულ მანქანა</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">იუზერით</div>
          <div className="text-2xl font-bold text-green-600">{stats.withUsers}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">იუზერის გარეშე</div>
          <div className="text-2xl font-bold text-orange-600">{stats.withoutUsers}</div>
        </div>
      </div>

      {/* მარკეტინგული კამპანია — სეგმენტი ბრენდით + პერსონალიზებული push */}
      <div className="mb-6 border border-violet-200 bg-violet-50/60 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-violet-900 mb-1">მარკეტინგული კამპანია (ბრენდი → იუზერი)</h2>
        <p className="text-sm text-violet-800/90 mb-4">
          აირჩიე ბრენდ(ებ)ი, შეავსე შაბლონი ცვლადებით:{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{patronName}}"}</code>,{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{firstName}}"}</code>,{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{make}}"}</code>,{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{model}}"}</code>,{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{year}}"}</code>,{" "}
          <code className="text-xs bg-white/80 px-1 rounded">{"{{plateNumber}}"}</code>.
          სია იღებს მხოლოდ ზემოთ ძიებით გაფილტრულ მანქანებს.
        </p>

        <div className="mb-3">
          <div className="text-sm font-medium text-gray-700 mb-2">ბრენდის არჩევა</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {uniqueMakes.length === 0 ? (
              <span className="text-sm text-gray-500">მანქანები ჯერ არ ჩანს</span>
            ) : (
              uniqueMakes.map((make) => {
                const on = selectedBrands.includes(make);
                return (
                  <button
                    key={make}
                    type="button"
                    onClick={() => toggleBrand(make)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      on
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-violet-300"
                    }`}
                  >
                    {make}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">სათაურის შაბლონი</label>
            <input
              value={campaignTitleTpl}
              onChange={(e) => setCampaignTitleTpl(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">აპში გახსნის ტიპი</label>
            <select
              value={pushType}
              onChange={(e) => setPushType(e.target.value as keyof typeof PUSH_SCREEN_BY_TYPE)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="fuel_discount">საწვავის შეთავაზება (ExclusiveFuelOffer)</option>
              <option value="new_offer">შეთავაზებები (OfferDetails)</option>
              <option value="garage_reminder">გარაჟი</option>
              <option value="general">ზოგადი (Notifications)</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">ტექსტის შაბლონი (body)</label>
          <textarea
            value={campaignBodyTpl}
            onChange={(e) => setCampaignBodyTpl(e.target.value)}
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={excludePremium}
              onChange={(e) => setExcludePremium(e.target.checked)}
            />
            Premium იუზერები არ მივაწვდინოთ
          </label>
          <span className="text-sm text-gray-600">
            მიმღები იუზერები (უნიკალური):{" "}
            <strong>{campaignRecipients.length}</strong>
          </span>
        </div>

        <button
          type="button"
          disabled={campaignSending || campaignRecipients.length === 0}
          onClick={sendBrandCampaign}
          className="px-4 py-2 rounded-md bg-violet-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700"
        >
          {campaignSending ? "იგზავნება…" : "პერსონალიზებული push-ის გაგზავნა"}
        </button>
      </div>

      {/* Cars Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 py-10">იტვირთება...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-10">მანქანები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">სურათი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">მანქანა</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">წელი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ნომერი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">იუზერი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ტელეფონი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ელფოსტა</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((car) => {
                  const carId = car.id || car._id;
                  const user = car.user;
                  
                  return (
                    <tr key={carId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {car.imageUri ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={car.imageUri} 
                            alt={`${car.make} ${car.model}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {car.make || '—'} {car.model || ''}
                        </div>
                        {car.userId && (
                          <div className="text-xs text-gray-400 mt-1">ID: {car.userId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {car.year || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {car.plateNumber || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {user ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {user.firstName || ''} {user.lastName ? user.lastName : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.phone ? (
                          <a 
                            href={`tel:${user.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.phone}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.email ? (
                          <a 
                            href={`mailto:${user.email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {user.email}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {car.isActive !== undefined ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            car.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {car.isActive ? 'აქტიური' : 'არააქტიური'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

