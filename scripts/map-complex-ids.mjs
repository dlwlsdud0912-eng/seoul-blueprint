/**
 * Naver Complex ID Mapper (자동)
 * apartments.ts에서 naverComplexId 없는 아파트만 찾아서 네이버 검색으로 매핑
 *
 * 사용법: node scripts/map-complex-ids.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

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

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchComplexId(name, retries = 3) {
  const query = name + ' 아파트';
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = 'https://search.naver.com/search.naver?where=nexearch&query=' + encodeURIComponent(query);
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

      // Extract first complexes/XXXXX from land.naver.com links
      const match = html.match(/(?:new\.land|fin\.land|land)\.naver\.com\/complexes\/(\d+)/);
      if (match) return match[1];

      // Fallback: look for rletNo=XXXXX
      const rletMatch = html.match(/rletNo=(\d+)/);
      if (rletMatch) return rletMatch[1];

      return null;
    } catch (err) {
      console.log(`  Error for "${name}": ${err.message}`);
      if (attempt < retries - 1) await delay(5000);
    }
  }
  return null;
}

async function main() {
  const allApartments = parseApartmentsFile();
  const unmapped = allApartments.filter(a => !a.naverComplexId);

  console.log(`=== Naver Complex ID Mapper ===`);
  console.log(`전체: ${allApartments.length}개, 매핑 필요: ${unmapped.length}개\n`);

  if (unmapped.length === 0) {
    console.log('모든 아파트에 naverComplexId가 이미 있습니다!');
    return;
  }

  const mapping = {};
  let success = 0, fail = 0;
  const failed = [];

  for (let i = 0; i < unmapped.length; i++) {
    const apt = unmapped[i];
    const idx = `[${i + 1}/${unmapped.length}]`;

    const complexId = await searchComplexId(apt.name);
    if (complexId) {
      mapping[apt.id] = complexId;
      success++;
      console.log(`${idx} OK ${apt.name} -> ${complexId}`);
    } else {
      fail++;
      failed.push(apt);
      console.log(`${idx} FAIL ${apt.name} -> NOT FOUND`);
    }
    // 1.5초 딜레이
    if (i < unmapped.length - 1) await delay(1500);
  }

  console.log(`\n=== 결과 ===`);
  console.log(`성공: ${success}, 실패: ${fail}`);

  if (failed.length > 0) {
    console.log(`\n=== 실패 목록 ===`);
    failed.forEach(apt => console.log(`  ${apt.id}: ${apt.name}`));
  }

  // apartments.ts에 자동 적용
  if (success > 0) {
    console.log(`\napartments.ts에 ${success}개 complexId 적용 중...`);
    let fileContent = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'data', 'apartments.ts'),
      'utf-8'
    );

    for (const [id, complexId] of Object.entries(mapping)) {
      // naverComplexId가 없는 항목에 추가
      const pattern = new RegExp(
        `(id:\\s*'${id}'[^}]*?tier:\\s*'[^']+')\\s*\\}`,
      );
      const replacement = `$1, naverComplexId: '${complexId}' }`;
      fileContent = fileContent.replace(pattern, replacement);
    }

    fs.writeFileSync(
      path.join(__dirname, '..', 'src', 'data', 'apartments.ts'),
      fileContent,
      'utf-8'
    );
    console.log('apartments.ts 업데이트 완료!');
  }

  console.log('\n=== MAPPING JSON ===');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(err => {
  console.error('매핑 중 오류:', err);
  process.exit(1);
});
