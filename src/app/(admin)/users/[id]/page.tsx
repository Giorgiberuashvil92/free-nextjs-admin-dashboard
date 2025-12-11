"use client";
import { useCallback, useEffect, useState } from "react";
import { apiGetJson, apiPut } from "@/lib/api";

type User = {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
  ownedCarwashes?: string[];
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const userId = params.id;
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<
    | "profile"
    | "loyalty"
    | "notifications"
    | "payments"
    | "cars"
    | "carwash-bookings"
    | "carwash-locations"
    | "community-posts"
  >("profile");

  const load = useCallback(async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await apiGetJson<{ success: boolean; data: User }>(`/users/${encodeURIComponent(userId)}`);
      setUser(res.data); setRole(res.data.role); setIsActive(res.data.isActive);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const saveRole = async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await apiPut<{ data: User }>(`/users/${encodeURIComponent(userId)}/role`, { role });
      setUser(res.data); setMsg("Role updated");
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to update role");
    }
    finally { setLoading(false); }
  };

  const saveActive = async () => {
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await apiPut<{ data: User }>(`/users/${encodeURIComponent(userId)}/active`, { isActive });
      setUser(res.data); setMsg("Active status updated");
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message || "Failed to update active");
    }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">User: {userId}</h1>
        {msg && <div className="text-green-700 text-sm">{msg}</div>}
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="border-b">
        <div className="flex gap-4 text-sm flex-wrap">
          {(["profile","loyalty","notifications","payments","cars","carwash-bookings","carwash-locations","community-posts"] as const).map((t)=>(
            <button key={t} className={`px-3 py-2 ${tab===t? 'border-b-2 border-black font-medium':'text-gray-600'}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {user && tab==="profile" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 border rounded p-4">
            <div className="text-sm text-gray-600">Phone</div>
            <div className="font-medium">{user.phone}</div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium">{user.email || '-'}</div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}</div>
            <div className="text-sm text-gray-600">Created</div>
            <div className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</div>
            <div className="text-sm text-gray-600">Updated</div>
            <div className="font-medium">{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}</div>
          </div>

          <div className="space-y-6 border rounded p-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Role</div>
              <div className="flex items-center gap-2">
                <select className="border rounded px-3 py-2" value={role} onChange={(e)=>setRole(e.target.value)}>
                  <option value="customer">customer</option>
                  <option value="owner">owner</option>
                  <option value="manager">manager</option>
                  <option value="employee">employee</option>
                  <option value="user">user</option>
                </select>
                <button className="px-3 py-2 bg-black text-white rounded" onClick={saveRole} disabled={loading}>Save</button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600">Active</div>
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={isActive} onChange={(e)=>setIsActive(e.target.checked)} />
                <label htmlFor="active">User is active</label>
                <button className="px-3 py-2 bg-black text-white rounded" onClick={saveActive} disabled={loading}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="loyalty" && (
        <LoyaltyPanel userId={userId} />
      )}

      {tab==="notifications" && (
        <NotificationsPanel userId={userId} />
      )}

      {tab==="payments" && (
        <PaymentsPanel userId={userId} />
      )}

      {tab==="cars" && (
        <CarsPanel userId={userId} />
      )}

      {tab==="carwash-bookings" && (
        <CarwashBookingsPanel userId={userId} />
      )}

      {tab==="carwash-locations" && (
        <CarwashLocationsPanel ownerId={userId} locationIds={user?.ownedCarwashes as string[] | undefined} />
      )}

      {tab==="community-posts" && (
        <CommunityPostsPanel userId={userId} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      {children}
    </div>
  );
}

function FriendlyError({ message }: { message: string }) {
  return <div className="text-sm text-red-600">{message}</div>;
}

function LoadingRow() {
  return (
    <tr>
      <td className="px-3 py-8 text-center text-gray-500" colSpan={8}>Loading...</td>
    </tr>
  );
}

function EmptyRow({ colSpan = 8, text = 'No data' }: { colSpan?: number; text?: string }) {
  return (
    <tr>
      <td className="px-3 py-8 text-center text-gray-500" colSpan={colSpan}>{text}</td>
    </tr>
  );
}

function LoyaltyPanel({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<{ points: number; tier: string; nextTierPoints: number; streakDays: number } | null>(null);
  const [tx, setTx] = useState<Array<{ id: string; type: string; amount: number; description: string; date: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const s = await apiGetJson<
          | { success?: boolean; data?: { points: number; tier: string; nextTierPoints: number; streakDays: number } }
          | { points: number; tier: string; nextTierPoints: number; streakDays: number }
        >(`/loyalty/summary?userId=${encodeURIComponent(userId)}`);
        const t = await apiGetJson<
          | { success?: boolean; data?: Array<{ id: string; type: string; amount: number; description: string; date: string }> }
          | Array<{ id: string; type: string; amount: number; description: string; date: string }>
        >(`/loyalty/transactions?userId=${encodeURIComponent(userId)}&limit=20`);

        const summaryData = (typeof s === 'object' && s !== null && 'data' in s)
          ? (s as { data?: { points: number; tier: string; nextTierPoints: number; streakDays: number } }).data
          : (s as { points: number; tier: string; nextTierPoints: number; streakDays: number });

        const txData = (typeof t === 'object' && t !== null && 'data' in t)
          ? (t as { data?: Array<{ id: string; type: string; amount: number; description: string; date: string }> }).data
          : (t as Array<{ id: string; type: string; amount: number; description: string; date: string }>);

        if (summaryData) setSummary(summaryData);
        setTx(txData || []);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className="space-y-6">
      <Section title="Loyalty summary">
        {!summary && loading && <div className="text-sm text-gray-500">Loading...</div>}
        {err && <FriendlyError message={err} />}
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
      </Section>

      <Section title="Transactions">
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
              {loading && <LoadingRow />}
              {!loading && tx.length === 0 && <EmptyRow colSpan={4} text="No transactions" />}
              {tx.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className={`px-3 py-2 text-right ${r.type==='spent'?'text-red-600':'text-green-700'}`}>{r.type==='spent'?'-':'+'}{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function NotificationsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; type?: string; title?: string; deliveredAt?: number; readAt?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await apiGetJson<
          | { success?: boolean; data?: Array<{ id: string; type?: string; title?: string; deliveredAt?: number; readAt?: number }> }
          | Array<{ id: string; type?: string; title?: string; deliveredAt?: number; readAt?: number }>
        >(`/notifications/user/${encodeURIComponent(userId)}`);
        const data = (typeof res === 'object' && res !== null && 'data' in res)
          ? (res as { data?: Array<{ id: string; type?: string; title?: string; deliveredAt?: number; readAt?: number }> }).data
          : (res as Array<{ id: string; type?: string; title?: string; deliveredAt?: number; readAt?: number }>);
        setRows(data || []);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <Section title="Notifications">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Delivered</th>
              <th className="px-3 py-2 text-left">Read</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={5} text="No notifications" />}
            {rows.map((n)=> (
              <tr key={n.id} className="border-t">
                <td className="px-3 py-2">{n.id}</td>
                <td className="px-3 py-2">{n.type || '-'}</td>
                <td className="px-3 py-2">{n.title || '-'}</td>
                <td className="px-3 py-2">{n.deliveredAt ? new Date(n.deliveredAt).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">{n.readAt ? new Date(n.readAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function PaymentsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; amount?: number; currency?: string; status?: string; createdAt?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await apiGetJson<
          | { success?: boolean; data?: Array<{ id: string; amount?: number; currency?: string; status?: string; createdAt?: number }> }
          | Array<{ id: string; amount?: number; currency?: string; status?: string; createdAt?: number }>
        >(`/api/payments/user/${encodeURIComponent(userId)}`);
        const data = (typeof res === 'object' && res !== null && 'data' in res)
          ? (res as { data?: Array<{ id: string; amount?: number; currency?: string; status?: string; createdAt?: number }> }).data
          : (res as Array<{ id: string; amount?: number; currency?: string; status?: string; createdAt?: number }>);
        setRows(data || []);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <Section title="Payments">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Currency</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={5} text="No payments" />}
            {rows.map((p)=> (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.amount ?? '-'}</td>
                <td className="px-3 py-2">{p.currency ?? '-'}</td>
                <td className="px-3 py-2">{p.status ?? '-'}</td>
                <td className="px-3 py-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CarsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id?: string; make?: string; model?: string; year?: string | number; licensePlate?: string; color?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // Use official endpoint
        const res = await apiGetJson<unknown>(`/garage/cars?userId=${encodeURIComponent(userId)}`);
        const data = Array.isArray(res) ? res : (res as { data?: unknown[] } | null)?.data || [];
        const mapped = (data as unknown[]).map((c) => {
          const car = c as { id?: string; _id?: string; make?: string; model?: string; year?: string | number; licensePlate?: string; color?: string; plate?: string; vin?: string };
          return {
            id: car.id || car._id,
            make: car.make,
            model: car.model,
            year: car.year,
            licensePlate: car.licensePlate || car.plate,
            color: car.color,
          };
        });
        setRows(mapped);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally { setLoading(false); }
    })();
  }, [userId]);

  return (
    <Section title="Cars">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Make</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-left">Plate</th>
              <th className="px-3 py-2 text-left">Color</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={6} text="No cars" />}
            {rows.map((c, idx)=> (
              <tr key={c.id || `${c.make}-${c.model}-${c.year}-${idx}`} className="border-t">
                <td className="px-3 py-2">{c.id || '-'}</td>
                <td className="px-3 py-2">{c.make || '-'}</td>
                <td className="px-3 py-2">{c.model || '-'}</td>
                <td className="px-3 py-2">{c.year ?? '-'}</td>
                <td className="px-3 py-2">{c.licensePlate || '-'}</td>
                <td className="px-3 py-2">{c.color || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CarwashBookingsPanel({ userId }: { userId: string }) {
  type Booking = {
    id?: string;
    locationId?: string;
    locationName?: string;
    locationAddress?: string;
    serviceId?: string;
    serviceName?: string;
    servicePrice?: number;
    bookingDate?: number; // epoch ms
    bookingTime?: string;
    status?: string;
    carInfo?: { make?: string; model?: string; year?: string | number; licensePlate?: string; color?: string };
    customerInfo?: { name?: string; phone?: string; email?: string };
    createdAt?: string;
  };
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await apiGetJson<unknown>(`/carwash/bookings?userId=${encodeURIComponent(userId)}`);
        const data = Array.isArray(res) ? res : (res as { data?: unknown[] } | null)?.data || [];
        const mapped = (data as unknown[]).map((b) => {
          const bk = b as {
            id?: string; _id?: string; locationId?: string; locationName?: string; locationAddress?: string;
            serviceId?: string; serviceName?: string; servicePrice?: number; bookingDate?: number; bookingTime?: string;
            status?: string; carInfo?: { make?: string; model?: string; year?: string | number; licensePlate?: string; color?: string };
            customerInfo?: { name?: string; phone?: string; email?: string }; createdAt?: string;
          };
          return {
            id: bk.id || bk._id,
            locationId: bk.locationId,
            locationName: bk.locationName,
            locationAddress: bk.locationAddress,
            serviceId: bk.serviceId,
            serviceName: bk.serviceName,
            servicePrice: bk.servicePrice,
            bookingDate: bk.bookingDate,
            bookingTime: bk.bookingTime,
            status: bk.status,
            carInfo: bk.carInfo,
            customerInfo: bk.customerInfo,
            createdAt: bk.createdAt,
          } as Booking;
        });
        setRows(mapped as Booking[]);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally { setLoading(false); }
    })();
  }, [userId]);

  return (
    <Section title="Carwash bookings">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Booking</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Service</th>
              <th className="px-3 py-2 text-left">Car</th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={6} text="No bookings" />}
            {rows.map((b)=> (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{b.id}</div>
                    <div className="text-xs text-gray-600">
                      {b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : '-'} • {b.bookingTime || '-'}
                    </div>
                    <div className="text-xs text-gray-500">Created: {b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{b.locationName || '-'}</div>
                    <div className="text-xs text-gray-600">{b.locationAddress || '-'}</div>
                    <div className="text-xs text-gray-500">ID: {b.locationId || '-'}</div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{b.serviceName || '-'}</div>
                    <div className="text-xs text-gray-600">Service ID: {b.serviceId || '-'}</div>
                    <div className="text-xs text-gray-500">Price: {typeof b.servicePrice==='number' ? `${b.servicePrice}` : '-'}</div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{[b?.carInfo?.make, b?.carInfo?.model].filter(Boolean).join(' ') || '-'}</div>
                    <div className="text-xs text-gray-600">Year: {b?.carInfo?.year || '-'}</div>
                    <div className="text-xs text-gray-500">Plate: {b?.carInfo?.licensePlate || '-'}</div>
                    <div className="text-xs text-gray-500">Color: {b?.carInfo?.color || '-'}</div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{b?.customerInfo?.name || '-'}</div>
                    <div className="text-xs text-gray-600">{b?.customerInfo?.phone || '-'}</div>
                    <div className="text-xs text-gray-500">{b?.customerInfo?.email || '-'}</div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {b.status || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CarwashLocationsPanel({ ownerId, locationIds }: { ownerId: string; locationIds?: string[] }) {
  const [rows, setRows] = useState<Array<{ id?: string; name?: string; ownerId?: string; isOpen?: boolean; address?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        let mapped: Array<{ id?: string; name?: string; ownerId?: string; isOpen?: boolean; address?: string }> = [];
        if (locationIds && locationIds.length > 0) {
          const results = await Promise.all(
            locationIds.map(async (lid) => {
              try {
                const r = await apiGetJson<unknown>(`/carwash/locations/${encodeURIComponent(lid)}`);
                const obj = (typeof r === 'object' && r !== null && 'data' in (r as object)) ? (r as { data?: unknown }).data : r;
                const loc = obj as { id?: string; _id?: string; name?: string; ownerId?: string; isOpen?: boolean; address?: string };
                return { id: loc.id || loc._id, name: loc.name, ownerId: loc.ownerId, isOpen: loc.isOpen, address: (loc as { address?: string })?.address };
              } catch {
                return { id: lid, name: '(not found)', ownerId: ownerId, isOpen: false };
              }
            })
          );
          mapped = results;
        } else {
          // Fallback by ownerId
          const res = await apiGetJson<unknown>(`/carwash/locations/owner/${encodeURIComponent(ownerId)}`);
          const data = Array.isArray(res) ? res : (res as { data?: unknown[] } | null)?.data || [];
          mapped = (data as unknown[]).map((l) => {
            const loc = l as { id?: string; _id?: string; name?: string; ownerId?: string; isOpen?: boolean; address?: string };
            return { id: loc.id || loc._id, name: loc.name, ownerId: loc.ownerId, isOpen: loc.isOpen, address: loc.address };
          });
        }
        setRows(mapped);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally { setLoading(false); }
    })();
  }, [ownerId, locationIds]);

  return (
    <Section title="Owned carwash locations">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Open</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={4} text="No locations" />}
            {rows.map((l)=> (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{l.id}</td>
                <td className="px-3 py-2">{l.name || '-'}</td>
                <td className="px-3 py-2">{l.address || '-'}</td>
                <td className="px-3 py-2">{l.isOpen ? 'Open' : 'Closed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function CommunityPostsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; postText?: string; createdAt?: number; likesCount?: number; commentsCount?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // Backend არ აქვს ფილტრი userId-ზე; ვიღებთ ყველაფერს და ვფილტრავთ client-ზე
        const res = await apiGetJson<unknown>('/community/posts');
        const data = Array.isArray(res) ? res : (res as { data?: unknown[] } | null)?.data || [];
        const filtered = (data as unknown[]).filter((p) => (p as { userId?: string }).userId === userId);
        const mapped = filtered.map((p) => {
          const post = p as { id: string; postText?: string; createdAt?: number; likesCount?: number; commentsCount?: number };
          return { id: post.id, postText: post.postText, createdAt: post.createdAt, likesCount: post.likesCount, commentsCount: post.commentsCount };
        });
        setRows(mapped);
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
        setErr(message);
      } finally { setLoading(false); }
    })();
  }, [userId]);

  return (
    <Section title="Community posts">
      {err && <FriendlyError message={err} />}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Post ID</th>
              <th className="px-3 py-2 text-left">Text</th>
              <th className="px-3 py-2 text-left">Likes</th>
              <th className="px-3 py-2 text-left">Comments</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && rows.length===0 && <EmptyRow colSpan={5} text="No posts" />}
            {rows.map((p)=> (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2 max-w-[400px] truncate" title={p.postText || ''}>{p.postText || '-'}</td>
                <td className="px-3 py-2">{p.likesCount ?? 0}</td>
                <td className="px-3 py-2">{p.commentsCount ?? 0}</td>
                <td className="px-3 py-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}


