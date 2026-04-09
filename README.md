# LandKoala 🗺️

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cbonoz/landapp)

**Free location intelligence for business site selection.**

LandKoala helps entrepreneurs and small business owners find the best locations for their next venture using open geospatial and demographic data. No expensive market research reports required.

🌐 **Live Demo:** [landkoala.com](https://landkoala.com)

---

## What is LandKoala?

LandKoala is a **map-first location intelligence platform** that combines:
- 📍 **Geocoding** — Convert addresses to precise coordinates
- 🏪 **Competitor Analysis** — Map nearby businesses from OpenStreetMap
- 👥 **Demographics** — Census tract data on population and income
- 📊 **Scoring** — Weighted market suitability algorithm
- 🗺️ **Visualization** — Interactive maps with heat cells and competitor markers

Perfect for evaluating locations for:
- Coffee shops & cafés
- Restaurants & bakeries
- Gyms & fitness centers
- Retail stores & pharmacies
- Service businesses (salons, dental, daycare)

---

## Key Features

### 🔍 Location Analysis
Enter any US address, select a search radius (1-10km), and choose your business type. LandKoala analyzes the area and scores it based on:
- **Population density** — More people = more potential customers
- **Competition level** — Lower competition = higher opportunity
- **Income levels** — Target the right demographic

### 🎯 Business Recommendations
Not sure what business to start? Use our recommendation engine to evaluate all supported business types for your location and discover the best fit.

### 📱 Map-First Interface
- Interactive Leaflet maps with competitor markers
- Search radius visualization
- Opportunity heat cells
- Collapsible side panel for data and controls

### 💾 Free Data Sources
- **OpenStreetMap** — Nominatim geocoding & Overpass POI data
- **US Census ACS** — Tract-level demographics
- No API keys required for basic usage

---

## Supported Business Types

- ☕ Coffee shop
- 🍽️ Restaurant
- 🏋️ Gym
- 🥖 Bakery
- 💊 Pharmacy
- 🛒 Grocery
- ✂️ Salon/Barbershop
- 👶 Daycare
- 🐾 Pet store
- 🛠️ Hardware store
- 🧺 Laundromat
- 🦷 Dental clinic

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Maps:** [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/)
- **Data:** US Census ACS API, OpenStreetMap Overpass/Nominatim

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/cbonoz/landapp.git
cd landapp

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Optional)

For higher Census API rate limits:

```bash
CENSUS_API_KEY=your_census_api_key_here
```

Get your free key at [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html)

---

## API Reference

### POST /api/analyze

Analyze a specific location for one business type.

**Request:**
```json
{
  "address": "Boston, MA",
  "radiusKm": 3,
  "businessPreset": "coffee",
  "weights": {
    "population": 50,
    "competition": 35,
    "income": 15
  }
}
```

### POST /api/recommend

Get recommendations across all business types using browser geolocation.

**Request:**
```json
{
  "radiusKm": 3,
  "lat": 42.3601,
  "lon": -71.0589,
  "weights": {
    "population": 50,
    "competition": 35,
    "income": 15
  }
}
```

---

## How It Works

### Scoring Algorithm

The market suitability score is a weighted blend of three signals:

1. **Population Signal** — Normalized population density in the search radius
2. **Competition Signal** — Inverse of competitor density (fewer competitors = higher score)
3. **Income Signal** — Median household income compared to regional averages

Weights are normalized so your preferences are preserved even if they don't sum to 100.

### Data Flow

```
Address/Coords → Geocode → Census Tracts → Demographics
                     ↓
              Overpass API → Competitor POIs → Scoring → Map
```

---

## Use Cases

- **First-time entrepreneurs** — Validate location ideas before signing a lease
- **Franchise owners** — Compare multiple potential sites objectively
- **Real estate investors** — Identify underserved markets for commercial properties
- **Economic developers** — Understand local business gaps

---

## Limitations

- Census data is periodic (annual updates), not real-time
- OpenStreetMap completeness varies by region
- Public Overpass/Nominatim services may rate-limit under heavy load
- Analysis is limited to US locations

---

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

Areas for improvement:
- Additional business presets
- International location support
- Historical trend analysis
- Property cost integration

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Related Projects

- [OpenStreetMap](https://www.openstreetmap.org/) — Open geospatial data
- [US Census Bureau](https://www.census.gov/) — American Community Survey
- [Leaflet](https://leafletjs.com/) — Open-source JavaScript maps

---

<p align="center">
  Built with 🦘 by <a href="https://github.com/cbonoz">cbonoz</a>
</p>
