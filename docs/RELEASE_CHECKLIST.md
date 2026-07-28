# Release checklist

This checklist is governed by [`VERSIONING.md`](VERSIONING.md). Phase 7.7 completed the immutable
`v1.0.0-rc.1` tag and no-user-uploaded-asset Draft Release gates. Phase 8 completed the final
`v1.0.0` tag and Published/Latest Release; the remaining Devpost project-form and submission actions
below remain separately scoped.

## Repository

- [x] GitHub repository is Public and default branch remains `main`.
- [ ] Default branch protection is configured as appropriate.
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
- [x] The independently approved Public transition is integrated; authenticated GitHub confirms
      Public visibility and enabled Private vulnerability reporting on exact current `main`.
- [x] Devpost registration records **Working solo** and **Open / Wildcard** as the category of
      interest.
- [x] Inspect the live project form and save the approved English copy, URLs, screenshots, thumbnail,
      challenge, DataHub technologies, residence, new-project selection, and feedback answers in
      draft project `1117401`.
- [ ] An entrant gate independently records the still-open eligibility/IP/rights facts, accepts the
      final Rules/Terms only after review, submits, and captures the final receipt.
- [x] The owner-authorized public Project URL operating window runs through
      2026-09-17 23:59 ICT, beyond the 2026-08-31 17:00 EDT judging end; the Public repository is the
      fallback.
- [x] The authentic 2:50.20 male-voice functioning-project video is Public on YouTube with authored
      English captions.
- [x] Enter and preview the exact hosted-video URL in Devpost draft `1117401`; the below-3:00 target
      is a Rules recommendation and judging-attention gate, not a separately worded hard eligibility
      maximum.
- [ ] Complete the entrant's final rights review before final Rules/Terms acceptance and submission.

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
- [x] Phase 8.5 determines the exact positive rendered package/module contributions, captures
      package/source/legal-file provenance, and adds deterministic `THIRD_PARTY_NOTICES.txt` plus
      builder/verifier/test enforcement.
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
- [x] After the task branch push and Draft PR #53 creation, reconfirm `Private`, exact main, 47 retained
      branches, 1 open/43 closed PRs, and 124 Actions runs.
- [x] Record the exact GitHub UI Public effects and bounded rollback/escalation boundary without
      acknowledging or executing the mutation.
- [x] Record the sanitized owner disposition: the independently approved Public transition accepts
      exposure of category-only commit identity metadata (including four `.local` records), retained
      branches/conversations/issues, the 124-run Actions checkpoint plus subsequent same-PR
      histories/logs, tag/Draft Release metadata, activity, and linked surfaces. Retain all records;
      perform no rewrite/delete/archive/hide. A later Private change is containment only and cannot
      recall forks, clones, caches, or copies.
- [x] Record that no Code of Conduct exists without inventing a blocker, and that the private
      vulnerability-reporting route is currently unavailable while Private.
- [x] The same independent QA task returned Stage 1 `PASS / EXECUTE`, followed by explicit same-task
      continuation. The repository owner then completed the authorized visibility change manually
      outside this agent; no credential/re-authentication detail is recorded.
- [x] Re-fetch the exact Private baseline before the external change, then verify after it that GitHub
      Settings and the root show `Public` with owner/name/default `main` unchanged.
- [x] Verify authenticated and unauthenticated `Public` surfaces, exact default-main baseline commit,
      Apache-2.0, credential-free read/clone, all 47 branches, 43 closed conversations plus Draft PR
      #53, 2 open/7 closed issues, the 125-run pre-evidence Actions history, tag/Draft Release, zero
      user-uploaded Release assets, and unchanged Pages/deployment/About. At this historical Stage 2
      checkpoint, private vulnerability reporting remained disabled and was deferred to QA.
- [x] Prepare only the post-mutation evidence docs commit on this same branch/PR; C10 is `PASS`, C09
      stays `PASS`, C11 and Phase 8.2 stay `PARTIAL`, and artifact publication/distribution stays
      `BLOCKED`.
- [x] Normal-push evidence commit `ae22580f13130bd4ddd7f0d8a846c3b7c102965a`; exact PR CI run
      `30176584471`, job `89726241001`, is `SUCCESS`; the PR remained Draft/unmerged.
- [x] Record same-QA QA2 `FAIL / DO NOT MERGE`: Private vulnerability reporting was disabled and no
      actionable external private-reporting route was proven.
- [x] With explicit authorization, enable only GitHub Private vulnerability reporting. At 2026-07-26
      05:22 ICT Settings shows the control as `Disable`, Security overview shows `Enabled`, and
      unsigned `/security` exposes `Report a vulnerability`; the report route requires GitHub sign-in.
- [x] Normal-push additive security-route commit
      `e4ddbb8277f430ed1da4593c9f19ca89f1aa39fb`, keep PR #53 Draft/unmerged, and return it to the
      same QA task for QA2 re-review.
- [x] Same-QA QA2 returned `PASS / MERGE`; an explicit post-QA2 continuation then authorized only the
      documented normal-merge sequence.
- [x] Mark PR #53 Ready and create normal merge
      `1c32f6c913b196fc4a23055fb7da3b1482b94e5e`; no squash, rebase, force-push, branch deletion, or
      conversation archival/hiding occurred.
- [x] Verify tree `5c83d034f30c6d31268109277aaa455a05ff9656`, ordered parents
      `36d4205806597ae14b7306c74e1527c284202023` then
      `e4ddbb8277f430ed1da4593c9f19ca89f1aa39fb`, `origin/main` and default `main` at the exact merge,
      and exact-main CI run `30178465331`, job `89731006555`, `SUCCESS`. Repository visibility remains
      `Public`, private vulnerability reporting remains enabled, and the task branch/conversation are
      retained. C10 remains `PASS` as a preservation/reverification result.

## Phase 8.5 — exact bundled-output attribution

- [x] Start from exact fetched `origin/main`
      `1c32f6c913b196fc4a23055fb7da3b1482b94e5e`; verify main CI run `30178465331`, job
      `89731006555`, `SUCCESS`, Public visibility, default `main`, and enabled Private vulnerability
      reporting.
- [x] Require the installed pnpm lock to byte-match repository `pnpm-lock.yaml` before the release
      build.
- [x] Record exact positive rendered-module provenance from Vite/Rollup and fail closed on unknown
      virtual modules, missing/ambiguous package legal files, or potential unattributed
      non-JavaScript asset contributions.
- [x] Attribute the exact web output to `react@19.2.7`, `react-dom@19.2.7`,
      `scheduler@0.27.0`, `vite@7.3.6`, and `zod@4.4.3`; all five declare MIT and have one verified
      top-level licence file with no top-level NOTICE.
- [x] Prove `abstract-logging@2.0.1` is absent from the bundled output. Its missing package legal file
      remains a non-bundled production-install/C11 legal-owner caveat.
- [x] Generate deterministic `THIRD_PARTY_NOTICES.txt`; bind exact pnpm lock package/snapshot,
      canonical virtual-store root, package/module/output/source/legal provenance and hashes into
      manifest schema v3; enforce exact content and membership for archive and extracted-directory
      verification.
- [x] Record independent Windows QA `FAIL / DO NOT MERGE` on exact prior head
      `bde288112f504c2067ff85499337d9315c30c432`; correct frozen identity binding, Windows path/link
      safety, archive/sidecar rollback, capture preconditions, focused coverage, and stale Phase 8.4B
      state on the same Draft PR #54.
- [x] Independent Windows QA passed the corrected exact branch head and local artifact evidence; PR
      #54 then merged through then-current main
      `73172b7e8e8b02ab9629019eac298b89e02895c2`.
- [x] Phase 8.6 records the legal-owner operational disposition over the captured texts and remaining
      dependency/data/API rights. C11 is `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE`; this is a
      conditional zero-cost authorization, not blanket legal clearance.
- [x] Keep the RC tag immutable, Draft Release unpublished with no user-uploaded assets, and all local
      artifact outputs unuploaded.

## Phase 8.6 — zero-cost rights and deployment preflight

- [x] Start from exact fetched `origin/main`
      `73172b7e8e8b02ab9629019eac298b89e02895c2`, tree
      `a4beb330fb528f4926eee8a538c7d2a79dab1f67`, ordered parents
      `1c32f6c913b196fc4a23055fb7da3b1482b94e5e` then
      `0b37e8a3235f0db0af8d84cbaaa2fd35cc48ddbd`; verify main CI `30188091600` /
      `89756253516` `SUCCESS` and PR #54 merged.
- [x] Reverify Public visibility, enabled Private vulnerability reporting, the unpublished Draft RC
      with only two automatic source archives, and no deployment environment.
- [x] Record the owner's no-fee operational authorization and fail closed on paid quota, larger
      runner, paid storage/package/domain/hosting/DataHub Cloud/API, or model/API fees.
- [x] Set C11 to `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE`: Phase 8.5 technical attribution passes,
      and zero-cost distribution is authorized only for the exact verified artifact with deterministic
      notices/manifest/verifier, synthetic/authorized data, and authorized DataHub/API access. Preserve
      the non-embedded `abstract-logging@2.0.1` caveat and make no blanket legal conclusion.
- [x] Preserve fixture mode as the recommended credential-free path; prohibit production/customer/
      confidential/PII/proprietary metadata, unauthorized endpoints or credentials, paid DataHub
      Cloud/API, and any `DATAHUB_TOKEN` commit/log.
- [x] Record official 2026-07-26 DataHub OSS/MCP and GitHub Actions/Pages evidence. Standard runners
      for the Public repository are free; larger runners are charged. Pages is available on GitHub
      Free for Public repositories and provides HTTPS static hosting, but cannot run the Fastify API.
- [x] Select the Public repository plus a later timed fixture quickstart as the immediate zero-cost
      judge path. Leave public full-stack deployment unselected until a provider-specific zero-spend
      packet, account identity, HTTPS/same-origin `/api`/probe/rollback/judge-access validation, and
      fresh owner approval exist.
- [x] Do not deploy, enable Pages, upload/publish/distribute an artifact, mutate tag/version/Release,
      enter credentials, change workflows/runtime, or submit in this slice.
- [x] Correct the earlier “no card ever” shorthand: a card-required genuinely free trial/free tier
      may be evaluated, but account creation, billing acceptance, card entry/storage, trial start,
      verification hold, and auto-conversion remain unauthorized until a ten-field provider packet
      receives fresh explicit owner approval. The owner performs sensitive card entry; agents never
      handle or capture card/CVV/billing credentials.
- [x] Separate official-source-backed candidates: Render Free is card-free/fail-closed without a
      payment method but remains unselected; Koyeb Starter/Free is `REJECT` because it requires a
      valid payment method without a hard zero-dollar limit; the unupgraded Google Cloud Free Trial
      is `ACCEPTABLE ONLY AFTER OWNER APPROVAL`, subject to its packet and buffered cancellation
      deadline. Do not sign up, deploy, or create a reminder in this correction.
- [x] Preserve C11 `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE`; the expanded hosting-evaluation policy
      does not authorize paid DataHub/API/runner/storage/domain/hosting, sensitive data, publication,
      deployment, Ready transition, or merge.
- [x] Close the Phase 8.6 QA provider finding: Koyeb's official Pricing FAQ records a USD 29
      immediately canceled pre-authorization hold that may remain visible for 7–21 days and a
      prorated selected-plan signup charge. Preserve `REJECT`, the USD 5 minimum alert, and absence
      of a spending limit/hard USD 0 cap; perform no signup.
- [x] Correct the then-current Phase 8.6 state to historical main
      `73172b7e8e8b02ab9629019eac298b89e02895c2`, tree
      `a4beb330fb528f4926eee8a538c7d2a79dab1f67`; keep Phase 8.4B identities historical and record PR
      #54 merged.
- [x] Record current main
      `b5b394b31ec626bb4ecc175975ca9869e475054e`, tree
      `2499267d819704b900511418818674010b4b9eae`; PR #55 and PR #56 are merged historical. Preserve
      the existing `v1.0.0-rc.1` tag/unpublished Draft Release.
- [x] Record `onlinelearning-484610` only as a non-mandatory existing Google Cloud reference. A later
      read-only control packet may prefer a dedicated project only if credit applicability and no
      increased fee risk are proven; require fresh owner approval for its exact name, globally unique
      ID, owning account/organization/billing account, and `Create Project` action.
- [x] Keep the next-slice Cloud Run recommendation to one request-billed Fastify + built Vite
      same-origin service, min `0`/initial max `1`, minimum passing CPU/memory, and unavoidable-only
      Build/Artifact Registry with surplus cleanup. Exclude Agent Platform, Vertex AI, models, and
      every GCP mutation from this correction.

## Phase 8.7 — Google Cloud control-packet QA correction

- [x] Reject the inspected Paid-account candidate under the unchanged zero-fee/no-overage policy;
      budgets, quotas, and maximum instances are not a hard USD/VND `0` cap.
- [x] Keep Google Cloud unselected and unapproved. A future owner could supersede the policy only
      through a new explicit risk acceptance; this packet is not that authorization.
- [x] Require Cloud Run's request timeout to exceed the bounded application/API deadline by a finite
      response margin; defer exact values to a future changed-seam smoke before deployment.
- [x] Recommend dedicated isolation while recording reuse-versus-dedicated total cost as unknown and
      unproven.
- [x] Preserve all safely redacted signed-in facts, official citations, uncreated project-ID
      candidates, and the no-Agent/Vertex/model boundary. Perform no GCP mutation.

The checklist above is historical. The owner subsequently and explicitly superseded its rejection,
accepted the residual Paid-account risk, and authorized the exact execution below.

## Phase 8.7 — owner-approved Google Cloud deployment execution

- [x] Disable billing on both prior test/reference projects and verify the new dedicated project is
      the candidate billing account's only linked project.
- [x] Create `dii-cloudrun-demo-26-a7c9` (`Data Incident Investigator`, no organization) and enable
      Cloud Run, Cloud Build, and Artifact Registry APIs explicitly. A later read-only inventory
      found 26 additional Google/default/transitive enabled services whose exact origin is not
      proven; do not blindly disable them.
- [x] Add the narrow Docker/same-origin production host seam and focused integration coverage; add no
      secret, model, DataHub credential, database, VPC, custom domain, scheduler, or reminder.
- [x] Deploy `data-incident-investigator` in `asia-southeast1` with request-based billing, first
      generation, `0.08` vCPU, `256 MiB`, concurrency `1`, minimum `0`, maximum `1`, timeout `100s`,
      CPU throttling on, and startup CPU boost off.
- [x] Verify final revision `data-incident-investigator-00002-pdq`, 100% traffic, public static UI,
      readiness, canonical Removed schema column investigation, report `81% · high`, and zero browser
      console warnings/errors.
- [x] Record that Bangkok has lower Tier 1 unit pricing; after that verification, retain Singapore
      under the owner's explicit instruction. Do not claim Singapore is the lowest-price region.
- [x] Preserve the hard-risk warning: budgets do not cap spend and maximum instances is not an
      absolute monetary cap. Stop/delete/detach billing by 2026-08-10 or at 20% reported credit
      remaining, whichever occurs first.

The execution checklist above is historical and was found incomplete by independent QA.

## Phase 8.7 — deployed-state controls, legal, and provenance correction

- [x] Reproduce the live mismatch read-only: revision maximum `1` and timeout `100s`, but
      service-level `maxScale=100`; classify revision `00002-pdq` and its smoke as historical.
- [x] Inventory 29 enabled services total, separating the three explicitly enabled deployment APIs
      from 26 Google/default/transitive services with unproven origin. Inventory one 745,422-byte
      run-sources ZIP, the 113.275 MB Artifact Registry repository, one old image/digest, and one
      successful historical build.
- [x] Pin all Node Docker stages to immutable digest
      `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d`;
      use compiled production start as unprivileged `node`; exclude source/dev/test/docs/audit junk.
- [x] Generate and source/local-image verify exact runtime attribution: lock SHA
      `eeec795d5a09d5e8865b54bfbd95fb3557cce421c5369d99b6e2f89a472484b2`, 152 full-production
      identities, 149 runtime identities/roots, five Vite identities, deterministic runtime
      manifest/notices, Apache `LICENSE`, project `NOTICE`, and explicit
      `abstract-logging@2.0.1` upstream fallback evidence.
- [x] Keep C11 blocked for the historical Cloud Run distribution until the exact clean source commit
      passed CI, was archived and deployed, and its live digest/legal evidence passed; restore only
      the bounded qualified disposition after those exact gates.
- [x] Push clean source commit `3653cf6b…7fa4f`; exact-source-head PR CI run `30208678827`, job
      `89811104840`, succeeded.
- [x] Deploy only its immutable archive with source label/revision suffix and both service
      `--max=1` and revision `--max-instances=1`, plus min `0`, concurrency `1`, timeout `100s`,
      `0.08` CPU, `256 MiB`, CPU throttling on, CPU boost off, fixture mode, and Singapore.
- [x] Verify exact build/archive/image/revision/config/API/resource/legal provenance, then run exactly
      one corrected public UI/health/readiness/canonical/Markdown/console/accessibility/overflow
      smoke.
- [x] Record this later docs-only evidence commit without claiming the running revision was built
      from it. Record exact-final-head CI only in the mutable Draft PR #56 body to avoid circular
      evidence; keep the PR Draft and unmerged at that Phase 8.7 review gate. PR #56 later merged
      through current main; the running image remains bound to its earlier immutable source commit.

## Phase 8 — `v1.0.0` final (released)

- [x] Start from accepted exact main `b4f9e360e22baba3cab60710a65ea5c0e0555369`, confirm the
      bounded final-preparation scope, and verify that no `v1.0.0` tag, GitHub Release, duplicate
      implementation branch, or duplicate PR exists. Preserve the existing `v1.0.0-rc.1` tag and
      unpublished Draft Release unchanged.
- [x] Set the root and all six private workspace manifests to `1.0.0`. Exact pnpm `11.9.0`
      lockfile-only/frozen-install checks pass; the final production audit required only
      `find-my-way@9.7.0` and `brace-expansion@5.0.8` transitive security overrides, producing final
      lock SHA-256 `6194526652ac34a3f3b06e16fd8a055ff88cdbd77c51c8e6e3695b4b5611bf1d`.
- [x] Record only verified changes since the candidate in `[1.0.0] - 2026-07-28`, retain a new empty
      `Unreleased`, and add no comparison/tag/Release link before the final Git ref exists.
- [x] Run the dirty-tree-compatible pre-commit technical gates once: Level D, canonical evaluation,
      Browser fixture E2E, public root/health/readiness, production audit and its patched seam,
      runtime attribution, formatting, links, claims, secrets, residue, processes, and ports.
- [x] The exact `fc2ba2f…` archive passed structural verification and production frozen install but
      is rejected because packaged startup exposed an omitted DataHub MCP sibling module. After the
      one authorized additive closure correction, the replacement exact clean-HEAD artifact,
      extracted runtime, and focused clean checkout passed with provenance bound to final feature
      commit `03f72172a9742b3f3f84b33c131cb0d4393a3193`.
- [x] Complete independent Windows QA, normal merge, and exact-main CI against release merge
      `a28e21c06ad623f1547c02a6d65fd900fa8472a4`, tree
      `e0594ddecbe9d82f30e7b3005a51cb8df9283bf8`; CI run `30338530196`, job `90208641358`, is
      successful. External submission gates remain separately tracked.
- [x] Create and normally push immutable annotated tag `v1.0.0`; tag object
      `eb26bc54fccd4cc0ebeacfb14539008a03da687a` resolves to the exact release merge. The matching
      GitHub Release is Published/Latest. The historical `v1.0.0-rc.1` tag and Draft Release remain
      untouched.

## Phase 8.12 — `v1.0.1` submission-synchronization candidate

- [x] Start from exact deployed main `0ac3b8180cebdccd8c4b914443ebafa6831a112d`, tree
      `d4c621e981bf11e97513bbc49de3eb589eca33b3`; exact-main CI run `30390755820`, job
      `90381434069`, is `SUCCESS`. Confirm no existing `v1.0.1` tag/Release or duplicate branch/PR.
- [x] Align the root and six private workspace manifests at `1.0.1`; update only the MCP client/test
      product-version metadata; run exact pnpm `11.9.0` lockfile-only and frozen-install checks.
- [x] Curate `[1.0.1] - 2026-07-29` and retain a new empty `Unreleased` section. Do not add a tag or
      comparison link before the immutable Git ref exists.
- [x] Produce one 2:48.91 app-only Phase 8.11 candidate from exactly one synthetic fixture incident,
      with offline Microsoft David male narration, exact English captions/transcript, five truthful
      PNGs, hashes/probes, and no browser/account chrome or hidden/live-MCP claim. Keep the new silent
      capture only as local QA provenance and preserve all prior media.
- [ ] Independent canonical QA must pass the exact Draft-PR head. Then normal-merge only, require
      exact-main CI success, and separately authorize immutable `v1.0.1` tag/Published Release at the
      exact normal-merge SHA. Never tag the feature head; do not touch `v1.0.0` or `v1.0.0-rc.1`.
- [ ] After separate post-QA authorization, upload the reviewed derivative/captions, obtain the final
      Rules-listed URL, update/save/resubmit Devpost project `1117401`, and preserve the receipt. No
      upload, Devpost edit, or resubmission occurs in the preparation PR.

## Deployment

- [x] Production API starts and `/health` succeeds.
- [x] Web artifact uses the same-origin production `/api` boundary.
- [x] Public fixture demo completes end-to-end.
- [x] Timeout/provider error states are user-friendly.
- [x] Current proven live revision `data-incident-investigator-src-0ac3b8180ceb`, built from
      immutable source commit `0ac3b8180cebdccd8c4b914443ebafa6831a112d`, receives 100% traffic in
      `APP_MODE=fixture`; image digest is
      `sha256:0ea3381f635a97812181f14448df9c7939f7c02d2a824724403e3b8a0d087286`.
- [x] Previous immutable revision `data-incident-investigator-00001-jst` is retained only as a
      historical rollback candidate; it is not the current proven live or “last-known-good”
      revision.
- [x] Phase 8.11 owner authorization supersedes the historical early-stop policy: keep the public
      fixture available through 2026-09-17 23:59 ICT, beyond judging. A 20%-remaining-credit signal
      now triggers monitoring/escalation instead of automatic pre-judging shutdown; retain emergency
      containment and the Public-repository fallback.

## Submission

- [x] Repository Devpost draft copy contains only verified claims and explicit limitations.
- [x] Architecture diagram and DataHub/Codex explanations are complete.
- [x] The exact 2:50.20 male-voice functioning demo is Public at
      <https://youtu.be/D5mvMqrhyDc> with authored English captions and no upload-check copyright
      issue.
- [x] Screenshots cover input, progress, root cause, evidence, lineage, and actions.
- [x] Repository URL, deployment URL, video URL, limitations, and roadmap are present.
- [x] Final release commit and tag are pushed.
- [x] Devpost registration and individual Join are complete, with Open / Wildcard recorded as the
      registration category of interest.
- [x] Create and review draft project `1117401`; save and preview the verified URLs, English copy,
      five captioned screenshots, thumbnail, challenge, technologies, and optional feedback answers.
- [x] The entrant personally operated the legal confirmation/submission gate; signed-in evidence
      reported **Project submitted!**, **Submitted**, and **5/5**. This is not organizer acceptance.
- [ ] Repository evidence cannot independently attest age/eligibility, sanctions/conflicts,
      ownership/IP/media rights, or organizer acceptance; the entrant must answer any verification
      request truthfully.
