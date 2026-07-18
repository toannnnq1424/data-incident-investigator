# Release checklist

## Repository

- [ ] GitHub repository is public and default branch is protected as appropriate.
- [ ] README setup works from a clean clone.
- [ ] License, contributing guide, architecture, and known limitations are current.
- [ ] No secrets, local files, debug output, or generated junk are tracked.

## Validation

- [ ] Clean `pnpm install --frozen-lockfile` succeeds.
- [ ] Repository format, lint, type-check, tests, build, and smoke pass.
- [ ] Full evaluation report is generated and reviewed.
- [ ] Fixture-backed e2e passes.
- [ ] Real DataHub smoke passes when credentials are available.

## Deployment

- [ ] Production API starts and `/health` succeeds.
- [ ] Web artifact points to the production API.
- [ ] Public fixture demo completes end-to-end.
- [ ] Timeout/provider error states are user-friendly.
- [ ] Rollback target is identified.

## Submission

- [ ] Devpost copy contains only verified claims.
- [ ] Architecture diagram and DataHub/Codex explanations are complete.
- [ ] Video follows the sub-three-minute demo script.
- [ ] Screenshots cover input, progress, root cause, evidence, lineage, and actions.
- [ ] Repository URL, deployment URL, video URL, limitations, and roadmap are present.
- [ ] Final release commit and tag are pushed.
