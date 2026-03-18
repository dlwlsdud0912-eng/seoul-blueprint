import apartmentModule from '../src/data/apartments.ts';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const APARTMENTS = apartmentModule.APARTMENTS;

const TEST_IDS = [
  'mapo-1dagmmy',
  'mapo-1y4n11y',
  'gangnam-sangnoksu',
  'eunpyeong-du1f78',
  'songpa-1i2tf64',
];

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[()\-]/g, '')
    .toLowerCase();
}

function buildKeywords(apartment) {
  return [
    `${apartment.district} ${apartment.name}`,
    `${apartment.name} 아파트`,
    apartment.name,
  ];
}

function pickComplexes(data) {
  if (Array.isArray(data?.complexes)) return data.complexes;
  if (Array.isArray(data?.result?.list)) return data.result.list;
  return [];
}

function simplifyComplex(raw) {
  return {
    complexId: String(raw.complexNo || raw.complexNumber || raw.id || ''),
    name: raw.complexName || raw.name || '',
    cityName: raw.cityName || raw.cortarCityName || '',
    divisionName: raw.divisionName || raw.cortarDivisionName || '',
    sectionName: raw.sectionName || raw.cortarSectionName || '',
    address: raw.address || raw.roadAddress || '',
    realEstateTypeName: raw.realEstateTypeName || raw.realEstateType || '',
  };
}

function matchCandidate(apartment, candidates) {
  const districtNeedle = normalizeText(apartment.district);
  const nameNeedle = normalizeText(apartment.name);

  return candidates.find((candidate) => {
    const haystacks = [
      candidate.name,
      candidate.cityName,
      candidate.divisionName,
      candidate.sectionName,
      candidate.address,
    ]
      .map(normalizeText)
      .join(' ');

    return haystacks.includes(districtNeedle) && haystacks.includes(nameNeedle);
  });
}

async function searchKeyword(page, keyword) {
  return page.evaluate(async (kw) => {
    const res = await fetch(`https://new.land.naver.com/api/search?keyword=${encodeURIComponent(kw)}`, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://new.land.naver.com/',
      },
    });
    return res.json();
  }, keyword);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.goto('https://new.land.naver.com/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  for (const apartment of APARTMENTS.filter((apt) => TEST_IDS.includes(apt.id))) {
    const keywords = buildKeywords(apartment);
    const allCandidates = [];

    for (const keyword of keywords) {
      const data = await searchKeyword(page, keyword);
      const complexes = pickComplexes(data).map(simplifyComplex);
      allCandidates.push(...complexes);
      if (complexes.length > 0) break;
    }

    const matched = matchCandidate(apartment, allCandidates);

    console.log(
      JSON.stringify(
        {
          apartment,
          keywords,
          candidates: allCandidates.slice(0, 5),
          matched,
        },
        null,
        2
      )
    );
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
