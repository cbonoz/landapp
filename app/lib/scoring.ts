import { clamp } from "@/app/lib/geo";
import type { ScoreWeights } from "@/app/lib/types";

const DEFAULT_WEIGHTS: ScoreWeights = {
  population: 0.5,
  competition: 0.35,
  income: 0.15,
};

function normalizeWeights(weights: Partial<ScoreWeights> | undefined): ScoreWeights {
  const merged = {
    population: weights?.population ?? DEFAULT_WEIGHTS.population,
    competition: weights?.competition ?? DEFAULT_WEIGHTS.competition,
    income: weights?.income ?? DEFAULT_WEIGHTS.income,
  };

  const sum = Math.max(merged.population + merged.competition + merged.income, 0.001);

  return {
    population: merged.population / sum,
    competition: merged.competition / sum,
    income: merged.income / sum,
  };
}

export function buildScore(input: {
  population: number | null;
  medianIncome: number | null;
  competitorCount: number;
  radiusKm: number;
  weights?: Partial<ScoreWeights>;
}) {
  const normalizedWeights = normalizeWeights(input.weights);

  const populationComponent = clamp((input.population ?? 0) / 12000);
  const incomeComponent = clamp((input.medianIncome ?? 0) / 100000);

  const searchArea = Math.max(Math.PI * input.radiusKm * input.radiusKm, 1);
  const competitorDensity = input.competitorCount / searchArea;
  const competitionComponent = clamp(1 - competitorDensity / 5);

  const overall =
    populationComponent * normalizedWeights.population +
    competitionComponent * normalizedWeights.competition +
    incomeComponent * normalizedWeights.income;

  return {
    overall: Number((overall * 100).toFixed(1)),
    components: {
      population: Number((populationComponent * 100).toFixed(1)),
      competition: Number((competitionComponent * 100).toFixed(1)),
      income: Number((incomeComponent * 100).toFixed(1)),
    },
    weights: normalizedWeights,
  };
}
