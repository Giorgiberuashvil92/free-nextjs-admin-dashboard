import { apiGet } from "@/lib/api";
import ClientUserLookup from "./user-lookup";

type LeaderItem = { id: string; name: string; points: number; rank: number; isCurrentUser?: boolean };

export default async function LoyaltyAdminPage() {
  const leaderboard = (await apiGet<LeaderItem[]>(`/loyalty/leaderboard?userId=admin`)) || [];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Loyalty</h1>
        <p className="text-sm text-gray-500">Leaderboard • User summary & transactions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-medium">Leaderboard</h2>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">UserId</th>
                  <th className="px-3 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">#{u.rank}</td>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2 text-gray-500">{u.id}</td>
                    <td className="px-3 py-2 text-right font-semibold">{u.points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-medium">User lookup</h2>
          <ClientUserLookup />
        </div>
      </div>
    </div>
  );
}


