import baseConfig from '../../apps/web/vite.config.ts';

const host = process.env.DII_E2E_HOST;
const apiUrl = process.env.DII_E2E_API_URL;
const webPort = Number(process.env.DII_E2E_WEB_PORT);

if (!host || !apiUrl || !Number.isInteger(webPort) || webPort <= 0) {
  throw new Error('The e2e Vite host, API URL, and web port must be configured.');
}

export default {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host,
    port: webPort,
    strictPort: true,
    proxy: {
      ...baseConfig.server?.proxy,
      '/api': {
        ...baseConfig.server?.proxy?.['/api'],
        target: apiUrl,
      },
    },
  },
};
