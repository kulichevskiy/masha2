---
revision: 1
status: accepted
accepted_revision: 1
intent: intent.md@1
spec: spec.md@1
---

# Execution plan

Accepted under the user's full-send delegation on 2026-10-28 (agent acceptance). Sequential execution by one implementer on branch `codex/editorial-stories`, base `562aae3e85d9e2e295c760f056d236b4cf78dd11`; one PR to `main`.

1. T01 — migration, database types, SQL contract test, shared `lib/editorial-stories.ts` helpers with unit tests. (R1, R6 types)
2. T02 — public `/editorial` story feed with flat fallback, `/editorial/[slug]` page, metadata, section nav. (R2, R3)
3. T03 — admin «Истории» tab: table, editor, server actions, tests. (R4)
4. T04 — gift plate restyle, design-system README, E2E seed and scenarios, full `pnpm verify`, independent review, fixes. (R5, R6, integration)

T02 and T03 both depend on T01; they touch disjoint files and could run in parallel, but the project profile prefers sequential implementation, so they run in order. T04 integrates and proves the whole change.

Coverage: R1 → T01; R2, R3 → T02; R4 → T03; R5 → T04; R6 → T01 (types), T04 (README, E2E).

Risks: CRAP on the client editor (mitigated by small handlers and component tests); the native E2E stack must start locally.
