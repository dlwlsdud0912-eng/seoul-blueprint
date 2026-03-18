import { Apartment, District } from '@/types';
import { APARTMENTS } from '@/data/apartments';
import { isRegionAllowedApartment } from '@/data/region-exclusions';

const DISTRICT_OVERRIDES: Record<string, District> = {
  'seongbuk-raemian-areum': '\uB3D9\uB300\uBB38\uAD6C',
  'mapo-dangsan-jinro': '\uC601\uB4F1\uD3EC\uAD6C',
  'yeongdeungpo-dongbu-centrevil': '\uC131\uBD81\uAD6C',
  'yeongdeungpo-prior-palace': '\uAC15\uB3D9\uAD6C',
  'seongdong-raemian-wellstream': '\uB9C8\uD3EC\uAD6C',
  'songpa-raemian-estium': '\uC601\uB4F1\uD3EC\uAD6C',
  'songpa-arteon': '\uAC15\uB3D9\uAD6C',
  'songpa-centras': '\uC131\uB3D9\uAD6C',
  'dongdaemun-cheonggye-hyundai': '\uC131\uB3D9\uAD6C',
  'eunpyeong-hongeun-byuksan': '\uC11C\uB300\uBB38\uAD6C',
  'eunpyeong-hongjewon-hs': '\uC11C\uB300\uBB38\uAD6C',
  'dongdaemun-raemian-artrich': '\uC131\uBD81\uAD6C',
  'seongdong-raemian-midcounty': '\uB3D9\uB300\uBB38\uAD6C',
  'seongdong-hyundai-prime': '\uAD11\uC9C4\uAD6C',
  'mapo-dowon-samsung': '\uC6A9\uC0B0\uAD6C',
  'yongsan-hy1f33': '\uC911\uB791\uAD6C',
  'yongsan-1wh4zff': '\uB3D9\uC791\uAD6C',
  'guro-1gh3mfs': '\uB178\uC6D0\uAD6C',
  'dongdaemun-jucv80': '\uAD00\uC545\uAD6C',
  'seongdong-jucv80': '\uAD00\uC545\uAD6C',
  'eunpyeong-pe41u0': '\uAC15\uB0A8\uAD6C',
  'jongno-gstggs': '\uC11C\uB300\uBB38\uAD6C',
  'jongno-1iljs0e': '\uB3D9\uB300\uBB38\uAD6C',
  'gangbuk-r3so72': '\uC131\uBD81\uAD6C',
  'gangseo-jvag0v': '\uB178\uC6D0\uAD6C',
  'seodaemun-17epo2c': '\uC131\uBD81\uAD6C',
  'junggu-hxhcd5': '\uC131\uBD81\uAD6C',
};

const NAME_OVERRIDES: Record<string, string> = {
  'mapo-dangsan-jinro': '\uC9C4\uB85C',
  'yeongdeungpo-dongbu-centrevil': '\uAE38\uC74C\uB3D9\uBD80\uC13C\uD2B8\uB808\uBE4C',
  'songpa-arteon': '\uACE0\uB355\uC544\uB974\uD14C\uC628',
  'mapo-dowon-samsung': '\uB3C4\uC6D0\uC0BC\uC131\uB798\uBBF8\uC548',
  'yongsan-hy1f33': '\uC911\uC559\uD558\uC774\uCE20',
  'yongsan-1wh4zff': '\uC0AC\uB2F9\uC0BC\uC131',
  'eunpyeong-pe41u0': '\uB85C\uB370\uC624\uD604\uB300',
  'jongno-1iljs0e': '\uC774\uC218\uBE0C\uB77C\uC6B4\uC2A4\uD1A4',
};

const HIDDEN_APARTMENT_IDS = new Set<string>([
  // Alias row that should resolve to the crawled canonical complex.
  'gangdong-1gvrl96',
]);

export function normalizeApartment(apt: Apartment): Apartment {
  const district = DISTRICT_OVERRIDES[apt.id] ?? apt.district;
  const name = NAME_OVERRIDES[apt.id] ?? apt.name;

  if (district === apt.district && name === apt.name) {
    return apt;
  }

  return {
    ...apt,
    district,
    name,
  };
}

export function isCatalogVisibleApartment(apt: Apartment) {
  return isRegionAllowedApartment(apt.id) && !HIDDEN_APARTMENT_IDS.has(apt.id);
}

export const CATALOG_APARTMENTS: Apartment[] = APARTMENTS.filter(isCatalogVisibleApartment).map(normalizeApartment);

