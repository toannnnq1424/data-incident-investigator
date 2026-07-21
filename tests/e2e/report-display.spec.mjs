import { log } from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import {
  assertPortAvailable,
  createRuntimeConfig,
  findFreePort,
  startManagedPnpmProcess,
  stopManagedProcesses,
  waitForHttpReady,
} from './report-launcher.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const viteConfigPath = fileURLToPath(new URL('./vite.config.mjs', import.meta.url));
const managedProcesses = [];

function fail(message) {
  throw new Error(message);
}

function assertText(text, pattern, label) {
  if (!pattern.test(text)) {
    fail(`Expected browser report to include ${label}.`);
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(`({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  })`);

  if (overflow.scrollWidth > overflow.clientWidth) {
    fail(
      `${label} has horizontal overflow: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}.`,
    );
  }
}

let browser;
let runtime;
const startedAt = Date.now();

try {
  const host = '127.0.0.1';
  const apiPort = await findFreePort(host);
  let webPort = await findFreePort(host);
  while (webPort === apiPort) {
    webPort = await findFreePort(host);
  }
  runtime = createRuntimeConfig({ apiPort, host, viteConfigPath, webPort });
  log(`Browser e2e selected API ${runtime.apiUrl} and web ${runtime.webUrl}.`);

  const api = startManagedPnpmProcess('api', runtime.apiArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...runtime.apiEnv },
  });
  managedProcesses.push(api);
  await waitForHttpReady(api, runtime.apiHealthUrl);

  const web = startManagedPnpmProcess('web', runtime.webArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...runtime.webEnv },
  });
  managedProcesses.push(web);
  await waitForHttpReady(web, runtime.webUrl);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const browserProblems = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => browserProblems.push(`pageerror: ${error.message}`));

  await page.goto(runtime.webUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Fixture metadata' }).waitFor({ timeout: 2_000 });
  await page.getByText('Fixture metadata is ready.', { exact: true }).waitFor({ timeout: 2_000 });
  await page.getByLabel('Metadata query').fill('lineage demo root');
  await page.getByRole('button', { name: 'Search metadata' }).click();
  const searchResultsHeading = page
    .locator('.metadata-search-results')
    .getByRole('heading', { name: 'Search results' });
  await searchResultsHeading.waitFor({ timeout: 2_000 });
  await page.getByText('6 metadata entities found.', { exact: true }).waitFor({ timeout: 2_000 });
  const searchResultNames = await page
    .locator('.metadata-search-result-heading > strong')
    .allTextContents();
  if (
    searchResultNames.join('|') !==
      'Lineage demo chart|Lineage demo dashboard|lineage.demo.root|lineage.demo.upstream_raw|lineage.demo.upstream_stage|lineage.empty_source' ||
    !(await searchResultsHeading.evaluate(
      (element) => element === element.ownerDocument.activeElement,
    ))
  ) {
    fail('Fixture entity search did not render deterministic focused results.');
  }

  await page.getByLabel('Node limit').selectOption('3');
  await page.getByRole('button', { name: 'View downstream lineage for lineage.demo.root' }).click();
  const lineageHeading = page
    .locator('.metadata-lineage-results')
    .getByRole('heading', { name: 'Downstream lineage' });
  await lineageHeading.waitFor({ timeout: 2_000 });
  await page
    .getByText('Truncated: increase a bounded control to inspect more reachable lineage.', {
      exact: true,
    })
    .waitFor({ timeout: 2_000 });
  const lineageGraph = await page.locator('.metadata-lineage-graph').evaluate((element) => {
    const nodes = [...element.querySelectorAll('.metadata-lineage-node-list > li')].map((node) => ({
      urn: node.querySelector('code')?.textContent ?? '',
      root: node.getAttribute('data-lineage-root') === 'true',
    }));
    const edges = [...element.querySelectorAll('.metadata-lineage-edge-list > li')].map((edge) => {
      const urns = [...edge.querySelectorAll('code')].map((code) => code.textContent ?? '');
      return `${urns[0]}->${urns[1]}`;
    });
    return { nodes, edges };
  });
  if (
    lineageGraph.nodes.length !== 3 ||
    new Set(lineageGraph.nodes.map((node) => node.urn)).size !== 3 ||
    lineageGraph.nodes.filter((node) => node.root).length !== 1 ||
    !lineageGraph.edges.some((edge) => {
      const [source, target] = edge.split('->');
      return source === target;
    }) ||
    !(await lineageHeading.evaluate((element) => element === element.ownerDocument.activeElement))
  ) {
    fail('Fixture lineage did not render a unique focused bounded graph with cycle-safe evidence.');
  }

  await page.getByLabel('Change limit').selectOption('3');
  await page
    .locator('.metadata-lineage-node-list')
    .getByRole('button', { name: 'View recent changes for lineage.demo.root' })
    .click();
  const recentChangesHeading = page
    .locator('.metadata-recent-changes')
    .getByRole('heading', { name: 'Recent metadata changes' });
  await recentChangesHeading.waitFor({ timeout: 2_000 });
  await page
    .getByText(
      'Truncated: the selected window, limit, or provider cap omitted additional history.',
      { exact: true },
    )
    .waitFor({ timeout: 2_000 });
  const recentChanges = await page
    .locator('.metadata-recent-changes-content')
    .evaluate((element) => {
      const rows = [...element.querySelectorAll('.metadata-recent-change-list > li')].map(
        (row) => ({
          id: row.getAttribute('data-change-id'),
          text: row.textContent ?? '',
          timestamp: row.querySelector('time')?.getAttribute('datetime') ?? '',
        }),
      );
      return {
        rows,
        semanticTimeCount: element.querySelectorAll('time[datetime]').length,
      };
    });
  if (
    recentChanges.rows.map((row) => row.id).join('|') !==
      'change-root-owner|change-root-schema|change-root-tag' ||
    recentChanges.rows[0]?.timestamp !== '2026-07-19T07:45:00.000Z' ||
    !recentChanges.rows[0]?.text.includes('Ownership was updated for lineage.demo.root.') ||
    !recentChanges.rows[1]?.text.includes('gross_revenue') ||
    !recentChanges.rows[2]?.text.includes('certified tag') ||
    recentChanges.semanticTimeCount < 5 ||
    !(await recentChangesHeading.evaluate(
      (element) => element === element.ownerDocument.activeElement,
    ))
  ) {
    fail('Fixture recent changes did not render deterministic focused facts and truncation.');
  }

  const scenarioSelector = page.getByLabel('Canonical incident scenario');
  await scenarioSelector.focus();
  if (
    !(await scenarioSelector.evaluate((element) => element === element.ownerDocument.activeElement))
  ) {
    fail('Canonical scenario selector did not receive keyboard focus.');
  }
  await scenarioSelector.selectOption('removed-schema-column');
  if ((await scenarioSelector.inputValue()) !== 'removed-schema-column') {
    fail('Canonical scenario selection did not choose the first scenario.');
  }
  await page
    .getByText(
      'Removed schema column prefill selected. You can edit every field before submitting.',
      {
        exact: true,
      },
    )
    .waitFor({ timeout: 2_000 });
  if (
    (await page.locator('#question').inputValue()) !==
      'Why did revenue drop after the morning warehouse refresh?' ||
    (await page.locator('#entity-hint').inputValue()) !== 'analytics.daily_revenue' ||
    !(await page.locator('#occurred-at').inputValue()) ||
    (await page.locator('#symptom').inputValue()) !== 'Revenue is 42% below the seven-day baseline.'
  ) {
    fail('Canonical scenario selection did not prefill the existing incident fields.');
  }

  await page
    .locator('#symptom')
    .fill('Revenue is 42% below the seven-day baseline. Finance confirmed the demo segment.');
  if (
    (await scenarioSelector.inputValue()) !== 'custom' ||
    !(await page
      .getByText('Custom values based on Removed schema column. Your edits will be submitted.', {
        exact: true,
      })
      .isVisible())
  ) {
    fail('Editable scenario prefill did not transition to an explicit custom state.');
  }
  await page.getByRole('button', { name: 'Start investigation' }).click();

  await page.getByText('Investigation processing').waitFor({ timeout: 2_000 });
  await page
    .getByRole('heading', { name: 'Gathering investigation context' })
    .waitFor({ timeout: 2_000 });
  await page
    .getByRole('heading', { name: 'Planning safe verification and remediation' })
    .waitFor({ timeout: 2_000 });
  await page.getByText('Investigation completed', { exact: true }).waitFor({ timeout: 5_000 });

  const activity = page.locator('.investigation-activity');
  await activity
    .getByRole('heading', { name: 'Investigation activity' })
    .waitFor({ timeout: 2_000 });
  const activityActions = await activity
    .locator('.investigation-event-meta > code')
    .allTextContents();
  const expectedActivityActions = [
    'question_normalized',
    'metadata_health_checked',
    'entity_search_completed',
    'lineage_retrieved',
    'recent_changes_retrieved',
    'suspicious_changes_classified',
    'evidence_collected',
    'hypotheses_produced',
    'recommendations_produced',
    'report_produced',
    'investigation_terminated',
  ];
  if (
    activityActions.join('|') !== expectedActivityActions.join('|') ||
    (await activity.locator('time').count()) !== expectedActivityActions.length ||
    (await activity.locator('.investigation-event-terminal').count()) !== 1 ||
    (await activity.locator('.investigation-event-warning').count()) !== 0 ||
    (await activity.locator('a[href="#evidence-change-removed-gross-revenue"]').count()) !== 2
  ) {
    fail(
      'Structured investigation activity did not render deterministic accessible evidence flow.',
    );
  }

  const contextStage = page.locator('.incident-context-stage');
  await contextStage
    .getByRole('heading', { name: 'Investigation context gathered' })
    .waitFor({ timeout: 2_000 });
  await contextStage
    .getByRole('heading', { name: 'Parsed incident intent' })
    .waitFor({ timeout: 2_000 });
  await contextStage
    .getByRole('heading', { name: 'Candidate entities' })
    .waitFor({ timeout: 2_000 });
  await contextStage
    .getByRole('heading', { name: 'Gathered metadata facts' })
    .waitFor({ timeout: 2_000 });
  await contextStage
    .getByRole('heading', { name: 'Context missing information' })
    .waitFor({ timeout: 2_000 });
  const selectedContextEntities = await contextStage
    .locator('.incident-context-entity-list > li[data-selected="true"]')
    .allTextContents();
  const contextFactIds = await contextStage
    .locator('.incident-context-fact-list [data-context-fact-id]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-context-fact-id')));
  const contextText = await contextStage.innerText();
  if (
    selectedContextEntities.length !== 1 ||
    !selectedContextEntities[0]?.includes('analytics.daily_revenue') ||
    !contextFactIds.includes('change-removed-gross-revenue') ||
    !contextText.includes('Why did revenue drop after the morning warehouse refresh?') ||
    !contextText.includes('Revenue is 42% below the seven-day baseline.') ||
    !contextText.includes('raw.orders') ||
    !contextText.includes('No bounded context gaps were recorded.') ||
    contextText.match(/\d+% confidence/i) ||
    (await contextStage.locator('time[datetime]').count()) < 1
  ) {
    fail('Incident parse/gather context did not render bounded adapter facts accessibly.');
  }

  const suspiciousChangeStage = page.locator('.suspicious-change-stage');
  await suspiciousChangeStage
    .getByRole('heading', { name: 'Potentially relevant metadata changes' })
    .waitFor({ timeout: 2_000 });
  const suspiciousChangeCandidates = await suspiciousChangeStage
    .locator('.suspicious-change-list > li')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        id: row.getAttribute('data-suspicious-change-id'),
        text: row.textContent ?? '',
        timestamp: row.querySelector('time')?.getAttribute('datetime') ?? '',
        signals: [...row.querySelectorAll('.suspicious-change-signal-list code')].map(
          (signal) => signal.textContent ?? '',
        ),
      })),
    );
  const suspiciousChangeText = await suspiciousChangeStage.innerText();
  if (
    suspiciousChangeCandidates.length !== 1 ||
    suspiciousChangeCandidates[0]?.id !== 'change-removed-gross-revenue' ||
    suspiciousChangeCandidates[0]?.timestamp !== '2026-07-18T07:45:00.000Z' ||
    !suspiciousChangeCandidates[0]?.text.includes(
      'Column gross_revenue was removed from raw.orders.',
    ) ||
    suspiciousChangeCandidates[0]?.signals.join('|') !==
      'incident_window|upstream_lineage|disruptive_operation' ||
    !suspiciousChangeText.includes(
      'Potential relevance is a deterministic signal classification',
    ) ||
    suspiciousChangeText.includes('caused the incident') ||
    suspiciousChangeText.match(/\d+% confidence/i)
  ) {
    fail('Suspicious-change detection did not render the exact bounded factual signal candidate.');
  }

  const hypothesisScoringStage = page.locator('.hypothesis-scoring-stage');
  await hypothesisScoringStage
    .getByRole('heading', { name: 'Ranked evidence-linked hypotheses' })
    .waitFor({ timeout: 2_000 });
  const scoredHypotheses = await hypothesisScoringStage
    .locator('.scored-hypothesis-list > li')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        id: row.getAttribute('data-hypothesis-id'),
        rank: row.getAttribute('data-hypothesis-rank'),
        text: row.textContent ?? '',
        timestamp: row.querySelector('time')?.getAttribute('datetime') ?? '',
        factorCodes: [
          ...row.querySelectorAll('.score-factor-list > li > div > code:first-child'),
        ].map((factor) => factor.textContent ?? ''),
        evidenceLinks: [...row.querySelectorAll('.scored-evidence-list a')].map((link) => ({
          href: link.getAttribute('href'),
          text: link.textContent ?? '',
        })),
      })),
    );
  const hypothesisScoringText = await hypothesisScoringStage.innerText();
  if (
    scoredHypotheses.length !== 1 ||
    scoredHypotheses[0]?.id !== 'hypothesis-change-removed-gross-revenue' ||
    scoredHypotheses[0]?.rank !== '1' ||
    scoredHypotheses[0]?.timestamp !== '2026-07-18T07:45:00.000Z' ||
    !scoredHypotheses[0]?.text.includes(
      'Plausible contributor: the removed schema change on raw.orders may have contributed to the incident.',
    ) ||
    !scoredHypotheses[0]?.text.includes('81% confidence · high') ||
    !scoredHypotheses[0]?.text.includes('+2500 / 2500 bp') ||
    !scoredHypotheses[0]?.text.includes('+2000 / 2000 bp') ||
    !scoredHypotheses[0]?.text.includes('+1800 / 1800 bp') ||
    !scoredHypotheses[0]?.text.includes('evidence-confidence-v1') ||
    !scoredHypotheses[0]?.text.includes('Why') ||
    scoredHypotheses[0]?.factorCodes.join('|') !==
      'temporal_proximity|lineage_relationship|schema_or_freshness_evidence|independent_evidence_diversity|contradictory_evidence|missing_required_information' ||
    scoredHypotheses[0]?.evidenceLinks[0]?.text.trim() !== 'change-removed-gross-revenue' ||
    scoredHypotheses[0]?.evidenceLinks[0]?.href !== '#evidence-change-removed-gross-revenue' ||
    scoredHypotheses[0]?.text.includes('confirmed cause') ||
    scoredHypotheses[0]?.text.includes('caused the incident') ||
    !hypothesisScoringText.includes('not a confirmed cause or recommendation')
  ) {
    fail('Hypothesis scoring did not render the exact ranked factors and evidence link.');
  }

  const remediationStage = page.locator('.remediation-stage');
  await remediationStage
    .getByRole('heading', { name: 'Safe recommendations for human review' })
    .waitFor({ timeout: 2_000 });
  const remediationRecommendations = await remediationStage
    .locator('.remediation-recommendation-list > li')
    .evaluateAll((rows) =>
      rows.map((row) => ({
        id: row.getAttribute('data-remediation-id'),
        text: row.textContent ?? '',
        links: [...row.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? ''),
      })),
    );
  const remediationText = await remediationStage.innerText();
  if (
    remediationRecommendations.length !== 2 ||
    remediationRecommendations[0]?.id !== 'verify-change-removed-gross-revenue' ||
    remediationRecommendations[1]?.id !== 'remediate-change-removed-gross-revenue' ||
    !remediationRecommendations[0]?.text.includes(
      'Recommended verification: confirm the observed schema change',
    ) ||
    !remediationRecommendations[1]?.text.includes(
      'Potential remediation: prepare a reversible schema compatibility change',
    ) ||
    remediationRecommendations.some(
      (recommendation) =>
        !recommendation.text.includes('Not executed') ||
        !recommendation.text.includes('Safe verification:') ||
        !recommendation.text.includes('Reversibility:') ||
        !recommendation.links.includes('#scored-hypothesis-change-removed-gross-revenue') ||
        !recommendation.links.includes('#evidence-change-removed-gross-revenue'),
    ) ||
    !remediationText.includes('Nothing in this stage has been executed') ||
    remediationText.includes('confirmed root cause') ||
    remediationText.includes('caused the incident')
  ) {
    fail('Remediation planning did not render exact safe, linked, not-executed recommendations.');
  }

  const remediationReferenceTargets = await remediationStage
    .locator('a')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? '').filter((href) => href.startsWith('#')),
    );
  for (const target of remediationReferenceTargets) {
    if ((await page.locator(target).count()) !== 1) {
      fail(`Remediation reference link does not resolve exactly once: ${target}`);
    }
  }

  const blastRadius = page.locator('section.blast-radius');
  await blastRadius.getByRole('heading', { name: 'Blast radius' }).waitFor({ timeout: 2_000 });
  const blastRadiusView = await blastRadius.evaluate((section) => ({
    text: section.textContent ?? '',
    impacts: [...section.querySelectorAll('.blast-radius-impact-list > li')].map((impact) => ({
      kind: impact.querySelector('.entity-kind')?.textContent ?? '',
      name: impact.querySelector('strong')?.textContent ?? '',
      evidenceLinks: [...impact.querySelectorAll('.evidence-reference-list a')].map(
        (link) => link.getAttribute('href') ?? '',
      ),
    })),
  }));
  if (
    !blastRadiusView.text.includes('complete') ||
    !blastRadiusView.text.includes('blast-radius-v1') ||
    !blastRadiusView.text.includes('Analyzed 1/1 roots and 3 entities') ||
    blastRadiusView.impacts.length !== 2 ||
    blastRadiusView.impacts[0]?.kind !== 'dataset' ||
    blastRadiusView.impacts[0]?.name !== 'analytics.daily_revenue' ||
    blastRadiusView.impacts[1]?.kind !== 'dashboard' ||
    blastRadiusView.impacts[1]?.name !== 'Revenue overview' ||
    blastRadiusView.impacts.some(
      (impact) =>
        !impact.evidenceLinks.includes('#evidence-change-removed-gross-revenue') ||
        impact.evidenceLinks.some((link) => !link.startsWith('#evidence-')),
    )
  ) {
    fail('Blast radius did not render exact bounded downstream impacts and evidence provenance.');
  }

  const reportText = await page.locator('body').innerText();
  assertText(reportText, /Blast radius/i, 'blast-radius section');
  assertText(reportText, /Related entities/i, 'related entities section');
  assertText(reportText, /analytics\.daily_revenue/i, 'seed entity');
  assertText(reportText, /raw\.orders/i, 'upstream entity');
  assertText(reportText, /Revenue overview/i, 'downstream entity');
  assertText(reportText, /Evidence/i, 'facts evidence section');
  assertText(reportText, /change-removed-gross-revenue/i, 'schema-change evidence ID');
  assertText(reportText, /Relevant lineage/i, 'lineage section');
  assertText(reportText, /lineage-upstream-1/i, 'lineage evidence ID');
  assertText(reportText, /Hypotheses/i, 'inference section');
  assertText(reportText, /81% confidence/i, 'confidence label');
  assertText(reportText, /81% · high/i, 'confidence band label');
  assertText(reportText, /Why/i, 'confidence explanation');
  assertText(reportText, /Assumptions/i, 'assumption section');
  assertText(reportText, /Missing information/i, 'missing information section');
  assertText(reportText, /Recommended actions/i, 'recommendations section');

  const evidenceIds = new Set(
    await page.locator('.evidence-list .evidence-meta > code').allTextContents(),
  );
  const referencedEvidenceIds = await page
    .locator('.evidence-reference-list code')
    .allTextContents();
  const unresolvedEvidenceIds = referencedEvidenceIds.filter(
    (evidenceId) => !evidenceIds.has(evidenceId),
  );
  if (unresolvedEvidenceIds.length > 0) {
    fail(`Browser report contains unresolved evidence IDs: ${unresolvedEvidenceIds.join(', ')}`);
  }
  const scoredEvidenceTargets = await page
    .locator('.scored-evidence-list a')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? '').filter((href) => href.startsWith('#')),
    );
  for (const target of scoredEvidenceTargets) {
    if ((await page.locator(target).count()) !== 1) {
      fail(`Scored hypothesis evidence link does not resolve exactly once: ${target}`);
    }
  }

  await assertNoHorizontalOverflow(page, 'desktop report');
  await page.setViewportSize({ width: 390, height: 900 });
  await assertNoHorizontalOverflow(page, 'mobile report');

  if (browserProblems.length > 0) {
    fail(`Browser emitted console problems:\n${browserProblems.join('\n')}`);
  }
} finally {
  if (browser) {
    await browser.close();
  }
  await stopManagedProcesses(managedProcesses);
  if (runtime) {
    await assertPortAvailable(runtime.host, Number(runtime.apiEnv.API_PORT));
    await assertPortAvailable(runtime.host, Number(runtime.webEnv.DII_E2E_WEB_PORT));
  }
}

const durationMs = Date.now() - startedAt;
if (durationMs >= 180_000) {
  fail(`Browser report display e2e exceeded three minutes: ${durationMs}ms.`);
}
log(`Browser report display e2e passed in ${durationMs}ms.`);
