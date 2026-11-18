'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Lead = {
  id: string; type: 'lead' | 'request'; status?: string; statusUpdatedAt?: string | null;
  fullName?: string; userId?: string | null; requestId?: string | null;
  amount?: number | null; phone?: string; merchantPhone?: string | null;
  downPayment?: number | null; termMonths?: number | null; personalId?: string | null;
  note?: string; createdAt: string;
};
const columns = [
  { value: 'received', label: 'მიღებულია', color: 'bg-blue-500' },
  { value: 'contacted', label: 'დაკავშირება მოხდა', color: 'bg-violet-500' },
  { value: 'in_review', label: 'განხილვაშია', color: 'bg-amber-500' },
  { value: 'approved', label: 'დამტკიცებულია', color: 'bg-emerald-500' },
  { value: 'rejected', label: 'უარყოფილია', color: 'bg-red-500' },
  { value: 'completed', label: 'დასრულებულია', color: 'bg-slate-500' },
] as const;
type Status = typeof columns[number]['value'];
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
const date = (value?: string | null) => value ? new Date(value).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' }) : '—';
const amount = (value?: number | null) => value == null || value === 0 ? '—' : `${value.toLocaleString('ka-GE')} ₾`;
const show = (value?: string | number | null) => value == null || value === '' ? '—' : value;

export default function FinancingLeadsPage() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/financing/leads?limit=500', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'ჩატვირთვა ვერ მოხერხდა');
      if (!Array.isArray(data) && !Array.isArray(data?.data)) throw new Error('სერვერმა არასწორი მონაცემები დააბრუნა');
      setLeads(Array.isArray(data) ? data : data.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'ჩატვირთვა ვერ მოხერხდა'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ids = [...new Set(leads.map(l => l.userId).filter((id): id is string => !!id))].filter(id => !(id in users));
    if (!ids.length) return;
    let cancelled = false;
    void Promise.all(ids.map(async id => {
      try {
        const response = await fetch(`/api/proxy/users/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) return [id, id] as const;
        const data = await response.json();
        const user = data?.data || data;
        return [id, [user?.firstName, user?.lastName].filter(Boolean).join(' ') || id] as const;
      } catch { return [id, id] as const; }
    })).then(entries => { if (!cancelled) setUsers(previous => ({ ...previous, ...Object.fromEntries(entries) })); });
    return () => { cancelled = true; };
  }, [leads, users]);

  useEffect(() => {
    if (!selected) return;
    const modal = dialog.current;
    if (modal && !modal.open) modal.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selected]);

  const filtered = useMemo(() => leads.filter(l => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    const term = search.trim().toLowerCase();
    return !term || [l.fullName, l.userId && users[l.userId], l.phone, l.merchantPhone,
      l.requestId, l.userId, l.personalId, l.note, l.amount, l.id].some(v => String(v ?? '').toLowerCase().includes(term));
  }), [leads, search, typeFilter, users]);
  const name = (lead: Lead) => lead.fullName || (lead.userId ? users[lead.userId] || lead.userId : 'სახელი არ არის მითითებული');

  async function changeStatus(lead: Lead, status: Status) {
    if (status === (lead.status || 'received')) return;
    setBusy(lead.id); setError('');
    try {
      const response = await fetch(`/api/financing/leads/${lead.type}/${lead.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(Array.isArray(saved.message) ? saved.message.join(', ') : saved.message || saved.error || 'სტატუსი ვერ შეინახა');
      setLeads(previous => previous.map(item => item.id === lead.id && item.type === lead.type
        ? { ...item, status: saved.status, statusUpdatedAt: saved.statusUpdatedAt } : item));
      setSelected(previous => previous?.id === lead.id && previous.type === lead.type
        ? { ...previous, status: saved.status, statusUpdatedAt: saved.statusUpdatedAt } : previous);
    } catch (e) { setError(e instanceof Error ? e.message : 'სტატუსი ვერ შეინახა'); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">დაფინანსების განაცხადები</h1>
        <p className="mt-2 text-sm text-gray-500">აკონტროლეთ განაცხადები და შეცვალეთ მათი სტატუსი. სულ {leads.length} განაცხადი.</p></div>
      <button disabled={loading || !!busy} onClick={() => void load()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:text-white disabled:opacity-50">განახლება</button>
    </div>
    <div className="flex flex-wrap gap-3">
      <input aria-label="განაცხადების ძებნა" className={`${input} min-w-60 flex-1`} value={search} onChange={e => setSearch(e.target.value)} placeholder="ძებნა სახელით, ტელეფონით, თანხით ან ID-ით" />
      <select aria-label="განაცხადის ტიპი" className={`${input} sm:w-52`} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
        <option value="all">ყველა განაცხადი</option><option value="lead">დაფინანსების ლიდი</option><option value="request">ზოგადი განაცხადი</option>
      </select>
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading ? <p className="py-12 text-center text-gray-500" role="status">იტვირთება...</p> :
      <div className="grid items-start gap-5 lg:grid-cols-3">{columns.map(column => {
        const cards = filtered.filter(l => (l.status || 'received') === column.value);
        return <section key={column.value} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />{column.label}<span className="ml-auto rounded-lg bg-white px-2 py-0.5 text-sm text-gray-500 dark:bg-gray-800">{cards.length}</span></h2>
          <div className="space-y-3">{cards.map(lead => <article key={`${lead.type}-${lead.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{lead.type === 'lead' ? 'დაფინანსების ლიდი' : 'ზოგადი განაცხადი'}</span><span className="text-xs text-gray-500">{date(lead.createdAt)}</span></div>
            <button onClick={() => setSelected(lead)} className="block w-full break-words text-left font-semibold text-gray-900 hover:text-blue-600 dark:text-white">{name(lead)}</button>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{amount(lead.amount)}</p>
            <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400"><p>ტელეფონი: {show(lead.phone)}</p>{lead.merchantPhone && <p>მაღაზია: {lead.merchantPhone}</p>}{lead.termMonths != null && <p>ვადა: {lead.termMonths} თვე</p>}{lead.note && <p className="line-clamp-2 whitespace-pre-wrap break-words">{lead.note}</p>}</div>
            <div className="mt-4 flex items-center gap-2"><select aria-label={`${name(lead)} — სტატუსი`} disabled={!!busy} className={`${input} flex-1`} value={lead.status || 'received'} onChange={e => void changeStatus(lead, e.target.value as Status)}>{columns.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select><button onClick={() => setSelected(lead)} className="px-2 py-2 text-sm text-blue-600 dark:text-blue-400">გახსნა</button></div>
          </article>)}{!cards.length && <p className="rounded-xl border border-dashed border-gray-300 px-3 py-10 text-center text-sm text-gray-500 dark:border-gray-700">{search || typeFilter !== 'all' ? 'შედეგები ვერ მოიძებნა' : 'განაცხადები ჯერ არ არის'}</p>}</div>
        </section>;
      })}</div>}
    {selected && <dialog ref={dialog} aria-labelledby="financing-details-title" className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-transparent p-0 backdrop:bg-black/50" onCancel={e => { e.preventDefault(); setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="financing-details-title" className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between"><h2 id="financing-details-title" className="text-xl font-semibold text-gray-900 dark:text-white">განაცხადის დეტალები</h2><button aria-label="დახურვა" onClick={() => setSelected(null)} className="px-3 py-1 text-xl text-gray-500">×</button></div>
        <div className="grid gap-4 sm:grid-cols-2">{[
          ['განმცხადებელი', name(selected)], ['ტიპი', selected.type === 'lead' ? 'დაფინანსების ლიდი' : 'ზოგადი განაცხადი'],
          ['თანხა', amount(selected.amount)], ['ტელეფონი', selected.phone], ['მაღაზიის ტელეფონი', selected.merchantPhone],
          ['ავანსი', selected.downPayment == null ? '—' : amount(selected.downPayment)], ['ვადა (თვე)', selected.termMonths],
          ['პირადი ნომერი', selected.personalId], ['მომხმარებლის ID', selected.userId], ['მოთხოვნის ID', selected.requestId],
          ['ჩანაწერის ID', selected.id], ['შექმნის თარიღი', date(selected.createdAt)], ['სტატუსის ცვლილება', date(selected.statusUpdatedAt)],
        ].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><div className="text-xs text-gray-500">{label}</div><div className="break-all text-sm font-medium text-gray-900 dark:text-white">{show(value)}</div></div>)}
          <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2 dark:border-gray-700"><div className="text-xs text-gray-500">განაცხადის შენიშვნა</div><div className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">{show(selected.note)}</div></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"><label className="mr-auto text-sm text-gray-700 dark:text-gray-200">სტატუსი<select disabled={!!busy} className={`${input} mt-1`} value={selected.status || 'received'} onChange={e => void changeStatus(selected, e.target.value as Status)}>{columns.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label><button onClick={() => setSelected(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:text-white">დახურვა</button></div>
      </section>
    </dialog>}
  </div>;
}
