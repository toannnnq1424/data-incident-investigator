import { spawn } from 'node:child_process';
import { log } from 'node:console';
import { once } from 'node:events';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const managedProcesses = [];

function fail(message) {
  throw new Error(message);
}

function startProcess(name, args, readyPattern) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, {
      cwd: repoRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const entry = { child, logs: '', name };
    let resolved = false;
    managedProcesses.push(entry);

    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error(`${name} did not become ready.\n${entry.logs}`));
      }
    }, 20_000);

    const collect = (chunk) => {
      entry.logs += chunk.toString();
      if (!resolved && readyPattern.test(entry.logs)) {
        resolved = true;
        clearTimeout(timeout);
        resolve(entry);
      }
    };

    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (error) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(error);
      }
    });
    child.on('exit', (code, signal) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(
          new Error(`${name} exited before ready: code=${code} signal=${signal}\n${entry.logs}`),
        );
      }
    });
  });
}

async function stopProcesses() {
  await Promise.all(
    managedProcesses.reverse().map(async ({ child }) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      child.kill('SIGINT');
      await Promise.race([
        once(child, 'exit'),
        delay(3_000).then(() => {
          if (child.exitCode === null && child.signalCode === null) {
            child.kill('SIGKILL');
          }
        }),
      ]);
    }),
  );
}

function assertText(text, pattern, label) {
  if (!pattern.test(text)) {
    fail(`Expected browser report to include ${label}.`);
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(`({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  })`);

  if (overflow.scrollWidth > overflow.clientWidth) {
    fail(
      `${label} has horizontal overflow: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}.`,
    );
  }
}

let browser;

try {
  await startProcess(
    'api',
    ['--filter', '@dii/api', 'dev'],
    /Server listening at http:\/\/127\.0\.0\.1:3001/,
  );
  await startProcess(
    'web',
    ['--filter', '@dii/web', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    /Local:\s+http:\/\/localhost:5173\//,
  );

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const browserProblems = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => browserProblems.push(`pageerror: ${error.message}`));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('#question').fill('Why did revenue drop today?');
  await page.locator('#entity-hint').fill('analytics.daily_revenue');
  await page.locator('#occurred-at').fill('2026-07-18T08:30');
  await page.locator('#symptom').fill('Revenue is 42% below the seven-day baseline.');
  await page.locator('button[type="submit"]').click();

  await page.getByText('Investigation processing').waitFor({ timeout: 2_000 });
  await page.getByText('Investigation completed').waitFor({ timeout: 5_000 });

  const reportText = await page.locator('body').innerText();
  assertText(reportText, /Related entities/i, 'related entities section');
  assertText(reportText, /analytics\.daily_revenue/i, 'seed entity');
  assertText(reportText, /raw\.orders/i, 'upstream entity');
  assertText(reportText, /Revenue overview/i, 'downstream entity');
  assertText(reportText, /Evidence/i, 'facts evidence section');
  assertText(reportText, /change-removed-gross-revenue/i, 'schema-change evidence ID');
  assertText(reportText, /Relevant lineage/i, 'lineage section');
  assertText(reportText, /lineage-upstream-1/i, 'lineage evidence ID');
  assertText(reportText, /Hypotheses/i, 'inference section');
  assertText(reportText, /92% confidence/i, 'confidence label');
  assertText(reportText, /Assumptions/i, 'assumption section');
  assertText(reportText, /Missing information/i, 'missing information section');
  assertText(reportText, /Recommended actions/i, 'recommendations section');
  await assertNoHorizontalOverflow(page, 'desktop report');
  await page.setViewportSize({ width: 390, height: 900 });
  await assertNoHorizontalOverflow(page, 'mobile report');

  if (browserProblems.length > 0) {
    fail(`Browser emitted console problems:\n${browserProblems.join('\n')}`);
  }

  log('Browser report display e2e passed.');
} finally {
  if (browser) {
    await browser.close();
  }
  await stopProcesses();
}
