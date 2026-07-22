# Rollback

## Boundary

Rollback replaces one immutable host release artifact with a separately retained last-known-good
artifact. It does not rewrite Git history, move a tag, publish a Release, rebuild an old commit,
change DataHub, restore a database, or recover in-memory incidents. Phase 7.6 rehearses only local
artifact selection, verification, staging, API startup, and fixture health/readiness/smoke; it makes no
external deployment change.

There is no previously released artifact at adoption of this contract. The first real candidate must
retain its verified archive and sidecar before a later release can name it as a rollback target. Until
two independently approved artifacts exist, cross-version rollback is not proven.

## Required release inventory

Before routing a new release, record these values in the deployment change record outside the
artifact directory:

- active version, full 40-character commit, full tree, archive filename, and archive SHA-256;
- absolute immutable storage location for its `.tar.gz` and adjacent `.sha256` sidecar;
- exact successful `/health`, `/ready`, and fixture smoke evidence;
- the same fields for the last-known-good rollback artifact;
- service/static-host configuration revision and the operator who approved the switch.

A SHA-256 sidecar detects corruption but is not an authenticity signature. Accept the archive,
sidecar, and expected identity only through the repository/release channel authorized for that
deployment. Never select an artifact by modification time, `latest`, a floating branch, or a 12-character
filename suffix alone.

## Pre-rollback gates

1. Stop new traffic to the failing release without deleting its files or logs. Record its exact
   version/commit and the symptom using only sanitized evidence.
2. Resolve the approved prior artifact by its recorded full commit and SHA-256. Require both files to
   be readable and ensure the staging target is a new empty version-and-commit directory.
3. Verify before extraction from a trusted checkout or retained standalone verifier:

   ```powershell
   node scripts\verify-release-artifact.mjs --artifact <PRIOR>.tar.gz `
     --expected-commit <PRIOR-40-CHARACTER-COMMIT> --expected-version <PRIOR-VERSION>
   ```

4. Extract into staging, enter the archive's single root directory, and verify it again:

   ```powershell
   tar -xzf <PRIOR>.tar.gz -C <EMPTY-STAGING-DIRECTORY>
   node scripts\verify-release-artifact.mjs --directory . `
     --expected-commit <PRIOR-40-CHARACTER-COMMIT> --expected-version <PRIOR-VERSION>
   pnpm install --prod --frozen-lockfile --ignore-scripts
   ```

5. Compare the prior release's configuration contract with the retained service configuration. Never
   copy `.env`, credentials, `node_modules`, or generated files from the failing release directory.

## Restore and validation

Start the staged prior API on a temporary loopback port while the failed release remains retained.
Require exact fixture `GET /health`, `GET /ready`, and the canonical bounded incident smoke described
in [`DEPLOYMENT.md`](DEPLOYMENT.md). Confirm the owned temporary PID and port, then stop that rehearsal
process cleanly.

Only after those gates pass, update the service manager and static-host document root/proxy to the
already verified prior directory using the host's normal atomic or transactional configuration
mechanism. Phase 7.6 does not prescribe a symlink, registry edit, cloud command, or platform API because
none is supported by this repository. Start the prior API, recheck health/readiness/smoke through the
actual proxy, and then re-enable traffic gradually.

Retain the failed release directory, artifact identity, and sanitized logs for diagnosis. Do not alter
or relabel its archive. After rollback is stable, remove only temporary staging/install state under the
operator-owned rollback workspace; follow the host retention policy for both immutable artifacts.

## State and provider caveats

- API incident/report state is process-local. Draining, restart, deploy, or rollback invalidates every
  active and completed incident ID. Tell users to resubmit after service restoration.
- There is no database or migration in the MVP, so there is no schema/data restore step. If persistent
  state is introduced later, this procedure is blocked until a separately reviewed backup,
  compatibility, and restore contract exists.
- DataHub access is read-only. Rollback does not undo external metadata changes and must not call a
  mutation. A DataHub `/ready` failure may be external; preserve `/health` evidence and do not claim
  that binary rollback repaired the provider.
- Switching `APP_MODE=datahub` to `fixture` is an explicit operating-mode change, not an automatic
  rollback. It requires separate authorization and must be visible to users.
- The static web and API must come from the same prior artifact. Mixing web/API versions is not a
  supported rollback.

## Abort and escalate

Abort before changing active traffic and escalate to the deployment/release owner when any of these is
true:

- the last-known-good full commit, version, tree, archive SHA-256, archive, or sidecar is missing or
  disagrees with the change record;
- verification reports an unsafe path, unexpected/missing file, link, checksum, size, provenance,
  toolchain, filename, lockfile, or manifest mismatch;
- extraction would overwrite a release, the target is not empty, pnpm would change the lockfile, or an
  unreviewed install script/dependency/network source is required;
- retained configuration is missing, exposes a secret, changes mode unexpectedly, or is incompatible
  with the prior version;
- the temporary or post-switch API does not produce exact `/health` and mode-appropriate `/ready`, the
  fixture incident misses its bounded deadline, the proxy serves mixed versions, or owned processes/
  ports cannot be identified and cleaned up safely;
- a database/migration/persistent queue has appeared, incident preservation is required, external
  provider mutation is proposed, or the rollback would need a tag move/history rewrite;
- the rollback itself worsens user impact or the failure is clearly external to the release binary.

If the prior release also fails, keep traffic disabled or on the last independently healthy version,
preserve evidence, and escalate. Do not repeatedly alternate artifacts or broaden credentials while
diagnosing.

## Phase 7.6 local rehearsal

Because no prior release artifact exists, Phase 7.6 may use the one newly built clean-commit artifact
as a stand-in for the immutable prior artifact. Copy neither its contents nor credentials: verify the
recorded sidecar/full commit, extract it into a fresh local rollback staging directory, perform the
production install, start only its API on a dynamic loopback port, and require exact fixture health,
readiness, and smoke before teardown. This proves the mechanics, not cross-version compatibility or an
external traffic switch. Record that limitation with the rehearsal evidence.
