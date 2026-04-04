import { AppHeader } from "@/app/components/AppHeader";

export default function DataSourcesPage() {
  return (
    <div className="landkoala-shell landkoala-shell-focus">
      <AppHeader />
      <main className="landkoala-static-page">
        <section className="landkoala-static-card">
          <p className="landkoala-kicker">Data Sources</p>
          <h1 className="landkoala-title">Open datasets powering LandKoala</h1>
          <ul>
            <li>
              OpenStreetMap Nominatim: geocodes addresses to latitude/longitude for map analysis.
            </li>
            <li>
              OpenStreetMap Overpass: returns existing businesses (POIs) used for competition
              density.
            </li>
            <li>
              US Census ACS: provides tract-level demographics like population and median income.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
