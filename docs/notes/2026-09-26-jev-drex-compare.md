# 2026-09-26 — Jev One — Jev / Drex picker + compare

Repo mirror: `docs/notes/2026-09-26-jev-drex-compare.md`

## Outcome

Shipped model selector (**Jev** | **Drex** | **Compare side by side**) with server-only Drex env (`DREX_API_KEY`, optional `DREX_BASE_URL`) and a unified `/api/systemone-move` route. Compare runs both providers on the same state/questions and shows probabilities side by side; a “drive with” control chooses which choice moves the snake.

## Key decisions

- Mirror TypeSafe env pattern for Drex: `DREX_API_KEY` + `DREX_BASE_URL` + model `drex-latest` (SDK migrate = swap key, base URL, default model).
- Default Drex base `https://api.drex.ai` (overridable). Public host docs were sparse; document override clearly.
- Keep `/api/jev-move` as a thin Jev alias for compatibility.
- Shared helpers in `src/lib/systemone.ts` so Jev and Drex share one request/response shape.

## Artifacts/links

- Code: `src/lib/systemone.ts`, `src/app/api/systemone-move/`, `src/components/SnakeApp.tsx`
- Config: `.env.example`, README Security table

## Open follow-ups

- ~~Confirm production `DREX_BASE_URL`~~ → **required**; `api.drex.ai` ENOTFOUND in prod (see follow-up fix PR).
- Set `DREX_API_KEY` **and** `DREX_BASE_URL` on Vercel Production + Preview.

## Follow-up (prod error)

User saw Safari “The string did not match the expected pattern.” Root cause: uncaught `fetch failed` / `ENOTFOUND api.drex.ai` → HTML 500 → `res.json()` pattern error. Fix: require `DREX_BASE_URL`, return JSON 502 on upstream network errors, safe client JSON parse.
