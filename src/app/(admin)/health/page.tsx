import { apiGet, API_BASE } from "@/lib/api";

type HealthResult = {
  ok: boolean;
  endpoint: string;
  message?: string;
  latencyMs?: number;
};

async function checkEndpoint(path: string): Promise<HealthResult> {
  const start = Date.now();
  try {
    await apiGet(path);
    return { ok: true, endpoint: path, latencyMs: Date.now() - start };
  } catch (e: unknown) {
    const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
    return { ok: false, endpoint: path, message, latencyMs: Date.now() - start };
  }
}

export default async function HealthPage() {
  const checks = await Promise.all([
    checkEndpoint("/services/recent?limit=1"),
    checkEndpoint("/services/popular?limit=1"),
    checkEndpoint("/carwash/locations?limit=1"),
  ]);

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Backend Health</h1>
        <p className="text-sm text-gray-500">Base: {API_BASE}</p>
      </div>

      <div className={`rounded p-4 ${allOk ? "bg-green-50" : "bg-red-50"}`}>
        <div className="font-medium">Status: {allOk ? "Healthy" : "Issues detected"}</div>
        <div className="text-sm text-gray-600">{new Date().toLocaleString()}</div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Endpoint</th>
              <th className="px-3 py-2 text-left">OK</th>
              <th className="px-3 py-2 text-left">Latency</th>
              <th className="px-3 py-2 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.endpoint} className="border-t">
                <td className="px-3 py-2 font-mono">{c.endpoint}</td>
                <td className="px-3 py-2">{c.ok ? "✅" : "❌"}</td>
                <td className="px-3 py-2">{c.latencyMs} ms</td>
                <td className="px-3 py-2 text-gray-600">{c.message || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


