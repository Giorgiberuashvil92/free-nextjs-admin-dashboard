'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { API_BASE } from '@/lib/api';

type Audience = 'active' | 'all' | 'role' | 'users';

const MOBILE_SCREENS = [
  ['მთავარი გვერდი', '/', 'მთავარი გვერდი'], ['შეტყობინებები', '/notifications', 'Push inbox'],
  ['AI ასისტენტი', '/ai-dashboard-demo', 'AI დახმარების მთავარი გვერდი'], ['AI ჩატი', '/ai-chat', 'AI საუბარი'],
  ['კატეგორიები', '/(tabs)/marketplace', 'აპის კატეგორიების tab'], ['მართე', '/(tabs)/ecommerce', 'Marte-ის სერვისები და პროდუქტები'],
  ['შეთავაზებები', '/offers', 'შეთავაზებების სია'], ['კონკრეტული შეთავაზება', '/offers/{offerId}', 'სჭირდება offerId'],
  ['საწვავის ფასები', '/fuel-stations', 'საწვავის სადგურები და ფასები'], ['დაზღვევა', '/insurance', 'Euroins / insurance flow'],
  ['განვადების ინფორმაცია', '/financing-info', 'განვადების პირობები'], ['განვადების მოთხოვნა', '/financing-request', 'განვადების განაცხადი'],
  ['Marte Card', '/marte-card', 'Marte Card'],
  ['Garage / მანქანები', '/(tabs)/garage', 'მომხმარებლის მანქანები'], ['მძღოლების აქტივობა', '/garage-activity', 'საწვავისა და სერვისის აქტივობა'],
  ['რადარები', '/radars', 'რადარები'], ['Carfax', '/carfax', 'Carfax flow'], ['შეფასება', '/review', 'Review screen'],
  ['Community', '/(tabs)/community', 'კომუნიტის მთავარი გვერდი'], ['პოსტის კომენტარები', '/comments', 'სჭირდება postId / commentId'],
  ['კლუბები', '/groups', 'კლუბების სია'], ['კონკრეტული კლუბი', '/groups/{groupId}', 'სჭირდება groupId'],
  ['მომხმარებლის პროფილი', '/profile/{userId}', 'სჭირდება userId'], ['ჩატები', '/chats', 'ჩატების სია'],
  ['საპორტის ჩატი', '/support-chat/conversation', 'Support conversation'], ['ჯავშნები', '/bookings', 'ჯავშნების სია'],
  ['ნაწილების მოთხოვნები', '/parts-requests', 'ნაწილების მოთხოვნები'], ['სპეციალური საწვავის შეთავაზება', '/exclusive-fuel-offer', 'Marte fuel offer'],
] as const;

const ROLES = [['user', 'ჩვეულებრივი მომხმარებლები'], ['partner', 'პარტნიორები'], ['owner', 'ავტომობილის მფლობელები'], ['admin', 'ადმინები']] as const;

export default function MobileScreensPage() {
  const [query, setQuery] = useState('');
  const [screen, setScreen] = useState('/');
  const [customRoute, setCustomRoute] = useState('');
  const [params, setParams] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('active');
  const [role, setRole] = useState('user');
  const [userIds, setUserIds] = useState('');
  const [excludePremium, setExcludePremium] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; message?: string } | null>(null);

  const rows = useMemo(() => MOBILE_SCREENS.filter(([label, route, note]) => `${label} ${route} ${note}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selectedRoute = customRoute.trim() || screen;
  const selectedScreen = MOBILE_SCREENS.find(([, route]) => route === screen);

  const sendPush = async () => {
    if (!title.trim() || !body.trim()) return alert('შეავსე სათაური და ტექსტი');
    if (!selectedRoute.startsWith('/')) return alert('Route უნდა იწყებოდეს / ნიშნით');

    let parsedParams: Record<string, string> = {};
    if (params.trim()) {
      try {
        const value = JSON.parse(params);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
        parsedParams = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
      } catch {
        return alert('Params უნდა იყოს სწორი JSON ობიექტი, მაგალითად: {"offerId":"123"}');
      }
    }

    const resolvedRoute = selectedRoute.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_match, key: string) => parsedParams[key] || '');
    if (resolvedRoute.includes('{') || resolvedRoute.endsWith('/')) return alert('ამ screen-ს სჭირდება შესაბამისი ID params-ში');

    const ids = userIds.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
    if (audience === 'users' && ids.length === 0) return alert('მიუთითე მინიმუმ ერთი userId');

    const data: Record<string, unknown> = { type: 'admin_message', screen: selectedScreen?.[0] || 'Custom', route: resolvedRoute, timestamp: new Date().toISOString() };
    if (Object.keys(parsedParams).length) data.params = parsedParams;
    const requestBody: Record<string, unknown> = { title: title.trim(), body: body.trim(), data, excludePremium };
    if (audience === 'active') requestBody.active = true;
    if (audience === 'all') requestBody.broadcastToAll = true;
    if (audience === 'role') { requestBody.role = role; requestBody.active = true; }
    if (audience === 'users') requestBody.userIds = ids;
    if (!confirm(`გავაგზავნო ეს შეტყობინება ${audience === 'users' ? `${ids.length} user-ზე` : 'არჩეულ აუდიტორიაზე'}?`)) return;

    setSending(true); setResult(null);
    try {
      const response = await fetch(`${API_BASE}/notifications/broadcast`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
      setResult({ sent: Number(payload.sent || 0), failed: Number(payload.failed || 0), message: payload.message });
      setTitle(''); setBody('');
    } catch (error) {
      alert(`❌ შეტყობინება ვერ გაიგზავნა: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-500">MARTE MOBILE CONTROL</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">მობაილის მართვის ცენტრი</h1><p className="mt-1 text-sm text-gray-500">აირჩიე აპის screen, დაწერე ნებისმიერი ტექსტი და საჭირო მომხმარებელზე გაუშვი.</p></div><Link href="/push-notifications" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800">Advanced Push →</Link></div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-indigo-100 px-3 py-2 text-xl">📱</span><div><h2 className="font-semibold">ეკრანზე გადასვლა + ტექსტი</h2><p className="text-xs text-gray-500">Push-ზე დაჭერისას მომხმარებელი ამ route-ზე გადავა.</p></div></div>
          <div className="space-y-5"><label className="block text-sm font-medium">რომელ screen-ზე გადავიდეს?<select value={screen} onChange={(e) => { setScreen(e.target.value); setCustomRoute(''); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">{MOBILE_SCREENS.map(([label, route]) => <option key={route} value={route}>{label} — {route}</option>)}</select></label>
            <label className="block text-sm font-medium">სხვა route <span className="font-normal text-gray-400">(თუ სიაში არ არის)</span><input value={customRoute} onChange={(e) => setCustomRoute(e.target.value)} placeholder="მაგ: /offers/123" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-mono dark:border-gray-700 dark:bg-gray-900" /></label>
            <label className="block text-sm font-medium">Route params <span className="font-normal text-gray-400">(არასავალდებულო JSON)</span><input value={params} onChange={(e) => setParams(e.target.value)} placeholder={'{"offerId":"123"}'} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-mono dark:border-gray-700 dark:bg-gray-900" /></label>
            <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium">Push სათაური<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="მაგ: ახალი შეთავაზება შენთვის" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label><label className="block text-sm font-medium">Push ტექსტი<textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="მოკლე შეტყობინება მომხმარებლისთვის" rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-900" /></label></div>
          </div></section>

        <aside className="space-y-5"><section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="font-semibold">ვის გავუგზავნოთ?</h2><div className="mt-4 grid grid-cols-2 gap-2">{([['active', 'აქტიურებს'], ['all', 'ყველას'], ['role', 'როლით'], ['users', 'კონკრეტულებს']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAudience(value)} className={`rounded-xl border px-3 py-2.5 text-xs font-medium ${audience === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700'}`}>{label}</button>)}</div>{audience === 'role' && <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}{audience === 'users' && <textarea value={userIds} onChange={(e) => setUserIds(e.target.value)} placeholder="userId-ები, გამოყავი მძიმით ან space-ით" rows={3} className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-mono dark:border-gray-700 dark:bg-gray-900" />}<label className="mt-4 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={excludePremium} onChange={(e) => setExcludePremium(e.target.checked)} /> Premium იუზერებს არ გავუგზავნოთ</label></section>
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30"><p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Preview</p><p className="mt-3 text-base font-semibold">{title || 'Push სათაური'}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body || 'Push ტექსტი აქ გამოჩნდება'}</p><div className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200">გახსნის route: <code>{selectedRoute}</code></div><button type="button" disabled={sending} onClick={sendPush} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'იგზავნება…' : '🚀 გაგზავნა'}</button>{result && <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">FCM მიიღო: {result.sent} · უარყოფილი: {result.failed}{result.message ? ` — ${result.message}` : ''}</div>}</section></aside>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold">აპის ყველა screen</h2><p className="mt-1 text-xs text-gray-500">სწრაფი არჩევა — საჭიროების შემთხვევაში custom route-იც შეგიძლია მიუთითო.</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="მოძებნე screen..." className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" /></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{rows.map(([label, route, note]) => <button key={route} type="button" onClick={() => { setScreen(route); setCustomRoute(''); }} className={`rounded-xl border p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${screen === route && !customRoute ? 'border-indigo-500 bg-indigo-50/70' : 'border-gray-200 dark:border-gray-700'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{label}</span><span className="text-indigo-500">→</span></div><code className="mt-1 block text-xs text-gray-500">{route}</code><p className="mt-1 text-[11px] text-gray-400">{note}</p></button>)}</div></section>
    </div>
  );
}
