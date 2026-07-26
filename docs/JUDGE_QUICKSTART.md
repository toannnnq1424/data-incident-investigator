# Judge quickstart

Reach the canonical **Removed schema column** result in a few minutes without credentials.

## Fastest path: public fixture

Open:
<https://data-incident-investigator-1071683558688.asia-southeast1.run.app>

1. Allow a possible Cloud Run cold start. Continue when the top status reads
   **Fixture metadata · Ready**.
2. Scroll to **What changed?**.
3. In **Canonical incident scenario**, select **Removed schema column**.
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

## Exact judging boundary

- The public service uses synthetic, credential-free fixture data. It is not live DataHub evidence.
- A bounded read-only DataHub MCP integration exists and is locally protocol/product tested, but no
  authorized live/judge endpoint has been validated. That compliance state remains **PARTIAL**.
- Only **Removed schema column** has the rich checked-in fixture and canonical browser path.
- The app makes zero model calls and does not execute remediation or modify production data.
- Incident state is in memory and disappears on restart or scale-to-zero.
- Cloud Run availability through the end of judging is not guaranteed because the retained
  cost-control stop boundary is earlier. The Public repository is the durable fallback.
