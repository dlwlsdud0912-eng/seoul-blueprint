import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apartmentsFilePath = path.join(__dirname, '..', 'src', 'data', 'apartments.ts');

const districtPrefixMap = {
  '강남구': 'gangnam',
  '강동구': 'gangdong',
  '강북구': 'gangbuk',
  '강서구': 'gangseo',
  '관악구': 'gwanak',
  '광진구': 'gwangjin',
  '구로구': 'guro',
  '금천구': 'geumcheon',
  '노원구': 'nowon',
  '도봉구': 'dobong',
  '동대문구': 'dongdaemun',
  '동작구': 'dongjak',
  '마포구': 'mapo',
  '서대문구': 'seodaemun',
  '서초구': 'seocho',
  '성동구': 'seongdong',
  '성북구': 'seongbuk',
  '송파구': 'songpa',
  '양천구': 'yangcheon',
  '영등포구': 'yeongdeungpo',
  '용산구': 'yongsan',
  '은평구': 'eunpyeong',
  '종로구': 'jongno',
  '중구': 'junggu',
  '중랑구': 'jungnang',
};

const genericNamePattern = /^(극동|삼성|현대\d*차?|현대|두산|성원|새한|건영\d*차?|한양[\d,차]*|벽산\d*(단지|차)?|신동아\d*(단지|차)?|금호\d*차?|쌍용|우성|대림|동부|한신|청구|삼익|대우|동아|염광|유원하나|신동아|건영|공작|동성\d*,?\d*차?|새마을|주공\d*단지?)$/;

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function normalize(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[()\-.,/]/g, '')
    .replace(/아파트$/g, '')
    .replace(/e편한세상/gi, '이편한세상')
    .toLowerCase();
}

function escapeString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function hashBase36(input) {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseExistingApartments(content) {
  const apartments = [];
  const objectRegex = /\{[^}]+\}/g;
  let match;

  while ((match = objectRegex.exec(content)) !== null) {
    const obj = match[0];
    const id = obj.match(/id:\s*'([^']+)'/);
    const name = obj.match(/name:\s*'([^']+)'/);
    const district = obj.match(/district:\s*'([^']+)'/);
    if (id && name && district) {
      apartments.push({
        id: id[1],
        name: name[1],
        district: district[1],
      });
    }
  }

  return apartments;
}

function tierForPrice(price) {
  if (price <= 12) return '12';
  if (price <= 14) return '14';
  if (price <= 16) return '16';
  if (price <= 20) return '20';
  if (price <= 24) return '24';
  if (price <= 28) return '28';
  if (price <= 32) return '32';
  return '50';
}

function buildId(row, usedIds) {
  const prefix = districtPrefixMap[row.district] || 'apt';
  const seed = `${row.district}|${row.neighborhood || ''}|${row.name}`;
  let candidate = `${prefix}-${hashBase36(seed).slice(0, 8)}`;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${prefix}-${hashBase36(`${seed}|${suffix}`).slice(0, 8)}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function shouldPrefixNeighborhood(apartmentName, neighborhood) {
  if (!apartmentName || !neighborhood) return false;
  if (apartmentName.includes(neighborhood)) return false;

  const compact = apartmentName.replace(/\s+/g, '');
  const stripped = compact.replace(/\d+/g, '').replace(/[차단지]/g, '');
  return compact.length <= 4 || stripped.length <= 3 || genericNamePattern.test(compact);
}

function buildDisplayName(row) {
  const base = String(row.apartmentName || '').trim();
  const neighborhood = String(row.neighborhood || '').trim();
  if (!base) return '';
  return shouldPrefixNeighborhood(base, neighborhood) ? `${neighborhood}${base}` : base;
}

function buildApartmentLine(row, id) {
  const price = Number.parseFloat(row.priceText);
  const safePrice = Number.isFinite(price) ? price : 0;
  const size = row.size ? `${String(row.size).trim()}평` : '미정';
  const note = [`OCR 추가 2026-01-31`, row.neighborhood ? `동:${row.neighborhood}` : '', row.sourceFile ? `src:${row.sourceFile}` : '']
    .filter(Boolean)
    .join(' | ');

  return `  { id: '${id}', name: '${escapeString(row.name)}', district: '${escapeString(row.district)}', size: '${escapeString(size)}', basePrice: ${safePrice}, tier: '${tierForPrice(safePrice)}', note: '${escapeString(note)}' },`;
}

function main() {
  const comparePath = path.resolve(process.cwd(), getArgValue('--compare') || path.join('_ocr_tmp', 'ocr-compare.json'));
  const tag = getArgValue('--tag') || '20260320_ocr';
  const compare = JSON.parse(fs.readFileSync(comparePath, 'utf-8').replace(/^\uFEFF/, ''));
  const rows = (compare.results || []).filter(row => row.status === 'new');

  const fileContent = fs.readFileSync(apartmentsFilePath, 'utf-8');
  const existingApartments = parseExistingApartments(fileContent);
  const existingKeys = new Set(existingApartments.map(apartment => `${normalize(apartment.district)}|${normalize(apartment.name)}`));
  const usedIds = new Set(existingApartments.map(apartment => apartment.id));
  const seenRows = new Set();

  const additions = [];
  const skipped = [];

  for (const row of rows) {
    const name = buildDisplayName(row);
    if (!name || !row.district) continue;
    const key = `${normalize(row.district)}|${normalize(name)}`;
    if (seenRows.has(key)) continue;
    seenRows.add(key);

    if (existingKeys.has(key)) {
      skipped.push({ ...row, proposedName: name, reason: 'already-exists-after-normalization' });
      continue;
    }

    const id = buildId({ district: row.district, neighborhood: row.neighborhood, name }, usedIds);
    additions.push({
      id,
      district: row.district,
      neighborhood: row.neighborhood || '',
      name,
      originalName: row.apartmentName,
      size: row.size || '',
      priceText: row.priceText || '',
      matchedName: row.matchedName || '',
      matchedId: row.matchedId || '',
      sourceFile: row.sourceFile || row.sourceFiles?.[0] || '',
    });
  }

  if (additions.length > 0) {
    const blockLines = [
      '',
      `  // ========== 2026-03-20 OCR 추가 (${additions.length}개) ==========`,
      ...additions.map(row => buildApartmentLine(row, row.id)),
      '',
    ];
    const updated = fileContent.replace(/\n\];\s*$/, `\n${blockLines.join('\n')}\n];\n`);
    fs.writeFileSync(apartmentsFilePath, updated, 'utf-8');
  }

  const outDir = path.join(process.cwd(), 'tmp_crawl');
  fs.mkdirSync(outDir, { recursive: true });

  const addedIdsPath = path.join(outDir, `ocr_added_ids_${tag}.json`);
  const addedRowsPath = path.join(outDir, `ocr_added_rows_${tag}.json`);
  const summaryPath = path.join(outDir, `ocr_added_summary_${tag}.json`);

  fs.writeFileSync(addedIdsPath, JSON.stringify(additions.map(row => row.id), null, 2), 'utf-8');
  fs.writeFileSync(addedRowsPath, JSON.stringify(additions, null, 2), 'utf-8');
  fs.writeFileSync(summaryPath, JSON.stringify({
    sourceRows: rows.length,
    addedCount: additions.length,
    skippedCount: skipped.length,
    addedIdsPath,
    addedRowsPath,
  }, null, 2), 'utf-8');

  console.log(`OCR new rows: ${rows.length}`);
  console.log(`Added: ${additions.length}`);
  console.log(`Skipped after normalization: ${skipped.length}`);
  console.log(`IDs file: ${addedIdsPath}`);
  console.log(`Rows file: ${addedRowsPath}`);
  console.log(`Summary: ${summaryPath}`);
}

main();
