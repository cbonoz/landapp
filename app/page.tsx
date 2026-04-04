"use client";

import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/app/components/AppHeader";
import { BUSINESS_PRESETS } from "@/app/lib/business-presets";
import type { AnalyzeResponse, BusinessPreset } from "@/app/lib/types";

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

const presetOptions = Object.entries(BUSINESS_PRESETS) as Array<
  [BusinessPreset, (typeof BUSINESS_PRESETS)[BusinessPreset]]
>;

export default function Home() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [address, setAddress] = useState("Boston, MA");
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

  const weightTotal = useMemo(
    () => populationWeight + competitionWeight + incomeWeight,
    [populationWeight, competitionWeight, incomeWeight],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        return;
      }

      setAnalysis({ loading: false, error: null, result: payload });
    } catch {
      setAnalysis({
        loading: false,
        error: "Network error. Please try again.",
        result: null,
      });
    }
  }

  return (
    <div className="landkoala-shell landkoala-shell-focus">
      <AppHeader panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((value) => !value)} />

      <main className="landkoala-stage" id="map-view">
        <ResultsMap result={analysis.result} />

        <aside className={`landkoala-actionbar ${panelOpen ? "is-open" : ""}`}>
          <div className="landkoala-actionbar-head">
            <p className="landkoala-kicker">LandKoala</p>
            <button type="button" onClick={() => setPanelOpen((value) => !value)}>
              {panelOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          <div className="landkoala-actionbar-content">
            <h1 className="landkoala-title">Find underserved store locations in minutes</h1>
            <p className="landkoala-subtitle">
              Enter a US address, select a business preset, and score a radius based on
              population, local competition, and tract-level income.
            </p>

            <form className="landkoala-form" onSubmit={onSubmit}>
              <label>
                Search address
                <input
                  required
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Cambridge, MA"
                />
              </label>

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
                    onChange={(event) => setBusinessPreset(event.target.value as BusinessPreset)}
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
                    onChange={(event) => setPopulationWeight(Number(event.target.value))}
                  />
                </label>
                <label>
                  Competition weight
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={competitionWeight}
                    onChange={(event) => setCompetitionWeight(Number(event.target.value))}
                  />
                </label>
                <label>
                  Income weight
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={incomeWeight}
                    onChange={(event) => setIncomeWeight(Number(event.target.value))}
                  />
                </label>
              </div>

              <p className="landkoala-hint">Current weight total: {weightTotal}</p>

              <button type="submit" disabled={analysis.loading}>
                {analysis.loading ? "Scoring area..." : "Analyze market"}
              </button>
            </form>

            {analysis.error ? <p className="landkoala-error">{analysis.error}</p> : null}

            <section id="insights">
              {!analysis.result && !analysis.loading ? (
                <p className="landkoala-muted">
                  Run an analysis to view score and competitor sample.
                </p>
              ) : null}

              {analysis.result ? (
                <>
                  <div className="landkoala-score-card">
                    <p>Overall suitability</p>
                    <strong>{analysis.result.score.overall}/100</strong>
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
                  <ul className="landkoala-competitor-list">
                    {analysis.result.competition.sample.map((competitor) => (
                      <li key={`${competitor.id}-${competitor.lat}`}>
                        <span>{competitor.name ?? "Unnamed place"}</span>
                        <strong>{competitor.distanceKm.toFixed(2)} km</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <section id="data-sources" className="landkoala-datasources">
              <h3 className="landkoala-section-subtitle">Data sources</h3>
              <ul>
                <li>OpenStreetMap Nominatim for geocoding</li>
                <li>OpenStreetMap Overpass for competitor points of interest</li>
                <li>US Census ACS for population and income context</li>
              </ul>
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}
