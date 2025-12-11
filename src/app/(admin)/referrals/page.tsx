"use client";
import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function ReferralsAdminPage() {
  const [userId, setUserId] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string>("");

  const run = async (fn: () => Promise<unknown>) => {
    setResult("...");
    try {
      const data = await fn();
      setResult(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setResult(message || "error");
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Referrals</h1>
        <p className="text-sm text-gray-500">Manage referral codes and rewards</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-md p-4 space-y-3">
          <h2 className="font-medium">Get referral code</h2>
          <input className="w-full border rounded px-3 py-2" placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={() => run(() => apiGet(`/loyalty/referral/code?userId=${encodeURIComponent(userId)}`))}>Get code</button>
        </div>

        <div className="border rounded-md p-4 space-y-3">
          <h2 className="font-medium">Apply referral</h2>
          <input className="w-full border rounded px-3 py-2" placeholder="inviteeId" value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={() => run(() => apiPost(`/loyalty/referral/apply`, { inviteeId, code }))}>Apply</button>
        </div>

        <div className="border rounded-md p-4 space-y-3">
          <h2 className="font-medium">Mark subscription enabled</h2>
          <input className="w-full border rounded px-3 py-2" placeholder="userId (invitee)" value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={() => run(() => apiPost(`/loyalty/referral/subscription-enabled`, { userId: inviteeId }))}>Mark</button>
        </div>

        <div className="border rounded-md p-4 space-y-3">
          <h2 className="font-medium">Trigger first booking rewards</h2>
          <input className="w-full border rounded px-3 py-2" placeholder="userId (invitee)" value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={() => run(() => apiPost(`/loyalty/referral/first-booking`, { userId: inviteeId }))}>Trigger</button>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Result</h3>
        <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto min-h-[120px]">{result}</pre>
      </div>
    </div>
  );
}


