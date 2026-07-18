import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host, port, exclusive: true }, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function findFreePort(host) {
  const server = createServer();
  await listen(server, host, 0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    await close(server);
    throw new Error(`Could not allocate a free port on ${host}.`);
  }

  await close(server);
  return address.port;
}

export async function assertPortAvailable(host, port) {
  const server = createServer();
  await listen(server, host, port);
  await close(server);
}

export function resolvePnpmInvocation(
  args,
  { env = process.env, execPath = process.execPath, platform = process.platform } = {},
) {
  if (env.npm_execpath) {
    return { command: execPath, args: [env.npm_execpath, ...args] };
  }

  if (platform === 'win32') {
    return {
      command: env.ComSpec ?? env.COMSPEC ?? 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm', ...args],
    };
  }

  return { command: 'pnpm', args };
}

export function createRuntimeConfig({ apiPort, host, viteConfigPath, webPort }) {
  if (apiPort === webPort) {
    throw new Error('API and web ports must be different.');
  }

  const apiUrl = `http://${host}:${apiPort}`;
  const webUrl = `http://${host}:${webPort}`;

  return {
    apiArgs: ['--filter', '@dii/api', 'dev'],
    apiEnv: { API_HOST: host, API_PORT: String(apiPort) },
    apiHealthUrl: `${apiUrl}/health`,
    apiUrl,
    host,
    webArgs: [
      '--filter',
      '@dii/web',
      'dev',
      '--config',
      viteConfigPath,
      '--host',
      host,
      '--port',
      String(webPort),
      '--strictPort',
    ],
    webEnv: {
      DII_E2E_API_URL: apiUrl,
      DII_E2E_HOST: host,
      DII_E2E_WEB_PORT: String(webPort),
    },
    webUrl,
  };
}

export function startManagedCommand(
  name,
  command,
  args,
  { cwd, env = process.env, platform = process.platform } = {},
) {
  const child = spawn(command, args, {
    cwd,
    detached: platform !== 'win32',
    env: { ...env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const entry = { child, logs: '', name, startError: undefined };
  const collect = (chunk) => {
    entry.logs += chunk.toString();
  };

  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.once('error', (error) => {
    entry.startError = error;
  });

  return entry;
}

export function startManagedPnpmProcess(name, args, options = {}) {
  const invocation = resolvePnpmInvocation(args, options);
  return startManagedCommand(name, invocation.command, invocation.args, options);
}

export async function waitForHttpReady(
  entry,
  url,
  { pollMs = 100, requestTimeoutMs = 1_000, timeoutMs = 20_000 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (entry.startError) {
      throw entry.startError;
    }
    if (entry.child.exitCode !== null || entry.child.signalCode !== null) {
      throw new Error(
        `${entry.name} exited before ${url} became ready: code=${entry.child.exitCode} signal=${entry.child.signalCode}\n${entry.logs}`,
      );
    }

    try {
      const response = await globalThis.fetch(url, {
        signal: globalThis.AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(pollMs);
  }

  throw new Error(
    `${entry.name} did not become ready at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}\n${entry.logs}`,
  );
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return true;
  }

  return Promise.race([once(child, 'exit').then(() => true), delay(timeoutMs).then(() => false)]);
}

async function runWindowsTreeKill(pid) {
  const killer = spawn('taskkill.exe', ['/pid', String(pid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  const [code] = await once(killer, 'exit');
  if (code !== 0) {
    throw new Error(`taskkill failed for managed process tree ${pid} with exit code ${code}.`);
  }
}

export async function stopManagedProcess(entry, { platform = process.platform } = {}) {
  const { child } = entry;
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (platform === 'win32') {
    await runWindowsTreeKill(child.pid);
    if (!(await waitForExit(child, 5_000))) {
      throw new Error(`Managed process tree ${entry.name} did not exit after taskkill.`);
    }
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }

  if (await waitForExit(child, 3_000)) {
    return;
  }

  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error;
    }
  }

  if (!(await waitForExit(child, 3_000))) {
    throw new Error(`Managed process group ${entry.name} did not exit after SIGKILL.`);
  }
}

export async function stopManagedProcesses(entries) {
  for (const entry of [...entries].reverse()) {
    await stopManagedProcess(entry);
  }
}
