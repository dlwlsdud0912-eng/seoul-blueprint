import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteCmd(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildWorkerArgs({
  workerCount,
  workerIndex,
  delayMs,
  startupDelayMs,
  outputPath,
  maxApartmentsArg,
  idsFileArg,
}) {
  const args = [
    'scripts/crawl-admin-large-sizes.mjs',
    '--worker-count',
    String(workerCount),
    '--worker-index',
    String(workerIndex),
    '--delay-ms',
    String(delayMs),
    '--startup-delay-ms',
    String(startupDelayMs),
    '--output',
    outputPath,
  ];

  if (idsFileArg) {
    args.push('--ids-file', idsFileArg);
  }

  if (maxApartmentsArg) {
    args.push('--max-apartments', String(maxApartmentsArg));
  }

  return args;
}

function spawnDetachedNode(args, cwd, logPath) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, 'a');
  const child = spawn('node', args, {
    cwd,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    windowsHide: false,
  });
  child.unref();
  fs.closeSync(logFd);
  return child;
}

async function waitForFile(filePath, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return true;
    await delay(500);
  }
  return false;
}

async function runSmokeTest({ repoDir, runDir, delayMs, idsFileArg }) {
  const smokeDir = path.join(runDir, 'smoke-test');
  fs.mkdirSync(smokeDir, { recursive: true });

  const outputPath = path.join(smokeDir, 'worker-smoke.json');
  const logPath = path.join(smokeDir, 'worker-smoke.log');
  const args = buildWorkerArgs({
    workerCount: 5,
    workerIndex: 1,
    delayMs: Math.min(delayMs, 1000),
    startupDelayMs: 0,
    outputPath,
    maxApartmentsArg: '2',
    idsFileArg,
  });

  fs.writeFileSync(logPath, '', 'utf-8');
  let exitCode = 0;
  try {
    const logFd = fs.openSync(logPath, 'a');
    execFileSync('node', args, {
      cwd: repoDir,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
    });
    fs.closeSync(logFd);
  } catch (error) {
    exitCode = typeof error?.status === 'number' ? error.status : 1;
  }

  const hasOutput = await waitForFile(outputPath, 3000);
  if (exitCode !== 0 || !hasOutput) {
    const logTail = fs.existsSync(logPath)
      ? fs.readFileSync(logPath, 'utf-8').split(/\r?\n/).slice(-20).join('\n')
      : '(no log)';
    throw new Error(`Smoke test failed (exit=${exitCode}, json=${hasOutput}).\n${logTail}`);
  }

  const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  if (!parsed || typeof parsed !== 'object' || typeof parsed.totalCount !== 'number' || !parsed.data) {
    throw new Error('Smoke test JSON structure invalid.');
  }

  return { outputPath, logPath };
}

async function main() {
  const repoDir = process.cwd();
  const workerCount = parsePositiveInt(getArgValue('--workers'), 5);
  const delayMs = parsePositiveInt(getArgValue('--delay-ms'), 1800);
  const staggerMs = parsePositiveInt(getArgValue('--stagger-ms'), 15000);
  const maxApartmentsArg = getArgValue('--max-apartments');
  const idsFileArg = getArgValue('--ids-file');
  const outputArg = getArgValue('--output');
  const skipSmokeTest = hasFlag('--skip-smoke-test');
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const runDir = path.join(repoDir, 'run_logs', `admin-large-parallel-${timestamp}`);

  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'run.meta.txt'), [
    `timestamp=${timestamp}`,
    `workers=${workerCount}`,
    `delayMs=${delayMs}`,
    `staggerMs=${staggerMs}`,
    `cwd=${repoDir}`,
    `startedAt=${new Date().toISOString()}`,
    `smokeTest=${skipSmokeTest ? 'skipped' : 'required'}`,
  ].join('\n'), 'utf-8');

  console.log(`Starting admin large-size parallel crawl with ${workerCount} workers`);
  console.log(`Run directory: ${runDir}`);

  if (!skipSmokeTest) {
    console.log('Running smoke test before full launch...');
    const smoke = await runSmokeTest({ repoDir, runDir, delayMs, idsFileArg });
    console.log(`Smoke test passed -> ${smoke.outputPath}`);
  } else {
    console.log('Smoke test skipped by flag.');
  }

  const workerOutputs = [];
  for (let i = 1; i <= workerCount; i += 1) {
    const outputPath = path.join(runDir, `worker-${i}-of-${workerCount}.json`);
    const logPath = path.join(runDir, `worker-${i}-of-${workerCount}.log`);
    const startupDelayMs = (i - 1) * staggerMs;
    const args = buildWorkerArgs({
      workerCount,
      workerIndex: i,
      delayMs,
      startupDelayMs,
      outputPath,
      maxApartmentsArg,
      idsFileArg,
    });
    spawnDetachedNode(args, repoDir, logPath);
    workerOutputs.push(outputPath);
    console.log(`Worker ${i}/${workerCount} launched -> ${outputPath}`);
  }

  const mergedOutput = outputArg || path.join(repoDir, 'public', 'admin-large-sizes.json');
  const mergeCommand = `node scripts/merge-admin-large-size-results.mjs ${workerOutputs.map((file) => quoteCmd(file)).join(' ')} --output ${quoteCmd(mergedOutput)}`;
  fs.writeFileSync(path.join(runDir, 'merge.cmd'), `${mergeCommand}\r\n`, 'utf-8');

  console.log('');
  console.log('Merge command after all workers finish:');
  console.log(mergeCommand);
}

main().catch((error) => {
  console.error('Admin large-size parallel launcher failed before full start.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
