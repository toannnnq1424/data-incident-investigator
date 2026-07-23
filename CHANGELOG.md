# Changelog

This file records notable user-facing, operator-facing, security, reliability, and documentation
changes. It follows a Keep a Changelog-style structure and the repository's
[versioning policy](docs/VERSIONING.md).

No Git tag or GitHub Release has been created from this changelog yet. The release-candidate metadata
below is prepared for independent validation; tagging and creating a Draft GitHub Release remain
separately authorized post-merge gates.

## [Unreleased]

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
