"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type Mechanic = {
  id?: string;
  name: string;
  specialty: string;
  location?: string;
  phone?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  experience?: string;
  isAvailable?: boolean;
  avatar?: string;
  services?: string[];
  description?: string;
};

export default function MechanicDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet<Mechanic>(`/mechanics/${id}`);
        setMechanic(data || null);
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "შეცდომა დატის ჩატვირთვისას";
        setError(msg);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">მექანიკოსის დეტალები</h1>
          <p className="text-sm text-gray-500">ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="px-3 py-2 border rounded-md">უკან</button>
          <Link href="/mechanics" className="px-3 py-2 border rounded-md">სია</Link>
        </div>
      </div>

      {loading && <div className="p-4 text-gray-500">იტვირთება...</div>}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {!loading && !mechanic && (
        <div className="p-6 text-center text-gray-500 border rounded-md">ჩანაწერი ვერ მოიძებნა</div>
      )}

      {mechanic && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 border rounded-md p-4 space-y-4">
            <div className="flex items-center gap-4">
              {mechanic.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mechanic.avatar} alt={mechanic.name} className="w-20 h-20 rounded object-cover" />
              ) : (
                <div className="w-20 h-20 rounded bg-gray-200" />)
              }
              <div>
                <div className="text-lg font-semibold">{mechanic.name}</div>
                <div className="text-gray-500">{mechanic.specialty}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${mechanic.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                {mechanic.isAvailable ? "ხელმისაწვდომი" : "დაკავებული"}
              </span>
            </div>
            {mechanic.description && (
              <p className="text-sm text-gray-600">{mechanic.description}</p>
            )}
          </div>

          <div className="lg:col-span-2 border rounded-md p-4">
            <h2 className="text-lg font-medium mb-4">ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-gray-500">ლოკაცია</div>
                <div>{mechanic.location || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500">ტელეფონი</div>
                <div>{mechanic.phone || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500">მისამართი</div>
                <div>{mechanic.address || "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500">რეიტინგი</div>
                <div>{typeof mechanic.rating === "number" ? `${mechanic.rating.toFixed(1)} ⭐` : "-"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-500">გამოცდილება</div>
                <div>{mechanic.experience || "-"}</div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-gray-500">სერვისები</div>
                <div>
                  {mechanic.services?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {mechanic.services.map((s, i) => (
                        <span key={`${s}-${i}`} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


