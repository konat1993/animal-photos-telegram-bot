"use client";

/// <reference types="leaflet.markercluster" />

import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/styles";
import type { MarkerCluster } from "leaflet";
import L from "leaflet";
import { Calendar, ImageIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { Button } from "@/components/ui/button";
import {
  FOCUS_REPORT_PARAM,
  PHOTO_REPORT_PARAM,
} from "@/lib/report-photo-query";
import { colorForSpecies } from "@/lib/species-color";
import { formatReportDate } from "@/lib/utils";

const FOCUS_ZOOM = 14;
/** Fly duration in seconds — higher = smoother, slower zoom-in from country view. */
const FOCUS_FLY_DURATION_SEC = 1.35;

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  species: string;
  created_at: string;
  photo_url: string;
  location_label: string | null;
}

function FlyToFocusedReport({
  focusReportId,
  points,
}: {
  focusReportId: string | null;
  points: MapPoint[];
}) {
  const map = useMap();
  /** Skips repeated flyTo for the same focus_report (e.g. new `points` reference after URL / photo_report changes). */
  const lastFlownFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusReportId) {
      lastFlownFocusIdRef.current = null;
      return;
    }

    const point = points.find((p) => p.id === focusReportId);
    if (!point) return;

    if (lastFlownFocusIdRef.current === focusReportId) return;
    lastFlownFocusIdRef.current = focusReportId;

    const target = L.latLng(point.lat, point.lng);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      map.setView(target, FOCUS_ZOOM, { animate: false });
      return;
    }

    map.flyTo(target, FOCUS_ZOOM, {
      duration: FOCUS_FLY_DURATION_SEC,
      easeLinearity: 0.28,
    });
  }, [focusReportId, points, map]);

  return null;
}

function MapPopupPhotoButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const openPhoto = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(FOCUS_REPORT_PARAM);
    params.set(PHOTO_REPORT_PARAM, reportId);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, reportId]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 w-full gap-1.5 text-xs font-medium shadow-none"
      onClick={openPhoto}
    >
      <ImageIcon className="size-3.5 opacity-80" aria-hidden />
      View photo
    </Button>
  );
}

interface Props {
  points: MapPoint[];
}

const speciesMarkerIconCache = new Map<string, L.DivIcon>();

/** Larger dot = easier click/tap (Leaflet hit testing uses icon bounds). */
const MARKER_DOT_PX = 20;
const MARKER_ANCHOR = MARKER_DOT_PX / 2;

function leafletIconForSpecies(species: string): L.DivIcon {
  let icon = speciesMarkerIconCache.get(species);
  if (!icon) {
    const c = colorForSpecies(species);
    const s = MARKER_DOT_PX;
    icon = L.divIcon({
      className: "",
      html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${c};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45)"></div>`,
      iconSize: [s, s],
      iconAnchor: [MARKER_ANCHOR, MARKER_ANCHOR],
      popupAnchor: [0, -10],
    });
    speciesMarkerIconCache.set(species, icon);
  }
  return icon;
}

/** Pixels — larger radius at low zoom (country-scale view), smaller when zoomed in. */
function maxClusterRadiusForZoom(zoom: number): number {
  if (zoom <= 5) return 100;
  if (zoom <= 7) return 85;
  if (zoom <= 9) return 70;
  if (zoom <= 11) return 55;
  if (zoom <= 13) return 42;
  return 36;
}

/** Clusters may mix species — single accent color (no multi-hue bubbles). */
function createReportClusterIcon(cluster: MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 100 ? 42 : 46;
  const font = count < 100 ? 14 : 13;
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:#16a34a;color:#fff;font-weight:700;font-size:${font}px;line-height:1;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28)">${count}</div>`;
  return L.divIcon({
    className: "report-map-cluster",
    html,
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

export function ReportsMap({ points }: Props) {
  const searchParams = useSearchParams();
  const focusReportId = searchParams.get(FOCUS_REPORT_PARAM);

  const clusterOptions = useMemo(
    () => ({
      maxClusterRadius: maxClusterRadiusForZoom,
      disableClusteringAtZoom: FOCUS_ZOOM,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      iconCreateFunction: createReportClusterIcon,
    }),
    [],
  );

  return (
    <div className="report-map-root h-[400px] w-full overflow-hidden rounded-b-xl">
      <MapContainer
        center={[52.0, 19.0]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="z-0 size-full rounded-b-xl outline-none"
      >
        <FlyToFocusedReport focusReportId={focusReportId} points={points} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MarkerClusterGroup {...clusterOptions}>
          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={leafletIconForSpecies(point.species)}
            >
              <Popup
                className="report-sighting-popup"
                minWidth={232}
                maxWidth={296}
              >
                <div className="text-popover-foreground">
                  <div className="border-border/70 border-b bg-muted/45 px-3.5 pt-3 pb-3 pr-9">
                    <p className="font-heading flex items-center gap-2 text-[0.9375rem] leading-snug font-semibold tracking-tight">
                      <span
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{
                          backgroundColor: colorForSpecies(point.species),
                        }}
                        aria-hidden
                      />
                      {point.species}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar
                        className="size-3.5 shrink-0 opacity-80"
                        aria-hidden
                      />
                      {formatReportDate(point.created_at)}
                    </p>
                    {point.location_label ? (
                      <p className="mt-2 text-xs leading-snug text-muted-foreground">
                        {point.location_label}
                      </p>
                    ) : null}
                  </div>
                  {point.photo_url ? (
                    <div className="bg-popover px-3 py-2.5">
                      <MapPopupPhotoButton reportId={point.id} />
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
