import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const outputArg = getArgValue('--output') || path.join('public', 'prices.json');
const inputFiles = [];

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--output') {
    i++;
    continue;
  }
  if (arg.startsWith('--')) continue;
  inputFiles.push(arg);
}

if (inputFiles.length === 0) {
  console.error('Usage: node scripts/merge-price-results.mjs worker1.json worker2.json [worker3.json] --output public/prices.json');
  process.exit(1);
}

const now = new Date();
const merged = {
  updatedAt: now.toISOString(),
  updatedAtKR: now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }),
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  prices: {},
};

for (const file of inputFiles) {
  const resolved = path.resolve(process.cwd(), file);
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  merged.totalCount += parsed.totalCount || 0;
  merged.successCount += parsed.successCount || 0;
  merged.failCount += parsed.failCount || 0;
  Object.assign(merged.prices, parsed.prices || {});
}

const outputPath = path.resolve(process.cwd(), outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf-8');

try {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npxCommand, ['tsx', 'scripts/generate-premium-tier12-html.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
} catch (error) {
  console.warn('Warning: failed to regenerate premium tier HTML after merge');
  console.warn(error instanceof Error ? error.message : String(error));
}

console.log(`Merged ${inputFiles.length} files into ${outputPath}`);
console.log(`Total ${merged.totalCount}, success ${merged.successCount}, fail/no-listing ${merged.failCount}`);
