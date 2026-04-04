import { AppHeader } from "@/app/components/AppHeader";

export default function DataSourcesPage() {
  return (
    <div className="landkoala-shell landkoala-shell-focus">
      <AppHeader />
      <main className="landkoala-static-page">
        <section className="landkoala-static-card">
          <p className="landkoala-kicker">Data Sources</p>
          <h1 className="landkoala-title">Open datasets powering LandKoala</h1>

          <section className="landkoala-static-section">
            <div className="landkoala-static-grid">
              <article className="landkoala-static-metric">
                <h3>OpenStreetMap Nominatim</h3>
                <p>Converts user-entered addresses into map-ready coordinates.</p>
                <small>Role: geocoding and search center placement.</small>
              </article>

              <article className="landkoala-static-metric">
                <h3>OpenStreetMap Overpass</h3>
                <p>Retrieves nearby businesses and points of interest for competition analysis.</p>
                <small>Role: competitor density and proximity signals.</small>
              </article>

              <article className="landkoala-static-metric">
                <h3>US Census ACS</h3>
                <p>Provides tract-level demographics used in baseline market scoring.</p>
                <small>Role: population and median income context.</small>
              </article>
            </div>
          </section>

          <section className="landkoala-static-section">
            <h2>Why this stack</h2>
            <ul>
              <li>Free and open for MVP and moderate usage.</li>
              <li>Strong US coverage for demographic and POI overlays.</li>
              <li>Simple API integration with transparent scoring inputs.</li>
            </ul>
          </section>

          <section className="landkoala-static-section">
            <h2>Known limitations</h2>
            <ul>
              <li>ACS values are periodic and not real-time.</li>
              <li>OSM completeness depends on local contributor coverage.</li>
              <li>Public endpoints can rate-limit under high request volume.</li>
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}
