# 2026-09-26 — Jev One — require DREX_BASE_URL (DNS fix)

Repo mirror: `docs/notes/2026-09-26-drex-base-url-required.md`

## Outcome

Merged [PR #9](https://github.com/lalitsonawane/jev-snake/pull/9): Drex no longer defaults to a broken public host. Operators must set `DREX_BASE_URL`. Upstream DNS/connect failures return JSON `502` so the browser never hits Safari’s “string did not match the expected pattern” on HTML 500 bodies.

## Key decisions

- **No public default.** `api.drex.ai` does not resolve (`ENOTFOUND`). Empty `defaultBaseUrl` for Drex; missing env → JSON `503` with a clear configure message.
- **Normalize base URL:** strip trailing slashes and accidental `/v1/systemone` (the app appends that path).
- **Require absolute `http(s)` URL** before calling upstream.
- **Catch `fetch` network errors** in `systemone-route.ts` → JSON `502` + host hint (never rethrow to HTML 500).
- **Client:** safe text→JSON parse when reading `/api/systemone-move` responses.

## Artifacts/links

- Code: `src/lib/systemone.ts`, `src/lib/systemone-route.ts`, `src/components/SnakeApp.tsx`
- Config: `.env.example`, README Security + API routes
- PR: https://github.com/lalitsonawane/jev-snake/pull/9
- Related: [Jev / Drex compare](2026-09-26-jev-drex-compare.md) (PR #8 introduced the optional default that this supersedes)

## Open follow-ups

- Set `DREX_API_KEY` **and** `DREX_BASE_URL` on Vercel Production + Preview (+ Development if using `vercel env pull`). Use your tenant’s System One root only — do not invent or document a fake public Drex host.
