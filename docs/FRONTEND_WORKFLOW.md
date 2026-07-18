# Frontend design workflow

## Goal

Create a clear investigation experience that communicates evidence and uncertainty in under three
minutes. Repo-native React, CSS, accessibility, tests, and build output remain the source of truth.

## Stitch MCP

Stitch is optional design assistance for composed screens, layout alternatives, hierarchy, and visual
exploration. The tracked project configuration uses `STITCH_API_KEY` through `env_http_headers`; it
contains no secret.

Setup on each machine:

1. Rotate any key shared in chat.
2. Set `STITCH_API_KEY` in the environment used to launch Codex.
3. Trust the repository so `.codex/config.toml` can load.
4. Restart/open a new Codex task and verify the Stitch tools are available.

## When to use Stitch

- Full incident form/report layouts.
- Evidence timeline and lineage presentation alternatives.
- Responsive hierarchy and demo-ready screen composition.

Do not use Stitch for API work, shared contracts, small copy edits, or as a production dependency.

## Design-to-code loop

1. Define the slice outcome and actual data contract.
2. Ask Stitch for one or two focused layout alternatives.
3. Select a direction against accessibility, information density, and demo clarity.
4. Implement it in `apps/web` using semantic HTML and repo-owned CSS.
5. Verify keyboard access, loading/error/empty states, responsive behavior, and browser smoke.
6. Record any material UX decision in `docs/DECISIONS.md`.

If Stitch is unavailable, continue with the same acceptance criteria using the existing design system.
