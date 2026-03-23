# Operating Rhythm

Use this file when running a milestone or deciding the next loop.

## Recommended loop

### 1. Product alignment
Check:
- does PRD still match what we believe?
- does ROADMAP still match the next useful stage?

If yes, do not rewrite them.
If no, fix them before deep implementation.

### 2. Milestone cut
Pick a narrow current commitment.

For each active milestone, define:
- objective
- in scope
- out of scope
- acceptance criteria
- owner(s)
- blockers
- demo path

### 3. Task selection
Pull a small set of tasks from the backlog into the active milestone.

Prefer:
- 3-7 concrete tasks
- one clear user path
- minimal task overlap between agents

### 4. Implementation
Assign focused work.

Normal split:
- docs / planning agent updates artifacts
- coding agent implements
- reviewer agent validates

### 5. Review and evidence
Require:
- diff summary
- verification commands
- screenshots / demo notes for UI changes
- explicit statement of what is still not done

### 6. Close or re-cut
If acceptance criteria are met:
- close milestone
- update backlog with follow-ups
- update roadmap only if stage learning changed

If not met:
- re-cut scope
- move unfinished tasks back to backlog or next milestone
- do not pretend partial completion equals milestone completion

## Milestone sizing rule

A good milestone should be:
- small enough to demo clearly
- large enough to produce a real user-facing shift
- narrow enough that agent coordination stays sane

If the milestone needs too many simultaneous moving parts, cut it smaller.
