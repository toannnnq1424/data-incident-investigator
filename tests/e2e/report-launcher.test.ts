import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import {
  buildWebPnpmArgs,
  chooseAvailablePorts,
  findLoopbackUrl,
  getPnpmInvocation,
} from './report-display.spec.mjs';

function bindPort(port: number) {
  return new Promise<ReturnType<typeof createServer>>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => resolve(server));
  });
}

function closeServer(server: ReturnType<typeof createServer>) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe('report e2e launcher', () => {
  it('uses Node with npm_execpath when the active pnpm runtime is available', () => {
    expect(
      getPnpmInvocation({
        env: { npm_execpath: 'C:\\tools\\pnpm.cjs' },
        execPath: 'C:\\tools\\node.exe',
        platform: 'win32',
      }),
    ).toEqual({
      command: 'C:\\tools\\node.exe',
      prefixArgs: ['C:\\tools\\pnpm.cjs'],
    });
  });

  it('uses a controlled Windows shim fallback when npm_execpath is unavailable', () => {
    expect(
      getPnpmInvocation({
        env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
        execPath: 'C:\\tools\\node.exe',
        platform: 'win32',
      }),
    ).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      prefixArgs: ['/d', '/s', '/c', 'pnpm.cmd'],
    });
  });

  it('forwards Vite arguments through pnpm exec without a run sentinel', () => {
    const args = buildWebPnpmArgs({ configPath: 'C:\\tmp\\vite.config.mjs', port: 43123 });

    expect(args).toContain('exec');
    expect(args).not.toContain('--');
    expect(args).toContain('43123');
  });

  it.each([
    ['localhost', 'Local: http://localhost:43123/'],
    ['IPv4 loopback', 'Local: http://127.0.0.1:43123/'],
    ['IPv6 loopback', 'Local: http://[::1]:43123/'],
  ])('accepts a matching %s readiness URL', (_label, logs) => {
    expect(findLoopbackUrl(logs, 43123)).toBe(logs.slice(logs.indexOf('http')));
  });

  it('removes ANSI formatting before parsing a readiness URL', () => {
    const logs = 'Local: \u001b[36mhttp://127.0.0.1:\u001b[1m43123\u001b[22m/\u001b[39m';

    expect(findLoopbackUrl(logs, 43123)).toBe('http://127.0.0.1:43123/');
  });

  it('rejects non-loopback and wrong-port readiness URLs', () => {
    expect(findLoopbackUrl('Local: http://example.com:43123/', 43123)).toBeUndefined();
    expect(findLoopbackUrl('Local: http://127.0.0.1:43124/', 43123)).toBeUndefined();
  });

  it('selects two distinct ports that are free after reservation', async () => {
    const { apiPort, webPort } = await chooseAvailablePorts();

    expect(apiPort).not.toBe(webPort);
    const servers = await Promise.all([bindPort(apiPort), bindPort(webPort)]);
    await Promise.all(servers.map(closeServer));
  });
});
