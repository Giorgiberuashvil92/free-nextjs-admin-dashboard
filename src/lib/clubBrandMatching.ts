/** გარაჟის მანქანებიდან ბრენდები → კლუბების შეთავაზება (ადმინი + აპი) */

export type GarageCarRow = {
  id?: string;
  userId?: string;
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  } | null;
};

export type ClubRow = {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds?: string[];
  membersCount?: number;
  coverImage?: string;
  carMakes?: string[];
};

const MAKE_ALIASES: Record<string, string[]> = {
  bmw: ['bmw'],
  mercedes: ['mercedes', 'mercedes-benz', 'benz', 'მერსედეს'],
  audi: ['audi', 'აუდი'],
  toyota: ['toyota', 'ტოიოტა'],
  honda: ['honda', 'ჰონდა'],
  ford: ['ford', 'ფორდ'],
  volkswagen: ['volkswagen', 'vw', 'ფოლკსვაგენ'],
  hyundai: ['hyundai', 'ჰუნდაი'],
  kia: ['kia', 'კია'],
  nissan: ['nissan', 'ნისსან'],
  mazda: ['mazda', 'მაზდა'],
  lexus: ['lexus', 'ლექსუს'],
  porsche: ['porsche', 'პორშე'],
  volvo: ['volvo', 'ვოლვო'],
  subaru: ['subaru', 'სუბარუს'],
  mitsubishi: ['mitsubishi', 'მიცუბიში'],
  chevrolet: ['chevrolet', 'chevy', 'შევროლე'],
  opel: ['opel', 'ოპელ'],
  peugeot: ['peugeot', 'პეჟო'],
  renault: ['renault', 'რენო'],
  skoda: ['skoda', 'škoda', 'სკოდა'],
};

const DISPLAY_LABELS: Record<string, string> = {
  bmw: 'BMW',
  mercedes: 'Mercedes-Benz',
  audi: 'Audi',
  toyota: 'Toyota',
  honda: 'Honda',
  ford: 'Ford',
  volkswagen: 'Volkswagen',
  hyundai: 'Hyundai',
  kia: 'Kia',
  nissan: 'Nissan',
  mazda: 'Mazda',
  lexus: 'Lexus',
  porsche: 'Porsche',
  volvo: 'Volvo',
  subaru: 'Subaru',
  mitsubishi: 'Mitsubishi',
  chevrolet: 'Chevrolet',
  opel: 'Opel',
  peugeot: 'Peugeot',
  renault: 'Renault',
  skoda: 'Škoda',
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** raw make → canonical key (bmw, toyota, ...) ან slug */
export function resolveMakeKey(rawMake: string): string {
  const n = norm(rawMake);
  if (!n) return '';
  for (const [canonical, aliases] of Object.entries(MAKE_ALIASES)) {
    if (aliases.some((a) => n === a || n.includes(a) || a.includes(n))) {
      return canonical;
    }
  }
  return n.split(/\s+/)[0] || n;
}

export function formatBrandLabel(key: string): string {
  return DISPLAY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

export type BrandAggregate = {
  key: string;
  label: string;
  carCount: number;
  userCount: number;
  userIds: string[];
  rawMakes: string[];
};

/** ყველა ბრენდი, რომელიც გარაჟშია დამატებული */
export function aggregateBrandsFromGarage(cars: GarageCarRow[]): BrandAggregate[] {
  const map = new Map<
    string,
    { carCount: number; userIds: Set<string>; rawMakes: Set<string> }
  >();

  for (const car of cars) {
    const raw = String(car.make ?? '').trim();
    if (!raw || !car.userId) continue;
    const key = resolveMakeKey(raw);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { carCount: 0, userIds: new Set(), rawMakes: new Set() });
    }
    const row = map.get(key)!;
    row.carCount += 1;
    row.userIds.add(String(car.userId));
    row.rawMakes.add(raw);
  }

  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: formatBrandLabel(key),
      carCount: v.carCount,
      userCount: v.userIds.size,
      userIds: [...v.userIds],
      rawMakes: [...v.rawMakes].slice(0, 5),
    }))
    .sort((a, b) => b.userCount - a.userCount || b.carCount - a.carCount);
}

function clubHaystack(club: ClubRow): string {
  const tagged = Array.isArray(club.carMakes) ? club.carMakes.join(' ') : '';
  return norm(`${club.name || ''} ${club.description || ''} ${tagged}`);
}

function scoreClubForBrand(club: ClubRow, brandKey: string): number {
  const aliases = MAKE_ALIASES[brandKey] ?? [brandKey];
  const hay = clubHaystack(club);
  const nameHay = norm(club.name || '');
  let score = 0;
  for (const alias of aliases) {
    const a = norm(alias);
    if (!a) continue;
    if (nameHay.includes(a)) score = Math.max(score, 100);
    else if (hay.includes(a)) score = Math.max(score, 60);
  }
  if (Array.isArray(club.carMakes)) {
    const tagged = club.carMakes.map((m) => norm(String(m)));
    if (tagged.some((t) => aliases.some((a) => t.includes(a) || a.includes(t)))) {
      score = Math.max(score, 95);
    }
  }
  return score;
}

export type ClubBrandMatch = ClubRow & { matchScore: number };

/** ამ ბრენდისთვის შესაფერისი კლუბები */
export function clubsMatchingBrand(clubs: ClubRow[], brandKey: string): ClubBrandMatch[] {
  return clubs
    .map((c) => ({ ...c, matchScore: scoreClubForBrand(c, brandKey) }))
    .filter((c) => c.matchScore > 0)
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        (b.membersCount ?? 0) - (a.membersCount ?? 0),
    );
}

export function carsForBrand(cars: GarageCarRow[], brandKey: string): GarageCarRow[] {
  return cars.filter((c) => {
    const raw = String(c.make ?? '').trim();
    if (!raw) return false;
    return resolveMakeKey(raw) === brandKey;
  });
}

export function detectMakesFromClub(club: ClubRow): string[] {
  const found = new Set<string>();
  const hay = clubHaystack(club);
  for (const [key, aliases] of Object.entries(MAKE_ALIASES)) {
    if (aliases.some((a) => hay.includes(a))) found.add(key);
  }
  if (Array.isArray(club.carMakes)) {
    for (const m of club.carMakes) {
      const k = resolveMakeKey(String(m));
      if (k) found.add(k);
    }
  }
  return [...found];
}
