export interface ProximityPair {
  smallSize: string;
  largeSize: string;
  smallPrice: number;
  largePrice: number;
  diff: number;       // 절대 차이 (억)
  diffPercent: number; // 퍼센트 차이
}

export interface ProximityResult {
  hasProximity: boolean;
  pairs: ProximityPair[];
}

export function checkPriceProximity(
  sizes: Record<string, { price: number; count: number } | null> | undefined,
  threshold: number = 15 // 기본 15% 이내
): ProximityResult {
  if (!sizes) return { hasProximity: false, pairs: [] };

  const sizeOrder = ['59', '84', '114'];
  const pairs: ProximityPair[] = [];

  for (let i = 0; i < sizeOrder.length - 1; i++) {
    const small = sizes[sizeOrder[i]];
    const large = sizes[sizeOrder[i + 1]];
    if (!small || !large) continue;
    if (small.price <= 0 || large.price <= 0) continue; // 0/음수 가격 방어

    const diff = large.price - small.price;
    const diffPercent = (diff / small.price) * 100;
    const absDiffPercent = Math.abs(diffPercent);

    if (absDiffPercent <= threshold) {
      pairs.push({
        smallSize: sizeOrder[i],
        largeSize: sizeOrder[i + 1],
        smallPrice: small.price,
        largePrice: large.price,
        diff: Math.round(diff * 10) / 10,
        diffPercent: Math.round(diffPercent * 10) / 10,
      });
    }
  }

  return {
    hasProximity: pairs.length > 0,
    pairs,
  };
}
