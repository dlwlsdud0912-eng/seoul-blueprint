import fs from 'node:fs';
import path from 'node:path';
import apartmentModule from '../src/data/apartments.ts';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const APARTMENTS = apartmentModule.APARTMENTS;
const OUTPUT_DIR = path.resolve('./tmp_crawl');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'complex-region-audit.json');
const INVALID_PATH = path.join(OUTPUT_DIR, 'complex-region-invalid.json');
const CONCURRENCY = 2;
const ALLOWED_CITIES = new Set(['서울시', '경기도']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(page, url) {
  return page.evaluate(async (targetUrl) => {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://new.land.naver.com/',
      },
    });

    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      status: response.status,
      data,
    };
  }, url);
}

async function auditComplex(page, complexId) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const overview = await fetchJson(
      page,
      `https://new.land.naver.com/api/complexes/overview/${complexId}?complexNo=${complexId}`
    );

    if (overview.status === 429) {
      await sleep(attempt * 3000);
      continue;
    }

    if (overview.status !== 200 || !overview.data?.latitude || !overview.data?.longitude) {
      return {
        complexId,
        status: 'overview_failed',
        overviewStatus: overview.status,
      };
    }

    const { latitude, longitude, complexName, complexTypeName } = overview.data;

    const cortars = await fetchJson(
      page,
      `https://new.land.naver.com/api/cortars?zoom=17&centerLat=${latitude}&centerLon=${longitude}`
    );

    if (cortars.status === 429) {
      await sleep(attempt * 3000);
      continue;
    }

    if (cortars.status !== 200) {
      return {
        complexId,
        status: 'cortar_failed',
        overviewStatus: overview.status,
        cortarStatus: cortars.status,
        latitude,
        longitude,
        complexName,
        complexTypeName,
      };
    }

    return {
      complexId,
      status: 'ok',
      latitude,
      longitude,
      complexName,
      complexTypeName,
      cityName: cortars.data?.cityName ?? '',
      divisionName: cortars.data?.divisionName ?? '',
      sectorName: cortars.data?.sectorName ?? '',
      cortarNo: cortars.data?.cortarNo ?? '',
      allowed: ALLOWED_CITIES.has(cortars.data?.cityName ?? ''),
    };
  }

  return {
    complexId,
    status: 'rate_limited',
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const uniqueComplexIds = [...new Set(APARTMENTS.map((apt) => apt.naverComplexId).filter(Boolean))];
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const page = await browser.newPage();
      await page.goto('https://new.land.naver.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      return page;
    })
  );

  const results = [];
  let cursor = 0;

  async function worker(page, workerIndex) {
    while (cursor < uniqueComplexIds.length) {
      const myIndex = cursor;
      cursor += 1;
      const complexId = uniqueComplexIds[myIndex];
      const result = await auditComplex(page, complexId);
      results.push(result);

      if ((myIndex + 1) % 20 === 0 || myIndex === uniqueComplexIds.length - 1) {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
      }

      console.log(
        `[${workerIndex}] ${myIndex + 1}/${uniqueComplexIds.length} complex ${complexId} -> ${result.status} ${result.cityName ?? ''} ${result.divisionName ?? ''}`
      );

      await sleep(250);
    }
  }

  await Promise.all(pages.map((page, index) => worker(page, index + 1)));
  await browser.close();

  const byComplexId = new Map(results.map((result) => [result.complexId, result]));
  const invalidApartments = APARTMENTS.filter((apt) => {
    if (!apt.naverComplexId) return false;
    const audit = byComplexId.get(apt.naverComplexId);
    return audit?.status === 'ok' && audit.allowed === false;
  }).map((apt) => {
    const audit = byComplexId.get(apt.naverComplexId);
    return {
      id: apt.id,
      name: apt.name,
      district: apt.district,
      tier: apt.tier,
      naverComplexId: apt.naverComplexId,
      cityName: audit.cityName,
      divisionName: audit.divisionName,
      sectorName: audit.sectorName,
      cortarNo: audit.cortarNo,
      complexName: audit.complexName,
    };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  fs.writeFileSync(INVALID_PATH, JSON.stringify(invalidApartments, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        uniqueComplexIds: uniqueComplexIds.length,
        audited: results.length,
        invalidApartments: invalidApartments.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
