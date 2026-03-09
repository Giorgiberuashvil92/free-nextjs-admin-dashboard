'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAllUsersEvents, type AllUsersEventsItem, type UserEvent } from '@/services/analyticsApi';

type EventKind = 'all' | 'views' | 'clicks' | 'impressions' | 'calls';

type DismantlerEventRow = {
  userId: string;
  userInfo?: AllUsersEventsItem['userInfo'];
  event: UserEvent;
  kind: 'view' | 'click' | 'impression' | 'call';
  itemId: string;
  itemName: string;
  screen: string;
};

function formatDate(dateString: string | number) {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString * 1000);
    return date.toLocaleString('ka-GE', {
      timeZone: 'Asia/Tbilisi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

function isDismantlerEvent(ev: UserEvent): { kind: DismantlerEventRow['kind']; itemId: string; itemName: string } | null {
  const params = (ev.params || {}) as Record<string, any>;
  const itemType = String(params.item_type ?? '');
  const itemId = String(params.item_id ?? '');
  const itemName = String(params.item_name ?? ev.eventName ?? '');

  if (ev.eventType === 'sales_item_view' && itemType === 'dismantler' && itemId) {
    return { kind: 'view', itemId, itemName };
  }
  if (ev.eventType === 'sales_item_click' && itemType === 'dismantler' && itemId) {
    return { kind: 'click', itemId, itemName };
  }
  if (ev.eventType === 'sales_item_impression' && itemType === 'dismantler' && itemId) {
    return { kind: 'impression', itemId, itemName };
  }

  // “დარეკვა” ჩვენთან backend-ზე მოდის button_click-ით (params.item_type + item_id)
  if (ev.eventType === 'button_click') {
    const buttonName = String(params.button_name ?? '');
    if (buttonName === 'დარეკვა' && itemType === 'dismantler' && itemId) {
      return { kind: 'call', itemId, itemName };
    }
  }

  return null;
}

export default function DismantlerEventsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [limit, setLimit] = useState<number>(1500); // 0 = ყველა
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<EventKind>('all');
  const [allUsersEvents, setAllUsersEvents] = useState<AllUsersEventsItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsersEvents(period, limit > 0 ? limit : undefined);
      setAllUsersEvents(data);
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Failed to load dismantler events';
      setError(message);
      setAllUsersEvents([]);
    } finally {
      setLoading(false);
    }
  }, [period, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo<DismantlerEventRow[]>(() => {
    const flattened: DismantlerEventRow[] = [];

    for (const u of allUsersEvents) {
      const events = Array.isArray(u.events) ? u.events : [];
      for (const ev of events) {
        const parsed = isDismantlerEvent(ev);
        if (!parsed) continue;

        flattened.push({
          userId: u.userId,
          userInfo: u.userInfo,
          event: ev,
          kind: parsed.kind,
          itemId: parsed.itemId,
          itemName: parsed.itemName,
          screen: ev.screen,
        });
      }
    }

    flattened.sort((a, b) => (b.event.timestamp || 0) - (a.event.timestamp || 0));
    return flattened;
  }, [allUsersEvents]);

  const filteredRows = useMemo(() => {
    let r = rows;

    if (kindFilter !== 'all') {
      r = r.filter((x) => {
        if (kindFilter === 'views') return x.kind === 'view';
        if (kindFilter === 'clicks') return x.kind === 'click';
        if (kindFilter === 'impressions') return x.kind === 'impression';
        if (kindFilter === 'calls') return x.kind === 'call';
        return true;
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return r;

    return r.filter((x) => {
      const phone = x.userInfo?.phone || '';
      return (
        x.userId.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        x.itemId.toLowerCase().includes(q) ||
        x.itemName.toLowerCase().includes(q) ||
        String(x.screen || '').toLowerCase().includes(q)
      );
    });
  }, [rows, kindFilter, searchQuery]);

  const topDismantlers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filteredRows) {
      const key = r.itemName || r.itemId || 'უცნობი';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredRows]);

  const stats = useMemo(() => {
    const s = { view: 0, click: 0, impression: 0, call: 0 };
    for (const r of filteredRows) s[r.kind] += 1;
    return s;
  }, [filteredRows]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">დაშლილების მოვლენები</h1>
        <p className="text-gray-600">
          აქ ჩანს დაშლილებზე: <span className="font-medium">ნახვა</span>, <span className="font-medium">ქარდზე დაჭერა</span>, <span className="font-medium">impression (სქროლით ნახვა)</span> და <span className="font-medium">დარეკვა</span>.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">პერიოდი</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month' | 'all')}
              className="w-full border rounded px-3 py-2"
            >
              <option value="today">დღეს</option>
              <option value="week">კვირა</option>
              <option value="month">თვე</option>
              <option value="all">ყველა</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ლიმიტი (0 = ყველა)</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number.isFinite(parseInt(e.target.value)) ? parseInt(e.target.value) : 1500)}
              min="0"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ტიპი</label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as EventKind)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">ყველა</option>
              <option value="views">ნახვები</option>
              <option value="clicks">დაჭერები</option>
              <option value="impressions">impressions</option>
              <option value="calls">დარეკვები</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">ძებნა (იუზერი / ტელეფონი / დაშლილი)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="userId, +995..., დაშლილის სახელი..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'იტვირთება...' : 'განახლება'}
          </button>

          <div className="text-sm text-gray-600">
            სულ: <span className="font-semibold">{filteredRows.length}</span>
          </div>
          <div className="text-sm text-gray-600">
            ნახვა: <span className="font-semibold">{stats.view}</span>
          </div>
          <div className="text-sm text-gray-600">
            დაჭერა: <span className="font-semibold">{stats.click}</span>
          </div>
          <div className="text-sm text-gray-600">
            impression: <span className="font-semibold">{stats.impression}</span>
          </div>
          <div className="text-sm text-gray-600">
            დარეკვა: <span className="font-semibold">{stats.call}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {topDismantlers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Top დაშლილები (ამ ფილტრებით)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {topDismantlers.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded px-3 py-2">
                <span className="truncate">{name}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
        {loading ? (
          <div className="text-center py-8">იტვირთება...</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">მონაცემები არ მოიძებნა</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">დრო</th>
                  <th className="text-left p-2">ტიპი</th>
                  <th className="text-left p-2">მომხმარებელი</th>
                  <th className="text-left p-2">დაშლილი</th>
                  <th className="text-left p-2">item_id</th>
                  <th className="text-left p-2">ეკრანი</th>
                  <th className="text-left p-2">პარამეტრები</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const ev = r.event;
                  const when = ev.dateFormatted || formatDate(ev.date || ev.timestamp);
                  const params = ev.paramsFormatted || (ev.params && Object.keys(ev.params).length > 0 ? JSON.stringify(ev.params, null, 2) : '');

                  const kindLabel =
                    r.kind === 'view' ? 'ნახვა' :
                    r.kind === 'click' ? 'დაჭერა' :
                    r.kind === 'impression' ? 'impression' :
                    'დარეკვა';

                  return (
                    <tr key={`${r.userId}-${ev.id}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-2 whitespace-nowrap">{when}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {kindLabel}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          <Link
                            href={`/user-events?userId=${encodeURIComponent(r.userId)}`}
                            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                          >
                            {r.userId}
                          </Link>
                          {r.userInfo?.phone && (
                            <span className="text-xs text-gray-500">{r.userInfo.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 font-medium">{r.itemName || '-'}</td>
                      <td className="p-2">{r.itemId || '-'}</td>
                      <td className="p-2">{r.screen || '-'}</td>
                      <td className="p-2">
                        {params ? (
                          <details>
                            <summary className="cursor-pointer text-blue-600">ნახვა</summary>
                            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">
                              {params}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">-</span>
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

