'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Vehicle {
  _id: string;
  userId: string;
  carId: string;
  vehicleNumber: string;
  isActive: boolean;
  lastSyncStatus: string;
  lastCheckedAt?: string;
  lastError?: string;
  owner?: { firstName?: string; lastName?: string; phone?: string } | null;
}

const statuses: Record<string, string> = {
  success: 'წარმატებული',
  not_found: 'ჯარიმა არ მოიძებნა',
  failed: 'შეცდომა',
  pending: 'მოლოდინში',
  refresh_due: 'განახლება საჭიროა',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' });
}

export default function MunicipalFinesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVehicles(await apiGet<Vehicle[]>('/fines/protocol-fines/admin-vehicles'));
    } catch {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((v) => (!status || v.lastSyncStatus === status) &&
      [v.vehicleNumber, v.userId, v.carId, v.owner?.firstName, v.owner?.lastName, v.owner?.phone]
        .some((value) => value?.toLowerCase().includes(query)));
  }, [vehicles, search, status]);
  const users = new Set(vehicles.map((v) => v.userId)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">მერიის ჯარიმები</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">მომხმარებლები, რომლებმაც აპში Protocols.ge-ის ჯარიმები შეამოწმეს. სია მოიცავს შემთხვევებსაც, როცა ჯარიმა არ მოიძებნა.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">განახლება</button>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200">
        <span>მომხმარებლები: <strong>{users}</strong></span>
        <span>მანქანის ჩანაწერები: <strong>{vehicles.length}</strong></span>
        <span>აქტიური ჩანაწერები: <strong>{vehicles.filter((v) => v.isActive).length}</strong></span>
      </div>
      <div className="flex flex-wrap gap-3">
        <input aria-label="მომხმარებლის ან მანქანის ძებნა" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="სახელი, ტელეფონი, მანქანის ნომერი ან მომხმარებლის ID" className="min-w-64 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700 dark:text-white" />
        <select aria-label="შემოწმების სტატუსი" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="">ყველა სტატუსი</option>
          {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div> : loading ? <p className="text-gray-500">იტვირთება...</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-800"><tr>{['მომხმარებელი', 'ტელეფონი', 'მანქანის ნომერი', 'ჩანაწერი', 'ბოლო შედეგი', 'ბოლო შემოწმება (თბილისი)'].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead>
            <tbody>
              {filtered.map((v) => <tr key={v._id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3"><div>{[v.owner?.firstName, v.owner?.lastName].filter(Boolean).join(' ') || 'უცნობი მომხმარებელი'}</div><div className="mt-1 text-xs text-gray-500">{v.userId}</div></td>
                <td className="whitespace-nowrap px-4 py-3">{v.owner?.phone || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{v.vehicleNumber}</td>
                <td className="px-4 py-3">{v.isActive ? 'აქტიური' : 'არააქტიური'}</td>
                <td className="px-4 py-3"><span className={v.lastSyncStatus === 'failed' ? 'text-red-600' : ''}>{statuses[v.lastSyncStatus] || v.lastSyncStatus}</span>{v.lastError && <div className="mt-1 text-xs text-red-600">{v.lastError}</div>}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(v.lastCheckedAt)}</td>
              </tr>)}
              {!filtered.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">ჩანაწერები ვერ მოიძებნა.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
