import { spawn } from 'node:child_process';
import { log } from 'node:console';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const webRoot = join(repoRoot, 'apps', 'web');
const managedProcesses = [];
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function fail(message) {
  throw new Error(message);
}

export function getPnpmInvocation({
  env = process.env,
  execPath = process.execPath,
  platform = process.platform,
} = {}) {
  const npmExecPath = env.npm_execpath?.trim();

  if (npmExecPath && !/\.(?:bat|cmd|exe)$/i.test(npmExecPath)) {
    return { command: execPath, prefixArgs: [npmExecPath] };
  }

  if (platform === 'win32') {
    return {
      command: env.ComSpec ?? env.COMSPEC ?? 'cmd.exe',
      prefixArgs: ['/d', '/s', '/c', 'pnpm.cmd'],
    };
  }

  return { command: 'pnpm', prefixArgs: [] };
}

export function buildWebPnpmArgs({ configPath, port }) {
  return [
    '--filter',
    '@dii/web',
    'exec',
    'vite',
    '--config',
    configPath,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ];
}

export function findLoopbackUrl(logs, expectedPort) {
  const logsWithoutAnsi = stripVTControlCharacters(logs);
  const candidates = logsWithoutAnsi.matchAll(
    /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+\/?/giu,
  );

  for (const candidate of candidates) {
    const url = new URL(candidate[0]);
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));

    if (loopbackHosts.has(url.hostname.toLowerCase()) && port === expectedPort) {
      return url.href;
    }
  }

  return undefined;
}

function reserveAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not determine an available loopback port.'));
        return;
      }

      resolve({ port: address.port, server });
    });
  });
}

function closeReservation({ server }) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function chooseAvailablePorts() {
  const reservations = [];

  try {
    reservations.push(await reserveAvailablePort());
    reservations.push(await reserveAvailablePort());
    return {
      apiPort: reservations[0].port,
      webPort: reservations[1].port,
    };
  } finally {
    await Promise.all(reservations.map(closeReservation));
  }
}

function startProcess(name, pnpmArgs, { env = {}, expectedPort }) {
  return new Promise((resolve, reject) => {
    const invocation = getPnpmInvocation();
    const child = spawn(invocation.command, [...invocation.prefixArgs, ...pnpmArgs], {
      cwd: repoRoot,
      detached: process.platform !== 'win32',
      env: { ...process.env, ...env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const entry = { child, logs: '', name, pid: child.pid };
    let settled = false;
    managedProcesses.push(entry);

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`${name} did not become ready.\n${entry.logs}`));
      }
    }, 20_000);

    const rejectBeforeReady = (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    };

    const collect = (chunk) => {
      entry.logs += chunk.toString();
      const readyUrl = findLoopbackUrl(entry.logs, expectedPort);

      if (!settled && readyUrl) {
        settled = true;
        clearTimeout(timeout);
        resolve({ ...entry, readyUrl });
      }
    };

    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', rejectBeforeReady);
    child.on('exit', (code, signal) => {
      rejectBeforeReady(
        new Error(`${name} exited before ready: code=${code} signal=${signal}\n${entry.logs}`),
      );
    });
  });
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
    });
    child.once('error', resolve);
    child.once('exit', resolve);
  });
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

async function stopProcessTree({ child, pid }) {
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    await runCommand('taskkill.exe', ['/PID', String(pid), '/T', '/F']);
    return;
  }

  if (!processGroupExists(pid)) {
    return;
  }

  process.kill(-pid, 'SIGINT');
  await Promise.race([once(child, 'exit'), delay(3_000)]);

  if (processGroupExists(pid)) {
    process.kill(-pid, 'SIGKILL');
    await Promise.race([once(child, 'exit'), delay(1_000)]);
  }
}

async function stopProcesses() {
  for (const entry of managedProcesses.reverse()) {
    await stopProcessTree(entry);
  }
  managedProcesses.length = 0;
}

async function createTestViteConfig(apiUrl) {
  const directory = await mkdtemp(join(tmpdir(), 'dii-report-e2e-'));
  const configPath = join(directory, 'vite.config.mjs');
  const cacheDirectory = join(directory, 'vite-cache');
  const contents = `export default {
  root: ${JSON.stringify(webRoot)},
  cacheDir: ${JSON.stringify(cacheDirectory)},
  server: {
    proxy: {
      '/api': {
        target: ${JSON.stringify(apiUrl)},
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, ''),
      },
    },
  },
};
`;

  await writeFile(configPath, contents, 'utf8');
  return { configPath, directory };
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

export async function runReportDisplayE2E() {
  const startedAt = Date.now();
  const { apiPort, webPort } = await chooseAvailablePorts();
  let browser;
  let temporaryViteConfig;

  try {
    const api = await startProcess('api', ['--filter', '@dii/api', 'dev'], {
      env: { API_HOST: '127.0.0.1', API_PORT: String(apiPort) },
      expectedPort: apiPort,
    });
    temporaryViteConfig = await createTestViteConfig(api.readyUrl);
    const web = await startProcess(
      'web',
      buildWebPnpmArgs({ configPath: temporaryViteConfig.configPath, port: webPort }),
      { expectedPort: webPort },
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

    await page.goto(web.readyUrl, { waitUntil: 'networkidle' });
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

    const durationMs = Date.now() - startedAt;
    if (durationMs >= 180_000) {
      fail(`Browser report display e2e exceeded three minutes: ${durationMs}ms.`);
    }

    log(
      `Browser report display e2e passed in ${durationMs}ms (api=${api.readyUrl}, web=${web.readyUrl}).`,
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopProcesses();
    if (temporaryViteConfig) {
      await rm(temporaryViteConfig.directory, { recursive: true, force: true });
    }
  }
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  await runReportDisplayE2E();
}
