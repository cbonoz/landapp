# LandKoala

LandKoala is a map-first location intelligence app for evaluating where a new store might perform best.

The current version is a US-first MVP that lets a user search an address, choose a business type, and score a radius based on:

- nearby competitor density
- local population
- median household income

The UI is intentionally map-centric: the map is the default workspace, and controls live in a collapsible action bar.

## Concept

LandKoala combines open, free data to estimate market opportunity quickly:

1. User enters a location query (address + radius + business preset)
2. App geocodes the address to coordinates
3. App fetches competitor POIs in the search area
4. App fetches Census tract demographics for context
5. App computes transparent weighted scoring
6. App renders results directly on the map with pins, radius overlay, and summary metrics

## Data Sources

- Geocoding from OpenStreetMap Nominatim
- Competitor POIs from OpenStreetMap Overpass
- Demographics from US Census ACS

## Current MVP Features

- Map-first UI with header/navigation and collapsible action bar
- Address + radius query workflow
- Fixed business presets: coffee, grocery, gym, restaurant
- Transparent weighted scoring: population, competition, income
- Competitor pins, center marker, and search radius overlay on Leaflet map
- Closest-competitor list and score breakdown

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Leaflet + react-leaflet

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment Variables

For higher Census API throughput, set:

```bash
CENSUS_API_KEY=your_key_here
```

## API Contract

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
- tract-level demographics (population + median income)
- competitor count and nearby sample points
- normalized weighted score breakdown

## Scoring Notes

The overall score is a weighted blend of normalized components:

- population component
- competition component (higher is better when competitor density is lower)
- income component

User-provided weights are normalized before scoring so relative intent is preserved.

## Project Status

This is an MVP foundation focused on rapid exploration and iteration. Planned next enhancements include:

- richer map interactions and layer toggles
- optional caching/rate-limit resilience improvements
- improved candidate-zone ranking within the selected radius

## Caveats

- Census data updates periodically, not in real time.
- OSM completeness varies by area.
- Public Overpass/Nominatim endpoints are rate-limited; production should add caching.
