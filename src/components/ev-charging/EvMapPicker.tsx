"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

type EvMapPickerProps = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number) => void;
  heightClass?: string;
};

export default function EvMapPicker({
  latitude,
  longitude,
  onPick,
  heightClass = "h-[280px]",
}: EvMapPickerProps) {
  const [ready, setReady] = useState(false);
  const [MapView, setMapView] = useState<React.ComponentType<{
    latitude: number;
    longitude: number;
    onPick: (lat: number, lng: number) => void;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leafletModule = await import("react-leaflet");
      const L = await import("leaflet");
      delete (L.default.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const { MapContainer, TileLayer, Marker, useMapEvents } = leafletModule;

      function ClickHandler({
        onMapClick,
      }: {
        onMapClick: (lat: number, lng: number) => void;
      }) {
        useMapEvents({
          click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
        });
        return null;
      }

      function Inner({
        latitude: lat,
        longitude: lng,
        onPick: pick,
      }: {
        latitude: number;
        longitude: number;
        onPick: (lat: number, lng: number) => void;
      }) {
        const center: [number, number] = [
          Number.isFinite(lat) ? lat : 41.7151,
          Number.isFinite(lng) ? lng : 44.8271,
        ];
        return (
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onMapClick={pick} />
            {Number.isFinite(lat) && Number.isFinite(lng) ? (
              <Marker position={[lat, lng]} />
            ) : null}
          </MapContainer>
        );
      }

      if (!cancelled) {
        setMapView(() => Inner);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !MapView) {
    return (
      <div className={`${heightClass} w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center text-sm text-gray-500`}>
        რუკა იტვირთება…
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700`}>
      <MapView latitude={latitude} longitude={longitude} onPick={onPick} />
    </div>
  );
}
