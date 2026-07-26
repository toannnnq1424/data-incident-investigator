# Changelog

This file records notable user-facing, operator-facing, security, reliability, and documentation
changes. It follows a Keep a Changelog-style structure and the repository's
[versioning policy](docs/VERSIONING.md).

Tag `v1.0.0-rc.1` exists, and its GitHub Draft Release exists but remains unpublished with only
automatic source archives and no user-uploaded assets. Final `v1.0.0` tagging/publication remain
separately authorized gates.

## [Unreleased]

### Changed

- Relicensed the project from MIT to Apache-2.0 across the canonical license text, all seven private
  workspace manifests, contributor guidance, and repository documentation. The separately authorized
  repository transition is now integrated and GitHub visibility is Public.
- Recorded the owner's qualified zero-cost distribution/data/API disposition and a deployment
  preflight for the existing React/Vite plus Fastify architecture. No deployment, artifact
  publication, paid service, credential, runtime, dependency, workflow, version, tag, or Release
  mutation is included.
- Corrected the deployment preflight so a card-required genuinely free trial may be evaluated only
  through a provider-specific control packet and fresh owner approval. Render, Koyeb, and Google
  Cloud are separated by current official cost controls; no provider, account, card, trial, reminder,
  or deployment is selected or started, and C11 remains qualified.
- Corrected the official Koyeb card hold and persistent Phase 8 current-state record. Existing Google
  Cloud project `onlinelearning-484610` is only a reference; a later packet may propose a dedicated
  project but must obtain fresh approval for its exact identity/ownership immediately before
  creation. No GCP mutation or deployment is included.

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
