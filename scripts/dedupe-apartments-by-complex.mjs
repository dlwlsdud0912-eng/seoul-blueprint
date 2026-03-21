import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const apartmentsPath = path.join(rootDir, 'src', 'data', 'apartments.ts');
const pricesPath = path.join(rootDir, 'public', 'prices.json');
const auditPath = path.join(rootDir, 'tmp_crawl', 'complex-region-audit.json');
const reportDir = path.join(rootDir, 'tmp_crawl');
const reportPath = path.join(reportDir, 'dedupe-complex-report.json');

function loadApartmentsLiteral() {
  const text = fs.readFileSync(apartmentsPath, 'utf8');
  const start = text.indexOf('export const APARTMENTS');
  if (start < 0) throw new Error('APARTMENTS export not found');

  const arrStart = text.indexOf('[', start);
  const arrEnd = text.lastIndexOf('] as Apartment[]');
  if (arrStart < 0 || arrEnd < 0) throw new Error('APARTMENTS array bounds not found');

  const literal = text.slice(arrStart, arrEnd + 1);
  const apartments = vm.runInNewContext(literal);
  return { apartments, text };
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[()\-·.,]/g, '')
    .replace(/주상복합/g, '')
    .toLowerCase();
}

function hasOcrMarker(row) {
  return /ocr/i.test(row.id) || /OCR|교차검증|추가본|새 폴더/.test(row.note || '');
}

function isNoisyName(name) {
  return /(재건축|재개발|소형|앞동|뒷동|조망|추진|예정|대기)/.test(name);
}

function isGenericName(name) {
  return /^(현대|대림|아남|신동아|두산|우성|동아|한양|삼성|벽산|건영)$/.test(name);
}

function getPriceEntryScore(entry) {
  if (!entry || typeof entry !== 'object') return -1;

  let score = 0;

  if (entry.sizes?.['59']?.price) score += 1000;
  if (entry.sizes?.['84']?.price) score += 500;
  if (typeof entry.price === 'number') score += 200;
  if (typeof entry.articleCount === 'number') score += entry.articleCount;

  if (entry.ownerVerified === true) score += 10;
  if (entry.isFirstFloor) score -= 1;

  return score;
}

function getRowScore(row, auditRow, pricesMap, index) {
  let score = 0;

  if (pricesMap[row.id]) score += 10000;
  if (auditRow?.divisionName && row.district === auditRow.divisionName) score += 500;
  if (auditRow?.complexName && normalizeName(row.name) === normalizeName(auditRow.complexName)) score += 800;

  if (row.size && row.size !== '미정') score += 40;
  if (!(row.note || '').trim()) score += 25;
  if (!hasOcrMarker(row)) score += 100;
  if (!isNoisyName(row.name)) score += 40;
  if (!isGenericName(row.name)) score += 60;

  score -= row.name.length;
  score -= index / 10000;

  return score;
}

function formatValue(value) {
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return 'null';
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function formatApartment(apartment) {
  const orderedEntries = [
    ['id', apartment.id],
    ['name', apartment.name],
    ['district', apartment.district],
    ['size', apartment.size],
    ['basePrice', apartment.basePrice],
    ['tier', apartment.tier],
    ['naverComplexId', apartment.naverComplexId],
  ];

  if (apartment.note) {
    orderedEntries.push(['note', apartment.note]);
  }

  const body = orderedEntries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(', ');

  return `  { ${body} }`;
}

function main() {
  const { apartments } = loadApartmentsLiteral();
  const pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));
  const auditRows = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const auditByComplexId = new Map(
    auditRows
      .filter((row) => row.status === 'ok')
      .map((row) => [String(row.complexId), row])
  );

  const pricesMap = { ...(pricesData.prices || {}) };
  const groups = new Map();

  apartments.forEach((apt, index) => {
    const key = apt.naverComplexId ? `complex:${apt.naverComplexId}` : `id:${apt.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...apt, __index: index });
  });

  const deduped = [];
  const report = [];
  const removedPriceIds = [];

  for (const [key, rows] of groups.entries()) {
    if (!key.startsWith('complex:') || rows.length === 1) {
      deduped.push({ ...rows[0], __index: undefined });
      continue;
    }

    const complexId = key.replace('complex:', '');
    const auditRow = auditByComplexId.get(complexId);

    const rankedRows = rows
      .map((row) => ({
        row,
        score: getRowScore(row, auditRow, pricesMap, row.__index),
      }))
      .sort((a, b) => b.score - a.score || a.row.__index - b.row.__index);

    const canonical = { ...rankedRows[0].row };

    if (auditRow?.complexName) canonical.name = auditRow.complexName;
    if (auditRow?.divisionName) canonical.district = auditRow.divisionName;

    const priceCandidates = rows
      .filter((row) => pricesMap[row.id])
      .sort((a, b) => getPriceEntryScore(pricesMap[b.id]) - getPriceEntryScore(pricesMap[a.id]));

    if (!pricesMap[canonical.id] && priceCandidates.length > 0) {
      pricesMap[canonical.id] = pricesMap[priceCandidates[0].id];
    }

    for (const row of rows) {
      if (row.id !== canonical.id && pricesMap[row.id]) {
        removedPriceIds.push(row.id);
        delete pricesMap[row.id];
      }
    }

    deduped.push({ ...canonical, __index: undefined });

    report.push({
      complexId,
      officialName: auditRow?.complexName || canonical.name,
      officialDistrict: auditRow?.divisionName || canonical.district,
      keptId: canonical.id,
      removedIds: rows.filter((row) => row.id !== canonical.id).map((row) => row.id),
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        district: row.district,
        note: row.note || '',
        hadPrice: Boolean(pricesMap[row.id]),
      })),
    });
  }

  const dedupedApartments = deduped
    .map(({ __index, ...row }) => row)
    .sort((a, b) => {
      const aId = apartments.findIndex((row) => row.id === a.id);
      const bId = apartments.findIndex((row) => row.id === b.id);
      return aId - bId;
    });

  const nextPrices = {};
  let successCount = 0;

  for (const apartment of dedupedApartments) {
    const entry = pricesMap[apartment.id];
    if (entry) {
      nextPrices[apartment.id] = entry;
      if (typeof entry.price === 'number') successCount += 1;
    }
  }

  const failCount = dedupedApartments.length - successCount;

  const apartmentsContent = [
    '// @ts-nocheck',
    "import { Apartment } from '@/types';",
    '',
    'export const APARTMENTS = [',
    dedupedApartments.map(formatApartment).join(',\n'),
    '',
    '] as Apartment[];',
    '',
  ].join('\n');

  const nextPricesData = {
    ...pricesData,
    totalCount: dedupedApartments.length,
    successCount,
    failCount,
    prices: nextPrices,
  };

  fs.writeFileSync(apartmentsPath, apartmentsContent, 'utf8');
  fs.writeFileSync(pricesPath, JSON.stringify(nextPricesData, null, 2), 'utf8');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        beforeCount: apartments.length,
        afterCount: dedupedApartments.length,
        removedCount: apartments.length - dedupedApartments.length,
        duplicateGroupsMerged: report.length,
        removedPriceIds,
        mergedGroups: report,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        beforeCount: apartments.length,
        afterCount: dedupedApartments.length,
        removedCount: apartments.length - dedupedApartments.length,
        duplicateGroupsMerged: report.length,
        successCount,
        failCount,
        reportPath,
      },
      null,
      2
    )
  );
}

main();
