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

function buildId(row, usedIds) {
  const prefix = districtPrefixMap[row.district] || 'apt';
  const seed = `${row.district}|${row.dong}|${row.name}`;
  let candidate = `${prefix}-${hashBase36(seed).slice(0, 8)}`;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${prefix}-${hashBase36(`${seed}|${suffix}`).slice(0, 8)}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function buildNote(row) {
  const parts = [row.source, row.point].filter(Boolean).map(part => String(part).trim());
  return parts.join(' | ');
}

function buildApartmentLine(row, id) {
  const size = row.size?.trim() || '미정';
  const note = buildNote(row);
  const notePart = note ? `, note: '${escapeString(note)}'` : '';
  return `  { id: '${id}', name: '${escapeString(row.name)}', district: '${escapeString(row.district)}', size: '${escapeString(size)}', basePrice: 0, tier: '50'${notePart} },`;
}

function main() {
  const rowsPath = path.resolve(process.cwd(), getArgValue('--rows') || path.join('tmp_crawl', 'new_excel_rows.json'));
  const tag = getArgValue('--tag') || '20260317';
  const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf-8').replace(/^\uFEFF/, ''));
  const fileContent = fs.readFileSync(apartmentsFilePath, 'utf-8');
  const existingApartments = parseExistingApartments(fileContent);
  const existingKeys = new Set(existingApartments.map(apartment => `${normalize(apartment.district)}|${normalize(apartment.name)}`));
  const usedIds = new Set(existingApartments.map(apartment => apartment.id));
  const seenRows = new Set();

  const additions = [];
  const matched = [];

  for (const row of rows) {
    const key = `${normalize(row.district)}|${normalize(row.name)}`;
    if (seenRows.has(key)) continue;
    seenRows.add(key);

    if (existingKeys.has(key)) {
      matched.push(row);
      continue;
    }

    const id = buildId(row, usedIds);
    additions.push({ ...row, id });
  }

  if (additions.length === 0) {
    console.log('No new apartments to add.');
  } else {
    const blockLines = [
      '',
      `  // ========== 2026-03-17 엑셀 추가 (${additions.length}개) ==========`,
      ...additions.map(row => buildApartmentLine(row, row.id)),
      '',
    ];
    const updated = fileContent.replace(/\n\];\s*$/, `\n${blockLines.join('\n')}\n];\n`);
    fs.writeFileSync(apartmentsFilePath, updated, 'utf-8');
  }

  const outDir = path.join(process.cwd(), 'tmp_crawl');
  fs.mkdirSync(outDir, { recursive: true });

  const addedIdsPath = path.join(outDir, `new_added_ids_${tag}.json`);
  const addedRowsPath = path.join(outDir, `new_added_rows_${tag}.json`);
  const summaryPath = path.join(outDir, `new_added_summary_${tag}.json`);

  fs.writeFileSync(addedIdsPath, JSON.stringify(additions.map(row => row.id), null, 2), 'utf-8');
  fs.writeFileSync(addedRowsPath, JSON.stringify(additions, null, 2), 'utf-8');
  fs.writeFileSync(summaryPath, JSON.stringify({
    totalRows: rows.length,
    matchedCount: matched.length,
    addedCount: additions.length,
    addedIdsPath,
    addedRowsPath,
  }, null, 2), 'utf-8');

  console.log(`Rows in Excel: ${rows.length}`);
  console.log(`Already existed: ${matched.length}`);
  console.log(`Added: ${additions.length}`);
  console.log(`IDs file: ${addedIdsPath}`);
  console.log(`Rows file: ${addedRowsPath}`);
  console.log(`Summary: ${summaryPath}`);
}

main();
