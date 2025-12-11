"use client";
import { useState } from "react";
import { apiGet } from "@/lib/api";

type Summary = { points: number; tier: string; nextTierPoints: number; streakDays: number };
type Tx = { id: string; type: "earned"|"spent"|"bonus"; amount: number; description: string; date: string; service?: string; icon: string };

export default function ClientUserLookup() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tx, setTx] = useState<Tx[]>([]);
  const [err, setErr] = useState<string>("");

  const load = async () => {
    if (!userId) return;
    setLoading(true); setErr("");
    try {
      const [s, t] = await Promise.all([
        apiGet<Summary>(`/loyalty/summary?userId=${encodeURIComponent(userId)}`),
        apiGet<Tx[]>(`/loyalty/transactions?userId=${encodeURIComponent(userId)}&limit=20`),
      ]);
      setSummary(s);
      setTx(t || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
      setSummary(null); setTx([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" placeholder="userId" value={userId} onChange={(e)=>setUserId(e.target.value)} />
        <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>{loading?"Loading...":"Load"}</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      {summary && (
        <div className="border rounded p-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Points</div>
            <div className="text-lg font-semibold">{summary.points}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Tier</div>
            <div className="text-lg font-semibold">{summary.tier}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Next Tier</div>
            <div className="text-lg font-semibold">{summary.nextTierPoints}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Streak</div>
            <div className="text-lg font-semibold">{summary.streakDays}d</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {tx.map((r)=> (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.date).toLocaleString()}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.description}</td>
                <td className="px-3 py-2 text-right {r.type==='spent'?'text-red-600':'text-green-700'}">{r.type==='spent'?'-':'+'}{r.amount}</td>
              </tr>
            ))}
            {tx.length===0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No transactions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


