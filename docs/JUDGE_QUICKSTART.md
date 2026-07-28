# Judge quickstart

Reach the canonical **Removed schema column** result in a few minutes without credentials.

## Fastest path: public fixture

Open:
<https://data-incident-investigator-1071683558688.asia-southeast1.run.app>

1. Allow a possible Cloud Run cold start. Continue when the top status reads
   **Fixture metadata · Ready**.
2. Scroll to **What changed?**.
3. In **Incident playbooks**, select **Removed schema column**.
4. Keep the populated synthetic values:
   - question: **Why did revenue drop after the morning warehouse refresh?**
   - dataset: `analytics.daily_revenue`
   - symptom: **Revenue is 42% below the seven-day baseline.**
5. Choose **Start investigation** once.
6. Wait for **Investigation completed**.

## What to verify

- **Ranked evidence-linked hypotheses:** one plausible contributor states that removal of
  `gross_revenue` from upstream `raw.orders` may have contributed to the incident.
- **Confidence:** `81% · high`, followed by visible ordered factors under
  `evidence-confidence-v1`. This is deterministic code-owned scoring, not an LLM probability.
- **Evidence path:** the schema-validated graph follows the displayed top hypothesis's own
  `change-removed-gross-revenue` fact and linked `analytics.daily_revenue` impact. Its connectors
  show provenance sequence, not causality.
- **Evidence:** `change-removed-gross-revenue` and `lineage-upstream-1` resolve in the report. Facts and
  inferences remain separate.
- **Blast radius:** status **complete** within the displayed fixture bounds, with two impacts:
  `analytics.daily_revenue` at distance 1 and **Revenue overview** at distance 2. Both show a
  downstream path and evidence provenance.
- **Safe recommendations for human review:** two evidence-linked proposals, each marked
  **Not executed**.
- **Download Markdown report:** the terminal response is available as sanitized, deterministic UTF-8
  Markdown; the UI states that no server-side report file is stored.

Screenshots of the expected surfaces are in the
[demo asset gallery](demo-assets/README.md). The incident UUID and activity timestamps are
run-specific and process-local; do not use them as durable links.

For a non-interactive preview of the same authentic flow, review the
[Public 2:50 functioning demo](https://youtu.be/D5mvMqrhyDc). A new
[2:48.91 deployed-UI QA candidate](demo-video/README.md) shows the seven-playbook interface,
top-hypothesis evidence path, and current export context with exact offline male narration and
captions. It is a repository QA asset, not yet uploaded to YouTube/Vimeo/Youku or linked in Devpost;
its GitHub feature-branch/PR accessibility does not satisfy Rules-listed video hosting. The existing
YouTube URL remains part of
submitted project `1117401`, whose
signed-in finalization screen reports **Project submitted!**, **Submitted**, and **5/5**. The public
project page is <https://devpost.com/software/data-incident-investigator>. Submission does not imply
organizer acceptance, eligibility approval, or a prize result.

## Repository-local fallback

Use this if the public service is cold for more than 30 seconds or unavailable. Requirements are
Node.js 24 or newer and pnpm `11.9.0` exactly.

Windows PowerShell:

```powershell
git clone https://github.com/toannnnq1424/data-incident-investigator.git
Set-Location data-incident-investigator
& .\scripts\bootstrap-worktree.ps1
Copy-Item .env.example .env
pnpm dev
```

macOS/POSIX:

```bash
git clone https://github.com/toannnnq1424/data-incident-investigator.git
cd data-incident-investigator
. ./scripts/bootstrap-worktree.sh
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173` and repeat the six public-fixture steps. Fixture mode is the default and
requires no DataHub, model, or OpenAI credential.

If startup fails, confirm `node --version`, `pnpm --version`, and that the bootstrap completed a frozen
install. API probes are `http://localhost:3001/health` and `http://localhost:3001/ready`.

Phase 8.9 bounded rehearsal evidence: with an existing frozen install on Windows, bundled Node
`24.14.0` and pnpm `11.9.0`, Vite reported ready in `549 ms`; `/health`, fixture `/ready`, and the web
root all passed by the `10.1 s` probe. No local incident was created. This is a warm-worktree
rehearsal, not a clean-clone install-time promise.

## Exact judging boundary

- The public service uses synthetic, credential-free fixture data. It is not live DataHub evidence.
- A bounded read-only DataHub MCP integration passed a localhost-only proof against DataHub Core
  `1.6.0`, official synthetic data, and `mcp-server-datahub` `0.6.0` with mutation tools disabled.
  This is **PASS — LOCAL OSS**, not a public service. The entrant reports that a DataHub hackathon
  representative confirmed that local DataHub OSS is the intended Rules path and answered **yes** to
  the fixture-demo plus reproducible-local-MCP access model; remote DataHub/MCP hosting is therefore
  not treated as a requirement. This guidance is not organizer acceptance or a judging result.
- Only **Removed schema column** has the rich checked-in fixture and canonical browser path.
- The app makes zero model calls and does not execute remediation or modify production data.
- Incident state is in memory and disappears on restart or scale-to-zero.
- The owner-authorized Cloud Run operating window runs through **2026-09-17 23:59 ICT /
  2026-09-17 16:59 UTC / 2026-09-17 12:59 EDT**, beyond the judging end. The Public repository
  remains the durable fallback for provider outages, cold starts, or emergency containment.

## Optional authenticated local DataHub OSS

The executed proof used localhost-only DataHub OSS without a GMS token. For a locally hardened
reproduction, the official
[Metadata Service Authentication](https://docs.datahub.com/docs/authentication/introducing-metadata-service-authentication)
and [PAT](https://docs.datahub.com/docs/authentication/personal-access-tokens) docs require
authentication on both GMS and the frontend before the UI can generate a PAT:

1. Copy `~/.datahub/quickstart/docker-compose.yml` to an operator-owned file outside the repository.
2. Set `METADATA_SERVICE_AUTH_ENABLED: 'true'` for `datahub-gms-quickstart` and
   `datahub-frontend-quickstart`.
3. Restart with
   `datahub docker quickstart --quickstart-compose-file <operator-owned-compose-path>`.
4. In local DataHub, use **Settings → Access Tokens → Generate new token**.
5. Supply that token only to `mcp-server-datahub` as `DATAHUB_GMS_TOKEN`; never paste it into the web
   app, repository, screenshots, or logs.

The app-to-MCP hop remains trusted loopback with `DATAHUB_MCP_AUTH_MODE=none`. This optional recipe was
verified against the current official documentation on 2026-07-28; it was not rerun with a token in
this UI follow-up.
