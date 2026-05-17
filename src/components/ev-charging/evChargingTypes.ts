export type EvCtaLinkType = "internal" | "external";

export type EvPackageCtaRow = {
  label: string;
  linkType: EvCtaLinkType;
  url: string;
  iosUrl?: string;
  androidUrl?: string;
  fallbackUrl?: string;
};

export type EvPartnerRow = {
  _id: string;
  partnerId: string;
  name: string;
  logoUrl?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
  packageCta?: EvPackageCtaRow | null;
};

export type EvChargerRow = {
  id: string;
  label: string;
  connectorType: string;
  maxPowerKw: number;
  status?: string;
};

export type EvStationRow = {
  _id?: string;
  id: string;
  partnerId: string;
  partnerName: string;
  partnerLogoUrl?: string;
  siteName: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  chargers: EvChargerRow[];
  perkHint?: string;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
  openingHours?: string;
  amenities?: string[];
  rating?: number;
  reviewsCount?: number;
  priceLabel?: string;
  chargeSpeedHint?: string;
  aboutText?: string;
  isActive?: boolean;
  sortOrder?: number;
  stationId?: string;
};

export type EvStationFormState = {
  stationId?: string;
  partnerId: string;
  siteName: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  chargers: EvChargerRow[];
  perkHint: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  openingHours: string;
  amenities: string[];
  rating?: number;
  reviewsCount: number;
  priceLabel: string;
  chargeSpeedHint: string;
  aboutText: string;
  isActive: boolean;
  sortOrder: number;
};

export type EvSettingsRow = {
  pageTitle: string;
  networkLabel: string;
  defaultAboutText?: string;
  reviewsPlaceholder?: string;
  packageCta?: EvPackageCtaRow;
};

export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

export function unwrapData<T>(raw: unknown): T | null {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export const CONNECTORS = ["CCS2", "Type2", "CHAdeMO", "Type1"];
export const STATUSES = ["available", "occupied", "unknown"] as const;

export const AMENITY_SUGGESTIONS = [
  "კაფე",
  "Wi‑Fi",
  "ავტოფარიკინგი",
  "24/7",
  "შეფერხებული ზონა",
  "ტუალეტი",
];

export const emptyCharger = (): EvChargerRow => ({
  id: `c${Date.now()}`,
  label: "დამტენი",
  connectorType: "Type2",
  maxPowerKw: 22,
  status: "unknown",
});

export const emptyStationForm = (): EvStationFormState => ({
  partnerId: "",
  siteName: "",
  address: "",
  latitude: 41.7151,
  longitude: 44.8271,
  phone: "",
  chargers: [emptyCharger()],
  isActive: true,
  sortOrder: 0,
  heroImageUrl: "",
  galleryImageUrls: [],
  openingHours: "",
  amenities: [],
  perkHint: "",
  priceLabel: "",
  chargeSpeedHint: "",
  aboutText: "",
  reviewsCount: 0,
});

export function stationRowToForm(st: EvStationRow): EvStationFormState {
  return {
    stationId: st.id,
    partnerId: st.partnerId,
    siteName: st.siteName,
    address: st.address,
    latitude: st.latitude,
    longitude: st.longitude,
    phone: st.phone || "",
    chargers: st.chargers?.length ? st.chargers.map((c) => ({ ...c })) : [emptyCharger()],
    perkHint: st.perkHint || "",
    heroImageUrl: st.heroImageUrl || "",
    galleryImageUrls: st.galleryImageUrls?.length ? [...st.galleryImageUrls] : [],
    openingHours: st.openingHours || "",
    amenities: st.amenities?.length ? [...st.amenities] : [],
    rating: st.rating,
    reviewsCount: st.reviewsCount ?? 0,
    priceLabel: st.priceLabel || "",
    chargeSpeedHint: st.chargeSpeedHint || "",
    aboutText: st.aboutText || "",
    isActive: st.isActive !== false,
    sortOrder: st.sortOrder ?? 0,
  };
}
