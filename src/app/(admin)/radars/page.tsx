"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { apiGetJson } from "@/lib/api";
import dynamic from "next/dynamic";

// Dynamic import for Leaflet map component (client-side only)
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

type Radar = {
  _id?: string;
  id?: string;
  latitude: number;
  longitude: number;
  type: 'fixed' | 'mobile' | 'average_speed';
  direction?: string;
  speedLimit?: number;
  fineCount: number;
  lastFineDate?: string;
  description?: string;
  address?: string;
  isActive: boolean;
  source?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://marte-backend-production.up.railway.app";
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '/api/proxy' 
  : BACKEND_URL;


export default function RadarsListPage() {
  const [radars, setRadars] = useState<Radar[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'mobile' | 'average_speed'>('all');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGetJson<{ success: boolean; data: Radar[] } | Radar[]>(`/radars`);
      const data = Array.isArray(res) ? res : (res.success ? res.data : []);
      const radarsWithId = (data || []).map((r) => ({ ...r, id: r.id || r._id }));
      setRadars(radarsWithId);
    } catch (e: any) {
      console.error("Error loading radars:", e);
      // 404 შეცდომის შემთხვევაში ცარიელი სია ვაჩვენოთ
      const errorMessage = e.message || String(e);
      if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('Cannot GET')) {
        setErr("⚠️ რადარების endpoint-ი არ მოიძებნა backend-ზე. Production backend-ზე კოდი უნდა განახლდეს, რათა რადარების მოდული დარეგისტრირდეს. ახლა გვერდი მუშაობს, მაგრამ მონაცემები არ გამოჩნდება, სანამ backend-ზე endpoint-ი არ იქნება დარეგისტრირებული.");
        setRadars([]);
      } else {
        setErr(errorMessage || "შეცდომა რადარების ჩატვირთვისას");
        setRadars([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (radarId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('დარწმუნებული ხართ რომ გსურთ ამ რადარის წაშლა?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/radars/${radarId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        load(); // Reload list
      } else {
        alert('შეცდომა რადარის წაშლისას');
      }
    } catch (error) {
      console.error('Error deleting radar:', error);
      alert('შეცდომა რადარის წაშლისას');
    }
  };

  const handleToggleActive = async (radar: Radar, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(`${API_BASE}/radars/${radar.id || radar._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !radar.isActive,
        }),
      });
      if (response.ok) {
        load(); // Reload list
      } else {
        alert('შეცდომა რადარის განახლებისას');
      }
    } catch (error) {
      console.error('Error updating radar:', error);
      alert('შეცდომა რადარის განახლებისას');
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const getRadarTypeName = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'ფიქსირებული';
      case 'mobile':
        return 'მობილური';
      case 'average_speed':
        return 'საშუალო სიჩქარის';
      default:
        return type;
    }
  };

  const getRadarTypeColor = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'bg-red-500';
      case 'mobile':
        return 'bg-yellow-500';
      case 'average_speed':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredRadars = radars.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (showOnlyActive && !r.isActive) return false;
    return true;
  });

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPosition({ lat, lng });
    // Navigate to new radar page with coordinates
    window.location.href = `/radars/new?lat=${lat}&lng=${lng}`;
  }, []);

  // Calculate map center and bounds
  const mapCenter = useMemo(() => {
    if (filteredRadars.length === 0) {
      return [41.7151, 44.8271] as [number, number]; // Tbilisi default
    }
    const avgLat = filteredRadars.reduce((sum, r) => sum + r.latitude, 0) / filteredRadars.length;
    const avgLng = filteredRadars.reduce((sum, r) => sum + r.longitude, 0) / filteredRadars.length;
    return [avgLat, avgLng] as [number, number];
  }, [filteredRadars]);

  const getMarkerIcon = (type: string, isActive: boolean) => {
    if (typeof window === 'undefined') return null;
    const L = require("leaflet");
    const color = type === 'fixed' ? 'red' : type === 'mobile' ? 'yellow' : 'purple';
    const opacity = isActive ? 1 : 0.5;
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; opacity: ${opacity};"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">რადარები</h1>
          <span className="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {loading ? "იტვირთება…" : `${filteredRadars.length} რადარი`}
          </span>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-3 py-2"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">ყველა ტიპი</option>
              <option value="fixed">ფიქსირებული</option>
              <option value="mobile">მობილური</option>
              <option value="average_speed">საშუალო სიჩქარის</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyActive"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="showOnlyActive" className="text-sm text-gray-700 font-medium cursor-pointer">
              მხოლოდ აქტიური
            </label>
          </div>
          <button
            className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            onClick={load}
            disabled={loading}
          >
            🔄 განახლება
          </button>
          <Link
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors inline-block"
            href="/radars/new"
          >
            + ახალი რადარი
          </Link>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{err}</div>}

      {/* Map Section */}
      {showMap && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">რუკა</h2>
            <button
              onClick={() => setShowMap(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="h-[500px] w-full relative">
            <LeafletMap
              center={mapCenter}
              zoom={11}
              radars={filteredRadars}
              onMapClick={handleMapClick}
              getMarkerIcon={getMarkerIcon}
              getRadarTypeName={getRadarTypeName}
            />
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <p className="text-sm text-gray-600">
              💡 რუკაზე დაკლიკებით შეგიძლიათ ახალი რადარის დამატება
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>ფიქსირებული</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>მობილური</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>საშუალო სიჩქარის</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showMap && (
        <button
          onClick={() => setShowMap(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          🗺️ რუკის ჩვენება
        </button>
      )}

      {/* Radars Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ტიპი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მისამართი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  კოორდინატები
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სიჩქარის ლიმიტი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ჯარიმები
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    იტვირთება…
                  </td>
                </tr>
              ) : filteredRadars.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    რადარები არ მოიძებნა
                  </td>
                </tr>
              ) : (
                filteredRadars.map((radar) => (
                  <tr key={radar.id || radar._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getRadarTypeColor(radar.type)}`}>
                        {getRadarTypeName(radar.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{radar.address || 'მისამართი არ არის'}</div>
                      {radar.direction && (
                        <div className="text-xs text-gray-500">{radar.direction}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {radar.latitude.toFixed(6)}, {radar.longitude.toFixed(6)}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${radar.latitude},${radar.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        რუკაზე ნახვა
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {radar.speedLimit ? `${radar.speedLimit} კმ/სთ` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{radar.fineCount || 0}</div>
                      {radar.lastFineDate && (
                        <div className="text-xs text-gray-500">
                          {new Date(radar.lastFineDate).toLocaleDateString('ka-GE')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => handleToggleActive(radar, e)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          radar.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {radar.isActive ? '✓ აქტიური' : '✗ არააქტიური'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/radars/${radar.id || radar._id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ✏️ რედაქტირება
                        </Link>
                        <button
                          onClick={(e) => handleDelete(radar.id || radar._id || '', e)}
                          className="text-red-600 hover:text-red-900"
                        >
                          🗑️ წაშლა
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
