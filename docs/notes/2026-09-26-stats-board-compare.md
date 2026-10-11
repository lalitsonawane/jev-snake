# 2026-09-26 — Jev One — session stats board (Jev vs Drex)

Repo mirror: `docs/notes/2026-09-26-stats-board-compare.md`

## Outcome

Merged [PR #10](https://github.com/lalitsonawane/jev-snake/pull/10): a **Session stats** panel directly under the move-probability indicators so operators can see live ops metrics and compare Jev vs Drex in the same visual region as the probs.

## Metrics

Per provider (session cumulative, reset on Reset / model switch):

- API calls, held (straight-line skips), errors
- Last / avg latency (round-trip ms to `/api/systemone-move`)
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
- Deep-link: `?mode=jev|drex|compare`
- PR: https://github.com/lalitsonawane/jev-snake/pull/10

## Open follow-ups

- None for UI; Drex host/env remains an ops concern (`DREX_BASE_URL` required — see [PR #9 note](2026-09-26-drex-base-url-required.md)).
