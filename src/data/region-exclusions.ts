export const REGION_EXCLUDED_APARTMENT_IDS = new Set<string>([
  // Non-Seoul complexes that were accidentally matched by name similarity.
  'mapo-coolong',
  'gangnam-purunmaeul',
  'seodaemun-h9neqy',
]);

export function isRegionAllowedApartment(id: string) {
  return !REGION_EXCLUDED_APARTMENT_IDS.has(id);
}
