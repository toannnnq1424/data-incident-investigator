# Public-source and Apache-2.0 readiness decision packet

Status: `READY FOR INDEPENDENT QA`; neither decision in this packet is authorized.

This document prepares two independent decisions for Data Incident Investigator:

1. whether the project may be relicensed from MIT to Apache-2.0; and
2. whether the GitHub repository may be changed from Private to Public.

It is an engineering and review record, not legal advice. This slice did not change repository
visibility, `LICENSE`, package/workspace license metadata, README license claims, GitHub About
metadata, tags, Releases, release assets, deployment, credentials, or submission state. Ordinary
GitHub permission, approval of this Draft PR, or approval of one decision below does not grant the
other decision.

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
- The only file-content email-like records use the reserved `example.invalid` domain in
  `tests/integration/datahub-health.test.ts` and `tests/integration/datahub-mcp.test.ts`; they share
  the synthetic fingerprint `sha256:b838307aa1c7bc01`.
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

The repository has one root and six private workspace manifests. `pnpm list -r --prod --depth
Infinity --json` resolved 138 distinct external package-version nodes, representing 132 distinct
package names. The root has no production dependency. Internal workspace links were traversed but are
not double-counted as third-party packages.

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

There is no `node_modules` directory in the workspace, and `pnpm-lock.yaml` contains no `license`
fields. Read-only `pnpm licenses list --prod --json` cannot complete without the missing local pnpm
package-index metadata and reports `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE`. No install or network
fallback was allowed. Therefore every external node below, including
`@modelcontextprotocol/sdk@1.29.0`, is conservatively classified:

- license evidence: `UNKNOWN` under the allowed local evidence;
- Apache-2.0 compatibility: `UNRESOLVED`;
- attribution/NOTICE obligation: `UNKNOWN`;
- approval status: not legal approval and not sufficient to authorize relicensing.

Earlier project text describing the MCP SDK as MIT-licensed is not treated as local dependency-license
evidence in this packet. A later authorized legal-readiness task must obtain package-specific
license/notice texts from an approved authoritative source or a frozen installed package graph,
preserve the evidence, and resolve every node before approval.

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
| Visibility/license detection | `Private`; GitHub detects MIT; README says MIT                                                                               | Do not change until both the public decision and any license-text coordination are explicit           |
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

No item in this section is applied by this slice. A later authorized migration must be coordinated as
one reviewable change so the legal text, package metadata, documentation, packaged artifact, and
GitHub detection cannot disagree.

| Future target                                                                       | Coordinated action after authorization                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LICENSE`                                                                           | Replace MIT text with the unmodified Apache License 2.0 text only after relicensing authority is established; preserve the current ownership/provenance record separately |
| root `package.json`                                                                 | Change the current `MIT` license metadata to `Apache-2.0`                                                                                                                 |
| six workspace `package.json` files                                                  | Decide and apply consistent explicit `Apache-2.0` metadata; all six currently omit the field                                                                              |
| `README.md`                                                                         | Replace the explicit MIT claim and re-check any badge/About/detected-license presentation                                                                                 |
| `docs/REPOSITORY_MAP.md`                                                            | Update the root-license description and document any new attribution file                                                                                                 |
| `docs/DEVPOST_REQUIREMENTS.md`, `docs/KNOWN_ISSUES.md`, `docs/RELEASE_CHECKLIST.md` | Close gates only after the actual authorized changes and evidence exist                                                                                                   |
| `docs/DEPLOYMENT.md`                                                                | Update the documented artifact contents if a `NOTICE` or attribution file is required                                                                                     |
| `docs/VERSIONING.md` and `CHANGELOG.md`                                             | Record the coordinated licensing change and release boundary without changing the current RC during preparation                                                           |
| `CONTRIBUTING.md`                                                                   | Record the selected contributor-rights attestation mechanism for future contributions                                                                                     |
| source files                                                                        | Decide whether project-owned files need standardized copyright/license headers; never overwrite retained upstream notices                                                 |
| `scripts/build-release-artifact.mjs`                                                | Add any required `NOTICE`/attribution file to the deterministic static-file allowlist                                                                                     |
| `scripts/verify-release-artifact.mjs` and related release tests                     | Require and verify the same attribution file and its deterministic provenance                                                                                             |
| release artifact and sidecar                                                        | Rebuild only after the authorized source commit; verify that license/notice contents match the commit                                                                     |
| GitHub repository metadata                                                          | Verify detectable license/About text after merge; visibility remains a separate action                                                                                    |
| `pnpm-lock.yaml`                                                                    | Expect no license-only graph change, but prove and review the actual future diff rather than assuming it                                                                  |

### NOTICE, attribution, and provenance decision

The repository currently has `LICENSE` but no `NOTICE` or third-party attribution file in the current
tree or reachable path history. Apache-2.0 section 4 requires distributions to carry the license and
retain applicable copyright, patent, trademark, and attribution notices. If the distributed work
contains a `NOTICE`, relevant notices must be propagated in a readable place; informational NOTICE
content does not modify the license.

Before migration, resolve the exact 138-node dependency evidence and determine whether project or
upstream notices must be preserved. If a `NOTICE` is required, keep it concise and traceable to the
specific upstream obligations; do not copy unrelated license text indiscriminately. Preserve the
current project copyright and commit provenance when replacing the MIT license text. The ASF
application guide is useful implementation guidance, but ASF-specific source-header and NOTICE
conventions are not automatically a legal mandate for this non-ASF project.

### Relicensing authority is separate from dependency compatibility

Apache-2.0 defines the licensor as the copyright owner or an entity authorized by that owner. Git
history, repository admin permission, a merged PR, and the current MIT grant do not by themselves
prove that the operator may relicense every project-owned contribution. Before approval, identify the
copyright owner(s), determine whether every entrant/contributor granted sufficient rights, and record
an owner/contributor attestation or other counsel-approved basis. The machine-local author metadata
identified above is a provenance-review prompt, not proof of ownership or consent.

Separately, every production dependency must have compatible license and notice handling. Resolving
dependency compatibility does not establish the right to relicense project-owned code, and owner
authority does not resolve dependency obligations.

## Independent human decision checklist

The recommended state is `HOLD` for both decisions until the residual blockers below are resolved.
When ready, an authorized human must make each decision separately and explicitly:

- [ ] **Authorize Apache-2.0 project relicense.** I confirm documented project-owner and
      entrant/contributor authority, reviewed the exact production dependency license/NOTICE inventory,
      accept the coordinated migration impact map, and explicitly authorize changing the project from MIT
      to Apache-2.0 in a separate implementation change.
- [ ] **Authorize GitHub repository Public visibility.** I reviewed branch-only content, commit
      metadata, issues, PRs, Actions logs/artifacts/caches/attestations, tag/Release metadata, About links,
      and GitHub's visibility consequences, and explicitly authorize changing this repository from
      Private to Public as a separate owner action.

Neither box is checked by this packet. Approval of one box does not check the other. This Draft PR
must remain Draft and unmerged for independent QA and cannot be interpreted as either authorization.

## Residual blockers and next evidence

1. All 138 external production package-version license records, including the MCP SDK, remain
   `UNKNOWN` under the allowed local evidence; compatibility and NOTICE obligations are unresolved.
2. Project ownership and entrant/contributor relicensing authority have not been attested.
3. The four machine-local commit-email records require a repository-owner provenance/privacy review.
4. The 44 branches, 41 closed PRs, 9 issues, 117 Actions runs and related artifacts/metadata, one tag,
   one Draft Release, commit identities, and linked external resources require manual exposure review.
5. GitHub visibility is still Private, project license is still MIT, and compliance gates C09 and C10
   must remain `OPEN`.
6. Phase 8.2 remains `PARTIAL` pending live/judge DataHub credentials and validation; this packet does
   not change that independent readiness condition.

## Primary official references

Accessed 2026-07-25 22:00 ICT (2026-07-25 15:00 UTC):

- [GitHub: Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: Adding a license to a repository](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)
- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Apache Software Foundation: Applying the Apache license, version 2.0](https://www.apache.org/legal/apply-license.html)
- [Apache Software Foundation: Third-party license policy](https://www.apache.org/legal/resolved.html)
