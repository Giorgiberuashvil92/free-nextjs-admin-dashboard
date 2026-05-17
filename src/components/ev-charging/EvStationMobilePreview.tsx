"use client";

import type { EvChargerRow, EvStationFormState } from "./evChargingTypes";

const BRAND = "#03FF68";

type Props = {
  form: EvStationFormState;
  partnerName?: string;
  defaultAbout?: string;
};

function maxKw(chargers: EvChargerRow[]) {
  return chargers.reduce((m, c) => Math.max(m, Number(c.maxPowerKw) || 0), 0);
}

export default function EvStationMobilePreview({ form, partnerName, defaultAbout }: Props) {
  const hero = form.heroImageUrl || form.galleryImageUrls?.[0];
  const displayPartner = partnerName || form.partnerId || "პარტნიორი";
  const about =
    form.aboutText?.trim() ||
    defaultAbout ||
    "სადგური Marte პარტნიორის ქსელის ნაწილია — სრული პირობები და ფასები პაკეტების გვერდზეა ხელმისაწვდომი.";
  const kw = maxKw(form.chargers || []);

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] text-white shadow-xl max-w-sm mx-auto">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 pt-3 pb-1 text-center">
        აპში ასე გამოჩნდება
      </p>
      <div className="relative h-36 bg-zinc-900">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="w-full h-full object-cover opacity-90" />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#02180f] to-[#050505]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        <span
          className="absolute bottom-2 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "rgba(3,255,104,0.2)", color: BRAND }}
        >
          {displayPartner}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-bold leading-tight">{form.siteName || "სადგურის სახელი"}</h3>
        <p className="text-xs text-zinc-400 flex gap-1 items-start">
          <span>📍</span>
          <span>{form.address || "მისამართი"}</span>
        </p>
        {form.rating != null && Number.isFinite(form.rating) ? (
          <p className="text-sm text-amber-400">
            ★ {form.rating.toFixed(1)}
            {form.reviewsCount ? (
              <span className="text-zinc-500 ml-1">({form.reviewsCount} შეფასება)</span>
            ) : null}
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="max სიმძლავრე" value={`${kw || "—"} kW`} />
          <StatBox label="ფასი" value={form.priceLabel || "—"} />
          <StatBox label="სწრაფი დამუხტვა" value={form.chargeSpeedHint || `${form.chargers?.length || 0} დამტენი`} />
        </div>
        {form.perkHint ? (
          <div
            className="flex gap-2 items-center text-xs rounded-lg px-3 py-2"
            style={{ backgroundColor: "rgba(3,255,104,0.12)", color: BRAND }}
          >
            🏷 {form.perkHint}
          </div>
        ) : null}
        {form.openingHours ? (
          <p className="text-xs text-zinc-400">🕐 {form.openingHours}</p>
        ) : null}
        <p className="text-xs text-zinc-300 line-clamp-4">{about}</p>
        {(form.chargers || []).slice(0, 2).map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/80 p-2 text-xs">
            <span style={{ color: BRAND }}>⚡</span>
            <span className="flex-1">
              {c.label} · {c.connectorType} · {c.maxPowerKw} kW
            </span>
            <StatusPill status={c.status} />
          </div>
        ))}
        {(form.galleryImageUrls?.length ?? 0) > 1 ? (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {form.galleryImageUrls!.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-12 w-16 rounded object-cover shrink-0" />
            ))}
          </div>
        ) : null}
        <div className="flex gap-2 pt-1">
          <button type="button" className="flex-1 py-2 rounded-xl border border-zinc-700 text-xs" style={{ color: BRAND }}>
            ნავიგაცია
          </button>
          {form.phone ? (
            <button type="button" className="flex-1 py-2 rounded-xl border border-zinc-700 text-xs" style={{ color: BRAND }}>
              დარეკვა
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-2 text-center">
      <p className="text-[10px] font-semibold truncate" style={{ color: BRAND }}>
        {value}
      </p>
      <p className="text-[9px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  if (status === "available") return <span className="text-[10px] text-emerald-400">თავისუფალი</span>;
  if (status === "occupied") return <span className="text-[10px] text-red-400">დაკავებული</span>;
  return <span className="text-[10px] text-zinc-500">სტატუსი</span>;
}
