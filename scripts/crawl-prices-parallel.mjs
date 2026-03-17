import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const workerCount = parsePositiveInt(getArgValue('--workers'), 2);
const delayMs = parsePositiveInt(getArgValue('--delay-ms'), 2000);
const staggerMs = parsePositiveInt(getArgValue('--stagger-ms'), 15000);
const maxApartmentsArg = getArgValue('--max-apartments');
const idsFileArg = getArgValue('--ids-file');
const outputArg = getArgValue('--output');
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const runDir = path.join(process.cwd(), 'run_logs', `parallel-${timestamp}`);

fs.mkdirSync(runDir, { recursive: true });

console.log(`Starting parallel crawl with ${workerCount} workers`);
console.log(`Run directory: ${runDir}`);

const workerOutputs = [];

for (let i = 1; i <= workerCount; i++) {
  const outputPath = path.join(runDir, `worker-${i}-of-${workerCount}.json`);
  const logPath = path.join(runDir, `worker-${i}-of-${workerCount}.log`);
  const startupDelayMs = (i - 1) * staggerMs;
  const command = [
    'node',
    'scripts/crawl-prices-browser.mjs',
    '--worker-count', String(workerCount),
    '--worker-index', String(i),
    '--delay-ms', String(delayMs),
    '--startup-delay-ms', String(startupDelayMs),
    '--output', outputPath,
  ];

  if (idsFileArg) {
    command.push('--ids-file', idsFileArg);
  }

  if (maxApartmentsArg) {
    command.push('--max-apartments', String(maxApartmentsArg));
  }

  const psCommand = `${command.map(quotePowerShell).join(' ')} *>> ${quotePowerShell(logPath)}`;
  const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  workerOutputs.push(outputPath);
  console.log(`Worker ${i}/${workerCount} launched -> ${outputPath}`);
}

const mergedOutput = outputArg || path.join(runDir, 'merged.json');
const mergeCommand = `node scripts/merge-price-results.mjs ${workerOutputs.map(file => `"${file}"`).join(' ')} --output "${mergedOutput}"`;
fs.writeFileSync(path.join(runDir, 'merge.cmd'), `${mergeCommand}\r\n`, 'utf-8');

console.log('');
console.log('Merge command after all workers finish:');
console.log(mergeCommand);
