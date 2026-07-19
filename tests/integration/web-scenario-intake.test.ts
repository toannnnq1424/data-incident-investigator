import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CanonicalScenarioSelector,
  createCanonicalScenarioFormState,
  createLatestRequestGuard,
  markCanonicalScenarioCustom,
  type CanonicalScenarioSelection,
} from '../../apps/web/src/App.js';
import {
  CANONICAL_INCIDENT_SCENARIOS,
  CANONICAL_INCIDENT_SCENARIO_IDS,
  CanonicalIncidentScenarioCatalogSchema,
  IncidentRequestSchema,
} from '../../packages/shared-types/src/index.js';

const requireFromWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createElement } = await import(pathToFileURL(requireFromWeb.resolve('react')).href);
const { renderToStaticMarkup } = await import(
  pathToFileURL(requireFromWeb.resolve('react-dom/server')).href
);

describe('canonical scenario guided intake', () => {
  it('uses exactly seven stable ordered scenarios with validated existing request fields', () => {
    expect(CANONICAL_INCIDENT_SCENARIO_IDS).toEqual([
      'removed-schema-column',
      'stale-pipeline',
      'upstream-type-change',
      'wrong-dashboard-dataset',
      'delayed-ingestion',
      'incorrect-owner-or-domain',
      'insufficient-evidence',
    ]);
    expect(CANONICAL_INCIDENT_SCENARIOS.map((scenario) => scenario.id)).toEqual(
      CANONICAL_INCIDENT_SCENARIO_IDS,
    );
    expect(
      CanonicalIncidentScenarioCatalogSchema.safeParse(CANONICAL_INCIDENT_SCENARIOS).success,
    ).toBe(true);
    expect(Object.isFrozen(CANONICAL_INCIDENT_SCENARIOS)).toBe(true);

    for (const scenario of CANONICAL_INCIDENT_SCENARIOS) {
      expect(IncidentRequestSchema.safeParse(scenario.incident).success).toBe(true);
      const prefill = createCanonicalScenarioFormState(scenario.id);
      expect(prefill.selection).toEqual({ kind: 'scenario', scenarioId: scenario.id });
      expect(
        IncidentRequestSchema.parse({
          question: prefill.values.question,
          entityHint: prefill.values.entityHint,
          occurredAt: new Date(prefill.values.occurredAt).toISOString(),
          symptom: prefill.values.symptom,
        }),
      ).toEqual(scenario.incident);
    }
  });

  it('keeps manual, selected, edited custom, reset, and replacement behavior explicit', () => {
    const manual = createCanonicalScenarioFormState('manual');
    expect(manual).toEqual({
      selection: { kind: 'manual' },
      values: { question: '', entityHint: '', occurredAt: '', symptom: '' },
    });
    expect(markCanonicalScenarioCustom(manual.selection)).toEqual({ kind: 'manual' });

    const removedColumn = createCanonicalScenarioFormState('removed-schema-column');
    const editedValues = {
      ...removedColumn.values,
      question: `${removedColumn.values.question} Check the mobile segment too.`,
    };
    expect(markCanonicalScenarioCustom(removedColumn.selection)).toEqual({
      kind: 'custom',
      sourceScenarioId: 'removed-schema-column',
    });
    expect(editedValues.question).toContain('Check the mobile segment too.');

    const replacement = createCanonicalScenarioFormState('stale-pipeline');
    expect(replacement.selection).toEqual({ kind: 'scenario', scenarioId: 'stale-pipeline' });
    expect(replacement.values.question).toBe('Why has the daily orders table stopped refreshing?');
    expect(createCanonicalScenarioFormState('manual')).toEqual(manual);
  });

  it('renders a native single-select with a group label, help, status, and custom provenance', () => {
    const manualMarkup = renderToStaticMarkup(
      createElement(CanonicalScenarioSelector, {
        selection: { kind: 'manual' } satisfies CanonicalScenarioSelection,
        onSelect: () => undefined,
        onReset: () => undefined,
      }),
    );

    expect(manualMarkup).toContain('<fieldset class="scenario-selector">');
    expect(manualMarkup).toContain('<legend>Guided demo</legend>');
    expect(manualMarkup).toContain(
      '<label for="canonical-scenario">Canonical incident scenario</label>',
    );
    expect(manualMarkup).toContain('<select id="canonical-scenario"');
    expect(manualMarkup).toContain(
      'aria-describedby="canonical-scenario-help canonical-scenario-status"',
    );
    expect(manualMarkup).toContain('Manual input (default)');
    expect(manualMarkup.match(/<option/g) ?? []).toHaveLength(8);
    expect(manualMarkup).toContain('Clear and use manual input');
    expect(manualMarkup).toContain('aria-live="polite"');

    const customMarkup = renderToStaticMarkup(
      createElement(CanonicalScenarioSelector, {
        selection: {
          kind: 'custom',
          sourceScenarioId: 'removed-schema-column',
        } satisfies CanonicalScenarioSelection,
        onSelect: () => undefined,
        onReset: () => undefined,
      }),
    );
    expect(customMarkup).toContain('Custom values based on Removed schema column');
    expect(customMarkup).toContain('Your edits will be submitted.');
    expect(customMarkup).toContain('all fields remain editable');
  });

  it('retains latest-request ownership when a newer guided or manual submission begins', () => {
    const guard = createLatestRequestGuard();
    const olderScenarioRequest = guard.begin();
    const newerManualRequest = guard.begin();

    expect(guard.isCurrent(olderScenarioRequest)).toBe(false);
    expect(guard.isCurrent(newerManualRequest)).toBe(true);
  });
});
