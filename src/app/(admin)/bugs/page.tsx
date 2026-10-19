'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Status = 'new' | 'in_progress' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'critical';
interface Draft {
  title: string; description: string; steps: string; environment: string;
  assignee: string; notes: string; dueDate: string; status: Status; priority: Priority;
}
interface Bug extends Draft { _id: string; reporterName: string; createdAt: string }
const columns: { value: Status; label: string; color: string }[] = [
  { value: 'new', label: 'ახალი', color: 'bg-blue-500' },
  { value: 'in_progress', label: 'მუშავდება', color: 'bg-amber-500' },
  { value: 'done', label: 'დასრულებული', color: 'bg-emerald-500' },
];
const priorities: Record<Priority, string> = { low: 'დაბალი', medium: 'საშუალო', high: 'მაღალი', critical: 'კრიტიკული' };
const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700',
};
const empty: Draft = { title: '', description: '', steps: '', environment: '', assignee: '', notes: '', dueDate: '', status: 'new', priority: 'medium' };
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
async function api<T>(path = '', method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`/api/bugs${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'მოქმედება ვერ შესრულდა');
  return result;
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' });
}

export default function BugsPage() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [editor, setEditor] = useState<{ id?: string; draft: Draft } | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBugs(await api<Bug[]>()); }
    catch (e) { setError(e instanceof Error ? e.message : 'ჩატვირთვა ვერ მოხერხდა'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!editor) return;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [editor]);
  const filtered = useMemo(() => bugs.filter((bug) => (!priority || bug.priority === priority) &&
    [bug.title, bug.description, bug.assignee, bug.reporterName, bug.environment].some((v) => v.toLowerCase().includes(search.trim().toLowerCase()))), [bugs, priority, search]);
  function open(bug?: Bug) {
    setFormError('');
    setEditor(bug ? { id: bug._id, draft: { title: bug.title, description: bug.description, steps: bug.steps, environment: bug.environment, assignee: bug.assignee, notes: bug.notes, dueDate: bug.dueDate, status: bug.status, priority: bug.priority } } : { draft: { ...empty } });
  }
  function field<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEditor((current) => current ? { ...current, draft: { ...current.draft, [key]: value } } : null);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editor || saving) return;
    setSaving(true); setFormError('');
    try {
      const saved = await api<Bug>(editor.id ? `/${editor.id}` : '', editor.id ? 'PATCH' : 'POST', editor.draft);
      setBugs((current) => editor.id ? current.map((b) => b._id === saved._id ? saved : b) : [saved, ...current]);
      setEditor(null);
    } catch (e) { setFormError(e instanceof Error ? e.message : 'შენახვა ვერ მოხერხდა'); }
    finally { setSaving(false); }
  }
  async function changeStatus(bug: Bug, status: Status) {
    setBusy(bug._id); setError('');
    try {
      const saved = await api<Bug>(`/${bug._id}`, 'PATCH', { status });
      setBugs((current) => current.map((b) => b._id === saved._id ? saved : b));
    } catch (e) { setError(e instanceof Error ? e.message : 'სტატუსი ვერ შეიცვალა'); }
    finally { setBusy(null); }
  }
  async function remove() {
    if (!editor?.id || !window.confirm('ნამდვილად წაიშალოს ეს ბაგი?')) return;
    setSaving(true); setFormError('');
    try {
      await api(`/${editor.id}`, 'DELETE');
      setBugs((current) => current.filter((b) => b._id !== editor.id)); setEditor(null);
    } catch (e) { setFormError(e instanceof Error ? e.message : 'წაშლა ვერ მოხერხდა'); }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ბაგები</h1><p className="mt-2 text-sm text-gray-500">აღწერეთ პრობლემა, დაგეგმეთ გამოსწორება და აკონტროლეთ პროგრესი.</p></div>
      <div className="flex gap-2"><button disabled={loading || !!busy} onClick={() => void load()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:text-white disabled:opacity-50">განახლება</button><button onClick={() => open()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">+ ბაგის დამატება</button></div>
    </div>
    <div className="flex flex-wrap gap-3"><input aria-label="ბაგების ძებნა" className={`${input} min-w-60 flex-1`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ძებნა სათაურით, აღწერით ან პასუხისმგებელი პირით" /><select aria-label="პრიორიტეტი" className={`${input} sm:w-52`} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">ყველა პრიორიტეტი</option>{Object.entries(priorities).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading ? <p className="py-12 text-center text-gray-500" role="status">იტვირთება...</p> : <div className="grid items-start gap-5 lg:grid-cols-3">{columns.map((column) => {
      const cards = filtered.filter((b) => b.status === column.value);
      return <section key={column.value} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><span className={`h-2.5 w-2.5 rounded-full ${column.color}`} />{column.label}<span className="ml-auto rounded-lg bg-white px-2 py-0.5 text-sm text-gray-500 dark:bg-gray-800">{cards.length}</span></h2>
        <div className="space-y-3">{cards.map((bug) => <article key={bug._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className={`rounded-md px-2 py-1 text-xs font-medium ${priorityColors[bug.priority]}`}>{priorities[bug.priority]}</span><span className="text-xs text-gray-500 dark:text-gray-400">{dateLabel(bug.createdAt)}</span></div>
          <button onClick={() => open(bug)} className="block w-full break-words text-left font-semibold text-gray-900 hover:text-blue-600 dark:text-white">{bug.title}</button>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-500 dark:text-gray-400">{bug.description}</p>
          <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400"><p>ავტორი: {bug.reporterName}</p><p>პასუხისმგებელი: {bug.assignee || 'არ არის მინიჭებული'}</p>{bug.dueDate && <p>ვადა: {bug.dueDate}</p>}{bug.environment && <p className="break-words">გარემო: {bug.environment}</p>}</div>
          <div className="mt-4 flex items-center gap-2"><select aria-label={`${bug.title} — სტატუსი`} disabled={!!busy} className={`${input} flex-1`} value={bug.status} onChange={(e) => void changeStatus(bug, e.target.value as Status)}>{columns.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select><button onClick={() => open(bug)} className="px-2 py-2 text-sm text-blue-600 dark:text-blue-400">გახსნა</button></div>
        </article>)}{!cards.length && <p className="rounded-xl border border-dashed border-gray-300 px-3 py-10 text-center text-sm text-gray-500 dark:border-gray-700">{search || priority ? 'შედეგები ვერ მოიძებნა' : 'ბაგები ჯერ არ არის'}</p>}</div>
      </section>;
    })}</div>}
    {editor && <dialog ref={dialog} aria-labelledby="bug-editor-title" className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-transparent p-0 backdrop:bg-black/50" onCancel={(e) => { e.preventDefault(); if (!saving) setEditor(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bug-editor-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between"><h2 id="bug-editor-title" className="text-xl font-semibold text-gray-900 dark:text-white">{editor.id ? 'ბაგის დეტალები' : 'ახალი ბაგი'}</h2><button aria-label="დახურვა" disabled={saving} onClick={() => setEditor(null)} className="px-3 py-1 text-xl text-gray-500">×</button></div>
        <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm text-gray-700 dark:text-gray-200">სათაური *<input autoFocus required maxLength={160} className={`${input} mt-1`} value={editor.draft.title} onChange={(e) => field('title', e.target.value)} placeholder="მაგ.: ჯარიმების გვერდი არ იტვირთება" /></label>
          <label className="block text-sm text-gray-700 dark:text-gray-200">პრობლემის აღწერა *<textarea required maxLength={10000} rows={4} className={`${input} mt-1`} value={editor.draft.description} onChange={(e) => field('description', e.target.value)} placeholder="რა მოხდა და რას ელოდებოდით?" /></label>
          <label className="block text-sm text-gray-700 dark:text-gray-200">გამეორების ნაბიჯები<textarea maxLength={10000} rows={3} className={`${input} mt-1`} value={editor.draft.steps} onChange={(e) => field('steps', e.target.value)} placeholder="1. გახსენით... 2. დააჭირეთ..." /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-gray-700 dark:text-gray-200">სტატუსი<select className={`${input} mt-1`} value={editor.draft.status} onChange={(e) => field('status', e.target.value as Status)}>{columns.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label className="block text-sm text-gray-700 dark:text-gray-200">პრიორიტეტი<select className={`${input} mt-1`} value={editor.draft.priority} onChange={(e) => field('priority', e.target.value as Priority)}>{Object.entries(priorities).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="block text-sm text-gray-700 dark:text-gray-200">პასუხისმგებელი<input maxLength={120} className={`${input} mt-1`} value={editor.draft.assignee} onChange={(e) => field('assignee', e.target.value)} placeholder="სახელი" /></label><label className="block text-sm text-gray-700 dark:text-gray-200">დაგეგმილი ვადა<input type="date" className={`${input} mt-1`} value={editor.draft.dueDate} onChange={(e) => field('dueDate', e.target.value)} /></label></div>
          <label className="block text-sm text-gray-700 dark:text-gray-200">მოწყობილობა / ვერსია / გვერდი<input maxLength={200} className={`${input} mt-1`} value={editor.draft.environment} onChange={(e) => field('environment', e.target.value)} placeholder="მაგ.: iPhone 15, iOS 18, აპი 1.0.0" /></label>
          <label className="block text-sm text-gray-700 dark:text-gray-200">სამუშაო ჩანაწერები<textarea maxLength={10000} rows={3} className={`${input} mt-1`} value={editor.draft.notes} onChange={(e) => field('notes', e.target.value)} placeholder="გამოსწორების გეგმა, აღმოჩენები, შედეგი..." /></label>
        </fieldset>
        {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">{editor.id && <button type="button" disabled={saving} onClick={() => void remove()} className="mr-auto text-sm text-red-600 disabled:opacity-50">წაშლა</button>}<button type="button" disabled={saving} onClick={() => setEditor(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:text-white">გაუქმება</button><button disabled={saving || !editor.draft.title.trim() || !editor.draft.description.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'ინახება...' : 'შენახვა'}</button></div>
        </form>
      </section>
    </dialog>}
  </div>;
}
