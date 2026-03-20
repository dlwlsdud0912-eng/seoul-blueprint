import { Apartment } from '@/types';
import { APARTMENTS } from '@/data/apartments';
import { isRegionAllowedApartment } from '@/data/region-exclusions';

export function normalizeApartment(apt: Apartment): Apartment {
  return apt;
}

export function isCatalogVisibleApartment(apt: Apartment) {
  return isRegionAllowedApartment(apt.id);
}

export const CATALOG_APARTMENTS: Apartment[] = APARTMENTS.filter(isCatalogVisibleApartment).map(normalizeApartment);
