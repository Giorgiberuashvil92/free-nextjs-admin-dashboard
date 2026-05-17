"use client";

import type { EvPackageCtaRow } from "./evChargingTypes";

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm";

export const DEFAULT_PACKAGE_CTA: EvPackageCtaRow = {
  label: "პაკეტის არჩევა",
  linkType: "internal",
  url: "/premium-offers?source=ev_charging_map",
  fallbackUrl: "/premium-offers?source=ev_charging_map",
};

type Props = {
  title: string;
  description?: string;
  value?: EvPackageCtaRow | null;
  onChange: (next: EvPackageCtaRow | null) => void;
  allowClear?: boolean;
};

export default function PackageCtaFields({
  title,
  description,
  value,
  onChange,
  allowClear = false,
}: Props) {
  const cta = value ?? DEFAULT_PACKAGE_CTA;
  const enabled = allowClear ? value != null : true;

  const patch = (p: Partial<EvPackageCtaRow>) => {
    onChange({ ...cta, ...p });
  };

  return (
    <section className="space-y-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
      <SectionHeader title={title} description={description} />
      {allowClear ? (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) =>
              onChange(e.target.checked ? { ...DEFAULT_PACKAGE_CTA, ...(value ?? {}) } : null)
            }
          />
          <span>პარტნიორის საკუთარი ღილაკი / deeplink (გამორთული = გლობალური)</span>
        </label>
      ) : null}
      {enabled ? <CtaFormGrid cta={cta} patch={patch} /> : null}
    </section>
  );
}

function CtaFormGrid({
  cta,
  patch,
}: {
  cta: EvPackageCtaRow;
  patch: (p: Partial<EvPackageCtaRow>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CtaField label="ღილაკის ტექსტი">
        <input className={INPUT} value={cta.label} onChange={(e) => patch({ label: e.target.value })} />
      </CtaField>
      <CtaField label="ტიპი">
        <select
          className={INPUT}
          value={cta.linkType}
          onChange={(e) => patch({ linkType: e.target.value as EvPackageCtaRow["linkType"] })}
        >
          <option value="internal">შიდა გვერდი (Marte აპი)</option>
          <option value="external">გარე აპი / deeplink / ბმული</option>
        </select>
      </CtaField>
      <CtaField
        label={cta.linkType === "internal" ? "მარშრუტი" : "ბმული (უნივერსალური)"}
        className="sm:col-span-2"
      >
        <input
          className={`${INPUT} font-mono text-xs`}
          value={cta.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder={
            cta.linkType === "internal"
              ? "/premium-offers?source=ev_map"
              : "voltline://station/123 ან https://..."
          }
        />
      </CtaField>
      {cta.linkType === "external" ? (
        <>
          <CtaField label="iOS deeplink (არასავალდებულო)">
            <input
              className={`${INPUT} font-mono text-xs`}
              value={cta.iosUrl || ""}
              onChange={(e) => patch({ iosUrl: e.target.value || undefined })}
              placeholder="voltline://..."
            />
          </CtaField>
          <CtaField label="Android deeplink (არასავალდებულო)">
            <input
              className={`${INPUT} font-mono text-xs`}
              value={cta.androidUrl || ""}
              onChange={(e) => patch({ androidUrl: e.target.value || undefined })}
              placeholder="voltline://..."
            />
          </CtaField>
          <CtaField label="თუ აპი არ არის — შიდა fallback" className="sm:col-span-2">
            <input
              className={`${INPUT} font-mono text-xs`}
              value={cta.fallbackUrl || ""}
              onChange={(e) => patch({ fallbackUrl: e.target.value || undefined })}
              placeholder="/premium-offers?source=ev_map"
            />
          </CtaField>
        </>
      ) : null}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      ) : null}
    </div>
  );
}

function CtaField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}
