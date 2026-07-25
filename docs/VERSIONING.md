# Versioning policy

## Product and package model

Data Incident Investigator is versioned as one product from this monorepo. The root `package.json`
version is the source of truth for the product version. The two apps and four internal packages are
private implementation units, not independently published products.

At adoption of this policy, the root and all six workspace manifests are aligned at `0.1.0`. That
value is a development baseline; it does not claim that `0.1.0` was tagged, published, or released.
The repository has no existing tag or GitHub Release at the adoption commit.

All seven manifest versions must stay aligned whenever a release or pre-release is cut. They may
temporarily remain unchanged during ordinary development, including documentation-only work. If a
future package becomes independently published, its ownership and compatibility contract must be
defined in a separate approved policy change before its version diverges.

`pnpm-workspace.yaml` owns workspace membership. Internal dependencies use `workspace:*` and do not
encode product versions. `pnpm-lock.yaml` owns the resolved dependency graph; it is not a version
source of truth.

License metadata is likewise not a version source of truth. An explicitly authorized coordinated
relicense may update `LICENSE`, all seven manifest SPDX fields, contributor terms, and documentation
without changing the product version or regenerating the lockfile when the dependency graph is
unchanged. Record the change under `Unreleased` and keep all package versions aligned.

## Semantic Versioning

Versions use `MAJOR.MINOR.PATCH` without a leading `v` in manifests and changelog headings.

- `MAJOR` changes when a stable release intentionally breaks a documented compatibility contract.
- `MINOR` changes when a stable release adds backward-compatible functionality or extends a contract
  without invalidating supported consumers.
- `PATCH` changes when a stable release contains backward-compatible fixes, security hardening,
  reliability improvements, or documentation corrections.

Before `1.0.0`, the product is under active development: a `0.MINOR.0` change may revise a documented
contract, while `0.MINOR.PATCH` remains compatible with that minor line. Breaking changes must still
be called out under `Unreleased` and in the eventual release notes.

The compatibility surface is the behavior the repository documents for users and operators,
including:

- HTTP routes, request/response schemas, error categories, and evidence/reference semantics;
- environment variables, runtime modes, supported Node/pnpm requirements, and documented commands;
- deterministic fixture identifiers and the primary fixture/demo flow;
- evaluation CLI inputs and report formats intended for operator use;
- the downloaded Markdown report's documented structure, safety properties, and filename behavior.

Examples of breaking changes after `1.0.0` include removing or renaming a route, field, command,
environment variable, or canonical fixture identifier; adding a required input; weakening a stated
safety or evidence guarantee; changing a documented error or report meaning incompatibly; or dropping
a supported runtime. Internal refactors are not breaking when those contracts remain compatible.
An additive change is minor only when supported consumers can safely ignore it; otherwise treat it as
breaking. Security urgency does not bypass versioning or changelog disclosure.

## Pre-releases and tags

Supported pre-release identifiers are:

- `alpha.N` for an incomplete, unstable preview;
- `beta.N` for a feature-complete preview that may still change before candidacy;
- `rc.N` for a release candidate expected to become the corresponding stable version if validation
  finds no blocker.

`N` starts at `1` and increases monotonically for another pre-release at the same base version. A
release candidate therefore uses a manifest version such as `1.0.0-rc.1`. Git tags add exactly one
leading `v`, such as `v1.0.0-rc.1`; GitHub Release titles use that same tag. Do not use a floating
`latest` tag or SemVer build metadata for repository releases.

Pre-releases have lower precedence than their associated stable version. Moving from one candidate to
the next changes only the pre-release number unless the intended stable base changes. A tagged release
is immutable: corrections use a new version, never a moved or recreated tag.

## Changelog ownership

`CHANGELOG.md` is the human-readable release record, not the version source of truth. Add notable
integrated work to `Unreleased` in the same change when practical. Use the conventional `Added`,
`Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security` categories that apply; omit empty
categories.

At a real release cut, move the applicable entries from `Unreleased` into a heading containing the
exact manifest version and the actual cut date, then leave a new empty `Unreleased` section. Add tag or
comparison links only after their referenced Git objects exist. Never infer dates, contributors,
issues, compatibility guarantees, or publication state from a manifest value.

## Coordinated version change

Version changes happen only in an explicitly scoped release task from a clean, current `main`:

1. Identify and record the exact candidate commit, tree, parent, successful CI evidence, and absence
   of an existing matching tag or release.
2. Change the root manifest first, then set all six private workspace manifests to the identical
   version in the same release change. Package versions never include the tag's leading `v`.
3. Run `pnpm install --lockfile-only` with pnpm `11.9.0`. Commit `pnpm-lock.yaml` only if pnpm actually
   records a deterministic change, then prove `pnpm install --frozen-lockfile` from the resulting
   inputs.
4. Finalize the corresponding changelog section with the actual cut date and keep `Unreleased` for
   subsequent work.
5. Run the separately scoped release validation against the exact release commit. The implementation
   branch and Draft pull request stop after exact-head validation and independent-QA handoff: they do
   not create a tag or GitHub Release. Only after independent QA records PASS may the existing Draft
   pull request be marked Ready and merged using a normal merge commit; squash and rebase merges do not
   satisfy this release gate. Immediately record the exact merge SHA, tree, and ordered parents,
   confirm fetched `origin/main` resolves to that exact merge SHA, and require the exact merge commit's
   main CI run and job to finish SUCCESS. Only then may a separately authorized publication gate create
   and push the matching immutable tag exactly at that recorded normal-merge SHA. The tag must not
   target the validated artifact commit, the feature head, or any later evolving head.
6. Before creating an RC GitHub Release, verify the immutable tag resolves exactly to the recorded
   normal-merge SHA. Create the matching GitHub Release only as Draft, with its selected tag/target
   resolving to that same SHA. The Phase 7.7 Draft Release must contain zero assets, remain Draft, and
   never be published by Phase 7.7. A local evidence artifact keeps only its own recorded build
   provenance; it must not be described as tag-built or merge-built and must not be uploaded or
   attached. Registry publication, CI artifact upload, and public or external deployment are not
   authorized. Publishing the zero-asset Draft Release requires another separately authorized gate;
   stable-release publication likewise requires its explicit final-release authorization.

The applications and packages remain `private: true`; this process does not authorize `pnpm publish`
or a registry publication.

## Deferred release cuts

Phase 7.5 defines policy only. It leaves every manifest at `0.1.0`, leaves the lockfile unchanged, and
creates no tag or release.

Phase 7.7 is responsible for preparing the first candidate change. Its implementation operation must
set all seven manifests to `1.0.0-rc.1`, perform the deterministic lockfile step above, move the
curated changelog entries only with the actual candidate-preparation date, and run the full
RC/fresh-clone and exact-commit gates. It ends with an independently reviewable Draft pull request and
creates no tag or GitHub Release. After independent QA records PASS, the existing pull request may be
marked Ready and normal-merged. Record that exact merge SHA/tree/ordered parents, prove fetched
`origin/main` and exact main CI SUCCESS for it, then a separately authorized publication gate may
create and push immutable tag `v1.0.0-rc.1` exactly at that merge SHA. The tag must not target local
artifact commit `90f07b7171520767d6f30f8c8a6146de5e129a73`, feature head
`d6bc8b3ec9c8db8167b26f14ddc7f2d8520dfcd7`, or an evolving later head. Verify both the tag and the
matching Draft GitHub Release target resolve exactly to the recorded merge SHA. The already-cleaned
29-file artifact is evidence built at commit `90f07b7171520767d6f30f8c8a6146de5e129a73` with its own
provenance only; it is not tag-built or merge-built and must not be uploaded or attached. The matching
GitHub Release must have zero assets, remain Draft, and never be published by Phase 7.7. Registry/CI
artifact upload and public/external deployment remain prohibited; publication requires separate later
authorization.

Phase 8 may cut `1.0.0` only after the candidate is accepted and final validation succeeds. It must
repeat the coordinated manifest/lock/changelog procedure, record changes since the candidate
truthfully, and create `v1.0.0` only after the exact final commit passes every release gate.
