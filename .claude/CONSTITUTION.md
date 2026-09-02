# Claude's Constitution — Vici Shop

These are the non-negotiable rules for any code, command, or change made in this repository. They
override convenience, speed, and any instinct to "just make it work." When a rule here conflicts
with a request, name the conflict and ask — do not silently break the rule.

The articles are ordered by priority. Lower-numbered articles win conflicts.

---

## Article I — Source Control Safety

1. **Never run `git commit`, `git push`, `git tag`, or any history-rewriting command unless the
   user explicitly asks in this conversation.** Approval to commit once is not standing approval.
2. **Never force-push, hard-reset, or rebase shared branches** without an explicit, specific
   request.
3. When the user does ask you to commit:
   - Branch first if on the default branch.
   - Write a clear, conventional commit message (see coding-conventions.md → Commits).
   - Stage only files relevant to the change; never `git add -A` blindly.
4. **Never commit generated artifacts, `node_modules`, build output, or local config.** Keep
   `.gitignore` honest.

## Article II — Secrets and Configuration

1. **No secret ever enters the repository** — not in code, not in tests, not in fixtures, not in
   committed config, not in comments, not in commit messages.
2. **All configuration comes from environment variables**, loaded and validated at service startup
   (fail fast with a clear error if a required variable is missing or malformed).
3. `.env` files are git-ignored. Every service ships a committed **`.env.example`** listing every
   variable with placeholder/dummy values and a one-line comment.
4. Secrets in real environments come from a secret manager (AWS Secrets Manager / SSM / K8s
   Secrets), never baked into images or manifests.
5. **Never log secrets, tokens, passwords, full PANs, or full PII.** Redact before logging.
6. If you discover a committed secret, **stop and report it** — do not quietly remove it (it may
   already need rotation).

## Article III — Do No Harm

1. **Confirm before destructive or hard-to-reverse actions**: deleting files/data, dropping or
   truncating tables, `rm -rf`, overwriting migrations, mass edits, or anything outward-facing
   (deploys, publishing, sending messages, calling third-party APIs).
2. **Before deleting or overwriting something, read it first.** If what you find contradicts how it
   was described, surface that instead of proceeding.
3. **Migrations are forward-only and reviewed.** Never edit a migration that has already been
   applied; add a new one. Never auto-run destructive migrations against any shared database.
4. **No DoS, no mass-targeting, no detection-evasion** code. Security work in this repo is
   defensive and for authorized testing only (k6 load tests, security reviews).

## Article IV — Respect the Design

1. **Documentation is the contract.** Read the relevant `docs/40-services/`, `docs/20-architecture/`,
   and `docs/30-domain/` material before implementing. Code that contradicts the docs is a bug.
2. **ADR before novelty.** Introducing a new technique, library, datastore, or pattern — or
   departing from an accepted ADR — requires a new ADR (`docs/20-architecture/adrs/`) using the
   Problem → Why → Solution structure, *before* the code lands.
3. **Honor bounded-context boundaries** (`docs/30-domain/01-bounded-contexts.md`). A service may only
   reach another context through its published contract: a gRPC proto in `backend/libs/proto/`, a Kafka
   event in `backend/libs/events/`, or a REST endpoint. **Never** share a database or import another
   service's domain model.
4. **Contracts are source-of-truth and reviewed for breaking changes.** Changing a `.proto` or an
   event schema is a cross-cutting change — update all consumers in the same change and check Buf
   for breaking changes.

## Article V — Clean, Maintainable Code

1. **Follow the architecture** in `architecture.md` (Hexagonal / Ports & Adapters + DDD). The
   dependency rule is absolute: `domain` depends on nothing; `application` depends only on
   `domain`; `infrastructure` and `interface` depend inward. **No framework imports in `domain`.**
2. **Follow the style** in `coding-conventions.md`. Match the surrounding code's idiom, naming, and
   comment density. Consistency beats personal preference.
3. **Write for the next reader.** Small functions, intention-revealing names, no dead code, no
   commented-out blocks, no `console.log` left behind. Comments explain *why*, not *what*.
4. **TypeScript `strict` is always on.** No `any` to dodge a type error — model the type. No
   `@ts-ignore` without a comment explaining the unavoidable reason.
5. **No silent failures.** Handle errors explicitly with typed domain errors; never swallow a
   caught exception.

## Article VI — Prove It Works

1. **Every behavior change ships with tests.** Domain and application logic get fast unit tests
   with no I/O; adapters get integration tests (Testcontainers for real Postgres/Redis/Kafka).
2. **Report outcomes faithfully.** If tests fail, say so and show the output. If you skipped a
   step, say so. Never claim something is done or verified when it isn't.
3. **Quality gates must pass** before you consider work complete: `lint`, `typecheck`, `test`,
   `build`, and (for protos) Buf lint + breaking-change check. Run them; don't assume.

## Article VII — Communicate Honestly

1. **Surface uncertainty.** If a requirement is ambiguous and the answer changes what you build,
   ask. If you made an assumption, state it.
2. **Flag risk and tech debt** you introduce or notice, rather than hiding it.
3. **Stay in scope.** Do what was asked well; don't silently expand scope or refactor unrelated
   code. Propose larger changes separately.

---

> When in doubt: read the docs, prefer the safe and reversible action, keep the domain pure, and
> ask before doing something the user can't easily undo.
