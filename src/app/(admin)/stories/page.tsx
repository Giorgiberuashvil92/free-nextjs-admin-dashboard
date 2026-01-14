"use client";
import { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiDelete, API_BASE } from "@/lib/api";

type StoryViewer = {
  userId?: string;
  userName?: string;
  userPhone?: string;
  viewedAt?: number;
};

type Story = { 
  id: string; 
  authorId?: string; 
  authorName?: string; 
  authorAvatar?: string;
  internalImage?: string;
  category?: string; 
  highlight?: boolean; 
  createdAt?: number; 
  viewsCount?: number;
};

export default function AdminStoriesPage() {
  const [rows, setRows] = useState<Story[]>([]);
  const [category, setCategory] = useState("");
  const [highlight, setHighlight] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [viewersMap, setViewersMap] = useState<Record<string, StoryViewer[]>>({});
  const [loadingViewers, setLoadingViewers] = useState<Record<string, boolean>>({});
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (highlight) params.set("highlight", highlight);
      const res = await apiGetJson<{ success: boolean; data: Story[] } | Story[]>(`/stories${params.toString() ? `?${params.toString()}` : ""}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      setRows(data as Story[]);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Request failed';
      setErr(message);
      setRows([]);
    } finally { setLoading(false); }
  }, [category, highlight]);

  const loadUserInfo = useCallback(async (userId: string): Promise<{ name: string; phone?: string } | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, { 
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) return null;
      const json = await res.json();
      const user = json?.data || json;
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone || userId;
      return { name, phone: user.phone };
    } catch (e) {
      console.error(`Error loading user ${userId}:`, e);
      return null;
    }
  }, []);

  const loadViewers = useCallback(async (storyId: string) => {
    if (loadingViewers[storyId] || viewersMap[storyId]) return;
    
    setLoadingViewers(prev => ({ ...prev, [storyId]: true }));
    try {
      // ვცდით სხვადასხვა endpoint-ებს
      const endpoints = [
        `/stories/${storyId}/views`,
        `/stories/${storyId}/viewers`,
        `/story-views/${storyId}`,
      ];
      
      let viewers: StoryViewer[] = [];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            viewers = Array.isArray(data) ? data : (data.data || data.viewers || []);
            if (viewers.length > 0) break;
          }
        } catch (e) {
          // გავაგრძელოთ შემდეგ endpoint-ზე
        }
      }
      
      // თუ viewers-ში არის userId-ები მაგრამ არ არის სახელები, ვიპოვოთ იუზერების ინფორმაცია
      const viewersWithUserInfo = await Promise.all(
        viewers.map(async (viewer) => {
          // თუ userId არის მაგრამ userName არ არის, ვიპოვოთ იუზერის ინფორმაცია
          if (viewer.userId && !viewer.userName) {
            const userInfo = await loadUserInfo(viewer.userId);
            if (userInfo) {
              return {
                ...viewer,
                userName: userInfo.name,
                userPhone: userInfo.phone || viewer.userPhone,
              };
            }
          }
          return viewer;
        })
      );
      
      setViewersMap(prev => ({ ...prev, [storyId]: viewersWithUserInfo }));
    } catch (e) {
      console.error("Error loading viewers:", e);
      setViewersMap(prev => ({ ...prev, [storyId]: [] }));
    } finally {
      setLoadingViewers(prev => ({ ...prev, [storyId]: false }));
    }
  }, [loadingViewers, viewersMap, loadUserInfo]);

  const handleDelete = async (id: string) => {
    if (!confirm(`დარწმუნებული ხართ რომ გსურთ ამ სთორის წაშლა? (ID: ${id})`)) return;
    try {
      await apiDelete(`/stories/${id}`);
      await load(); // refresh list
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Delete failed';
      alert(`წაშლა ვერ მოხერხდა: ${message}`);
    }
  };

  const toggleViewers = (storyId: string) => {
    if (expandedStory === storyId) {
      setExpandedStory(null);
    } else {
      setExpandedStory(storyId);
      if (!viewersMap[storyId]) {
        loadViewers(storyId);
      }
    }
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">სთორები</h1>
        <p className="text-sm text-gray-500">სთორების მართვა და ნახვების სტატისტიკა</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-sm text-gray-600">კატეგორია</div>
          <select className="border rounded px-3 py-2" value={category} onChange={(e)=>setCategory(e.target.value)}>
            <option value="">ყველა</option>
            <option value="my-car">my-car</option>
            <option value="friends">friends</option>
            <option value="services">services</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Highlight</div>
          <select className="border rounded px-3 py-2" value={highlight} onChange={(e)=>setHighlight(e.target.value)}>
            <option value="">ყველა</option>
            <option value="true">მხოლოდ highlights</option>
            <option value="false">არა highlights</option>
          </select>
        </div>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={load} disabled={loading}>გამოყენება</button>
        <a className="px-3 py-2 border rounded" href="/stories/new">ახალი სთორი</a>
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">იტვირთება...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-10">სთორები არ არის</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((s) => {
            const storyImage = s.internalImage || s.authorAvatar;
            const viewers = viewersMap[s.id] || [];
            const isExpanded = expandedStory === s.id;
            
            return (
              <div key={s.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Image Section */}
                <div className="relative h-48 bg-gray-100">
                  {storyImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={storyImage} 
                      alt={s.authorName || "Story"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {s.highlight && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded font-semibold">
                      ⭐ Highlight
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold truncate">{s.authorName || s.authorId || 'უცნობი'}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {s.category || '—'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: <a className="text-blue-600 underline" href={`/stories/${s.id}`} target="_blank" rel="noopener noreferrer">{s.id.slice(0, 8)}...</a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">ნახვები:</span>
                      <span className="font-semibold">{s.viewsCount ?? 0}</span>
                    </div>
                    {s.createdAt && (
                      <div className="text-xs text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString('ka-GE')}
                      </div>
                    )}
                  </div>

                  {/* Viewers Section */}
                  <div className="border-t pt-3">
                    <button
                      onClick={() => toggleViewers(s.id)}
                      className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-black transition-colors"
                    >
                      <span className="font-medium">
                        {isExpanded ? 'დამალვა' : 'ნახვა'} - რომელმა იუზერებმა ნახეს
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {loadingViewers[s.id] ? (
                          <div className="text-sm text-gray-500 text-center py-2">იტვირთება...</div>
                        ) : viewers.length === 0 ? (
                          <div className="text-sm text-gray-500 text-center py-2">
                            ნახვების ინფორმაცია არ არის ან ჯერ არავინ უნახავს
                          </div>
                        ) : (
                          viewers.map((viewer, idx) => {
                            const displayName = viewer.userName || viewer.userPhone || viewer.userId || 'უცნობი იუზერი';
                            const showPhone = viewer.userPhone && viewer.userPhone !== viewer.userName && viewer.userPhone !== viewer.userId;
                            const showUserId = viewer.userId && !viewer.userName && !viewer.userPhone;
                            
                            return (
                              <div key={idx} className="text-xs bg-gray-50 p-2 rounded border">
                                <div className="font-medium">
                                  {displayName}
                                </div>
                                {showPhone && (
                                  <div className="text-gray-600 mt-0.5">ტელ: {viewer.userPhone}</div>
                                )}
                                {showUserId && viewer.userId && (
                                  <div className="text-gray-500 mt-0.5 text-[10px]">ID: {viewer.userId}</div>
                                )}
                                {viewer.viewedAt && (
                                  <div className="text-gray-500 mt-1 text-[10px]">
                                    {new Date(viewer.viewedAt).toLocaleString('ka-GE')}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <a 
                      className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" 
                      href={`/stories/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      გახსნა
                    </a>
                  <button
                    onClick={() => handleDelete(s.id)}
                      className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
                  >
                      წაშლა
                  </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
}


