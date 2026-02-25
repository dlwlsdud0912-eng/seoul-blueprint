const NAVER_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://new.land.naver.com/complexes',
};

const TIMEOUT_MS = 5000;

export interface Area {
  areaNo: string;
  areaName: string;
  exclusiveArea: number;
}

export interface PriceResult {
  price: number;
  articleCount: number;
  areaName?: string;
}

// 평형 -> 전용면적(m2) 매핑
const PYEONG_TO_AREA: Record<number, number> = {
  17: 49,
  19: 59,
  21: 59,
  23: 72,
  24: 59,
  27: 72,
  28: 72,
  32: 84,
  34: 84,
  38: 99,
  40: 114,
  42: 114,
  43: 114,
  44: 114,
  48: 136,
};

function parsePyeong(size: string): number | null {
  const match = size.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function getTargetArea(size: string): number | null {
  // "59타입" 같은 직접 면적 지정
  if (size.includes('타입')) {
    const match = size.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }
  // "40평대" 같은 경우
  if (size.includes('평대')) {
    const match = size.match(/(\d+)/);
    if (!match) return null;
    const pyeong = parseInt(match[1], 10);
    return PYEONG_TO_AREA[pyeong] ?? null;
  }
  // "24평" 같은 경우
  const pyeong = parsePyeong(size);
  if (pyeong === null) return null;
  return PYEONG_TO_AREA[pyeong] ?? null;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: NAVER_HEADERS,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function searchComplex(name: string): Promise<string | null> {
  try {
    const url = `https://new.land.naver.com/api/search?query=${encodeURIComponent(name)}&type=apt`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    const complexes = data?.complexes;
    if (!Array.isArray(complexes) || complexes.length === 0) return null;
    return String(complexes[0].complexNo);
  } catch {
    return null;
  }
}

export async function getComplexAreas(complexId: string): Promise<Area[]> {
  try {
    const url = `https://new.land.naver.com/api/complexes/${complexId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();

    // 면적 정보는 detail.spaceList 또는 complexDetail.pyoengNames 등 여러 형태
    const spaceList = data?.complexDetail?.spaceList ?? data?.spaceList;
    if (Array.isArray(spaceList)) {
      return spaceList.map((s: Record<string, unknown>) => ({
        areaNo: String(s.spaceNo ?? s.areaNo ?? ''),
        areaName: String(s.pyeongName ?? s.areaName ?? ''),
        exclusiveArea: Number(s.exclusiveArea ?? s.exclusivePyeong ?? 0),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function findBestArea(areas: Area[], targetArea: number): Area | null {
  if (areas.length === 0) return null;

  // 전용면적이 target에 가장 가까운 것을 선택
  let best = areas[0];
  let bestDiff = Math.abs(best.exclusiveArea - targetArea);

  for (const area of areas) {
    const diff = Math.abs(area.exclusiveArea - targetArea);
    if (diff < bestDiff) {
      best = area;
      bestDiff = diff;
    }
  }
  return best;
}

function parsePrice(priceStr: string): number {
  // "11억 5,000" -> 11.5, "9억" -> 9, "15억 3,000" -> 15.3
  const cleaned = priceStr.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+)억\s*(\d*)/);
  if (!match) {
    // 억 단위가 아닌 경우 (만원 단위)
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return 0;
    return num / 10000;
  }
  const eok = parseInt(match[1], 10);
  const man = match[2] ? parseInt(match[2], 10) : 0;
  return eok + man / 10000;
}

export async function getLowestPrice(
  complexId: string,
  size?: string
): Promise<PriceResult | null> {
  try {
    const areas = await getComplexAreas(complexId);
    const targetArea = size ? getTargetArea(size) : null;

    let areaParam = '';
    let matchedAreaName: string | undefined;

    if (targetArea && areas.length > 0) {
      const best = findBestArea(areas, targetArea);
      if (best) {
        areaParam = `&areaNo=${best.areaNo}`;
        matchedAreaName = best.areaName;
      }
    }

    const url = `https://new.land.naver.com/api/articles/complex/${complexId}?realEstateType=APT&tradeType=A1${areaParam}&sameAddressGroup=true&sortedBy=prc&page=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();

    const articles = data?.articleList;
    if (!Array.isArray(articles) || articles.length === 0) return null;

    // 최저가 찾기
    let lowestPrice = Infinity;
    for (const article of articles) {
      const prc = article.dealOrWarrantPrc ?? article.warrantPrc ?? article.dealPrc;
      if (!prc) continue;
      const parsed = parsePrice(String(prc));
      if (parsed > 0 && parsed < lowestPrice) {
        lowestPrice = parsed;
      }
    }

    if (lowestPrice === Infinity) return null;

    return {
      price: Math.round(lowestPrice * 10) / 10,
      articleCount: articles.length,
      areaName: matchedAreaName,
    };
  } catch {
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
