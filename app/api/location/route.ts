import { NextRequest, NextResponse } from "next/server";

type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

type NominatimReverseResult = {
  display_name?: string;
};

type Suggestion = {
  label: string;
  lat: number;
  lon: number;
};

function buildUserAgent(req: NextRequest): string {
  const forwarded = req.headers.get("user-agent");
  if (forwarded && forwarded.trim().length > 0) {
    return `LandKoala/0.1 (${forwarded.slice(0, 120)})`;
  }

  return "LandKoala/0.1 (address assist)";
}

async function fetchAddressSuggestions(q: string, req: NextRequest): Promise<Suggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("format", "jsonv2");

  const response = await fetch(url, {
    headers: {
      "User-Agent": buildUserAgent(req),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Address search failed.");
  }

  const rows = (await response.json()) as NominatimSearchResult[];

  return rows
    .map((row) => {
      const lat = Number(row.lat);
      const lon = Number(row.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !row.display_name) {
        return null;
      }

      return {
        label: row.display_name,
        lat,
        lon,
      };
    })
    .filter((row): row is Suggestion => row !== null);
}

async function reverseGeocode(lat: number, lon: number, req: NextRequest): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("format", "jsonv2");

  const response = await fetch(url, {
    headers: {
      "User-Agent": buildUserAgent(req),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const payload = (await response.json()) as NominatimReverseResult;
  return payload.display_name ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lon = Number(request.nextUrl.searchParams.get("lon"));

    if (q.length > 0) {
      if (q.length < 3) {
        return NextResponse.json({ suggestions: [] });
      }

      const suggestions = await fetchAddressSuggestions(q, request);
      return NextResponse.json({ suggestions });
    }

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const address = await reverseGeocode(lat, lon, request);
      return NextResponse.json({ address });
    }

    return NextResponse.json(
      { error: "Provide either q (for search) or lat/lon (for reverse geocode)." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Location lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}