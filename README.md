# LandKoala

LandKoala is a US-first site-selection prototype that scores store opportunities using free data sources.

## Data sources

- Geocoding from OpenStreetMap Nominatim
- Competitor POIs from OpenStreetMap Overpass
- Demographics from US Census ACS

## Current MVP scope

- Address + radius input
- Fixed competitor presets (coffee, grocery, gym, restaurant)
- Transparent weighted scoring (population, competition, income)
- Closest-competitor sample output

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Optional environment variables

For higher Census API throughput, set:

```bash
CENSUS_API_KEY=your_key_here
```

## API contract

`POST /api/analyze`

Example request:

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

Response includes:

- geocoded center + bounding box
- tract-level demographics
- competitor count and nearby sample
- score breakdown + normalized weights

## Caveats

- Census data updates periodically, not in real time.
- OSM completeness varies by area.
- Public Overpass/Nominatim endpoints are rate-limited; production should add caching.
