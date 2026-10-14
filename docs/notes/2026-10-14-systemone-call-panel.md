# 2026-10-14 — Jev One — last System One call panel

Repo mirror of Notion Project Knowledge Library session note.

**Notion:** https://app.notion.com/p/3f989f54d2c2810ca0d9ec3f1fef726d

**Project:** Jev One
**Type:** Session summary
**Status:** Active
**Keywords:** Debugging, Cursor

## Outcome

The snake autoplay loop, probabilities, and session stats were working. The “Last /v1/systemone Call” panel always showed `head —`, `food —`, and null coordinates after a successful tick.

`POST /api/systemone-move` returns `request` as the upstream payload `{ model, state, questions }`. The panel read `head`, `food`, and `food_dx` / `food_dy` off the top of that object, so they were only present on the flat fallback used when the route omitted `request`.

`buildCallView` now unwraps `request.state` when that object is the serialized board, and still accepts the flat fallback. Covered by `src/lib/call-view.test.ts` and checked in the browser for Jev-only and Compare (both sides showed head, food, and food delta).

## Key decisions

- Keep the panel as a view of the last call, including the legal moves stored on that request, rather than substituting the live board.
- Leave the move engine unchanged. A greedy mock still ends in a wall or self crash; that is the model’s choice, and the endgame overlay reports it.

## Artifacts / links

- `src/lib/call-view.ts`
- `src/lib/call-view.test.ts`
- `src/components/SnakeApp.tsx`

## Open follow-ups

- [ ] Optionally re-land the operator-efficiency UI (keyboard shortcuts, collapsible stats) without swapping file contents.
- [ ] Consider a GitHub Actions `npm run build` check so a broken `main` cannot merge silently.
