import { NextResponse } from "next/server";
import { analyzeMarket, geocodeAddress } from "@/app/lib/analysis-engine";
import { BUSINESS_PRESETS } from "@/app/lib/business-presets";
import type {
  BusinessPreset,
  Coordinates,
  RecommendRequest,
  RecommendResponse,
  RecommendationItem,
} from "@/app/lib/types";

const DEFAULT_ADDRESS = "Boston, MA";

function isValidCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function buildRationale(input: {
  score: number;
  competitorCount: number;
  nearestCompetitorKm: number | null;
}): string {
  const nearestText =
    input.nearestCompetitorKm === null
      ? "no direct nearby competitors detected"
      : `nearest competitor at ${input.nearestCompetitorKm.toFixed(2)} km`;

  return `Suitability ${input.score.toFixed(1)} with ${input.competitorCount} competitors in range and ${nearestText}.`;
}

function parseRecommendRequest(payload: unknown): RecommendRequest {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const candidate = payload as Partial<RecommendRequest>;

  return {
    address: typeof candidate.address === "string" ? candidate.address.trim() : undefined,
    radiusKm: candidate.radiusKm,
    lat: candidate.lat,
    lon: candidate.lon,
    weights: candidate.weights,
  };
}

export async function POST(request: Request) {
  try {
    const payload = parseRecommendRequest(await request.json().catch(() => ({})));

    const radiusKm = payload.radiusKm === undefined ? 3 : Number(payload.radiusKm);
    if (!Number.isFinite(radiusKm) || radiusKm < 0.5 || radiusKm > 25) {
      throw new Error("radiusKm must be a number between 0.5 and 25.");
    }

    let center: Coordinates;
    let addressLabel: string;
    let source: RecommendResponse["search"]["source"];

    if (
      typeof payload.lat === "number" &&
      typeof payload.lon === "number" &&
      isValidCoordinate(payload.lat, payload.lon)
    ) {
      center = { lat: payload.lat, lon: payload.lon };
      addressLabel = "Current location";
      source = "geolocation";
    } else if (payload.address) {
      center = await geocodeAddress(payload.address);
      addressLabel = payload.address;
      source = "address";
    } else {
      center = await geocodeAddress(DEFAULT_ADDRESS);
      addressLabel = DEFAULT_ADDRESS;
      source = "default";
    }

    const presets = Object.keys(BUSINESS_PRESETS) as BusinessPreset[];

    const analyses = await Promise.all(
      presets.map(async (preset) => {
        const analysis = await analyzeMarket({
          addressLabel,
          radiusKm,
          businessPreset: preset,
          weights: payload.weights,
          center,
        });

        const item: RecommendationItem = {
          preset,
          label: BUSINESS_PRESETS[preset].label,
          score: analysis.score.overall,
          competitorCount: analysis.competition.count,
          nearestCompetitorKm: analysis.competition.nearestKm,
          rationale: buildRationale({
            score: analysis.score.overall,
            competitorCount: analysis.competition.count,
            nearestCompetitorKm: analysis.competition.nearestKm,
          }),
        };

        return { item, analysis };
      }),
    );

    const hasRenderableMapData = (entry: (typeof analyses)[number]) =>
      entry.analysis.competition.count > 0 &&
      entry.analysis.opportunityGrid.some((cell) => cell.metrics.coverageConfidence > 0.02);

    const scoredOrder = [...analyses].sort((a, b) => b.item.score - a.item.score);
    const top = scoredOrder.find(hasRenderableMapData) ?? scoredOrder[0];
    if (!top) {
      throw new Error("No recommendation candidates could be evaluated.");
    }

    // Keep recommendation ranking useful for UI while prioritizing renderable map output.
    const rankedForUi = [
      top,
      ...scoredOrder.filter((entry) => entry.item.preset !== top.item.preset),
    ];

    const response: RecommendResponse = {
      search: {
        address: addressLabel,
        radiusKm,
        usedCoordinates: center,
        source,
      },
      recommendations: rankedForUi.map((entry) => entry.item),
      selectedPreset: top.item.preset,
      analysis: top.analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recommendation error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
