---
name: clawpet-agent-dev
description: Agent-oriented software development operating model for the Clawpet repo. Use when planning, scoping, sequencing, implementing, reviewing, or coordinating non-trivial Clawpet work; especially when deciding how PRD, ROADMAP, IMPLEMENTATION-BACKLOG, active milestones, coding agents, reviewer agents, and quality gates should work together.
---

# Clawpet Agent Dev

## Overview

Use this skill to run Clawpet development as a **layered system**, not a loose pile of chats, tasks, and code edits.

This skill is for work like:

- revising PRD or roadmap
- deciding what belongs in backlog vs milestone
- splitting work across planner / coder / reviewer agents
- starting or re-scoping a milestone
- deciding which docs must change after product or code changes
- keeping agent-driven implementation aligned with product intent

The goal is simple:

> Keep product truth, execution truth, and code truth aligned.

## Core model

Do **not** treat development as a one-way waterfall.

Use this loop instead:

1. **PRD** defines product truth
2. **ROADMAP** defines stage truth
3. **IMPLEMENTATION-BACKLOG** defines candidate work items
4. **ACTIVE-MILESTONE** or GitHub milestone/project defines current commitment
5. **Agents implement and review** the committed tasks
6. **Results feed back upward** into milestone, backlog, roadmap, or PRD depending on what changed

This means:

- PRD changes least often
- ROADMAP changes when stage definitions change
- BACKLOG changes often
- ACTIVE-MILESTONE changes constantly during execution

Read `references/document-stack.md` before changing project docs.
Read `references/operating-rhythm.md` before setting up or running a new milestone.
Read `references/roles-and-handoffs.md` before splitting work across agents.
Read `references/quality-gates.md` before declaring implementation work done.

## Decide which document to update

Use this decision rule:

### Update `CLAWPET-PRD.md` when

- product positioning changes
- target user or product boundary changes
- the definition of the product changes
- a prior product decision is overturned by evidence

Do **not** update PRD just because tasks moved around.

### Update `ROADMAP.md` when

- P0 / P1 / P2 goals change
- milestone scope boundaries change
- milestone exit criteria change
- sequencing between stages changes

Do **not** use roadmap as a live task board.

### Update `IMPLEMENTATION-BACKLOG.md` when

- new candidate tasks are discovered
- old tasks are split, merged, or deleted
- task descriptions / acceptance criteria change
- priorities across the task pool change

Backlog is the **task reservoir**, not the current sprint.

### Update `ACTIVE-MILESTONE.md` or GitHub milestone/project when

- deciding what is in scope **right now**
- assigning current owners
- tracking status, blockers, and slips
- re-cutting this week’s or this iteration’s commitment

This is the most dynamic execution artifact.

### Update `DECISIONS.md` or ADRs when

- a meaningful architectural or product decision is made
- a tradeoff is chosen and should not be re-litigated every week
- a decision explains why a tempting direction is intentionally rejected

## Recommended doc stack for Clawpet

Minimum recommended stack:

- `docs/CLAWPET-PRD.md`
- `docs/ROADMAP.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/ACTIVE-MILESTONE.md`
- `docs/DECISIONS.md`
- `docs/AGENT-RUNBOOK.md`
- `docs/DEFINITION-OF-DONE.md`
- `docs/QA-CHECKLIST.md`

If some files do not exist yet, create them only when they solve a real coordination problem.

See `references/document-stack.md` for the exact role of each file.
See `references/active-milestone-template.md` for a compact milestone template.

## Default agent topology

Do **not** spawn many agents by default. More agents often means more drift.

Default to **2-4 agents total**:

1. **Main / Director agent**
   - owns priorities
   - decides scope
   - resolves conflicts
   - merges findings into a final decision

2. **Product / Docs agent**
   - updates PRD, roadmap, backlog, milestone docs
   - keeps wording and scope aligned

3. **Coding agent**
   - implements focused tasks
   - runs build / lint / tests
   - reports diffs and verification clearly

4. **Reviewer / QA agent**
   - checks implementation against PRD, roadmap, milestone, and quality gates
   - does not just ask “does it compile?”
   - looks for drift, regressions, and fake-done work

If scope is small, combine roles.
If scope is large, keep coding and review separate.

## Standard workflow

### Step 1: Identify the layer of change

Classify the request first:

- **strategy / product**
- **stage planning**
- **task planning**
- **active milestone management**
- **implementation**
- **review / QA**

Do not start coding before knowing which layer is actually changing.

### Step 2: Read the controlling docs

For implementation work, the normal read order is:

1. `CLAWPET-PRD.md`
2. `ROADMAP.md`
3. `ACTIVE-MILESTONE.md` if present
4. `IMPLEMENTATION-BACKLOG.md` if task context is needed
5. relevant code / tests / recent diffs

If `ACTIVE-MILESTONE.md` does not exist, either create it or treat the current GitHub milestone/project as the active milestone.

### Step 3: Define the current commitment

Before implementation, define:

- goal
- scope
- non-goals
- acceptance criteria
- owner
- verification plan

If these are missing, the task is under-specified.

### Step 4: Execute with role separation

Use one of these modes:

- **Direct mode**: one agent implements directly
- **Lead + coder mode**: main agent scopes, coding agent implements
- **Lead + coder + reviewer mode**: best default for meaningful work

### Step 5: Verify before saying done

Every implementation task should pass through:

- code review
- build / lint / test checks as applicable
- milestone acceptance review
- doc update review if product or scope changed

Read `references/quality-gates.md` before closing a task or milestone.

### Step 6: Feed the result back to the right layer

When work finishes:

- update ACTIVE-MILESTONE status
- update BACKLOG if follow-up tasks appear
- update ROADMAP if stage assumptions changed
- update PRD only if product truth changed
- log durable decisions in `DECISIONS.md`

## Guardrails

### 1. Do not let backlog become the milestone

Backlog is the full candidate pool.
Milestone is the current commitment.
They should not be the same document.

### 2. Do not let PRD absorb execution noise

PRD should stay stable and strategic.
It is not where task churn belongs.

### 3. Do not let coding agents self-certify major work

For non-trivial changes, use a separate review pass.

### 4. Do not close work on claims alone

Prefer evidence:

- commands run
- tests passed
- screenshots / demo notes for UI
- exact verification steps

### 5. Do not open too many parallel tracks

If multiple agents touch the same conceptual area at once, coordination cost rises fast.
Prefer a narrow active milestone with clear ownership.

## Good trigger examples

- “Revise Clawpet’s PRD and re-cut P0/P1/P2.”
- “What should go into ACTIVE-MILESTONE vs backlog?”
- “Split this feature across planner, coder, and reviewer agents.”
- “We learned something from implementation; which doc should change?”
- “Set up the operating model for agent-based development in this repo.”

## Resources

- `references/document-stack.md` — what each project document is for
- `references/operating-rhythm.md` — the recommended milestone loop
- `references/roles-and-handoffs.md` — recommended role split and handoff rules
- `references/active-milestone-template.md` — a compact starting template
- `references/quality-gates.md` — definition-of-done and QA guardrails
