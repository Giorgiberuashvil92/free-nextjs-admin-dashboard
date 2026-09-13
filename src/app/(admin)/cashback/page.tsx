'use client';
import React, { useCallback, useEffect, useState } from 'react';
type Invoice = { id: string; userId: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string; amountTetri?: number; verifiedLiters?: number; rejectionReason?: string; receiptKey?: string; reviewedBy?: string };
const statuses = { pending: 'მოლოდინში', approved: 'დადასტურებული', rejected: 'უარყოფილი' };
const CASHBACK_TETRI_PER_LITER = 5;
const money = (tetri: number) => `${(tetri / 100).toFixed(2)} ₾`;
const inputClass = 'w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700';
export default function CashbackPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [liters, setLiters] = useState('');
  const [merchant, setMerchant] = useState('');
  const [receipt, setReceipt] = useState('');
  const [reason, setReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError(''); setItems([]);
    try {
      const res = await fetch(`/api/admin/cashback/invoices?status=${status}&page=${page}`, { signal });
      const body = await res.json(); if (!res.ok) throw new Error(body.message || 'ჩატვირთვა ვერ მოხერხდა');
      if (!signal.aborted) { setItems(body.items); setHasMore(body.hasMore); }
    } catch (e) { if (!signal.aborted) setError(e instanceof Error ? e.message : 'ქსელის შეცდომა'); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [status, page]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, reload]);
  function open(invoice: Invoice) { setSelected(invoice); setLiters(''); setMerchant(''); setReceipt(''); setReason(''); setChecked(false); setReviewError(''); }
  async function review(result: 'approved' | 'rejected') {
    if (!selected || busy) return;
    if (result === 'approved' && !checked) { setReviewError('გადაამოწმეთ ინვოისი და მონიშნეთ დასტური.'); return; }
    setBusy(true); setReviewError('');
    try {
      const res = await fetch(`/api/admin/cashback/invoices/${selected.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: result, liters: Number(liters.replace(',', '.')), merchantTaxId: merchant, receiptNumber: receipt, reason }),
      });
      const body = await res.json(); if (!res.ok) throw new Error(body.message || 'შენახვა ვერ მოხერხდა');
      setSelected(null); setReload(n => n + 1);
    } catch (e) { setReviewError(e instanceof Error ? e.message : 'ქსელის შეცდომა'); }
    finally { setBusy(false); }
  }
  const amount = Number(liters.replace(',', '.'));
  return <div className="space-y-6 text-gray-900 dark:text-gray-100">
    <div><h1 className="text-2xl font-semibold">ქეშბექის ინვოისები</h1><p className="mt-2 text-sm text-gray-500">ჩასხმისას — 20 თეთრი ფასდაკლება თითო ლიტრზე. MARTE-სგან — დამატებით 5 თეთრი ქეშბექი, მხოლოდ ინვოისის დადასტურების შემდეგ.</p></div>
    <div className="flex flex-wrap gap-3">{Object.entries(statuses).map(([key, label]) => <button key={key} onClick={() => { setStatus(key); setPage(0); }} className={`rounded-lg px-4 py-2 text-sm ${status === key ? 'bg-[#5862FB] text-white' : 'border border-gray-300 dark:border-gray-700'}`}>{label}</button>)}<button className="ml-auto text-sm text-indigo-500" onClick={() => setReload(n => n + 1)}>განახლება</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><table className="w-full text-left text-sm"><thead className="bg-gray-50 dark:bg-gray-800"><tr>{['თარიღი', 'მომხმარებელი', 'სტატუსი', 'ქეშბექი', 'ინვოისი'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>
      {items.map(item => <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800"><td className="p-4">{new Date(item.createdAt).toLocaleString('ka-GE')}</td><td className="p-4">{item.userId}</td><td className="p-4">{statuses[item.status]}{item.rejectionReason && <p className="mt-1 max-w-xs text-xs text-gray-500">{item.rejectionReason}</p>}</td><td className="p-4">{item.status === 'approved' ? `${money(item.amountTetri || 0)} / ${item.verifiedLiters} ლ` : '—'}</td><td className="p-4"><a className="mr-4 text-indigo-500 underline" href={`/api/admin/cashback/invoices/${item.id}/file`} target="_blank" rel="noopener noreferrer">ჩამოტვირთვა</a>{item.status === 'pending' && <button className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700" onClick={() => open(item)}>განხილვა</button>}</td></tr>)}
      {!items.length && <tr><td colSpan={5} className="p-10 text-center text-gray-500">{loading ? 'იტვირთება…' : error ? 'მონაცემები მიუწვდომელია' : 'ამ სტატუსით ინვოისები არ არის'}</td></tr>}
    </tbody></table></div>
    <div className="flex items-center justify-end gap-4"><button disabled={page === 0 || loading} className="disabled:opacity-30" onClick={() => setPage(n => n - 1)}>წინა</button><span>{page + 1}</span><button disabled={!hasMore || loading} className="disabled:opacity-30" onClick={() => setPage(n => n + 1)}>შემდეგი</button></div>
    {selected && <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
      <div className="flex justify-between"><h2 id="review-title" className="text-lg font-semibold">ინვოისის განხილვა</h2><button disabled={busy} onClick={() => setSelected(null)} aria-label="დახურვა">✕</button></div>
      <a className="block text-indigo-500 underline" href={`/api/admin/cashback/invoices/${selected.id}/file`} target="_blank" rel="noopener noreferrer">გახსენი ინვოისი შესამოწმებლად</a>
      <label className="block space-y-1"><span>დადასტურებული ლიტრები</span><input className={inputClass} inputMode="decimal" value={liters} onChange={e => setLiters(e.target.value)} disabled={busy} placeholder="მაგ. 45.500" /></label>
      <label className="block space-y-1"><span>გამყიდველის საიდენტიფიკაციო კოდი</span><input className={inputClass} inputMode="numeric" maxLength={11} value={merchant} onChange={e => setMerchant(e.target.value)} disabled={busy} /></label>
      <label className="block space-y-1"><span>ინვოისის ნომერი</span><input className={inputClass} maxLength={100} value={receipt} onChange={e => setReceipt(e.target.value)} disabled={busy} /></label>
      <div className="rounded-xl bg-indigo-50 p-4 text-indigo-700">დასამატებელი ქეშბექი: <strong>{Number.isFinite(amount) && amount > 0 ? money(Math.round(Math.round(amount * 1000) * CASHBACK_TETRI_PER_LITER / 1000)) : '—'}</strong></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={busy} /><span>ინვოისი შევამოწმე: შეძენა აკმაყოფილებს პირობებს და ლიტრები სწორია.</span></label>
      <label className="block space-y-1"><span>უარის მიზეზი (უარყოფისას სავალდებულოა)</span><textarea className={inputClass} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
      {reviewError && <p role="alert" className="text-sm text-red-600">{reviewError}</p>}
      <div className="flex gap-3"><button disabled={busy || !checked} onClick={() => review('approved')} className="flex-1 rounded-lg bg-[#5862FB] px-4 py-3 text-white disabled:opacity-40">{busy ? 'ინახება…' : 'დადასტურება'}</button><button disabled={busy || !reason.trim()} onClick={() => review('rejected')} className="rounded-lg border border-red-200 px-4 py-3 text-red-600 disabled:opacity-40">უარყოფა</button></div>
    </div></div>}
  </div>;
}
