# Roles and Handoffs

Use this file when coordinating multiple agents.

## Default roles

### Main / Director agent
Owns:
- final prioritization
- task decomposition
- conflict resolution
- final acceptance judgment

Should not:
- let other agents redefine product intent silently

### Product / Docs agent
Owns:
- PRD edits
- roadmap edits
- backlog maintenance
- active milestone hygiene
- decision logging

### Coding agent
Owns:
- implementation
- local verification
- concise diff summaries
- surfacing blockers early

Should not:
- self-approve major scope changes
- silently widen scope

### Reviewer / QA agent
Owns:
- spec compliance review
- code quality review
- regression suspicion
- completion skepticism

Should ask:
- does this match the milestone?
- does this match the PRD?
- what evidence proves this works?
- what remains risky?

## Recommended handoff format

Every task handoff should include:

- objective
- scope
- non-goals
- relevant files
- acceptance criteria
- verification expectations
- known constraints

## Example coding handoff

- Objective: implement approval summary card in pet UI
- Scope: renderer + IPC wiring for approval metadata
- Non-goals: redesign whole panel, change gateway contract
- Relevant files: `src/...`
- Acceptance: card renders command summary, session source, risk badge
- Verification: build passes, manual approval flow tested

## Anti-patterns

- multiple coding agents editing the same area without separation
- reviewer agent only reading final message, not diff or evidence
- docs agent updating PRD to justify implementation drift
- main agent skipping acceptance review because tests passed
