# 2026-09-26 — Jev One — Jev / Drex picker + compare

Repo mirror: `docs/notes/2026-09-26-jev-drex-compare.md`

## Outcome

Shipped model selector (**Jev** | **Drex** | **Compare side by side**) with server-only Drex env and a unified `/api/systemone-move` route ([PR #8](https://github.com/lalitsonawane/jev-snake/pull/8)). Compare runs both providers on the same state/questions and shows probabilities side by side; a “drive with” control chooses which choice moves the snake.

## Key decisions

- Mirror TypeSafe env pattern for Drex: `DREX_API_KEY` + `DREX_BASE_URL` + model `drex-latest` (SDK migrate = swap key, base URL, default model).
- Keep `/api/jev-move` as a thin Jev alias for compatibility.
- Shared helpers in `src/lib/systemone.ts` so Jev and Drex share one request/response shape.
- Deep-link: `?mode=jev|drex|compare`.

### Superseded (do not follow)

- ~~Optional `DREX_BASE_URL` with default `https://api.drex.ai`~~ — that host does not resolve. **Current rule:** `DREX_BASE_URL` is **required** ([PR #9](https://github.com/lalitsonawane/jev-snake/pull/9); [dedicated note](2026-09-26-drex-base-url-required.md)).

## Artifacts/links

- Code: `src/lib/systemone.ts`, `src/app/api/systemone-move/`, `src/components/SnakeApp.tsx`
- Config: `.env.example`, README Security table
- PR: https://github.com/lalitsonawane/jev-snake/pull/8

## Open follow-ups

- Set `DREX_API_KEY` **and** `DREX_BASE_URL` on Vercel Production + Preview (see PR #9 note).
