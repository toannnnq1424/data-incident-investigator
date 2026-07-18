import { log } from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import {
  assertPortAvailable,
  createRuntimeConfig,
  findFreePort,
  startManagedPnpmProcess,
  stopManagedProcesses,
  waitForHttpReady,
} from './report-launcher.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const viteConfigPath = fileURLToPath(new URL('./vite.config.mjs', import.meta.url));
const managedProcesses = [];

function fail(message) {
  throw new Error(message);
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
let runtime;
const startedAt = Date.now();

try {
  const host = '127.0.0.1';
  const apiPort = await findFreePort(host);
  let webPort = await findFreePort(host);
  while (webPort === apiPort) {
    webPort = await findFreePort(host);
  }
  runtime = createRuntimeConfig({ apiPort, host, viteConfigPath, webPort });
  log(`Browser e2e selected API ${runtime.apiUrl} and web ${runtime.webUrl}.`);

  const api = startManagedPnpmProcess('api', runtime.apiArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...runtime.apiEnv },
  });
  managedProcesses.push(api);
  await waitForHttpReady(api, runtime.apiHealthUrl);

  const web = startManagedPnpmProcess('web', runtime.webArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...runtime.webEnv },
  });
  managedProcesses.push(web);
  await waitForHttpReady(web, runtime.webUrl);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const browserProblems = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => browserProblems.push(`pageerror: ${error.message}`));

  await page.goto(runtime.webUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Fixture metadata' }).waitFor({ timeout: 2_000 });
  await page.getByText('Fixture metadata is ready.', { exact: true }).waitFor({ timeout: 2_000 });
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

  const evidenceIds = new Set(
    await page.locator('.evidence-list .evidence-meta > code').allTextContents(),
  );
  const referencedEvidenceIds = await page
    .locator('.evidence-reference-list code')
    .allTextContents();
  const unresolvedEvidenceIds = referencedEvidenceIds.filter(
    (evidenceId) => !evidenceIds.has(evidenceId),
  );
  if (unresolvedEvidenceIds.length > 0) {
    fail(`Browser report contains unresolved evidence IDs: ${unresolvedEvidenceIds.join(', ')}`);
  }

  await assertNoHorizontalOverflow(page, 'desktop report');
  await page.setViewportSize({ width: 390, height: 900 });
  await assertNoHorizontalOverflow(page, 'mobile report');

  if (browserProblems.length > 0) {
    fail(`Browser emitted console problems:\n${browserProblems.join('\n')}`);
  }
} finally {
  if (browser) {
    await browser.close();
  }
  await stopManagedProcesses(managedProcesses);
  if (runtime) {
    await assertPortAvailable(runtime.host, Number(runtime.apiEnv.API_PORT));
    await assertPortAvailable(runtime.host, Number(runtime.webEnv.DII_E2E_WEB_PORT));
  }
}

const durationMs = Date.now() - startedAt;
if (durationMs >= 180_000) {
  fail(`Browser report display e2e exceeded three minutes: ${durationMs}ms.`);
}
log(`Browser report display e2e passed in ${durationMs}ms.`);
