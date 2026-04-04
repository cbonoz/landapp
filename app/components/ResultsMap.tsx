"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  useMap,
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

function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);

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

export function ResultsMap({ result }: { result: AnalyzeResponse | null }) {
  const centerLat = result?.center.lat ?? 42.3601;
  const centerLon = result?.center.lon ?? -71.0589;

  const bounds: LatLngBoundsExpression | null = result
    ? [
        [result.bbox.south, result.bbox.west],
        [result.bbox.north, result.bbox.east],
      ]
    : null;

  return (
    <div className="landkoala-map-wrap landkoala-map-focus">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={11}
        scrollWheelZoom
        className="landkoala-map"
      >
        <FixMapSizing
          trigger={`${centerLat}:${centerLon}:${result?.opportunityGrid.length ?? 0}:${result?.query.radiusKm ?? 0}`}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {bounds ? <FitToBounds bounds={bounds} /> : null}

        {result ? (
          <>
            {result.opportunityGrid.map((cell) => (
              <Rectangle
                key={cell.id}
                bounds={[
                  [cell.bounds.south, cell.bounds.west],
                  [cell.bounds.north, cell.bounds.east],
                ]}
                pathOptions={{
                  color: getHeatColor(cell.score),
                  weight: 0,
                  fillColor: getHeatColor(cell.score),
                  fillOpacity: getHeatOpacity(cell.score),
                }}
              >
                <Popup>
                  <strong>Opportunity score: {cell.score}/100</strong>
                  <br />
                  Nearest competitor: {cell.metrics.nearestCompetitorKm.toFixed(2)} km
                  <br />
                  Local density: {cell.metrics.localCompetitorDensity.toFixed(3)}
                </Popup>
              </Rectangle>
            ))}

            <Marker position={[result.center.lat, result.center.lon]} icon={centerIcon}>
              <Popup>
                <strong>Search center</strong>
                <br />
                {result.query.address}
              </Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>
      {!result ? (
        <div className="landkoala-map-empty">Run an analysis to drop center and competitor pins.</div>
      ) : null}
    </div>
  );
}
