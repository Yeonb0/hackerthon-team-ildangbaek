# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Structure

```
pololo/
├── backend/     # Spring Boot (Java) — 계층 분리(controller / service / repository / dto / entity)
└── frontend/    # Expo (TypeScript) — src(screens / components / navigation / services / constants / types)
```

See `backend/README.md` and `frontend/README.md` for run instructions.

## Architecture Decisions

Check `docs/decisions/` before making architecture or policy decisions. When changing a
decision, add a new ADR rather than editing the old one.

## Documentation Synchronization

Architecture and policy decisions must be recorded in an ADR. ADRs explain the decision
and its rationale; they do not replace the product and technical source-of-truth documents.

For every code, configuration, API, authentication, database, migration, or operational
change, review all affected canonical documents and update every relevant one in the same
work item:

- `docs/기능명세서.md` for user-visible behavior, requirements, conditions, and exception flows.
- `docs/api_설계.md` for endpoints, ownership boundaries, authentication, requests, responses,
  enums, and errors.
- `docs/DB_스키마_설계.md` for tables, columns, enums, constraints, indexes, triggers, functions,
  RLS, and migration-owned schema behavior.
- `docs/STATUS.md` for actual implementation, verification, deployment, and remote-application
  status.
- The relevant `README.md` for setup, environment variables, execution, migration, and
  operational procedures.

Do not mark work complete while the implementation, ADRs, or affected canonical documents
contradict one another. Documents that are genuinely unaffected do not need cosmetic edits,
but the completion report must state which documentation surfaces were reviewed and updated.
Do not record architecture or policy decisions only in `SCRATCHPAD.md`; it is temporary context,
not a canonical source of truth.

Check `SCRATCHPAD.md` (if present) at session start to pick up prior work context.
