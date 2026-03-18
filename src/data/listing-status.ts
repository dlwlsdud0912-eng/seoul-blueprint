import type { PriceResult } from '@/types';

const MISSING_LISTING_REASONS: Record<string, string[]> = {
  'gwangjin-1526cdl': ['매매 0건'],
  'seocho-6vqyh0': ['매매 0건'],
  'seocho-hxcatj': ['매매 0건'],
  'yeongdeungpo-1rf3s58': ['59/84㎡ 없음', '매매 4건'],
  'gwangjin-1l6nir3': ['매매 0건'],
  'dongdaemun-1ybwx64': ['매매 0건'],
  'yeongdeungpo-1x1yxpt': ['매매 0건'],
  'eunpyeong-1hojldz': ['매매 0건'],
  'eunpyeong-omz64l': ['매매 0건'],
  'yeongdeungpo-1ben2r4': ['매매 0건'],
};

function extractAreaFloor(areaName?: string) {
  const match = areaName?.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]);
}

function uniqueBadges(badges: Array<string | null | undefined>) {
  return [...new Set(badges.filter(Boolean) as string[])];
}

export function getListingStatusBadges(apartmentId: string, livePrice?: PriceResult) {
  const fixedReason = MISSING_LISTING_REASONS[apartmentId];
  if (fixedReason) return fixedReason;
  if (!livePrice) return [];

  const size59 = livePrice.sizes?.['59'];
  const size84 = livePrice.sizes?.['84'];
  const has59 = !!size59 && typeof size59.price === 'number';
  const has84 = !!size84 && typeof size84.price === 'number';
  const areaFloor = extractAreaFloor(livePrice.areaName);

  if (!has59 && !has84) {
    return uniqueBadges([
      '59/84㎡ 없음',
      areaFloor
        ? areaFloor >= 59
          ? `최소평형 ${areaFloor}㎡부터`
          : `${areaFloor}㎡ 위주`
        : null,
    ]);
  }

  return uniqueBadges([
    has59 ? null : '59㎡ 없음',
    has84 ? null : '84㎡ 없음',
  ]);
}
