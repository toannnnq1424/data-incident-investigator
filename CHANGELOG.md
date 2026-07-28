# Changelog

This file records notable user-facing, operator-facing, security, reliability, and documentation
changes. It follows a Keep a Changelog-style structure and the repository's
[versioning policy](docs/VERSIONING.md).

Tag `v1.0.0-rc.1` exists, and its GitHub Draft Release exists but remains unpublished with only
automatic source archives and no user-uploaded assets. This repository prepares the `1.0.0`
metadata below; final `v1.0.0` tagging and GitHub Release creation/publication remain separately
authorized post-merge gates.

## [Unreleased]

## [1.0.0] - 2026-07-28

### Added

- Added a bounded read-only adapter for the official DataHub MCP Server's search and lineage tools,
  with strict transport, payload, result, timeout, and taxonomy validation. Authorized live/judge
  endpoint validation remains partial, and unsupported recent-change evidence stays explicit.
- Added a credential-free public Cloud Run fixture demo plus judge quickstart, claim-to-demo matrix,
  clean synthetic-data screenshots, an under-three-minute functioning-project recording, synchronized
  English captions/transcripts, and a separate locally generated male voice-over derivative.
- Added deterministic exact-bundle and packaged-runtime legal/provenance records, notices, checksums,
  and verification for the release archive and immutable deployed image.

### Changed

- Relicensed the project from MIT to Apache-2.0 across the canonical license text, all seven private
  workspace manifests, contributor guidance, and repository documentation. The separately authorized
  repository transition is now integrated and GitHub visibility is Public.
- Transitioned the repository to Public visibility with private vulnerability reporting, sanitized
  public collaboration guidance, and a qualified zero-cost distribution/data/API disposition rather
  than a blanket legal or eligibility claim.
- Added a minimal same-origin production host and immutable-digest Docker path for the existing
  React/Vite plus Fastify fixture architecture. The proven public revision remains fixture-only,
  model-free, non-remediating with respect to DataHub/production systems, process-local, and
  configured with service/revision maximum instances of `1`.
- Refreshed the truthful submission packet around evidence-linked hypotheses, confidence factors,
  downstream blast radius, Markdown export, explicit limitations, public-repository fallback, and
  Open/Wildcard as the proposed primary challenge fit. No Devpost form choice or submission is made.

### Fixed

- Hardened MCP transport handling against unsafe URLs, oversized responses, invalid optional tool
  inputs, late/aborted responses, ambiguous tool output, and unsupported schema-change claims.
- Bound release and deployed-runtime attribution to exact lock, source, tree, image, bundled-module,
  package, notice, and legal-file identities with fail-closed verification and Windows path safety.

### Security

- Pinned vulnerable transitive production paths to `find-my-way@9.7.0` and
  `brace-expansion@5.0.8` after the final production audit identified the fixed versions for their
  respective denial-of-service advisories.
- Kept credentials, live DataHub/model access, customer data, browser/account chrome, and private
  endpoints out of the public fixture, screenshots, reports, recordings, archives, and logs.
- Preserved unresolved external gates explicitly: judging-window access is not guaranteed; the demo
  video is a Public GitHub repository asset but is not hosted on a Rules-listed video service or
  linked in Devpost; entrant/team/IP/media-rights/eligibility/consent attestations remain owner work.

## [1.0.0-rc.1] - 2026-07-23

### Added

- A credential-free deterministic fixture workflow and a DataHub mode that share one metadata adapter
  contract for health, entity search, bounded lineage, and recent-change evidence.
- Validated incident intake with guided scenario prefills, bounded investigation orchestration,
  suspicious-change detection, evidence-linked root-cause hypotheses, and transparent confidence
  factors.
- Schema-validated reports with remediation guidance, bounded downstream blast radius, an observable
  activity trail, explicit missing information, and deterministic sanitized Markdown download.
- A deterministic evaluation suite covering seven canonical cases and reporting retrieval,
  root-cause, evidence-support, unsupported-claim, latency, tool-call, and token-use metrics.
- Repository-owned Windows and POSIX bootstrap commands plus exact-head pull-request, main, and manual
  release-validation gates.
- A deterministic version-and-commit-provenanced host release artifact with a SHA-256 sidecar, strict
  manifest verifier, frozen dependency inventory, and bounded deployment/rollback runbooks.

### Changed

- Contributor guidance and GitHub templates now separate bug, feature, and documentation/support
  intake, require sanitized evidence, and route vulnerability reports to the private security process.
- Health and readiness reporting now distinguish process health, selected metadata-provider
  readiness, and the model's current `not_required` state.
- Investigation output now separates facts, inferences, assumptions, missing information, and
  recommendations while preserving evidence references through the UI and Markdown export.

### Fixed

- Provider timeouts and unavailable metadata now produce bounded, stable failure states without
  silently falling back to fixture data.
- Cross-platform development and browser-test launchers now use synchronized dynamic ports and clean
  up only their owned process trees.
- Markdown export redaction now covers assignment-style credentials, multiword credential keys,
  quoted boundaries, and unsafe URL suffixes without storing a generated report in the repository.

### Security

- API inputs, adapter/model-shaped outputs, report content, logs, and public collaboration intake are
  validated or sanitized to avoid exposing credentials, raw provider payloads, private reasoning, or
  sensitive incident data.
- The production dependency graph is locked and supply-chain checked, including patched `fast-uri`
  resolutions for the audited vulnerable ranges.
- GitHub validation uses read-only permissions, immutable action pins, exact commit checkout, no
  persisted checkout credential, frozen installs, and bounded job runtime.
