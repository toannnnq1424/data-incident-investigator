# Release checklist

This checklist is governed by [`VERSIONING.md`](VERSIONING.md). Phase 7.7 completed the immutable
`v1.0.0-rc.1` tag and no-user-uploaded-asset Draft Release gates; the final-release and Devpost
actions below remain separately scoped.

## Repository

- [ ] GitHub repository is public and default branch is protected as appropriate.
- [x] README setup works from a clean dependency baseline through the tracked frozen bootstrap.
- [x] Apache-2.0 licence, contributing guide, architecture, and known limitations are integrated on
      exact `main`; GitHub detects `Apache-2.0` and exact-main CI is successful.
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
- [x] The user explicitly authorized Apache-2.0 on 2026-07-25; Phase 8.4A is integrated on exact main
      with successful exact-main CI and GitHub detected-license evidence.
- [ ] The independently approved Public mutation remains in Phase 8.4B Stage 1 preflight. Change
      visibility only after independent QA and explicit same-task continuation.
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
- [x] Inventory the root plus six-workspace production closure without install/registry/network:
      138 external package-version nodes/132 names/7 importers; all 138 declare a license (122 MIT, 10
      ISC, 5 BSD-3-Clause, 1 BSD-2-Clause), 137 have a legal file, and 0 have NOTICE. Treat declarations
      as evidence only; compatibility and attribution/NOTICE obligations remain unresolved.
- [x] Inventory GitHub exposure read-only in the official signed-in in-app Browser: Private, 44
      branches, one RC tag, one no-uploaded-asset Draft Release, 0 open/41 closed PRs, 2 open/7 closed
      issues, and 117 Actions runs.
- [x] Record the coordinated migration impact, ownership/contributor-attestation boundary,
      attribution/NOTICE decision, official Apache/GitHub references, residual blockers, and two
      independent approvals in
      [`PUBLIC_SOURCE_APACHE_READINESS.md`](PUBLIC_SOURCE_APACHE_READINESS.md).
- [x] The user explicitly approved the project relicense from MIT to Apache-2.0 on 2026-07-25.
- [x] The user separately approved changing GitHub visibility from Private to Public on 2026-07-25;
      that approval is reserved for Phase 8.4B and is not consumed by Phase 8.4A or ordinary merge.
- [x] Implement the coordinated licence/metadata/docs change on a Draft branch after the first
      approval; do not invent a generic project NOTICE or claim the distributed bundle has no
      third-party runtime code.
- [ ] Change visibility only after the second approval; re-verify detectable licence, branch
      controls, public clone/setup, Actions exposure, release state, and judge access afterward.

## Phase 8.4A — authorized Apache-2.0 implementation (integrated)

- [x] Start from exact fetched Phase 8.3 main
      `a13448fb3e25885410a10f3c8e5efdea6b6b5429`, tree
      `25e661474e888b18252f331844aa066831276f89`, ordered parents
      `7f05888ce7266f51b5028f5ac5ddacd3a91a11aa` then
      `843a8fe2782abe38c7651f7d34c79b0716823543`; exact main CI run `30165738417`, job
      `89698326756`, is `SUCCESS`.
- [x] Reconfirm signed-in GitHub state is `Private`; do not press or change visibility.
- [x] Record sanitized 128-commit author/committer provenance counts without personal emails or legal
      overclaim.
- [x] Replace `LICENSE` with the unmodified canonical UTF-8/LF Apache License 2.0 text and exact
      SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.
- [x] Set exact SPDX `Apache-2.0` in root plus six workspace manifests while keeping every version at
      `1.0.0-rc.1` and every package `private: true`.
- [x] Keep `pnpm-lock.yaml` byte-identical at SHA-256
      `e36baa3fe1899c4f58cc66eeeaea279601e5be271690b6fa215273740e4ac107`.
- [x] Correct the attribution boundary: the archive omits the `node_modules` directory but includes
      complete `apps/web/dist` with bundled third-party runtime code; 0 dependency NOTICE files does
      not settle MIT/ISC/BSD notice obligations.
- [ ] Before publishing or distributing a release artifact, determine packages actually embedded in
      the exact web output, capture required copyright/permission notices with upstream provenance,
      and add a third-party attribution file plus builder/verifier/test enforcement only if justified.
- [x] Independent QA, normal merge, exact-main CI success, and GitHub Apache-2.0 detection are
      complete; C09 is `PASS`.
- [x] Phase 8.4A kept C10 Public `OPEN`, C11 `PARTIAL`, and Phase 8.2 `PARTIAL`; it executed no
      Phase 8.4B action.

## Phase 8.4B Stage 1 — Public transition preflight (pre-mutation)

- [x] Fetch and verify exact main
      `36d4205806597ae14b7306c74e1527c284202023`, tree
      `876899895449981f3c4dd3981ef76ba64597d1bd`, ordered parents
      `a13448fb3e25885410a10f3c8e5efdea6b6b5429` then
      `7154b8ce036ec97adb87ed76d8483727746e4501`; exact-main CI run
      `30172556907`, job `89715980644`, is `SUCCESS`.
- [x] Confirm GitHub remains `Private`, detects `Apache-2.0`, and has default branch `main`.
- [x] Reuse Phase 8.3/8.4A broad evidence; perform only tracked-filename, three-new-commit added-text,
      targeted secret/path/link/junk, submodule/LFS, manifest/license/lock, and branch-name checks.
- [x] Record exact read-only metadata: 46 branches, 0 open/43 closed PRs, 2 open/7 closed issues, 123
      Actions runs, one RC tag, one unpublished zero-uploaded-asset Draft Release, no Pages/deployment,
      blank About website/topics, no branch protection/ruleset, and automatic head deletion off.
- [x] Record the exact GitHub UI Public effects and bounded rollback/escalation boundary without
      acknowledging or executing the mutation.
- [x] Record that no Code of Conduct exists without inventing a blocker, and that the private
      vulnerability-reporting route is currently unavailable while Private.
- [ ] Require independent QA and explicit post-QA continuation in the same task before visibility
      mutation. Keep C10 `OPEN`, C11 and Phase 8.2 `PARTIAL`, repository `Private`, and artifact
      publication/distribution `BLOCKED`.
- [ ] After mutation, verify UI `Public`, unauthenticated read/clone, exact main/default branch/license,
      tag/Release/issues/Actions visibility, all 46 pre-existing branches plus the task branch, all 43
      pre-existing closed PR conversations plus the current Draft PR, unchanged Pages/deployment/About,
      and actionable private vulnerability reporting.
- [ ] Add the post-mutation evidence commit, normal-push it, require exact-head PR CI `SUCCESS`, and
      return the same Draft PR for new independent QA without merging.

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
