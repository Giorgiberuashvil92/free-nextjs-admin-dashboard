"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";
import MediaImageField from "@/components/ev-charging/MediaImageField";
import EvStationMobilePreview from "@/components/ev-charging/EvStationMobilePreview";
import PackageCtaFields, {
  DEFAULT_PACKAGE_CTA,
} from "@/components/ev-charging/PackageCtaFields";
import {
  AMENITY_SUGGESTIONS,
  CONNECTORS,
  STATUSES,
  emptyCharger,
  emptyStationForm,
  stationRowToForm,
  unwrapData,
  unwrapList,
  type EvPartnerRow,
  type EvSettingsRow,
  type EvStationFormState,
  type EvStationRow,
} from "@/components/ev-charging/evChargingTypes";

const EvMapPicker = dynamic(() => import("@/components/ev-charging/EvMapPicker"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />,
});

type Tab = "stations" | "partners" | "settings";

export default function EvChargingAdminPage() {
  const [tab, setTab] = useState<Tab>("stations");
  const [partners, setPartners] = useState<EvPartnerRow[]>([]);
  const [stations, setStations] = useState<EvStationRow[]>([]);
  const [settings, setSettings] = useState<EvSettingsRow>({
    pageTitle: "EV პარტნიორები",
    networkLabel: "Marte ქსელი",
    packageCta: { ...DEFAULT_PACKAGE_CTA },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [selectedStationMongoId, setSelectedStationMongoId] = useState<string | null>(null);
  const [stationEditorOpen, setStationEditorOpen] = useState(false);
  const [stationForm, setStationForm] = useState<EvStationFormState>(emptyStationForm());
  const [formSection, setFormSection] = useState<"main" | "media" | "detail" | "chargers">("main");

  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState<{
    partnerId: string;
    name: string;
    logoUrl: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
    packageCta: EvSettingsRow["packageCta"] | null;
  }>({
    partnerId: "",
    name: "",
    logoUrl: "",
    description: "",
    isActive: true,
    sortOrder: 0,
    packageCta: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [pRes, sRes, setRes] = await Promise.all([
        apiGet<unknown>("/ev-charging/partners?activeOnly=false"),
        apiGet<unknown>("/ev-charging/stations?all=true"),
        apiGet<unknown>("/ev-charging/settings"),
      ]);
      setPartners(unwrapList<EvPartnerRow>(pRes));
      setStations(unwrapList<EvStationRow>(sRes));
      const s = unwrapData<EvSettingsRow>(setRes);
      if (s) {
        setSettings({
          ...s,
          packageCta: s.packageCta ?? { ...DEFAULT_PACKAGE_CTA },
        });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredStations = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return stations;
    return stations.filter(
      (st) =>
        st.siteName.toLowerCase().includes(s) ||
        st.address.toLowerCase().includes(s) ||
        st.partnerName.toLowerCase().includes(s) ||
        st.partnerId.toLowerCase().includes(s),
    );
  }, [stations, q]);

  const selectedPartnerName = useMemo(() => {
    const p = partners.find((x) => x.partnerId === stationForm.partnerId);
    return p?.name;
  }, [partners, stationForm.partnerId]);

  const stats = useMemo(() => {
    const active = stations.filter((s) => s.isActive !== false).length;
    const partnersActive = partners.filter((p) => p.isActive !== false).length;
    return { total: stations.length, active, partners: partners.length, partnersActive };
  }, [stations, partners]);

  const selectStation = (st: EvStationRow | null, isNew = false) => {
    if (!st && !isNew) {
      setSelectedStationMongoId(null);
      setStationEditorOpen(false);
      setStationForm(emptyStationForm());
      return;
    }
    if (isNew) {
      setSelectedStationMongoId(null);
      setStationEditorOpen(true);
      setStationForm(emptyStationForm());
      setFormSection("main");
      return;
    }
    if (!st || !st._id) return;
    setSelectedStationMongoId(st._id);
    setStationEditorOpen(true);
    setStationForm(stationRowToForm(st));
    setFormSection("main");
  };

  const saveStation = async () => {
    setSaving(true);
    setErr(null);
    setOk(null);
    if (!stationForm.partnerId || !stationForm.siteName.trim() || !stationForm.address.trim()) {
      setErr("პარტნიორი, სახელი და მისამართი სავალდებულოა");
      setSaving(false);
      return;
    }
    const body = {
      ...stationForm,
      stationId: stationForm.stationId?.trim() || undefined,
      latitude: Number(stationForm.latitude),
      longitude: Number(stationForm.longitude),
    };
    try {
      if (selectedStationMongoId) {
        await apiPatch(`/ev-charging/stations/${selectedStationMongoId}`, body);
        setOk("სადგური განახლდა — აპში განახლების შემდეგ ჩანს");
      } else {
        const res = await apiPost<{ data?: EvStationRow }>("/ev-charging/stations", body);
        const created = res && typeof res === "object" && "data" in res ? (res as { data: EvStationRow }).data : null;
        if (created?._id) setSelectedStationMongoId(created._id);
        setOk("სადგური დაემატა");
      }
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  };

  const removeStation = async () => {
    if (!selectedStationMongoId || !confirm("წავშალოთ სადგური?")) return;
    try {
      await apiDelete(`/ev-charging/stations/${selectedStationMongoId}`);
      selectStation(null);
      await load();
      setOk("სადგური წაიშალა");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "წაშლა ვერ მოხერხდა");
    }
  };

  const savePartner = async () => {
    setSaving(true);
    setErr(null);
    try {
      if (editingPartnerId) {
        await apiPatch(`/ev-charging/partners/${editingPartnerId}`, partnerForm);
      } else {
        await apiPost("/ev-charging/partners", partnerForm);
      }
      setEditingPartnerId(null);
      setPartnerForm({
        partnerId: "",
        name: "",
        logoUrl: "",
        description: "",
        isActive: true,
        sortOrder: 0,
        packageCta: null,
      });
      await load();
      setOk("პარტნიორი შენახულია");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "შეცდომა");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiPatch("/ev-charging/settings", settings);
      setOk("პარამეტრები შენახულია — აპის სათაურები განახლდება");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "შეცდომა");
    } finally {
      setSaving(false);
    }
  };

  const updateCharger = (idx: number, patch: Partial<(typeof stationForm.chargers)[0]>) => {
    setStationForm((prev) => {
      const list = [...prev.chargers];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, chargers: list };
    });
  };

  const toggleAmenity = (a: string) => {
    setStationForm((f) => {
      const has = f.amenities.includes(a);
      return {
        ...f,
        amenities: has ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
      };
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-[1800px] mx-auto space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EV დამუხტვა</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            აქ რაც შეცვლი, მობილურ აპში რუკაზე ჩანს — ახალი ბილდი არ სჭირდება. ჰერო ფოტო, ფასი, დამტენები,
            პარტნიორის ფილტრები და სათაურები ყველაფერი API-დან მოდის.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg border text-sm">
            განახლება
          </button>
          <button
            type="button"
            onClick={() => selectStation(null, true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
          >
            + ახალი სადგური
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="სადგურები" value={String(stats.total)} sub={`${stats.active} აქტიური`} />
        <StatCard label="პარტნიორები" value={String(stats.partners)} sub={`${stats.partnersActive} აქტიური`} />
        <StatCard label="აპის სათაური" value={settings.pageTitle} small />
        <StatCard label="ქსელი" value={settings.networkLabel} small />
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}
      {ok ? <Alert tone="ok">{ok}</Alert> : null}

      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {(
          [
            ["stations", "სადგურები და რედაქტორი"],
            ["partners", "პარტნიორები"],
            ["settings", "აპის ტექსტები"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "settings" ? (
        <div className="max-w-2xl space-y-4 rounded-2xl border p-6 dark:border-gray-700">
          <h2 className="font-semibold text-lg">რუკის გვერდის ტექსტები (მობილური)</h2>
          <Field label="სათაური (header)">
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
              value={settings.pageTitle}
              onChange={(e) => setSettings((s) => ({ ...s, pageTitle: e.target.value }))}
            />
          </Field>
          <Field label="ქსელის სახელი (ქვესათაური)">
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
              value={settings.networkLabel}
              onChange={(e) => setSettings((s) => ({ ...s, networkLabel: e.target.value }))}
            />
          </Field>
          <Field label="შესახებ — ნაგულისხმევი ტექსტი თუ სადგურს არ აქვს">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm min-h-20"
              value={settings.defaultAboutText || ""}
              onChange={(e) => setSettings((s) => ({ ...s, defaultAboutText: e.target.value }))}
            />
          </Field>
          <Field label="რევიუების ტაბი — placeholder">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm min-h-15"
              value={settings.reviewsPlaceholder || ""}
              onChange={(e) => setSettings((s) => ({ ...s, reviewsPlaceholder: e.target.value }))}
            />
          </Field>
          <PackageCtaFields
            title="ქვედა ღილაკი — «პაკეტის არჩევა»"
            description="შიდა გვერდი Marte აპში ან პარტნიორის აპის deeplink (voltline://, https://...). ცვლილება აპში ბილდის გარეშე ჩანს."
            value={settings.packageCta}
            onChange={(packageCta) =>
              setSettings((s) => ({ ...s, packageCta: packageCta ?? { ...DEFAULT_PACKAGE_CTA } }))
            }
          />
          <button
            type="button"
            disabled={saving}
            onClick={saveSettings}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50"
          >
            შენახვა
          </button>
        </div>
      ) : null}

      {tab === "partners" ? (
        <div className="grid xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border dark:border-gray-700 p-5 space-y-4">
            <h2 className="font-semibold">{editingPartnerId ? "პარტნიორის რედაქტირება" : "ახალი პარტნიორი"}</h2>
            <p className="text-xs text-gray-500">
              პარტნიორის სახელი ჩანს რუკის ფილტრის ჩიპებში და დეტალის ბეჯში. ლოგო — ჩიპზე (თუ ატვირთავ).
            </p>
            <Field label="partnerId (slug, უნიკალური)">
              <input
                className="input font-mono text-sm"
                disabled={!!editingPartnerId}
                value={partnerForm.partnerId}
                onChange={(e) => setPartnerForm((f) => ({ ...f, partnerId: e.target.value }))}
              />
            </Field>
            <Field label="სახელი (აპში ჩანს)">
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <MediaImageField
              label="ლოგო"
              hint="ფილტრის ჩიპზე / დეტალში"
              value={partnerForm.logoUrl}
              onChange={(logoUrl) => setPartnerForm((f) => ({ ...f, logoUrl }))}
              folder="carappx/ev-charging/partners"
              aspect="square"
            />
            <Field label="აღწერა (ადმინისთვის)">
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm min-h-18"
                value={partnerForm.description}
                onChange={(e) => setPartnerForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <PackageCtaFields
              title="პარტნიორის აპის ღილაკი (არასავალდებულო)"
              description="მაგ. VoltLine-ის სადგურებზე — მათი აპის deeplink. ცარიელი = ზემოთ გლობალური პარამეტრი."
              allowClear
              value={partnerForm.packageCta}
              onChange={(packageCta) => setPartnerForm((f) => ({ ...f, packageCta }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={partnerForm.isActive}
                onChange={(e) => setPartnerForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              აქტიური (ფილტრში და რუკაზე)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={savePartner} disabled={saving} className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
                შენახვა
              </button>
              {editingPartnerId ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                  onClick={() => {
                    setEditingPartnerId(null);
                    setPartnerForm({
                      partnerId: "",
                      name: "",
                      logoUrl: "",
                      description: "",
                      isActive: true,
                      sortOrder: 0,
                      packageCta: null,
                    });
                  }}
                >
                  გაუქმება
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="p-3 text-left">ლოგო</th>
                  <th className="p-3 text-left">სახელი</th>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p._id} className="border-t dark:border-gray-800">
                    <td className="p-3">
                      {p.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 inline-block" />
                      )}
                    </td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{p.partnerId}</td>
                    <td className="p-3 text-right space-x-2">
                      <button type="button" className="text-blue-600 text-xs" onClick={() => {
                        setEditingPartnerId(p._id);
                        setPartnerForm({
                          partnerId: p.partnerId,
                          name: p.name,
                          logoUrl: p.logoUrl || "",
                          description: p.description || "",
                          isActive: p.isActive !== false,
                          sortOrder: p.sortOrder ?? 0,
                          packageCta: p.packageCta ?? null,
                        });
                      }}>
                        რედ.
                      </button>
                      <button type="button" className="text-red-600 text-xs" onClick={async () => {
                        if (!confirm("წავშალოთ?")) return;
                        await apiDelete(`/ev-charging/partners/${p._id}`);
                        await load();
                      }}>
                        წაშლა
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "stations" ? (
        <div className="grid xl:grid-cols-[minmax(260px,320px)_1fr_minmax(280px,340px)] gap-5 items-start">
          {/* სია */}
          <aside className="rounded-2xl border dark:border-gray-700 overflow-hidden xl:sticky xl:top-4">
            <div className="p-3 border-b dark:border-gray-800">
              <input
                type="search"
                placeholder="ძებნა სადგურზე…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
              />
            </div>
            <ul className="max-h-[70vh] overflow-y-auto divide-y dark:divide-gray-800">
              {filteredStations.map((st) => {
                const active = st._id === selectedStationMongoId;
                const thumb = st.heroImageUrl || st.galleryImageUrls?.[0];
                return (
                  <li key={st._id || st.id}>
                    <button
                      type="button"
                      onClick={() => selectStation(st)}
                      className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        active ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                      }`}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium text-sm block truncate">{st.siteName}</span>
                        <span className="text-xs text-gray-500 block truncate">{st.partnerName}</span>
                        <span className="text-[10px] text-gray-400">
                          {st.isActive !== false ? "აქტიური" : "გამორთული"} · {st.chargers?.length ?? 0} დამტენი
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* რედაქტორი */}
          <main className="rounded-2xl border dark:border-gray-700 overflow-hidden">
            {!stationEditorOpen ? (
              <div className="p-12 text-center text-gray-500">
                აირჩიე სადგური მარცხნიდან ან დააჭირე «ახალი სადგური»
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1 p-2 border-b dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50">
                  {(
                    [
                      ["main", "ძირითადი"],
                      ["media", "ფოტოები"],
                      ["detail", "აპის დეტალი"],
                      ["chargers", "დამტენები"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormSection(id)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        formSection === id ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                  {formSection === "main" ? (
                    <>
                      <SectionTitle>ძირითადი</SectionTitle>
                      <Field label="პარტნიორი *">
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          value={stationForm.partnerId}
                          onChange={(e) => setStationForm((f) => ({ ...f, partnerId: e.target.value }))}
                        >
                          <option value="">აირჩიე…</option>
                          {partners.map((p) => (
                            <option key={p._id} value={p.partnerId}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="სადგურის სახელი (აპში სათაური) *">
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            value={stationForm.siteName}
                            onChange={(e) => setStationForm((f) => ({ ...f, siteName: e.target.value }))}
                          />
                        </Field>
                        <Field label="stationId (ოფც., ფიქსირებული)">
                          <input
                            className="input font-mono text-sm"
                            value={stationForm.stationId || ""}
                            onChange={(e) => setStationForm((f) => ({ ...f, stationId: e.target.value }))}
                          />
                        </Field>
                      </div>
                      <Field label="მისამართი *">
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          value={stationForm.address}
                          onChange={(e) => setStationForm((f) => ({ ...f, address: e.target.value }))}
                        />
                      </Field>
                      <Field label="ტელეფონი (დარეკვის ღილაკი)">
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          value={stationForm.phone}
                          onChange={(e) => setStationForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </Field>
                      <Field label="სამუშაო საათები">
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          placeholder="მაგ. 24/7 ან 09:00–22:00"
                          value={stationForm.openingHours}
                          onChange={(e) => setStationForm((f) => ({ ...f, openingHours: e.target.value }))}
                        />
                      </Field>
                      <SectionTitle>რუკაზე მდებარეობა</SectionTitle>
                      <EvMapPicker
                        latitude={stationForm.latitude}
                        longitude={stationForm.longitude}
                        onPick={(lat, lng) => setStationForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                        heightClass="h-[300px]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="latitude">
                          <input
                            type="number"
                            step="any"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            value={stationForm.latitude}
                            onChange={(e) => setStationForm((f) => ({ ...f, latitude: parseFloat(e.target.value) }))}
                          />
                        </Field>
                        <Field label="longitude">
                          <input
                            type="number"
                            step="any"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            value={stationForm.longitude}
                            onChange={(e) => setStationForm((f) => ({ ...f, longitude: parseFloat(e.target.value) }))}
                          />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={stationForm.isActive}
                          onChange={(e) => setStationForm((f) => ({ ...f, isActive: e.target.checked }))}
                        />
                        აქტიური — ჩანს მობილურ რუკაზე
                      </label>
                    </>
                  ) : null}

                  {formSection === "media" ? (
                    <>
                      <SectionTitle>ფოტოები</SectionTitle>
                      <MediaImageField
                        label="ჰერო ფოტო (დეტალის ზედა ბანერი)"
                        hint="აპში პირველი დიდი სურათი — ზუსტად ეს ველი"
                        value={stationForm.heroImageUrl}
                        onChange={(heroImageUrl) => setStationForm((f) => ({ ...f, heroImageUrl }))}
                        folder="carappx/ev-charging/hero"
                      />
                      <ImageUpload
                        label="გალერეა (დამატებითი ფოტოები)"
                        value={stationForm.galleryImageUrls}
                        onChange={(galleryImageUrls) => setStationForm((f) => ({ ...f, galleryImageUrls }))}
                        maxImages={8}
                        folder="carappx/ev-charging/gallery"
                      />
                    </>
                  ) : null}

                  {formSection === "detail" ? (
                    <>
                      <SectionTitle>რაც აპის დეტალ პანელში ჩანს</SectionTitle>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Field label="ფასი (priceLabel)">
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            placeholder="~0.48 ₾/kWh"
                            value={stationForm.priceLabel}
                            onChange={(e) => setStationForm((f) => ({ ...f, priceLabel: e.target.value }))}
                          />
                        </Field>
                        <Field label="სწრაფი დამუხტვა (chargeSpeedHint)">
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            placeholder="~35 კმ / 15 წთ"
                            value={stationForm.chargeSpeedHint}
                            onChange={(e) => setStationForm((f) => ({ ...f, chargeSpeedHint: e.target.value }))}
                          />
                        </Field>
                        <Field label="რეიტინგი (1–5)">
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            value={stationForm.rating ?? ""}
                            onChange={(e) =>
                              setStationForm((f) => ({
                                ...f,
                                rating: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                          />
                        </Field>
                        <Field label="შეფასებების რაოდენობა">
                          <input
                            type="number"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                            value={stationForm.reviewsCount}
                            onChange={(e) => setStationForm((f) => ({ ...f, reviewsCount: Number(e.target.value) }))}
                          />
                        </Field>
                      </div>
                      <Field label="პრომო / ფასდაკლება (perkHint)">
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          placeholder="პრემიუმზე −15% ჩართვაზე"
                          value={stationForm.perkHint}
                          onChange={(e) => setStationForm((f) => ({ ...f, perkHint: e.target.value }))}
                        />
                      </Field>
                      <Field label="სადგურის შესახებ (aboutText)">
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm min-h-30"
                          value={stationForm.aboutText}
                          onChange={(e) => setStationForm((f) => ({ ...f, aboutText: e.target.value }))}
                        />
                      </Field>
                      <Field label="სერვისები / საბამროგიო">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {AMENITY_SUGGESTIONS.map((a) => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => toggleAmenity(a)}
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                stationForm.amenities.includes(a)
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                          placeholder="სხვა — ენტერით დაამატე"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = (e.target as HTMLInputElement).value.trim();
                              if (v && !stationForm.amenities.includes(v)) {
                                setStationForm((f) => ({ ...f, amenities: [...f.amenities, v] }));
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                      </Field>
                    </>
                  ) : null}

                  {formSection === "chargers" ? (
                    <>
                      <SectionTitle>დამტენები</SectionTitle>
                      {stationForm.chargers.map((c, idx) => (
                        <div key={c.id} className="rounded-xl border dark:border-gray-700 p-4 space-y-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            <Field label="სახელი">
                              <input
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                                value={c.label}
                                onChange={(e) => updateCharger(idx, { label: e.target.value })}
                              />
                            </Field>
                            <Field label="კონექტორი">
                              <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                                value={c.connectorType}
                                onChange={(e) => updateCharger(idx, { connectorType: e.target.value })}
                              >
                                {CONNECTORS.map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="kW">
                              <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                                value={c.maxPowerKw}
                                onChange={(e) => updateCharger(idx, { maxPowerKw: Number(e.target.value) })}
                              />
                            </Field>
                            <Field label="სტატუსი (აპში ფერი)">
                              <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
                                value={c.status || "unknown"}
                                onChange={(e) => updateCharger(idx, { status: e.target.value })}
                              >
                                {STATUSES.map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() =>
                              setStationForm((f) => ({
                                ...f,
                                chargers: f.chargers.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            წაშლა
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-sm text-emerald-600 font-medium"
                        onClick={() =>
                          setStationForm((f) => ({ ...f, chargers: [...f.chargers, emptyCharger()] }))
                        }
                      >
                        + დამტენი
                      </button>
                    </>
                  ) : null}
                </div>

                <footer className="p-4 border-t dark:border-gray-800 flex flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-900/30">
                  <button type="button" onClick={saveStation} disabled={saving} className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
                    {saving ? "ინახება…" : "შენახვა და გამოქვეყნება"}
                  </button>
                  {selectedStationMongoId ? (
                    <button type="button" onClick={removeStation} className="text-sm text-red-600 px-3">
                      წაშლა
                    </button>
                  ) : null}
                </footer>
              </>
            )}
          </main>

          {/* პრევიუ */}
          <aside className="xl:sticky xl:top-4 space-y-3">
            <EvStationMobilePreview
              form={stationForm}
              partnerName={selectedPartnerName}
              defaultAbout={settings.defaultAboutText}
            />
            <p className="text-xs text-center text-gray-500 px-2">
              ცვლილების შემდეგ მომხმარებელს საკმარისია აპში გვერდის განახლება (pull ან ხელახლა შესვლა).
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-gray-900 dark:text-white mt-1 ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
      {sub ? <p className="text-xs text-emerald-600 mt-0.5">{sub}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
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
