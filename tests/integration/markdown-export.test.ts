import { afterEach, describe, expect, it } from 'vitest';
import canonicalIncident from '../../fixtures/incidents/removed-schema-column.json';
import { buildServer } from '../../apps/api/src/index.js';
import {
  DEFAULT_INCIDENT_CONTEXT_LIMITS,
  type InvestigationRunner,
} from '../../packages/agent-core/src/index.js';
import {
  createIncidentMarkdownExport,
  INCIDENT_MARKDOWN_EXPORT_MAX_FILENAME_LENGTH,
  INCIDENT_MARKDOWN_EXPORT_VERSION,
  IncidentRequestSchema,
  IncidentRetrievalResponseSchema,
  INVESTIGATION_EVENT_ACTION_SUMMARIES,
  INVESTIGATION_TERMINATION_MESSAGES,
  type IncidentRetrievalResponse,
} from '../../packages/shared-types/src/index.js';

const servers: ReturnType<typeof buildServer>[] = [];
const request = IncidentRequestSchema.parse(canonicalIncident.request);

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function submitIncident(server: ReturnType<typeof buildServer>) {
  const accepted = await server.inject({ method: 'POST', url: '/incidents', payload: request });
  expect(accepted.statusCode).toBe(202);
  return accepted.json<{ incidentId: string }>().incidentId;
}

async function waitForTerminal(server: ReturnType<typeof buildServer>, incidentId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await server.inject({ method: 'GET', url: `/incidents/${incidentId}` });
    const incident = IncidentRetrievalResponseSchema.parse(response.json());
    if (incident.status !== 'processing') return incident;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Fixture investigation did not reach a terminal state.');
}

async function canonicalCompleted() {
  let eventTimestamp = Date.parse('2026-07-22T00:00:00.000Z');
  const server = buildServer({
    environment: {},
    eventClock: () => eventTimestamp++,
    executionClock: () => 0,
    logger: false,
    processingDelayMs: 0,
  });
  servers.push(server);
  const terminal = await waitForTerminal(server, await submitIncident(server));
  expect(terminal.status).toBe('completed');
  if (terminal.status !== 'completed') throw new Error('Expected canonical completion.');
  return { server, terminal };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sectionIndexes(markdown: string, sections: readonly string[]) {
  return sections.map((section) => markdown.indexOf(`## ${section}`));
}

describe('deterministic Markdown incident export', () => {
  it('serializes the complete canonical fixture to byte-identical UTF-8 with stable ordered content', async () => {
    const { terminal } = await canonicalCompleted();
    const first = createIncidentMarkdownExport(terminal);
    const second = createIncidentMarkdownExport(clone(terminal));

    expect(first).toEqual(second);
    expect(first.version).toBe(INCIDENT_MARKDOWN_EXPORT_VERSION);
    expect(first.markdown).not.toContain('\r');
    expect(first.markdown.endsWith('\n')).toBe(true);
    expect(first.markdown.endsWith('\n\n')).toBe(false);
    expect(new TextDecoder().decode(new TextEncoder().encode(first.markdown))).toBe(first.markdown);
    expect(first.filename).toBe(
      `incident-report-analytics-daily-revenue-${terminal.incidentId}.md`,
    );
    expect(first.filename.length).toBeLessThanOrEqual(INCIDENT_MARKDOWN_EXPORT_MAX_FILENAME_LENGTH);

    const indexes = sectionIndexes(first.markdown, [
      'Incident identity',
      'Investigation summary and termination',
      'Ranked hypotheses and confidence',
      'Evidence catalog',
      'Blast radius',
      'Remediation and safe next steps',
      'Investigation activity',
      'Assumptions, limitations, and missing information',
      'Export metadata',
    ]);
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(first.markdown).toContain('- Evidence confidence: 81% (high)');
    expect(first.markdown).toContain('- Formula: evidence-confidence-v1');
    expect(first.markdown).toContain('- Analysis version: blast-radius-v1');
    expect(first.markdown).toContain('- Entity: analytics\\.daily\\_revenue (dataset)');
    expect(first.markdown).toContain('- Entity: Revenue overview (dashboard)');
    expect(first.markdown).toContain('- Execution status: not_executed');
    expect(first.markdown).toContain('[Evidence 001](#evidence-001)');
    expect(first.markdown).toContain('[Hypothesis 001](#hypothesis-001)');
    expect(first.markdown).toContain('### Evidence 001');
    expect(first.markdown).toContain('### Hypothesis 001');
    expect(first.markdown).toContain('investigation_terminated');
    expect(first.markdown).toContain('not a confirmed cause');
    expect(first.markdown).not.toContain('Generated at');
  });

  it('returns exact terminal download headers, a safe filename, and typed route errors', async () => {
    const server = buildServer({ environment: {}, logger: false });
    servers.push(server);
    const incidentId = await submitIncident(server);

    const processing = await server.inject({
      method: 'GET',
      url: `/incidents/${incidentId}/report.md`,
    });
    expect(processing.statusCode).toBe(409);
    expect(processing.json()).toEqual({
      error: {
        code: 'REPORT_NOT_READY',
        message: 'The incident report is still processing.',
      },
    });

    const terminal = await waitForTerminal(server, incidentId);
    const expected = createIncidentMarkdownExport(terminal);
    const download = await server.inject({
      method: 'GET',
      url: `/incidents/${incidentId}/report.md`,
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(download.headers['content-disposition']).toBe(
      `attachment; filename="${expected.filename}"`,
    );
    expect(download.headers['cache-control']).toBe('no-store');
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(download.rawPayload).toEqual(Buffer.from(expected.markdown, 'utf8'));

    const invalid = await server.inject({ method: 'GET', url: '/incidents/not-a-uuid/report.md' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe('VALIDATION_ERROR');
    const unknown = await server.inject({
      method: 'GET',
      url: '/incidents/ba4ec0e8-da23-4f34-a3c7-9f25c44da800/report.md',
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.code).toBe('NOT_FOUND');
  });

  it('renders insufficient, unknown, degraded, failed, partial, unavailable, and truncated states truthfully', async () => {
    const insufficientRunner: InvestigationRunner = {
      async investigate(_request, context) {
        return {
          incidentId: context.incidentId,
          summary: 'Validated metadata was available, but exact scoring evidence was insufficient.',
          entities: [],
          evidence: [
            {
              id: 'metadata-seed',
              category: 'metadata',
              statement: 'Fixture metadata was available.',
            },
          ],
          hypotheses: [
            {
              id: 'legacy-metadata-hypothesis',
              summary: 'Available metadata is insufficient for a scored change inference.',
              confidence: {
                status: 'not_scored',
                reasonCode: 'deterministic_scoring_pending',
                explanation:
                  'Confidence is not scored until validated evidence signals are evaluated by the code-owned formula.',
              },
              evidenceIds: ['metadata-seed'],
            },
          ],
          recommendations: [],
          assumptions: [],
          missingInformation: ['The exact suspicious change is absent from report evidence.'],
        };
      },
    };
    const insufficientServer = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      processingDelayMs: 0,
      runner: insufficientRunner,
    });
    servers.push(insufficientServer);
    const insufficient = await waitForTerminal(
      insufficientServer,
      await submitIncident(insufficientServer),
    );
    expect(insufficient.status).toBe('completed');
    const insufficientMarkdown = createIncidentMarkdownExport(insufficient).markdown;
    expect(insufficientMarkdown).toContain('not scored (insufficient_evidence)');
    expect(insufficientMarkdown).toContain('- Status: unknown');
    expect(insufficientMarkdown).toContain('must not be read as zero impact');

    const degradedServer = buildServer({
      environment: {},
      executionClock: () => 0,
      logger: false,
      metadataHealth: {
        healthCheck: async () => ({ status: 'unavailable', message: 'discarded provider detail' }),
      },
      mode: 'datahub',
      processingDelayMs: 0,
    });
    servers.push(degradedServer);
    const degraded = await waitForTerminal(degradedServer, await submitIncident(degradedServer));
    expect(degraded.status).toBe('degraded');
    const degradedMarkdown = createIncidentMarkdownExport(degraded).markdown;
    expect(degradedMarkdown).toContain('> Degraded investigation:');
    expect(degradedMarkdown).toContain('No schema-validated report was preserved');
    expect(degradedMarkdown).toContain('continue\\_fixture\\_mode');
    expect(degradedMarkdown).not.toContain('discarded provider detail');

    const { terminal } = await canonicalCompleted();
    const partialInput = clone(terminal);
    partialInput.report.blastRadius = {
      ...partialInput.report.blastRadius,
      status: 'partial',
      explanation:
        'Blast radius includes verified downstream impacts, but coverage is incomplete for the listed reasons.',
      coverage: {
        ...partialInput.report.blastRadius.coverage,
        reasonCodes: ['lineage_truncated'],
        truncatedGraphs: 1,
      },
    };
    const partial = createIncidentMarkdownExport(
      IncidentRetrievalResponseSchema.parse(partialInput),
    ).markdown;
    expect(partial).toContain('- Status: partial');
    expect(partial).toContain('lineage_truncated');
    expect(partial).toContain('analytics\\.daily\\_revenue');

    const unavailableInput = clone(terminal);
    unavailableInput.report.blastRadius = {
      ...unavailableInput.report.blastRadius,
      status: 'unavailable',
      explanation:
        'Blast-radius analysis is unavailable because no usable validated lineage result was returned.',
      impacts: [],
      summary: { total: 0, datasets: 0, pipelines: 0, dashboards: 0 },
      coverage: {
        ...unavailableInput.report.blastRadius.coverage,
        reasonCodes: ['provider_unavailable'],
        rootsAnalyzed: 0,
        visitedEntities: 0,
      },
    };
    const unavailable = createIncidentMarkdownExport(
      IncidentRetrievalResponseSchema.parse(unavailableInput),
    ).markdown;
    expect(unavailable).toContain('- Status: unavailable');
    expect(unavailable).toContain('must not be read as zero impact');

    const failed = IncidentRetrievalResponseSchema.parse({
      incidentId: 'ba4ec0e8-da23-4f34-a3c7-9f25c44da800',
      status: 'failed',
      execution: {
        toolCalls: 1,
        agentSteps: 1,
        durationMs: 10,
        lineageEntitiesVisited: 0,
        retries: 0,
        terminationReason: 'tool_call_limit_reached',
      },
      eventTrail: [
        {
          id: 'event-0001',
          sequence: 1,
          timestamp: '2026-07-22T00:00:00.000Z',
          actionType: 'question_normalized',
          summary: INVESTIGATION_EVENT_ACTION_SUMMARIES.question_normalized,
        },
        {
          id: 'event-0002',
          sequence: 2,
          timestamp: '2026-07-22T00:00:01.000Z',
          actionType: 'investigation_terminated',
          summary: INVESTIGATION_TERMINATION_MESSAGES.tool_call_limit_reached,
          terminationReason: 'tool_call_limit_reached',
          durationMs: 10,
        },
      ],
      error: {
        code: 'INVESTIGATION_LIMIT_REACHED',
        message: INVESTIGATION_TERMINATION_MESSAGES.tool_call_limit_reached,
      },
    });
    const failedMarkdown = createIncidentMarkdownExport(failed).markdown;
    expect(failedMarkdown).toContain('> Failed investigation:');
    expect(failedMarkdown).toContain('no schema-validated investigation report was produced');
    expect(failedMarkdown).not.toContain('Investigation status: completed');

    const truncatedServer = buildServer({
      contextLimits: {
        ...DEFAULT_INCIDENT_CONTEXT_LIMITS,
        lineageDepth: 1,
        lineageEntityCount: 1,
      },
      environment: {},
      logger: false,
      processingDelayMs: 0,
    });
    servers.push(truncatedServer);
    const truncated = await waitForTerminal(truncatedServer, await submitIncident(truncatedServer));
    expect(truncated.status).toBe('degraded');
    const truncatedMarkdown = createIncidentMarkdownExport(truncated).markdown;
    expect(truncatedMarkdown).toContain('lineage_truncated');
    expect(truncatedMarkdown).toContain('incomplete_lineage');
    expect(truncatedMarkdown).toMatch(/schema-validated partial report/i);
  });

  it('neutralizes Markdown, HTML, links, bidi, credentials, internal hosts, and unsafe filenames', async () => {
    const { terminal } = await canonicalCompleted();
    const unsafe = clone(terminal);
    unsafe.contextStage.intent.question =
      '# heading\n- list | table ``` <script>alert(1)</script> [click](javascript:alert(1)) https://secret.invalid token=abcd Bearer abcdefgh sk-proj-1234567890 internal.service.internal \u202Eend';
    unsafe.report.recommendations.push(
      '<img src=x onerror=alert(1)> https://private.invalid api_key=abcdefgh localhost:3001',
    );
    const exported = createIncidentMarkdownExport(unsafe);

    expect(exported.markdown).not.toContain('<script');
    expect(exported.markdown).not.toContain('<img');
    expect(exported.markdown).not.toContain('javascript:');
    expect(exported.markdown).not.toContain('https://');
    expect(exported.markdown).not.toContain('secret.invalid');
    expect(exported.markdown).not.toContain('private.invalid');
    expect(exported.markdown).not.toContain('token=abcd');
    expect(exported.markdown).not.toContain('Bearer abcdefgh');
    expect(exported.markdown).not.toContain('sk-proj-1234567890');
    expect(exported.markdown).not.toContain('api_key=abcdefgh');
    expect(exported.markdown).not.toContain('internal.service.internal');
    expect(exported.markdown).not.toContain('localhost:3001');
    expect(exported.markdown).not.toContain('\u202E');
    expect(exported.markdown).not.toContain('```');
    expect(exported.markdown).not.toMatch(/^# heading$/mu);
    expect(exported.markdown).toContain('\\[redacted URL\\]');
    expect(exported.markdown).toContain('\\[redacted credential\\]');
    expect(exported.markdown).toContain('\\[redacted internal host\\]');

    const reserved = clone(terminal);
    reserved.contextStage.facts.selectedEntity.name = 'CON';
    reserved.contextStage.facts.candidateEntities[0]!.name = 'CON';
    const reservedFilename = createIncidentMarkdownExport(reserved).filename;
    expect(reservedFilename).toBe(`incident-report-incident-${terminal.incidentId}.md`);

    const longTraversal = clone(terminal);
    const longName = `..\\..\\evil\r\nContent-Disposition: attachment; filename="owned.md"${'a'.repeat(180)}`;
    longTraversal.contextStage.facts.selectedEntity.name = longName;
    longTraversal.contextStage.facts.candidateEntities[0]!.name = longName;
    const filename = createIncidentMarkdownExport(longTraversal).filename;
    expect(filename.length).toBeLessThanOrEqual(INCIDENT_MARKDOWN_EXPORT_MAX_FILENAME_LENGTH);
    expect(filename).toMatch(/^[a-z0-9-]+\.md$/);
    expect(filename).not.toMatch(/[\\/:*?"<>|\r\n]/u);
    expect(filename).not.toContain('..');
  });

  it('rejects processing state and dangling evidence or blast-radius references before serialization', async () => {
    const server = buildServer({ environment: {}, logger: false });
    servers.push(server);
    const incidentId = await submitIncident(server);
    const processingResponse = await server.inject({
      method: 'GET',
      url: `/incidents/${incidentId}`,
    });
    const processing = IncidentRetrievalResponseSchema.parse(processingResponse.json());
    expect(() => createIncidentMarkdownExport(processing)).toThrow(
      'A processing investigation cannot be exported.',
    );

    const { terminal } = await canonicalCompleted();
    const dangling = clone(terminal) as IncidentRetrievalResponse;
    if (dangling.status !== 'completed') throw new Error('Expected completed clone.');
    dangling.report.blastRadius.impacts[0]!.evidenceIds = ['unsupported-evidence'];
    expect(() => createIncidentMarkdownExport(dangling)).toThrow();
  });
});
