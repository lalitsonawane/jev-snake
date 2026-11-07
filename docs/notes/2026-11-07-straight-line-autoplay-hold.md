# 2026-11-07 — Jev One — straight-line autoplay hold

## Outcome

Jev Snake now reuses a real Jev-selected direction while food stays directly
ahead through a clear body-free corridor. Intermediate held ticks do not call
`/api/jev-move`; turns, new food, unsafe corridors, and lifecycle changes return
control to Jev.

Repo mirror: `docs/notes/2026-11-07-straight-line-autoplay-hold.md`  
Notion: https://app.notion.com/p/41189f54d2c281e1b062e7a8fd352aa1

## Key decisions

- Jev remains the only decision engine. Local code can only repeat the last
  legal Jev choice while the exact food target and straight-shot safety
  invariant remain valid.
- Revalidate the complete corridor and the next legal move before each held
  tick. Clear the hold after eating, target changes, unsafe state, pause, reset,
  hidden-tab stop, idle stop, or game end.
- Use a 90 ms target cadence. Network time counts toward the interval, so slow
  Jev responses do not receive an extra delay and held runs remain visibly
  continuous.
- Keep the last real Jev request and response in the panels. Add a held/no-API
  indicator and display held latency as 0 ms instead of fabricating a payload.
- Propagate client cancellation through the API proxy to TypeSafe and apply a
  20 second upstream timeout. Cadence edits update a ref and no longer restart
  an in-flight request.
- Preserve the 90 second idle and hidden-tab autostop and board-fill win rule.

## Artifacts / links

- Pull request: https://github.com/lalitsonawane/jev-snake/pull/4
- `src/lib/snake.ts` — conservative straight-shot eligibility
- `src/components/SnakeApp.tsx` — hold lifecycle, cadence, cancellation, and UI
- `src/app/api/jev-move/route.ts` — upstream abort propagation and timeout
- `src/components/SnakeApp.test.tsx` — call-count and pause-abort tests

## Verification

- `npm test`: 3 files, 9 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.4.5.
- `npm audit --omit=dev`: zero production vulnerabilities.

## Open follow-ups

- Confirm cancellation behavior and token reduction with production TypeSafe
  telemetry after merge.
- Watch `/api/jev-move` timeout and error rates during the first live session.
