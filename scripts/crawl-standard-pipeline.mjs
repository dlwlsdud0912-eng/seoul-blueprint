import fs from 'fs';
import path from 'path';
import { spawnSync, execFileSync } from 'child_process';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRunDir(output) {
  const match = String(output).match(/Run directory:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function readRunMeta(runDir) {
  const metaPath = path.join(runDir, 'run.meta.txt');
  if (!fs.existsSync(metaPath)) {
    return {};
  }

  const lines = fs.readFileSync(metaPath, 'utf-8').split(/\r?\n/).filter(Boolean);
  return Object.fromEntries(
    lines.map((line) => {
      const separator = line.indexOf('=');
      if (separator === -1) return [line, ''];
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
  );
}

function launchNodeScript(repoDir, scriptPath, args) {
  const result = spawnSync('node', [scriptPath, ...args], {
    cwd: repoDir,
    encoding: 'utf-8',
    windowsHide: true,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';

  if (result.status !== 0) {
    throw new Error(
      `Launcher failed: ${scriptPath}\n${stdout}\n${stderr}`.trim(),
    );
  }

  return { stdout, stderr };
}

async function waitForWorkerOutputs({
  runDir,
  workerCount,
  timeoutMs,
  label,
}) {
  const startedAt = Date.now();
  let lastReported = -1;

  while (Date.now() - startedAt < timeoutMs) {
    const files = [];
    for (let i = 1; i <= workerCount; i += 1) {
      const filePath = path.join(runDir, `worker-${i}-of-${workerCount}.json`);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    if (files.length !== lastReported) {
      lastReported = files.length;
      console.log(`[${label}] worker json ${files.length}/${workerCount}`);
    }

    if (files.length === workerCount) {
      return files;
    }

    await delay(5000);
  }

  throw new Error(`[${label}] timed out waiting for worker JSON files in ${runDir}`);
}

function runMerge(repoDir, mergeScript, workerFiles, outputPath) {
  execFileSync('node', [mergeScript, ...workerFiles, '--output', outputPath], {
    cwd: repoDir,
    stdio: 'inherit',
    windowsHide: true,
  });
}

async function main() {
  const repoDir = process.cwd();
  const priceWorkers = parsePositiveInt(getArgValue('--price-workers'), 5);
  const largeWorkers = parsePositiveInt(getArgValue('--large-workers'), 5);
  const priceDelayMs = parsePositiveInt(getArgValue('--price-delay-ms'), 2000);
  const largeDelayMs = parsePositiveInt(getArgValue('--large-delay-ms'), 1800);
  const priceStaggerMs = parsePositiveInt(getArgValue('--price-stagger-ms'), 15000);
  const largeStaggerMs = parsePositiveInt(getArgValue('--large-stagger-ms'), 15000);
  const waitTimeoutMs = parsePositiveInt(getArgValue('--wait-timeout-ms'), 3 * 60 * 60 * 1000);

  console.log('Starting standard crawl pipeline...');
  console.log(`Repo: ${repoDir}`);
  console.log(`Step 1/4 -> main prices (${priceWorkers} workers)`);

  const priceLaunch = launchNodeScript(repoDir, 'scripts/crawl-prices-parallel.mjs', [
    '--workers',
    String(priceWorkers),
    '--delay-ms',
    String(priceDelayMs),
    '--stagger-ms',
    String(priceStaggerMs),
  ]);
  const priceRunDir = extractRunDir(priceLaunch.stdout);
  if (!priceRunDir) {
    throw new Error(`Could not parse price run directory.\n${priceLaunch.stdout}`);
  }
  const priceMeta = readRunMeta(priceRunDir);
  const resolvedPriceWorkers = parsePositiveInt(priceMeta.workers, priceWorkers);
  const priceWorkerFiles = await waitForWorkerOutputs({
    runDir: priceRunDir,
    workerCount: resolvedPriceWorkers,
    timeoutMs: waitTimeoutMs,
    label: 'prices',
  });
  runMerge(repoDir, 'scripts/merge-price-results.mjs', priceWorkerFiles, path.join('public', 'prices.json'));

  console.log(`Step 2/4 -> admin-only 96~118㎡ large sizes (${largeWorkers} workers)`);
  const largeLaunch = launchNodeScript(repoDir, 'scripts/crawl-admin-large-sizes-parallel.mjs', [
    '--workers',
    String(largeWorkers),
    '--delay-ms',
    String(largeDelayMs),
    '--stagger-ms',
    String(largeStaggerMs),
  ]);
  const largeRunDir = extractRunDir(largeLaunch.stdout);
  if (!largeRunDir) {
    throw new Error(`Could not parse admin-large run directory.\n${largeLaunch.stdout}`);
  }
  const largeMeta = readRunMeta(largeRunDir);
  const resolvedLargeWorkers = parsePositiveInt(largeMeta.workers, largeWorkers);
  const largeWorkerFiles = await waitForWorkerOutputs({
    runDir: largeRunDir,
    workerCount: resolvedLargeWorkers,
    timeoutMs: waitTimeoutMs,
    label: 'admin-large',
  });
  runMerge(
    repoDir,
    'scripts/merge-admin-large-size-results.mjs',
    largeWorkerFiles,
    path.join('public', 'admin-large-sizes.json'),
  );

  console.log('Step 3/4 -> build validation');
  execFileSync('npm', ['run', 'build'], {
    cwd: repoDir,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32',
  });

  console.log('Step 4/4 -> pipeline complete');
  console.log('Outputs refreshed:');
  console.log(`- ${path.join(repoDir, 'public', 'prices.json')}`);
  console.log(`- ${path.join(repoDir, 'public', 'admin-large-sizes.json')}`);
  console.log('Admin exports/map/board remain synchronized via live JSON sources.');
  console.log('Memo data is preserved and not overwritten by this pipeline.');
}

main().catch((error) => {
  console.error('Standard crawl pipeline failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
