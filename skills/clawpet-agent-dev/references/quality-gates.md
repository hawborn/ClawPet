# Quality Gates

Use this file before declaring work complete.

## Definition of done for agent-driven implementation

A task is not done just because code was written.

Minimum bar:

1. **Scope match**
   - implementation matches the committed task
   - no silent scope expansion

2. **Technical verification**
   - build passes if applicable
   - lint passes if applicable
   - tests pass or a clear reason is given

3. **Behavior verification**
   - key user path is exercised
   - UI work has screenshots, demo notes, or manual verification steps

4. **Review**
   - someone other than the implementer reviews non-trivial work
   - reviewer checks against PRD / milestone intent, not just syntax

5. **Documentation hygiene**
   - active milestone status updated
   - backlog updated if follow-ups were discovered
   - decisions logged if a durable tradeoff was made

## For milestone completion

A milestone is not done unless:
- acceptance criteria are satisfied
- the demo path works end to end
- known gaps are either fixed or explicitly moved out of scope
- status is updated honestly

## Failure patterns to watch for

- “Build passes, so it’s done.”
- “Works on my machine” with no evidence.
- Reviewer only reads the summary, not the diff.
- Product drift justified after the fact by editing docs.
- Hidden follow-up work not pushed back into backlog.
