# 2026-09-26 — Jev One — session stats board (Jev vs Drex)

## Outcome
Added a **Session stats** panel directly under the move-probability indicators so operators can see live ops metrics and compare Jev vs Drex in the same visual region as the probs.

## Metrics
Per provider (session cumulative, reset on Reset / model switch):
- API calls, held (straight-line skips), errors
- Last / avg latency (round-trip ms)
- Eval time (`evaluation_time_ms` when present)
- Tokens in/out (from `usage`)
- Last choice + confidence (last / avg)
- Compare only: agree-with-peer rate

Shared game strip in the panel head: score · length · steps · foods.

## Compare mode
Two columns (Jev | Drex) under the dual probability panels; driving model gets a badge. Agreement is counted whenever both return a choice on the same tick.

## Artifacts
- `src/lib/provider-stats.ts` + tests
- `src/components/SnakeApp.tsx` (`StatsBoard`)
- CSS: `.side-rail`, `.stats-board`
- Screenshots: `/cursor/stores/self/media/stats-board-jev.png`, `stats-board-compare.png`
- Deep-link: `?mode=jev|drex|compare` for local demos

## Open follow-ups
- None for UI; Drex host/env remains a separate ops issue.
