'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGetJson } from '@/lib/api';

interface EngagementUser {
  userId: string;
  phone: string;
  email?: string;
  firstName?: string;
  loginCount: number;
  countLast3Weeks: number;
  firstLogin: string;
  lastLogin: string;
  inactiveDays: number;
  /** ბოლო 21 დღეში განსხვავებული დღეების რაოდენობა */
  distinctDaysLast3Weeks?: number;
}

interface Summary {
  totalUsers: number;
  returnUsers: number;
  activeLast3Weeks: number;
  churned: number;
  frequentLast3Weeks: number;
  oneTime: number;
  almostDaily: number;
  totalLoginsInPeriod: number;
}

interface EngagementData {
  summary: Summary;
  segments: {
    returnUsers: EngagementUser[];
    churned: EngagementUser[];
    activeLast3Weeks: EngagementUser[];
    frequentLast3Weeks: EngagementUser[];
    oneTime: EngagementUser[];
    almostDaily: EngagementUser[];
  };
}

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleString('ka-GE', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

type TableColumn = 'loginCount' | 'countLast3Weeks' | 'inactiveDays' | 'lastLogin' | 'distinctDaysLast3Weeks';

const CSV_HEADERS: Record<TableColumn, string> = {
  loginCount: 'შესვლა (სულ)',
  countLast3Weeks: 'ბოლო 3 კვირა',
  inactiveDays: 'არააქტიური (დღე)',
  lastLogin: 'ბოლო შესვლა',
  distinctDaysLast3Weeks: 'დღე (უნიკ.)',
};

function downloadSegmentCsv(
  users: EngagementUser[],
  columns: TableColumn[],
  filename: string,
) {
  const headers = ['userId', 'ტელ.', 'სახელი', ...columns.map((c) => CSV_HEADERS[c])];
  const escape = (v: string | number | undefined) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = users.map((u) => {
    const base = [u.userId, u.phone, u.firstName ?? '—'];
    const extra = columns.map((col) => {
      if (col === 'lastLogin') return formatDate(u.lastLogin);
      if (col === 'distinctDaysLast3Weeks') return u.distinctDaysLast3Weeks ?? '—';
      return u[col] ?? '—';
    });
    return [...base, ...extra].map((v) => escape(v)).join(',');
  });
  const csv = '\uFEFF' + [headers.map((h) => escape(h)).join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function EngagementAnalyticsPage() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('summary');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGetJson<{ success: boolean; data: EngagementData }>(
        '/login-history/engagement-analytics'
      );
      if (res.success && res.data) setData(res.data);
      else setError('მონაცემები ვერ ჩაიტვირთა');
    } catch (e: any) {
      setError(e?.message || 'შეცდომა');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [openSection]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">შესვლის ანალიტიკა</h1>
        <p className="text-gray-600 mb-6">იტვირთება...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">შესვლის ანალიტიკა</h1>
        <p className="text-red-600 mb-4">{error || 'მონაცემები არ არის'}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          ხელახლა ცდა
        </button>
      </div>
    );
  }

  const { summary, segments } = data;

  const SectionCard = ({
    id,
    title,
    count,
    sub,
    borderColor,
    icon,
  }: {
    id: string;
    title: string;
    count: number;
    sub?: string;
    borderColor: string;
    icon: string;
  }) => (
    <button
      type="button"
      onClick={() => setOpenSection(openSection === id ? null : id)}
      className={`bg-white rounded-lg shadow p-6 border-l-4 text-left w-full ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{count.toLocaleString()}</div>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
    </button>
  );

  const totalPages = (total: number) => Math.max(1, Math.ceil(total / pageSize));

  const UserTable = ({
    users,
    columns,
    downloadFilename,
  }: {
    users: EngagementUser[];
    columns: TableColumn[];
    downloadFilename?: string;
  }) => {
    const total = users.length;
    const pages = totalPages(total);
    const currentPage = Math.min(page, pages);
    const from = (currentPage - 1) * pageSize;
    const to = Math.min(from + pageSize, total);
    const list = users.slice(from, from + pageSize);

    return (
      <div>
        {downloadFilename && total > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => downloadSegmentCsv(users, columns, downloadFilename)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ჩამოწერა CSV ({total} ჩანაწერი)
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600 text-left">
                <th className="py-2 pr-4">userId</th>
                <th className="py-2 pr-4">ტელ.</th>
                <th className="py-2 pr-4">სახელი</th>
                {columns.includes('loginCount') && <th className="py-2 pr-4">შესვლა (სულ)</th>}
                {columns.includes('countLast3Weeks') && <th className="py-2 pr-4">ბოლო 3 კვირა</th>}
                {columns.includes('distinctDaysLast3Weeks') && <th className="py-2 pr-4">დღე (უნიკ.)</th>}
                {columns.includes('inactiveDays') && <th className="py-2 pr-4">არააქტიური (დღე)</th>}
                {columns.includes('lastLogin') && <th className="py-2 pr-4">ბოლო შესვლა</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs">{u.userId}</td>
                  <td className="py-2 pr-4">{u.phone}</td>
                  <td className="py-2 pr-4">{u.firstName || '—'}</td>
                  {columns.includes('loginCount') && <td className="py-2 pr-4">{u.loginCount}</td>}
                  {columns.includes('countLast3Weeks') && <td className="py-2 pr-4">{u.countLast3Weeks}</td>}
                  {columns.includes('distinctDaysLast3Weeks') && <td className="py-2 pr-4">{u.distinctDaysLast3Weeks ?? '—'}</td>}
                  {columns.includes('inactiveDays') && <td className="py-2 pr-4">{u.inactiveDays}</td>}
                  {columns.includes('lastLogin') && <td className="py-2 pr-4">{formatDate(u.lastLogin)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                ნაჩვენებია {from + 1}–{to} სულ {total}-დან
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                გვერდზე:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                წინა
              </button>
              <span className="text-sm text-gray-600">
                გვერდი {currentPage} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={currentPage >= pages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                შემდეგი
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">შესვლის ანალიტიკა</h1>
          <p className="text-gray-600 mt-1">
            მხოლოდ იუზერები, რომლებიც 3-ზე მეტჯერ შემოვიდნენ (პირველი შესვლა 3-ჯერ ითვლის). Return users, ხშირად შემოსული, დაკარგული.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          განახლება
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SectionCard
          id="summary"
          title="სულ უნიკალური იუზერი (3 თვე)"
          count={summary.totalUsers}
          sub={`${summary.totalLoginsInPeriod.toLocaleString()} შესვლა პერიოდში`}
          borderColor="border-blue-500"
          icon="👥"
        />
        <SectionCard
          id="return"
          title="Return users (2+ შესვლა)"
          count={summary.returnUsers}
          sub="მომხმარებლები, რომლებიც მეორედ ან მეტჯერ შემოვიდნენ"
          borderColor="border-green-500"
          icon="🔄"
        />
        <SectionCard
          id="frequent"
          title="ხშირად შემოსული (ბოლო 3 კვირა)"
          count={summary.frequentLast3Weeks}
          sub="3+ შესვლა ბოლო 21 დღეში"
          borderColor="border-emerald-500"
          icon="🔥"
        />
        <SectionCard
          id="churned"
          title="დაკარგული (Churned)"
          count={summary.churned}
          sub="21+ დღე არ შემოვიდნენ"
          borderColor="border-amber-500"
          icon="😴"
        />
        <SectionCard
          id="active"
          title="აქტიური ბოლო 3 კვირაში"
          count={summary.activeLast3Weeks}
          sub="მინიმუმ 1 შესვლა ბოლო 21 დღეში"
          borderColor="border-teal-500"
          icon="✅"
        />
        <SectionCard
          id="almostDaily"
          title="თითქმის ყოველდღე"
          count={summary.almostDaily ?? 0}
          sub="ბოლო 21 დღეში მინ. 3 განსხვავებული დღე შემოსული"
          borderColor="border-violet-500"
          icon="📅"
        />
        <SectionCard
          id="onetime"
          title="ერთჯერადი"
          count={summary.oneTime}
          sub="მხოლოდ 1 შესვლა პერიოდში"
          borderColor="border-gray-400"
          icon="1️⃣"
        />
      </div>

      {/* Segment tables */}
      <div className="space-y-4">
        {openSection === 'return' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Return users (სრული სია)</h2>
            <UserTable users={segments.returnUsers} columns={['loginCount', 'countLast3Weeks', 'inactiveDays', 'lastLogin']} downloadFilename="return-users.csv" />
          </div>
        )}
        {openSection === 'frequent' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ხშირად შემოსული – ბოლო 3 კვირა (3+ შესვლა)</h2>
            <UserTable users={segments.frequentLast3Weeks} columns={['loginCount', 'countLast3Weeks', 'lastLogin']} downloadFilename="frequent-users.csv" />
          </div>
        )}
        {openSection === 'churned' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">დაკარგული იუზერები (21+ დღე არააქტიური)</h2>
            <UserTable users={segments.churned} columns={['loginCount', 'inactiveDays', 'lastLogin']} downloadFilename="dakarguli-users.csv" />
          </div>
        )}
        {openSection === 'active' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">აქტიური ბოლო 3 კვირაში (მინ. 1 შესვლა)</h2>
            <UserTable users={segments.activeLast3Weeks} columns={['loginCount', 'countLast3Weeks', 'lastLogin']} downloadFilename="active-users.csv" />
          </div>
        )}
        {openSection === 'almostDaily' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">თითქმის ყოველდღე ბრუნდებიან (ბოლო 21 დღეში მინ. 3 განსხვავებული დღე)</h2>
            <UserTable users={segments.almostDaily ?? []} columns={['loginCount', 'countLast3Weeks', 'distinctDaysLast3Weeks', 'lastLogin']} downloadFilename="titqmis-qoveldge.csv" />
          </div>
        )}
        {openSection === 'onetime' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ერთჯერადი იუზერები</h2>
            <UserTable users={segments.oneTime} columns={['lastLogin']} downloadFilename="onetime-users.csv" />
          </div>
        )}
      </div>

      <p className="text-gray-400 text-sm mt-6">
        მონაცემები აგებულია login_history კოლექციაზე (status: success, 22/12/2025-იდან). ნაჩვენებია მხოლოდ იუზერები შესვლების რაოდენობა &gt; 3 (პირველი შესვლა 3-ჯერ ითვლის). 3 კვირა = 21 დღე.
      </p>
    </div>
  );
}
