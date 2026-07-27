# Phase 8.9 local demo-video candidate

Status: **local candidate / PARTIAL only**. The committed WebM is publicly accessible as a
repository blob/raw asset on the Public GitHub feature branch and Draft PR #58. It has not been
uploaded to or made publicly visible on YouTube, Vimeo, or Youku, has not been linked or entered in
Devpost, and has not been submitted. GitHub repository access does not satisfy the Rules' required
video-host and form-link condition.

## Review

Open [`review.html`](review.html) in a browser and enable the default English captions. The candidate
is intentionally silent: the human-reviewed WebVTT captions are its synchronized English narrative,
and [`TRANSCRIPT.md`](TRANSCRIPT.md) is the matching readable transcript.

Files:

- [`phase-8-9-demo-candidate.webm`](phase-8-9-demo-candidate.webm) — one continuous real public
  credential-free fixture interaction.
- [`phase-8-9-demo-captions.vtt`](phase-8-9-demo-captions.vtt) — synchronized English captions.
- [`TRANSCRIPT.md`](TRANSCRIPT.md) — caption-equivalent English transcript.
- [`review.html`](review.html) — repository review surface using native video/caption controls.

## Media identity

| Property       | Verified value                                                            |
| -------------- | ------------------------------------------------------------------------- |
| Container      | Matroska / WebM                                                           |
| Video codec    | VP8 (`libvpx`)                                                            |
| Resolution     | 1440 × 900, square pixels, 8:5 display aspect ratio                       |
| Frame rate     | 25 fps                                                                    |
| Duration       | 2:50.20 (`170.20` seconds), below the Rules' three-minute review boundary |
| Audio          | No audio stream; English narrative is supplied by captions/transcript     |
| Candidate size | 11,074,997 bytes (`10.56 MiB`)                                            |
| SHA-256        | `f7cef629fa03db6113949e1b347004230158b05f695258454278cc7473f14e18`        |

The candidate was encoded by the already-installed Playwright FFmpeg build; no global package,
paid service, generated UI, synthetic frame, or application/runtime change was used.

## Authenticity and scope

- The take shows one continuous real interaction with the existing public Cloud Run
  credential-free fixture service. Exactly one new **Removed schema column** incident was started for
  this take.
- Frames contain only the application and checked-in synthetic fixture data. They exclude browser
  and Windows chrome, tabs, account/session surfaces, credentials, private endpoints, terminals,
  personal paths, notifications, and external media.
- The run visibly reaches **Investigation completed**, ranked evidence-linked hypotheses,
  deterministic `81% · high` confidence, evidence, bounded blast radius, **Not Executed**
  recommendations, and the Markdown download context.
- The incident UUID and activity timestamps visible in the application are run-specific,
  process-local output. They are not durable links or submission identifiers.
- The public service remains fixture-only, makes zero model calls, does not write to DataHub or
  production, and performs no automatic remediation. Local bounded DataHub MCP support and
  authorized live/judge validation remain separate; the latter is `PARTIAL`.

## Frame review

The 1440 × 900 source frames were inspected at these candidate timestamps:

| Time    | Visible evidence                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `00:05` | Clean app-only title, **Fixture metadata · Ready**, no browser/Windows chrome or native scrollbar.   |
| `00:20` | **Removed schema column** selection and populated synthetic incident fields.                         |
| `00:48` | Full intake with **Start investigation** before the single click.                                    |
| `00:55` | **Investigation completed**, Markdown download, and observable activity trail.                       |
| `01:10` | Ranked evidence-linked plausible contributor and visible `81% · high` code-owned confidence factors. |
| `01:35` | Resolved schema-change and lineage evidence plus the beginning of blast-radius results.              |
| `01:55` | Both bounded downstream impacts, exact paths, distances, and evidence provenance.                    |
| `02:15` | Human-review recommendations, each visibly **Not Executed**.                                         |
| `02:35` | Completed/export context and observable activity.                                                    |
| `02:45` | Clean return to the app title and fixture-ready boundary.                                            |
| `02:49` | Clean terminal app-only frame with fixture metadata ready; no private or external surface.           |

No visual evidence of a runtime failure appears in the take. The capture script did record one
non-visual instrumentation page error when its capture-only scrollbar style ran before the initial
document element existed. The interaction and finalized video continued normally; this is not an
application console-clean claim, and it is one reason C18 remains `PARTIAL`.

## Accessibility, privacy, and media-rights review

- [x] English WebVTT cues are ordered, non-overlapping, within the media duration, and mirrored by a
      human-readable transcript.
- [x] Captions identify the scenario, completion boundary, confidence, evidence separation, two
      downstream impacts, and non-execution without relying on color.
- [x] The take uses steady scrolling, stable 1440 × 900 framing, readable application text, no rapid
      flashing, and no music.
- [x] Only project UI and synthetic fixture content appear. No third-party logo, decorative
      trademark, stock image, clip, or copyrighted music was added.
- [x] The text uses product/platform names only as factual technical references.
- [x] Key frames were reviewed for chrome, accounts, credentials, private data, hidden reasoning,
      confirmed-cause wording, and remediation claims.
- [ ] A human entrant must perform the final rights/privacy/accessibility review on any exported file
      chosen for public hosting.
- [ ] Public hosting visibility, entrant identity/rights attestations, and the final Devpost form
      remain separately authorized user actions.

This candidate advances C18 only to **PARTIAL — LOCAL CANDIDATE** and provides bounded C20 evidence.
C19 remains `OPEN`: although the WebM is publicly accessible through GitHub, no public YouTube,
Vimeo, or Youku upload/URL exists and no video link has been entered in Devpost.
