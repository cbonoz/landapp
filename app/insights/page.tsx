import { AppHeader } from "@/app/components/AppHeader";

export default function InsightsPage() {
  return (
    <div className="landkoala-shell landkoala-shell-focus">
      <AppHeader />
      <main className="landkoala-static-page">
        <section className="landkoala-static-card">
          <p className="landkoala-kicker">Insights</p>
          <h1 className="landkoala-title">How to read LandKoala opportunity scores</h1>
          <p className="landkoala-subtitle">
            LandKoala combines demographic context and competition pressure into a transparent
            scoring model so you can compare neighborhoods quickly.
          </p>

          <section className="landkoala-static-section">
            <h2>Quick start</h2>
            <p>
              Enter a US address, select a business preset, and score a radius based on
              population, local competition, and tract-level income.
            </p>
          </section>

          <section className="landkoala-static-section">
            <h2>Scoring components</h2>
            <div className="landkoala-static-grid">
              <article className="landkoala-static-metric">
                <h3>Population</h3>
                <p>Higher nearby population increases the opportunity score.</p>
              </article>
              <article className="landkoala-static-metric">
                <h3>Competition</h3>
                <p>Lower local competitor density increases the opportunity score.</p>
              </article>
              <article className="landkoala-static-metric">
                <h3>Income</h3>
                <p>Higher tract-level median income increases opportunity confidence.</p>
              </article>
            </div>
          </section>

          <section className="landkoala-static-section">
            <h2>How to interpret map regions</h2>
            <ul>
              <li>Greener cells indicate stronger opportunity relative to nearby cells.</li>
              <li>Warmer cells indicate tighter competition and weaker near-term opportunity.</li>
              <li>
                Click any region to inspect nearest-competitor distance and local density signal.
              </li>
            </ul>
          </section>

          <section className="landkoala-static-section">
            <h2>Recommended workflow</h2>
            <ol>
              <li>Start with a broader radius to identify promising clusters.</li>
              <li>Adjust score weights to match your business strategy.</li>
              <li>Zoom in and compare neighboring cells before deciding a target zone.</li>
            </ol>
          </section>
        </section>
      </main>
    </div>
  );
}
