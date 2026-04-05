"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/app/components/AppHeader";
import { BUSINESS_PRESETS } from "@/app/lib/business-presets";
import type {
  AnalyzeResponse,
  BusinessPreset,
  CompetitorPoint,
  RecommendResponse,
} from "@/app/lib/types";

const ResultsMap = dynamic(
  () => import("@/app/components/ResultsMap").then((mod) => mod.ResultsMap),
  {
    ssr: false,
  },
);

type AnalysisState = {
  loading: boolean;
  error: string | null;
  result: AnalyzeResponse | null;
};

type RecommendationState = {
  loading: boolean;
  result: RecommendResponse | null;
};

type AddressSuggestion = {
  label: string;
  lat: number;
  lon: number;
};

type MapCenter = {
  lat: number;
  lon: number;
};

type WeightKey = "population" | "competition" | "income";

const presetOptions = Object.entries(BUSINESS_PRESETS) as Array<
  [BusinessPreset, (typeof BUSINESS_PRESETS)[BusinessPreset]]
>;

function getCompetitorKey(competitor: CompetitorPoint): string {
  return `${competitor.id}:${competitor.lat}:${competitor.lon}`;
}

function formatCategory(category: string | null | undefined): string {
  if (!category) return "Unknown";

  const [namespace, value] = category.split(":");
  if (!value) return category;

  const label = value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `${namespace}: ${label}`;
}

function clampScoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function mixHexColor(from: string, to: string, t: number): string {
  const value = Math.max(0, Math.min(1, t));
  const parse = (hex: string) => {
    const normalized = hex.replace("#", "");
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  };

  const a = parse(from);
  const b = parse(to);

  const r = Math.round(a.r + (b.r - a.r) * value);
  const g = Math.round(a.g + (b.g - a.g) * value);
  const blue = Math.round(a.b + (b.b - a.b) * value);

  return `rgb(${r}, ${g}, ${blue})`;
}

function getScoreCardGradient(score: number): string {
  const normalizedScore = clampScoreToPercent(score);

  const red = "#b44532";
  const yellow = "#b08f2d";
  const green = "#2f8552";

  const baseColor =
    normalizedScore <= 50
      ? mixHexColor(red, yellow, normalizedScore / 50)
      : mixHexColor(yellow, green, (normalizedScore - 50) / 50);

  const darkerColor =
    normalizedScore <= 50
      ? mixHexColor("#803325", "#7f6521", normalizedScore / 50)
      : mixHexColor("#7f6521", "#245f3b", (normalizedScore - 50) / 50);

  return `linear-gradient(145deg, ${baseColor}, ${darkerColor})`;
}

function getAnalysisRecoveryHints(errorMessage: string | null): string[] {
  if (!errorMessage) return [];

  const normalized = errorMessage.toLowerCase();
  if (!normalized.includes("competition") && !normalized.includes("overpass")) {
    return [];
  }

  return [
    "Reduce radius to 1-3 km and retry.",
    "Try another business type to reduce heavy tag queries.",
    "Use Recommend mode to retry across alternate provider endpoints.",
    "Retry in 1-2 minutes if the provider is rate-limited.",
  ];
}

export default function Home() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [showResultsView, setShowResultsView] = useState(false);
  const [address, setAddress] = useState("Boston, MA");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationLookupLoading, setLocationLookupLoading] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);
  const [businessPreset, setBusinessPreset] = useState<BusinessPreset>("coffee");
  const [populationWeight, setPopulationWeight] = useState(50);
  const [competitionWeight, setCompetitionWeight] = useState(35);
  const [incomeWeight, setIncomeWeight] = useState(15);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
  });
  const [recommendation, setRecommendation] = useState<RecommendationState>({
    loading: false,
    result: null,
  });
  const [draftCenter, setDraftCenter] = useState<MapCenter | null>(null);
  const [selectedCompetitorKey, setSelectedCompetitorKey] = useState<string | null>(null);
  const [mapPickLoading, setMapPickLoading] = useState(false);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [showAnalyzeErrorToast, setShowAnalyzeErrorToast] = useState(false);
  const mapPickRequestRef = useRef(0);
  const insightsRef = useRef<HTMLElement | null>(null);

  function onWeightChange(key: WeightKey, value: number) {
    const nextValue = Math.max(0, Math.min(100, value));
    const current = {
      population: populationWeight,
      competition: competitionWeight,
      income: incomeWeight,
    };
    const otherKeys = (Object.keys(current) as WeightKey[]).filter((candidate) => candidate !== key);
    const remaining = 100 - nextValue;
    const sumOtherCurrent = otherKeys.reduce((sum, otherKey) => sum + current[otherKey], 0);

    let firstOther = 0;
    let secondOther = 0;

    if (sumOtherCurrent <= 0) {
      firstOther = Math.floor(remaining / 2);
      secondOther = remaining - firstOther;
    } else {
      firstOther = Math.round((remaining * current[otherKeys[0]]) / sumOtherCurrent);
      secondOther = remaining - firstOther;
    }

    const next = {
      population: key === "population" ? nextValue : 0,
      competition: key === "competition" ? nextValue : 0,
      income: key === "income" ? nextValue : 0,
    };

    next[otherKeys[0]] = firstOther;
    next[otherKeys[1]] = secondOther;

    setPopulationWeight(next.population);
    setCompetitionWeight(next.competition);
    setIncomeWeight(next.income);
  }

  const analysisRecoveryHints = useMemo(
    () => getAnalysisRecoveryHints(analysis.error),
    [analysis.error],
  );

  const selectedCompetitor = useMemo(() => {
    const sample = analysis.result?.competition.sample ?? [];
    if (sample.length === 0) return null;

    if (!selectedCompetitorKey) {
      return sample[0];
    }

    return sample.find((competitor) => getCompetitorKey(competitor) === selectedCompetitorKey) ?? sample[0];
  }, [analysis.result, selectedCompetitorKey]);

  useEffect(() => {
    if (!analysis.result) return;

    setPanelOpen(true);
    setShowResultsView(true);
    const topCompetitor = analysis.result.competition.sample[0] ?? null;
    setSelectedCompetitorKey(topCompetitor ? getCompetitorKey(topCompetitor) : null);

    const frameId = window.requestAnimationFrame(() => {
      insightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [analysis.result]);

  useEffect(() => {
    if (!analysis.error || !showAnalyzeErrorToast) return;

    const timerId = window.setTimeout(() => {
      setShowAnalyzeErrorToast(false);
    }, 4500);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [analysis.error, showAnalyzeErrorToast]);

  async function reverseGeocodeToAddress(lat: number, lon: number): Promise<string | null> {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    });

    const response = await fetch(`/api/location?${params.toString()}`);
    const payload = (await response.json()) as { address?: string | null; error?: string };

    if (!response.ok || payload.error || !payload.address) {
      return null;
    }

    return payload.address;
  }

  useEffect(() => {
    const query = address.trim();

    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/location?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          suggestions?: AddressSuggestion[];
          error?: string;
        };

        if (!response.ok || payload.error) {
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(payload.suggestions ?? []);
      } catch {
        setAddressSuggestions([]);
      }
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [address]);

  async function onUseMyLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationLookupError("Geolocation is not available in this browser.");
      return;
    }

    setLocationLookupLoading(true);
    setLocationLookupError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const center = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setDraftCenter(center);

          const resolvedAddress = await reverseGeocodeToAddress(
            center.lat,
            center.lon,
          );

          if (!resolvedAddress) {
            setLocationLookupError("Could not resolve your location to an address.");
            setLocationLookupLoading(false);
            return;
          }

          setAddress(resolvedAddress);
          setAddressSuggestions([]);
          setLocationLookupLoading(false);
        } catch {
          setLocationLookupError("Location lookup failed. Please try again.");
          setLocationLookupLoading(false);
        }
      },
      () => {
        setLocationLookupError("Location permission denied. You can still type an address.");
        setLocationLookupLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }

  async function onMapCenterPick(center: MapCenter) {
    const requestId = mapPickRequestRef.current + 1;
    mapPickRequestRef.current = requestId;

    setLocationLookupError(null);
    setMapPickLoading(true);
    setDraftCenter(center);

    // Show immediate feedback while reverse geocoding catches up.
    setAddress(`${center.lat.toFixed(6)}, ${center.lon.toFixed(6)}`);
    setAddressSuggestions([]);

    try {
      const resolvedAddress = await reverseGeocodeToAddress(center.lat, center.lon);

      if (mapPickRequestRef.current !== requestId) {
        return;
      }

      if (resolvedAddress) {
        setAddress(resolvedAddress);
        setAddressSuggestions([]);
        setMapPickLoading(false);
        return;
      }

      setLocationLookupError("Pin dropped. Reverse geocoding was unavailable, using coordinates.");
      setMapPickLoading(false);
    } catch {
      if (mapPickRequestRef.current !== requestId) {
        return;
      }

      setLocationLookupError("Pin dropped. Reverse geocoding failed, using coordinates.");
      setMapPickLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowAnalyzeErrorToast(false);
    setRecommendation({ loading: false, result: null });
    setAnalysis({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          radiusKm,
          businessPreset,
          weights: {
            population: populationWeight,
            competition: competitionWeight,
            income: incomeWeight,
          },
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse | { error: string };

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : "Analysis failed.";
        setAnalysis({ loading: false, error: message, result: null });
        setShowAnalyzeErrorToast(true);
        return;
      }

      setAnalysis({ loading: false, error: null, result: payload });
    } catch {
      setAnalysis({
        loading: false,
        error: "Network error. Please try again.",
        result: null,
      });
      setShowAnalyzeErrorToast(true);
    }
  }

  async function getBrowserLocation(): Promise<{ lat: number; lon: number } | null> {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 600000,
        },
      );
    });
  }

  async function onRecommendStart() {
    setShowAnalyzeErrorToast(false);
    setRecommendation({ loading: true, result: null });
    setAnalysis({ loading: true, error: null, result: null });

    try {
      const geo = await getBrowserLocation();

      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          radiusKm,
          lat: geo?.lat,
          lon: geo?.lon,
          weights: {
            population: populationWeight,
            competition: competitionWeight,
            income: incomeWeight,
          },
        }),
      });

      const payload = (await response.json()) as RecommendResponse | { error: string };

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : "Recommendation failed.";
        setRecommendation({ loading: false, result: null });
        setAnalysis({ loading: false, error: message, result: null });
        setShowAnalyzeErrorToast(true);
        return;
      }

      setBusinessPreset(payload.selectedPreset);
      setDraftCenter(payload.search.usedCoordinates);
      setAddress(
        payload.search.source === "geolocation"
          ? `${payload.search.usedCoordinates.lat.toFixed(6)}, ${payload.search.usedCoordinates.lon.toFixed(6)}`
          : payload.search.address,
      );
      setAddressSuggestions([]);
      setRecommendation({ loading: false, result: payload });
      setAnalysis({ loading: false, error: null, result: payload.analysis });
    } catch {
      setRecommendation({ loading: false, result: null });
      setAnalysis({
        loading: false,
        error: "Network error while generating recommendations. Please try again.",
        result: null,
      });
      setShowAnalyzeErrorToast(true);
    }
  }

  return (
    <div className="landkoala-shell landkoala-shell-focus">
      <AppHeader panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((value) => !value)} />

      <main className="landkoala-stage" id="map-view">
        {analysis.error && showAnalyzeErrorToast ? (
          <div className="landkoala-toast landkoala-toast-error" role="alert" aria-live="assertive">
            <span>{analysis.error}</span>
            <button
              type="button"
              className="landkoala-toast-dismiss"
              aria-label="Dismiss analysis error"
              onClick={() => setShowAnalyzeErrorToast(false)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <ResultsMap
          result={analysis.result}
          selectedCenter={draftCenter}
          onCenterPick={onMapCenterPick}
        />

        <aside className={`landkoala-actionbar ${panelOpen ? "is-open" : ""}`}>
          <div className="landkoala-actionbar-head">
            <div className="landkoala-actionbar-brand">
              <p className="landkoala-kicker">LandKoala</p>
              <p className="landkoala-actionbar-tagline">
                Find underserved store locations in minutes
              </p>
            </div>
            <button type="button" onClick={() => setPanelOpen((value) => !value)}>
              {panelOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          <div className="landkoala-actionbar-content">
            {!showResultsView ? (
              <>
                <p className="landkoala-subtitle">
                  Search a US address, choose a preset, then score a radius.
                </p>

                {analysis.error && analysisRecoveryHints.length > 0 ? (
                  <div className="landkoala-warning-box" role="status" aria-live="polite">
                    <strong>How to recover</strong>
                    <ul>
                      {analysisRecoveryHints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="landkoala-secondary-button"
                  onClick={onRecommendStart}
                  disabled={analysis.loading || recommendation.loading}
                >
                  {recommendation.loading ? "Finding recommendation..." : "Recommend what to start for me"}
                </button>

                <p className="landkoala-hint">Auto-recommend checks all presets and picks the strongest fit.</p>

                <form className="landkoala-form" onSubmit={onSubmit}>
                  <label>
                    Search address
                    <div className="landkoala-address-row">
                      <input
                        required
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Cambridge, MA"
                        list="landkoala-address-suggestions"
                      />
                      <button
                        type="button"
                        className="landkoala-location-button"
                        onClick={onUseMyLocation}
                        disabled={locationLookupLoading}
                      >
                        {locationLookupLoading ? "Locating..." : "Use my location"}
                      </button>
                    </div>
                    <datalist id="landkoala-address-suggestions">
                      {addressSuggestions.map((suggestion) => (
                        <option key={`${suggestion.lat}:${suggestion.lon}:${suggestion.label}`} value={suggestion.label} />
                      ))}
                    </datalist>
                  </label>

                  {mapPickLoading ? (
                    <p className="landkoala-hint">Updating address from dropped pin...</p>
                  ) : null}

                  {locationLookupError ? (
                    <p className="landkoala-inline-error">{locationLookupError}</p>
                  ) : null}

                  <div className="landkoala-inline-fields">
                    <label>
                      Radius (km)
                      <input
                        type="number"
                        min={0.5}
                        max={25}
                        step={0.5}
                        value={radiusKm}
                        onChange={(event) => setRadiusKm(Number(event.target.value))}
                      />
                    </label>

                    <label>
                      Business type
                      <select
                        value={businessPreset}
                        onChange={(event) =>
                          setBusinessPreset(event.target.value as BusinessPreset)
                        }
                      >
                        {presetOptions.map(([key, option]) => (
                          <option key={key} value={key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="landkoala-weight-grid">
                    <label>
                      Population weight
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={populationWeight}
                        onChange={(event) => onWeightChange("population", Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Competition weight
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={competitionWeight}
                        onChange={(event) => onWeightChange("competition", Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Income weight
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={incomeWeight}
                        onChange={(event) => onWeightChange("income", Number(event.target.value))}
                      />
                    </label>
                  </div>

                  <button type="submit" disabled={analysis.loading}>
                    {analysis.loading ? "Scoring area..." : "Analyze market"}
                  </button>
                </form>
              </>
            ) : (
              <div className="landkoala-results-head">
                <h1 className="landkoala-title">Analysis results</h1>
                <button
                  type="button"
                  className="landkoala-nav-button"
                  onClick={() => {
                    setShowResultsView(false);
                    setAnalysis((current) => ({ ...current, result: null, error: null }));
                  }}
                >
                  Back to search
                </button>
              </div>
            )}
            <section id="insights" ref={insightsRef}>
              {analysis.result ? (
                <>
                  {recommendation.result ? (
                    <section className="landkoala-recommendation-card" aria-live="polite">
                      <p className="landkoala-kicker">Auto recommendation</p>
                      <h3>
                        Start with {BUSINESS_PRESETS[recommendation.result.selectedPreset].label}
                      </h3>
                      <p>
                        Based on {recommendation.result.search.source === "default"
                          ? recommendation.result.search.address
                          : recommendation.result.search.source === "geolocation"
                            ? "your current location"
                            : recommendation.result.search.address}
                        {" "}
                        within {recommendation.result.search.radiusKm} km.
                      </p>

                      <ul className="landkoala-recommendation-list">
                        {recommendation.result.recommendations.map((item) => (
                          <li key={item.preset}>
                            <span>
                              {item.label}
                              {item.preset === recommendation.result?.selectedPreset ? " (recommended)" : ""}
                            </span>
                            <strong>{item.score.toFixed(1)}</strong>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <div
                    className="landkoala-score-card"
                    style={{ background: getScoreCardGradient(analysis.result.score.overall) }}
                  >
                    <div className="landkoala-score-head">
                      <p>Overall suitability</p>
                      <button
                        type="button"
                        className="landkoala-score-info-button"
                        aria-label="How the overall suitability score is calculated"
                        aria-expanded={scoreInfoOpen}
                        aria-controls="landkoala-score-explainer"
                        onClick={() => setScoreInfoOpen((value) => !value)}
                      >
                        i
                      </button>
                    </div>
                    <strong>{analysis.result.score.overall}/100</strong>
                    {scoreInfoOpen ? (
                      <div
                        id="landkoala-score-explainer"
                        className="landkoala-score-explainer"
                        role="status"
                      >
                        <p>
                          The score is a weighted blend of three normalized components, then
                          scaled to 100.
                        </p>
                        <p>
                          Formula: overall = population x {analysis.result.score.weights.population.toFixed(2)} +
                          competition x {analysis.result.score.weights.competition.toFixed(2)} + income x {" "}
                          {analysis.result.score.weights.income.toFixed(2)}.
                        </p>
                        <ul>
                          <li>Population = nearby population divided by 12,000.</li>
                          <li>Competition = 1 - (competitor density / 5 competitors per km^2).</li>
                          <li>Income = median household income divided by 100,000.</li>
                        </ul>
                        <p>
                          Current components: population {analysis.result.score.components.population}, competition{" "}
                          {analysis.result.score.components.competition}, income {analysis.result.score.components.income}.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="landkoala-metrics">
                    <article>
                      <p>Population</p>
                      <strong>{analysis.result.score.components.population}</strong>
                    </article>
                    <article>
                      <p>Competition</p>
                      <strong>{analysis.result.score.components.competition}</strong>
                    </article>
                    <article>
                      <p>Income</p>
                      <strong>{analysis.result.score.components.income}</strong>
                    </article>
                  </div>

                  <div className="landkoala-data-grid">
                    <p>
                      <span>Population:</span>
                      <strong>{analysis.result.demographics.population ?? "N/A"}</strong>
                    </p>
                    <p>
                      <span>Median income:</span>
                      <strong>
                        {analysis.result.demographics.medianIncome
                          ? `$${analysis.result.demographics.medianIncome.toLocaleString()}`
                          : "N/A"}
                      </strong>
                    </p>
                    <p>
                      <span>Competitors:</span>
                      <strong>{analysis.result.competition.count}</strong>
                    </p>
                    <p>
                      <span>Nearest:</span>
                      <strong>
                        {analysis.result.competition.nearestKm
                          ? `${analysis.result.competition.nearestKm.toFixed(2)} km`
                          : "N/A"}
                      </strong>
                    </p>
                  </div>

                  <h3 className="landkoala-section-subtitle">Closest competitors</h3>

                  {selectedCompetitor ? (
                    <article className="landkoala-competitor-detail">
                      <h4>{selectedCompetitor.name ?? "Unnamed place"}</h4>
                      <p>
                        <span>Distance:</span>
                        <strong>{selectedCompetitor.distanceKm.toFixed(2)} km</strong>
                      </p>
                      <p>
                        <span>Category:</span>
                        <strong>{formatCategory(selectedCompetitor.metadata.category)}</strong>
                      </p>
                      <p>
                        <span>Brand:</span>
                        <strong>{selectedCompetitor.metadata.brand ?? "N/A"}</strong>
                      </p>
                      <p>
                        <span>Operator:</span>
                        <strong>{selectedCompetitor.metadata.operator ?? "N/A"}</strong>
                      </p>
                      <p>
                        <span>Address:</span>
                        <strong>{selectedCompetitor.metadata.address ?? "N/A"}</strong>
                      </p>
                      <p>
                        <span>Phone:</span>
                        <strong>{selectedCompetitor.metadata.phone ?? "N/A"}</strong>
                      </p>
                      <p>
                        <span>Website:</span>
                        <strong>{selectedCompetitor.metadata.website ?? "N/A"}</strong>
                      </p>
                      <p>
                        <span>Hours:</span>
                        <strong>{selectedCompetitor.metadata.openingHours ?? "N/A"}</strong>
                      </p>
                    </article>
                  ) : null}

                  <ul className="landkoala-competitor-list">
                    {analysis.result.competition.sample.map((competitor) => (
                      <li key={getCompetitorKey(competitor)}>
                        <button
                          type="button"
                          className={`landkoala-competitor-item ${
                            selectedCompetitorKey === getCompetitorKey(competitor)
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() => setSelectedCompetitorKey(getCompetitorKey(competitor))}
                        >
                          <span>{competitor.name ?? "Unnamed place"}</span>
                          <strong>{competitor.distanceKm.toFixed(2)} km</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

          </div>
        </aside>
      </main>
    </div>
  );
}
