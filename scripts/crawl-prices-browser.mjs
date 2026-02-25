/**
 * 네이버 부동산 아파트 최저가 크롤러 (브라우저 인터셉션 방식)
 * puppeteer-extra + stealth로 각 단지 페이지 접속 → API 응답 가로채기
 *
 * 사용법: node scripts/crawl-prices-browser.mjs
 *         npm run crawl:browser
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 평형 -> 전용면적(m2) 매핑 ───
const PYEONG_TO_M2 = {
  17: 49, 19: 59, 21: 59, 23: 72, 24: 59, 27: 72, 28: 72,
  32: 84, 34: 84, 38: 99, 40: 114, 42: 114, 43: 114, 44: 114, 48: 136,
};
const PYEONGDAE_RANGES = { 40: [40, 42, 43, 44, 48] };

// ─── 표준 면적 버킷 (59㎡, 84㎡, 114㎡) ───
const SIZE_BUCKETS = [
  { key: '59', center: 59, tolerance: 5 },   // 54~64㎡
  { key: '84', center: 84, tolerance: 5 },   // 79~89㎡
  { key: '114', center: 114, tolerance: 10 }, // 104~124㎡
];

// ─── apartments.ts 파싱 ───
function parseApartmentsFile() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'apartments.ts');
  const content = fs.readFileSync(filePath, 'utf-8');
  const apartments = [];
  const objectRegex = /\{[^}]+\}/g;
  let match;
  while ((match = objectRegex.exec(content)) !== null) {
    const obj = match[0];
    const id = obj.match(/id:\s*'([^']+)'/);
    const name = obj.match(/name:\s*'([^']+)'/);
    const district = obj.match(/district:\s*'([^']+)'/);
    const size = obj.match(/size:\s*'([^']+)'/);
    const basePrice = obj.match(/basePrice:\s*([\d.]+)/);
    const tier = obj.match(/tier:\s*'([^']+)'/);
    const complexId = obj.match(/naverComplexId:\s*'([^']+)'/);
    if (id && name && district && size && basePrice && tier) {
      apartments.push({
        id: id[1], name: name[1], district: district[1],
        size: size[1], basePrice: parseFloat(basePrice[1]),
        tier: tier[1], naverComplexId: complexId ? complexId[1] : undefined,
      });
    }
  }
  return apartments;
}

// ─── 가격 파싱: "12억 5,000" -> 12.5 ───
function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = String(priceStr).replace(/\s/g, '').replace(/,/g, '');
  const eokMatch = cleaned.match(/(\d+)억(\d*)/);
  if (eokMatch) {
    const eok = parseInt(eokMatch[1], 10);
    const remainder = eokMatch[2] ? parseInt(eokMatch[2], 10) : 0;
    return eok + remainder / 10000;
  }
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10) / 10000;
  return null;
}

// ─── 사이즈 -> 타겟 전용면적 리스트 ───
function getTargetM2List(sizeStr) {
  const directMatch = sizeStr.match(/^(\d+)타입$/);
  if (directMatch) return [parseInt(directMatch[1], 10)];

  const pyeongdaeMatch = sizeStr.match(/^(\d+)평대$/);
  if (pyeongdaeMatch) {
    const base = parseInt(pyeongdaeMatch[1], 10);
    const ranges = PYEONGDAE_RANGES[base];
    if (ranges) return [...new Set(ranges.map(p => PYEONG_TO_M2[p]).filter(Boolean))];
    const m2 = PYEONG_TO_M2[base];
    return m2 ? [m2] : [];
  }

  const pyeongMatch = sizeStr.match(/^(\d+)평$/);
  if (pyeongMatch) {
    const m2 = PYEONG_TO_M2[parseInt(pyeongMatch[1], 10)];
    return m2 ? [m2] : [];
  }
  return [];
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 단일 아파트: 페이지 접속 + API 인터셉션으로 가격 추출 ───
async function fetchPriceByNavigation(page, apt) {
  const complexId = apt.naverComplexId;
  // tradeType: A1=매매 필터 적용
  const url = `https://new.land.naver.com/complexes/${complexId}?ms=37.5,127,16&a=APT&e=RETAIL&tradeType=A1`;

  // 인터셉션 결과: 모든 API 응답의 매물을 누적 수집
  const allArticles = [];
  let gotResponse = false;

  // 응답 리스너 등록 (매매=A1 응답 누적 캡처)
  const responseHandler = async (res) => {
    const resUrl = res.url();
    if (resUrl.includes('/api/articles/complex/') && res.status() === 200) {
      try {
        const data = await res.json();
        const list = data?.articleList || [];
        if (list.length > 0) {
          allArticles.push(...list);
          gotResponse = true;
        }
      } catch {}
    }
  };
  page.on('response', responseHandler);

  try {
    // 페이지 접속
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    // API 응답 대기 (최대 5초 추가)
    for (let i = 0; i < 10 && !gotResponse; i++) {
      await delay(500);
    }

    // 가격순 정렬 클릭 → 최저가 매물이 1페이지에 오도록
    // puppeteer는 :has-text 미지원 → page.evaluate로 버튼 찾기
    try {
      const clicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, a, span')];
        const btn = buttons.find(b => b.textContent && b.textContent.trim().includes('가격순'));
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (clicked) {
        await delay(2000); // 가격순 재정렬 API 호출 대기
      }
    } catch {}
  } catch (e) {
    // timeout이어도 이미 응답이 잡혔을 수 있음
    if (!gotResponse) {
      page.off('response', responseHandler);
      return { error: e.message };
    }
  }

  page.off('response', responseHandler);

  // 인터셉션 실패 시 폴백 없음
  if (allArticles.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // 중복 제거 (articleNo 기준)
  const seen = new Set();
  const articles = allArticles.filter(a => {
    const key = a.articleNo || a.atclNo || JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (articles.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // 0) 매매만 필터 (전세/월세 완전 제외)
  const saleOnly = articles.filter(a => {
    const tradeType = (a.tradeTypeName || '').trim();
    const tradeCode = a.tradeTypeCode || '';
    return tradeType === '매매' || tradeCode === 'A1';
  });

  // 매매 매물이 아예 없으면 스킵
  if (saleOnly.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // ─── 멀티버킷 수집: 59㎡, 84㎡, 114㎡ 각각의 최저가 ───
  const sizes = {};

  for (const bucket of SIZE_BUCKETS) {
    // 전체 매물(매매+전세+월세)에서 이 면적 존재 여부 확인
    const allInBucket = articles.filter(a => {
      const exArea = parseFloat(a.exclusiveArea || a.area2 || 0);
      return Math.abs(exArea - bucket.center) <= bucket.tolerance;
    });

    // 면적 자체가 없으면 스킵 (공란 처리)
    if (allInBucket.length === 0) continue;

    // 매매 매물만 필터
    const bucketArticles = saleOnly.filter(a => {
      const exArea = parseFloat(a.exclusiveArea || a.area2 || 0);
      return Math.abs(exArea - bucket.center) <= bucket.tolerance;
    });

    // 면적은 있으나 매매 매물 없음
    if (bucketArticles.length === 0) {
      sizes[bucket.key] = null;
      continue;
    }

    // 최저가 찾기 (모든 매매 매물에서)
    let bucketBest = null;
    for (const article of bucketArticles) {
      const dealPrice = article.dealPrc || article.dealOrWarrantPrc;
      if (dealPrice) {
        const parsed = parsePrice(dealPrice);
        if (parsed !== null && (bucketBest === null || parsed < bucketBest)) {
          bucketBest = parsed;
        }
      }
    }

    if (bucketBest !== null) {
      sizes[bucket.key] = {
        price: Math.round(bucketBest * 100) / 100,
        count: bucketArticles.length,
      };
    } else {
      sizes[bucket.key] = null;
    }
  }

  // ─── 전체 최저가 산출 (기존 UI 호환) ───
  let bestPrice = null;
  let bestAreaName = apt.size;

  // sizes 버킷 중 최저가 선택
  for (const [key, data] of Object.entries(sizes)) {
    if (data !== null && (bestPrice === null || data.price < bestPrice)) {
      bestPrice = data.price;
      bestAreaName = `${key}㎡`;
    }
  }

  // 버킷에 매칭되지 않은 매물도 전체 최저가 후보로 검토
  for (const article of saleOnly) {
    const dealPrice = article.dealPrc || article.dealOrWarrantPrc;
    if (dealPrice) {
      const parsed = parsePrice(dealPrice);
      if (parsed !== null && (bestPrice === null || parsed < bestPrice)) {
        bestPrice = parsed;
        const exArea = parseFloat(article.exclusiveArea || article.area2 || 0);
        if (exArea > 0) bestAreaName = `${Math.round(exArea)}㎡`;
      }
    }
  }

  if (bestPrice === null) {
    return { price: null, articleCount: saleOnly.length, areaName: apt.size };
  }

  return {
    price: Math.round(bestPrice * 100) / 100,
    articleCount: saleOnly.length,
    areaName: bestAreaName,
    sizes,
  };
}

// ─── 메인 ───
async function main() {
  const startTime = Date.now();
  console.log('=== 네이버 부동산 크롤러 (브라우저 인터셉션) ===\n');

  // 1) 아파트 데이터 로드
  const apartments = parseApartmentsFile();
  const withComplexId = apartments.filter(a => a.naverComplexId);
  const withoutComplexId = apartments.filter(a => !a.naverComplexId);

  console.log(`아파트 데이터: ${apartments.length}건 (complexId 있음: ${withComplexId.length}, 없음: ${withoutComplexId.length})`);
  if (withoutComplexId.length > 0) {
    withoutComplexId.forEach(a => console.log(`  스킵: ${a.name}`));
  }
  console.log('');

  // 2) 브라우저 실행 (headless: false 필수 - 네이버 headless 감지)
  console.log('Chrome 브라우저 실행 중... (창이 뜹니다, 닫지 마세요!)');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();

  // 3) 크롤링 실행
  const prices = {};
  let successCount = 0;
  let failCount = 0;
  const totalCount = withComplexId.length;

  for (let i = 0; i < withComplexId.length; i++) {
    const apt = withComplexId[i];
    const idx = `[${i + 1}/${totalCount}]`;

    try {
      const result = await fetchPriceByNavigation(page, apt);

      if (result.error) {
        failCount++;
        console.log(`${idx} ${apt.name} -> 실패: ${result.error}`);
      } else if (result.price) {
        prices[apt.id] = {
          price: result.price,
          articleCount: result.articleCount,
          areaName: result.areaName,
          sizes: result.sizes || {},
        };
        successCount++;
        // 멀티사이즈 로그: 59㎡:9.5 | 84㎡:11.8 | 114㎡:--
        const sizeInfo = SIZE_BUCKETS.map(b => {
          const s = result.sizes && result.sizes[b.key];
          return `${b.key}㎡:${s ? s.price : '--'}`;
        }).join(' | ');
        console.log(`${idx} ${apt.name} -> ${result.price}억 (${sizeInfo})`);
      } else {
        failCount++;
        console.log(`${idx} ${apt.name} -> 매물 없음 (매매 ${result.articleCount || 0}건)`);
      }
    } catch (e) {
      failCount++;
      console.log(`${idx} ${apt.name} -> 에러: ${e.message}`);
    }

    // 딜레이: 2초 (너무 빠르면 의심)
    if (i < withComplexId.length - 1) {
      await delay(2000);
    }
  }

  // 4) 결과 저장
  const now = new Date();
  const updatedAtKR = now.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Seoul',
  });

  const output = {
    updatedAt: now.toISOString(),
    updatedAtKR,
    totalCount,
    successCount,
    failCount,
    prices,
  };

  const outputPath = path.join(__dirname, '..', 'public', 'prices.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // 5) 브라우저 종료
  await browser.close();

  // 6) 최종 요약
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== 최종 요약 ===');
  console.log(`총 대상: ${totalCount}건`);
  console.log(`성공: ${successCount}건`);
  console.log(`실패/매물없음: ${failCount}건`);
  console.log(`소요 시간: ${elapsed}초 (약 ${(elapsed / 60).toFixed(1)}분)`);
  console.log(`저장 위치: ${outputPath}`);
  console.log('\n크롤링 완료! git push 하면 Vercel에 자동 배포됩니다.');
}

main().catch(err => {
  console.error('크롤링 중 치명적 오류:', err);
  process.exit(1);
});
