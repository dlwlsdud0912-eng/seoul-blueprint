import { PriceMap } from '@/types';

const PRICE_CACHE_KEY = 'seoul-apt-prices';
const COMPLEX_ID_CACHE_KEY = 'seoul-apt-complex-ids';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1시간

interface PriceCache {
  prices: PriceMap;
  updatedAt: number; // timestamp
}

// 가격 캐시 저장
export function savePriceCache(prices: PriceMap): void {
  if (typeof window === 'undefined') return;
  try {
    const cache: PriceCache = { prices, updatedAt: Date.now() };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded 등 무시 */ }
}

// 가격 캐시 로드 (1시간 이내만 유효)
export function loadPriceCache(): { prices: PriceMap; updatedAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const cache: PriceCache = JSON.parse(raw);
    const age = Date.now() - cache.updatedAt;
    if (age > CACHE_DURATION_MS) return null; // 만료
    return { prices: cache.prices, updatedAt: cache.updatedAt };
  } catch { return null; }
}

// 마지막 갱신 시각 가져오기
export function getLastUpdatedTime(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    const cache: PriceCache = JSON.parse(raw);
    return new Date(cache.updatedAt).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return null; }
}

// ComplexId 캐시 (발견된 complexId를 저장해서 재사용)
export function saveComplexIdCache(mapping: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadComplexIdCache();
    const merged = { ...existing, ...mapping };
    localStorage.setItem(COMPLEX_ID_CACHE_KEY, JSON.stringify(merged));
  } catch {}
}

export function loadComplexIdCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COMPLEX_ID_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
