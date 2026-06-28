import { apiPut } from '@/lib/api';

export type CarwashServiceRow = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
};

export type CarwashRow = {
  _id?: string;
  id: string;
  name: string;
  address: string;
  phone?: string;
  category?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  price?: number;
  isOpen?: boolean;
  ownerId?: string;
  workingHours?: string;
  description?: string;
  detailedServices?: CarwashServiceRow[];
  images?: string[];
  latitude?: number;
  longitude?: number;
};

export type CarwashFormState = {
  name: string;
  phone: string;
  location: string;
  address: string;
  category: string;
  workingHours: string;
  description: string;
  price: string;
  isOpen: boolean;
  ownerUserId: string;
  latitude: string;
  longitude: string;
  images: string[];
  serviceName: string;
  servicePrice: string;
  serviceDuration: string;
};

export const CITIES = [
  'თბილისი',
  'ბათუმი',
  'ქუთაისი',
  'რუსთავი',
  'გორი',
  'ზუგდიდი',
  'ფოთი',
  'სხვა',
];

export const CATEGORIES = ['Standard', 'Premium', 'Express'];

export function emptyCarwashForm(): CarwashFormState {
  return {
    name: '',
    phone: '',
    location: 'თბილისი',
    address: '',
    category: 'Standard',
    workingHours: '09:00 - 21:00',
    description: '',
    price: '25',
    isOpen: true,
    ownerUserId: '',
    latitude: '',
    longitude: '',
    images: [],
    serviceName: 'გარე რეცხვა',
    servicePrice: '25',
    serviceDuration: '30',
  };
}

export function carwashToForm(row: CarwashRow): CarwashFormState {
  const firstService = row.detailedServices?.[0];
  return {
    name: row.name || '',
    phone: row.phone || '',
    location: row.location || 'თბილისი',
    address: row.address || '',
    category: row.category || 'Standard',
    workingHours: row.workingHours || '09:00 - 21:00',
    description: row.description || '',
    price: String(row.price ?? firstService?.price ?? 25),
    isOpen: row.isOpen ?? true,
    ownerUserId: row.ownerId && row.ownerId !== 'admin' ? row.ownerId : '',
    latitude: row.latitude != null ? String(row.latitude) : '',
    longitude: row.longitude != null ? String(row.longitude) : '',
    images: row.images || [],
    serviceName: firstService?.name || 'გარე რეცხვა',
    servicePrice: String(firstService?.price ?? row.price ?? 25),
    serviceDuration: String(firstService?.duration ?? 30),
  };
}

function normalizePhone(phone: string) {
  const p = phone.trim();
  if (!p) return '';
  if (p.startsWith('+995')) return p;
  if (p.startsWith('995')) return `+${p}`;
  return `+995${p.replace(/\D/g, '')}`;
}

export function buildCarwashPayload(form: CarwashFormState, existingServices?: CarwashServiceRow[]) {
  const price = Number(form.price) || Number(form.servicePrice) || 25;
  const servicePrice = Number(form.servicePrice) || price;
  const serviceDuration = Number(form.serviceDuration) || 30;
  const serviceName = form.serviceName.trim() || 'გარე რეცხვა';

  const detailedServices: CarwashServiceRow[] =
    existingServices && existingServices.length > 0
      ? existingServices.map((s, i) =>
          i === 0
            ? { ...s, name: serviceName, price: servicePrice, duration: serviceDuration }
            : s,
        )
      : [
          {
            id: `ds_${Date.now()}`,
            name: serviceName,
            price: servicePrice,
            duration: serviceDuration,
          },
        ];

  return {
    name: form.name.trim(),
    address: form.address.trim(),
    phone: normalizePhone(form.phone),
    category: form.category,
    location: form.location,
    workingHours: form.workingHours.trim() || '09:00 - 21:00',
    description: form.description.trim() || form.name.trim(),
    price,
    rating: 0,
    reviews: 0,
    services: detailedServices.map((s) => s.name).join(', '),
    detailedServices,
    isOpen: form.isOpen,
    ownerId: form.ownerUserId.trim() || 'admin',
    images: form.images.filter(Boolean),
    latitude: form.latitude ? Number(form.latitude) : undefined,
    longitude: form.longitude ? Number(form.longitude) : undefined,
  };
}

export async function linkCarwashOwner(carwashId: string, userId: string) {
  await apiPut('/auth/update-owned-carwashes', {
    userId: userId.trim(),
    carwashId,
    action: 'add',
  });
}
