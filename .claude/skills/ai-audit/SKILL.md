---
name: ai-audit
description: Run a multi-model (DeepSeek + GPT) security/logic/performance audit of a FestLift codebase scope, with automatic cross-checking between the two models on anything they disagree about, then verify the surviving findings against the real code. Use when the user asks for a full/deep audit, a second opinion from other AI models, or explicitly invokes /ai-audit.
---

# Multi-model audit (DeepSeek + GPT, cross-checked)

Orchestrates `scripts/ai-audit.js`, which asks DeepSeek (`deepseek-v4-pro`) and GPT
(`gpt-5.3-codex`) to independently audit the same code, then makes each one review
the findings it *didn't* flag before anything gets reported to the user. This is not
a rubber-stamp pass — treat disagreements as real signal, not noise to average away.

## When invoked

1. **Pick a scope.** Valid values: `backend` (unified-server.js + backend/controllers +
   models), `pages-admin`, `pages-dispatcher`, `pages-client`, `pages-tech`, `assets`.
   If the user didn't name one, ask which area(s) — don't default to running everything,
   each scope is a real API spend. If they say "everything", run each scope in turn.

2. **Run it**: `node scripts/ai-audit.js --scope=<scope>`
   - Requires `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` in `.env`. If either is missing,
     tell the user which one and stop — don't fall back to a single-provider run
     silently, that defeats the cross-checking this skill is for.
   - This can take several minutes for large scopes (unified-server.js alone is ~14k
     lines / 6 chunks). Run it with `run_in_background: true` and continue other work,
     or use `--skip-cross` first if the user just wants a fast raw-findings pass.
   - It's resumable: each chunk's phase-1 and phase-2 output is cached to
     `audit-reports/<provider>/<scope>/*.json` and `audit-reports/<provider>-reviews/<scope>/*.json`.
     Re-running the same scope skips anything already done — safe to re-run after a
     partial failure instead of starting over.

3. **Read the result**: `audit-reports/adjudicated-<scope>.json`. Each finding has:
   - `_resolution`: `corroborated` (both models independently flagged it — high trust),
     `confirmed_by_review` (one flagged it, the other reviewed and agreed),
     `disputed` (one flagged it, the other reviewed and pushed back — read
     `_verdict_reasoning`, this is where the real signal from cross-checking is),
     `unreviewed` (cross-check wasn't run or had nothing to compare against).
   - Sorted by severity then resolution, so start at the top.

4. **Verify before reporting anything as real.** Both models can still be wrong
   together (corroborated ≠ true), and `disputed` findings need a tie-break, not an
   automatic discard — the disputing model can itself be wrong. For each finding that
   matters (all `critical`/`high`, and `medium` unless clearly cosmetic):
   - Open the actual file at the cited line and confirm the code still looks like the
     finding describes (findings can cite line numbers that drifted, or misread a
     helper function not fully shown in its chunk).
   - Watch for the two known false-positive traps already seen in prior audits of
     this codebase: (a) a route registered both inline in `unified-server.js` *and*
     in `backend/routes/*.js` via `backend/controllers/*.js` — the inline one wins,
     the other is dead code, don't report a bug found only in the shadowed copy;
     (b) MongoDB array-field negative-match queries (e.g. `{'documents.type':{$ne:'contract'}}`)
     are often *correct* and get misread as bugs — check actual query semantics, not
     just intuition.
   - Only findings that survive this check should be reported to the user or fixed.

5. **Report.** Use the same format the `ReportFindings` tool expects if this was invoked
   as part of a review flow, otherwise a plain summary grouped by severity, each with:
   verdict after verification, one-line summary, file:line, and what you'd fix. Don't
   dump the raw JSON on the user — that's what `audit-reports/adjudicated-<scope>.json`
   is for if they want to dig in themselves.

6. **Fixing is a separate step** — don't fix anything without the user asking, same as
   any other review. If they do ask, follow the project's existing conventions (check
   all 4 roles after backend auth/permission changes, `node --check` / `node -c` after
   every JS edit, restart PM2 only after edits are verified, never commit unless asked).

## Notes for future runs

- The shared per-chunk char budget (140k) intentionally keeps chunks small enough for
  precise line citations even though both models now have ~1M-token context windows —
  don't "optimize" this to fewer/bigger chunks without checking whether citation
  accuracy holds up; this was a deliberate choice carried over from the first
  DeepSeek+Grok audit run (2026-07), not an oversight.
- `--providers=` accepts a comma list; `grok` is wired in (XAI_API_KEY already in
  `.env`) but not run by default — only add it back if the user asks for a third voice.
- `backend` scope already had one full DeepSeek+Grok pass in 2026-07 (see
  `audit-reports/verification-report-*.md` for what was found/fixed/rejected then) —
  re-running it isn't redundant (new code since, plus GPT + real cross-checking are
  new), but frame it to the user as a re-audit, not a first pass, and skip re-reporting
  anything already marked FIXED there unless the fix looks to have regressed.
