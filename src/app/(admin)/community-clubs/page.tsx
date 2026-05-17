'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, apiGet } from '@/lib/api';
import {
  aggregateBrandsFromGarage,
  carsForBrand,
  clubsMatchingBrand,
  detectMakesFromClub,
  formatBrandLabel,
  type BrandAggregate,
  type ClubRow,
  type GarageCarRow,
} from '@/lib/clubBrandMatching';
import { buildCommunityPushData } from '@/lib/communityPush';
import { parseCarMakesInput } from '@/lib/communityPush';

async function broadcastPush(body: {
  userIds: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  const res = await fetch(`${API_BASE}/notifications/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json();
}

function userLabel(car: GarageCarRow): string {
  const u = car.user;
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
  return name || u?.phone || car.userId || '—';
}

export default function CommunityClubsAdminPage() {
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [cars, setCars] = useState<GarageCarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [makesDraft, setMakesDraft] = useState<Record<string, string>>({});
  const [showAllClubs, setShowAllClubs] = useState(false);
  const [suggestSending, setSuggestSending] = useState(false);
  const [suggestClubId, setSuggestClubId] = useState<string | null>(null);

  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [clubsRes, carsRes] = await Promise.all([
        apiGet<ClubRow[]>(`/community/groups?limit=100&offset=0`).catch(() => []),
        fetch(`${API_BASE}/garage/cars/all?t=${Date.now()}`, { cache: 'no-store' }).then((r) =>
          r.json(),
        ),
      ]);

      const clubList = Array.isArray(clubsRes) ? clubsRes : [];
      setClubs(clubList);
      const draft: Record<string, string> = {};
      clubList.forEach((c) => {
        draft[c.id] = (c.carMakes || []).join(', ');
      });
      setMakesDraft(draft);

      const carsJson = carsRes as { data?: GarageCarRow[] } | GarageCarRow[];
      const carList = Array.isArray(carsJson) ? carsJson : carsJson?.data || [];
      setCars(carList);
    } catch (e) {
      console.error(e);
      alert(`ჩატვირთვა ვერ მოხერხდა: ${e instanceof Error ? e.message : 'შეცდომა'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const brands = useMemo(() => aggregateBrandsFromGarage(cars), [cars]);

  const selected = useMemo(
    () => brands.find((b) => b.key === selectedBrand) ?? null,
    [brands, selectedBrand],
  );

  const matchedClubs = useMemo(() => {
    if (!selectedBrand) return [];
    return clubsMatchingBrand(clubs, selectedBrand);
  }, [clubs, selectedBrand]);

  const brandCars = useMemo(() => {
    if (!selectedBrand) return [];
    return carsForBrand(cars, selectedBrand);
  }, [cars, selectedBrand]);

  const clubsWithoutMatch = useMemo(() => {
    if (!selectedBrand) return [];
    const matchedIds = new Set(matchedClubs.map((c) => c.id));
    return clubs.filter((c) => !matchedIds.has(c.id));
  }, [clubs, matchedClubs, selectedBrand]);

  const saveCarMakes = async (club: ClubRow, extraMake?: string) => {
    const raw = makesDraft[club.id] ?? '';
    let carMakes = parseCarMakesInput(raw);
    if (extraMake && !carMakes.includes(extraMake)) {
      carMakes = [...carMakes, extraMake];
    }
    setSavingId(club.id);
    try {
      const res = await fetch(`${API_BASE}/community/groups/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: club.ownerId, carMakes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadAll();
    } catch (e) {
      alert(`შენახვა ვერ მოხერხდა: ${e instanceof Error ? e.message : 'შეცდომა'}`);
    } finally {
      setSavingId(null);
    }
  };

  const applySuggestPushTemplate = (club: ClubRow, brand: BrandAggregate) => {
    setPushTitle(`🚗 ${brand.label} — შეგიძლია კლუბში შეუერთდე`);
    setPushBody(`${club.name} — გაეცანი თანამოზიურებს და პოსტებს Marte-ში.`);
  };

  const sendClubSuggestToBrandUsers = async (club: ClubRow, brand: BrandAggregate) => {
    const userIds = brand.userIds.filter(
      (uid) => !(club.memberIds || []).includes(uid),
    );
    if (!userIds.length) {
      alert('ამ ბრენდის მფლობელები უკვე წევრები არიან ან სია ცარიელია');
      return;
    }
    const title = pushTitle.trim() || `🚗 ${brand.label} — კლუბი შენთვის`;
    const body =
      pushBody.trim() ||
      `${club.name} — შეუერთდი კომუნიტის კლუბს და გაიცანი სხვა ${brand.label} მფლობელებთან.`;

    if (!confirm(`გავუგზავნოთ ${userIds.length} მომხმარებელს (${brand.label})?\n\n${title}\n${body}`)) {
      return;
    }

    setSuggestSending(true);
    setSuggestClubId(club.id);
    try {
      const data = buildCommunityPushData('club_invite', {
        groupId: club.id,
        clubId: club.id,
        groupName: club.name,
      });
      const result = await broadcastPush({ userIds, title, body, data });
      alert((result as { message?: string }).message || `გაგზავნილია ${userIds.length} მომხმარებელზე`);
    } catch (e) {
      alert(`შეცდომა: ${e instanceof Error ? e.message : 'უცნობი'}`);
    } finally {
      setSuggestSending(false);
      setSuggestClubId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            კლუბები ბრენდის მიხედვით
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm max-w-2xl">
            ვიღებთ <strong>ბრენდებს გარაჟიდან</strong> (ვისაც მანქანა დამატებული აქვს), ვაჩვენებთ{' '}
            <strong>შესაბამის კლუბებს</strong> და შეგვიძლია push-ით შევთავაზოთ — იგივე ლოგიკა, რაც
            აპში „შენს მანქანას შეესაბამება“.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {loading ? 'იტვირთება...' : 'განახლება'}
        </button>
      </header>

      {/* სტატისტიკა */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="მანქანა გარაჟში" value={cars.length} />
        <StatCard label="ბრენდი" value={brands.length} />
        <StatCard label="კლუბი" value={clubs.length} />
        <StatCard
          label="შეთავაზება (არჩევა)"
          value={selected ? matchedClubs.length : '—'}
        />
      </div>

      {/* ბრენდები */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          1. ბრენდები გარაჟიდან
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          მხოლოდ ის მარკები, რომლებიც მომხმარებლებს რეალურად აქვთ დამატებული
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">იტვირთება...</p>
        ) : brands.length === 0 ? (
          <p className="text-sm text-gray-500">გარაჟში მანქანები ვერ მოიძებნა</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => {
              const active = selectedBrand === b.key;
              const clubCount = clubsMatchingBrand(clubs, b.key).length;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBrand(b.key)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-all min-w-[140px] ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-200'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{b.label}</div>
                  <div className="text-xs text-gray-500 mt-1 block">
                    {b.userCount} მძღოლი ·                     {b.carCount} მანქანა
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 block">
                    {clubCount} შესაბამისი კლუბი
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* არჩეული ბრენდი */}
      {selected ? (
        <section className="space-y-5">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <h2 className="text-lg font-semibold">
              2. {selected.label} — შეთავაზება
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {selected.userCount} მომხმარებელს აქვს {selected.label} გარაჟში ·{' '}
              {matchedClubs.length} კლუბი ემთხვევა
            </p>
            {selected.rawMakes.length > 1 ? (
              <p className="text-xs text-blue-200 mt-2">
                გარაჟში ვარიანტები: {selected.rawMakes.join(', ')}
              </p>
            ) : null}
          </div>

          {/* Push შაბლონი */}
          <div className="bg-white dark:bg-gray-800 border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Push ტექსტი (კლუბის შეთავაზება)
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="სათაური"
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700"
              />
              <input
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="ტექსტი"
                className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700"
              />
            </div>
          </div>

          {/* შესაბამისი კლუბები */}
          <div className="bg-white dark:bg-gray-800 border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              შესაბამისი კლუბები ({matchedClubs.length})
            </h3>
            {matchedClubs.length === 0 ? (
              <div className="text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                ამ ბრენდისთვის კლუბი ვერ მოიძებნა. დაამატე კლუბის სახელში „{selected.label}“ ან
                carMakes ველში „{selected.key}“ ქვემოთ.
              </div>
            ) : (
              <div className="space-y-3">
                {matchedClubs.map((club) => (
                  <div
                    key={club.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{club.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {club.membersCount ?? 0} წევრი · ქულა {club.matchScore}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-1 break-all">{club.id}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {detectMakesFromClub(club).map((m) => (
                          <span
                            key={m}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700"
                          >
                            {formatBrandLabel(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => applySuggestPushTemplate(club, selected)}
                        className="text-xs px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        ტექსტის შაბლონი
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveCarMakes(club, selected.key)}
                        disabled={savingId === club.id}
                        className="text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
                      >
                        + {selected.key} მარკაზე
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendClubSuggestToBrandUsers(club, selected)}
                        disabled={suggestSending}
                        className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        {suggestSending && suggestClubId === club.id
                          ? 'იგზავნება...'
                          : `Push ${selected.userCount} მძღოლს`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* მომხმარებლები */}
          <details className="bg-white dark:bg-gray-800 border rounded-xl p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200">
              მძღოლები {selected.label}-ით ({brandCars.length} მანქანა)
            </summary>
            <div className="mt-3 max-h-64 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-2">მომხმარებელი</th>
                    <th className="py-2 pr-2">მანქანა</th>
                    <th className="py-2">userId</th>
                  </tr>
                </thead>
                <tbody>
                  {brandCars.slice(0, 80).map((car, i) => (
                    <tr key={`${car.userId}-${car.id}-${i}`} className="border-b border-gray-100">
                      <td className="py-2 pr-2">{userLabel(car)}</td>
                      <td className="py-2 pr-2">
                        {car.make} {car.model} {car.year ? `(${car.year})` : ''}
                      </td>
                      <td className="py-2 font-mono text-[10px] break-all">{car.userId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {brandCars.length > 80 ? (
                <p className="text-xs text-gray-400 mt-2">… და კიდევ {brandCars.length - 80}</p>
              ) : null}
            </div>
          </details>

          {clubsWithoutMatch.length > 0 ? (
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer">
                სხვა კლუბები ამ ბრენდზე არ ემთხვევა ({clubsWithoutMatch.length})
              </summary>
              <p className="mt-2 text-xs">
                შეგიძლია სახელში მარკის დამატება ან carMakes ველის შევსება ქვემოთ „ყველა კლუბი“.
              </p>
            </details>
          ) : null}
        </section>
      ) : (
        !loading &&
        brands.length > 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            აირჩიე ბრენდი ზემოთ, რომ ნახო შესაბამისი კლუბები და გაგზავნო push
          </p>
        )
      )}

      {/* ყველა კლუბი */}
      <section className="bg-white dark:bg-gray-800 border rounded-2xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAllClubs((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750"
        >
          <span className="font-semibold text-gray-900 dark:text-white">
            3. ყველა კლუბი — carMakes რედაქტირება
          </span>
          <span className="text-gray-400">{showAllClubs ? '▲' : '▼'}</span>
        </button>
        {showAllClubs ? (
          <div className="p-5 border-t dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs">
                  <th className="py-2 pr-3">კლუბი</th>
                  <th className="py-2 pr-3">carMakes</th>
                  <th className="py-2 pr-3">ამოცნობა</th>
                  <th className="py-2">შენახვა</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{club.name}</div>
                    </td>
                    <td className="py-3 pr-3 min-w-[180px]">
                      <input
                        value={makesDraft[club.id] ?? ''}
                        onChange={(e) =>
                          setMakesDraft((p) => ({ ...p, [club.id]: e.target.value }))
                        }
                        placeholder="bmw, toyota"
                        className="w-full border rounded px-2 py-1 text-xs font-mono dark:bg-gray-700"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {detectMakesFromClub(club).map((m) => (
                          <span
                            key={m}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700"
                          >
                            {formatBrandLabel(m)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => void saveCarMakes(club)}
                        disabled={savingId === club.id}
                        className="text-xs px-2 py-1 bg-gray-800 text-white rounded disabled:opacity-50"
                      >
                        შენახვა
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}
