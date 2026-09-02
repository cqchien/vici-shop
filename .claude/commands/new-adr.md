---
description: Create a new Architecture Decision Record from the template
argument-hint: <short decision title> (e.g. "use cursor pagination for reviews")
---

Create a new ADR recording the decision: **$ARGUMENTS**.

## Steps

1. Read the template at `docs/20-architecture/adrs/ADR-000-template.md` and follow its structure
   exactly.
2. List `docs/20-architecture/adrs/` to find the highest existing `ADR-NNN-*.md` number. The new ADR
   is the next integer, zero-padded to three digits (e.g. if ADR-012 is highest, create ADR-013).
3. Create `docs/20-architecture/adrs/ADR-NNN-<kebab-title>.md` where `<kebab-title>` is a short
   kebab-case slug derived from "$ARGUMENTS".
4. Fill it in using the **Problem → Why This Matters → Options Considered → Decision →
   Consequences → Related** structure, matching the depth and tone of existing ADRs (read 1–2 real
   ones like ADR-001 or ADR-003 for the house style).
   - Set **Status**: Proposed (the user promotes it to Accepted) and **Date** to today.
   - Present at least two genuine options with honest pros/cons, not a strawman.
   - Be concrete about trade-offs and risks; cite the relevant `docs/` material.
5. If this ADR changes or supersedes an earlier one, note it in both ADRs' Related sections.
6. Add a row to `docs/20-architecture/adrs/README.md` if it maintains an index.

## Rules

- Do NOT write any implementation code in this command — an ADR precedes code (CONSTITUTION
  Article IV). Propose the ADR; let the user accept it first.
- Ask the user for any detail you genuinely need to make the options/decision sound, rather than
  inventing a rationale.
