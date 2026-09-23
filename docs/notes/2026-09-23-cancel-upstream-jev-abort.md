# 2026-09-23 — Cancel upstream Jev on client abort

## Outcome
Verified P1 hypothesis from the unfinished PR #4 review: client pause/reset aborted `/api/jev-move`, but the Route Handler’s TypeSafe `fetch` had no `AbortSignal`, so upstream Jev could still complete and bill. Fixed by forwarding `req.signal` to `POST https://api.typesafe.ai/v1/systemone`.

Repo mirror: `docs/notes/2026-09-23-cancel-upstream-jev-abort.md`  
Notion: https://app.notion.com/p/3e489f54d2c2814cbebdfc97ac914ca2

## Key decisions
- Smallest fix: plumb `req.signal` into the upstream `fetch`; return HTTP 499 when already aborted or when abort throws mid-flight.
- No client changes — `SnakeApp` already aborts via `AbortController` on pause/reset/idle/visibility stop; held ticks (~90ms cadence, no fabricated Jev payloads) unchanged.
- Key stays server-only (`TYPESAFE_API_KEY` / `TYPE_SAFE_API_KEY`).

## Abort path
1. Client: `stopAutoplay` / effect cleanup → `requestRef.current.abort()`
2. Browser: aborts `fetch("/api/jev-move", { signal })`
3. Route: `req.signal` aborts → upstream TypeSafe `fetch(..., { signal: req.signal })` cancelled

## Artifacts/links
- Repo: `src/app/api/jev-move/route.ts`, `route.test.ts`
- Prod: https://jev-snake-theta.vercel.app

## Open follow-ups
- Confirm on a preview deploy that rapid Pause/Reset during a slow Jev tick does not leave extra TypeSafe usage (dashboard / logs).
