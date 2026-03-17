/**
 * Naver Complex ID Mapper
 * apartments.ts에서 naverComplexId 없는 아파트를 찾아 네이버 검색으로 매핑합니다.
 *
 * Usage:
 *   node scripts/map-complex-ids.mjs
 *   node scripts/map-complex-ids.mjs --ids-file tmp_crawl/new_ids.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apartmentsFilePath = path.join(__dirname, '..', 'src', 'data', 'apartments.ts');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseApartmentsFile() {
  const content = fs.readFileSync(apartmentsFilePath, 'utf-8');
  const apartments = [];
  const objectRegex = /\{[^}]+\}/g;
  let match;

  while ((match = objectRegex.exec(content)) !== null) {
    const obj = match[0];
    const id = obj.match(/id:\s*'([^']+)'/);
    const name = obj.match(/name:\s*'([^']+)'/);
    const complexId = obj.match(/naverComplexId:\s*'([^']+)'/);

    if (id && name) {
      apartments.push({
        id: id[1],
        name: name[1],
        naverComplexId: complexId ? complexId[1] : undefined,
      });
    }
  }

  return apartments;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchComplexId(name, retries = 3) {
  const query = `${name} 아파트`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: HEADERS });

      if (res.status === 429) {
        const waitTime = Math.pow(2, attempt) * 10000;
        console.log(`  429 for "${name}", waiting ${waitTime / 1000}s (attempt ${attempt + 1}/${retries})`);
        await delay(waitTime);
        continue;
      }

      if (!res.ok) {
        console.log(`  HTTP ${res.status} for "${name}"`);
        return null;
      }

      const html = await res.text();
      const match = html.match(/(?:new\.land|fin\.land|land)\.naver\.com\/complexes\/(\d+)/);
      if (match) return match[1];

      const rletMatch = html.match(/rletNo=(\d+)/);
      if (rletMatch) return rletMatch[1];

      return null;
    } catch (error) {
      console.log(`  Error for "${name}": ${error.message}`);
      if (attempt < retries - 1) {
        await delay(5000);
      }
    }
  }

  return null;
}

function applyMappings(mapping) {
  let fileContent = fs.readFileSync(apartmentsFilePath, 'utf-8');

  for (const [id, complexId] of Object.entries(mapping)) {
    const objectPattern = new RegExp(`(\\{[^}]*id:\\s*'${escapeRegExp(id)}'[^}]*?)(\\s*\\})`);
    fileContent = fileContent.replace(objectPattern, (full, prefix, suffix) => {
      if (/naverComplexId:\s*'[^']+'/.test(prefix)) {
        return `${prefix.replace(/naverComplexId:\s*'[^']+'/, `naverComplexId: '${complexId}'`)}${suffix}`;
      }
      return `${prefix}, naverComplexId: '${complexId}'${suffix}`;
    });
  }

  fs.writeFileSync(apartmentsFilePath, fileContent, 'utf-8');
}

async function main() {
  const idsFileArg = getArgValue('--ids-file');
  const idFilter = readIdFilter(idsFileArg);
  const allApartments = parseApartmentsFile();
  const targetApartments = idFilter
    ? allApartments.filter(apartment => idFilter.has(apartment.id))
    : allApartments;
  const unmapped = targetApartments.filter(apartment => !apartment.naverComplexId);

  console.log('=== Naver Complex ID Mapper ===');
  console.log(`전체: ${allApartments.length}개`);
  console.log(`대상: ${targetApartments.length}개`);
  console.log(`매핑 필요: ${unmapped.length}개`);

  if (unmapped.length === 0) {
    console.log('선택된 아파트에 매핑할 complexId가 없습니다.');
    return;
  }

  const mapping = {};
  const failed = [];
  let success = 0;
  let fail = 0;

  for (let i = 0; i < unmapped.length; i++) {
    const apartment = unmapped[i];
    const complexId = await searchComplexId(apartment.name);
    const label = `[${i + 1}/${unmapped.length}]`;

    if (complexId) {
      mapping[apartment.id] = complexId;
      success += 1;
      console.log(`${label} OK ${apartment.name} -> ${complexId}`);
    } else {
      fail += 1;
      failed.push(apartment);
      console.log(`${label} FAIL ${apartment.name} -> NOT FOUND`);
    }

    if (i < unmapped.length - 1) {
      await delay(1500);
    }
  }

  console.log('\n=== 결과 ===');
  console.log(`성공: ${success}, 실패: ${fail}`);

  if (failed.length > 0) {
    console.log('\n=== 실패 목록 ===');
    failed.forEach(apartment => console.log(`  ${apartment.id}: ${apartment.name}`));
  }

  if (success > 0) {
    applyMappings(mapping);
    console.log('\napartments.ts 업데이트 완료!');
  }

  console.log('\n=== MAPPING JSON ===');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(error => {
  console.error('매핑 중 오류:', error);
  process.exit(1);
});
