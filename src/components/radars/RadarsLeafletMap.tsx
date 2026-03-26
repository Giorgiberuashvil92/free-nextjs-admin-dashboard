"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RadarRow = {
  _id?: string;
  id?: string;
  latitude: number;
  longitude: number;
  type?: string;
  speedLimit?: number;
  fineCount?: number;
  isActive?: boolean;
  address?: string;
  description?: string;
  source?: string;
};

/** Leaflet default icon — webpack/next-ში ხშირად ირღვევა */
function fixLeafletIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const b = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const typeColor: Record<string, string> = {
  fixed: "#2563eb",
  mobile: "#f59e0b",
  average_speed: "#8b5cf6",
};

function RadarLeafletMapInner({ radars }: { radars: RadarRow[] }) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const valid = useMemo(
    () =>
      radars.filter(
        (r) =>
          typeof r.latitude === "number" &&
          typeof r.longitude === "number" &&
          !Number.isNaN(r.latitude) &&
          !Number.isNaN(r.longitude)
      ),
    [radars]
  );

  const points = useMemo(
    () => valid.map((r) => [r.latitude, r.longitude] as [number, number]),
    [valid]
  );

  const center: [number, number] =
    points.length > 0 ? points[0]! : [41.7151, 44.8271];

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 11 : 8}
      className="h-[min(420px,50vh)] w-full rounded-lg z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 0 ? <FitBounds points={points} /> : null}
      {valid.slice(0, 1500).map((r, i) => {
        const key = String(r._id || r.id || `${r.latitude}-${r.longitude}-${i}`);
        const color = typeColor[r.type || ""] || "#64748b";
        return (
          <CircleMarker
            key={key}
            center={[r.latitude, r.longitude]}
            radius={6}
            pathOptions={{ color: "#fff", weight: 1, fillColor: color, fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[200px]">
                <div>
                  <strong>ტიპი:</strong> {r.type || "—"}
                </div>
                {r.speedLimit != null ? (
                  <div>
                    <strong>ლიმიტი:</strong> {r.speedLimit} კმ/სთ
                  </div>
                ) : null}
                {r.fineCount != null ? (
                  <div>
                    <strong>ჯარიმები:</strong> {r.fineCount}
                  </div>
                ) : null}
                {r.address ? (
                  <div>
                    <strong>მისამართი:</strong> {r.address}
                  </div>
                ) : null}
                {r.source ? (
                  <div className="text-gray-500 text-xs">წყარო: {r.source}</div>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default function RadarsLeafletMap({ radars }: { radars: RadarRow[] }) {
  return <RadarLeafletMapInner radars={radars} />;
}
