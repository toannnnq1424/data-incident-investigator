import { describe, expect, it } from 'vitest';
import { getMetadataHealthPresentation } from '../../apps/web/src/App.js';
import { MetadataHealthResponseSchema } from '../../packages/shared-types/src/index.js';

describe('metadata health presentation', () => {
  it('presents loading and fixture-ready states clearly', () => {
    expect(getMetadataHealthPresentation(undefined)).toEqual({
      sourceLabel: 'Checking metadata source',
      statusLabel: 'Loading',
      message: 'Checking metadata readiness…',
      tone: 'loading',
    });

    const fixtureHealth = MetadataHealthResponseSchema.parse({
      mode: 'fixture',
      status: 'ready',
      message: 'Fixture metadata is ready.',
    });
    expect(getMetadataHealthPresentation(fixtureHealth)).toEqual({
      sourceLabel: 'Fixture metadata',
      statusLabel: 'Ready',
      message: 'Fixture metadata is ready.',
      tone: 'ready',
    });
  });

  it.each([
    ['unconfigured', 'Setup needed'],
    ['unauthorized', 'Authorization needed'],
    ['unavailable', 'Unavailable'],
    ['timeout', 'Timed out'],
    ['invalid_response', 'Unexpected response'],
  ] as const)('presents DataHub %s as an actionable problem', (status, statusLabel) => {
    const health = MetadataHealthResponseSchema.parse({
      mode: 'datahub',
      status,
      message: `Safe ${status} guidance.`,
    });

    expect(getMetadataHealthPresentation(health)).toEqual({
      sourceLabel: 'DataHub metadata',
      statusLabel,
      message: `Safe ${status} guidance.`,
      tone: 'problem',
    });
  });

  it('uses a safe fallback when the API response cannot be loaded', () => {
    expect(getMetadataHealthPresentation(null)).toEqual({
      sourceLabel: 'Metadata source',
      statusLabel: 'Unavailable',
      message: 'Metadata readiness could not be loaded. Refresh the page or check the API service.',
      tone: 'problem',
    });
  });
});
