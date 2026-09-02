---
name: knowledge-doc
description: Explore (study) or review/rewrite interview prep docs under interview/knowledge/. Use whenever the user wants to learn, summarize, explain, review, critique, or rewrite a knowledge file so it matches the house writing standard — prose-first (limit ASCII diagrams), the mandatory "Hiểu → Diagram → Nói thành lời" flow, and every technical point tied to "why it matters in production".
---

# Knowledge Doc — Explore & Review

This skill governs every interaction with files under `interview/knowledge/`, and it is the single
source of truth for how those docs are written. There are two modes; pick based on intent.

Reference model file (meets the bar): `interview/knowledge/01-nodejs-typescript/01-v8-gc-memory.md`.

---

## The three non-negotiable principles

1. **Prose-first, limit ASCII diagrams.** Default to clear prose. A diagram is an optional
   *quick-recall* aid placed *after* the explanation and labelled "để ôn nhanh"; never the primary
   way a topic is presented. Aim for **0–2 small diagrams per file**. (Code snippets and API/field
   listings are not "diagrams" — use them freely where they genuinely help.)
2. **Mandatory flow per topic: Hiểu bản chất → (Diagram nếu cần) → 🗣️ Nói thành lời.**
   - **Hiểu bản chất** — step-by-step prose that builds intuition (why it exists, how it works).
   - **Diagram (optional)** — only if it condenses the flow just explained; label it "để ôn nhanh".
   - **🗣️ Nói thành lời** — a first-person, spoken-aloud paragraph answering as if to an interviewer.
3. **Every technical point answers "vì sao quan trọng với production?"** This is what separates a
   senior answer from a junior one. Tie each point to a real consequence: **latency/P99, cost,
   reliability, scale, security, or ops**. If a point can't connect to a production consequence,
   cut it or add the "why". Quick check: after each section ask *"và rồi sao? (so what?)"* — the
   text must already answer it.

---

## Standard file structure

```
# <Topic title>

> Tại sao chủ đề này quan trọng: 2–4 câu — vì sao interviewer hỏi, họ muốn nghe gì,
> đâu là điểm tạo nên câu trả lời "senior".

---

## 1. <First question/aspect>   ← name sections as a question or clear concept

### Hiểu bản chất — <unique suffix>
   Prose, step by step. Numbered list for a process/flow. Each key point carries its "why".

[ASCII diagram — ONLY if needed, labelled "(để ôn nhanh)"]

> 💡 Insight thực dụng: a coding/ops rule drawn from the above (optional).

> 🗣️ Cách trả lời interview (nói thành lời): one flowing first-person paragraph,
>     tied to a production consequence.

---

## 2. <Next aspect>   ... (repeat the flow)

---

## <N>. Interview Q&A nhanh
   3–6 compressed Q&A pairs for last-minute review; short answers that still hit the "why".

---

*Liên quan: [links to related knowledge files]*
```

---

## Symbols & language conventions

| Symbol | Meaning | When |
|---|---|---|
| `> 💡` | Pragmatic insight / rule | A lesson to apply when coding or operating. |
| `> 🗣️` | Interview answer | Spoken-aloud paragraph, kept distinct from the deep-dive prose. |
| `### Hiểu bản chất — …` | Study-notes block | Opens each section; the suffix after "—" must be **unique** within the file (no duplicate headings). |
| ` ``` ` | Diagram/code "để ôn nhanh" | Minimal diagram or illustrative snippet; never the primary presentation. |

- **Vietnamese prose + keep English technical terms** (AST, heap, GC, latency, P99, throughput…).
  Don't force-translate technical terms.
- **Voice:** a senior engineer explaining to a peer — confident, clear, no rambling. Write the 🗣️
  block in the first person ("tôi xử lý bằng cách…") to drill the spoken reflex.
- **Short sentences, one idea each.** Avoid dense 8–10 line paragraphs with no breaks.
- **Bold** the must-remember keywords (algorithm, number, mechanism name) — sparingly.
- **Numbers must be honest & contextual:** use ranges ("~2GB", "vài chục–vài trăm ms") and note
  "tùy version/config" when a value isn't fixed. Never fabricate a precise number.

---

## Mode A — Explore (study / learn)

Trigger: the user wants to *understand* a topic ("giải thích…", "học…", "tóm tắt…", opens a file to study).

1. Read the target knowledge file(s).
2. Teach it back following the flow — **Hiểu bản chất** (step-by-step intuition) → an optional tiny
   diagram → **🗣️ how to say it in an interview**.
3. For each key point, make the **production "so what?"** explicit (latency, cost, reliability,
   scale, security, ops).
4. Keep it conversational and first-person where you model the spoken answer. Do **not** edit files
   in this mode unless asked.

## Mode B — Review / Rewrite (apply the standard)

Trigger: the user wants to *review, critique, fix, or rewrite* a knowledge file.

1. Read the target file.
2. **Review** against the Definition of Done below and report concrete gaps with file:line
   references — e.g. diagram used where prose belongs, a topic missing its 🗣️ spoken answer, a
   technical point with no production "why", duplicate headings, dense paragraphs, fabricated
   precise numbers.
3. **Rewrite** (only if asked, or after confirming scope) to satisfy every checklist item, using
   the standard file structure above.
4. After writing, fix any markdown lint warnings (no duplicate headings; blank lines around lists).
5. Report honestly what you changed and any checklist item you could not satisfy.

---

## Definition of Done (review every file against this)

- [ ] Each section follows **Hiểu → (Diagram if needed) → 🗣️ Nói thành lời**.
- [ ] **Prose is primary**; at most 0–2 diagrams, each labelled "để ôn nhanh" and placed *after* the prose.
- [ ] **Every technical point ties to a production consequence** (latency/cost/reliability/scale/security/ops).
- [ ] Opens with a "**Tại sao chủ đề này quan trọng**" block and ends with "**Interview Q&A nhanh**".
- [ ] Each section has a 🗣️ first-person, say-it-aloud paragraph.
- [ ] Vietnamese + English terms; short sentences; numbers contextual and not fabricated.
- [ ] **No duplicate headings** (each `### Hiểu bản chất — …` has a unique suffix).
- [ ] Clean markdown (blank lines around lists; no real lint warnings).
- [ ] *Liên quan* cross-links at the bottom are present and correct.

---

## Scope discipline

- Confirm scope before mass rewrites — do one file as a model first, then scale by folder, unless
  told otherwise.
- Don't fabricate precise numbers; use ranges with "tùy version/config" when a value isn't fixed.
- Preserve and update the *Liên quan* cross-links at the bottom of each file.
