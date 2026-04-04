import type { BusinessPreset } from "@/app/lib/types";

export type OverpassTag = {
  key: string;
  value: string;
};

export const BUSINESS_PRESETS: Record<
  BusinessPreset,
  { label: string; description: string; competitorTags: OverpassTag[] }
> = {
  coffee: {
    label: "Coffee shop",
    description: "Cafe and coffee-focused storefronts",
    competitorTags: [
      { key: "amenity", value: "cafe" },
      { key: "shop", value: "coffee" },
    ],
  },
  grocery: {
    label: "Grocery",
    description: "Supermarkets, convenience, and specialty food stores",
    competitorTags: [
      { key: "shop", value: "supermarket" },
      { key: "shop", value: "convenience" },
      { key: "shop", value: "greengrocer" },
    ],
  },
  gym: {
    label: "Gym",
    description: "Fitness centers and sports facilities",
    competitorTags: [
      { key: "leisure", value: "fitness_centre" },
      { key: "amenity", value: "gym" },
      { key: "leisure", value: "sports_centre" },
    ],
  },
  restaurant: {
    label: "Restaurant",
    description: "Sit-down and quick-service restaurants",
    competitorTags: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "fast_food" },
    ],
  },
};

export function isBusinessPreset(value: string): value is BusinessPreset {
  return Object.hasOwn(BUSINESS_PRESETS, value);
}
