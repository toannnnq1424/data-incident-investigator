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

type CredentialBoundarySecurityCase = {
  name: string;
  question: string;
  absent: readonly string[];
  present: readonly string[];
  presentCounts?: Readonly<Record<string, number>>;
  credentialMarkers: number;
  urlMarkers?: number;
};

const credentialBoundarySecurityCases = [
  {
    name: '01 quoted authorization scheme before a comma-safe suffix',
    question: 'PRE Authorization: Bearer "alpha beta",SAFE POST mode=fixture',
    absent: ['alpha', 'beta'],
    present: ['PRE', 'SAFE', 'POST', 'mode=fixture'],
    credentialMarkers: 1,
  },
  {
    name: '02 quoted assignment and URL preserve comma-safe suffixes',
    question: [
      'Pre password="QuotedSecret42!",SafeAfter mode=fixture End',
      'Pre https://user:password@example.com/path,SafeAfter status=healthy End',
    ].join('\n'),
    absent: ['QuotedSecret42', 'user:password@example.com'],
    present: ['Pre', 'SafeAfter', 'mode=fixture', 'status=healthy', 'End'],
    presentCounts: { Pre: 2, SafeAfter: 2, End: 2 },
    credentialMarkers: 1,
    urlMarkers: 1,
  },
  {
    name: '03 authorization bearer assignment',
    question: 'Keep03 Authorization: Bearer AuthBearer03! After03',
    absent: ['AuthBearer03'],
    present: ['Keep03', 'After03'],
    credentialMarkers: 1,
  },
  {
    name: '04 auth bearer assignment',
    question: 'Keep04 auth=Bearer AuthBearer04! After04',
    absent: ['AuthBearer04'],
    present: ['Keep04', 'After04'],
    credentialMarkers: 1,
  },
  {
    name: '05 token bearer assignment',
    question: 'Keep05 token=Bearer TokenBearer05! After05',
    absent: ['TokenBearer05'],
    present: ['Keep05', 'After05'],
    credentialMarkers: 1,
  },
  {
    name: '06 authorization basic assignment',
    question: 'Keep06 Authorization: Basic AuthBasic06+/= After06',
    absent: ['AuthBasic06'],
    present: ['Keep06', 'After06'],
    credentialMarkers: 1,
  },
  {
    name: '07 auth basic assignment',
    question: 'Keep07 auth=Basic AuthBasic07+/= After07',
    absent: ['AuthBasic07'],
    present: ['Keep07', 'After07'],
    credentialMarkers: 1,
  },
  {
    name: '08 token basic assignment',
    question: 'Keep08 token=Basic TokenBasic08+/= After08',
    absent: ['TokenBasic08'],
    present: ['Keep08', 'After08'],
    credentialMarkers: 1,
  },
  {
    name: '09 case-insensitive authorization scheme',
    question: 'Keep09 AUTHORIZATION: BEARER UpperSecret09! After09',
    absent: ['UpperSecret09'],
    present: ['Keep09', 'After09'],
    credentialMarkers: 1,
  },
  {
    name: '10 spaced authorization colon',
    question: 'Keep10 Authorization : Bearer SpacedSecret10! After10',
    absent: ['SpacedSecret10'],
    present: ['Keep10', 'After10'],
    credentialMarkers: 1,
  },
  {
    name: '11 spaced auth equals',
    question: 'Keep11 auth = Bearer SpacedSecret11! After11',
    absent: ['SpacedSecret11'],
    present: ['Keep11', 'After11'],
    credentialMarkers: 1,
  },
  {
    name: '12 token colon basic',
    question: 'Keep12 token : Basic SpacedSecret12! After12',
    absent: ['SpacedSecret12'],
    present: ['Keep12', 'After12'],
    credentialMarkers: 1,
  },
  {
    name: '13 punctuation-bearing password',
    question: 'Keep13 password=p@ssw0rd After13',
    absent: ['p@ssw0rd'],
    present: ['Keep13', 'After13'],
    credentialMarkers: 1,
  },
  {
    name: '14 underscore api key',
    question: 'Keep14 api_key=ApiUnderscore14!XYZ After14',
    absent: ['ApiUnderscore14', '!XYZ'],
    present: ['Keep14', 'After14'],
    credentialMarkers: 1,
  },
  {
    name: '15 hyphen api key',
    question: 'Keep15 api-key=ApiHyphen15!XYZ After15',
    absent: ['ApiHyphen15', '!XYZ'],
    present: ['Keep15', 'After15'],
    credentialMarkers: 1,
  },
  {
    name: '16 multiword api key',
    question: 'Keep16 api key=ApiMultiword16!XYZ After16',
    absent: ['ApiMultiword16', '!XYZ'],
    present: ['Keep16', 'After16'],
    credentialMarkers: 1,
  },
  {
    name: '17 multiword access token',
    question: 'Keep17 access token=AccessMultiword17!XYZ After17',
    absent: ['AccessMultiword17', '!XYZ'],
    present: ['Keep17', 'After17'],
    credentialMarkers: 1,
  },
  {
    name: '18 hyphen access token',
    question: 'Keep18 access-token=AccessHyphen18!XYZ After18',
    absent: ['AccessHyphen18', '!XYZ'],
    present: ['Keep18', 'After18'],
    credentialMarkers: 1,
  },
  {
    name: '19 underscore access token',
    question: 'Keep19 access_token=AccessUnderscore19!XYZ After19',
    absent: ['AccessUnderscore19', '!XYZ'],
    present: ['Keep19', 'After19'],
    credentialMarkers: 1,
  },
  {
    name: '20 generic authorization assignment',
    question: 'Keep20 authorization=AuthorizationSecret20! After20',
    absent: ['AuthorizationSecret20'],
    present: ['Keep20', 'After20'],
    credentialMarkers: 1,
  },
  {
    name: '21 generic auth assignment',
    question: 'Keep21 auth=AuthSecret21! After21',
    absent: ['AuthSecret21'],
    present: ['Keep21', 'After21'],
    credentialMarkers: 1,
  },
  {
    name: '22 generic token assignment',
    question: 'Keep22 token=TokenSecret22! After22',
    absent: ['TokenSecret22'],
    present: ['Keep22', 'After22'],
    credentialMarkers: 1,
  },
  {
    name: '23 generic bearer assignment',
    question: 'Keep23 bearer=BearerSecret23! After23',
    absent: ['BearerSecret23'],
    present: ['Keep23', 'After23'],
    credentialMarkers: 1,
  },
  {
    name: '24 generic secret assignment',
    question: 'Keep24 secret=GenericSecret24! After24',
    absent: ['GenericSecret24'],
    present: ['Keep24', 'After24'],
    credentialMarkers: 1,
  },
  {
    name: '25 double-quoted assignment with whitespace',
    question: 'Keep25 password="Double Quoted Secret25!" After25',
    absent: ['Double Quoted Secret25'],
    present: ['Keep25', 'After25'],
    credentialMarkers: 1,
  },
  {
    name: '26 single-quoted assignment with whitespace',
    question: "Keep26 password='Single Quoted Secret26!' After26",
    absent: ['Single Quoted Secret26'],
    present: ['Keep26', 'After26'],
    credentialMarkers: 1,
  },
  {
    name: '27 double-quoted multiword key assignment',
    question: 'Keep27 api key="Multiword Quoted Secret27!" After27',
    absent: ['Multiword Quoted Secret27'],
    present: ['Keep27', 'After27'],
    credentialMarkers: 1,
  },
  {
    name: '28 double-quoted authorization scheme with whitespace boundary',
    question: 'Keep28 Authorization: Bearer "Scheme Quoted Secret28!" After28',
    absent: ['Scheme Quoted Secret28'],
    present: ['Keep28', 'After28'],
    credentialMarkers: 1,
  },
  {
    name: '29 single-quoted basic scheme with whitespace boundary',
    question: "Keep29 Authorization: Basic 'Basic Quoted Secret29!' After29",
    absent: ['Basic Quoted Secret29'],
    present: ['Keep29', 'After29'],
    credentialMarkers: 1,
  },
  {
    name: '30 pipe-bearing value before whitespace field',
    question: 'Keep30 password=p@ss|TAIL mode=fixture After30',
    absent: ['p@ss|TAIL', '|TAIL'],
    present: ['Keep30', 'mode=fixture', 'After30'],
    credentialMarkers: 1,
  },
  {
    name: '31 semicolon-bearing value before whitespace field',
    question: 'Keep31 password=p@ss;TAIL status=healthy After31',
    absent: ['p@ss;TAIL', ';TAIL'],
    present: ['Keep31', 'status=healthy', 'After31'],
    credentialMarkers: 1,
  },
  {
    name: '32 comma-bearing value before whitespace field',
    question: 'Keep32 password=p@ss,TAIL state=allowed After32',
    absent: ['p@ss,TAIL', ',TAIL'],
    present: ['Keep32', 'state=allowed', 'After32'],
    credentialMarkers: 1,
  },
  {
    name: '33 adjacent multiword api key after a pipe',
    question: 'Keep33 password=p@ss|api key=AdjacentApi33! mode=fixture After33',
    absent: ['p@ss', 'AdjacentApi33'],
    present: ['Keep33', 'mode=fixture', 'After33'],
    credentialMarkers: 2,
  },
  {
    name: '34 adjacent multiword access token after a pipe',
    question: 'Keep34 password=p@ss|access token=AdjacentAccess34! status=healthy After34',
    absent: ['p@ss', 'AdjacentAccess34'],
    present: ['Keep34', 'status=healthy', 'After34'],
    credentialMarkers: 2,
  },
  {
    name: '35 adjacent hyphen api key after a pipe',
    question: 'Keep35 password=p@ss|api-key=AdjacentHyphen35! state=allowed After35',
    absent: ['p@ss', 'AdjacentHyphen35'],
    present: ['Keep35', 'state=allowed', 'After35'],
    credentialMarkers: 2,
  },
  {
    name: '36 adjacent underscore api key after a pipe',
    question: 'Keep36 password=p@ss|api_key=AdjacentUnderscore36! next=kept After36',
    absent: ['p@ss', 'AdjacentUnderscore36'],
    present: ['Keep36', 'next=kept', 'After36'],
    credentialMarkers: 2,
  },
  {
    name: '37 newline terminates one assignment before the next',
    question: 'Keep37 password=LineSecret37!\ntoken=NextLineSecret37! After37',
    absent: ['LineSecret37', 'NextLineSecret37'],
    present: ['Keep37', 'After37'],
    credentialMarkers: 2,
  },
  {
    name: '38 ordinary standalone bearer token',
    question: 'Keep38 Bearer StandaloneToken38+/= After38',
    absent: ['StandaloneToken38'],
    present: ['Keep38', 'After38'],
    credentialMarkers: 1,
  },
  {
    name: '39 OpenAI-style token',
    question: 'Keep39 sk-OpenAiToken39 After39',
    absent: ['sk-OpenAiToken39'],
    present: ['Keep39', 'After39'],
    credentialMarkers: 1,
  },
  {
    name: '40 classic GitHub token',
    question: 'Keep40 ghp_GithubToken40 After40',
    absent: ['ghp_GithubToken40'],
    present: ['Keep40', 'After40'],
    credentialMarkers: 1,
  },
  {
    name: '41 fine-grained GitHub token',
    question: 'Keep41 github_pat_GithubToken41 After41',
    absent: ['github_pat_GithubToken41'],
    present: ['Keep41', 'After41'],
    credentialMarkers: 1,
  },
  {
    name: '42 URL userinfo with whitespace boundary',
    question: 'Keep42 https://user:password@example.com/path After42',
    absent: ['user:password@example.com'],
    present: ['Keep42', 'After42'],
    credentialMarkers: 0,
    urlMarkers: 1,
  },
  {
    name: '43 URL query credential with whitespace boundary',
    question: 'Keep43 https://example.com/path?token=UrlSecret43 After43',
    absent: ['UrlSecret43', 'token='],
    present: ['Keep43', 'After43'],
    credentialMarkers: 0,
    urlMarkers: 1,
  },
] satisfies readonly CredentialBoundarySecurityCase[];

describe('deterministic Markdown incident export', () => {
  it.each(credentialBoundarySecurityCases)(
    'passes the finite credential boundary security table: $name',
    async ({ question, absent, present, presentCounts, credentialMarkers, urlMarkers = 0 }) => {
      const { terminal } = await canonicalCompleted();
      const unsafe = clone(terminal);
      unsafe.contextStage.intent.question = question;

      const markdown = createIncidentMarkdownExport(unsafe).markdown;

      absent.forEach((value) => expect(markdown).not.toContain(value));
      present.forEach((value) => expect(markdown).toContain(value));
      Object.entries(presentCounts ?? {}).forEach(([value, count]) =>
        expect(markdown.split(value)).toHaveLength(count + 1),
      );
      expect(markdown.match(/\\\[redacted credential\\\]/gu) ?? []).toHaveLength(credentialMarkers);
      expect(markdown.match(/\\\[redacted URL\\\]/gu) ?? []).toHaveLength(urlMarkers);
    },
  );

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

  it('redacts complete credential assignments without consuming adjacent text', async () => {
    const { terminal } = await canonicalCompleted();
    const unsafe = clone(terminal);
    unsafe.contextStage.intent.question = [
      'AllowlistedPrefix password=p@ssw0rd AllowlistedAfterSpace',
      'api_key=abcd!XYZ,mode=fixture',
      'password="two words!@#" AllowlistedAfterQuote',
      'password=semi;colon;status=healthy',
      'password=pipe|inside|state=allowed',
      'password=line-secret',
      'AllowlistedAfterNewline',
    ].join('\n');

    const markdown = createIncidentMarkdownExport(unsafe).markdown;

    expect(markdown).not.toContain('p@ssw0rd');
    expect(markdown).not.toContain('abcd!XYZ');
    expect(markdown).not.toContain('!XYZ');
    expect(markdown).not.toContain('two words!@#');
    expect(markdown).not.toContain('semi;colon');
    expect(markdown).not.toContain('pipe|inside');
    expect(markdown).not.toContain('line-secret');
    expect(markdown.match(/\\\[redacted credential\\\]/gu)).toHaveLength(6);
    expect(markdown).toContain('AllowlistedPrefix');
    expect(markdown).toContain('AllowlistedAfterSpace');
    expect(markdown).toContain('AllowlistedAfterQuote');
    expect(markdown).toContain('AllowlistedAfterNewline');
    expect(markdown).toContain('mode=fixture');
    expect(markdown).toContain('status=healthy');
    expect(markdown).toContain('state=allowed');
  });

  it('keeps whitespace-delimited fields outside punctuation-bearing credential values', async () => {
    const { terminal } = await canonicalCompleted();
    const unsafe = clone(terminal);
    unsafe.contextStage.intent.question = [
      'SAFE_PREFIX password=p@ss|TAIL mode=fixture SAFE_SUFFIX',
      'SAFE_SEMICOLON_PREFIX password=p@ss;TAIL status=healthy SAFE_SEMICOLON_SUFFIX',
      'SAFE_COMMA_PREFIX password=p@ss,TAIL state=allowed SAFE_COMMA_SUFFIX',
      'password=p@ssw0rd',
      'api_key=abcd!XYZ,mode=fixture',
      'SAFE_AFTER_NEWLINE',
    ].join('\n');

    const markdown = createIncidentMarkdownExport(unsafe).markdown;

    expect(markdown).not.toContain('p@ss|TAIL');
    expect(markdown).not.toContain('p@ss;TAIL');
    expect(markdown).not.toContain('p@ss,TAIL');
    expect(markdown).not.toContain('|TAIL');
    expect(markdown).not.toContain(';TAIL');
    expect(markdown).not.toContain(',TAIL');
    expect(markdown).not.toContain('p@ssw0rd');
    expect(markdown).not.toContain('abcd!XYZ');
    expect(markdown).not.toContain('!XYZ');
    expect(markdown.match(/\\\[redacted credential\\\]/gu)).toHaveLength(5);
    expect(markdown).toContain('SAFE\\_PREFIX');
    expect(markdown).toContain('SAFE\\_SUFFIX');
    expect(markdown).toContain('SAFE\\_SEMICOLON\\_PREFIX');
    expect(markdown).toContain('SAFE\\_SEMICOLON\\_SUFFIX');
    expect(markdown).toContain('SAFE\\_COMMA\\_PREFIX');
    expect(markdown).toContain('SAFE\\_COMMA\\_SUFFIX');
    expect(markdown).toContain('SAFE\\_AFTER\\_NEWLINE');
    expect(markdown.match(/mode=fixture/gu)).toHaveLength(2);
    expect(markdown).toContain('status=healthy');
    expect(markdown).toContain('state=allowed');
  });

  it('redacts allowlisted multiword credential fields after punctuation separators', async () => {
    const { terminal } = await canonicalCompleted();
    const unsafe = clone(terminal);
    unsafe.contextStage.intent.question = [
      'SAFE password=p@ss|api key=ApiSecret42!XYZ mode=fixture SAFE_AFTER',
      'AccessSafe password=p@ss|access token=AccessSecret42!XYZ status=healthy AccessAfter',
      'HyphenSafe password=p@ss|api-key=HyphenSecret42!XYZ state=allowed HyphenAfter',
      'UnderscoreSafe password=p@ss|api_key=UnderscoreSecret42!XYZ next=kept UnderscoreAfter',
      'SafeAfterNewline',
    ].join('\n');

    const markdown = createIncidentMarkdownExport(unsafe).markdown;

    expect(markdown).not.toContain('ApiSecret42');
    expect(markdown).not.toContain('AccessSecret42');
    expect(markdown).not.toContain('HyphenSecret42');
    expect(markdown).not.toContain('UnderscoreSecret42');
    expect(markdown).not.toContain('!XYZ');
    expect(markdown.match(/\\\[redacted credential\\\]/gu)).toHaveLength(8);
    expect(markdown).toContain('SAFE');
    expect(markdown).toContain('SAFE\\_AFTER');
    expect(markdown).toContain('AccessSafe');
    expect(markdown).toContain('AccessAfter');
    expect(markdown).toContain('HyphenSafe');
    expect(markdown).toContain('HyphenAfter');
    expect(markdown).toContain('UnderscoreSafe');
    expect(markdown).toContain('UnderscoreAfter');
    expect(markdown).toContain('SafeAfterNewline');
    expect(markdown).toContain('mode=fixture');
    expect(markdown).toContain('status=healthy');
    expect(markdown).toContain('state=allowed');
    expect(markdown).toContain('next=kept');
  });

  it('atomically redacts assignment scheme credentials without consuming safe boundaries', async () => {
    const { terminal } = await canonicalCompleted();
    const unsafe = clone(terminal);
    unsafe.contextStage.intent.question = [
      'SchemePrefix Authorization: Bearer AuthBearerSecret42! POST mode=fixture SchemeSuffix',
      'AuthPrefix auth=Bearer AuthShortSecret42! status=healthy AuthSuffix',
      'TokenPrefix token=Bearer TokenSecret42! state=allowed TokenSuffix',
      'BasicPrefix Authorization: Basic BasicSecret42+/= next=kept BasicSuffix',
      'StandalonePrefix Bearer StandaloneSecret42+ StandaloneSuffix',
      'AssignmentPrefix password=AssignmentSecret42! AssignmentSuffix',
      'UrlPrefix https://user:password@example.com/path UrlSuffix',
      'QuotedPrefix password="Quoted Secret42!@#" QuotedSuffix',
      'SafeAfterNewline',
    ].join('\n');

    const markdown = createIncidentMarkdownExport(unsafe).markdown;

    expect(markdown).not.toContain('AuthBearerSecret42');
    expect(markdown).not.toContain('AuthShortSecret42');
    expect(markdown).not.toContain('TokenSecret42');
    expect(markdown).not.toContain('BasicSecret42');
    expect(markdown).not.toContain('StandaloneSecret42');
    expect(markdown).not.toContain('AssignmentSecret42');
    expect(markdown).not.toContain('user:password@example.com');
    expect(markdown).not.toContain('Quoted Secret42');
    expect(markdown.match(/\\\[redacted credential\\\]/gu)).toHaveLength(7);
    expect(markdown.match(/\\\[redacted URL\\\]/gu)).toHaveLength(1);
    expect(markdown).toContain('SchemePrefix');
    expect(markdown).toContain('POST');
    expect(markdown).toContain('SchemeSuffix');
    expect(markdown).toContain('AuthPrefix');
    expect(markdown).toContain('AuthSuffix');
    expect(markdown).toContain('TokenPrefix');
    expect(markdown).toContain('TokenSuffix');
    expect(markdown).toContain('BasicPrefix');
    expect(markdown).toContain('BasicSuffix');
    expect(markdown).toContain('StandalonePrefix');
    expect(markdown).toContain('StandaloneSuffix');
    expect(markdown).toContain('AssignmentPrefix');
    expect(markdown).toContain('AssignmentSuffix');
    expect(markdown).toContain('UrlPrefix');
    expect(markdown).toContain('UrlSuffix');
    expect(markdown).toContain('QuotedPrefix');
    expect(markdown).toContain('QuotedSuffix');
    expect(markdown).toContain('SafeAfterNewline');
    expect(markdown).toContain('mode=fixture');
    expect(markdown).toContain('status=healthy');
    expect(markdown).toContain('state=allowed');
    expect(markdown).toContain('next=kept');
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
