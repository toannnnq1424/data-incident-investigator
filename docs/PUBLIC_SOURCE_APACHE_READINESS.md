# Public-source and Apache-2.0 readiness decision packet

Status: `PHASE 8.4A IMPLEMENTED LOCALLY`; Draft PR QA, merge, and exact-main CI are pending.

This document prepares two independent decisions for Data Incident Investigator:

1. whether the project may be relicensed from MIT to Apache-2.0; and
2. whether the GitHub repository may be changed from Private to Public.

The user explicitly approved both decisions independently on 2026-07-25. Phase 8.4A consumes only the
first approval. It replaces the project licence and metadata on a Draft branch while keeping the
repository Private. The second approval is reserved for Phase 8.4B only after independent QA, normal
merge, and exact-main CI success for this change. Ordinary merge does not authorize or perform the
visibility mutation.

This is an engineering and review record, not legal advice. Phase 8.4A does not change GitHub
visibility or About metadata, tags, Releases, release assets, deployment, credentials, submission
state, runtime, dependencies, or versions.

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

## Read-only GitHub public-exposure inventory

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
| `docs/DEPLOYMENT.md`                                                                | Unchanged because the artifact already includes `LICENSE` and no `NOTICE` is justified                          |
| `docs/VERSIONING.md` and `CHANGELOG.md`                                             | Relicense boundary recorded without changing the current RC                                                     |
| `CONTRIBUTING.md`                                                                   | Apache-2.0 section 5 default submission terms and retained third-party notice duty                              |
| source files                                                                        | No mass headers added; existing provenance/notices are preserved                                                |
| release artifact builder/verifier/tests                                             | Unchanged because `LICENSE` is already mandatory and no attribution file is added                               |
| release artifact and sidecar                                                        | Not rebuilt; future release validation must package the exact integrated Apache `LICENSE`                       |
| GitHub repository metadata                                                          | Verify detected Apache-2.0 on integrated main; visibility remains a separate Phase 8.4B action                  |
| `pnpm-lock.yaml`                                                                    | Required to remain byte-identical at SHA-256 `e36baa3fe1899c4f58cc66eeeaea279601e5be271690b6fa215273740e4ac107` |

### NOTICE, attribution, and provenance decision

The project has no `NOTICE` or third-party attribution file in the current tree or reachable path
history. Apache-2.0 section 4 requires distributions to carry the license and retain applicable
copyright, patent, trademark, and attribution notices. Section 4(d) applies when the distributed Work
already includes NOTICE material; informational NOTICE content does not modify the license.

Phase 8.4A does not add a project `NOTICE`. The exact frozen graph contains 0 dependency NOTICE files,
and neither the source repository nor its deterministic release artifact vendors or bundles
`node_modules`; the artifact carries manifests and lockfile and performs a separate production
install. Adding an invented holder, year, or generic dependency list would not create reliable
attribution evidence. The existing artifact already requires `LICENSE`, so its allowlist needs no
change.

This decision does not erase the missing `abstract-logging@2.0.1` legal file or turn declared
metadata into legal approval. C11 remains `PARTIAL`. Before any future vendoring, dependency bundling,
binary distribution, or inclusion of a package with NOTICE material, review the exact distributed
files and package-specific obligations and add only traceable required notices. Preserve every
upstream copyright, patent, trademark, attribution, and licence record; never delete vendored
provenance to simplify packaging.

### Relicensing authority is separate from dependency compatibility

Apache-2.0 defines the licensor as the copyright owner or an entity authorized by that owner. Git
history, repository admin permission, a merged PR, and the prior MIT grant do not by themselves prove
that the operator may relicense every project-owned contribution. Phase 8.4A records the user's
explicit 2026-07-25 project-owner authorization together with sanitized provenance counts. It does
not independently verify legal identity or title and is not legal advice.

Separately, every production dependency must have compatible license and notice handling. Resolving
dependency compatibility does not establish the right to relicense project-owned code, and owner
authority does not resolve dependency obligations.

## Independent human decision checklist

- [x] **Authorize Apache-2.0 project relicense.** Explicitly approved by the user on 2026-07-25 and
      consumed only by Phase 8.4A.
- [x] **Authorize GitHub repository Public visibility.** Explicitly approved independently by the
      user on 2026-07-25; reserved and not consumed by Phase 8.4A.

The approvals are independent. This Draft PR must remain Draft and unmerged for independent QA.
Merging it does not press the visibility control or authorize any other external mutation.

## Residual blockers and next evidence

1. The Apache change is only on a Draft branch. Independent QA, normal merge, exact-main CI success,
   and GitHub detected-license verification are still required before the Apache compliance row may
   leave `OPEN`.
2. All 138 external production package-version nodes have declared-license metadata, and 137 have a
   legal file. `abstract-logging@2.0.1` lacks a legal file. This does not block the current
   non-vendoring source relicense, but C11 stays `PARTIAL` and future bundled distribution requires a
   new package-specific review.
3. GitHub visibility remains `Private`. The separately approved Public transition is reserved for
   Phase 8.4B; it is not performed by this branch, its merge, or ordinary repository permission.
4. Phase 8.2 remains `PARTIAL` pending live/judge DataHub credentials and validation; this packet does
   not change that independent readiness condition.

## Primary official references

GitHub sources were accessed 2026-07-25 22:00 ICT (2026-07-25 15:00 UTC). The canonical Apache text
and NOTICE condition were rechecked 2026-07-25 23:54 ICT (2026-07-25 16:54 UTC):

- [GitHub: Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: Adding a license to a repository](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)
- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Apache Software Foundation: Applying the Apache license, version 2.0](https://www.apache.org/legal/apply-license.html)
- [Apache Software Foundation: Third-party license policy](https://www.apache.org/legal/resolved.html)
