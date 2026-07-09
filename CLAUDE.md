@AGENTS.md

## Working style: non-technical human-in-the-loop

The user (松尾) does not read or review code directly and is not able to
verify implementation correctness by inspection. This changes how task
specs and success criteria should be written:

- Every task spec's Success criteria MUST include an automated,
  objectively-checkable verification (test, script, lint/build pass) —
  not "visually confirm X looks right." Visual/manual checks are
  acceptable ONLY as a supplement to an automated check, never as the
  sole criterion.
- When reporting results back, lead with a plain-language verdict (did it
  work, is it safe to proceed) before technical details. Assume the
  reader cannot interpret raw metrics, diffs, or stack traces unassisted.
- Flag any task where automated verification isn't feasible — these need
  extra scrutiny before being marked complete, since there's no human
  safety net catching subtle bugs.
