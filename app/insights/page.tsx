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
            The current scoring model blends three transparent components so users can reason
            about location tradeoffs quickly.
          </p>
          <ul>
            <li>Population: higher nearby population increases opportunity score.</li>
            <li>Competition: lower local competitor density increases opportunity score.</li>
            <li>Income: higher tract-level median income increases opportunity score.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
