# LandKoala

LandKoala is a map-first location intelligence app for evaluating where a new business location may perform best.

It combines open geospatial and demographic data to score a selected search radius and visualize competitive pressure on an interactive map.

## What It Does

- Geocodes a US address (or uses browser location for recommendation flow).
- Pulls nearby competitors from OpenStreetMap Overpass.
- Pulls tract-level demographics from US Census ACS.
- Computes a weighted market suitability score.
- Renders competitors, search radius, and opportunity heat cells on a Leaflet map.
- Supports one-click business-type recommendation across all presets.

## Key Features

- Map-first interface with collapsible side panel.
- Analyze workflow: address + radius + business preset + score weights.
- Recommend workflow: evaluates all presets and selects the strongest option.
- Expanded business presets:
	- Coffee shop
	- Grocery
	- Gym
	- Restaurant
	- Bakery
	- Pharmacy
	- Salon
	- Daycare
	- Pet store
	- Hardware
	- Laundromat
	- Dental clinic
- Error recovery hints for provider/rate-limit failures.
- About page with source transparency and usage caveats.

## Data Sources

- OpenStreetMap Nominatim for geocoding
- OpenStreetMap Overpass for competitor POIs
- US Census ACS for tract demographics

## API Endpoints

### POST /api/analyze

Runs a market analysis for one business preset.

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

### POST /api/recommend

Scores all business presets and returns the top recommendation plus ranked options.

Example request using browser geolocation:

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

## Scoring Model

Overall score is a weighted blend of:

- Population signal
- Competition signal (higher is better when local competitor density is lower)
- Income signal

Weights are normalized so user intent is preserved even if sliders do not sum perfectly before submission.

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

## Environment

Optional for higher Census API throughput:

```bash
CENSUS_API_KEY=your_key_here
```

## Notes and Limitations

- Census data is periodic, not real-time.
- OSM completeness varies by region.
- Public Overpass/Nominatim services can rate-limit under load.
