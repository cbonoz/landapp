export type BusinessPreset = "coffee" | "grocery" | "gym" | "restaurant";

export type ScoreWeights = {
  population: number;
  competition: number;
  income: number;
};

export type AnalyzeRequest = {
  address: string;
  radiusKm: number;
  businessPreset: BusinessPreset;
  weights?: Partial<ScoreWeights>;
};

export type Coordinates = {
  lat: number;
  lon: number;
};

export type BoundingBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CompetitorPoint = Coordinates & {
  id: number;
  name: string | null;
  distanceKm: number;
};

export type Demographics = {
  population: number | null;
  medianIncome: number | null;
  tract: string | null;
  county: string | null;
  state: string | null;
};

export type ScoreBreakdown = {
  overall: number;
  components: {
    population: number;
    competition: number;
    income: number;
  };
  weights: ScoreWeights;
};

export type OpportunityCell = {
  id: string;
  center: Coordinates;
  bounds: BoundingBox;
  score: number;
  metrics: {
    nearestCompetitorKm: number;
    localCompetitorDensity: number;
  };
};

export type AnalyzeResponse = {
  query: {
    address: string;
    radiusKm: number;
    businessPreset: BusinessPreset;
  };
  center: Coordinates;
  bbox: BoundingBox;
  demographics: Demographics;
  competition: {
    count: number;
    nearestKm: number | null;
    sample: CompetitorPoint[];
  };
  opportunityGrid: OpportunityCell[];
  score: ScoreBreakdown;
  warnings: string[];
};
