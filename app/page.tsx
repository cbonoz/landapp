"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/app/components/AppHeader";
import { CoffeeButton } from "@/app/components/CoffeeButton";
import { BUSINESS_PRESETS } from "@/app/lib/business-presets";
import type { AnalyzeResponse, BusinessPreset } from "@/app/lib/types";

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

export default function Home() {
  const [businessPreset, setBusinessPreset] = useState<BusinessPreset>("coffee");
  const [location, setLocation] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<ExpandedMetric>(null);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocationLookupError(null);
    setAnalysis({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: location,
          radiusKm: 3,
          businessPreset,
          weights: {
            population: 50,
            competition: 35,
            income: 15,
          },
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse | { error: string };

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : "Analysis failed.";
        setAnalysis({ loading: false, error: message, result: null });
        return;
      }

      setAnalysis({ loading: false, error: null, result: payload });
      setAddressSuggestions([]);
      setExpandedMetric(null);
    } catch {
      setAnalysis({
        loading: false,
        error: "Network error. Please try again.",
        result: null,
      });
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

              {analysis.error && (
                <div className="landkoala-error-box">
                  <p>{analysis.error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={analysis.loading}
                className="landkoala-submit-button"
              >
                {analysis.loading ? "Analyzing..." : "Analyze Opportunity"}
              </button>
            </form>
          </section>
        ) : null}

        {analysis.result && (
          <section className="landkoala-results-section">
            <div className="landkoala-result-header">
              <h2>Analysis Result</h2>
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

      <style jsx>{`
        .landkoala-home-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .landkoala-hero {
          text-align: center;
          margin-bottom: 4rem;
        }

        .landkoala-hero h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #2d3436;
        }

        .landkoala-hero p {
          font-size: 1.1rem;
          color: #636e72;
          max-width: 600px;
          margin: 0 auto;
        }

        .landkoala-form-section {
          max-width: 500px;
          margin: 0 auto;
          margin-bottom: 4rem;
        }

        .landkoala-home-form {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .landkoala-form-group {
          margin-bottom: 1.5rem;
        }

        .landkoala-form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2d3436;
        }

        .landkoala-form-group input,
        .landkoala-form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dfe6e9;
          border-radius: 4px;
          font-size: 1rem;
          font-family: inherit;
        }

        .landkoala-form-group input:focus,
        .landkoala-form-group select:focus {
          outline: none;
          border-color: #2f8552;
          box-shadow: 0 0 0 3px rgba(47, 133, 82, 0.1);
        }

        .landkoala-error-hint {
          color: #d63031;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .landkoala-error-box {
          background: #ffebee;
          border-left: 4px solid #d63031;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          color: #c92a2a;
        }

        .landkoala-submit-button {
          width: 100%;
          padding: 0.875rem;
          background: #2f8552;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .landkoala-submit-button:hover:not(:disabled) {
          background: #245f3b;
        }

        .landkoala-submit-button:disabled {
          background: #b2bec3;
          cursor: not-allowed;
        }

        .landkoala-results-section {
          max-width: 600px;
          margin: 0 auto;
        }

        .landkoala-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .landkoala-result-header h2 {
          margin: 0;
          color: #2d3436;
        }

        .landkoala-back-button {
          padding: 0.5rem 1rem;
          background: #f0f0f0;
          border: 1px solid #dfe6e9;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .landkoala-back-button:hover {
          background: #e9e9e9;
        }

        .landkoala-score-display {
          background: white;
          border-left: 4px solid #2f8552;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .landkoala-score-value {
          display: flex;
          align-items: baseline;
          gap: 1rem;
        }

        .score-number {
          font-size: 3rem;
          font-weight: bold;
          color: #2d3436;
        }

        .score-label {
          font-size: 1.25rem;
          font-weight: 500;
        }

        .landkoala-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (max-width: 600px) {
          .landkoala-metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .metric-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .metric-card-button {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          position: relative;
        }

        .metric-card-button:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #2f8552;
        }

        .metric-card-button:active {
          transform: translateY(1px);
        }

        .metric-expand-icon {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          font-weight: bold;
          color: #2f8552;
          font-size: 1.5rem;
        }

        .metric-explanation {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .metric-explanation p {
          font-size: 0.9rem;
          color: #555;
          line-height: 1.5;
          margin: 0.75rem 0;
        }

        .metric-context {
          background: #f0f6f3;
          padding: 0.75rem;
          border-left: 3px solid #2f8552;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #636e72;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2d3436;
          margin: 0;
        }

        .landkoala-recommendation {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .landkoala-recommendation h3 {
          margin: 0 0 1rem 0;
          color: #2d3436;
        }

        .insight-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .insight-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 0.75rem;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #b2bec3;
          transition: all 0.2s ease;
        }

        .insight-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateX(2px);
        }

        .insight-item-positive {
          border-left-color: #2f8552;
          background: #f0f9f6;
        }

        .insight-item-moderate {
          border-left-color: #b08f2d;
          background: #faf7f0;
        }

        .insight-item-caution {
          border-left-color: #b44532;
          background: #faf5f4;
        }

        .insight-icon {
          font-size: 1.25rem;
          min-width: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .insight-item-positive .insight-icon {
          color: #2f8552;
        }

        .insight-item-moderate .insight-icon {
          color: #b08f2d;
        }

        .insight-item-caution .insight-icon {
          color: #b44532;
        }

        .insight-content {
          flex: 1;
        }

        .insight-title {
          font-weight: 600;
          color: #2d3436;
          margin: 0 0 0.5rem 0;
          font-size: 0.95rem;
        }

        .insight-detail {
          margin: 0;
          color: #555;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .landkoala-action-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .landkoala-link-button {
          padding: 0.875rem 2rem;
          background: #2f8552;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
          transition: background 0.2s;
          display: inline-block;
        }

        .landkoala-link-button:hover {
          background: #245f3b;
        }

        .landkoala-footer {
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid #e0e0e0;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .footer-message {
          margin: 0;
          color: #636e72;
          font-size: 0.9rem;
        }

        .coffee-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #f4a460 0%, #e6935b 100%);
          color: white;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 500;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(244, 164, 96, 0.3);
          border: none;
          cursor: pointer;
          font-family: inherit;
        }

        .coffee-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(244, 164, 96, 0.4);
        }

        .coffee-button:active {
          transform: translateY(0);
        }

        .coffee-emoji {
          font-size: 1.2rem;
          animation: wiggle 0.5s ease-in-out infinite;
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

        .coffee-button:hover .coffee-emoji {
          animation: wiggle 0.3s ease-in-out infinite;
        }

        .coffee-text {
          font-size: 0.95rem;
        }

        .coffee-amount {
          font-weight: 700;
          font-size: 1rem;
          margin-left: 0.25rem;
        }

        .coffee-button-small {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .coffee-button-small .coffee-emoji {
          font-size: 1rem;
        }

        .coffee-button-medium {
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
        }

        .coffee-button-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        .coffee-button-large .coffee-emoji {
          font-size: 1.4rem;
        }
      `}</style>
    </div>
  );
}
