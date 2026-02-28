"use client";
import { useEffect } from "react";
import Link from "next/link";

// Only import Leaflet on client side
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMapEvents: any, L: any;

if (typeof window !== "undefined") {
  // Dynamic import for Leaflet on client side only
  const leafletModule = require("react-leaflet");
  const leafletL = require("leaflet");
  require("leaflet/dist/leaflet.css");
  
  MapContainer = leafletModule.MapContainer;
  TileLayer = leafletModule.TileLayer;
  Marker = leafletModule.Marker;
  Popup = leafletModule.Popup;
  useMapEvents = leafletModule.useMapEvents;
  L = leafletL;
  
  // Fix for default marker icons in Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Map click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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

type LeafletMapProps = {
  center: [number, number];
  zoom: number;
  radars: Radar[];
  onMapClick: (lat: number, lng: number) => void;
  getMarkerIcon: (type: string, isActive: boolean) => any;
  getRadarTypeName: (type: string) => string;
};

export default function LeafletMapComponent({
  center,
  zoom,
  radars,
  onMapClick,
  getMarkerIcon,
  getRadarTypeName,
}: LeafletMapProps) {
  // Only render on client side
  if (typeof window === "undefined" || !MapContainer) {
    return <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">რუკა იტვირთება...</div>;
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {radars.map((radar) => {
        const icon = getMarkerIcon(radar.type, radar.isActive);
        return (
        <Marker
          key={radar.id || radar._id}
          position={[radar.latitude, radar.longitude]}
          icon={icon}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{getRadarTypeName(radar.type)}</h3>
              {radar.address && <p className="text-sm text-gray-600">{radar.address}</p>}
              {radar.speedLimit && (
                <p className="text-sm">სიჩქარის ლიმიტი: {radar.speedLimit} კმ/სთ</p>
              )}
              <p className="text-xs text-gray-500">
                {radar.latitude.toFixed(6)}, {radar.longitude.toFixed(6)}
              </p>
              <div className="mt-2 flex gap-2">
                <Link
                  href={`/radars/${radar.id || radar._id}/edit`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ✏️ რედაქტირება
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
        );
      })}
    </MapContainer>
  );
}
