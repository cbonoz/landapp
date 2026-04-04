"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Circle,
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
import { haversineDistanceKm } from "@/app/lib/geo";
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

function getHeatColor(score: number): string {
  if (score >= 80) return "#18834f";
  if (score >= 65) return "#4ba25f";
  if (score >= 50) return "#89b960";
  if (score >= 35) return "#d5b257";
  return "#d56a4e";
}

function getHeatOpacity(score: number): number {
  return Math.max(0.15, Math.min(0.55, 0.15 + score / 250));
}

function hashToUnit(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return (Math.abs(hash) % 1000) / 1000;
}

function getBlobCenter(cell: AnalyzeResponse["opportunityGrid"][number]): [number, number] {
  const seedA = hashToUnit(`${cell.id}:a`);
  const seedB = hashToUnit(`${cell.id}:b`);

  const latMeters = 111320;
  const lonMeters = 111320 * Math.max(Math.cos((cell.center.lat * Math.PI) / 180), 0.1);
  const driftMeters = 120;

  return [
    cell.center.lat + (((seedA - 0.5) * 2 * driftMeters) / latMeters),
    cell.center.lon + (((seedB - 0.5) * 2 * driftMeters) / lonMeters),
  ];
}

function getBlobRadiusMeters(cell: AnalyzeResponse["opportunityGrid"][number]): number {
  const latSpanKm = haversineDistanceKm(
    { lat: cell.bounds.north, lon: cell.center.lon },
    { lat: cell.bounds.south, lon: cell.center.lon },
  );
  const lonSpanKm = haversineDistanceKm(
    { lat: cell.center.lat, lon: cell.bounds.east },
    { lat: cell.center.lat, lon: cell.bounds.west },
  );

  const baseRadiusMeters = (Math.max(Math.min(latSpanKm, lonSpanKm), 0.15) * 1000) / 2;
  const scoreScale = 0.9 + cell.score / 130;

  return baseRadiusMeters * scoreScale;
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
            {result.opportunityGrid.map((cell) => {
              const center = getBlobCenter(cell);
              const radius = getBlobRadiusMeters(cell);
              const color = getHeatColor(cell.score);
              const opacity = getHeatOpacity(cell.score);

              return (
                <Fragment key={cell.id}>
                  <Circle
                    center={center}
                    radius={radius * 1.45}
                    pathOptions={{
                      color,
                      weight: 0,
                      fillColor: color,
                      fillOpacity: opacity * 0.28,
                    }}
                  />
                  <Circle
                    center={center}
                    radius={radius}
                    pathOptions={{
                      color,
                      weight: 0,
                      fillColor: color,
                      fillOpacity: opacity,
                    }}
                  >
                    <Popup>
                      <strong>Opportunity score: {cell.score}/100</strong>
                      <br />
                      Nearest competitor: {cell.metrics.nearestCompetitorKm.toFixed(2)} km
                      <br />
                      Local density: {cell.metrics.localCompetitorDensity.toFixed(3)}
                    </Popup>
                  </Circle>
                </Fragment>
              );
            })}

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
