/**
 * 네이버 부동산 아파트 최저가 크롤러
 * 순수 Node.js native fetch를 사용하여 네이버 부동산 API를 호출합니다.
 * (Playwright 미사용 - 네이버 자동화 브라우저 감지 우회)
 *
 * 사용법: npx tsx scripts/crawl-prices.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 인라인 타입 정의 (apartments.ts의 @/types 의존성 우회) ───
interface ApartmentData {
  id: string;
  name: string;
  district: string;
  size: string;
  basePrice: number;
  tier: string;
  naverComplexId?: string;
}

interface PriceEntry {
  price: number;
  articleCount: number;
  areaName: string;
}

interface PricesJson {
  updatedAt: string;
  updatedAtKR: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  prices: Record<string, PriceEntry>;
}

// ─── 공통 HTTP 헤더 ───
const HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://new.land.naver.com/complexes',
};

// ─── 평형 -> 전용면적(m2) 매핑 ───
const PYEONG_TO_M2: Record<number, number> = {
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

// "40평대" -> [40, 42, 43, 44, 48] 범위의 평형들을 매칭
const PYEONGDAE_RANGES: Record<number, number[]> = {
  40: [40, 42, 43, 44, 48],
};

// ─── apartments.ts 파싱 ───
function parseApartmentsFile(): ApartmentData[] {
  const projectRoot = path.resolve(__dirname, '..');
  const filePath = path.join(projectRoot, 'src', 'data', 'apartments.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const apartments: ApartmentData[] = [];

  // 각 객체 리터럴을 정규식으로 추출
  const objectRegex = /\{[^}]+\}/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(content)) !== null) {
    const obj = match[0];

    const idMatch = obj.match(/id:\s*'([^']+)'/);
    const nameMatch = obj.match(/name:\s*'([^']+)'/);
    const districtMatch = obj.match(/district:\s*'([^']+)'/);
    const sizeMatch = obj.match(/size:\s*'([^']+)'/);
    const basePriceMatch = obj.match(/basePrice:\s*([\d.]+)/);
    const tierMatch = obj.match(/tier:\s*'([^']+)'/);
    const complexIdMatch = obj.match(/naverComplexId:\s*'([^']+)'/);

    if (idMatch && nameMatch && districtMatch && sizeMatch && basePriceMatch && tierMatch) {
      apartments.push({
        id: idMatch[1],
        name: nameMatch[1],
        district: districtMatch[1],
        size: sizeMatch[1],
        basePrice: parseFloat(basePriceMatch[1]),
        tier: tierMatch[1],
        naverComplexId: complexIdMatch ? complexIdMatch[1] : undefined,
      });
    }
  }

  return apartments;
}

// ─── 가격 파싱: "12억 5,000" -> 12.5, "9억" -> 9 ───
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/\s/g, '');

  const eokMatch = cleaned.match(/(\d+)억\s*([\d,]*)/);
  if (eokMatch) {
    const eok = parseInt(eokMatch[1], 10);
    const remainder = eokMatch[2] ? parseInt(eokMatch[2].replace(/,/g, ''), 10) : 0;
    return eok + remainder / 10000;
  }

  // 억 단위가 아닌 경우 (만원 단위)
  const manMatch = cleaned.match(/([\d,]+)/);
  if (manMatch) {
    const val = parseInt(manMatch[1].replace(/,/g, ''), 10);
    return val / 10000;
  }

  return null;
}

// ─── 사이즈 문자열에서 타겟 전용면적 결정 ───
function getTargetArea(sizeStr: string): { type: 'exact'; m2: number } | { type: 'range'; m2List: number[] } | { type: 'direct'; m2: number } | null {
  // "59타입" 같은 경우 - 직접 면적 지정
  const directMatch = sizeStr.match(/^(\d+)타입$/);
  if (directMatch) {
    return { type: 'direct', m2: parseInt(directMatch[1], 10) };
  }

  // "40평대" 같은 경우
  const pyeongdaeMatch = sizeStr.match(/^(\d+)평대$/);
  if (pyeongdaeMatch) {
    const basePyeong = parseInt(pyeongdaeMatch[1], 10);
    const ranges = PYEONGDAE_RANGES[basePyeong];
    if (ranges) {
      const m2List = ranges.map(p => PYEONG_TO_M2[p]).filter(Boolean);
      return { type: 'range', m2List: Array.from(new Set(m2List)) };
    }
    // 매핑에 없으면 가장 가까운 평형 사용
    const m2 = PYEONG_TO_M2[basePyeong];
    if (m2) return { type: 'exact', m2 };
    return null;
  }

  // "24평" 같은 일반 경우
  const pyeongMatch = sizeStr.match(/^(\d+)평$/);
  if (pyeongMatch) {
    const pyeong = parseInt(pyeongMatch[1], 10);
    const m2 = PYEONG_TO_M2[pyeong];
    if (m2) return { type: 'exact', m2 };
    return null;
  }

  return null;
}

// ─── 면적 매칭: spaceList에서 타겟 면적에 가장 맞는 areaNo 찾기 ───
function findMatchingAreaNos(
  spaceList: Array<{ pyeong: string; supplySpace: number; exclusiveSpace: number; areaNo: string; spaceTypeName: string }>,
  sizeStr: string,
): { areaNo: string; areaName: string }[] {
  const target = getTargetArea(sizeStr);
  if (!target || !spaceList || spaceList.length === 0) return [];

  if (target.type === 'direct') {
    // "59타입" -> exclusiveSpace가 59 근처인 것들 매칭
    const matched = spaceList.filter(s => Math.abs(s.exclusiveSpace - target.m2) <= 3);
    if (matched.length > 0) {
      return matched.map(s => ({ areaNo: s.areaNo, areaName: s.spaceTypeName || `${Math.round(s.exclusiveSpace)}` }));
    }
    // 정확한 매칭이 없으면 가장 가까운 것
    const sorted = [...spaceList].sort((a, b) => Math.abs(a.exclusiveSpace - target.m2) - Math.abs(b.exclusiveSpace - target.m2));
    if (sorted.length > 0 && Math.abs(sorted[0].exclusiveSpace - target.m2) <= 10) {
      return [{ areaNo: sorted[0].areaNo, areaName: sorted[0].spaceTypeName || `${Math.round(sorted[0].exclusiveSpace)}` }];
    }
    return [];
  }

  if (target.type === 'range') {
    // "40평대" -> 여러 면적 중 매칭되는 것들
    const matched = spaceList.filter(s =>
      target.m2List.some(m2 => Math.abs(s.exclusiveSpace - m2) <= 3),
    );
    if (matched.length > 0) {
      return matched.map(s => ({ areaNo: s.areaNo, areaName: s.spaceTypeName || `${Math.round(s.exclusiveSpace)}` }));
    }
    return [];
  }

  // 'exact' 타입
  const matched = spaceList.filter(s => Math.abs(s.exclusiveSpace - target.m2) <= 3);
  if (matched.length > 0) {
    return matched.map(s => ({ areaNo: s.areaNo, areaName: s.spaceTypeName || `${Math.round(s.exclusiveSpace)}` }));
  }

  // 정확한 매칭이 없으면 가장 가까운 것
  const sorted = [...spaceList].sort((a, b) => Math.abs(a.exclusiveSpace - target.m2) - Math.abs(b.exclusiveSpace - target.m2));
  if (sorted.length > 0 && Math.abs(sorted[0].exclusiveSpace - target.m2) <= 10) {
    return [{ areaNo: sorted[0].areaNo, areaName: sorted[0].spaceTypeName || `${Math.round(sorted[0].exclusiveSpace)}` }];
  }

  return [];
}

// ─── 딜레이 유틸 ───
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Node.js native fetch로 API 호출 (429 재시도 포함) ───
async function fetchApi(url: string, aptName: string, idx: string): Promise<any> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 30_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: HEADERS });

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        console.log(`${idx} ${aptName} -> 429 rate limit, 30초 대기 후 재시도... (${attempt}/${MAX_RETRIES})`);
        await delay(RETRY_DELAY_MS);
        continue;
      } else {
        throw new Error(`429 rate limit (${MAX_RETRIES}회 재시도 실패)`);
      }
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  }
}

// ─── 단지 정보 조회 (spaceList 포함) ───
async function getComplexInfo(complexId: string, aptName: string, idx: string): Promise<any> {
  const url = `https://new.land.naver.com/api/complexes/${complexId}`;
  return fetchApi(url, aptName, idx);
}

// ─── 매물 조회 ───
async function getArticles(complexId: string, areaNo: string | undefined, aptName: string, idx: string): Promise<any> {
  let url = `https://new.land.naver.com/api/articles/complex/${complexId}?realEstateType=APT&tradeType=A1&sameAddressGroup=true&sortedBy=prc&page=1`;
  if (areaNo) {
    url += `&areaNo=${areaNo}`;
  }
  return fetchApi(url, aptName, idx);
}

// ─── 단일 아파트 가격 조회 ───
async function fetchApartmentPrice(
  apt: ApartmentData,
  idx: string,
): Promise<{ price: number; articleCount: number; areaName: string } | null> {
  const complexId = apt.naverComplexId!;

  // 1) 단지 정보에서 spaceList 가져오기
  let areaNos: { areaNo: string; areaName: string }[] = [];
  try {
    const complexInfo = await getComplexInfo(complexId, apt.name, idx);
    const spaceList = complexInfo?.complexDetail?.spaceList || complexInfo?.spaceList || [];
    if (spaceList.length > 0) {
      areaNos = findMatchingAreaNos(spaceList, apt.size);
    }
  } catch (e: any) {
    // spaceList 못 가져와도 전체 매물에서 시도
    // 단, 429 에러면 상위로 전파
    if (e.message && e.message.includes('429')) throw e;
  }

  // 2) 매물 조회
  let bestPrice: number | null = null;
  let totalArticleCount = 0;
  let bestAreaName = '';

  if (areaNos.length > 0) {
    // 매칭된 면적별로 조회
    for (const { areaNo, areaName } of areaNos) {
      try {
        const data = await getArticles(complexId, areaNo, apt.name, idx);
        const articles = data?.articleList || [];
        totalArticleCount += articles.length;

        for (const article of articles) {
          const dealPrice = article.dealOrWarrantPrc || article.dealPrice;
          if (dealPrice) {
            const parsed = parsePrice(dealPrice);
            if (parsed !== null && (bestPrice === null || parsed < bestPrice)) {
              bestPrice = parsed;
              bestAreaName = areaName;
            }
          }
        }
      } catch (e: any) {
        // 개별 면적 실패 시 계속 진행 (429는 전파)
        if (e.message && e.message.includes('429')) throw e;
      }
    }
  } else {
    // 면적 필터 없이 전체 조회
    const data = await getArticles(complexId, undefined, apt.name, idx);
    const articles = data?.articleList || [];
    totalArticleCount = articles.length;

    for (const article of articles) {
      const dealPrice = article.dealOrWarrantPrc || article.dealPrice;
      if (dealPrice) {
        const parsed = parsePrice(dealPrice);
        if (parsed !== null && (bestPrice === null || parsed < bestPrice)) {
          bestPrice = parsed;
          bestAreaName = apt.size;
        }
      }
    }
  }

  if (bestPrice === null) return null;

  return {
    price: Math.round(bestPrice * 100) / 100,
    articleCount: totalArticleCount,
    areaName: bestAreaName,
  };
}

// ─── 메인 ───
async function main() {
  const startTime = Date.now();

  console.log('=== 네이버 부동산 아파트 최저가 크롤러 (native fetch) ===\n');

  // 1) 아파트 데이터 파싱
  const apartments = parseApartmentsFile();
  console.log(`아파트 데이터 로드: ${apartments.length}건`);

  const withComplexId = apartments.filter(a => a.naverComplexId);
  const withoutComplexId = apartments.filter(a => !a.naverComplexId);

  console.log(`  - naverComplexId 있음: ${withComplexId.length}건`);
  console.log(`  - naverComplexId 없음 (스킵): ${withoutComplexId.length}건`);
  if (withoutComplexId.length > 0) {
    withoutComplexId.forEach(a => console.log(`    > ${a.name} (${a.id})`));
  }
  console.log('');

  // 2) 각 아파트별 가격 조회
  const prices: Record<string, PriceEntry> = {};
  let successCount = 0;
  let failCount = 0;
  const totalCount = withComplexId.length;

  for (let i = 0; i < withComplexId.length; i++) {
    const apt = withComplexId[i];
    const idx = `[${i + 1}/${totalCount}]`;

    try {
      const result = await fetchApartmentPrice(apt, idx);

      if (result) {
        prices[apt.id] = {
          price: result.price,
          articleCount: result.articleCount,
          areaName: result.areaName,
        };
        successCount++;
        console.log(`${idx} ${apt.name} -> ${result.price}억 (${result.articleCount}건, ${result.areaName})`);
      } else {
        failCount++;
        console.log(`${idx} ${apt.name} -> 매물 없음`);
      }
    } catch (e: any) {
      failCount++;
      console.log(`${idx} ${apt.name} -> 실패: ${e.message}`);
    }

    // rate limit 방지 딜레이 (마지막 항목 제외)
    if (i < withComplexId.length - 1) {
      await delay(2000);
    }
  }

  // 3) 결과 저장
  const now = new Date();
  const updatedAtKR = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });

  const result: PricesJson = {
    updatedAt: now.toISOString(),
    updatedAtKR,
    totalCount,
    successCount,
    failCount,
    prices,
  };

  const projectRoot = path.resolve(__dirname, '..');
  const outputPath = path.join(projectRoot, 'public', 'prices.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  // 4) 최종 요약
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=== 최종 요약 ===');
  console.log(`총 대상: ${totalCount}건`);
  console.log(`성공: ${successCount}건`);
  console.log(`실패: ${failCount}건`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log(`저장 위치: ${outputPath}`);
  console.log('\n크롤링 완료!');
}

main().catch(err => {
  console.error('크롤링 중 치명적 오류:', err);
  process.exit(1);
});
