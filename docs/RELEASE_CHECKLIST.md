# Release checklist

This checklist is governed by [`VERSIONING.md`](VERSIONING.md). Phase 7.7 completed the immutable
`v1.0.0-rc.1` tag and no-user-uploaded-asset Draft Release gates; the final-release and Devpost
actions below remain separately scoped.

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

## Phase 7.7 — `v1.0.0-rc.1` implementation candidate (complete)

- [x] Record the exact clean current-`main` commit, tree, parent, and successful main CI evidence.
- [x] Confirm that no `v1.0.0-rc.1` tag or GitHub Release already exists.
- [x] Set the root and all six private workspace manifests to `1.0.0-rc.1` in one release change.
- [x] Run `pnpm install --lockfile-only` with pnpm `11.9.0`; commit the lockfile only if it changes,
      then prove a frozen install.
- [x] Move the applicable `Unreleased` entries into a `1.0.0-rc.1` section with the actual cut date and
      leave a new `Unreleased` section; add links only after their Git refs exist.
- [x] Complete the separately scoped Phase 7.7 full RC/fresh-checkout gate against the exact release
      commit.
- [x] Create one Draft pull request and require exact-head PR CI success before independent-QA handoff.
- [x] Require independent QA PASS first; only then mark the existing pull request Ready and merge it
      using a normal merge commit, never squash or rebase. Record the exact merge SHA, tree, and ordered
      parents: merge `c4e33f7af3707f604d35b1220a18e4e83f491be3`, tree
      `ffa4276315f8dd788f12b2780cee9bc13365ebbc`, parents
      `3a3d6792b1a32fedaac7aa7b17be5a5f64027931` then
      `8cbfe1646b8afda45b4547be73f787ba004c38ad`.
- [x] Fetch and confirm `origin/main` resolves exactly to that recorded normal-merge SHA, then require
      the exact merge commit's main CI run `30029013969`, job `89280632707`, to finish SUCCESS before
      any tag or Release action.
- [x] In a separately authorized publication gate, create and push immutable tag `v1.0.0-rc.1`
      exactly at the recorded normal-merge SHA, not at artifact commit
      `90f07b7171520767d6f30f8c8a6146de5e129a73`, feature head
      `d6bc8b3ec9c8db8167b26f14ddc7f2d8520dfcd7`, or a later evolving head. Verify the tag resolves
      exactly to the merge SHA.
- [x] Create the matching GitHub Release only as Draft and verify its selected tag/target resolves to
      the same recorded merge SHA. The Phase 7.7 Draft Release has no user-uploaded assets; the two
      displayed source archives are GitHub-generated. The already-cleaned 29-file evidence artifact
      was built only at
      `90f07b7171520767d6f30f8c8a6146de5e129a73` with its own provenance. It is not tag-built or
      merge-built. It must not be uploaded or attached.
- [x] The no-user-uploaded-asset RC Release remains Draft and was not published in Phase 7.7. Do not
      publish to a registry, upload a CI/release asset, or perform a public/external deployment; every
      such action remains deferred and requires separate authorization.

## Phase 8.1 — Devpost requirements baseline

- [x] Read and cite the complete official Overview, Rules, and Resources pages, plus the official Dates
      page and only the incorporated Terms sections needed to resolve content/access obligations.
- [x] Record the exact submission/judging schedule in ET, UTC, and Asia/Bangkok with source access
      timestamps and deadline risk.
- [x] Record eligibility, new-work/disclosure, DataHub integration, Apache 2.0/public source, Project
      URL/access, video, judging, prize/resource, IP/data, disqualification, and winner obligations.
- [x] Separate explicit requirements, inferences, recommendations, and unknown form details.
- [x] Map every explicit rule to exact repository status, owner phase, and next action in
      [`DEVPOST_REQUIREMENTS.md`](DEVPOST_REQUIREMENTS.md).
- [x] Phase 8.2 implements the named DataHub MCP Server integration and verifies its bounded protocol
      fixture/product vertical slice; direct GraphQL alone is not treated as compliant and the fixture
      is not called a live validation.
- [ ] Validate the exact MCP path against an authorized live DataHub Core/Cloud service and preserve a
      judge-accessible endpoint/auth plan; named-integration compliance remains `PARTIAL` until then.
- [ ] A legal/owner gate resolves Apache 2.0 against the current MIT licence.
- [ ] A separately authorized publication gate reviews history/secrets and changes repository
      visibility from Private to Public only when submission-ready.
- [ ] An entrant gate verifies eligibility, team/representative mode, registration, live form fields,
      disclosures, consent, and final submission receipt.
- [ ] A judge-access gate supplies a free testable Project URL/path through
      2026-08-31 17:00 EDT / 2026-09-01 04:00 ICT.
- [ ] A media gate supplies a publicly visible functioning-project video on an accepted host, with
      rights and English/translation checks; the script targets below 3:00 because the Rules recommend
      it and judges need not watch beyond minute three, not because it is a separately worded hard
      eligibility maximum.

## Phase 8.3 — public-source and Apache-2.0 decision preparation

- [x] Audit the exact current tree and all locally reachable Git history with bounded, read-only
      detectors; record only sanitized classes, paths, dates/commits, and non-reversible fingerprints.
- [x] Confirm that no credible credential/private key triggered the publication stop condition;
      retain the machine-local commit-email metadata as a manual provenance/privacy review item.
- [x] Inventory the root plus six-workspace production closure from manifests/lock/local metadata
      without install or network scanning: 138 external package-version nodes, all with licence,
      Apache-2.0 compatibility, and NOTICE obligations unresolved under the allowed evidence.
- [x] Inventory GitHub exposure read-only in the official signed-in in-app Browser: Private, 44
      branches, one RC tag, one no-uploaded-asset Draft Release, 0 open/41 closed PRs, 2 open/7 closed
      issues, and 117 Actions runs.
- [x] Record the coordinated migration impact, ownership/contributor-attestation boundary,
      attribution/NOTICE decision, official Apache/GitHub references, residual blockers, and two
      independent approvals in
      [`PUBLIC_SOURCE_APACHE_READINESS.md`](PUBLIC_SOURCE_APACHE_READINESS.md).
- [ ] An authorized human explicitly approves the project relicense from MIT to Apache-2.0 after
      ownership/contributor authority and dependency licence/notice evidence are resolved.
- [ ] An authorized human separately approves changing GitHub visibility from Private to Public
      after all branch/history/issue/PR/Actions/Release metadata surfaces are reviewed.
- [ ] Implement the coordinated licence/metadata/packaging/docs change only after the first approval.
- [ ] Change visibility only after the second approval; re-verify detectable licence, branch
      controls, public clone/setup, Actions exposure, release state, and judge access afterward.

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
- [ ] Video publicly shows the functioning project and follows the sub-three-minute target because it
      is the official recommendation and judging-attention/risk-reduction gate.
- [ ] Screenshots cover input, progress, root cause, evidence, lineage, and actions.
- [ ] Repository URL, deployment URL, video URL, limitations, and roadmap are present.
- [ ] Final release commit and tag are pushed.
