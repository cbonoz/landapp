import { NextResponse } from "next/server";
import { analyzeMarket } from "@/app/lib/analysis-engine";
import { isBusinessPreset } from "@/app/lib/business-presets";
import type { AnalyzeRequest } from "@/app/lib/types";

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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = parseAnalyzeRequest(payload);
    const response = await analyzeMarket({
      addressLabel: parsed.address,
      radiusKm: parsed.radiusKm,
      businessPreset: parsed.businessPreset,
      weights: parsed.weights,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
