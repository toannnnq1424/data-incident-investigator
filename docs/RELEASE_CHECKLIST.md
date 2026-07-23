# Release checklist

This checklist is governed by [`VERSIONING.md`](VERSIONING.md). The candidate and final-release items
below are instructions for their later scoped phases; no version, date, tag, or release is created by
Phase 7.5 or Phase 7.6.

## Repository

- [ ] GitHub repository is public and default branch is protected as appropriate.
- [x] README setup works from a clean dependency baseline through the tracked frozen bootstrap.
- [ ] License, contributing guide, architecture, and known limitations are current.
- [x] No secrets, local files, debug output, or generated junk are tracked.

## Validation

- [x] Clean `pnpm install --frozen-lockfile` succeeds.
- [x] Repository format, lint, type-check, tests, build, and smoke pass.
- [x] Full evaluation report is generated and reviewed.
- [x] Fixture-backed e2e passes.
- [ ] Real DataHub smoke passes when credentials are available.

## Phase 7.6 — artifact/deployment/rollback readiness

- [x] Build the clean exact commit once with `pnpm release:artifact`; retain the exact archive name,
      full commit/tree, file count, archive SHA-256, and sidecar.
- [x] Before the release build, preflight and clean only all five exact artifact-consumed output roots;
      fail before partial cleanup for any link/reparse or path escape, and cover stale ignored output
      plus unrelated-output preservation with focused regression tests.
- [x] Verify the archive before extraction and the extracted directory afterward against a separately
      approved full commit and version; confirm exact contents and forbidden-path exclusions.
- [x] Prove the archived runtime manifests resolve packaged compiled JavaScript, then prove a frozen
      production install plus fixture API `/health`, `/ready`, and bounded incident smoke from the
      extracted artifact on a dynamic loopback port without a TypeScript loader.
- [x] Rehearse immutable-artifact selection, staging, validation, and teardown locally. Record that no
      distinct prior release exists yet, so cross-version rollback remains unproven.
- [x] Confirm no artifact, tag, Release, package, or deployment was uploaded/published and no external
      environment was mutated.

## Phase 7.7 — `v1.0.0-rc.1` implementation candidate (in progress)

- [x] Record the exact clean current-`main` commit, tree, parent, and successful main CI evidence.
- [x] Confirm that no `v1.0.0-rc.1` tag or GitHub Release already exists.
- [x] Set the root and all six private workspace manifests to `1.0.0-rc.1` in one release change.
- [x] Run `pnpm install --lockfile-only` with pnpm `11.9.0`; commit the lockfile only if it changes,
      then prove a frozen install.
- [x] Move the applicable `Unreleased` entries into a `1.0.0-rc.1` section with the actual cut date and
      leave a new `Unreleased` section; add links only after their Git refs exist.
- [ ] Complete the separately scoped Phase 7.7 full RC/fresh-clone gate, create one Draft pull request,
      and require exact-head PR CI success before independent-QA handoff.
- [ ] Keep the implementation Draft/unmerged and create no tag or GitHub Release. After independent QA
      accepts and the change is merged, a separately authorized publication gate may create and
      normally push immutable tag `v1.0.0-rc.1`, then create the matching GitHub Release as Draft and
      verify both resolve to the exact validated commit.
- [ ] Do not publish the Draft RC Release in the post-merge publication gate; publication is deferred
      and requires separate later authorization.

## Phase 8 — `v1.0.0` final (not performed)

- [ ] Confirm the accepted candidate, final scope, clean current `main`, and absence of an existing
      `v1.0.0` tag or GitHub Release.
- [ ] Set the root and all six private workspace manifests to `1.0.0`; perform the same deterministic
      lockfile/frozen-install check.
- [ ] Record only the changes since the candidate in a `1.0.0` changelog section with the actual cut
      date, retain `Unreleased`, and use only links backed by existing Git refs.
- [ ] Complete the final Phase 8 release/submission gates against the exact final commit.
- [ ] After all gates pass, create and normally push immutable tag `v1.0.0`, create the matching GitHub
      Release, and verify both resolve to the exact validated commit.

## Deployment

- [x] Production API starts and `/health` succeeds.
- [ ] Web artifact points to the production API.
- [ ] Public fixture demo completes end-to-end.
- [x] Timeout/provider error states are user-friendly.
- [ ] A distinct deployed last-known-good rollback artifact is identified and retained.

## Submission

- [ ] Devpost copy contains only verified claims.
- [ ] Architecture diagram and DataHub/Codex explanations are complete.
- [ ] Video follows the sub-three-minute demo script.
- [ ] Screenshots cover input, progress, root cause, evidence, lineage, and actions.
- [ ] Repository URL, deployment URL, video URL, limitations, and roadmap are present.
- [ ] Final release commit and tag are pushed.
