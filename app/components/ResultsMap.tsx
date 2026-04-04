"use client";

import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
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

const competitorIcon = L.divIcon({
  className: "landkoala-competitor-pin",
  html: "<span></span>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [bounds, map]);

  return null;
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
          trigger={`${centerLat}:${centerLon}:${result?.competition.count ?? 0}:${result?.query.radiusKm ?? 0}`}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {bounds ? <FitToBounds bounds={bounds} /> : null}

        {result ? (
          <>
            <Marker position={[result.center.lat, result.center.lon]} icon={centerIcon}>
              <Popup>
                <strong>Search center</strong>
                <br />
                {result.query.address}
              </Popup>
            </Marker>

            <Circle
              center={[result.center.lat, result.center.lon]}
              radius={result.query.radiusKm * 1000}
              pathOptions={{ color: "#2f8552", fillColor: "#8fbe76", fillOpacity: 0.18 }}
            />

            {result.competition.sample.map((competitor) => (
              <Marker
                key={`${competitor.id}-${competitor.lat}-${competitor.lon}`}
                position={[competitor.lat, competitor.lon]}
                icon={competitorIcon}
              >
                <Popup>
                  <strong>{competitor.name ?? "Unnamed place"}</strong>
                  <br />
                  {competitor.distanceKm.toFixed(2)} km away
                </Popup>
              </Marker>
            ))}
          </>
        ) : null}
      </MapContainer>
      {!result ? (
        <div className="landkoala-map-empty">Run an analysis to drop center and competitor pins.</div>
      ) : null}
    </div>
  );
}
