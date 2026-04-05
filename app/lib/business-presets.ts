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
  bakery: {
    label: "Bakery",
    description: "Bakeries and pastry-focused shops",
    competitorTags: [
      { key: "shop", value: "bakery" },
      { key: "shop", value: "pastry" },
      { key: "shop", value: "confectionery" },
    ],
  },
  pharmacy: {
    label: "Pharmacy",
    description: "Pharmacies and chemist-style stores",
    competitorTags: [
      { key: "amenity", value: "pharmacy" },
      { key: "shop", value: "chemist" },
      { key: "shop", value: "drugstore" },
    ],
  },
  salon: {
    label: "Salon",
    description: "Hair, beauty, and barber services",
    competitorTags: [
      { key: "shop", value: "hairdresser" },
      { key: "shop", value: "beauty" },
      { key: "shop", value: "barber" },
    ],
  },
  daycare: {
    label: "Daycare",
    description: "Childcare and early-learning facilities",
    competitorTags: [
      { key: "amenity", value: "childcare" },
      { key: "amenity", value: "kindergarten" },
      { key: "amenity", value: "nursery" },
    ],
  },
  pet: {
    label: "Pet store",
    description: "Pet supply and related services",
    competitorTags: [
      { key: "shop", value: "pet" },
      { key: "amenity", value: "veterinary" },
      { key: "shop", value: "pet_grooming" },
    ],
  },
  hardware: {
    label: "Hardware",
    description: "Hardware and home-improvement retail",
    competitorTags: [
      { key: "shop", value: "hardware" },
      { key: "shop", value: "doityourself" },
      { key: "shop", value: "trade" },
    ],
  },
  laundromat: {
    label: "Laundromat",
    description: "Self-service laundry and dry cleaning",
    competitorTags: [
      { key: "shop", value: "laundry" },
      { key: "shop", value: "dry_cleaning" },
      { key: "amenity", value: "laundry" },
    ],
  },
  dental: {
    label: "Dental clinic",
    description: "Dentists and oral care providers",
    competitorTags: [
      { key: "amenity", value: "dentist" },
      { key: "healthcare", value: "dentist" },
      { key: "healthcare", value: "clinic" },
    ],
  },
};

export function isBusinessPreset(value: string): value is BusinessPreset {
  return Object.hasOwn(BUSINESS_PRESETS, value);
}
