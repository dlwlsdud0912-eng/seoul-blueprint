import fs from 'fs';
import path from 'path';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const outputArg = getArgValue('--output') || path.join('public', 'admin-large-sizes.json');
const inputFiles = [];

for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--output') {
    i += 1;
    continue;
  }
  if (arg.startsWith('--')) continue;
  inputFiles.push(arg);
}

if (inputFiles.length === 0) {
  console.error('Usage: node scripts/merge-admin-large-size-results.mjs worker1.json worker2.json --output public/admin-large-sizes.json');
  process.exit(1);
}

const mergedData = {};
let totalCount = 0;
let processedCount = 0;
let successCount = 0;
let failCount = 0;

for (const file of inputFiles) {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8'));
  totalCount += parsed.totalCount || 0;
  processedCount += parsed.processedCount || 0;
  successCount += parsed.successCount || 0;
  failCount += parsed.failCount || 0;
  Object.assign(mergedData, parsed.data || {});
}

const now = new Date();
const updatedAtKR = now.toLocaleString('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const payload = {
  updatedAt: now.toISOString(),
  updatedAtKR,
  exclusiveRange: { min: 96, max: 118 },
  totalCount,
  processedCount,
  successCount,
  failCount,
  data: mergedData,
};

const outputPath = path.resolve(process.cwd(), outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`Merged ${inputFiles.length} worker files into ${outputPath}`);
console.log(`Total ${totalCount}, processed ${processedCount}, success ${successCount}, fail ${failCount}`);
