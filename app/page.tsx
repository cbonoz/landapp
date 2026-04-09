"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/app/components/AppHeader";
import { CoffeeButton } from "@/app/components/CoffeeButton";
import { BUSINESS_PRESETS } from "@/app/lib/business-presets";
import type { AnalyzeResponse, BusinessPreset } from "@/app/lib/types";
import "./page.css";

type AddressSuggestion = {
  label: string;
  lat: number;
  lon: number;
};

type AnalysisState = {
  loading: boolean;
  error: string | null;
  result: AnalyzeResponse | null;
};

type ExpandedMetric = "population" | "income" | "competitors" | "nearest" | null;

const presetOptions = Object.entries(BUSINESS_PRESETS) as Array<
  [BusinessPreset, (typeof BUSINESS_PRESETS)[BusinessPreset]]
>;

function parseAnalysisError(error: string): { message: string; suggestion?: string; canAutoRetry?: boolean } {
  if (error.includes("timeout") || error.includes("timed out")) {
    return {
      message: "Search took too long.",
      suggestion: "This usually works better with a smaller search area or trying a different location.",
      canAutoRetry: true,
    };
  }
  if (error.includes("429") || error.includes("temporarily unavailable")) {
    return {
      message: "The data service is temporarily busy.",
      suggestion: "Please wait a moment and try again.",
    };
  }
  if (error.includes("geocoding") || error.includes("No geocoding")) {
    return {
      message: "Could not find that address.",
      suggestion: "Try being more specific (e.g., 'Seattle, WA' or '123 Main St, Portland, OR').",
    };
  }
  return { message: error };
}

export default function Home() {
  const [businessPreset, setBusinessPreset] = useState<BusinessPreset>("coffee");
  const [location, setLocation] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<ExpandedMetric>(null);
  const [retryCountRef, setRetryCountRef] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
  });

  // Handle location autocomplete
  useEffect(() => {
    const query = location.trim();

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
  }, [location]);

  async function onSubmit(event: FormEvent<HTMLFormElement>, smallerRadius: boolean = false) {
    event.preventDefault();
    setLocationLookupError(null);
    setAnalysis({ loading: true, error: null, result: null });
    setLoadingMessage("Analyzing...");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    // Update message at 10s and 20s
    const messageIntervalId = window.setInterval(() => {
      setLoadingMessage((prev) => {
        if (prev === "Analyzing...") return "Still working on it...";
        if (prev === "Still working on it...") return "Almost there, one moment...";
        return prev;
      });
    }, 10000);

    try {
      // Determine radius: start at 2km, go down to 1km on retry
      const baseRadius = smallerRadius ? 1 : 2;
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: location,
          radiusKm: baseRadius,
          businessPreset,
          weights: {
            population: 50,
            competition: 35,
            income: 15,
          },
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);
      window.clearInterval(messageIntervalId);
      const payload = (await response.json()) as AnalyzeResponse | { error: string };

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : "Analysis failed.";
        const parsed = parseAnalysisError(message);
        
        // Auto-retry with smaller radius on timeout (only once)
        if (parsed.canAutoRetry && !smallerRadius && retryCountRef < 1) {
          setRetryCountRef((c) => c + 1);
          // Set a short delay then retry with smaller radius
          setTimeout(() => {
            onSubmit({ preventDefault: () => {} } as FormEvent<HTMLFormElement>, true);
          }, 800);
          return;
        }
        
        setAnalysis({ loading: false, error: message, result: null });
        return;
      }

      setRetryCountRef(0);
      setAnalysis({ loading: false, error: null, result: payload });
      setAddressSuggestions([]);
      setExpandedMetric(null);
    } catch (error) {
      window.clearTimeout(timeoutId);
      window.clearInterval(messageIntervalId);
      if (error instanceof Error && error.name === "AbortError") {
        setAnalysis({
          loading: false,
          error: "Analysis took too long. Try a different location or a smaller area (1-2 km radius).",
          result: null,
        });
      } else {
        setAnalysis({
          loading: false,
          error: "Network error. Please try again.",
          result: null,
        });
      }
    }
  }

  function getScoreDisplay(score: number): { text: string; color: string } {
    if (score >= 70) {
      return { text: "Great opportunity", color: "#2f8552" };
    }
    if (score >= 50) {
      return { text: "Decent opportunity", color: "#b08f2d" };
    }
    return { text: "Challenging market", color: "#b44532" };
  }

  const scoreInfo = analysis.result
    ? getScoreDisplay(analysis.result.score.overall)
    : null;

  return (
    <div className="landkoala-shell">
      <AppHeader />

      <main className="landkoala-home-wrapper">
        <section className="landkoala-hero">
          <div className="landkoala-hero-content">
            <h1>Find Your Next Location</h1>
            <p>Want to build a specific business in a particular area? Let's see if it's a good fit.</p>
          </div>
        </section>

        {!analysis.result ? (
          <section className="landkoala-form-section">
            <form className="landkoala-home-form" onSubmit={onSubmit}>
              <div className="landkoala-form-group">
                <label htmlFor="business-type">What do you want to build?</label>
                <select
                  id="business-type"
                  value={businessPreset}
                  onChange={(event) =>
                    setBusinessPreset(event.target.value as BusinessPreset)
                  }
                  required
                >
                  {presetOptions.map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="landkoala-form-group">
                <label htmlFor="location">Where do you want to build it?</label>
                <div className="landkoala-location-input-wrapper">
                  <input
                    id="location"
                    required
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Enter a US city or address"
                    list="landkoala-suggestions"
                    autoComplete="off"
                  />
                  <datalist id="landkoala-suggestions">
                    {addressSuggestions.map((suggestion) => (
                      <option
                        key={`${suggestion.lat}:${suggestion.lon}:${suggestion.label}`}
                        value={suggestion.label}
                      />
                    ))}
                  </datalist>
                </div>
                {locationLookupError && (
                  <p className="landkoala-error-hint">{locationLookupError}</p>
                )}
              </div>

              {analysis.error && (() => {
                const parsed = parseAnalysisError(analysis.error);
                return (
                  <div className="landkoala-error-box">
                    <p>
                      <strong>{parsed.message}</strong>
                    </p>
                    {parsed.suggestion && (
                      <p className="landkoala-error-suggestion">{parsed.suggestion}</p>
                    )}
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={analysis.loading}
                className="landkoala-submit-button"
              >
                {analysis.loading && <div className="loading-spinner" />}
                {analysis.loading ? "Analyzing..." : "Analyze Opportunity"}
              </button>
            </form>
          </section>
        ) : null}

        {analysis.result && (
          <section className="landkoala-results-section">
            <div className="landkoala-result-header">
              <div>
                <h2>Analysis Result</h2>
                <p className="landkoala-result-address">{analysis.result.query.address}</p>
              </div>
              <button
                type="button"
                className="landkoala-back-button"
                onClick={() => {
                  setAnalysis({ loading: false, error: null, result: null });
                  setExpandedMetric(null);
                }}
              >
                Try Another Location
              </button>
            </div>

            <div
              className="landkoala-score-display"
              style={{ borderColor: scoreInfo?.color }}
            >
              <div className="landkoala-score-value">
                <span className="score-number">{analysis.result.score.overall}/100</span>
                <span
                  className="score-label"
                  style={{ color: scoreInfo?.color }}
                >
                  {scoreInfo?.text}
                </span>
              </div>
            </div>

            <div className="landkoala-metrics-grid">
              <button
                type="button"
                className="metric-card metric-card-button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === "population" ? null : "population")
                }
              >
                <p className="metric-label">Population</p>
                <p className="metric-value">
                  {analysis.result.demographics.population?.toLocaleString() ?? "N/A"}
                </p>
                <span className="metric-expand-icon">
                  {expandedMetric === "population" ? "−" : "+"}
                </span>
                {expandedMetric === "population" && (
                  <div className="metric-explanation">
                    <p>
                      The number of people living within the {analysis.result.competition.count > 0 ? "3 km radius" : "search area"} of this location. Higher population generally indicates stronger demand for services and retail.
                    </p>
                    <p className="metric-context">
                      <strong>For this location:</strong> With {analysis.result.demographics.population?.toLocaleString()} people nearby, you have a{" "}
                      {analysis.result.demographics.population && analysis.result.demographics.population > 15000
                        ? "strong customer base"
                        : analysis.result.demographics.population && analysis.result.demographics.population > 5000
                          ? "moderate customer base"
                          : "limited customer base"}
                      .
                    </p>
                  </div>
                )}
              </button>

              <button
                type="button"
                className="metric-card metric-card-button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === "income" ? null : "income")
                }
              >
                <p className="metric-label">Median Income</p>
                <p className="metric-value">
                  {analysis.result.demographics.medianIncome
                    ? `$${analysis.result.demographics.medianIncome.toLocaleString()}`
                    : "N/A"}
                </p>
                <span className="metric-expand-icon">
                  {expandedMetric === "income" ? "−" : "+"}
                </span>
                {expandedMetric === "income" && (
                  <div className="metric-explanation">
                    <p>
                      The typical household income in this area. Income levels influence purchasing power and the types of products/services that will be successful.
                    </p>
                    <p className="metric-context">
                      <strong>For this location:</strong> An income of{" "}
                      {analysis.result.demographics.medianIncome
                        ? `$${analysis.result.demographics.medianIncome.toLocaleString()}`
                        : "unknown"}{" "}
                      suggests a{" "}
                      {analysis.result.demographics.medianIncome && analysis.result.demographics.medianIncome > 100000
                        ? "affluent market with higher spending power"
                        : analysis.result.demographics.medianIncome && analysis.result.demographics.medianIncome > 60000
                          ? "middle-to-upper income market"
                          : "price-sensitive market"}{" "}
                      for your business.
                    </p>
                  </div>
                )}
              </button>

              <button
                type="button"
                className="metric-card metric-card-button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === "competitors" ? null : "competitors")
                }
              >
                <p className="metric-label">Competitors</p>
                <p className="metric-value">{analysis.result.competition.count}</p>
                <span className="metric-expand-icon">
                  {expandedMetric === "competitors" ? "−" : "+"}
                </span>
                {expandedMetric === "competitors" && (
                  <div className="metric-explanation">
                    <p>
                      The number of established competitors offering similar services within the search radius. More competitors indicate a validated market, but also more competition.
                    </p>
                    <p className="metric-context">
                      <strong>For this location:</strong> With {analysis.result.competition.count} competitors,{" "}
                      {analysis.result.competition.count === 0
                        ? "you have a unique market opportunity with no direct competition"
                        : analysis.result.competition.count < 5
                          ? "you're entering a relatively uncrowded market"
                          : analysis.result.competition.count < 20
                            ? "the market is moderately competitive"
                            : "the market is well-served with established players"}{" "}
                      in this area.
                    </p>
                  </div>
                )}
              </button>

              <button
                type="button"
                className="metric-card metric-card-button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === "nearest" ? null : "nearest")
                }
              >
                <p className="metric-label">Nearest Competitor</p>
                <p className="metric-value">
                  {analysis.result.competition.nearestKm
                    ? `${analysis.result.competition.nearestKm.toFixed(2)} km`
                    : "N/A"}
                </p>
                <span className="metric-expand-icon">
                  {expandedMetric === "nearest" ? "−" : "+"}
                </span>
                {expandedMetric === "nearest" && (
                  <div className="metric-explanation">
                    <p>
                      Distance to the closest competitor. Closer competitors typically mean higher saturation but also market validation. Farther away can indicate underserved areas or lower demand.
                    </p>
                    <p className="metric-context">
                      <strong>For this location:</strong> The nearest competitor is{" "}
                      {analysis.result.competition.nearestKm
                        ? analysis.result.competition.nearestKm < 0.5
                          ? "extremely close (very saturated area)"
                          : analysis.result.competition.nearestKm < 2
                            ? "nearby (moderate saturation)"
                            : "at a reasonable distance (less saturated)"
                        : "nonexistent (unique opportunity)"}{" "}
                      ,{" "}
                      {analysis.result.competition.nearestKm && analysis.result.competition.nearestKm < 1
                        ? "suggesting you may want to differentiate or look elsewhere"
                        : "which could be favorable depending on your positioning"}
                      .
                    </p>
                  </div>
                )}
              </button>
            </div>

            <div className="landkoala-recommendation">
              <h3>Key Insights</h3>
              <ul className="insight-list">
                {analysis.result.score.overall >= 70 && (
                  <li className="insight-item insight-item-positive">
                    <span className="insight-icon">✓</span>
                    <div className="insight-content">
                      <p className="insight-title">Strong Market Indicators</p>
                      <p className="insight-detail">
                        This location shows strong potential with good population density and reasonable competition levels. The market fundamentals support a new business entry.
                      </p>
                    </div>
                  </li>
                )}
                {analysis.result.score.overall >= 50 &&
                  analysis.result.score.overall < 70 && (
                    <li className="insight-item insight-item-moderate">
                      <span className="insight-icon">→</span>
                      <div className="insight-content">
                        <p className="insight-title">Moderate Opportunity</p>
                        <p className="insight-detail">
                          This area has decent fundamentals, but you may want to analyze nearby areas for potentially better fit. Look for locations with either lower competition or higher population density.
                        </p>
                      </div>
                    </li>
                  )}
                {analysis.result.score.overall < 50 && (
                  <li className="insight-item insight-item-caution">
                    <span className="insight-icon">!</span>
                    <div className="insight-content">
                      <p className="insight-title">Challenging Market</p>
                      <p className="insight-detail">
                        Market indicators suggest this may be a challenging location—either high competition or low demand signals. Consider exploring other areas before committing.
                      </p>
                    </div>
                  </li>
                )}
                {analysis.result.competition.count === 0 && (
                  <li className="insight-item insight-item-positive">
                    <span className="insight-icon">★</span>
                    <div className="insight-content">
                      <p className="insight-title">Unique Opportunity</p>
                      <p className="insight-detail">
                        No direct competitors detected in the area. This could indicate a gap in the market—validate demand before moving forward.
                      </p>
                    </div>
                  </li>
                )}
                {analysis.result.demographics.medianIncome &&
                  analysis.result.demographics.medianIncome > 75000 && (
                    <li className="insight-item insight-item-positive">
                      <span className="insight-icon">💰</span>
                      <div className="insight-content">
                        <p className="insight-title">High-Income Area</p>
                        <p className="insight-detail">
                          This area has above-average household income, indicating strong purchasing power. Premium positioning and higher-margin products/services may perform well.
                        </p>
                      </div>
                    </li>
                  )}
              </ul>
            </div>

            <div className="landkoala-action-links">
              <a
                href={`/map?location=${encodeURIComponent(location)}&business=${businessPreset}`}
                className="landkoala-link-button"
              >
                Explore on Map
              </a>
            </div>
          </section>
        )}

        <footer className="landkoala-footer">
          <div className="footer-content">
            <p className="footer-message">Did LandKoala give you some insight you didn't have before?</p>
            <CoffeeButton amount={5} size="medium" />
          </div>
        </footer>
      </main>
    </div>
  );
}
