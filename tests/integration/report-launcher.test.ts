import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertPortAvailable,
  createRuntimeConfig,
  findFreePort,
  resolvePnpmInvocation,
  startManagedCommand,
  stopManagedProcesses,
  waitForHttpReady,
} from '../e2e/report-launcher.mjs';

const viteConfigPath = fileURLToPath(new URL('../e2e/vite.config.mjs', import.meta.url));
const requireFromWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { resolveConfig } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href);

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
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

describe('Phase 1 browser launcher contracts', () => {
  it('resolves pnpm through the current Node runtime and has a safe Windows fallback', () => {
    for (const npmExecPath of ['C:\\tools\\pnpm.mjs', 'C:\\tools\\pnpm.cjs']) {
      expect(
        resolvePnpmInvocation(['--filter', '@dii/api', 'dev'], {
          env: { npm_execpath: npmExecPath },
          execPath: 'C:\\node\\node.exe',
          platform: 'win32',
        }),
      ).toEqual({
        command: 'C:\\node\\node.exe',
        args: [npmExecPath, '--filter', '@dii/api', 'dev'],
      });
    }

    expect(
      resolvePnpmInvocation(['--filter', '@dii/web', 'dev'], {
        env: {
          ComSpec: 'C:\\Windows\\System32\\cmd.exe',
          npm_execpath: '  C:\\tools\\pnpm.CMD  ',
        },
        platform: 'win32',
      }),
    ).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm.cmd', '--filter', '@dii/web', 'dev'],
    });

    expect(
      resolvePnpmInvocation(['--filter', '@dii/web', 'dev'], {
        env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
        platform: 'win32',
      }),
    ).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm.cmd', '--filter', '@dii/web', 'dev'],
    });

    expect(
      resolvePnpmInvocation(['--filter', '@dii/api', 'dev'], {
        env: {},
        platform: 'linux',
      }),
    ).toEqual({
      command: 'pnpm',
      args: ['--filter', '@dii/api', 'dev'],
    });
  });

  it('keeps dynamic commands, proxy, readiness, and browser URLs synchronized', async () => {
    const host = '127.0.0.1';
    const apiPort = await findFreePort(host);
    let webPort = await findFreePort(host);
    while (webPort === apiPort) {
      webPort = await findFreePort(host);
    }

    const runtime = createRuntimeConfig({
      apiPort,
      host,
      viteConfigPath,
      webPort,
    });

    expect(runtime.apiEnv).toEqual({ API_HOST: host, API_PORT: String(apiPort) });
    expect(runtime.apiHealthUrl).toBe(`http://${host}:${apiPort}/health`);
    expect(runtime.webEnv.DII_E2E_API_URL).toBe(runtime.apiUrl);
    expect(runtime.webUrl).toBe(`http://${host}:${webPort}`);
    expect(runtime.webArgs).not.toContain('--');
    expect(runtime.webArgs).toContain(String(webPort));

    const previousE2eEnv = Object.fromEntries(
      Object.keys(runtime.webEnv).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, runtime.webEnv);
    try {
      const viteConfig = await resolveConfig({ configFile: viteConfigPath }, 'serve');
      expect(viteConfig.server.host).toBe(host);
      expect(viteConfig.server.port).toBe(webPort);
      expect(viteConfig.server.strictPort).toBe(true);
      expect(viteConfig.server.proxy?.['/api']?.target).toBe(runtime.apiUrl);
    } finally {
      for (const [key, value] of Object.entries(previousE2eEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }

    const server = createServer((_request, response) => response.end('ready'));
    await listen(server, host, webPort);
    try {
      const entry = {
        child: { exitCode: null, signalCode: null },
        logs: '',
        name: 'readiness probe',
        startError: undefined,
      };
      await expect(waitForHttpReady(entry, runtime.webUrl)).resolves.toBeUndefined();
    } finally {
      await close(server);
    }
  });

  it('terminates only the managed descendant process tree and releases its listener', async () => {
    const host = '127.0.0.1';
    const port = await findFreePort(host);
    const childSource = `
        const { createServer } = require('node:http');
        createServer((_request, response) => response.end('ready'))
          .listen(${port}, '${host}', () => console.log('ready'));
        setInterval(() => {}, 1000);
      `;
    const parentSource = `
        const { spawn } = require('node:child_process');
        spawn(process.execPath, ['-e', ${JSON.stringify(childSource)}], {
          stdio: ['ignore', 'inherit', 'inherit']
        });
        setInterval(() => {}, 1000);
      `;
    const entry = startManagedCommand('cleanup contract fixture', process.execPath, [
      '-e',
      parentSource,
    ]);

    try {
      await waitForHttpReady(entry, `http://${host}:${port}`, { timeoutMs: 8_000 });
    } finally {
      await stopManagedProcesses([entry]);
    }

    await expect(assertPortAvailable(host, port)).resolves.toBeUndefined();
  }, 15_000);
});
