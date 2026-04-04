"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import L from "leaflet";
import type { AnalyzeResponse } from "@/app/lib/types";

const centerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const competitorIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitToBounds({
  bounds,
  fitKey,
}: {
  bounds: LatLngBoundsExpression;
  fitKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyToBounds(bounds, {
      padding: [24, 24],
      duration: 0.45,
      maxZoom: 14,
    });
  }, [fitKey, bounds, map]);

  return null;
}

type Rgb = { r: number; g: number; b: number };

const HEAT_COLOR_STOPS: Array<{ t: number; color: Rgb }> = [
  { t: 0, color: { r: 213, g: 106, b: 78 } },
  { t: 0.35, color: { r: 213, g: 178, b: 87 } },
  { t: 0.55, color: { r: 137, g: 185, b: 96 } },
  { t: 0.75, color: { r: 75, g: 162, b: 95 } },
  { t: 1, color: { r: 24, g: 131, b: 79 } },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getHeatRgb(value: number): Rgb {
  const clamped = Math.max(0, Math.min(1, value));

  for (let i = 0; i < HEAT_COLOR_STOPS.length - 1; i += 1) {
    const from = HEAT_COLOR_STOPS[i];
    const to = HEAT_COLOR_STOPS[i + 1];

    if (clamped >= from.t && clamped <= to.t) {
      const localT = (clamped - from.t) / Math.max(to.t - from.t, 1e-6);
      return {
        r: Math.round(lerp(from.color.r, to.color.r, localT)),
        g: Math.round(lerp(from.color.g, to.color.g, localT)),
        b: Math.round(lerp(from.color.b, to.color.b, localT)),
      };
    }
  }

  return HEAT_COLOR_STOPS[HEAT_COLOR_STOPS.length - 1].color;
}

function buildSmoothHeatOverlay(result: AnalyzeResponse): string | null {
  if (typeof window === "undefined") return null;

  const width = 340;
  const height = 340;
  const values = new Float32Array(width * height);

  const lonSpan = Math.max(result.bbox.east - result.bbox.west, 1e-6);
  const latSpan = Math.max(result.bbox.north - result.bbox.south, 1e-6);

  let maxValue = 0;

  for (const cell of result.opportunityGrid) {
    const x = ((cell.center.lon - result.bbox.west) / lonSpan) * (width - 1);
    const y = ((result.bbox.north - cell.center.lat) / latSpan) * (height - 1);

    const cellLonSpan = Math.max(cell.bounds.east - cell.bounds.west, lonSpan / 100);
    const cellLatSpan = Math.max(cell.bounds.north - cell.bounds.south, latSpan / 100);
    const radiusPxX = (cellLonSpan / lonSpan) * width;
    const radiusPxY = (cellLatSpan / latSpan) * height;
    const sigma = Math.max(6, ((radiusPxX + radiusPxY) / 2) * (0.95 + cell.score / 180));
    const radius = Math.ceil(sigma * 3);
    const weight = Math.max(0.05, cell.score / 100);
    const denom = 2 * sigma * sigma;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));

    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const dx = px - x;
        const dy = py - y;
        const contribution = weight * Math.exp(-(dx * dx + dy * dy) / denom);
        const index = py * width + px;

        values[index] += contribution;
        if (values[index] > maxValue) {
          maxValue = values[index];
        }
      }
    }
  }

  if (maxValue <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(width, height);

  for (let i = 0; i < values.length; i += 1) {
    const normalized = Math.pow(values[i] / maxValue, 0.72);
    const alpha = normalized < 0.035 ? 0 : Math.min(0.8, normalized * 0.95);
    const rgb = getHeatRgb(normalized);
    const offset = i * 4;

    image.data[offset] = rgb.r;
    image.data[offset + 1] = rgb.g;
    image.data[offset + 2] = rgb.b;
    image.data[offset + 3] = Math.round(alpha * 255);
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function FixMapSizing({ trigger }: { trigger: string }) {
  const map = useMap();

  useEffect(() => {
    // Leaflet can calculate tile layout before the final container size settles.
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 80);

    const onResize = () => {
      map.invalidateSize();
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", onResize);
    };
  }, [map, trigger]);

  return null;
}

function SyncDefaultView({
  center,
  zoom,
  enabled,
  followCenter,
}: {
  center: [number, number];
  zoom: number;
  enabled: boolean;
  followCenter: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !followCenter) return;
    map.flyTo(center, zoom, { animate: true, duration: 0.35 });
  }, [center, enabled, followCenter, map, zoom]);

  return null;
}

function PickCenterOnClick({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick?: (center: { lat: number; lon: number }) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled || !onPick) return;
      onPick({ lat: event.latlng.lat, lon: event.latlng.lng });
    },
  });

  return null;
}

export function ResultsMap({
  result,
  onCenterPick,
}: {
  result: AnalyzeResponse | null;
  onCenterPick?: (center: { lat: number; lon: number }) => void;
}) {
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const [manualCenter, setManualCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCenter([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Keep fallback center when permission is denied or lookup fails.
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, []);

  const fallbackCenter: [number, number] = userCenter ?? [42.3601, -71.0589];
  const initialCenter = manualCenter ?? fallbackCenter;
  const centerLat = result?.center.lat ?? initialCenter[0];
  const centerLon = result?.center.lon ?? initialCenter[1];

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!result) return null;

    return [
      [result.bbox.south, result.bbox.west],
      [result.bbox.north, result.bbox.east],
    ];
  }, [result]);

  const resultFitKey = result
    ? `${result.query.address}:${result.query.radiusKm}:${result.query.businessPreset}:${result.center.lat}:${result.center.lon}`
    : "";

  const heatOverlayUrl = useMemo(() => {
    if (!result) return null;
    return buildSmoothHeatOverlay(result);
  }, [result]);

  return (
    <div className="landkoala-map-wrap landkoala-map-focus">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={11}
        scrollWheelZoom
        zoomControl={false}
        className="landkoala-map"
      >
        <PickCenterOnClick
          enabled={!result}
          onPick={(picked) => {
            const next: [number, number] = [picked.lat, picked.lon];
            setManualCenter(next);
            onCenterPick?.(picked);
          }}
        />
        <SyncDefaultView
          center={[centerLat, centerLon]}
          zoom={11}
          enabled={!result}
          followCenter={!manualCenter}
        />
        <FixMapSizing
          trigger={`${centerLat}:${centerLon}:${result?.opportunityGrid.length ?? 0}:${result?.query.radiusKm ?? 0}`}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        {bounds ? <FitToBounds bounds={bounds} fitKey={resultFitKey} /> : null}

        {result ? (
          <>
            {heatOverlayUrl && bounds ? (
              <ImageOverlay
                url={heatOverlayUrl}
                bounds={bounds}
                opacity={0.9}
                zIndex={340}
                className="landkoala-heat-overlay"
              />
            ) : null}

            {result.competition.sample.map((competitor) => (
              <Marker
                key={`${competitor.id}:${competitor.lat}:${competitor.lon}`}
                position={[competitor.lat, competitor.lon]}
                icon={competitorIcon}
              >
                <Popup>
                  <strong>{competitor.name ?? "Unnamed competitor"}</strong>
                  <br />
                  Distance from center: {competitor.distanceKm.toFixed(2)} km
                </Popup>
              </Marker>
            ))}

            <Marker position={[result.center.lat, result.center.lon]} icon={centerIcon}>
              <Popup>
                <strong>Search center</strong>
                <br />
                {result.query.address}
              </Popup>
            </Marker>
          </>
        ) : manualCenter ? (
          <Marker position={manualCenter} icon={centerIcon}>
            <Popup>
              <strong>Selected center</strong>
              <br />
              Drag map and click to move this pin.
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
      {!result ? (
        <div className="landkoala-map-empty">
          Click anywhere on the map to set a center pin, or run an analysis to view center and
          competitor pins.
        </div>
      ) : null}
    </div>
  );
}
