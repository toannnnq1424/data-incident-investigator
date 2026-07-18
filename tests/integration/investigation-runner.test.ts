import { describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import {
  DeterministicInvestigationRunner,
  FIXTURE_INVESTIGATION_LIMITS,
} from '../../packages/agent-core/src/index.js';
import { createFixtureMetadataAdapter } from '../../packages/datahub-client/src/index.js';
import {
  IncidentRequestSchema,
  InvestigationReportSchema,
} from '../../packages/shared-types/src/index.js';

describe('deterministic fixture investigation runner', () => {
  it('produces a repeatable schema-valid report with resolved evidence references', async () => {
    const request = IncidentRequestSchema.parse(canonicalIncident.request);
    const runner = new DeterministicInvestigationRunner();
    const incidentId = 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800';

    const firstReport = await runner.investigate(request, {
      incidentId,
      metadata: createFixtureMetadataAdapter(),
      limits: FIXTURE_INVESTIGATION_LIMITS,
    });
    const secondReport = await runner.investigate(request, {
      incidentId,
      metadata: createFixtureMetadataAdapter(),
      limits: FIXTURE_INVESTIGATION_LIMITS,
    });

    expect(InvestigationReportSchema.safeParse(firstReport).success).toBe(true);
    expect(secondReport).toEqual(firstReport);
    expect(firstReport.entities.map((entity) => entity.name)).toEqual([
      'analytics.daily_revenue',
      'raw.orders',
      'Revenue overview',
    ]);
    expect(firstReport.hypotheses[0]?.summary).toContain('schema change on raw.orders');

    const evidenceIds = new Set(firstReport.evidence.map((evidence) => evidence.id));
    expect(
      firstReport.hypotheses.every((hypothesis) =>
        hypothesis.evidenceIds.every((evidenceId) => evidenceIds.has(evidenceId)),
      ),
    ).toBe(true);
  });
});
