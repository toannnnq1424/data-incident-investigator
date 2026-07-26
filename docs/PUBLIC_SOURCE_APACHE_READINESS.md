# Public-source and Apache-2.0 readiness decision packet

Status: `PHASE 8.6 — QUALIFIED ZERO-COST OWNER DISPOSITION`; Apache-2.0 and Public visibility are
integrated, Private vulnerability reporting is enabled, the technical release-bundle inventory is
enforced, and C11 is `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE` under the exact limitations below.
This is an operational authorization and engineering record, not legal advice or blanket legal
clearance.

This document prepares two independent decisions for Data Incident Investigator:

1. whether the project may be relicensed from MIT to Apache-2.0; and
2. whether the GitHub repository may be changed from Private to Public.

The user explicitly approved both decisions independently on 2026-07-25. Phase 8.4A consumed the
first approval and is integrated on `main`. Phase 8.4B Stage 1 remains the historical pre-mutation
packet. After its independent QA returned `PASS / EXECUTE`, the repository owner completed the
approved visibility change outside this agent. The exact mutation timestamp was not exposed by the
reviewed GitHub UI; authenticated and unsigned verification began at 2026-07-26 04:48 ICT
(2026-07-25 21:48 UTC).

This is an engineering and review record, not legal advice. Stage 2 records the external visibility
change and evidence; it does not disclose credential or re-authentication details and changes no
other GitHub setting, About metadata, tag, Release, release asset, deployment, credential, submission
state, runtime, dependency, version, workflow, manifest, lockfile, or artifact.

## Phase 8.4A authorized implementation

The implementation starts from fetched `origin/main`
`a13448fb3e25885410a10f3c8e5efdea6b6b5429`, tree
`25e661474e888b18252f331844aa066831276f89`, with ordered parents
`7f05888ce7266f51b5028f5ac5ddacd3a91a11aa` then
`843a8fe2782abe38c7651f7d34c79b0716823543`. Exact main CI run `30165738417`, job
`89698326756`, is `SUCCESS`. The signed-in in-app Browser reconfirmed the repository is `Private`
before mutation.

Reachable `origin/main` provenance contains 128 commits. To avoid exposing personal email data, only
non-reversible SHA-256 prefixes and counts are recorded:

| Metadata surface             | Sanitized fingerprint counts                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Author display name          | `sha256:554336d2fb45b9ee` ×2; `sha256:d6a0370f5fd054d1` ×42; `sha256:ed7cb49c10821476` ×84 |
| Author email                 | `sha256:1878a199025ee7c6` ×126; `sha256:6ea35c6bf9a0eb3c` ×2                               |
| Committer email              | `sha256:1878a199025ee7c6` ×84; `sha256:3c205d8fc749f729` ×42; `sha256:6ea35c6bf9a0eb3c` ×2 |
| Cryptographic signature flag | 128 commits report no Git signature                                                        |

The shared author-email fingerprint spans two display-name fingerprints, while the two local
author/committer records use the third display-name and email fingerprints. This supports provenance
review but does not prove that labels are the same legal person, establish title, or substitute for
legal review. The user's explicit authorization is recorded as the operative project-owner decision
for this implementation; no broader legal conclusion is claimed.

Phase 8.4A replaces `LICENSE` with the unmodified canonical Apache License 2.0 text, sets exact SPDX
`Apache-2.0` in all seven private manifests, and updates direct project-license claims and contributor
terms. Versions remain `1.0.0-rc.1`; `private: true`, dependencies, workspace membership, and
`pnpm-lock.yaml` remain unchanged.

The prior MIT file stated `Copyright (c) 2026 toannnnq1424`. That exact historical notice remains in
reachable Git history and is retained here as migration provenance. It is not inserted into the
unmodified canonical licence text or used to invent a project NOTICE.

## Phase 8.4B Stage 1 public-transition preflight

### Exact integrated baseline and bounded source review

Stage 1 fetched `origin/main` without pruning and verified exact commit
`36d4205806597ae14b7306c74e1527c284202023`, tree
`876899895449981f3c4dd3981ef76ba64597d1bd`, and ordered parents
`a13448fb3e25885410a10f3c8e5efdea6b6b5429` then
`7154b8ce036ec97adb87ed76d8483727746e4501`. Signed-in GitHub showed main CI run
`30172556907`, job `89715980644`, `SUCCESS` for that exact commit. Branch
`codex/phase-8-4b-public-transition` was created only from that fetched main.

The repository now has 131 commits reachable from `main` and 124 tracked paths. The Phase 8.3
current/history audit and Phase 8.4A provenance evidence remain the broad baseline. Stage 1 did not
repeat the full history or dependency graph. It instead reviewed every tracked filename, the three
new main commits after the Phase 8.3 integration baseline, and the 782 added lines in the Phase 8.4A
net change:

- no tracked filename indicates a credential, key, cookie, session, private environment file, local
  database, generated output, or editor/OS residue;
- no private-key block, recognized provider-token form, machine-user path, embedded task/delegation
  identifier, private-account marker, or new internal endpoint occurs in the added Phase 8.4A text;
- the previously classified authorization, URL-credential, internal-host, and email detector
  candidates remain synthetic tests, sanitization/redaction contracts, reserved example values, or
  already-published public contacts; no candidate became a credible secret;
- `.env.example` remains the only tracked environment file and contains blank credentials;
- there is no `.gitmodules`, submodule or symlink mode, LFS pointer, private dependency locator, or
  tracked generated/junk path; and
- 46 current remote branch names match the signed-in GitHub count and contain no secret/account/path
  marker. This is a retention and name-safety baseline, not a new full branch-history scan.

The canonical `LICENSE` remains byte-identical at SHA-256
`cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`. Root plus all six
workspace manifests remain aligned at `1.0.0-rc.1`, `private: true`, and exact SPDX `Apache-2.0`.
`pnpm-lock.yaml` remains byte-identical at SHA-256
`e36baa3fe1899c4f58cc66eeeaea279601e5be271690b6fa215273740e4ac107`.
At the Stage 1 checkpoint GitHub detected `Apache-2.0` on exact main, so C09 was `PASS`; C10 remained
`OPEN`, while C11 and Phase 8.2 remained `PARTIAL`.

Fixture mode remains credential-free. Direct GraphQL and DataHub MCP modes require operator-supplied
authorized external configuration, but no live/judge DataHub credential is present or required to
make the source public. Release artifact publication or distribution remains independently
`BLOCKED` by the exact bundled-output attribution gate.

### Read-only GitHub metadata baseline

The official signed-in in-app Browser recorded this pre-mutation state at
2026-07-26 03:16 ICT (2026-07-25 20:16 UTC):

| Surface                     | Exact pre-mutation state                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity/default/visibility | `toannnnq1424/data-incident-investigator`; default `main`; `Private`                                                                                                       |
| Main/license/CI             | exact `36d4205806597ae14b7306c74e1527c284202023`; detected `Apache-2.0`; run `30172556907` / job `89715980644` `SUCCESS`                                                   |
| Branches and retention      | 46 branches; automatic head-branch deletion is off; 0 classic branch protections and 0 rulesets                                                                            |
| Pull requests               | 0 open / 43 closed; no conversation deletion was performed in Stage 1                                                                                                      |
| Issues                      | 2 open / 7 closed; Issues are enabled for all users who can see the repository                                                                                             |
| Actions                     | 123 runs across `CI`, `PR CI`, and `Release validation`; the latest exact-main run is successful                                                                           |
| Tag/Release                 | one `v1.0.0-rc.1` tag at `c4e33f7af3707f604d35b1220a18e4e83f491be3`; one unpublished Draft Release at that target; zero user-uploaded assets                               |
| About                       | truthful description; blank website; no topics; Releases and Packages shown; Deployments not shown                                                                         |
| Pages/deployments           | Pages says “Upgrade or make this repository public to enable Pages”; no Pages site or repository deployment is configured or claimed                                       |
| Security reporting          | `docs/SECURITY.md` is detected; `/security/advisories/new` currently returns 404 and no private-vulnerability-reporting control is exposed while the repository is Private |
| Community health            | `CONTRIBUTING.md` and sanitized issue/PR templates exist; no Code of Conduct is tracked                                                                                    |

The absent Code of Conduct is recorded as an optional community-governance follow-up, not a blocker:
neither the reviewed GitHub UI nor the Devpost requirements baseline establishes it as a Public-source
requirement. The unavailable advisory route is a real post-mutation readiness check. If it remains
unavailable after Public visibility, stop and obtain separate authorization to enable GitHub private
vulnerability reporting or document another actionable private channel before calling the transition
complete.

### Sanitized owner operational disposition

The repository owner explicitly and independently approved the Private-to-Public transition on
2026-07-25. For this operational gate, that authorization records the owner's acceptance that the
following retained surfaces will become publicly visible and may be forked, copied, or cached:

- reachable commit identity metadata, including the category-only count of four machine-local
  `.local` author/committer metadata records;
- all 47 branches retained after the task branch push, the 43 closed pull-request conversations plus
  current Draft PR #53, and 2 open/7 closed issues;
- all 124 Actions runs present at the disposition checkpoint and their histories/logs, plus subsequent
  same-PR runs, the RC tag, Draft Release metadata, repository activity, and linked public surfaces.

The bounded review and sanitized sample found no credential, account secret, private endpoint, or
private key in those reviewed surfaces. This is an operational disposition based on the explicit
owner authorization, not legal advice, an identity claim, or proof that all history is exhaustively
risk-free. The records are retained: this transition performs no history rewrite, branch or
conversation deletion, archive, or hide action.

### Exact visibility effects and rollback/escalation boundary

Stage 1 opened only the read-only confirmation flow and stopped before the next acknowledgement. The
GitHub UI displayed exactly these effects:

- “The code will be visible to everyone who can visit https://github.com”
- “Anyone can fork your repository.”
- “All push rulesets will be disabled.”
- “Your changes will be published as activity.”
- “Actions history and logs will be visible to everyone.”

The UI also showed 0 stars and 0 watchers. No visibility acknowledgement or final confirmation was
pressed. Because the repository has no current ruleset or classic protection, the ruleset warning
does not remove an existing control, but branch protection remains an explicit post-transition
follow-up.

Rollback cannot retract already cloned, forked, cached, or copied material. If post-mutation
verification finds a credible secret or unsafe exposure, stop every further publication action, do
not delete branches/conversations or rewrite history, and escalate to the repository owner/security
review. Credential rotation/revocation, a Public-to-Private rollback, or history remediation each
requires a separately scoped decision based on the confirmed finding. The owner accepts this residual
irreversibility as a consequence of the already-authorized transition: changing visibility back to
Private later is containment/escalation only and cannot erase or recall clones, forks, caches, or
copies.

### Post-QA mutation and evidence gate

The Stage 1 correction turn performed no visibility mutation. It established this exact terminal
sequence:

1. The same independent QA task returns Stage 1 `PASS / EXECUTE`.
2. The controller sends an explicit post-QA continuation to this same implementation task.
3. Immediately before mutation, the implementation task re-fetches and requires exact current `main`
   `36d4205806597ae14b7306c74e1527c284202023`, successful exact-main CI, `Private` UI state, and the
   unchanged exposure baseline; otherwise it stops.
4. The same implementation task changes only GitHub visibility from Private to Public.
5. It verifies authenticated and unauthenticated GitHub surfaces, UI `Public`, default `main`, the
   exact baseline main commit and detected Apache-2.0, plus credential-free HTTPS read/clone without
   invoking a credential helper or persisting a clone.
6. It verifies all 47 branches, 43 closed PR conversations plus current Draft PR #53, 2 open/7 closed
   issues, Actions histories/logs including the 124-run disposition checkpoint and subsequent
   correction/evidence runs, the RC tag, Draft Release status/text/assets, and unchanged
   Pages/deployment/About state. It also verifies an actionable private vulnerability-reporting route
   for a public reporter or stops for separately authorized correction.
7. It adds only an evidence documentation commit on this same branch, normal-pushes it to this same
   Draft PR, and obtains exact-new-head PR CI `SUCCESS`.
8. The mutation/evidence continuation does not mark the PR Ready and does not merge. It returns the
   same Draft PR to the same independent QA task for narrow QA2.
9. The same QA task must return QA2 `PASS / MERGE`.
10. Only after an explicit post-QA2 publication continuation does this same implementation task mark
    PR #53 Ready and perform a normal merge commit; squash, rebase, force-push, branch deletion, and
    conversation archival/hiding remain prohibited.
11. It fetches and verifies the exact merge SHA, tree, ordered parents, `origin/main`, and default
    branch `main` all resolve to that normal merge, then requires exact merge-head main CI `SUCCESS`.
12. It finally verifies the repository remains `Public` and the task branch and PR conversation remain
    retained.

Artifact publication/distribution, tag/Release mutation, deployment, submission, live credential
entry, and every other repository setting remain outside this gate.

## Phase 8.4B Stage 2 Public evidence

The repository owner completed the authorized visibility change manually outside this agent. The
agent did not repeat or reverse the mutation. At 2026-07-26 04:48 ICT (2026-07-25 21:48 UTC), the
official signed-in in-app Browser and independent unsigned reads established this post-mutation state:

| Surface                     | Exact post-mutation evidence                                                                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity/default/visibility | `toannnnq1424/data-incident-investigator`; Settings says “This repository is currently public”; root shows `Public` and no `Private` badge; default branch remains `main`                                                         |
| Main/license/CI             | exact main `36d4205806597ae14b7306c74e1527c284202023`; Apache-2.0 README badge and canonical LICENSE readable; main CI run `30172556907` / job `89715980644` remains `SUCCESS`                                                    |
| Unsigned HTTP               | repository root, exact main commit, README, LICENSE, issues, pull requests, tags, Releases, and Actions each returned HTTP `200`; README and canonical Apache License content were readable                                       |
| Credential-free Git read    | `git ls-remote` with terminal prompts and credential helpers disabled returned exact `36d4205806597ae14b7306c74e1527c284202023` for `refs/heads/main`; no clone or credential was stored                                          |
| Branches and PRs            | all 47 branches retained; 1 open/43 closed pull requests; Draft PR #53 remains open, `Not ready`, conflict-free, unmerged, with its branch and conversation retained                                                              |
| Issues and Actions          | 2 open/7 closed issues retained; 125 workflow runs existed before the evidence push, including accepted run `30175050395`; histories/logs remain visible                                                                          |
| Tag/Release                 | one `v1.0.0-rc.1` tag retained at `c4e33f7af3707f604d35b1220a18e4e83f491be3`; Draft Release remains unpublished with zero user-uploaded assets and only two automatic source archives                                             |
| Pages/deployments           | Pages remains disabled with source `None`; no GitHub deployment was configured at this historical checkpoint. Phase 8.7 later added a separate external Cloud Run fixture deployment.                                             |
| Security reporting          | enabled at 2026-07-26 05:22 ICT; Settings shows `Disable private vulnerability reporting`, Security overview shows `Enabled`, and unsigned `/security` exposes `Report a vulnerability`; the report route requires GitHub sign-in |

No branch, conversation, issue, Actions history, tag, Release, or user-uploaded asset was deleted,
archived, hidden, or created by the visibility change. No unexpected owner/name/default-branch,
Pages, deployment, merge, branch-retention, or release-setting drift was observed. The authorized
QA2 security follow-up enabled only private vulnerability reporting; no other setting changed.

At the historical Phase 8.4B checkpoint, Public source access and the exact unsigned read evidence
made C10 `PASS`; C09 remained `PASS`, while C11 and Phase 8.2 remained `PARTIAL`. Phase 8.5 later
closed the technical bundled-output attribution gap and merged through PR #54; Phase 8.6 later
recorded the qualified owner disposition. Public visibility alone did not and still does not claim a
deployment, video, Devpost submission, published Release, or blanket legally approved distributable
artifact.

The residual exposure remains irreversible: a later visibility rollback cannot recall forks, clones,
caches, or copies. Any rollback would be containment/escalation, not erasure.

Phase 8.4B is now complete through normal merge
`1c32f6c913b196fc4a23055fb7da3b1482b94e5e`, tree
`5c83d034f30c6d31268109277aaa455a05ff9656`, with ordered parents
`36d4205806597ae14b7306c74e1527c284202023` then
`e4ddbb8277f430ed1da4593c9f19ca89f1aa39fb`. Exact-main CI run `30178465331`, job
`89731006555`, is `SUCCESS`. GitHub remains `Public`; private vulnerability reporting remains
enabled; the Phase 8.4B branch and PR #53 conversation remain retained. C10 remains `PASS` as a
preservation/reverification result. No Phase 8.5 work reopens or repeats that completed mutation.

## Audited baseline and method

The audit started from fetched `origin/main`
`7f05888ce7266f51b5028f5ac5ddacd3a91a11aa`, tree
`063fc69dcde037dd3ec99bce671561d8fc26d235`, with ordered parents
`8144fb19a6daf2670c4143b005b5e1aea25c138a` then
`aa8d120205fdc35298b9ef36c7dd36b38b23e342`. Exact main CI run `30161661962`, job
`89687850631`, was `SUCCESS`.

The current-tree and history audit was read-only and bounded to this baseline, all locally reachable
Git refs, existing manifests, `pnpm-lock.yaml`, and installed-package metadata. It traversed 127
reachable commits, 119 local refs, and 728 unique historical blobs. It did not install or upgrade
dependencies, use a network scanner, inspect GitHub Actions secret values, rewrite history, delete
files, purge data, or rotate credentials.

Dedicated secret-scanner executables were not present. The fallback was a bounded detector set over
all unique reachable text blobs and commit messages for private-key blocks, common cloud/service
tokens, high-entropy credential assignments, authorization/cookie forms, embedded URL credentials,
environment files, internal endpoints, unsafe logging, email-like personal identifiers, and
machine-specific paths. Candidate values were never printed or copied. Findings below contain only a
detector class, path/first commit/date where useful, and non-reversible fingerprints.

## Current tree and reachable-history audit

The counts in this section describe the exact audited main baseline before this documentation-only
branch added its decision packet.

| Audit surface                                    | Sanitized result                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Current tracked/untracked/ignored                | 123 tracked files; 0 untracked; 0 ignored                                                                   |
| Current tracked blobs                            | 123 blobs, 2,286,253 total bytes; no blob over 1 MiB                                                        |
| Reachable history                                | 127 commits; 728 unique blobs; 36,184,914 total historical blob bytes; no blob over 1 MiB                   |
| Ref coverage                                     | 119 local refs: 45 heads, 45 remotes including the symbolic remote head, 1 tag, and remaining worktree refs |
| Binary/archive/executable/media                  | 0 current or historical binary-diff records; no matching archive, executable, or media path                 |
| LFS                                              | 0 tracked LFS files and 0 reachable LFS pointer blobs                                                       |
| Submodules/links                                 | no `.gitmodules`; 0 current or historical submodule/symlink modes                                           |
| Windows filesystem links                         | 0 reparse points under the worktree                                                                         |
| Generated/junk residue                           | 0 tracked generated/junk paths; 0 generated/junk roots; no editor or OS residue                             |
| Environment files                                | `.env.example` only; no tracked environment value file                                                      |
| Standard credential/private-key detectors        | 0 credible matches                                                                                          |
| Unsafe log detectors                             | 0 matches                                                                                                   |
| Commit-message credential/machine-path detectors | 0 matches                                                                                                   |

### Sanitized candidate disposition

- Three `Bearer`-literal detector records are synthetic authorization assertion fixtures, not
  credentials. They are in `tests/integration/datahub-lineage.test.ts` (first commit
  `a5339fbaca1c`, 2026-07-18), `tests/integration/datahub-recent-changes.test.ts` (first commit
  `9afc729bbe92`, 2026-07-19), and `tests/integration/datahub-search.test.ts` (first commit
  `65657aa7d06a`, 2026-07-18). All share the non-reversible fingerprint
  `sha256:a2a8d30e3177e205` and are asserted test input.
- Generic secret-like assignments and embedded-credential URLs found in documentation and tests are
  placeholders or explicit redaction vectors. The entropy candidates in
  `tests/integration/markdown-export.test.ts` are paired with redaction/absence assertions; their
  first reachable commits are within `35f460`, `c9e255`, `4bd4`, and `eeb339`. No candidate was
  treated as a live credential.
- Loopback endpoints occur in 17 path records, 13 of them in the current tree, for documented
  local-development or test behavior. The only private/internal-endpoint detector record is a
  synthetic health-readiness test in `tests/integration/health-readiness.test.ts`, fingerprint
  `sha256:c9f929dafa17a41f`.
- The file-content email detector returned 15 records: 2 synthetic `example.invalid` fixtures in
  `tests/integration/datahub-health.test.ts` and `tests/integration/datahub-mcp.test.ts`, sharing
  fingerprint `sha256:b838307aa1c7bc01`; 11 placeholders on reserved example domains; and 2
  already-published public-contact references. None is a credential or private address. No detected
  value is reproduced here.
- Reachable author/committer metadata contains three distinct email fingerprints: GitHub-hosted
  domain `github.com`, fingerprint `sha256:3c205d8fc749f729`, first at `c020a4c05652` on 2026-07-18
  (41 records); a machine-local `.local` domain, fingerprint `sha256:6ea35c6bf9a0eb3c`, first at
  `34e5bb5a3bc9` on 2026-07-18 (4 records); and GitHub no-reply metadata, fingerprint
  `sha256:1878a199025ee7c6`, present from the initial commit (209 records). The `.local` metadata is not
  a credential, but it is a personal/machine provenance footprint requiring owner review before
  Public visibility.

No credible credential or private key was found, so the mandatory stop condition was not triggered.
This bounded result is not a guarantee that future manual review or a dedicated offline scanner will
find nothing. If any candidate is later validated as real, stop publication, decide rotation and
revocation first, then separately choose between leaving auditable history intact and an explicitly
authorized history-rewrite/purge plan. This packet authorizes neither remediation path.

## Production dependency and third-party license inventory

The repository has one root and six private workspace manifests: 7 importers in total. `pnpm list -r
--prod --depth Infinity --json` resolved 138 distinct external package-version nodes, representing 132
distinct package names. The root has no production dependency. Internal workspace links were
traversed but are not double-counted as third-party packages.

| Importer              | Direct production inputs                                                   | External production closure |
| --------------------- | -------------------------------------------------------------------------- | --------------------------: |
| root                  | none                                                                       |                           0 |
| `@dii/api`            | `fastify@5.10.0` plus internal workspaces                                  |                         135 |
| `@dii/web`            | `react@19.2.7`, `react-dom@19.2.7` plus internal workspaces                |                           4 |
| `@dii/shared-types`   | `zod@4.4.3`                                                                |                           1 |
| `@dii/datahub-client` | `@modelcontextprotocol/sdk@1.29.0`, `zod@4.4.3` plus an internal workspace |                          92 |
| `@dii/agent-core`     | internal workspaces                                                        |                          92 |
| `@dii/evaluation`     | an internal workspace                                                      |                           1 |

The exact direct subclosures are `fastify@5.10.0`: 49 nodes;
`@modelcontextprotocol/sdk@1.29.0`: 92 nodes; `zod@4.4.3`: 1 node;
`react@19.2.7`: 1 node; and `react-dom@19.2.7`: 3 nodes. Shared transitives explain why importer
closure counts do not sum to the 138-node union.

The implementation worktree has no `node_modules`, so the first pass could not read package metadata.
Independent QA reproduced the inventory from an existing offline QA-worktree installed graph. Its
repository `pnpm-lock.yaml` and `node_modules/.pnpm/lock.yaml` both have SHA-256
`e36baa3fe1899c4f58cc66eeeaea279601e5be271690b6fa215273740e4ac107`, matching this branch's
repository lock. The reproduction used no install, registry, or network access.

Exact frozen-graph evidence:

- 138/138 package-version nodes declare license metadata: 122 MIT, 10 ISC, 5 BSD-3-Clause, and 1
  BSD-2-Clause.
- 137/138 package directories contain a top-level `LICENSE`, `LICENCE`, or `COPYING` file.
  `abstract-logging@2.0.1` declares MIT but has no such legal file.
- 0/138 package directories contain a top-level `NOTICE` file.
- `@modelcontextprotocol/sdk@1.29.0` declares MIT and contains `LICENSE`; it has no `NOTICE`.

These are package declarations and legal-file-presence facts, not legal approval or proof of
Apache-2.0 compatibility. Compatibility, the meaning and completeness of each legal text, attribution/
NOTICE obligations, and project relicensing authority remain `UNRESOLVED`. A later authorized
legal-readiness task must review package-specific texts and provenance, resolve the missing
`abstract-logging@2.0.1` legal file, and determine required attribution before approval. Zero observed
package NOTICE files does not prove that no notice or attribution is required.

<details>
<summary>Exact sorted 138-node external production closure</summary>

```text
@fastify/ajv-compiler@4.0.5
@fastify/error@4.2.0
@fastify/fast-json-stringify-compiler@5.1.0
@fastify/forwarded@3.0.1
@fastify/merge-json-schemas@0.2.1
@fastify/proxy-addr@5.1.0
@hono/node-server@2.0.10
@modelcontextprotocol/sdk@1.29.0
@pinojs/redact@0.4.0
abstract-logging@2.0.1
accepts@2.0.0
ajv@8.20.0
ajv-formats@3.0.1
atomic-sleep@1.0.0
avvio@9.3.0
body-parser@2.3.0
bytes@3.1.2
call-bind-apply-helpers@1.0.2
call-bound@1.0.4
content-disposition@1.1.0
content-type@1.0.5
content-type@2.0.0
cookie@0.7.2
cookie@1.1.1
cookie-signature@1.2.2
cors@2.8.6
cross-spawn@7.0.6
debug@4.4.3
depd@2.0.0
dequal@2.0.3
dunder-proto@1.0.1
ee-first@1.1.1
encodeurl@2.0.0
escape-html@1.0.3
es-define-property@1.0.1
es-errors@1.3.0
es-object-atoms@1.1.2
etag@1.8.1
eventsource@3.0.7
eventsource-parser@3.1.0
express@5.2.1
express-rate-limit@8.6.0
fast-decode-uri-component@1.0.1
fast-deep-equal@3.1.3
fastify@5.10.0
fast-json-stringify@7.0.1
fastq@1.20.1
fast-querystring@1.1.2
fast-uri@3.1.4
fast-uri@4.1.1
finalhandler@2.1.1
find-my-way@9.6.0
forwarded@0.2.0
fresh@2.0.0
function-bind@1.1.2
get-intrinsic@1.3.0
get-proto@1.0.1
gopd@1.2.0
hasown@2.0.4
has-symbols@1.1.0
hono@4.12.31
http-errors@2.0.1
iconv-lite@0.7.3
inherits@2.0.4
ipaddr.js@1.9.1
ipaddr.js@2.4.0
ip-address@10.2.0
isexe@2.0.0
is-promise@4.0.0
jose@6.2.4
json-schema-ref-resolver@3.0.0
json-schema-traverse@1.0.0
json-schema-typed@8.0.2
light-my-request@6.6.0
math-intrinsics@1.1.0
media-typer@1.1.0
merge-descriptors@2.0.0
mime-db@1.54.0
mime-types@3.0.2
ms@2.1.3
negotiator@1.0.0
object-assign@4.1.1
object-inspect@1.13.4
once@1.4.0
on-exit-leak-free@2.1.2
on-finished@2.4.1
parseurl@1.3.3
path-key@3.1.1
path-to-regexp@8.4.2
pino@10.3.1
pino-abstract-transport@3.0.0
pino-std-serializers@7.1.0
pkce-challenge@5.0.1
process-warning@4.0.1
process-warning@5.0.0
proxy-addr@2.0.7
qs@6.15.3
quick-format-unescaped@4.0.4
range-parser@1.3.0
raw-body@3.0.2
react@19.2.7
react-dom@19.2.7
real-require@0.2.0
real-require@1.0.0
require-from-string@2.0.2
ret@0.5.0
reusify@1.1.0
rfdc@1.4.1
router@2.2.0
safer-buffer@2.1.2
safe-regex2@5.1.1
safe-stable-stringify@2.5.0
scheduler@0.27.0
secure-json-parse@4.1.0
semver@7.8.5
send@1.2.1
serve-static@2.2.1
set-cookie-parser@2.7.2
setprototypeof@1.2.0
shebang-command@2.0.0
shebang-regex@3.0.0
side-channel@1.1.1
side-channel-list@1.0.1
side-channel-map@1.0.1
side-channel-weakmap@1.0.2
sonic-boom@4.2.1
split2@4.2.0
statuses@2.0.2
thread-stream@4.2.0
toad-cache@3.7.4
toidentifier@1.0.1
type-is@2.1.0
unpipe@1.0.0
vary@1.1.2
which@2.0.2
wrappy@1.0.2
zod@4.4.3
zod-to-json-schema@3.25.2
```

</details>

The Apache Software Foundation's third-party policy classifies licenses for ASF projects, not this
project. Its Category A/B/X groupings are useful only as a conservative triage model; they do not
replace package-specific evidence or counsel. Even commonly permissive dependencies may require
retained notices or attribution.

## Historical Phase 8.3 GitHub public-exposure inventory

The official signed-in in-app Browser showed the following repository state at
2026-07-25 22:00 ICT (2026-07-25 15:00 UTC):

| Surface                      | Current state                                                                                                                | Required pre-public review                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Visibility/license detection | `Private`; GitHub main detects MIT before the Phase 8.4A branch is merged                                                    | Keep Private; verify Apache-2.0 detection on integrated main before the separate Phase 8.4B action    |
| Branches                     | 44 branches across three branch-list pages                                                                                   | Review branch names and all branch-only content                                                       |
| Tags                         | one tag, `v1.0.0-rc.1`, target `c4e33f7af3707f604d35b1220a18e4e83f491be3`                                                    | Review tag metadata and target content                                                                |
| Releases/assets              | one unpublished Draft `v1.0.0-rc.1` at the same target; 0 uploaded assets; UI lists GitHub-generated source zip/tar archives | Confirm Draft behavior and all release text before visibility change; do not publish                  |
| Pull requests                | 0 open; 41 closed                                                                                                            | Review closed conversations, reviews, checks, and linked metadata                                     |
| Issues                       | 2 open and 7 closed                                                                                                          | Review issue bodies, comments, attachments, links, and identities                                     |
| Actions                      | 117 workflow runs; CI, PR CI, and Release validation workflows                                                               | Review logs, summaries, annotations, artifacts, caches, and attestations; never inspect secret values |

GitHub's visibility documentation states that changing Private to Public makes code visible to
everyone, permits public forks, makes Actions history and logs visible, publishes the change as
activity, disables push rulesets, and erases stars/watchers. Existing private forks are detached into
a private network. Those consequences require a repository-owner review; this packet does not press
the visibility control.

The bounded Browser inventory did not open Actions secret settings or reveal secret values. It also
does not prove that every comment, attachment, deleted reference, artifact, cache, or external link is
safe. Before Public authorization, an owner must manually review the 44 branch surfaces, 41 closed
PRs, 9 issues, 117 Actions runs and related artifacts/metadata, the tag, the Draft Release, commit
identities, repository About metadata, and repository-linked external resources.

## Apache-2.0 migration impact map

Phase 8.4A applies the authorized source-level migration as one reviewable change. Integration and
GitHub detection remain pending.

| Target                                                                              | Phase 8.4A treatment                                                                                            |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `LICENSE`                                                                           | Replaced with byte-verified unmodified canonical Apache License 2.0 text                                        |
| root plus six workspace `package.json` files                                        | Exact SPDX `Apache-2.0`; versions and `private: true` unchanged                                                 |
| `README.md`                                                                         | Apache-2.0 badge, text, and relative link                                                                       |
| `docs/REPOSITORY_MAP.md`                                                            | Apache-2.0 root-license and manifest state                                                                      |
| `docs/DEVPOST_REQUIREMENTS.md`, `docs/KNOWN_ISSUES.md`, `docs/RELEASE_CHECKLIST.md` | Draft transition recorded without claiming main integration                                                     |
| `docs/DEPLOYMENT.md`                                                                | Unchanged in this docs-only correction; its contract already says the archive includes complete `apps/web/dist` |
| `docs/VERSIONING.md` and `CHANGELOG.md`                                             | Relicense boundary recorded without changing the current RC                                                     |
| `CONTRIBUTING.md`                                                                   | Apache-2.0 section 5 default submission terms and retained third-party notice duty                              |
| source files                                                                        | No mass headers added; existing provenance/notices are preserved                                                |
| release artifact builder/verifier/tests                                             | Unchanged now; update only after the bundled-output audit identifies traceable required attributions            |
| release artifact and sidecar                                                        | Not rebuilt; publication/distribution is blocked until the bundled-output attribution gate passes               |
| GitHub repository metadata                                                          | Verify detected Apache-2.0 on integrated main; visibility remains a separate Phase 8.4B action                  |
| `pnpm-lock.yaml`                                                                    | Required to remain byte-identical at SHA-256 `e36baa3fe1899c4f58cc66eeeaea279601e5be271690b6fa215273740e4ac107` |

### NOTICE, attribution, and provenance decision

The project has no `NOTICE` or third-party attribution file in the current tree or reachable path
history. Apache-2.0 section 4 requires distributions to carry the license and retain applicable
copyright, patent, trademark, and attribution notices. Section 4(d) applies when the distributed Work
already includes NOTICE material; informational NOTICE content does not modify the license.

Phase 8.4A does not add a generic project `NOTICE`. The exact frozen graph contains 0 dependency
NOTICE files, but that fact does not settle MIT, ISC, or BSD copyright/permission-notice obligations
for code embedded in a distributed bundle. The release archive does not copy the `node_modules`
directory, yet it does include complete `apps/web/dist`. The web package runs `vite build`, its entry
imports React and ReactDOM, and its Vite configuration does not externalize them. The
[official Vite production-build guide](https://vite.dev/guide/build) states that the default build
produces an application bundle for static hosting. `pnpm-lock.yaml` resolves React and ReactDOM
`19.2.7`; the frozen legal-file evidence records MIT legal files for both. These facts establish an
attribution-review boundary, not a complete inventory of packages actually embedded in the exact
output.

Phase 8.5 supplies that scoped technical evidence and enforcement without adding a generic project
`NOTICE`, invented holder, invented year, compatibility conclusion, or unverified dependency list.
The residual legal-owner decision remains separate from the engineering proof below.

### Phase 8.5 exact rendered-module and legal-file evidence

The release-only Vite plugin records every output chunk module and its rendered length. The builder
requires the installed pnpm lock to byte-match repository `pnpm-lock.yaml`, rejects unknown virtual
modules and potential zero-rendered non-JavaScript asset contributions, and maps each positive
third-party contribution to its exact installed package, module source hash, package-manifest hash,
declared licence metadata, and top-level licence/NOTICE files. First-party workspace modules and
zero-rendered JavaScript are excluded from the embedded-code claim.

The exact web audit identifies one JavaScript output,
`apps/web/dist/assets/index-DHLGe_T9.js`, with these five package identities:

| Embedded package   | Declared metadata | Upstream legal file | Legal-file SHA-256                                                 |
| ------------------ | ----------------- | ------------------- | ------------------------------------------------------------------ |
| `react@19.2.7`     | MIT               | `LICENSE`           | `da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93` |
| `react-dom@19.2.7` | MIT               | `LICENSE`           | `da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93` |
| `scheduler@0.27.0` | MIT               | `LICENSE`           | `da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93` |
| `vite@7.3.6`       | MIT               | `LICENSE.md`        | `a77a1c089806b39ad339535bdf3677f636c91d96693e8ad7b11fe733f650ea64` |
| `zod@4.4.3`        | MIT               | `LICENSE`           | `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8` |

Vite appears because its module-preload polyfill contributes 1,168 rendered bytes at runtime; it is
not omitted merely because Vite is a build dependency. None of the five installed package roots has
a top-level NOTICE file. The manifest retains the exact normalized contributing module/output paths,
rendered-byte counts, source hashes, package-manifest paths/hashes, legal-file paths/hashes, and
upstream legal text. Deterministic `THIRD_PARTY_NOTICES.txt` reproduces that evidence. Manifest schema
v3 binds each package to its exact pnpm lock package/snapshot and canonical virtual-store root. The
standalone verifier independently reconstructs that identity from the archived lockfile, requires
the notice byte-for-byte for both archive and extracted-tree verification, and rejects missing,
extra, reordered, malformed, unsafe, cross-root, linked, or tampered evidence. Shared Windows-safe
path validation and rollback-safe archive/sidecar writes are engineering controls, not legal advice.

`abstract-logging@2.0.1` has no positive rendered-module contribution. The API TypeScript output
preserves external imports and the archive excludes `node_modules`, so this package is not embedded
or distributed in the archive and its absent legal file is not inserted into the bundled notice. It
still remains a broader production-install and C11 legal-owner caveat. The five declared MIT values
and reproduced texts are package evidence, not a legal compatibility ruling, authorization decision,
or legal advice.

### Relicensing authority is separate from dependency compatibility

Apache-2.0 defines the licensor as the copyright owner or an entity authorized by that owner. Git
history, repository admin permission, a merged PR, and the prior MIT grant do not by themselves prove
that the operator may relicense every project-owned contribution. Phase 8.4A records the user's
explicit 2026-07-25 project-owner authorization together with sanitized provenance counts. It does
not independently verify legal identity or title and is not legal advice.

Separately, every production dependency must have compatible license and notice handling. Resolving
dependency compatibility does not establish the right to relicense project-owned code, and owner
authority does not resolve dependency obligations.

## Phase 8.6 owner zero-cost rights disposition (historical cost policy)

On 2026-07-26, the repository owner authorized proceeding only when no fee is incurred. No purchase,
paid subscription, metered overage, paid or larger runner, paid storage/package/domain/hosting,
paid DataHub Cloud/API, or other billable service may be enabled. A provider requiring a payment
card may be considered only for a genuinely free trial/free tier. This is not blanket authorization
to create an account, accept billing terms, enter/store a card, start a trial, incur a verification
charge/hold, or allow auto-conversion. Before any such action, the provider-specific ten-field
control packet in [`DEPLOYMENT.md`](DEPLOYMENT.md) and fresh explicit owner approval are mandatory.
The owner controls/performs any sensitive card entry; agents never request, read, type, copy, log,
screenshot, or store card number, CVV, or billing credentials.

Later in Phase 8.7, the owner explicitly superseded only the zero-fee/no-overage hosting policy,
accepted the residual Google Cloud Paid-account risk, and authorized the exact project, billing, API,
source-build, and fixture deployment actions recorded in [`DEPLOYMENT.md`](DEPLOYMENT.md). That
operational approval does not expand data rights, authorize secrets/live DataHub/model APIs, provide
blanket legal clearance, or make budgets/max instances a hard spending cap.

Card-free, non-expiring tiers remain preferred. A card-required trial is eligible only if current
official evidence establishes no unavoidable fee and a reliable pre-charge cancellation path. Any
unavoidable or non-refundable charge, mandatory paid plan, unclear price, uncontrollable
auto-conversion, or inability to enforce zero spend is `REJECT`. If a later provider is approved, a
reminder/automation must be created before the buffered safe cancellation deadline; none is created
in this preflight because no provider is selected or approved.

Within that fail-closed cost boundary, the owner records this operational disposition:

1. **Exact artifact distribution.** Distribution is owner-authorized only for the exact Phase 8.5
   artifact contract when deterministic `THIRD_PARTY_NOTICES.txt`, manifest schema v3, and standalone
   verifier enforcement are present and pass. The embedded runtime set is exactly
   `react@19.2.7`, `react-dom@19.2.7`, `scheduler@0.27.0`, `vite@7.3.6`, and `zod@4.4.3`; each is
   recorded as MIT-declared with captured legal evidence. The broader frozen graph retains its
   recorded MIT/ISC/BSD-3-Clause/BSD-2-Clause declarations and required notices/conditions.
   `abstract-logging@2.0.1` remains a declared-MIT package-metadata caveat with no packaged legal
   file: it has zero rendered contribution, `node_modules` is excluded, and its code must not be
   represented as embedded or distributed. This is a documented caveat, not a legal conclusion.
2. **Data.** Public demos and artifacts may contain only checked-in synthetic/fixture data,
   project-owned or generated reports/assets, and metadata the operator is authorized to expose.
   Production, customer, confidential, PII, proprietary metadata, credentials, and unauthorized
   screenshots/logs must not be used, uploaded, recorded, or redistributed.
3. **DataHub and APIs.** Fixture mode is authorized and credential-free. Live access is authorized
   only to an operator-owned/authorized DataHub OSS or self-controlled instance, or a
   challenge-provided endpoint whose permitted use covers this demo. Paid DataHub Cloud/API,
   unauthorized public-demo scraping, and third-party credentials are prohibited. `DATAHUB_TOKEN`
   remains operator-supplied, least-privilege, secret, and never committed or logged. DataHub OSS
   source and the official MCP server are recorded as Apache-2.0; those source terms do not grant
   access to an instance or its metadata, so separate instance/data-owner authorization remains
   mandatory.
4. **GitHub and hosting.** Historically, only the Public GitHub repository, standard GitHub-hosted
   runners for the Public repository, and a genuinely free Pages/hosting tier were authorized.
   Phase 8.7 later consumed the separate owner risk acceptance for the exact Google Cloud fixture
   deployment. Larger runners, paid Actions/storage/packages/Codespaces, a paid domain, and unrelated
   paid hosting remain unauthorized.
5. **No model fee.** The current deterministic product makes no LLM/OpenAI API call.
   `OPENAI_API_KEY` remains unnecessary and must not be introduced by this disposition.

The C11 release-artifact gate therefore moves from `PARTIAL/BLOCKED` to
`QUALIFIED PASS — OWNER-AUTHORIZED SCOPE`: Phase 8.5 technical attribution is `PASS`, and the owner
authorizes zero-cost distribution only inside the exact artifact/data/API boundary above. This does
not resolve entrant/contributor ownership attestations under C12, authorize arbitrary data or
endpoints, approve a paid service, or permit this slice to publish, attach, upload, deploy, or submit
anything. Those actions retain their own gates.

## Independent human decision checklist

- [x] **Authorize Apache-2.0 project relicense.** Explicitly approved by the user on 2026-07-25 and
      consumed only by Phase 8.4A.
- [x] **Authorize GitHub repository Public visibility.** Explicitly approved independently by the
      user on 2026-07-25; reserved and not consumed by Phase 8.4A.

The approvals are independent. Phase 8.4B consumed the Public authorization and completed through the
normal merge recorded above; its branch and PR conversation remain retained. PR #54 is the historical
Phase 8.5 artifact-enforcement work and is merged through historical main
`73172b7e8e8b02ab9629019eac298b89e02895c2`. PR #55 is the merged historical Phase 8.6
rights/deployment preflight. Current main is
`c7abc652c23b532e90091b377490b27eadd7e084`, tree
`66e90eae74c7065c62a30a14ffeb25ef26974ea4`; Draft PR #56 is the current Phase 8.7 review. The
owner's separate explicit instructions—not the PR itself—authorized the exact external Google Cloud
mutations now recorded. No additional external mutation is implied.

## Residual blockers and next evidence

1. Apache-2.0 is integrated on exact `main`, exact-main CI is successful, and GitHub detects the
   license. C09 is `PASS`; no license mutation remains in Phase 8.4B.
2. All 138 external production package-version nodes have declared-license metadata, and 137 have a
   legal file. Phase 8.5 closes the verified RC archive's technical bundle audit/enforcement gap for
   the exact five embedded packages and proves `abstract-logging@2.0.1` is not embedded in that
   archive. The separate Cloud Run source-built container installs runtime dependencies and is not
   the verified RC archive; the missing packaged legal file therefore remains a
   production-container caveat. C11 stays `QUALIFIED PASS — OWNER-AUTHORIZED SCOPE`, and no blanket
   legal conclusion is claimed.
3. GitHub is `Public`. Authenticated and unsigned access, the completed Phase 8.4B normal merge, and
   exact-main CI make C10 `PASS`; preserve and reverify that state through later work.
4. Phase 8.2 remains `PARTIAL` pending live/judge DataHub credentials and validation; this packet does
   not change that independent readiness condition.
5. The prior private-reporting blocker is closed. At 2026-07-26 05:22 ICT
   (2026-07-25 22:22 UTC), Settings showed the reporting control as `Disable`, proving enabled state.
   Security overview showed `Private vulnerability reporting • Enabled`, and an unsigned `/security`
   read exposed `Report a vulnerability`. The exact report route redirects unsigned users to GitHub
   sign-in, so a GitHub account is required and anonymous submission is not claimed. No non-maintainer
   account was used; public issues remain prohibited for vulnerability details.

## Primary official references

GitHub sources were accessed 2026-07-25 22:00 ICT (2026-07-25 15:00 UTC). The canonical Apache text
and NOTICE condition were rechecked 2026-07-25 23:54 ICT (2026-07-25 16:54 UTC):

- [GitHub: Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: Privately reporting a security vulnerability](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
- [GitHub: Adding a license to a repository](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)
- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Apache Software Foundation: Applying the Apache license, version 2.0](https://www.apache.org/legal/apply-license.html)
- [Apache Software Foundation: Third-party license policy](https://www.apache.org/legal/resolved.html)
- [Vite: Building for Production](https://vite.dev/guide/build)
- [DataHub OSS repository and Apache-2.0 licence](https://github.com/datahub-project/datahub)
- [Official DataHub MCP Server repository and Apache-2.0 licence](https://github.com/acryldata/mcp-server-datahub)
- [DataHub MCP Server: managed and self-hosted boundaries](https://docs.datahub.com/docs/features/feature-guides/mcp)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Pages: static hosting and plan availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

The Phase 8.6 additions above were accessed on 2026-07-26. They support only the recorded source-
licence, service/API boundary, and GitHub cost/hosting facts; owner/data permission is supplied by the
separate operational disposition, not inferred from those pages.
