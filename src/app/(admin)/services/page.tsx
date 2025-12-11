import { apiGet } from "@/lib/api";

type ServiceItem = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  location?: string;
  price?: string | number;
  rating?: number;
  reviews?: number;
  createdAt?: string;
};

export default async function ServicesAdminPage() {
  const services = (await apiGet<ServiceItem[]>(
    "/services/all?sortBy=date&order=desc&limit=50"
  )) || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Services</h1>
        <p className="text-sm text-gray-500">Unified services listing from backend</p>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Rating</th>
              <th className="px-3 py-2 text-left">Reviews</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-top">
                <td className="px-3 py-2 font-medium">{s.title}</td>
                <td className="px-3 py-2">{s.type || "-"}</td>
                <td className="px-3 py-2">{s.location || "-"}</td>
                <td className="px-3 py-2">{s.rating ?? "-"}</td>
                <td className="px-3 py-2">{s.reviews ?? "-"}</td>
                <td className="px-3 py-2">{s.price ?? "-"}</td>
                <td className="px-3 py-2">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
                  No services
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


