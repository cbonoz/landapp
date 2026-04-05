export type BusinessPreset =
  | "coffee"
  | "grocery"
  | "gym"
  | "restaurant"
  | "bakery"
  | "pharmacy"
  | "salon"
  | "daycare"
  | "pet"
  | "hardware"
  | "laundromat"
  | "dental";

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
  metadata: {
    category: string | null;
    brand: string | null;
    operator: string | null;
    website: string | null;
    phone: string | null;
    openingHours: string | null;
    address: string | null;
  };
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
    coverageConfidence: number;
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
    coverageKm: number | null;
    sample: CompetitorPoint[];
  };
  opportunityGrid: OpportunityCell[];
  score: ScoreBreakdown;
  warnings: string[];
};

export type RecommendationItem = {
  preset: BusinessPreset;
  label: string;
  score: number;
  competitorCount: number;
  nearestCompetitorKm: number | null;
  rationale: string;
};

export type RecommendRequest = {
  address?: string;
  radiusKm?: number;
  lat?: number;
  lon?: number;
  weights?: Partial<ScoreWeights>;
};

export type RecommendResponse = {
  search: {
    address: string;
    radiusKm: number;
    usedCoordinates: Coordinates;
    source: "geolocation" | "address" | "default";
  };
  recommendations: RecommendationItem[];
  selectedPreset: BusinessPreset;
  analysis: AnalyzeResponse;
};
