export const REGION_EXCLUDED_APARTMENT_IDS = new Set<string>([]);

export function isRegionAllowedApartment(id: string) {
  return !REGION_EXCLUDED_APARTMENT_IDS.has(id);
}
