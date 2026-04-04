import { NextResponse } from "next/server";
import { BUSINESS_PRESETS, isBusinessPreset } from "@/app/lib/business-presets";
import { haversineDistanceKm, toBoundingBox } from "@/app/lib/geo";
import { buildScore } from "@/app/lib/scoring";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CompetitorPoint,
  Coordinates,
  Demographics,
  OpportunityCell,
} from "@/app/lib/types";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

type CensusGeocoderResponse = {
  result?: {
    geographies?: {
      "Census Tracts"?: Array<{
        STATE?: string;
        COUNTY?: string;
        TRACT?: string;
      }>;
    };
  };
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    leisure?: string;
    tourism?: string;
    office?: string;
    craft?: string;
    healthcare?: string;
    brand?: string;
    operator?: string;
    website?: string;
    contact_website?: string;
    phone?: string;
    contact_phone?: string;
    opening_hours?: string;
    "addr:housenumber"?: string;
    "addr:street"?: string;
    "addr:city"?: string;
    "addr:state"?: string;
    "addr:postcode"?: string;
  };
};

function normalizeCategory(tags: OverpassElement["tags"]): string | null {
  if (!tags) return null;

  if (tags.amenity) return `amenity:${tags.amenity}`;
  if (tags.shop) return `shop:${tags.shop}`;
  if (tags.leisure) return `leisure:${tags.leisure}`;
  if (tags.tourism) return `tourism:${tags.tourism}`;
  if (tags.office) return `office:${tags.office}`;
  if (tags.craft) return `craft:${tags.craft}`;
  if (tags.healthcare) return `healthcare:${tags.healthcare}`;

  return null;
}

function normalizeAddress(tags: OverpassElement["tags"]): string | null {
  if (!tags) return null;

  const line1 = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const line2 = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(", ");

  if (!line1 && !line2) return null;
  if (line1 && line2) return `${line1}, ${line2}`;
  return line1 || line2 || null;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

function parseAnalyzeRequest(payload: unknown): AnalyzeRequest {
  if (!payload || typeof payload !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const candidate = payload as Partial<AnalyzeRequest>;
  const address = candidate.address?.trim();
  const radiusKm = Number(candidate.radiusKm);

  if (!address) {
    throw new Error("Address is required.");
  }

  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 25) {
    throw new Error("radiusKm must be a number between 0 and 25.");
  }

  if (!candidate.businessPreset || !isBusinessPreset(candidate.businessPreset)) {
    throw new Error("Invalid businessPreset.");
  }

  return {
    address,
    radiusKm,
    businessPreset: candidate.businessPreset,
    weights: candidate.weights,
  };
}

async function geocodeAddress(address: string): Promise<Coordinates> {
  const coordinatesMatch = address.match(
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  );

  if (coordinatesMatch) {
    const lat = Number(coordinatesMatch[1]);
    const lon = Number(coordinatesMatch[2]);

    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "jsonv2");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LandKoala/0.1 (site suitability prototype)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to geocode address.");
  }

  const data = (await response.json()) as NominatimResult[];
  const top = data[0];

  if (!top) {
    throw new Error("No geocoding results found for that address.");
  }

  const lat = Number(top.lat);
  const lon = Number(top.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Geocoder returned invalid coordinates.");
  }

  return { lat, lon };
}

function buildOverpassQuery(tags: Array<{ key: string; value: string }>, bbox: ReturnType<typeof toBoundingBox>) {
  const filters = tags
    .map((tag) => {
      const filter = `["${tag.key}"="${tag.value}"]`;
      return [
        `node${filter}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`,
        `way${filter}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`,
        `relation${filter}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});`,
      ].join("\n");
    })
    .join("\n");

  return `[out:json][timeout:25];\n(\n${filters}\n);\nout center;`;
}

async function fetchCompetitors(center: Coordinates, radiusKm: number, businessPreset: AnalyzeRequest["businessPreset"]) {
  const bbox = toBoundingBox(center, radiusKm);
  const preset = BUSINESS_PRESETS[businessPreset];
  const query = buildOverpassQuery(preset.competitorTags, bbox);

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: query,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch competition data from Overpass.");
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };

  const competitors: CompetitorPoint[] = (payload.elements ?? [])
    .map((element) => {
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;

      if (lat === undefined || lon === undefined) {
        return null;
      }

      const distanceKm = haversineDistanceKm(center, { lat, lon });

      return {
        id: element.id,
        lat,
        lon,
        distanceKm,
        name: element.tags?.name ?? null,
        metadata: {
          category: normalizeCategory(element.tags),
          brand: element.tags?.brand ?? null,
          operator: element.tags?.operator ?? null,
          website: element.tags?.website ?? element.tags?.contact_website ?? null,
          phone: element.tags?.phone ?? element.tags?.contact_phone ?? null,
          openingHours: element.tags?.opening_hours ?? null,
          address: normalizeAddress(element.tags),
        },
      };
    })
    .filter((point): point is CompetitorPoint => point !== null)
    .filter((point) => point.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    bbox,
    competitors,
  };
}

async function fetchDemographics(center: Coordinates): Promise<Demographics> {
  const geocoderUrl = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
  geocoderUrl.searchParams.set("x", String(center.lon));
  geocoderUrl.searchParams.set("y", String(center.lat));
  geocoderUrl.searchParams.set("benchmark", "Public_AR_Current");
  geocoderUrl.searchParams.set("vintage", "Current_Current");
  geocoderUrl.searchParams.set("format", "json");

  const geocoderResponse = await fetch(geocoderUrl, { cache: "no-store" });

  if (!geocoderResponse.ok) {
    throw new Error("Failed to map coordinates to census tract.");
  }

  const geoPayload = (await geocoderResponse.json()) as CensusGeocoderResponse;
  const tract = geoPayload.result?.geographies?.["Census Tracts"]?.[0];

  if (!tract?.STATE || !tract.COUNTY || !tract.TRACT) {
    return {
      population: null,
      medianIncome: null,
      tract: null,
      county: null,
      state: null,
    };
  }

  const censusUrl = new URL("https://api.census.gov/data/2023/acs/acs5");
  censusUrl.searchParams.set("get", "NAME,B01003_001E,B19013_001E");
  censusUrl.searchParams.set("for", `tract:${tract.TRACT}`);
  censusUrl.searchParams.set("in", `state:${tract.STATE} county:${tract.COUNTY}`);

  if (process.env.CENSUS_API_KEY) {
    censusUrl.searchParams.set("key", process.env.CENSUS_API_KEY);
  }

  const censusResponse = await fetch(censusUrl, { cache: "no-store" });

  if (!censusResponse.ok) {
    throw new Error("Failed to fetch census demographics.");
  }

  const rows = (await censusResponse.json()) as string[][];
  const valueRow = rows[1];

  if (!valueRow) {
    return {
      population: null,
      medianIncome: null,
      tract: tract.TRACT,
      county: tract.COUNTY,
      state: tract.STATE,
    };
  }

  return {
    population: Number(valueRow[1]) || null,
    medianIncome: Number(valueRow[2]) || null,
    tract: tract.TRACT,
    county: tract.COUNTY,
    state: tract.STATE,
  };
}

function buildOpportunityGrid(input: {
  bbox: ReturnType<typeof toBoundingBox>;
  competitors: CompetitorPoint[];
  searchCenter: Coordinates;
  radiusKm: number;
  coverageKm: number | null;
}): OpportunityCell[] {
  const gridRows = 14;
  const gridCols = 14;
  const latStep = (input.bbox.north - input.bbox.south) / gridRows;
  const lonStep = (input.bbox.east - input.bbox.west) / gridCols;
  const kernelKm = Math.max(input.radiusKm / 3, 0.5);
  const coverageEdgeKm = Math.max(input.radiusKm * 0.12, 0.4);

  const cells: OpportunityCell[] = [];

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const south = input.bbox.south + row * latStep;
      const north = south + latStep;
      const west = input.bbox.west + col * lonStep;
      const east = west + lonStep;
      const center = {
        lat: (south + north) / 2,
        lon: (west + east) / 2,
      };

      let nearestKm = input.radiusKm;
      let localHits = 0;

      for (const competitor of input.competitors) {
        const distanceKm = haversineDistanceKm(center, competitor);
        nearestKm = Math.min(nearestKm, distanceKm);

        if (distanceKm <= kernelKm) {
          localHits += 1;
        }
      }

      const nearestSignal = clamp(nearestKm / Math.max(input.radiusKm, 0.001));
      const localDensitySignal = clamp(1 - localHits / 8);
      const score = nearestSignal * 0.6 + localDensitySignal * 0.4;
      const centerDistanceKm = haversineDistanceKm(input.searchCenter, center);
      const coverageConfidence =
        input.coverageKm === null
          ? 0
          : clamp(
              (input.coverageKm + coverageEdgeKm - centerDistanceKm) /
                Math.max(coverageEdgeKm, 0.001),
            );

      cells.push({
        id: `${row}-${col}`,
        center,
        bounds: { north, south, east, west },
        score: Number((score * 100).toFixed(1)),
        metrics: {
          nearestCompetitorKm: Number(nearestKm.toFixed(3)),
          localCompetitorDensity: Number((localHits / (Math.PI * kernelKm * kernelKm)).toFixed(4)),
          coverageConfidence: Number(coverageConfidence.toFixed(3)),
        },
      });
    }
  }

  return cells;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = parseAnalyzeRequest(payload);

    const center = await geocodeAddress(parsed.address);

    const [competitionResult, demographics] = await Promise.all([
      fetchCompetitors(center, parsed.radiusKm, parsed.businessPreset),
      fetchDemographics(center),
    ]);

    const score = buildScore({
      population: demographics.population,
      medianIncome: demographics.medianIncome,
      competitorCount: competitionResult.competitors.length,
      radiusKm: parsed.radiusKm,
      weights: parsed.weights,
    });

    const warnings: string[] = [];
    const coverageKm =
      competitionResult.competitors.length > 0
        ? Math.max(...competitionResult.competitors.map((competitor) => competitor.distanceKm))
        : null;

    const opportunityGrid = buildOpportunityGrid({
      bbox: competitionResult.bbox,
      competitors: competitionResult.competitors,
      searchCenter: center,
      radiusKm: parsed.radiusKm,
      coverageKm,
    });

    if (demographics.population === null) {
      warnings.push("Population data unavailable for this point; score uses fallback values.");
    }

    if (coverageKm !== null && coverageKm < parsed.radiusKm * 0.92) {
      warnings.push(
        `Competition coverage reached ${coverageKm.toFixed(2)} km of ${parsed.radiusKm.toFixed(2)} km. Outer heat areas may be lower confidence.`,
      );
    }

    const response: AnalyzeResponse = {
      query: {
        address: parsed.address,
        radiusKm: parsed.radiusKm,
        businessPreset: parsed.businessPreset,
      },
      center,
      bbox: competitionResult.bbox,
      demographics,
      competition: {
        count: competitionResult.competitors.length,
        nearestKm: competitionResult.competitors[0]?.distanceKm ?? null,
        coverageKm,
        sample: competitionResult.competitors.slice(0, 15),
      },
      opportunityGrid,
      score,
      warnings,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
