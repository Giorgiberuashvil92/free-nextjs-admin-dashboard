'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiGetJson, API_BASE } from "@/lib/api";
import ClientUserLookup from "./user-lookup";

type LeaderItem = { id: string; name: string; points: number; rank: number; isCurrentUser?: boolean };

export default function LoyaltyAdminPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { firstName?: string; lastName?: string; phone?: string }>>({});

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await apiGet<LeaderItem[]>(`/loyalty/leaderboard?userId=admin`);
        setLeaderboard(data || []);
      } catch (e) {
        console.error('Error loading leaderboard:', e);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  // ვიტვირთავთ იუზერების სახელებს users API-დან
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const uniqueUserIds = Array.from(new Set(leaderboard.map(u => u.id))).filter((id): id is string => Boolean(id));
    const missingUserIds = uniqueUserIds.filter(id => !userInfoMap[id]);

    if (missingUserIds.length > 0) {
      const batchSize = 50;
      let currentBatch = 0;

      const loadBatch = async () => {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, missingUserIds.length);
        const batch = missingUserIds.slice(start, end);

        if (batch.length === 0) return;

        const userInfoEntries: [string, { firstName?: string; lastName?: string; phone?: string }][] = [];

        const promises = batch.map(async (userId) => {
          try {
            const userRes = await apiGetJson<{ firstName?: string; lastName?: string; phone?: string } | { success: boolean; data: { firstName?: string; lastName?: string; phone?: string } }>(
              `/users/${encodeURIComponent(userId)}`
            );

            const userData = Array.isArray(userRes)
              ? userRes[0]
              : ((userRes as any).success ? (userRes as { success: boolean; data: { firstName?: string; lastName?: string; phone?: string } }).data : userRes);

            if (userData && (userData.firstName || userData.lastName || userData.phone)) {
              return [userId, {
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone
              }] as [string, { firstName?: string; lastName?: string; phone?: string }];
            }
          } catch (e) {
            console.error(`Error loading user info for ${userId}:`, e);
          }
          return null;
        });

        const results = await Promise.all(promises);
        const validEntries = results.filter((entry): entry is [string, { firstName?: string; lastName?: string; phone?: string }] => entry !== null);
        userInfoEntries.push(...validEntries);

        if (userInfoEntries.length > 0) {
          setUserInfoMap(prev => ({ ...prev, ...Object.fromEntries(userInfoEntries) }));
        }

        currentBatch++;
        if (end < missingUserIds.length) {
          setTimeout(loadBatch, 100);
        }
      };

      loadBatch();
    }
  }, [leaderboard, userInfoMap]);

  const getUserName = (userId: string, defaultName: string) => {
    const info = userInfoMap[userId];
    if (info) {
      if (info.firstName) {
        return info.lastName ? `${info.firstName} ${info.lastName}` : info.firstName;
      }
    }
    return defaultName;
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Loyalty</h1>
        <p className="text-sm text-gray-500">Leaderboard • User summary & transactions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-medium">Leaderboard</h2>
          {loading ? (
            <div className="text-center py-8">იტვირთება...</div>
          ) : (
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
                  {leaderboard.map((u) => {
                    const displayName = getUserName(u.id, u.name);
                    return (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">#{u.rank}</td>
                        <td className="px-3 py-2">{displayName}</td>
                        <td className="px-3 py-2 text-gray-500">{u.id}</td>
                        <td className="px-3 py-2 text-right font-semibold">{u.points}</td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-medium">User lookup</h2>
          <ClientUserLookup />
        </div>
      </div>
    </div>
  );
}


