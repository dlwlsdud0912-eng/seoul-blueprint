import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCLUSIVE_MIN = 96;
const EXCLUSIVE_MAX = 118;
const SUPPLY_AREA_RATIO = 1.35;
const MAX_PAGES = 12;

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function isFirstFloorArticle(floorInfo) {
  if (!floorInfo) return false;
  return /^1\s*\//.test(String(floorInfo).trim());
}

function formatAreaKey(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric * 10) / 10;
  if (rounded < EXCLUSIVE_MIN || rounded > EXCLUSIVE_MAX) return null;
  if (Math.abs(rounded - Math.round(rounded)) < 0.15) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1).replace(/\.0$/, '');
}

function formatUpdatedAtKR(date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}. ${get('month')}. ${get('day')}. ${get('hour')}:${get('minute')}`;
}

function atomicWriteJson(filePath, payload) {
  const tmpPath = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function readIdFilter(filePath) {
  if (!filePath) return null;
  const raw = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`ids file must be a JSON array: ${filePath}`);
  }
  return new Set(parsed.map(String));
}

function readApartments(idFilter) {
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
    const complexId = obj.match(/naverComplexId:\s*'([^']+)'/);
    if (id && name && district && complexId) {
      if (idFilter && !idFilter.has(id[1])) continue;
      apartments.push({
        id: id[1],
        name: name[1],
        district: district[1],
        naverComplexId: complexId[1],
      });
    }
  }
  return apartments;
}

function buildLargeAreaApiUrl(complexId, pageNum) {
  const params = new URLSearchParams({
    realEstateType: 'APT',
    tradeType: 'A1',
    tag: '::::::::',
    rentPriceMin: '0',
    rentPriceMax: '900000000',
    priceMin: '0',
    priceMax: '900000000',
    areaMin: String(Math.round(EXCLUSIVE_MIN * SUPPLY_AREA_RATIO)),
    areaMax: String(Math.round(EXCLUSIVE_MAX * SUPPLY_AREA_RATIO)),
    showArticle: 'false',
    sameAddressGroup: 'false',
    priceType: 'RETAIL',
    page: String(pageNum),
    complexNo: complexId,
    type: 'list',
    order: 'prc',
  });
  return `https://new.land.naver.com/api/articles/complex/${complexId}?${params}`;
}

async function fetchArticlePage(page, apiUrl, headers) {
  return page.evaluate(async (requestUrl, requestHeaders) => {
    const response = await fetch(requestUrl, { headers: requestHeaders });
    if (!response.ok) {
      return { articles: [], isMoreData: false, httpStatus: response.status };
    }
    const data = await response.json();
    return {
      articles: data?.articleList || [],
      isMoreData: data?.isMoreData || false,
      httpStatus: response.status,
    };
  }, apiUrl, headers);
}

async function captureHeaders(page, complexId) {
  const targetUrl = `https://new.land.naver.com/complexes/${complexId}?ms=37.5,127,16&a=APT&e=RETAIL&tradeType=A1`;
  let sessionReady = false;
  let capturedHeaders = {};

  const requestHandler = (req) => {
    if (req.url().includes('/api/articles/complex/') && Object.keys(capturedHeaders).length === 0) {
      const headers = req.headers();
      for (const [key, value] of Object.entries(headers)) {
        if (key.startsWith(':')) continue;
        if (!['host', 'content-length', 'content-type'].includes(key.toLowerCase())) {
          capturedHeaders[key] = value;
        }
      }
    }
  };

  const responseHandler = async (res) => {
    if (res.url().includes('/api/articles/complex/') && res.status() === 200) {
      sessionReady = true;
    }
  };

  page.on('request', requestHandler);
  page.on('response', responseHandler);

  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 25000 });

  for (let i = 0; i < 10 && !sessionReady; i += 1) {
    await delay(500);
  }

  page.off('request', requestHandler);
  page.off('response', responseHandler);

  if (!sessionReady || Object.keys(capturedHeaders).length === 0) {
    throw new Error(`Failed to capture session headers for complex ${complexId}`);
  }

  return capturedHeaders;
}

function summarizeArticles(articles) {
  const saleOnly = articles.filter((article) => {
    const tradeType = (article.tradeTypeName || '').trim();
    const tradeCode = article.tradeTypeCode || '';
    return tradeType === '매매' || tradeCode === 'A1';
  });

  const saleGroups = new Map();
  const ownerGroups = new Map();

  for (const article of saleOnly) {
    const key = formatAreaKey(article.area2 || article.exclusiveArea);
    if (!key) continue;

    if (!saleGroups.has(key)) saleGroups.set(key, []);
    saleGroups.get(key).push(article);

    if (article.verificationTypeCode === 'OWNER') {
      if (!ownerGroups.has(key)) ownerGroups.set(key, []);
      ownerGroups.get(key).push(article);
    }
  }

  const sizeEntries = {};
  let articleCount = 0;
  let ownerVerifiedAny = false;

  for (const key of Array.from(saleGroups.keys()).sort((a, b) => Number(a) - Number(b))) {
    const ownerArticles = ownerGroups.get(key) || [];
    const candidateArticles = ownerArticles.length > 0 ? ownerArticles : saleGroups.get(key);

    let minPrice = null;
    let floorInfo;
    let isFirstFloor = false;

    for (const article of candidateArticles) {
      const dealPrice = article.dealPrc != null ? article.dealPrc : article.dealOrWarrantPrc;
      const parsed = parsePrice(dealPrice);
      if (parsed == null || parsed <= 0) continue;
      const rounded = Math.round(parsed * 100) / 100;
      if (minPrice === null || rounded < minPrice) {
        minPrice = rounded;
        floorInfo = article.floorInfo;
        isFirstFloor = isFirstFloorArticle(article.floorInfo);
      }
    }

    if (minPrice == null) continue;

    sizeEntries[key] = {
      price: minPrice,
      count: candidateArticles.length,
      floorInfo,
      isFirstFloor,
      ownerVerified: ownerArticles.length > 0,
    };
    articleCount += candidateArticles.length;
    ownerVerifiedAny = ownerVerifiedAny || ownerArticles.length > 0;
  }

  return {
    articleCount,
    ownerVerifiedAny,
    sizes: sizeEntries,
  };
}

async function crawlApartment(page, apartment) {
  const headers = await captureHeaders(page, apartment.naverComplexId);
  const allArticles = [];

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum += 1) {
    const result = await fetchArticlePage(page, buildLargeAreaApiUrl(apartment.naverComplexId, pageNum), headers);
    if (result.httpStatus === 403 || result.httpStatus === 429) {
      throw new Error(`Blocked with status ${result.httpStatus}`);
    }
    if (result.httpStatus !== 200 || result.articles.length === 0) break;
    allArticles.push(...result.articles);
    if (!result.isMoreData) break;
    await delay(500);
  }

  const seen = new Set();
  const deduped = allArticles.filter((article) => {
    const key = article.articleNo || article.atclNo;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const summary = summarizeArticles(deduped);
  return {
    apartmentId: apartment.id,
    apartmentName: apartment.name,
    district: apartment.district,
    complexId: apartment.naverComplexId,
    articleCount: summary.articleCount,
    ownerVerified: summary.ownerVerifiedAny,
    sizes: summary.sizes,
  };
}

function buildCheckpointPayload({
  workerIndex,
  workerCount,
  processedCount,
  totalCount,
  successCount,
  failCount,
  data,
}) {
  const now = new Date();
  return {
    updatedAt: now.toISOString(),
    updatedAtKR: formatUpdatedAtKR(now),
    exclusiveRange: { min: EXCLUSIVE_MIN, max: EXCLUSIVE_MAX },
    workerIndex,
    workerCount,
    processedCount,
    totalCount,
    successCount,
    failCount,
    data,
  };
}

async function main() {
  const workerCount = parsePositiveInt(getArgValue('--worker-count'), 1);
  const workerIndex = parsePositiveInt(getArgValue('--worker-index'), 1);
  const delayMs = parsePositiveInt(getArgValue('--delay-ms'), 1800);
  const startupDelayMs = parsePositiveInt(getArgValue('--startup-delay-ms'), 0);
  const maxApartments = parsePositiveInt(getArgValue('--max-apartments'), 0);
  const idsFileArg = getArgValue('--ids-file');
  const outputArg = getArgValue('--output') || path.join('run_logs', `admin-large-worker-${workerIndex}.json`);

  if (workerIndex > workerCount) {
    throw new Error(`workerIndex(${workerIndex}) cannot exceed workerCount(${workerCount}).`);
  }

  if (startupDelayMs > 0) {
    await delay(startupDelayMs);
  }

  const idFilter = readIdFilter(idsFileArg);
  const apartments = readApartments(idFilter)
    .filter((_, idx) => idx % workerCount === workerIndex - 1)
    .slice(0, maxApartments || Number.MAX_SAFE_INTEGER);

  const outputPath = path.resolve(process.cwd(), outputArg);
  const data = {};
  let processedCount = 0;
  let successCount = 0;
  let failCount = 0;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(25000);
  page.setDefaultTimeout(25000);

  try {
    for (let i = 0; i < apartments.length; i += 1) {
      const apartment = apartments[i];
      const prefix = `[worker ${workerIndex}/${workerCount}] [${i + 1}/${apartments.length}]`;
      console.log(`${prefix} ${apartment.name} 시작`);

      try {
        const result = await crawlApartment(page, apartment);
        data[apartment.id] = result;
        successCount += 1;
        const sizeLabels = Object.entries(result.sizes)
          .map(([key, value]) => `${key}㎡:${value.price}억`)
          .join(' | ');
        console.log(`${prefix} ${apartment.name} -> ${sizeLabels || '해당 평형 없음'}`);
      } catch (error) {
        data[apartment.id] = {
          apartmentId: apartment.id,
          apartmentName: apartment.name,
          district: apartment.district,
          complexId: apartment.naverComplexId,
          articleCount: 0,
          ownerVerified: false,
          sizes: {},
          error: error instanceof Error ? error.message : String(error),
        };
        failCount += 1;
        console.warn(`${prefix} ${apartment.name} 실패: ${error instanceof Error ? error.message : String(error)}`);
      }

      processedCount += 1;
      atomicWriteJson(outputPath, buildCheckpointPayload({
        workerIndex,
        workerCount,
        processedCount,
        totalCount: apartments.length,
        successCount,
        failCount,
        data,
      }));

      await delay(delayMs);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  console.log(`완료: ${outputPath}`);
}

await main();
