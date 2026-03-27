"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

interface MapPoint {
  lat: number;
  lng: number;
  species: string;
  created_at: string;
  photo_url: string;
}

interface Props {
  points: MapPoint[];
}

const greenIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

export function ReportsMap({ points }: Props) {
  return (
    <div className="h-[400px] w-full overflow-hidden rounded-b-xl">
      <MapContainer
        center={[52.0, 19.0]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="z-0 size-full rounded-b-xl outline-none"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {points.map((point) => (
          <Marker
            key={`${point.lat},${point.lng},${point.created_at}`}
            position={[point.lat, point.lng]}
            icon={greenIcon}
          >
            <Popup>
              <div className="text-sm font-sans p-2 min-w-[160px]">
                <p className="font-semibold">{point.species}</p>
                <p className="text-xs text-gray-500">
                  {new Date(point.created_at).toLocaleDateString()}
                </p>
                {point.photo_url && (
                  <a
                    href={point.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 underline mt-1 block"
                  >
                    View photo
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
