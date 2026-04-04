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
  };
};

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

    if (demographics.population === null) {
      warnings.push("Population data unavailable for this point; score uses fallback values.");
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
        sample: competitionResult.competitors.slice(0, 15),
      },
      score,
      warnings,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
