# Devpost submission draft

## Title

Data Incident Investigator

## One-line description

An evidence-first AI agent that uses metadata, lineage, and recent changes to explain data incidents and
recommend the next recovery actions.

## Problem

Data teams spend incident time correlating catalogs, pipelines, schemas, dashboards, and ownership by
hand. Existing evidence is hard to assemble quickly and generated explanations are often unauditable.

## Solution workflow

The user submits an incident question. The system identifies relevant entities, traverses bounded
lineage, gathers recent changes, builds evidence-linked root-cause hypotheses, scores them, and renders
the blast radius and recommended actions.

## Technology

TypeScript, React, Vite, Fastify, Zod, Vitest, pnpm workspaces, GitHub Actions, fixture-backed metadata,
and a planned DataHub adapter. Stitch can assist frontend exploration but is not a runtime dependency.

## DataHub usage

Planned Phase 2 functionality searches datasets/dashboards, retrieves upstream/downstream lineage,
normalizes schema/ownership/domain/tag metadata, and gathers supported recent-change signals. Do not
claim live integration until its adapter and smoke test pass.

## Codex usage

Codex manages slice planning, implementation, targeted testing, documentation memory, Git workflow,
CI, release checks, and demo preparation under the repository operating contract.

## Current limitations

Phase 0 is foundation only. Update this document after each phase and validate every claim against a
working demonstration before submission.

## Remaining submission sections

Challenges, accomplishments, lessons learned, measured evaluation results, deployment URL, repository
visibility, screenshots, video URL, and final roadmap will be completed from verified release evidence.
