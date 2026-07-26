import type { PluginOption } from 'vite';

export function createViteBundleAttributionPlugin(
  environment?: Record<string, string | undefined>,
): PluginOption;
