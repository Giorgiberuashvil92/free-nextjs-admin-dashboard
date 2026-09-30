'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGetJson } from '@/lib/api';

type Category = 'liked' | 'disliked' | 'idea' | 'other';
type Feedback = {
  id?: string;
  _id?: string;
  message?: string;
  userId?: string;
  userName?: string;
  phone?: string;
  source?: string;
  rating?: number;
  category?: Category;
  createdAt?: string;
};

const CATEGORY_LABELS: Record<Category, string> = { liked: 'მომწონს', disliked: 'არ მომწონს', idea: 'იდეა', other: 'სხვა' };
const CATEGORY_COLORS: Record<Category, string> = {
  liked: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disliked: 'bg-rose-50 text-rose-700 border-rose-200',
  idea: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function ReviewsPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetJson<{ success: boolean; data: Feedback[] }>("/reviews?limit=200&source=mobile_review");
      setItems(res.data || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'შეფასებების ჩატვირთვა ვერ მოხერხდა');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const rated = items.filter((item) => Number(item.rating) > 0);
    const average = rated.length ? rated.reduce((sum, item) => sum + Number(item.rating), 0) / rated.length : 0;
    return {
      total: items.length,
      rated: rated.length,
      average,
      liked: items.filter((item) => item.category === 'liked').length,
      disliked: items.filter((item) => item.category === 'disliked').length,
      ideas: items.filter((item) => item.category === 'idea').length,
    };
  }, [items]);

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.message || ''} ${item.userName || ''} ${item.phone || ''} ${item.userId || ''}`.toLowerCase();
    return (filter === 'all' || item.category === filter) &&
      (ratingFilter === 'all' || String(item.rating || '') === ratingFilter) &&
      (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [filter, items, query, ratingFilter]);

  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('ka-GE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return <div className="space-y-6 text-gray-900 dark:text-gray-100">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-500">MARTE VOICE OF CUSTOMER</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">მომხმარებლის შეფასებები</h1><p className="mt-1 text-sm text-gray-500">რას ფიქრობენ, რა მოსწონთ და რა უნდა გავაუმჯობესოთ.</p></div><button onClick={load} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800">განახლება ↻</button></div>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[['სულ შეფასება', stats.total, 'text-gray-900'], ['საშუალო რეიტინგი', stats.average ? `${stats.average.toFixed(1)} ★` : '—', 'text-amber-600'], ['მომწონს', stats.liked, 'text-emerald-600'], ['არ მომწონს', stats.disliked, 'text-rose-600'], ['იდეები', stats.ideas, 'text-indigo-600']].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><p className="text-xs text-gray-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p></div>)}
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap gap-2"><div className="flex flex-wrap gap-2">{(['all', 'liked', 'disliked', 'idea', 'other'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-xs font-medium ${filter === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700'}`}>{value === 'all' ? 'ყველა' : CATEGORY_LABELS[value]}</button>)}</div><select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"><option value="all">ყველა რეიტინგი</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} ვარსკვლავი</option>)}</select><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="მოძებნე ტექსტით ან userId-ით..." className="min-w-[220px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900" /></div></div>

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="border-b border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-gray-700">ნაჩვენებია {filtered.length} შეფასება</div>{loading ? <div className="p-12 text-center text-sm text-gray-500">იტვირთება…</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-gray-500">შეფასებები ვერ მოიძებნა</div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{filtered.map((item, index) => { const id = item.id || item._id || String(index); const category = item.category || 'other'; return <button key={id} onClick={() => setSelected(item)} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-indigo-50/30 md:grid-cols-[150px_1fr_180px] md:items-center"><div><p className="text-sm font-medium">{item.userName || 'უცნობი მომხმარებელი'}</p><p className="mt-1 truncate font-mono text-[10px] text-gray-400">{item.userId || item.phone || 'ID უცნობია'}</p></div><div><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${CATEGORY_COLORS[category]}`}>{CATEGORY_LABELS[category]}</span>{item.rating ? <span className="text-xs text-amber-500">{'★'.repeat(item.rating)}<span className="text-gray-300">{'★'.repeat(5 - item.rating)}</span></span> : null}</div><p className="mt-2 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{item.message || 'ტექსტი არ დაუტოვებია'}</p></div><div className="text-xs text-gray-400 md:text-right">{formatDate(item.createdAt)}<br />{item.source || 'unknown'}</div></button>; })}</div>}</div>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-indigo-500">Feedback detail</p><h2 className="mt-1 text-lg font-semibold">{selected.userName || 'უცნობი მომხმარებელი'}</h2></div><button onClick={() => setSelected(null)} className="text-xl text-gray-400">×</button></div><div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-gray-900">{selected.message || 'ტექსტი არ დაუტოვებია'}</div><div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500"><span>რეიტინგი: {selected.rating ? `${selected.rating}/5` : '—'}</span><span>კატეგორია: {CATEGORY_LABELS[selected.category || 'other']}</span><span>ტელეფონი: {selected.phone || '—'}</span><span>User ID: {selected.userId || '—'}</span></div></div></div>}
  </div>;
}
