import { Tier, TierKey } from '@/types';

type TierPriceSource = {
  price?: number;
  currentPrice?: number;
  areaName?: string;
  sizes?: Record<string, { price: number; count: number } | null>;
};

export const TIERS: Tier[] = [
  { key: '10', label: '10억 이하', maxPrice: '10억 이하', cashNeeded: '-', loanAmount: '-' },
  { key: '12', label: '10억 초과~12억', maxPrice: '10억 초과~12억', cashNeeded: '-', loanAmount: '-' },
  { key: '14', label: '12억 초과~14억', maxPrice: '12억 초과~14억', cashNeeded: '-', loanAmount: '-' },
  { key: '16', label: '14억 초과~16억', maxPrice: '14억 초과~16억', cashNeeded: '-', loanAmount: '-' },
  { key: '18', label: '16억 초과~18억', maxPrice: '16억 초과~18억', cashNeeded: '-', loanAmount: '-' },
  { key: '20', label: '18억 초과~20억', maxPrice: '18억 초과~20억', cashNeeded: '-', loanAmount: '-' },
  { key: '22', label: '20억 초과~22억', maxPrice: '20억 초과~22억', cashNeeded: '-', loanAmount: '-' },
  { key: '24', label: '22억 초과~24억', maxPrice: '22억 초과~24억', cashNeeded: '-', loanAmount: '-' },
  { key: '26', label: '24억 초과~26억', maxPrice: '24억 초과~26억', cashNeeded: '-', loanAmount: '-' },
  { key: '28', label: '26억 초과~28억', maxPrice: '26억 초과~28억', cashNeeded: '-', loanAmount: '-' },
  { key: '30', label: '28억 초과~30억', maxPrice: '28억 초과~30억', cashNeeded: '-', loanAmount: '-' },
  { key: '32', label: '30억 초과~32억', maxPrice: '30억 초과~32억', cashNeeded: '-', loanAmount: '-' },
  { key: '50', label: '32억 초과', maxPrice: '32억 초과', cashNeeded: '-', loanAmount: '-' },
];

export const ALL_TIER_KEYS = TIERS.map((tier) => tier.key) as TierKey[];

export function getTierForKey(tierKey: TierKey) {
  return TIERS.find((tier) => tier.key === tierKey);
}

export function getTierLabel(tierKey: TierKey) {
  return getTierForKey(tierKey)?.label ?? tierKey;
}

export function getTierKeyForPrice(price?: number | null): TierKey {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return '10';
  }

  if (price <= 10) return '10';
  if (price <= 12) return '12';
  if (price <= 14) return '14';
  if (price <= 16) return '16';
  if (price <= 18) return '18';
  if (price <= 20) return '20';
  if (price <= 22) return '22';
  if (price <= 24) return '24';
  if (price <= 26) return '26';
  if (price <= 28) return '28';
  if (price <= 30) return '30';
  if (price <= 32) return '32';
  return '50';
}

export function getTierReferencePrice(source?: TierPriceSource | null) {
  const size59 = source?.sizes?.['59'];
  if (size59 && typeof size59.price === 'number') {
    return size59.price;
  }

  return null;
}
