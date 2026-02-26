/**
 * 네이버 부동산 아파트 최저가 크롤러 (API 직접호출 + 가격순 정렬)
 * puppeteer-extra + stealth로 세션 확보 → API 직접 fetch (가격순+페이지네이션)
 *
 * 사용법: node scripts/crawl-prices-browser.mjs          # 전체 크롤링
 *         npm run crawl:browser                           # 전체 크롤링
 *         node scripts/crawl-prices-browser.mjs --search "아파트이름"  # 단지ID 검색
 *         npm run crawl:search "아파트이름"               # 단지ID 검색
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── --search 모드: 네이버 부동산에서 아파트 단지ID 검색 ───
const searchArgIdx = process.argv.indexOf('--search');
if (searchArgIdx !== -1) {
  const query = process.argv[searchArgIdx + 1];
  if (!query) {
    console.error('사용법: node scripts/crawl-prices-browser.mjs --search "아파트이름"');
    console.error('예시: node scripts/crawl-prices-browser.mjs --search "보광동 신동아"');
    process.exit(1);
  }
  await discoverComplexId(query);
  process.exit(0);
}

async function discoverComplexId(query) {
  console.log(`\n=== 네이버 부동산 단지ID 검색 ===`);
  console.log(`검색어: "${query}"\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();

  // API 응답 인터셉션으로 검색 결과 캡처
  const searchResults = [];
  const responseHandler = async (res) => {
    const url = res.url();
    // 네이버 부동산 자동완성/검색 API 캡처
    if (url.includes('/api/search') && res.status() === 200) {
      try {
        const data = await res.json();
        // 자동완성 결과
        if (data?.complexes) {
          searchResults.push(...data.complexes);
        }
        // 검색 결과 리스트
        if (data?.result?.list) {
          searchResults.push(...data.result.list);
        }
      } catch {}
    }
    // 단지 자동완성 API
    if (url.includes('/api/complexes/auto-complete') && res.status() === 200) {
      try {
        const data = await res.json();
        if (data?.complexList) {
          searchResults.push(...data.complexList);
        }
      } catch {}
    }
    // 통합검색 API
    if (url.includes('/api/search/all') && res.status() === 200) {
      try {
        const data = await res.json();
        if (data?.complexes) {
          searchResults.push(...data.complexes);
        }
      } catch {}
    }
  };
  page.on('response', responseHandler);

  try {
    // 네이버 부동산 검색 페이지로 이동
    const searchUrl = `https://new.land.naver.com/search?query=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    // 검색 결과 로딩 대기
    await new Promise(r => setTimeout(r, 3000));

    // API 인터셉션으로 못 잡았으면 DOM에서 직접 추출
    if (searchResults.length === 0) {
      const domResults = await page.evaluate(() => {
        const items = [];
        // 검색 결과 링크에서 complexId 추출
        const links = document.querySelectorAll('a[href*="/complexes/"]');
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/complexes\/(\d+)/);
          if (match) {
            const name = link.textContent?.trim() || '';
            items.push({
              complexNo: match[1],
              complexName: name,
              href,
            });
          }
        });
        return items;
      });
      searchResults.push(...domResults);
    }

    // URL 리다이렉트로 직접 단지 페이지로 갔는지 확인
    const currentUrl = page.url();
    const directMatch = currentUrl.match(/\/complexes\/(\d+)/);
    if (directMatch && searchResults.length === 0) {
      // 직접 단지 페이지로 리다이렉트된 경우
      const complexInfo = await page.evaluate(() => {
        const titleEl = document.querySelector('[class*="complex_title"], [class*="ComplexTitle"], h2, h3, h4');
        const addrEl = document.querySelector('[class*="address"], [class*="Address"]');
        return {
          complexName: titleEl?.textContent?.trim() || '',
          address: addrEl?.textContent?.trim() || '',
        };
      });
      searchResults.push({
        complexNo: directMatch[1],
        complexName: complexInfo.complexName || query,
        address: complexInfo.address || '',
      });
    }

  } catch (e) {
    console.error(`검색 중 오류: ${e.message}`);
  }

  page.off('response', responseHandler);
  await browser.close();

  // 중복 제거 (complexNo 기준)
  const seen = new Set();
  const unique = searchResults.filter(r => {
    const id = r.complexNo || r.complexNumber || r.markerId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // 결과 출력
  if (unique.length === 0) {
    console.log(`"${query}" 검색 결과가 없습니다.\n`);
    console.log('팁: 정확한 아파트 단지명으로 검색해보세요.');
    console.log('예: "래미안 원베일리", "잠실엘스", "헬리오시티"');
    return;
  }

  console.log(`검색 결과: ${unique.length}건\n`);
  unique.slice(0, 10).forEach((r, i) => {
    const id = r.complexNo || r.complexNumber || r.markerId;
    const name = r.complexName || r.name || '';
    const addr = r.address || r.roadAddress || r.cortarAddress || '';
    const type = r.realEstateTypeName || r.type || 'APT';
    console.log(`  ${i + 1}. ${name}`);
    if (addr) console.log(`     주소: ${addr}`);
    console.log(`     유형: ${type}`);
    console.log(`     naverComplexId: '${id}'`);
    console.log('');
  });

  // apartments.ts 추가 가이드 출력
  if (unique.length > 0) {
    const top = unique[0];
    const id = top.complexNo || top.complexNumber || top.markerId;
    const name = top.complexName || top.name || query;
    console.log('─────────────────────────────────────────');
    console.log('apartments.ts에 추가하려면:');
    console.log('');
    console.log(`  {`);
    console.log(`    id: '${name.replace(/\s+/g, '-').toLowerCase()}',`);
    console.log(`    name: '${name}',`);
    console.log(`    district: '구이름',  // 해당 구 입력`);
    console.log(`    size: '24평',`);
    console.log(`    basePrice: 0,`);
    console.log(`    tier: '12',  // 적절한 티어 입력`);
    console.log(`    naverComplexId: '${id}',`);
    console.log(`  },`);
    console.log('');
    console.log('추가 후 npm run crawl:browser 실행 시 가격이 자동 수집됩니다.');
  }
}

// ─── 표준 면적 버킷 (59㎡, 84㎡만 — 대형평형 제외로 정확도 향상) ───
const SIZE_BUCKETS = [
  { key: '59', center: 59, tolerance: 5 },   // 54~64㎡
  { key: '84', center: 84, tolerance: 5 },   // 79~89㎡
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

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── API URL 빌더 (가격순 정렬) ───
function buildArticleApiUrl(complexId, pageNum) {
  const params = new URLSearchParams({
    realEstateType: 'APT',
    tradeType: 'A1',
    tag: '::::::::',
    rentPriceMin: '0',
    rentPriceMax: '900000000',
    priceMin: '0',
    priceMax: '900000000',
    areaMin: '0',
    areaMax: '900000000',
    showArticle: 'false',
    sameAddressGroup: 'false',
    priceType: 'RETAIL',
    page: String(pageNum),
    complexNo: complexId,
    type: 'list',
    order: 'prc',  // 가격순 정렬 (핵심!)
  });
  return `https://new.land.naver.com/api/articles/complex/${complexId}?${params}`;
}

const MAX_PAGES = 10; // 안전 상한: 최대 200매물

// ─── 단일 아파트: 직접 fetch 방식 (세션 확보 후 page 1부터 전체 면적 수집) ───
async function fetchPriceByNavigation(page, apt) {
  const complexId = apt.naverComplexId;
  const url = `https://new.land.naver.com/complexes/${complexId}?ms=37.5,127,16&a=APT&e=RETAIL&tradeType=A1`;

  // ── 1단계: 페이지 접속 (세션/쿠키 확보 + authorization 헤더 캡처) ──
  let sessionReady = false;
  let capturedHeaders = {};

  // 요청 헤더 캡처 (authorization 등 인증 헤더)
  const requestHandler = (req) => {
    if (req.url().includes('/api/articles/complex/') && Object.keys(capturedHeaders).length === 0) {
      const headers = req.headers();
      for (const [key, value] of Object.entries(headers)) {
        if (key.startsWith(':')) continue; // HTTP/2 pseudo-header 제외
        if (!['host', 'content-length', 'content-type'].includes(key.toLowerCase())) {
          capturedHeaders[key] = value;
        }
      }
    }
  };
  page.on('request', requestHandler);

  const sessionHandler = async (res) => {
    if (res.url().includes('/api/articles/complex/') && res.status() === 200) {
      sessionReady = true;
    }
  };
  page.on('response', sessionHandler);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    for (let i = 0; i < 10 && !sessionReady; i++) {
      await delay(500);
    }
  } catch (e) {
    if (!sessionReady) {
      page.off('request', requestHandler);
      page.off('response', sessionHandler);
      return { error: e.message };
    }
  }

  page.off('request', requestHandler);
  page.off('response', sessionHandler);

  if (!sessionReady) {
    console.warn(`  [${apt.name}] 세션 확보 실패 (API 응답 없음), 직접 fetch 시도`);
  }

  // ── 2단계: "전체면적" 드롭다운 선택 (안전장치 — API 파라미터가 주력이나 보험으로) ──
  // 직접 fetch가 areaMin=0, areaMax=900000000으로 전체 면적을 요청하지만,
  // 네이버가 세션 상태를 참조할 경우를 대비하여 UI에서도 전체면적 선택
  try {
    await page.evaluate(() => {
      // 드롭다운(select)에서 "전체면적" 또는 "전체" 옵션 선택
      const selects = [...document.querySelectorAll('select')];
      for (const sel of selects) {
        const options = [...sel.options];
        const allOpt = options.find(o =>
          o.text.includes('전체') || o.value === '' || o.value === 'all'
        );
        if (allOpt && !allOpt.selected) {
          sel.value = allOpt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return 'select';
        }
      }
      // 커스텀 드롭다운/버튼 방식 대응 (네이버가 select 대신 커스텀 UI 사용 시)
      // "전체 서비스 보기" 등 무관한 요소 방지: 정확히 "전체" 또는 "전체면적"만 매칭
      const candidates = [...document.querySelectorAll('button, a, span, li, div[role="tab"], div[role="option"]')];
      const allTab = candidates.find(el => {
        const text = (el.textContent || '').trim();
        return text === '전체' || text === '전체면적';
      });
      if (allTab) {
        allTab.click();
        return 'click';
      }
      return false;
    });
    await delay(1500);
  } catch (e) { /* 선택적 UI 조작, 실패해도 직접 fetch가 전체 면적 요청 */ }

  // 429 방지: 페이지 로드 API 호출 후 충분한 간격 확보
  await delay(2000);

  // ── 3단계: 직접 fetch로 전체 면적 매물 수집 (캡처된 헤더 + isMoreData 페이지네이션) ──
  const allArticles = [];

  // isMoreData 기반 페이지네이션: page 1부터 isMoreData=false가 될 때까지
  for (let p = 1; p <= MAX_PAGES; p++) {
    try {
      const result = await page.evaluate(async (apiUrl, headers) => {
        const res = await fetch(apiUrl, { headers });
        if (!res.ok) return { articles: [], isMoreData: false, httpStatus: res.status };
        const data = await res.json();
        return {
          articles: data?.articleList || [],
          isMoreData: data?.isMoreData || false,
          httpStatus: res.status,
        };
      }, buildArticleApiUrl(complexId, p), capturedHeaders);

      if (result.httpStatus === 401) {
        // 헤더 캡처 실패 시 fallback: Accept만으로 재시도
        console.warn(`  HTTP 401 (page ${p}), Accept 헤더만으로 재시도`);
        const retry = await page.evaluate(async (apiUrl) => {
          const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json, text/plain, */*' } });
          if (!res.ok) return { articles: [], isMoreData: false, httpStatus: res.status };
          const data = await res.json();
          return { articles: data?.articleList || [], isMoreData: data?.isMoreData || false, httpStatus: res.status };
        }, buildArticleApiUrl(complexId, p));
        if (retry.httpStatus === 200 && retry.articles.length > 0) {
          allArticles.push(...retry.articles);
          if (!retry.isMoreData) break;
          await delay(500);
          continue;
        }
      }

      if (result.httpStatus === 429 || result.httpStatus === 403) {
        console.warn(`  API 차단 (HTTP ${result.httpStatus}), 페이지네이션 중단`);
        break;
      }
      if (result.httpStatus !== 200 || result.articles.length === 0) break;

      allArticles.push(...result.articles);

      // isMoreData=false면 마지막 페이지
      if (!result.isMoreData) break;
    } catch (e) {
      console.warn(`  페이지 ${p} fetch 실패: ${e.message}`);
      break;
    }

    await delay(500);
  }

  if (allArticles.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // ── 4단계: 중복 제거 (articleNo 기준) ──
  const seen = new Set();
  const articles = allArticles.filter(a => {
    const key = a.articleNo || a.atclNo;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (articles.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // ── 5단계: 매매만 필터 (전세/월세 제외, 집주인인증 포함) ──
  const saleOnly = articles.filter(a => {
    const tradeType = (a.tradeTypeName || '').trim();
    const tradeCode = a.tradeTypeCode || '';
    return tradeType === '매매' || tradeCode === 'A1';
  });

  if (saleOnly.length === 0) {
    return { price: null, articleCount: 0, areaName: apt.size };
  }

  // ── 6단계: 면적별 최저가 수집 (명시적 최솟값 추적) ──
  const sizes = {};
  const bucketCounts = {};

  let bestPrice = null;
  let bestAreaName = apt.size;

  // 면적 존재 여부 확인 (매매 매물 기준)
  const bucketExists = {};
  for (const a of saleOnly) {
    const exArea = parseFloat(a.area2 || a.exclusiveArea || 0);
    for (const bucket of SIZE_BUCKETS) {
      if (Math.abs(exArea - bucket.center) <= bucket.tolerance) {
        bucketExists[bucket.key] = true;
        break;
      }
    }
  }

  // 매매 매물을 순회하며 버킷별 최저가 + 카운트 수집
  for (const article of saleOnly) {
    const exArea = parseFloat(article.area2 || article.exclusiveArea || 0);
    const dealPrice = article.dealPrc != null ? article.dealPrc : article.dealOrWarrantPrc;
    if (!dealPrice) continue;
    const parsed = parsePrice(dealPrice);
    if (parsed === null || parsed <= 0) continue;

    const rounded = Math.round(parsed * 100) / 100;
    if (bestPrice === null || rounded < bestPrice) {
      bestPrice = rounded;
      if (exArea > 0) bestAreaName = `${Math.round(exArea)}㎡`;
    }

    for (const bucket of SIZE_BUCKETS) {
      if (Math.abs(exArea - bucket.center) <= bucket.tolerance) {
        bucketCounts[bucket.key] = (bucketCounts[bucket.key] || 0) + 1;
        if (!sizes[bucket.key] || rounded < sizes[bucket.key].price) {
          sizes[bucket.key] = { price: rounded, count: 0 };
        }
        break;
      }
    }
  }

  // 버킷 카운트 업데이트
  for (const [key, count] of Object.entries(bucketCounts)) {
    if (sizes[key]) sizes[key].count = count;
  }

  // 면적은 존재하나 매매 매물이 없는 버킷 → null 처리
  for (const bucket of SIZE_BUCKETS) {
    if (bucketExists[bucket.key] && !sizes[bucket.key]) {
      sizes[bucket.key] = null;
    }
  }

  // sizes 버킷 중 최저가로 bestAreaName 보정
  for (const [key, data] of Object.entries(sizes)) {
    if (data !== null && data.price === bestPrice) {
      bestAreaName = `${key}㎡`;
    }
  }

  if (bestPrice === null) {
    return { price: null, articleCount: saleOnly.length, areaName: apt.size };
  }

  return {
    price: bestPrice,
    articleCount: saleOnly.length,
    areaName: bestAreaName,
    sizes,
  };
}

// ─── 메인 ───
async function main() {
  const startTime = Date.now();
  console.log('=== 네이버 부동산 크롤러 (API 직접호출 + 가격순 페이지네이션) ===\n');

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
        // 멀티사이즈 로그: 59㎡:9.5 | 84㎡:11.8
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
