import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apartmentsFilePath = path.join(__dirname, '..', 'src', 'data', 'apartments.ts');

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8').replace(/^\uFEFF/, ''));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value);
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

function parseApartmentIdsWithComplexId(content) {
  const ids = [];
  const objectRegex = /\{[^}]+\}/g;
  let match;

  while ((match = objectRegex.exec(content)) !== null) {
    const obj = match[0];
    const id = obj.match(/id:\s*'([^']+)'/);
    const complexId = obj.match(/naverComplexId:\s*'([^']+)'/);
    if (id && complexId) {
      ids.push(id[1]);
    }
  }

  return ids;
}

function updateApartmentObjects(content, priceMap) {
  for (const [id, result] of Object.entries(priceMap)) {
    const price = result?.price;
    if (typeof price !== 'number') continue;

    const objectPattern = new RegExp(`(\\{[^}]*id:\\s*'${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*basePrice:\\s*)([^,]+)(,\\s*tier:\\s*')([^']+)(')`);
    content = content.replace(objectPattern, (_, prefix, _base, middle, _tier, suffix) => {
      return `${prefix}${formatNumber(price)}${middle}${tierForPrice(price)}${suffix}`;
    });
  }

  return content;
}

function main() {
  const subsetFile = getArgValue('--subset');
  if (!subsetFile) {
    console.error('Usage: node scripts/apply-subset-prices.mjs --subset run_logs/.../merged.json [--target public/prices.json]');
    process.exit(1);
  }

  const targetFile = getArgValue('--target') || path.join('public', 'prices.json');
  const subset = readJson(subsetFile);
  const target = readJson(targetFile);
  const apartmentsContent = fs.readFileSync(apartmentsFilePath, 'utf-8');

  Object.assign(target.prices, subset.prices || {});

  const updatedApartmentContent = updateApartmentObjects(apartmentsContent, subset.prices || {});
  fs.writeFileSync(apartmentsFilePath, updatedApartmentContent, 'utf-8');

  const apartmentIdsWithComplexId = parseApartmentIdsWithComplexId(updatedApartmentContent);
  const apartmentIdSet = new Set(apartmentIdsWithComplexId);
  const successCount = Object.keys(target.prices).filter(id => apartmentIdSet.has(id)).length;
  const totalCount = apartmentIdsWithComplexId.length;

  const now = new Date();
  target.updatedAt = now.toISOString();
  target.updatedAtKR = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  });
  target.totalCount = totalCount;
  target.successCount = successCount;
  target.failCount = totalCount - successCount;

  fs.writeFileSync(path.resolve(process.cwd(), targetFile), JSON.stringify(target, null, 2), 'utf-8');

  console.log(`Applied subset prices from ${subsetFile}`);
  console.log(`Updated ${Object.keys(subset.prices || {}).length} price entries`);
  console.log(`Total ${target.totalCount}, success ${target.successCount}, fail/no-listing ${target.failCount}`);
}

main();
