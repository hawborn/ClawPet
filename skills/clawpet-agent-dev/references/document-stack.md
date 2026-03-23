# Document Stack

Use this file when deciding **which artifact should hold what**.

## The stack

### 1. PRD
Purpose:
- product truth
- user, value, positioning, boundaries
- what the product is and is not

Changes when:
- product direction changes
- user definition changes
- boundary or category changes
- a product decision is overturned by evidence

Should stay stable.

### 2. ROADMAP
Purpose:
- stage truth
- P0 / P1 / P2 definitions
- sequencing between stages
- milestone goals and exit criteria

Changes when:
- stage definitions change
- phase boundaries change
- sequencing changes

Should change sometimes, but not daily.

### 3. IMPLEMENTATION-BACKLOG
Purpose:
- task reservoir
- candidate implementation work
- issue seed list
- cross-milestone task pool

Changes when:
- new tasks appear
- tasks split / merge / reprioritize
- acceptance criteria for task pool items change

Should change often.

### 4. ACTIVE-MILESTONE
Purpose:
- current commitment
- in-scope tasks for this iteration
- owners, blockers, current status
- immediate demo / acceptance target

Changes when:
- work starts
- scope is re-cut
- blockers appear
- tasks move between todo / doing / review / done

Should change frequently.

### 5. DECISIONS / ADR
Purpose:
- durable reasoning
- tradeoffs that should not be rediscovered repeatedly
- “why this, not that”

Changes when:
- a meaningful decision is made or reversed

### 6. AGENT-RUNBOOK
Purpose:
- collaboration rules for agents
- who does what
- branch / worktree / review protocol
- handoff format

### 7. DEFINITION-OF-DONE / QA-CHECKLIST
Purpose:
- completion criteria
- review rules
- evidence requirements

## Recommended rule of thumb

If the question is:

- “What are we building?” -> PRD
- “What phase are we in?” -> ROADMAP
- “What could we do?” -> BACKLOG
- “What are we doing right now?” -> ACTIVE-MILESTONE
- “Why did we choose this?” -> DECISIONS
- “How do agents collaborate?” -> AGENT-RUNBOOK
- “What counts as finished?” -> DoD / QA
