export const REGION_EXCLUDED_APARTMENT_IDS = new Set([
  'gangnam-sangnoksu',
  'gwangjin-1vzgk6l',
  'yongsan-du1f78',
  'gangnam-1l7wl7o',
  'yeongdeungpo-1rf3s58',
  'gangseo-ac5q7s',
  'mapo-h5p5f9',
  'mapo-1dagmmy',
  'seodaemun-1f44dis',
  'yangcheon-1uygemt',
  'eunpyeong-du1f78',
  'yangcheon-ao6nem',
  'junggu-1am9yfi',
]);

export function isRegionAllowedApartment(id: string) {
  return !REGION_EXCLUDED_APARTMENT_IDS.has(id);
}
